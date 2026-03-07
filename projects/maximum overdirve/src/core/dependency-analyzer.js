/**
 * dependency-analyzer.js — Maps phase dependencies for skip-ahead
 * 
 * When a phase is blocked by a gate, we don't just stop.
 * We evaluate all remaining phases and run anything that's independent.
 * The human returns to find maximum work done, not a system that sat idle.
 */

class DependencyAnalyzer {
  constructor(options = {}) {
    this.claudeRunner = options.claudeRunner;
  }

  /**
   * Evaluate which phases can proceed when a phase is blocked
   * 
   * @param {object} state - Current build state
   * @param {string} roadmapContent - Roadmap markdown
   * @param {string} specContent - Spec markdown
   * @returns {object[]} - Array of { phase, action, scope, rationale }
   */
  evaluateSkipAhead(state, roadmapContent, specContent) {
    const results = [];
    const blockedPhases = this._getBlockedPhases(state);
    
    if (blockedPhases.length === 0) return results;

    const phases = Object.entries(state.phases)
      .map(([num, phase]) => ({ number: parseInt(num), ...phase }))
      .sort((a, b) => a.number - b.number);

    for (const phase of phases) {
      // Skip completed, already blocked, or in-progress phases
      if (['complete', 'blocked'].includes(phase.status)) continue;
      if (blockedPhases.some(bp => bp.number === phase.number)) continue;

      // Check if this phase depends on any blocked phase
      const depType = this._analyzeDependency(phase, blockedPhases, state);

      if (depType.type === 'none') {
        results.push({
          phase: phase.number,
          action: 'proceed',
          scope: 'full',
          rationale: depType.rationale,
        });
      } else if (depType.type === 'soft') {
        results.push({
          phase: phase.number,
          action: 'plan-and-strengthen',
          scope: 'partial',
          rationale: depType.rationale,
        });
      } else {
        results.push({
          phase: phase.number,
          action: 'blocked',
          scope: 'none',
          rationale: depType.rationale,
        });
      }
    }

    return results;
  }

  /**
   * Use Claude to analyze complex dependencies
   * (For when code-level analysis isn't sufficient)
   */
  async analyzeWithClaude(state, roadmapContent, specContent) {
    if (!this.claudeRunner) {
      throw new Error('Claude runner not available for dependency analysis');
    }

    const prompt = this.claudeRunner.loadPrompt('dependency-analysis', {
      ROADMAP_CONTENT: roadmapContent,
      SPEC_CONTENT: specContent,
      STATE_CONTENT: JSON.stringify(state, null, 2),
    });

    const result = this.claudeRunner.run(prompt, {
      timeout: 120000,
      logLabel: 'dependency-analysis',
    });

    return result.output;
  }

  // --- Internal ---

  _getBlockedPhases(state) {
    return Object.entries(state.phases)
      .filter(([_, p]) => p.status === 'blocked')
      .map(([num, p]) => ({ number: parseInt(num), ...p }));
  }

  _analyzeDependency(phase, blockedPhases, state) {
    // Check explicit dependencies declared in state
    const deps = phase.dependencies || [];
    
    const blockedNums = blockedPhases.map(bp => bp.number);
    const hardDeps = deps.filter(d => blockedNums.includes(d));

    if (hardDeps.length > 0) {
      return {
        type: 'hard',
        rationale: `Phase ${phase.number} explicitly depends on blocked phase(s): ${hardDeps.join(', ')}`,
      };
    }

    // Check sequential dependency (later phase might implicitly need earlier phase's output)
    const minBlockedPhase = Math.min(...blockedNums);
    
    // If this phase is immediately after a blocked phase and has no explicit deps listed,
    // be conservative and mark as soft dependency
    if (phase.number === minBlockedPhase + 1 && deps.length === 0) {
      return {
        type: 'soft',
        rationale: `Phase ${phase.number} immediately follows blocked Phase ${minBlockedPhase} — can plan/strengthen but not code without review`,
      };
    }

    // Phases with a gap from the blocked phase and no explicit deps are likely independent
    if (phase.number > minBlockedPhase + 1 && hardDeps.length === 0) {
      return {
        type: 'none',
        rationale: `Phase ${phase.number} has no dependency on blocked phase(s) ${blockedNums.join(', ')}`,
      };
    }

    // Default: no dependency
    return {
      type: 'none',
      rationale: `Phase ${phase.number} appears independent of blocked phases`,
    };
  }
}

module.exports = DependencyAnalyzer;
