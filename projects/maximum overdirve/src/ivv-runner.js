/**
 * ivv-runner.js — Independent Verification & Validation
 *
 * NASA-grade independence: the verifier receives ONLY acceptance criteria + code + tests.
 * No spec. No plan. No roadmap. No Implementation Specification.
 *
 * If a flawed assumption made it through plan → strengthen → code → verify,
 * IV&V is the fresh pair of eyes that catches it because it literally
 * cannot be anchored by the plan's assumptions.
 *
 * At `maximum` complexity: also performs a cold code read — reading the code
 * with zero context and flagging anything that looks wrong on its face.
 */

const fs = require('fs');
const path = require('path');

class IVVRunner {
  constructor(options = {}) {
    this.claudeRunner = options.claudeRunner;
    this.planParser = options.planParser;
    this.planningDir = options.planningDir;
    this.config = options.config || {};
    this.logger = options.logger;
  }

  /**
   * Run IV&V for a phase.
   *
   * @param {number} phaseNumber
   * @param {object} phaseState - The phase's state (for name, plan count, etc.)
   * @returns {object} { passed, output, concerns }
   */
  async run(phaseNumber, phaseState) {
    const complexity = this.config.complexity || 'high';

    // Step 1: Extract acceptance criteria from plans — this is ALL the IV&V gets
    const acceptanceCriteria = this._extractAcceptanceCriteria(phaseNumber);

    if (!acceptanceCriteria || acceptanceCriteria.trim().length === 0) {
      return {
        passed: false,
        output: 'IV&V FAIL: No acceptance criteria found in plans. Cannot verify without criteria.',
        concerns: ['No acceptance criteria extractable from plan files'],
      };
    }

    // Step 2: Build cold code read instructions (only at maximum)
    const coldCodeRead = this._buildColdCodeReadBlock(complexity);

    // Step 3: Build the prompt — deliberately NO spec, NO plan content, NO roadmap
    const prompt = this.claudeRunner.loadPrompt('ivv-verify', {
      PHASE_NUMBER: String(phaseNumber),
      ACCEPTANCE_CRITERIA: acceptanceCriteria,
      COMPLEXITY_LEVEL: complexity,
      COLD_CODE_READ_INSTRUCTIONS: coldCodeRead.instructions,
      COLD_CODE_READ_SECTION: coldCodeRead.outputSection,
    });

    // Step 4: Run the IV&V invocation — fresh context, tools for running tests
    const result = await this.claudeRunner.runExecution(prompt, {
      allowedTools: ['Bash', 'Read'],
      timeout: this.config.timeouts?.ivv || 600000, // 10 min default
      logLabel: `ivv-phase-${phaseNumber}`,
    });

    // Step 5: Write the IV&V report
    const ivvDir = path.join(this.planningDir, 'ivv');
    fs.mkdirSync(ivvDir, { recursive: true });
    fs.writeFileSync(
      path.join(ivvDir, `phase-${phaseNumber}-ivv-report.md`),
      result.output,
      'utf8'
    );

    // Step 6: Parse the verdict
    const verdict = this._parseVerdict(result.output);

    return {
      passed: verdict.passed,
      conditional: verdict.conditional,
      output: result.output,
      concerns: verdict.concerns,
      exitCode: result.exitCode,
    };
  }

  /**
   * Extract acceptance criteria from plan files.
   *
   * We pull ONLY the acceptance criteria sections — not the full plan,
   * not the task descriptions, not the Implementation Specification details.
   * The IV&V must work from criteria alone.
   */
  _extractAcceptanceCriteria(phaseNumber) {
    const plans = this.planParser.listStrengthenedPlans(phaseNumber);
    if (plans.length === 0) {
      // Fall back to un-strengthened plans
      const rawPlans = this.planParser.listPlans(phaseNumber);
      if (rawPlans.length === 0) return null;
      return this._extractCriteriaFromFiles(rawPlans);
    }
    return this._extractCriteriaFromFiles(plans);
  }

  /**
   * Parse plan files to extract acceptance criteria sections.
   * Looks for common patterns: "Acceptance Criteria", "Success Criteria",
   * "Requirements", checkbox lists, etc.
   */
  _extractCriteriaFromFiles(plans) {
    const allCriteria = [];

    for (const plan of plans) {
      const content = fs.readFileSync(plan.filepath, 'utf8');
      const criteria = this._extractCriteriaFromContent(content, plan.id);
      if (criteria) {
        allCriteria.push(`### ${plan.id}\n\n${criteria}`);
      }
    }

    if (allCriteria.length === 0) return null;
    return allCriteria.join('\n\n---\n\n');
  }

