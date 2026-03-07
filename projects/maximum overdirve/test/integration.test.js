/**
 * integration.test.js — overdrive integration tests
 *
 * Verifies: module loading, state machine, code-enforced gates,
 * RTM builder internals, prompt inventory, and CLI version.
 *
 * Run: node --test test/
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');

// ============================================================
//  1. Module Loading — All 10 modules load cleanly
// ============================================================

describe('Module loading', () => {
  const modules = [
    'orchestrator',
    'state-manager',
    'claude-runner',
    'plan-parser',
    'gate-evaluator',
    'dependency-analyzer',
    'logger',
    'mcp-detector',
    'ivv-runner',
    'rtm-builder',
  ];

  for (const mod of modules) {
    it(`loads ${mod} without error`, () => {
      const loaded = require(path.join(PROJECT_ROOT, 'src', `${mod}.js`));
      assert.ok(loaded, `${mod} should export something`);
    });
  }
});

// ============================================================
//  2. State Manager — Phase init, gates, RTM fields
// ============================================================

describe('StateManager', () => {
  const StateManager = require(path.join(PROJECT_ROOT, 'src', 'state-manager.js'));
  const tmpDir = path.join(require('os').tmpdir(), `overdrive-test-${Date.now()}`);

  it('phase init has rtm fields', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test-project', 'spec.md', [
      { number: 1, name: 'Phase One', dependencies: [] },
    ]);

    const state = sm.get();
    const phase = state.phases[1];
    assert.equal(phase.rtm_status, null);
    assert.deepEqual(phase.rtm_gaps, []);
    assert.equal(phase.rtm_coverage, null);
    assert.equal(phase.ivv_status, null);
    assert.deepEqual(phase.ivv_concerns, []);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('canCode() blocks when plans not strengthened', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);
    sm.setPlanCount(1, 3);

    const result = sm.canCode(1);
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('not strengthened'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('canCollectEvidence() blocks when IV&V not passed', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    const result = sm.canCollectEvidence(1);
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('IV&V'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('canBuildRTM() blocks when evidence not collected', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    const result = sm.canBuildRTM(1);
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('evidence'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('canCollectEvidence() allows after IV&V pass', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);
    sm.setIVVResult(1, { passed: true, conditional: false, concerns: [] });

    const result = sm.canCollectEvidence(1);
    assert.equal(result.allowed, true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('canBuildRTM() allows after evidence collected', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);
    sm.setIVVResult(1, { passed: true, conditional: false, concerns: [] });
    sm.setPhaseStatus(1, 'evidence-collected');

    const result = sm.canBuildRTM(1);
    assert.equal(result.allowed, true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('setRTMResult() sets rtm-complete status correctly', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    sm.setRTMResult(1, { complete: true, gaps: [], total: 5, covered: 5, verdict: 'COMPLETE' });

    const phase = sm.get().phases[1];
    assert.equal(phase.rtm_status, 'complete');
    assert.equal(phase.status, 'rtm-complete');
    assert.equal(phase.rtm_coverage, 100);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('setRTMResult() handles gaps-found state', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    sm.setRTMResult(1, {
      complete: false,
      gaps: [{ requirement: 'R-001', missing: 'test', severity: 'high' }],
      total: 5,
      covered: 3,
      verdict: 'GAPS_FOUND',
    });

    const phase = sm.get().phases[1];
    assert.equal(phase.rtm_status, 'gaps-found');
    assert.equal(phase.rtm_gaps.length, 1);
    assert.equal(phase.rtm_coverage, 60);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('setRTMResult() handles no-requirements pass-through', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    sm.setRTMResult(1, { complete: true, gaps: [], total: 0, covered: 0, verdict: 'NO_REQUIREMENTS' });

    const phase = sm.get().phases[1];
    assert.equal(phase.rtm_status, 'no-requirements');
    assert.equal(phase.status, 'rtm-complete');
    assert.equal(phase.rtm_coverage, 100);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getNextActionablePhase includes rtm-complete', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [
      { number: 1, name: 'P1', dependencies: [] },
      { number: 2, name: 'P2', dependencies: [] },
    ]);

    // Set phase 1 to rtm-complete — it should be picked up as actionable
    sm.setPhaseStatus(1, 'rtm-complete');

    const next = sm.getNextActionablePhase();
    assert.equal(next.number, 1);
    assert.equal(next.status, 'rtm-complete');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================
//  3. RTM Builder — Internal methods
// ============================================================

describe('RTMBuilder internals', () => {
  const RTMBuilder = require(path.join(PROJECT_ROOT, 'src', 'rtm-builder.js'));
  const builder = new RTMBuilder({});

  it('_scanForRequirementRefs finds R-XXX patterns and dedupes', () => {
    const content = 'This satisfies R-001 and R-002. Also R-001 again.';
    const refs = builder._scanForRequirementRefs(content);
    assert.deepEqual(refs.sort(), ['R-001', 'R-002']);
  });

  it('_scanForRequirementRefs handles no refs', () => {
    const refs = builder._scanForRequirementRefs('No requirements here.');
    assert.deepEqual(refs, []);
  });

  it('_parseRequirementsOutput handles raw YAML', () => {
    const yaml = 'project: test\nrequirements:\n  R-001:\n    text: "Do the thing"\n    type: functional';
    const result = builder._parseRequirementsOutput(yaml);
    assert.ok(result);
    assert.ok(result.requirements);
    assert.ok(result.requirements['R-001']);
  });

  it('_parseRequirementsOutput handles code-fenced YAML', () => {
    const yaml = '```yaml\nproject: test\nrequirements:\n  R-001:\n    text: "Do the thing"\n    type: functional\n```';
    const result = builder._parseRequirementsOutput(yaml);
    assert.ok(result);
    assert.ok(result.requirements);
  });

  it('_extractGaps reconstructs from traceability', () => {
    const rtm = {
      traceability: {
        'R-001': {
          status: 'gap',
          plan: { found: false },
          test: { found: false },
          code: { found: true },
          evidence: { found: true },
        },
      },
    };
    const gaps = builder._extractGaps(rtm);
    assert.ok(gaps.length >= 2);
    assert.ok(gaps.some(g => g.missing === 'plan' && g.severity === 'high'));
    assert.ok(gaps.some(g => g.missing === 'test' && g.severity === 'high'));
  });

  it('_getPhaseRequirements filters by phase correctly (includes null-phase reqs)', () => {
    const allReqs = {
      requirements: {
        'R-001': { text: 'Phase 1 thing', estimated_phase: 1 },
        'R-002': { text: 'Phase 2 thing', estimated_phase: 2 },
        'R-003': { text: 'Unassigned thing', estimated_phase: null },
      },
    };
    const phase1Reqs = builder._getPhaseRequirements(allReqs, 1);
    assert.ok(phase1Reqs['R-001']);
    assert.ok(!phase1Reqs['R-002']);
    assert.ok(phase1Reqs['R-003']); // null phase included everywhere
  });
});

// ============================================================
//  4. Prompt Inventory — All 12 prompts present
// ============================================================

describe('Prompt inventory', () => {
  const promptDir = path.join(PROJECT_ROOT, 'prompts');

  const expectedPrompts = [
    'create-roadmap.md',
    'plan-phase.md',
    'strengthen-plan.md',
    'code-plan.md',
    'verify-phase.md',
    'ivv-verify.md',
    'collect-evidence.md',
    'extract-requirements.md',
    'build-rtm.md',
    'evidence-package.md',
    'gate-check.md',
    'dependency-analysis.md',
  ];

  it('all 12 prompts present', () => {
    for (const prompt of expectedPrompts) {
      const fullPath = path.join(promptDir, prompt);
      assert.ok(fs.existsSync(fullPath), `Missing prompt: ${prompt}`);
    }
  });

  it('extract-requirements prompt has correct placeholders', () => {
    const content = fs.readFileSync(path.join(promptDir, 'extract-requirements.md'), 'utf8');
    assert.ok(content.includes('{{SPEC_CONTENT}}'));
    assert.ok(content.includes('{{PROJECT_NAME}}'));
    assert.ok(content.includes('{{SPEC_FILE}}'));
  });

  it('build-rtm prompt has correct placeholders', () => {
    const content = fs.readFileSync(path.join(promptDir, 'build-rtm.md'), 'utf8');
    assert.ok(content.includes('{{PHASE_NUMBER}}'));
    assert.ok(content.includes('{{PHASE_REQUIREMENTS}}'));
  });

  it('evidence-package prompt includes IV&V and RTM placeholders', () => {
    const content = fs.readFileSync(path.join(promptDir, 'evidence-package.md'), 'utf8');
    assert.ok(content.includes('{{IVV_FILES}}'));
    assert.ok(content.includes('{{RTM_SUMMARY}}'));
  });
});

// ============================================================
//  5. CLI — Version and step validation
// ============================================================

describe('CLI', () => {
  const { execSync } = require('child_process');
  const cliPath = path.join(PROJECT_ROOT, 'bin', 'overdrive.js');

  it('CLI shows v0.3.0', () => {
    const output = execSync(`node "${cliPath}" --version`, { encoding: 'utf8' });
    assert.ok(output.includes('0.3.0'));
  });

  it('CLI accepts rtm and extract-requirements steps', () => {
    const content = fs.readFileSync(cliPath, 'utf8');
    assert.ok(content.includes("'rtm'"));
    assert.ok(content.includes("'extract-requirements'"));
  });

  it('CLI has --upto flag on run command', () => {
    const content = fs.readFileSync(cliPath, 'utf8');
    assert.ok(content.includes('--upto'));
  });

  it('briggsy-build alias is registered in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.bin['briggsy-build'], 'briggsy-build should be a bin entry');
    assert.equal(pkg.bin['briggsy-build'], pkg.bin['overdrive'], 'briggsy-build should point to same file as overdrive');
  });
});

// ============================================================
//  6. Shared Core — Pipeline module + file structure
// ============================================================

describe('Shared Core', () => {
  it('core/pipeline.js loads and exports all required interfaces', () => {
    const Pipeline = require(path.join(PROJECT_ROOT, 'src', 'core', 'pipeline.js'));
    assert.ok(Pipeline.PIPELINE_STAGES, 'should export PIPELINE_STAGES');
    assert.ok(Pipeline.VALID_UPTO_VALUES, 'should export VALID_UPTO_VALUES');
    assert.ok(Pipeline.STATUS_TO_STAGE, 'should export STATUS_TO_STAGE');
    assert.ok(typeof Pipeline.getStepDescriptor === 'function', 'should export getStepDescriptor');
    assert.ok(typeof Pipeline.parsePhases === 'function', 'should export parsePhases');
    assert.ok(typeof Pipeline.extractProjectName === 'function', 'should export extractProjectName');
    assert.ok(typeof Pipeline.parseVerificationResult === 'function', 'should export parseVerificationResult');
    assert.ok(typeof Pipeline.splitPlanOutput === 'function', 'should export splitPlanOutput');
  });

  it('pipeline has exactly 9 stages', () => {
    const Pipeline = require(path.join(PROJECT_ROOT, 'src', 'core', 'pipeline.js'));
    assert.equal(Pipeline.PIPELINE_STAGES.length, 9);
    assert.deepEqual(Pipeline.PIPELINE_STAGES, [
      'plan', 'strengthen', 'gate-check', 'code', 'verify',
      'ivv', 'evidence', 'rtm', 'evidence-package',
    ]);
  });

  it('getStepDescriptor returns valid descriptors for all stages', () => {
    const Pipeline = require(path.join(PROJECT_ROOT, 'src', 'core', 'pipeline.js'));
    const testParams = {
      phaseNumber: 1, phaseName: 'Test', specContent: 'spec',
      roadmapContent: 'roadmap', planContent: 'plan', planId: 'plan-01',
      acceptanceCriteria: 'criteria', phaseRequirementsYaml: 'reqs',
      projectName: 'Test', specFile: 'spec.md', buildStarted: '2026-01-01',
      stateContent: '{}', complexity: 'high',
    };

    for (const stage of ['plan', 'strengthen', 'code', 'verify', 'ivv', 'evidence', 'rtm', 'evidence-package']) {
      const desc = Pipeline.getStepDescriptor(stage, testParams);
      assert.ok(desc.prompt, `${stage} should have a prompt`);
      assert.ok(desc.templateVars, `${stage} should have templateVars`);
      assert.ok(desc.executionType, `${stage} should have executionType`);
      assert.ok(desc.logLabel, `${stage} should have logLabel`);
    }
  });

  it('STATUS_TO_STAGE covers all phase statuses', () => {
    const Pipeline = require(path.join(PROJECT_ROOT, 'src', 'core', 'pipeline.js'));
    const expectedStatuses = [
      'pending', 'planned', 'strengthened', 'coding', 'coded',
      'verified', 'ivv-passed', 'evidence-collected', 'rtm-complete', 'blocked',
    ];
    for (const status of expectedStatuses) {
      assert.ok(status in Pipeline.STATUS_TO_STAGE, `STATUS_TO_STAGE should have ${status}`);
    }
  });

  it('splitPlanOutput splits correctly', () => {
    const Pipeline = require(path.join(PROJECT_ROOT, 'src', 'core', 'pipeline.js'));
    const output = '## Plan 1\n\nFirst plan content\n\n## Plan 2\n\nSecond plan content';
    const plans = Pipeline.splitPlanOutput(output);
    assert.equal(plans.length, 2);
    assert.equal(plans[0].number, 1);
    assert.equal(plans[1].number, 2);
  });

  it('core modules exist in src/core/', () => {
    const coreModules = ['pipeline', 'state-manager', 'gate-evaluator', 'dependency-analyzer', 'plan-parser', 'logger'];
    for (const mod of coreModules) {
      const fullPath = path.join(PROJECT_ROOT, 'src', 'core', `${mod}.js`);
      assert.ok(fs.existsSync(fullPath), `src/core/${mod}.js should exist`);
    }
  });

  it('drivers/cli-driver.js exists and loads', () => {
    const CLIDriver = require(path.join(PROJECT_ROOT, 'src', 'drivers', 'cli-driver.js'));
    assert.ok(CLIDriver, 'cli-driver should export something');
  });

  it('orchestrator.js re-exports cli-driver (facade)', () => {
    const Orchestrator = require(path.join(PROJECT_ROOT, 'src', 'orchestrator.js'));
    const CLIDriver = require(path.join(PROJECT_ROOT, 'src', 'drivers', 'cli-driver.js'));
    assert.equal(Orchestrator, CLIDriver, 'orchestrator should be the same as cli-driver');
  });

  it('interactive driver placeholder exists', () => {
    const readmePath = path.join(PROJECT_ROOT, 'src', 'drivers', 'interactive', 'README.md');
    assert.ok(fs.existsSync(readmePath), 'interactive driver README should exist');
  });
});

// ============================================================
//  7. --upto Edge Cases
// ============================================================

describe('--upto edge cases', () => {
  const Pipeline = require(path.join(PROJECT_ROOT, 'src', 'core', 'pipeline.js'));
  const CLIDriver = require(path.join(PROJECT_ROOT, 'src', 'drivers', 'cli-driver.js'));

  // Direct test of _isPastUpto via prototype (it's a pure function)
  const driver = Object.create(CLIDriver.prototype);

  it('_isPastUpto returns false when stage equals upto (same stage)', () => {
    assert.equal(driver._isPastUpto('plan', 'plan'), false);
    assert.equal(driver._isPastUpto('gate-check', 'gate-check'), false);
    assert.equal(driver._isPastUpto('evidence-package', 'evidence-package'), false);
  });

  it('_isPastUpto returns true when stage is after upto', () => {
    assert.equal(driver._isPastUpto('strengthen', 'plan'), true);
    assert.equal(driver._isPastUpto('code', 'gate-check'), true);
    assert.equal(driver._isPastUpto('evidence-package', 'rtm'), true);
  });

  it('_isPastUpto returns false when stage is before upto', () => {
    assert.equal(driver._isPastUpto('plan', 'strengthen'), false);
    assert.equal(driver._isPastUpto('gate-check', 'code'), false);
    assert.equal(driver._isPastUpto('rtm', 'evidence-package'), false);
  });

  it('_isPastUpto returns false for unknown stages', () => {
    assert.equal(driver._isPastUpto('unknown', 'plan'), false);
    assert.equal(driver._isPastUpto('plan', 'unknown'), false);
    assert.equal(driver._isPastUpto('blocked', 'plan'), false);
  });

  it('gate-check and code are separate steps in the run loop', () => {
    // Verify _gateCheck exists (not _gateCheckAndCode)
    assert.ok(typeof CLIDriver.prototype._gateCheck === 'function', '_gateCheck method should exist');
    assert.equal(typeof CLIDriver.prototype._gateCheckAndCode, 'undefined', '_gateCheckAndCode should not exist');

    // Verify the switch case for 'strengthened' calls _gateCheck (not _gateCheckAndCode)
    const source = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'drivers', 'cli-driver.js'), 'utf8');
    assert.ok(source.includes("await this._gateCheck(phase.number, specContent)"), 'run loop should call _gateCheck for strengthened status');
    assert.ok(!source.includes('_gateCheckAndCode'), 'should not reference _gateCheckAndCode anywhere');
  });

  it('CLI has --upto flag on resume command', () => {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, 'bin', 'overdrive.js'), 'utf8');
    // Find the resume command section and verify it has --upto
    const resumeSection = content.slice(content.indexOf("command('resume')"));
    assert.ok(resumeSection.includes('--upto'), 'resume command should have --upto flag');
  });

  it('_gateCheck sets status to coding when gates pass', () => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'drivers', 'cli-driver.js'), 'utf8');
    // The _gateCheck method should set status to 'coding' after gates pass
    const gateCheckMethod = source.slice(source.indexOf('async _gateCheck('), source.indexOf('async _codePhase('));
    assert.ok(gateCheckMethod.includes("'coding'"), '_gateCheck should set status to coding');
    assert.ok(!gateCheckMethod.includes('_codePhase'), '_gateCheck should NOT call _codePhase directly');
  });
});

// ============================================================
//  8. State — pause_reason tracking
// ============================================================

describe('State pause_reason', () => {
  const StateManager = require(path.join(PROJECT_ROOT, 'src', 'core', 'state-manager.js'));
  const tmpDir = path.join(require('os').tmpdir(), `overdrive-test-pause-${Date.now()}`);

  it('setPauseReason stores reason in project state', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    sm.setProjectStatus('paused');
    sm.setPauseReason('upto:plan');

    const state = sm.get();
    assert.equal(state.project.status, 'paused');
    assert.equal(state.project.pause_reason, 'upto:plan');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('pause_reason clears when project resumes', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);

    sm.setProjectStatus('paused');
    sm.setPauseReason('upto:strengthen');
    assert.equal(sm.get().project.pause_reason, 'upto:strengthen');

    sm.setProjectStatus('running');
    assert.equal(sm.get().project.pause_reason, null);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('pause_reason persists to disk and survives reload', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sm = new StateManager(tmpDir);
    sm.initProject('test', 'spec.md', [{ number: 1, name: 'P1', dependencies: [] }]);
    sm.setProjectStatus('paused');
    sm.setPauseReason('upto:gate-check');

    // Reload from disk
    const sm2 = new StateManager(tmpDir);
    const loaded = sm2.load();
    assert.equal(loaded.project.pause_reason, 'upto:gate-check');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================
//  9. Interactive Driver — Slash command structure
// ============================================================

describe('Interactive Driver', () => {
  const cmdPath = path.join(PROJECT_ROOT, '.claude', 'commands', 'overdrive.md');

  it('slash command file exists at .claude/commands/overdrive.md', () => {
    assert.ok(fs.existsSync(cmdPath), 'slash command should exist');
  });

  it('slash command contains $ARGUMENTS placeholder', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('$ARGUMENTS'), 'should reference $ARGUMENTS for argument passing');
  });

  it('slash command references Task tool for subagent dispatch', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('Task tool'), 'should reference Task tool for subagent dispatch');
  });

  it('slash command covers all 9 pipeline stages', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    const stages = ['plan', 'strengthen', 'gate-check', 'code', 'verify', 'ivv', 'evidence', 'rtm', 'evidence-package'];
    for (const stage of stages) {
      assert.ok(content.includes(stage), `should reference stage: ${stage}`);
    }
  });

  it('slash command references enriched spec', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('enriched-spec.md'), 'should reference enriched spec file');
    assert.ok(content.toLowerCase().includes('clarif'), 'should mention clarifying questions');
  });

  it('slash command includes context self-management', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('Context'), 'should have context management section');
    assert.ok(content.includes('checkpoint') || content.includes('Checkpoint'), 'should mention checkpointing');
    assert.ok(content.includes('15'), 'should specify cycle limit for checkpointing');
  });

  it('slash command references shared prompt templates', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('prompts/plan-phase.md'), 'should reference plan prompt');
    assert.ok(content.includes('prompts/strengthen-plan.md'), 'should reference strengthen prompt');
    assert.ok(content.includes('prompts/code-plan.md'), 'should reference code prompt');
    assert.ok(content.includes('prompts/ivv-verify.md'), 'should reference IV&V prompt');
  });

  it('slash command supports --resume flag', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('--resume'), 'should support --resume flag');
    assert.ok(content.includes('BUILD-STATE.md'), 'should reference state file for resume');
  });

  it('slash command supports --upto flag', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('--upto'), 'should support --upto flag');
    assert.ok(content.includes('pause_reason'), 'should reference pause_reason in state');
  });

  it('slash command enforces thin orchestrator pattern', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('THIN ORCHESTRATOR'), 'should emphasize thin orchestrator rule');
    assert.ok(content.includes('NEVER do planning'), 'should forbid doing heavy work inline');
  });

  it('slash command uses same state format as CLI mode', () => {
    const content = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(content.includes('mode: interactive'), 'should set mode to interactive');
    assert.ok(content.includes('last_driver: interactive'), 'should set last_driver');
    // Verify it uses the same status values as CLI
    assert.ok(content.includes('pending'), 'should use same status values');
    assert.ok(content.includes('strengthened'), 'should use same status values');
    assert.ok(content.includes('rtm-complete'), 'should use same status values');
  });

  it('interactive driver README documents mode mixing', () => {
    const readmePath = path.join(PROJECT_ROOT, 'src', 'drivers', 'interactive', 'README.md');
    const content = fs.readFileSync(readmePath, 'utf8');
    assert.ok(content.includes('Mode Mixing') || content.includes('mode mixing'), 'should document mode mixing');
    assert.ok(content.includes('last_driver'), 'should explain last_driver field');
  });
});
