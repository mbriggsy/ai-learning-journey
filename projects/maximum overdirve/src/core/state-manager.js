/**
 * state-manager.js — Reads/writes BUILD-STATE.md
 * 
 * Workflow: plan → strengthen → gate check → code → verify → IV&V → evidence → RTM → evidence package
 * 
 * Rules:
 * - Write after every step (not after every phase)
 * - Log is append-only, never edit or truncate
 * - Gate IDs are sequential, never reused
 * - Git commit state at phase boundaries
 * - State survives crashes — kill the script, restart, it picks up
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const STATE_FILENAME = 'BUILD-STATE.md';

class StateManager {
  constructor(planningDir) {
    this.planningDir = planningDir;
    this.stateFile = path.join(planningDir, STATE_FILENAME);
    this.state = null;
  }

  /**
   * Initialize state for a new project
   */
  initProject(projectName, specFile, phases) {
    this.state = {
      project: {
        name: projectName,
        spec_file: specFile,
        started_at: new Date().toISOString(),
        completed_at: null,
        status: 'pending', // pending | running | paused | completed | failed
      },
      phases: {},
      gates: {},
      skip_decisions: [],
      log: [],
    };

    for (const phase of phases) {
      this.state.phases[phase.number] = {
        name: phase.name,
        // pending → planned → strengthened → coding → coded → verified → ivv-passed → evidence-collected → rtm-complete → complete
        status: 'pending',
        plans_total: 0,
        plans_strengthened: 0,
        plans_coded: 0,
        coded_plan_ids: [],
        fix_attempts: 0,
        ivv_status: null, // null | 'passed' | 'conditional' | 'failed'
        ivv_concerns: [],
        rtm_status: null, // null | 'complete' | 'gaps-found' | 'no-requirements'
        rtm_gaps: [],
        rtm_coverage: null, // percentage: 0-100
        bugs_caught: 0,
        blocked_by: null,
        started_at: null,
        completed_at: null,
        dependencies: phase.dependencies || [],
      };
    }

    this._writeToDisk();
    return this.state;
  }

  /**
   * Load state from disk
   */
  load() {
    if (!fs.existsSync(this.stateFile)) return null;
    const raw = fs.readFileSync(this.stateFile, 'utf8');
    const yamlMatch = raw.match(/```yaml\n([\s\S]*?)\n```/);
    const yamlContent = yamlMatch ? yamlMatch[1] : raw;
    this.state = yaml.load(yamlContent);
    return this.state;
  }

  get() { return this.state; }

  setProjectStatus(status) {
    this.state.project.status = status;
    if (status === 'completed') {
      this.state.project.completed_at = new Date().toISOString();
    }
    this._writeToDisk();
  }

  setPhaseStatus(phaseNumber, status) {
    const phase = this._getPhase(phaseNumber);
    phase.status = status;
    if (status !== 'pending' && !phase.started_at) {
      phase.started_at = new Date().toISOString();
    }
    if (status === 'complete') {
      phase.completed_at = new Date().toISOString();
    }
    this._writeToDisk();
  }

  setPlanCount(phaseNumber, count) {
    const phase = this._getPhase(phaseNumber);
    phase.plans_total = count;
    phase.status = 'planned';
    this._writeToDisk();
  }

  incrementStrengthened(phaseNumber, bugsCaught = 0) {
    const phase = this._getPhase(phaseNumber);
    phase.plans_strengthened += 1;
    phase.bugs_caught += bugsCaught;
    if (phase.plans_strengthened >= phase.plans_total) {
      phase.status = 'strengthened';
    }
    this._writeToDisk();
  }

  incrementCoded(phaseNumber, commitHash, planId = null) {
    const phase = this._getPhase(phaseNumber);
    phase.plans_coded += 1;
    if (planId) {
      if (!phase.coded_plan_ids) phase.coded_plan_ids = [];
      phase.coded_plan_ids.push(planId);
    }
    if (commitHash) {
      if (!phase.commits) phase.commits = [];
      phase.commits.push(commitHash);
    }
    this._writeToDisk();
  }

  getFixAttempts(phaseNumber) {
    const phase = this._getPhase(phaseNumber);
    return phase.fix_attempts || 0;
  }

  incrementFixAttempts(phaseNumber) {
    const phase = this._getPhase(phaseNumber);
    phase.fix_attempts = (phase.fix_attempts || 0) + 1;
    this._writeToDisk();
    return phase.fix_attempts;
  }

  /**
   * THE CRITICAL CHECK — can this phase proceed to coding?
   * Strengthening is mandatory and code-enforced.
   * No flag. No override. No "just this once." No --skip-strengthen.
   * The function that runs coding literally checks this first.
   */
  canCode(phaseNumber) {
    const phase = this._getPhase(phaseNumber);
    if (phase.plans_total === 0) {
      return { allowed: false, reason: 'No plans created yet' };
    }
    if (phase.plans_strengthened < phase.plans_total) {
      const remaining = phase.plans_total - phase.plans_strengthened;
      return {
        allowed: false,
        reason: `Cannot code: ${remaining} of ${phase.plans_total} plans not strengthened. Strengthening is mandatory.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Record IV&V results for a phase
   */
  setIVVResult(phaseNumber, { passed, conditional, concerns }) {
    const phase = this._getPhase(phaseNumber);
    if (passed) {
      phase.ivv_status = conditional ? 'conditional' : 'passed';
      phase.status = 'ivv-passed';
    } else {
      phase.ivv_status = 'failed';
      // Don't change phase status — orchestrator handles this
    }
    phase.ivv_concerns = concerns || [];
    this._writeToDisk();
  }

  /**
   * THE SECOND CRITICAL CHECK — can this phase proceed to evidence collection?
   * IV&V is mandatory and code-enforced. Same pattern as canCode().
   * No flag. No override. No "we already verified it."
   * Verify checks "did we build what we planned?"
   * IV&V checks "does this thing actually work?" — different question, fresh eyes.
   */
  canCollectEvidence(phaseNumber) {
    const phase = this._getPhase(phaseNumber);
    if (phase.status !== 'ivv-passed') {
      return {
        allowed: false,
        reason: `Cannot collect evidence: Phase ${phaseNumber} has not passed IV&V. Status: ${phase.status}`,
      };
    }
    if (!phase.ivv_status || phase.ivv_status === 'failed') {
      return {
        allowed: false,
        reason: `Cannot collect evidence: IV&V status is '${phase.ivv_status || 'not run'}'. IV&V must pass.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Record RTM results for a phase
   */
  setRTMResult(phaseNumber, { complete, gaps, total, covered, verdict }) {
    const phase = this._getPhase(phaseNumber);
    if (complete) {
      phase.rtm_status = verdict === 'NO_REQUIREMENTS' ? 'no-requirements' : 'complete';
      phase.status = 'rtm-complete';
    } else {
      phase.rtm_status = 'gaps-found';
      // Don't change phase status — orchestrator decides whether gaps create a gate
    }
    phase.rtm_gaps = gaps || [];
    phase.rtm_coverage = total > 0 ? Math.round((covered / total) * 100) : 100;
    this._writeToDisk();
  }

  /**
   * THE THIRD CRITICAL CHECK — can this phase build its RTM?
   * Evidence must be collected first. Same pattern as canCode() and canCollectEvidence().
   */
  canBuildRTM(phaseNumber) {
    const phase = this._getPhase(phaseNumber);
    if (phase.status !== 'evidence-collected') {
      return {
        allowed: false,
        reason: `Cannot build RTM: Phase ${phaseNumber} evidence not yet collected. Status: ${phase.status}`,
      };
    }
    return { allowed: true };
  }

  createGate(phaseNumber, type, summary) {
    const gateId = this._nextGateId();
    this.state.gates[gateId] = {
      phase: phaseNumber,
      type,
      summary,
      status: 'blocked',
      blocked_at: new Date().toISOString(),
      resolved_at: null,
    };
    const phase = this._getPhase(phaseNumber);
    phase.status = 'blocked';
    phase.blocked_by = gateId;
    this._writeToDisk();
    return gateId;
  }

  resolveGate(gateId) {
    const gate = this.state.gates[gateId];
    if (!gate) throw new Error(`Gate ${gateId} not found`);
    gate.status = 'resolved';
    gate.resolved_at = new Date().toISOString();
    const phase = this._getPhase(gate.phase);
    if (phase.blocked_by === gateId) {
      phase.blocked_by = null;
      phase.recently_resumed = true; // Flag for priority scheduling
      // Restore status based on progress — ordered from most to least advanced
      if (phase.status === 'blocked') {
        // Determine what state to restore to based on how far the phase got
        if (phase.plans_coded > 0 && phase.plans_coded >= phase.plans_total) {
          // All plans coded — figure out how far post-coding we got
          // Check for evidence collection state
          const evidencePath = require('path').join(this.planningDir, 'evidence', `phase-${gate.phase}-evidence.md`);
          const verifyPath = require('path').join(this.planningDir, 'verification', `phase-${gate.phase}-result.md`);
          const ivvPath = require('path').join(this.planningDir, 'ivv', `phase-${gate.phase}-ivv-report.md`);
          const rtmPath = require('path').join(this.planningDir, 'rtm', `phase-${gate.phase}-rtm.yaml`);
          if (require('fs').existsSync(rtmPath) && (phase.rtm_status === 'complete' || phase.rtm_status === 'no-requirements')) {
            phase.status = 'rtm-complete';
          } else if (require('fs').existsSync(evidencePath)) {
            phase.status = 'evidence-collected';
          } else if (require('fs').existsSync(ivvPath) && (phase.ivv_status === 'passed' || phase.ivv_status === 'conditional')) {
            phase.status = 'ivv-passed';
          } else if (require('fs').existsSync(verifyPath)) {
            phase.status = 'verified';
          } else {
            phase.status = 'coded';
          }
        } else if (phase.plans_strengthened >= phase.plans_total) {
          phase.status = 'strengthened';
        } else if (phase.plans_total > 0) {
          phase.status = 'planned';
        } else {
          phase.status = 'pending';
        }
      }
    }
    this._writeToDisk();
  }

  addSkipDecision(blockedPhase, skippedTo, rationale) {
    this.state.skip_decisions.push({
      blocked_phase: blockedPhase,
      skipped_to: skippedTo,
      rationale,
      decided_at: new Date().toISOString(),
    });
    this._writeToDisk();
  }

  addLogEntry(action, detail, phase = null) {
    this.state.log.push({
      timestamp: new Date().toISOString(),
      action,
      ...(phase != null && { phase }),
      detail,
    });
    // Cap in-state log at 100 entries to keep state file manageable
    // Full history lives in the append-only execution-log.md file
    const LOG_CAP = 100;
    if (this.state.log.length > LOG_CAP) {
      this.state.log = this.state.log.slice(-LOG_CAP);
    }
    this._writeToDisk();
  }

  getBlockedGates() {
    return Object.entries(this.state.gates)
      .filter(([_, gate]) => gate.status === 'blocked')
      .map(([id, gate]) => ({ id, ...gate }));
  }

  /**
   * Get the next actionable phase
   * Priority: resumed-from-gate > in-progress > next-pending > skip-ahead-target
   */
  getNextActionablePhase() {
    const phases = Object.entries(this.state.phases)
      .map(([num, phase]) => ({ number: parseInt(num), ...phase }))
      .sort((a, b) => a.number - b.number);

    // 1. Resumed from gate — uses flag set in resolveGate(), cleared after pickup
    const resumed = phases.find(p =>
      p.recently_resumed && p.status !== 'blocked' && p.status !== 'complete'
    );
    if (resumed) {
      // Clear the flag so it doesn't fire again next loop
      this.state.phases[resumed.number].recently_resumed = false;
      this._writeToDisk();
      return resumed;
    }

    // 2. In-progress (any active status)
    const inProgress = phases.find(p =>
      ['planned', 'strengthened', 'coding', 'coded', 'verified', 'ivv-passed', 'evidence-collected', 'rtm-complete'].includes(p.status)
    );
    if (inProgress) return inProgress;

    // 3. Next pending
    const pending = phases.find(p => p.status === 'pending');
    if (pending) return pending;

    return null;
  }

  isComplete() {
    return Object.values(this.state.phases).every(p => p.status === 'complete');
  }

  isAllBlocked() {
    return Object.values(this.state.phases).every(p => p.status === 'complete' || p.status === 'blocked');
  }

  // --- Internal ---

  _getPhase(phaseNumber) {
    const phase = this.state.phases[phaseNumber];
    if (!phase) throw new Error(`Phase ${phaseNumber} not found in state`);
    return phase;
  }

  _nextGateId() {
    const existing = Object.keys(this.state.gates);
    if (existing.length === 0) return 'GATE-001';
    const maxNum = Math.max(...existing.map(id => parseInt(id.split('-')[1])));
    return `GATE-${String(maxNum + 1).padStart(3, '0')}`;
  }

  _writeToDisk() {
    const yamlStr = yaml.dump(this.state, { lineWidth: 120, noRefs: true, sortKeys: false });
    const markdown = [
      '# BUILD STATE',
      '',
      `*Last updated: ${new Date().toISOString()}*`,
      '',
      '```yaml',
      yamlStr.trim(),
      '```',
      '',
    ].join('\n');

    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    const tmpFile = this.stateFile + '.tmp';
    fs.writeFileSync(tmpFile, markdown, 'utf8');
    fs.renameSync(tmpFile, this.stateFile);
  }
}

module.exports = StateManager;
