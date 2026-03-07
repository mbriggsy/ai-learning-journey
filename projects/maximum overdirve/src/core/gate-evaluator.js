/**
 * gate-evaluator.js — Detects human gates
 * 
 * Gate types from the spec:
 * - external-action: Human needs to do something (generate assets, etc.)
 * - approval: Human needs to approve before proceeding
 * - quality-check: Subjective quality assessment needed
 * - decision: Ambiguous situation needs human decision
 * 
 * When a gate blocks a phase, skip-ahead evaluation runs immediately.
 * Gates pause work streams without blocking independent work.
 */

const fs = require('fs');
const path = require('path');

class GateEvaluator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.planParser = options.planParser;
  }

  /**
   * Evaluate a phase's strengthened plans for gates
   * Returns { gates: [], executablePlans: [], blockedPlans: [] }
   */
  evaluate(phaseNumber, spec) {
    const gates = [];
    const executablePlans = [];
    const blockedPlans = [];

    const plans = this.planParser.listStrengthenedPlans(phaseNumber);

    for (const plan of plans) {
      const parsed = this.planParser.readPlan(plan.filepath);
      const planGates = this._checkPlan(parsed, phaseNumber);

      if (planGates.length > 0) {
        blockedPlans.push({ ...plan, gates: planGates });
        gates.push(...planGates);
      } else {
        executablePlans.push(plan);
      }
    }

    // Check spec-declared gates for this phase boundary
    const specGates = this._checkSpecGates(spec, phaseNumber);
    gates.push(...specGates);

    return { gates, executablePlans, blockedPlans };
  }

  /**
   * Check a single plan for gate conditions
   */
  _checkPlan(parsed, phaseNumber) {
    const gates = [];
    const content = parsed.content || parsed.raw;

    // Check 1: References to files that don't exist
    const fileRefs = this.planParser.extractFileReferences(content);
    const missingFiles = fileRefs.filter(f => {
      const resolved = path.isAbsolute(f) ? f : path.join(this.projectRoot, f);
      return !fs.existsSync(resolved);
    });

    // Only gate on asset files that a human would need to create
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.mp3', '.wav', '.ogg', '.ttf', '.otf', '.woff'];
    const missingAssets = missingFiles.filter(f => 
      assetExtensions.some(ext => f.toLowerCase().endsWith(ext))
    );

    if (missingAssets.length > 0) {
      gates.push({
        type: 'external-action',
        phase: phaseNumber,
        summary: `Missing asset files: ${missingAssets.join(', ')}`,
        detail: 'These files need to be created/generated before this plan can be coded.',
        missingFiles: missingAssets,
      });
    }

    // Check 2: Plan metadata flags a gate
    if (parsed.metadata?.gate) {
      gates.push({
        type: parsed.metadata.gate.type || 'approval',
        phase: phaseNumber,
        summary: parsed.metadata.gate.summary || 'Plan requires human approval',
        detail: parsed.metadata.gate.detail || '',
      });
    }

    // Check 3: Plan content contains gate markers
    const gateMarkers = [
      { pattern: /\[HUMAN[_\s]?GATE\]/i, type: 'approval' },
      { pattern: /\[NEEDS[_\s]?APPROVAL\]/i, type: 'approval' },
      { pattern: /\[EXTERNAL[_\s]?ACTION\]/i, type: 'external-action' },
      { pattern: /\[QUALITY[_\s]?CHECK\]/i, type: 'quality-check' },
      { pattern: /\[DECISION[_\s]?NEEDED\]/i, type: 'decision' },
    ];

    for (const marker of gateMarkers) {
      if (marker.pattern.test(content)) {
        gates.push({
          type: marker.type,
          phase: phaseNumber,
          summary: `Plan contains ${marker.type} gate marker`,
          detail: content.match(marker.pattern)[0],
        });
      }
    }

    return gates;
  }

  /**
   * Check spec for pre-declared gates at a phase boundary
   */
  _checkSpecGates(spec, phaseNumber) {
    if (!spec) return [];
    
    const gates = [];

    // Look for gate declarations in the spec
    // Common patterns: "Phase N requires human review", "[GATE] before Phase N", etc.
    const gatePatterns = [
      new RegExp(`phase\\s+${phaseNumber}[^.]*gate`, 'gi'),
      new RegExp(`gate[^.]*phase\\s+${phaseNumber}`, 'gi'),
      new RegExp(`\\[GATE\\][^.]*phase\\s+${phaseNumber}`, 'gi'),
      new RegExp(`phase\\s+${phaseNumber}[^.]*human\\s+(review|approval|check)`, 'gi'),
    ];

    for (const pattern of gatePatterns) {
      const match = spec.match(pattern);
      if (match) {
        gates.push({
          type: 'approval',
          phase: phaseNumber,
          summary: `Spec declares gate at Phase ${phaseNumber}: ${match[0].substring(0, 100)}`,
          detail: 'Pre-declared in project spec.',
        });
        break; // One spec gate per phase is enough
      }
    }

    return gates;
  }
}

module.exports = GateEvaluator;
