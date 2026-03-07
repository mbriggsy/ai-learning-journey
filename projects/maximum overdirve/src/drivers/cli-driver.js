/**
 * cli-driver.js — CLI Mode Driver
 *
 * Fully autonomous execution. Node.js process drives everything.
 * Calls `claude` CLI as subprocess. Human walks away.
 *
 * Uses shared core (pipeline.js) for step definitions.
 * Executes steps via claude-runner.js subprocess invocations.
 *
 * The pipeline: plan -> strengthen -> gate check -> code -> verify -> IV&V -> evidence -> RTM -> evidence package
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const chalk = require('chalk');
const yaml = require('js-yaml');

const StateManager = require('../core/state-manager');
const ClaudeRunner = require('../claude-runner');
const PlanParser = require('../core/plan-parser');
const GateEvaluator = require('../core/gate-evaluator');
const DependencyAnalyzer = require('../core/dependency-analyzer');
const Logger = require('../core/logger');
const McpDetector = require('../mcp-detector');
const IVVRunner = require('../ivv-runner');
const RTMBuilder = require('../rtm-builder');
const Pipeline = require('../core/pipeline');

class CLIDriver {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.planningDir = path.join(projectRoot, '.planning');
    this.state = new StateManager(this.planningDir);
    this.planParser = new PlanParser(this.planningDir);
    this.logger = new Logger(this.planningDir);
    this.config = this._loadConfig();

    this.claude = new ClaudeRunner({
      projectRoot,
      models: this.config.models || {},
      mcpServers: this.config.mcp_servers || [],
      timeouts: this.config.timeouts || {},
      logsDir: path.join(this.planningDir, 'logs'),
      logger: this.logger,
    });

    this.gateEvaluator = new GateEvaluator({ projectRoot, planParser: this.planParser });
    this.dependencyAnalyzer = new DependencyAnalyzer({ claudeRunner: this.claude });
    this.mcpDetector = new McpDetector(projectRoot);
    this.ivvRunner = new IVVRunner({
      claudeRunner: this.claude,
      planParser: this.planParser,
      planningDir: this.planningDir,
      config: this.config,
      logger: this.logger,
    });
    this.rtmBuilder = new RTMBuilder({
      claudeRunner: this.claude,
      planParser: this.planParser,
      planningDir: this.planningDir,
      config: this.config,
      logger: this.logger,
    });
  }

  // ============================================================
  //  INIT — Create project from spec
  // ============================================================

  async init(specFile) {
    console.log(chalk.bold('\n🚀 Initializing project from spec...\n'));

    const specPath = path.isAbsolute(specFile) ? specFile : path.join(this.projectRoot, specFile);
    if (!fs.existsSync(specPath)) throw new Error(`Spec file not found: ${specPath}`);

    const specContent = fs.readFileSync(specPath, 'utf8');
    fs.mkdirSync(this.planningDir, { recursive: true });
    this.logger.init();

    // Call Claude to create phased roadmap
    console.log(chalk.cyan('  Creating phased roadmap...'));
    const step = Pipeline.getStepDescriptor('init-roadmap', { specContent });
    const roadmapPrompt = this.claude.loadPrompt(step.prompt, step.templateVars);
    const roadmapResult = this.claude.run(roadmapPrompt, {
      timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
      logLabel: step.logLabel,
    });

    if (roadmapResult.exitCode !== 0) throw new Error(`Roadmap creation failed:\n${roadmapResult.output}`);

    this.planParser.writeRoadmap(roadmapResult.output);
    const phases = Pipeline.parsePhases(roadmapResult.output);
    if (phases.length === 0) throw new Error('No phases found in roadmap. Check the create-roadmap prompt.');

    const projectName = Pipeline.extractProjectName(specContent, specFile);
    this.state.initProject(projectName, specFile, phases);
    this.state.setProjectStatus('pending');

    this.logger.append({ action: 'init', detail: `Initialized from ${path.basename(specFile)} — ${phases.length} phases` });
    this.state.addLogEntry('init', `Initialized from ${path.basename(specFile)} — ${phases.length} phases`);
    this._gitCommit(`build: initialized from ${path.basename(specFile)}`);

    console.log(chalk.green(`\n  ✓ Project initialized: ${projectName}`));
    console.log(chalk.gray(`    ${phases.length} phases planned`));
    console.log(chalk.gray(`    Complexity: ${this.config.complexity || 'high'} (24-agent registry)`));
    console.log(chalk.gray(`    State: ${path.relative(this.projectRoot, this.state.stateFile)}\n`));

    // Detect MCP servers
    this.mcpDetector.printReport();

    // Extract requirements for RTM
    console.log(chalk.cyan('  Extracting requirements for RTM...'));
    try {
      const reqResult = await this.rtmBuilder.extractRequirements(specContent, projectName, specFile);
      console.log(chalk.green(`  ✓ ${reqResult.total} requirements extracted → requirements.yaml`));
      this.logger.append({ action: 'extract-requirements', detail: `${reqResult.total} requirements extracted` });
      this.state.addLogEntry('extract-requirements', `${reqResult.total} requirements extracted from spec`);
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Requirements extraction failed: ${err.message}`));
      console.log(chalk.yellow(`    RTM will be limited. You can re-extract later with 'overdrive step 0 extract-requirements'.`));
      this.logger.append({ action: 'extract-requirements-failed', detail: err.message, level: 'warn' });
    }

    return { projectName, phases };
  }

  // ============================================================
  //  RUN — The Phase Loop
  // ============================================================

  async run(options = {}) {
    const loaded = this.state.load();
    if (!loaded) throw new Error('No project state found. Run `overdrive init <spec>` first.');

    this.logger.init();
    this.state.setProjectStatus('running');
    console.log(chalk.bold(`\n🏗️  Running: ${loaded.project.name}\n`));

    const specContent = this._loadSpec();
    const upto = options.upto || null;

    // THE PHASE LOOP
    while (true) {
      if (this.state.isComplete()) {
        // All phases done — build the Evidence Package
        await this._buildEvidencePackage(specContent);
        this.state.setProjectStatus('completed');
        console.log(chalk.bold.green('\n🎉 All phases complete! Evidence Package assembled.\n'));
        this.logger.append({ action: 'complete', detail: 'All phases complete. Evidence Package created.' });
        break;
      }

      if (this.state.isAllBlocked()) {
        this.state.setProjectStatus('paused');
        console.log(chalk.bold.yellow('\n⏸  All work blocked by gates:\n'));
        for (const gate of this.state.getBlockedGates()) {
          console.log(chalk.yellow(`  ${gate.id}: ${gate.summary} (Phase ${gate.phase})`));
        }
        console.log(chalk.gray('\n  Resolve gates and run `overdrive resume`\n'));
        break;
      }

      const phase = this.state.getNextActionablePhase();
      if (!phase) { console.log(chalk.gray('\n  No actionable phases. Exiting.\n')); break; }

      // Check --upto: if the current stage matches upto, pause
      const currentStage = Pipeline.STATUS_TO_STAGE[phase.status];
      if (upto && currentStage && this._isPastUpto(currentStage, upto)) {
        this.state.setProjectStatus('paused');
        this.state.addLogEntry('upto-pause', `Paused at --upto ${upto}`);
        console.log(chalk.bold.cyan(`\n⏸  Paused at --upto ${upto}. Run \`overdrive resume\` to continue.\n`));
        break;
      }

      console.log(chalk.bold.cyan(`\n── Phase ${phase.number}: ${phase.name} ──`));
      console.log(chalk.gray(`   Status: ${phase.status}`));

      try {
        switch (phase.status) {
          case 'pending':
            await this._planPhase(phase.number, specContent);
            break;
          case 'planned':
            await this._strengthenPhase(phase.number, specContent);
            break;
          case 'strengthened':
            await this._gateCheckAndCode(phase.number, specContent);
            break;
          case 'coding':
            await this._codePhase(phase.number, specContent);
            break;
          case 'coded':
            await this._verifyPhase(phase.number, specContent);
            break;
          case 'verified':
            await this._ivvPhase(phase.number);
            break;
          case 'ivv-passed':
            await this._collectEvidence(phase.number, specContent);
            break;
          case 'evidence-collected':
            await this._buildRTM(phase.number);
            break;
          case 'rtm-complete':
            // RTM complete — mark phase complete
            this.state.setPhaseStatus(phase.number, 'complete');
            this.logger.stepDone('phase-complete', phase.number, 'Phase complete — full pipeline passed');
            this._gitCommit(`complete: Phase ${phase.number} — ${phase.name}`);
            break;
          case 'blocked':
            await this._handleBlocked(phase.number, specContent);
            break;
          default:
            this.logger.error('unknown-status', phase.number, `Unknown status: ${phase.status}`);
            break;
        }
      } catch (err) {
        this.logger.error('phase-error', phase.number, err.message);
        console.error(chalk.red(`\n  Error in Phase ${phase.number}: ${err.message}\n`));
        this.state.createGate(phase.number, 'decision', `Error: ${err.message}`);
        this.state.addLogEntry('error', err.message, phase.number);
      }

      // Check --upto after each step completion
      if (upto) {
        const completedStage = Pipeline.STATUS_TO_STAGE[phase.status];
        // Re-read the phase status after the step ran
        const updatedPhase = this.state.get().phases[phase.number];
        const newStage = Pipeline.STATUS_TO_STAGE[updatedPhase?.status];
        if (newStage && this._isPastUpto(newStage, upto)) {
          this.state.setProjectStatus('paused');
          this.state.addLogEntry('upto-pause', `Paused at --upto ${upto} after completing ${currentStage}`);
          console.log(chalk.bold.cyan(`\n⏸  Paused at --upto ${upto}. Run \`overdrive resume\` to continue.\n`));
          break;
        }
      }
    }
  }

  // ============================================================
  //  PLAN — Break phase into atomic plans
  // ============================================================

  async _planPhase(phaseNumber, specContent) {
    this.logger.stepStart('plan', phaseNumber, 'Breaking phase into atomic plans');

    const roadmap = this.planParser.readRoadmap() || '';
    const step = Pipeline.getStepDescriptor('plan', {
      phaseNumber,
      phaseName: this.state.get().phases[phaseNumber].name,
      specContent,
      roadmapContent: roadmap,
    });

    const prompt = this.claude.loadPrompt(step.prompt, step.templateVars);
    const result = this.claude.run(prompt, {
      timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
      logLabel: step.logLabel,
    });

    if (result.exitCode !== 0) throw new Error(`Planning failed for Phase ${phaseNumber}:\n${result.output}`);

    const plans = Pipeline.splitPlanOutput(result.output);
    for (const plan of plans) {
      this.planParser.writePlan(phaseNumber, plan.number, plan.content);
    }

    this.state.setPlanCount(phaseNumber, plans.length);
    this.state.addLogEntry('plan', `Phase ${phaseNumber} — ${plans.length} atomic plans`, phaseNumber);
    this.logger.stepDone('plan', phaseNumber, `${plans.length} atomic plans created`);
    this._gitCommit(`plan: Phase ${phaseNumber} — ${plans.length} plans`);
  }

  // ============================================================
  //  STRENGTHEN — The Gauntlet (MANDATORY — NEVER SKIPPED)
  // ============================================================

  async _strengthenPhase(phaseNumber, specContent) {
    this.logger.stepStart('strengthen', phaseNumber, 'Strike Team review (mandatory)');

    const plans = this.planParser.listPlans(phaseNumber);
    const alreadyStrengthened = this.planParser.listStrengthenedPlans(phaseNumber);
    const strengthenedNums = new Set(alreadyStrengthened.map(p => p.number));

    const waves = this.planParser.organizeIntoWaves(plans);
    const mcpServers = this.mcpDetector.getServerNames();

    for (const { wave, plans: wavePlans } of waves) {
      const toStrengthen = wavePlans.filter(p => !strengthenedNums.has(p.number));
      if (toStrengthen.length === 0) continue;

      console.log(chalk.gray(`   Wave ${wave}: strengthening ${toStrengthen.length} plan(s)...`));

      for (const plan of toStrengthen) {
        const planContent = fs.readFileSync(plan.filepath, 'utf8');

        const step = Pipeline.getStepDescriptor('strengthen', {
          phaseNumber,
          planId: plan.id,
          planContent,
          specContent,
          mcpEnhancement: this.mcpDetector.generatePromptEnhancement(),
          complexity: this.config.complexity || 'high',
          contextFiles: [plan.filepath],
          mcpServers,
        });

        const prompt = this.claude.loadPrompt(step.prompt, step.templateVars);
        const result = this.claude.run(prompt, {
          contextFiles: step.contextFiles,
          timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
          logLabel: step.logLabel,
          mcpServers: step.mcpServers,
        });

        if (result.exitCode !== 0) throw new Error(`Strengthening failed for ${plan.id}:\n${result.output}`);

        this.planParser.writeStrengthenedPlan(phaseNumber, plan.number, result.output);

        const bugsCaught = (result.output.match(/^\|\s*\d+\s*\|/gm) || []).length;
        this.state.incrementStrengthened(phaseNumber, bugsCaught);
        this.logger.stepDone('strengthen', phaseNumber, `${plan.id} strengthened — ${bugsCaught} findings`);
      }
    }

    const totalBugs = this.state.get().phases[phaseNumber].bugs_caught;
    this.state.addLogEntry('strengthen', `Phase ${phaseNumber} — all plans strengthened, ${totalBugs} total findings`, phaseNumber);
    this._gitCommit(`strengthen: Phase ${phaseNumber} — Strike Team complete, ${totalBugs} findings`);
  }

  // ============================================================
  //  GATE CHECK + CODE
  // ============================================================

  async _gateCheckAndCode(phaseNumber, specContent) {
    const gateResult = this.gateEvaluator.evaluate(phaseNumber, specContent);

    if (gateResult.gates.length > 0) {
      for (const gate of gateResult.gates) {
        const gateId = this.state.createGate(phaseNumber, gate.type, gate.summary);
        this.logger.gate(gateId, phaseNumber, gate.summary);
      }

      if (gateResult.executablePlans.length > 0) {
        console.log(chalk.yellow(`   ${gateResult.gates.length} gate(s) found, but ${gateResult.executablePlans.length} plan(s) can proceed`));
      } else {
        console.log(chalk.yellow(`   Phase blocked by ${gateResult.gates.length} gate(s)`));
        await this._handleBlocked(phaseNumber, specContent);
        return;
      }
    }

    await this._codePhase(phaseNumber, specContent);
  }

  // ============================================================
  //  CODE — Write the damn code
  //  THE CRITICAL CONSTRAINT: Won't run if strengthening incomplete
  // ============================================================

  async _codePhase(phaseNumber, specContent) {
    const canCode = this.state.canCode(phaseNumber);
    if (!canCode.allowed) throw new Error(canCode.reason);

    this.logger.stepStart('code', phaseNumber, 'Coding strengthened plans');
    this.state.setPhaseStatus(phaseNumber, 'coding');

    const strengthenedPlans = this.planParser.listStrengthenedPlans(phaseNumber);
    const waves = this.planParser.organizeIntoWaves(
      strengthenedPlans.map(p => ({ ...p, filepath: p.filepath }))
    );

    for (const { wave, plans: wavePlans } of waves) {
      console.log(chalk.gray(`   Wave ${wave}: coding ${wavePlans.length} plan(s)...`));

      for (const plan of wavePlans) {
        const codedIds = this.state.get().phases[phaseNumber].coded_plan_ids || [];
        if (codedIds.includes(plan.id)) continue;

        const planContent = fs.readFileSync(plan.filepath, 'utf8');
        const step = Pipeline.getStepDescriptor('code', {
          phaseNumber,
          planId: plan.id,
          planContent,
          specContent,
        });

        const prompt = this.claude.loadPrompt(step.prompt, step.templateVars);

        let result;
        let attempts = 0;

        while (attempts < step.maxAttempts) {
          attempts++;
          result = await this.claude.runExecution(prompt, {
            timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
            logLabel: `${step.logLabel}-attempt-${attempts}`,
          });

          if (result.exitCode === 0) break;

          if (attempts < step.maxAttempts) {
            console.log(chalk.yellow(`   Retry ${plan.id} (attempt ${attempts + 1})...`));
          }
        }

        if (result.exitCode !== 0) {
          if (result.output.includes('SPEC_INCOMPLETE')) {
            const missing = result.output.match(/SPEC_INCOMPLETE:\s*(.+)/)?.[1] || 'Unspecified gap';
            this.state.createGate(phaseNumber, 'decision',
              `Implementation Specification incomplete for ${plan.id}: ${missing}. Needs re-strengthening.`);
            this.logger.error('code', phaseNumber, `${plan.id} — spec incomplete: ${missing}`);
          } else {
            this.state.createGate(phaseNumber, 'decision',
              `Coding failed for ${plan.id} after ${step.maxAttempts} attempts`);
            this.logger.error('code', phaseNumber, `${plan.id} failed after ${step.maxAttempts} attempts`);
          }
          continue;
        }

        const commitHash = this._getLatestCommitHash();
        this.state.incrementCoded(phaseNumber, commitHash, plan.id);
        this.logger.stepDone('code', phaseNumber, `${plan.id} coded`);
      }
    }

    const phaseState = this.state.get().phases[phaseNumber];
    if (phaseState.plans_coded >= phaseState.plans_total) {
      this.state.setPhaseStatus(phaseNumber, 'coded');
      this.state.addLogEntry('code', `Phase ${phaseNumber} — all plans coded`, phaseNumber);
      this._gitCommit(`code: Phase ${phaseNumber} complete`);
    }
  }

  // ============================================================
  //  VERIFY — Does it actually work?
  // ============================================================

  async _verifyPhase(phaseNumber, specContent) {
    this.logger.stepStart('verify', phaseNumber, 'Verifying phase');

    const step = Pipeline.getStepDescriptor('verify', {
      phaseNumber,
      phaseName: this.state.get().phases[phaseNumber].name,
      specContent,
    });

    const prompt = this.claude.loadPrompt(step.prompt, step.templateVars);
    const result = await this.claude.runExecution(prompt, {
      allowedTools: step.allowedTools,
      timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
      logLabel: step.logLabel,
    });

    const verifyDir = path.join(this.planningDir, 'verification');
    fs.mkdirSync(verifyDir, { recursive: true });
    fs.writeFileSync(path.join(verifyDir, `phase-${phaseNumber}-result.md`), result.output, 'utf8');

    const passed = Pipeline.parseVerificationResult(result.output);

    if (passed) {
      this.state.setPhaseStatus(phaseNumber, 'verified');
      this.state.addLogEntry('verify', `Phase ${phaseNumber} — PASSED`, phaseNumber);
      this.logger.stepDone('verify', phaseNumber, 'PASSED');
      this._gitCommit(`verify: Phase ${phaseNumber} PASSED`);
    } else {
      const fixAttempts = this.state.getFixAttempts(phaseNumber);
      if (fixAttempts < 2) {
        const attempt = this.state.incrementFixAttempts(phaseNumber);
        console.log(chalk.yellow(`   Verification failed — auto-fix attempt ${attempt}/2`));
        this.state.setPhaseStatus(phaseNumber, 'strengthened');
        this.state.addLogEntry('verify-fix', `Phase ${phaseNumber} — auto-fix attempt ${attempt}`, phaseNumber);
      } else {
        this.state.createGate(phaseNumber, 'decision',
          `Verification failed after 2 fix attempts for Phase ${phaseNumber}`);
        this.logger.error('verify', phaseNumber, 'FAILED — gate created');
      }
    }
  }

  // ============================================================
  //  IV&V — Independent Verification & Validation
  // ============================================================

  async _ivvPhase(phaseNumber) {
    this.logger.stepStart('ivv', phaseNumber, 'Independent Verification & Validation');
    const complexity = this.config.complexity || 'high';
    const phaseState = this.state.get().phases[phaseNumber];

    console.log(chalk.cyan(`   🔍 IV&V: Fresh context, no spec/plan — just acceptance criteria + code`));
    if (complexity === 'maximum') {
      console.log(chalk.gray(`   Cold code read active (maximum complexity)`));
    }

    const result = await this.ivvRunner.run(phaseNumber, phaseState);

    if (result.passed) {
      this.state.setIVVResult(phaseNumber, {
        passed: true,
        conditional: result.conditional || false,
        concerns: result.concerns || [],
      });

      const verdict = result.conditional ? 'CONDITIONAL PASS' : 'PASS';
      this.state.addLogEntry('ivv', `Phase ${phaseNumber} — IV&V ${verdict}`, phaseNumber);
      this.logger.stepDone('ivv', phaseNumber, verdict);
      this._gitCommit(`ivv: Phase ${phaseNumber} — ${verdict}`);

      if (result.conditional && result.concerns.length > 0) {
        console.log(chalk.yellow(`   ⚠ IV&V conditional pass — concerns noted:`));
        for (const concern of result.concerns.slice(0, 3)) {
          console.log(chalk.yellow(`     • ${concern.substring(0, 120)}...`));
        }
      }
    } else {
      console.log(chalk.red(`   ✗ IV&V FAILED — independent verifier found issues`));
      this.state.setIVVResult(phaseNumber, {
        passed: false,
        conditional: false,
        concerns: result.concerns || [],
      });

      this.state.createGate(phaseNumber, 'decision',
        `IV&V FAILED for Phase ${phaseNumber}. Independent verifier (no spec/plan access) found issues that survived the full pipeline. Review the IV&V report in .planning/ivv/`);
      this.logger.error('ivv', phaseNumber, 'FAILED — gate created for human review');
      this.state.addLogEntry('ivv', `Phase ${phaseNumber} — IV&V FAILED`, phaseNumber);
    }
  }

  // ============================================================
  //  COLLECT EVIDENCE
  // ============================================================

  async _collectEvidence(phaseNumber, specContent) {
    const canCollect = this.state.canCollectEvidence(phaseNumber);
    if (!canCollect.allowed) throw new Error(canCollect.reason);

    this.logger.stepStart('evidence', phaseNumber, 'Collecting evidence');

    const step = Pipeline.getStepDescriptor('evidence', {
      phaseNumber,
      phaseName: this.state.get().phases[phaseNumber].name,
      specContent,
    });

    const prompt = this.claude.loadPrompt(step.prompt, step.templateVars);
    const result = await this.claude.runExecution(prompt, {
      allowedTools: step.allowedTools,
      timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
      logLabel: step.logLabel,
    });

    const evidenceDir = path.join(this.planningDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, `phase-${phaseNumber}-evidence.md`),
      result.output,
      'utf8'
    );

    this.state.setPhaseStatus(phaseNumber, 'evidence-collected');
    this.state.addLogEntry('evidence', `Phase ${phaseNumber} — evidence collected`, phaseNumber);
    this.logger.stepDone('evidence', phaseNumber, 'Evidence collected');
    this._gitCommit(`evidence: Phase ${phaseNumber} evidence collected`);
  }

  // ============================================================
  //  BUILD RTM
  // ============================================================

  async _buildRTM(phaseNumber) {
    const canBuild = this.state.canBuildRTM(phaseNumber);
    if (!canBuild.allowed) throw new Error(canBuild.reason);

    this.logger.stepStart('rtm', phaseNumber, 'Building Requirements Traceability Matrix');
    const phaseState = this.state.get().phases[phaseNumber];

    console.log(chalk.cyan(`   📊 RTM: Tracing requirements through plan → test → code → evidence`));

    const result = await this.rtmBuilder.buildPhaseRTM(phaseNumber, phaseState);

    if (result.verdict === 'NO_REQUIREMENTS') {
      console.log(chalk.gray(`   No requirements assigned to Phase ${phaseNumber} — RTM pass-through`));
      this.state.setRTMResult(phaseNumber, {
        complete: true,
        gaps: [],
        total: 0,
        covered: 0,
        verdict: 'NO_REQUIREMENTS',
      });
      this.state.addLogEntry('rtm', `Phase ${phaseNumber} — no requirements to trace`, phaseNumber);
      this.logger.stepDone('rtm', phaseNumber, 'No requirements — pass-through');
      this._gitCommit(`rtm: Phase ${phaseNumber} — no requirements to trace`);
      return;
    }

    this.state.setRTMResult(phaseNumber, {
      complete: result.complete,
      gaps: result.gaps,
      total: result.total,
      covered: result.covered,
      verdict: result.verdict,
    });

    if (result.complete) {
      const coveragePct = result.total > 0 ? Math.round((result.covered / result.total) * 100) : 100;
      console.log(chalk.green(`   ✓ RTM: ${result.covered}/${result.total} requirements traced (${coveragePct}%)`));
      this.state.addLogEntry('rtm', `Phase ${phaseNumber} — RTM COMPLETE: ${result.covered}/${result.total} traced`, phaseNumber);
      this.logger.stepDone('rtm', phaseNumber, `COMPLETE — ${result.covered}/${result.total} traced`);
      this._gitCommit(`rtm: Phase ${phaseNumber} — ${result.covered}/${result.total} requirements traced`);
    } else {
      const highGaps = result.gaps.filter(g => g.severity === 'high');
      const gapCount = result.gaps.length;

      console.log(chalk.yellow(`   ⚠ RTM: ${gapCount} gap(s) found (${highGaps.length} high severity)`));

      if (highGaps.length > 0) {
        console.log(chalk.yellow(`   High severity gaps:`));
        for (const gap of highGaps.slice(0, 5)) {
          console.log(chalk.yellow(`     • ${gap.requirement}: ${gap.missing} — ${(gap.detail || '').substring(0, 100)}`));
        }
        if (highGaps.length > 5) {
          console.log(chalk.yellow(`     ... and ${highGaps.length - 5} more`));
        }

        this.state.createGate(phaseNumber, 'decision',
          `RTM found ${highGaps.length} high-severity gap(s) for Phase ${phaseNumber}. ` +
          `Requirements with missing plan or test coverage need human review. ` +
          `See .planning/rtm/phase-${phaseNumber}-rtm-report.md`);
        this.logger.error('rtm', phaseNumber, `GAPS FOUND — ${highGaps.length} high severity, gate created`);
      } else {
        this.state.setRTMResult(phaseNumber, {
          complete: true,
          gaps: result.gaps,
          total: result.total,
          covered: result.covered,
          verdict: 'COMPLETE_WITH_NOTES',
        });
        console.log(chalk.gray(`   Medium/low gaps noted but not blocking. See RTM report.`));
        this.state.addLogEntry('rtm', `Phase ${phaseNumber} — RTM complete with ${gapCount} minor gap(s)`, phaseNumber);
        this.logger.stepDone('rtm', phaseNumber, `Complete with ${gapCount} minor gap(s)`);
        this._gitCommit(`rtm: Phase ${phaseNumber} — complete with ${gapCount} minor gap(s)`);
      }
    }
  }

  // ============================================================
  //  EVIDENCE PACKAGE — Final deliverable (runs after all phases)
  // ============================================================

  async _buildEvidencePackage(specContent) {
    console.log(chalk.bold.cyan('\n── Assembling Evidence Package ──'));
    this.logger.stepStart('evidence-package', null, 'Building Evidence Package');

    // Gather all evidence files
    const evidenceDir = path.join(this.planningDir, 'evidence');
    let evidenceFiles = '';
    if (fs.existsSync(evidenceDir)) {
      const files = fs.readdirSync(evidenceDir).filter(f => f.endsWith('.md')).sort();
      for (const file of files) {
        const content = fs.readFileSync(path.join(evidenceDir, file), 'utf8');
        evidenceFiles += `\n---\n### ${file}\n\n${content}\n`;
      }
    }

    // Gather IV&V reports
    const ivvDir = path.join(this.planningDir, 'ivv');
    let ivvFiles = '';
    if (fs.existsSync(ivvDir)) {
      const files = fs.readdirSync(ivvDir).filter(f => f.endsWith('.md')).sort();
      for (const file of files) {
        const content = fs.readFileSync(path.join(ivvDir, file), 'utf8');
        ivvFiles += `\n---\n### ${file}\n\n${content}\n`;
      }
    }

    // Build project-level RTM summary
    let rtmSummary = '';
    try {
      const rtmResult = this.rtmBuilder.buildProjectRTMSummary();
      rtmSummary = rtmResult.report || '';
      if (rtmResult.stats) {
        console.log(chalk.gray(`   RTM: ${rtmResult.stats.totalCovered}/${rtmResult.stats.totalReqs} requirements traced, ${rtmResult.stats.totalGaps} gaps, ${rtmResult.stats.orphaned} orphaned`));
      }
    } catch (err) {
      console.log(chalk.yellow(`   ⚠ RTM summary failed: ${err.message}`));
      rtmSummary = `(RTM summary unavailable: ${err.message})`;
    }

    const currentState = this.state.get();

    const step = Pipeline.getStepDescriptor('evidence-package', {
      projectName: currentState.project.name,
      specFile: currentState.project.spec_file,
      buildStarted: currentState.project.started_at,
      specContent,
      stateContent: JSON.stringify(currentState, null, 2),
      evidenceFiles: evidenceFiles || undefined,
      ivvFiles: ivvFiles || undefined,
      rtmSummary: rtmSummary || undefined,
    });

    const prompt = this.claude.loadPrompt(step.prompt, step.templateVars);
    const result = await this.claude.runExecution(prompt, {
      allowedTools: step.allowedTools,
      timeout: this.config.timeouts?.[step.timeoutKey] || step.defaultTimeout,
      logLabel: step.logLabel,
    });

    // Write the Evidence Package
    const packagePath = path.join(this.planningDir, 'EVIDENCE-PACKAGE.md');
    fs.writeFileSync(packagePath, result.output, 'utf8');

    this.state.addLogEntry('evidence-package', 'Evidence Package assembled');
    this.logger.stepDone('evidence-package', null, `Written to ${path.relative(this.projectRoot, packagePath)}`);
    this._gitCommit('evidence: Evidence Package assembled');

    console.log(chalk.green(`\n  ✓ Evidence Package: ${path.relative(this.projectRoot, packagePath)}`));
  }

  // ============================================================
  //  SKIP-AHEAD — When blocked, find independent work
  // ============================================================

  async _handleBlocked(phaseNumber, specContent) {
    console.log(chalk.yellow(`   Phase ${phaseNumber} blocked — evaluating skip-ahead...`));

    const roadmap = this.planParser.readRoadmap();
    const skipResults = this.dependencyAnalyzer.evaluateSkipAhead(
      this.state.get(), roadmap, specContent
    );

    const canProceed = skipResults.filter(r => r.action !== 'blocked');
    if (canProceed.length > 0) {
      for (const skip of canProceed) {
        this.state.addSkipDecision(phaseNumber, skip.phase, skip.rationale);
        this.logger.skipAhead(phaseNumber, skip.phase, skip.rationale);
        console.log(chalk.cyan(`   → Skip to Phase ${skip.phase}: ${skip.rationale}`));
      }
    } else {
      console.log(chalk.yellow(`   No independent phases found — all work blocked`));
    }
  }

  // ============================================================
  //  STATUS
  // ============================================================

  status() {
    const loaded = this.state.load();
    if (!loaded) {
      console.log(chalk.yellow('\n  No project initialized. Run `overdrive init <spec>` first.\n'));
      return;
    }

    console.log(chalk.bold(`\n📊 ${loaded.project.name}`));
    console.log(chalk.gray(`   Status: ${loaded.project.status}`));
    console.log(chalk.gray(`   Complexity: ${this.config.complexity || 'high'}`));
    console.log(chalk.gray(`   Started: ${loaded.project.started_at}\n`));

    const statusIcons = {
      pending: '⬜', planned: '📝', strengthened: '💪', coding: '⚡',
      coded: '📦', verified: '✅', 'ivv-passed': '🔍', 'evidence-collected': '📋',
      'rtm-complete': '📊', complete: '🎉', blocked: '🚫',
    };

    for (const [num, phase] of Object.entries(loaded.phases)) {
      const icon = statusIcons[phase.status] || '❓';
      const ivvTag = phase.ivv_status ? `, IV&V: ${phase.ivv_status}` : '';
      const rtmTag = phase.rtm_status ? `, RTM: ${phase.rtm_status}${phase.rtm_coverage != null ? ` (${phase.rtm_coverage}%)` : ''}` : '';
      const progress = phase.plans_total > 0
        ? ` [${phase.plans_coded}/${phase.plans_total} coded, ${phase.plans_strengthened} strengthened, ${phase.bugs_caught || 0} bugs caught${ivvTag}${rtmTag}]`
        : '';
      console.log(chalk.white(`   ${icon} Phase ${num}: ${phase.name} — ${phase.status}${progress}`));

      if (phase.blocked_by) {
        const gate = loaded.gates[phase.blocked_by];
        if (gate) console.log(chalk.yellow(`      ↳ ${phase.blocked_by}: ${gate.summary}`));
      }
    }

    const blockedGates = Object.entries(loaded.gates).filter(([_, g]) => g.status === 'blocked');
    if (blockedGates.length > 0) {
      console.log(chalk.yellow(`\n   ⚠ ${blockedGates.length} open gate(s):`));
      for (const [id, gate] of blockedGates) {
        console.log(chalk.yellow(`     ${id}: ${gate.summary}`));
      }
    }

    const pkgPath = path.join(this.planningDir, 'EVIDENCE-PACKAGE.md');
    if (fs.existsSync(pkgPath)) {
      console.log(chalk.green(`\n   📋 Evidence Package: .planning/EVIDENCE-PACKAGE.md`));
    }

    this.mcpDetector.printReport();
  }

  // ============================================================
  //  RESUME
  // ============================================================

  async resume(options = {}) {
    const loaded = this.state.load();
    if (!loaded) throw new Error('No project state found.');

    const blockedGates = this.state.getBlockedGates();
    if (blockedGates.length === 0) {
      console.log(chalk.green('\n  No blocked gates. Running normally...\n'));
      return this.run(options);
    }

    console.log(chalk.bold('\n🔓 Checking gates...\n'));
    for (const gate of blockedGates) {
      console.log(chalk.cyan(`  Resolving ${gate.id}: ${gate.summary}`));
      this.state.resolveGate(gate.id);
      this.logger.append({ action: `gate-resolved:${gate.id}`, phase: gate.phase, detail: gate.summary });
    }

    console.log(chalk.green(`\n  ✓ ${blockedGates.length} gate(s) resolved. Resuming...\n`));
    return this.run(options);
  }

  // ============================================================
  //  STEP — Manual single-step (escape hatch)
  // ============================================================

  async step(phaseNumber, stepName) {
    const loaded = this.state.load();
    if (!loaded) throw new Error('No project state found.');
    const specContent = this._loadSpec();

    console.log(chalk.bold(`\n🔧 Manual step: Phase ${phaseNumber} → ${stepName}\n`));

    switch (stepName) {
      case 'plan': await this._planPhase(phaseNumber, specContent); break;
      case 'strengthen': await this._strengthenPhase(phaseNumber, specContent); break;
      case 'code': await this._codePhase(phaseNumber, specContent); break;
      case 'verify': await this._verifyPhase(phaseNumber, specContent); break;
      case 'ivv': await this._ivvPhase(phaseNumber); break;
      case 'evidence': await this._collectEvidence(phaseNumber, specContent); break;
      case 'rtm': await this._buildRTM(phaseNumber); break;
      case 'extract-requirements':
        console.log(chalk.cyan('  Re-extracting requirements from spec...'));
        const projectName = this.state.get().project.name;
        const specFile = this.state.get().project.spec_file;
        const reqResult = await this.rtmBuilder.extractRequirements(specContent, projectName, specFile);
        console.log(chalk.green(`  ✓ ${reqResult.total} requirements extracted`));
        break;
      default: throw new Error(`Unknown step: ${stepName}. Valid: plan, strengthen, code, verify, ivv, evidence, rtm, extract-requirements`);
    }
  }

  // ============================================================
  //  Internal helpers
  // ============================================================

  _loadConfig() {
    const configPath = path.join(this.projectRoot, '.overdrive.yaml');
    if (fs.existsSync(configPath)) {
      return yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    }
    return {};
  }

  _loadSpec() {
    const state = this.state.get();
    if (!state?.project?.spec_file) throw new Error('No spec file in state');
    const specPath = path.isAbsolute(state.project.spec_file)
      ? state.project.spec_file
      : path.join(this.projectRoot, state.project.spec_file);
    const specContent = fs.readFileSync(specPath, 'utf8');

    const SPEC_WARN_THRESHOLD = 100000;
    if (specContent.length > SPEC_WARN_THRESHOLD) {
      console.log(chalk.yellow(`  ⚠ Spec file is ${(specContent.length / 1000).toFixed(0)}K chars (~${Math.round(specContent.length / 4000)}K tokens).`));
      console.log(chalk.yellow(`    Large specs consume context budget across all prompts. Consider extracting appendices.`));
    }

    return specContent;
  }

  /**
   * Check if a stage is past the --upto target.
   * Returns true if the stage index is >= the upto stage index.
   */
  _isPastUpto(stage, upto) {
    const stageIndex = Pipeline.PIPELINE_STAGES.indexOf(stage);
    const uptoIndex = Pipeline.PIPELINE_STAGES.indexOf(upto);
    if (stageIndex === -1 || uptoIndex === -1) return false;
    return stageIndex > uptoIndex;
  }

  _getLatestCommitHash() {
    try { return execSync('git rev-parse HEAD', { cwd: this.projectRoot, encoding: 'utf8' }).trim(); }
    catch { return null; }
  }

  _gitCommit(message) {
    try {
      execSync('git add .planning/', { cwd: this.projectRoot, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', message, '--allow-empty'], { cwd: this.projectRoot, stdio: 'pipe' });
    } catch { /* Git not available — fine */ }
  }
}

module.exports = CLIDriver;