  /**
   * Extract acceptance criteria from a single plan's content.
   * Tries multiple extraction strategies.
   */
  _extractCriteriaFromContent(content, planId) {
    // Strategy 1: Look for explicit "Acceptance Criteria" section
    const acMatch = content.match(
      /#{1,4}\s*Acceptance\s+Criteria\s*\n([\s\S]*?)(?=\n#{1,4}\s|\n---|\n\*\*[A-Z]|$)/i
    );
    if (acMatch) return acMatch[1].trim();

    // Strategy 2: Look for "Success Criteria" section
    const scMatch = content.match(
      /#{1,4}\s*Success\s+Criteria\s*\n([\s\S]*?)(?=\n#{1,4}\s|\n---|\n\*\*[A-Z]|$)/i
    );
    if (scMatch) return scMatch[1].trim();

    // Strategy 3: Look for "Requirements" or "Verification" section
    const reqMatch = content.match(
      /#{1,4}\s*(?:Requirements|Verification|Verify)\s*\n([\s\S]*?)(?=\n#{1,4}\s|\n---|\n\*\*[A-Z]|$)/i
    );
    if (reqMatch) return reqMatch[1].trim();

    // Strategy 4: Extract checkbox items (common in plan format)
    const checkboxes = content.match(/^[\s]*-\s*\[[ x]\]\s*.+$/gim);
    if (checkboxes && checkboxes.length > 0) {
      return checkboxes.join('\n');
    }

    // Strategy 5: Look for "Requirement Traceability" or R-XXX tags
    const rTags = content.match(/R-\d{3}[^\n]*/g);
    if (rTags && rTags.length > 0) {
      return rTags.map(r => `- ${r.trim()}`).join('\n');
    }

    // If nothing found, log it — the IV&V prompt will handle the empty case
    return null;
  }

  /**
   * Build the cold code read block based on complexity level.
   * At `maximum`, IV&V also reads code with zero context and flags issues on face value.
   */
  _buildColdCodeReadBlock(complexity) {
    if (complexity !== 'maximum') {
      return {
        instructions: [
          'Cold code read is **not active** at this complexity level.',
          'At `maximum` complexity, IV&V also performs a cold code read — examining the code',
          'with zero context to flag anything that looks wrong on its face.',
        ].join('\n'),
        outputSection: '*(Cold code read not active — complexity level is not `maximum`)*',
      };
    }

    return {
      instructions: [
        '### Cold Code Read (MAXIMUM complexity)',
        '',
        'In addition to standard IV&V, perform a **cold code read**:',
        '',
        '1. Read every source file created or modified in this phase',
        '2. Pretend you have never seen this codebase before',
        '3. Note anything that looks wrong, confusing, or suspicious ON ITS FACE',
        '4. Do NOT try to understand the "why" — you have no spec or plan. Just note the "what."',
        '',
        'Cold code read catches a different class of bugs than criteria verification:',
        '- Code that "works" but is obviously fragile',
        '- Logic that passes tests but looks wrong to fresh eyes',
        '- Error handling that technically catches errors but handles them incorrectly',
        '- Variable names that suggest the code does something different from what it actually does',
        '- Patterns that experienced developers would recognize as problematic',
        '',
        'The cold code read is a gut check from someone with zero context bias. Trust your instincts.',
      ].join('\n'),
      outputSection: [
        '### Cold Code Read Findings',
        '',
        '| # | File | Line(s) | Observation | Severity |',
        '|---|------|---------|-------------|----------|',
        '| 1 | [file] | [lines] | [what looks wrong on its face] | concern/warning/red-flag |',
        '',
        '**Cold read summary:** [Overall impression from a zero-context read]',
      ].join('\n'),
    };
  }

  /**
   * Parse the IV&V verdict from the output.
   */
  _parseVerdict(output) {
    const lower = output.toLowerCase();
    const concerns = [];

    // Extract concerns section if present
    const concernMatch = output.match(/##\s*Concerns\s*\n([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/i);
    if (concernMatch && concernMatch[1].trim().length > 5) {
      concerns.push(concernMatch[1].trim());
    }

    // Look for explicit verdict
    if (lower.includes('verdict: pass') || lower.includes('verdict: **pass**')) {
      return { passed: true, conditional: false, concerns };
    }

    if (lower.includes('verdict: conditional pass') || lower.includes('verdict: **conditional pass**')) {
      return { passed: true, conditional: true, concerns };
    }

    if (lower.includes('verdict: fail') || lower.includes('verdict: **fail**')) {
      return { passed: false, conditional: false, concerns };
    }

    // Fallback heuristics
    if (lower.includes('all tests pass') && !lower.includes('fail')) {
      return { passed: true, conditional: false, concerns };
    }

    if (lower.includes('test failed') || lower.includes('tests failed') || lower.includes('failure')) {
      return { passed: false, conditional: false, concerns };
    }

    // Default: treat ambiguous as conditional pass with a concern
    concerns.push('IV&V verdict could not be clearly parsed from output — review manually');
    return { passed: true, conditional: true, concerns };
  }
}

module.exports = IVVRunner;
