/**
 * rtm-builder.js — Requirements Traceability Matrix Builder
 *
 * The RTM is the ultimate accountability tool. It creates a machine-checkable
 * matrix: Requirement → Plan → Test → Code → Evidence.
 *
 * Every empty cell is a gap finding. Every requirement without a test is
 * unverified. Every test without a requirement is unjustified work.
 *
 * Two phases of operation:
 * 1. During init: Extract requirements from spec → requirements.yaml
 * 2. Per phase: Build traceability matrix → phase-N-rtm.yaml + readable report
 *
 * The RTM is code-enforced: evidence package cannot be assembled until
 * RTM is complete. Same pattern as canCode() and canCollectEvidence().
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class RTMBuilder {
  constructor(options = {}) {
    this.claudeRunner = options.claudeRunner;
    this.planParser = options.planParser;
    this.planningDir = options.planningDir;
    this.config = options.config || {};
    this.logger = options.logger;
  }

  // ============================================================
  //  EXTRACT — Pull requirements from spec during init
  // ============================================================

  /**
   * Extract requirements from the spec and write requirements.yaml.
   * Called during `init` after roadmap creation.
   *
   * @param {string} specContent — The full spec text
   * @param {string} projectName — Project name for the YAML
   * @param {string} specFile — Spec filename for traceability
   * @returns {object} { total, filepath }
   */
  async extractRequirements(specContent, projectName, specFile) {
    const prompt = this.claudeRunner.loadPrompt('extract-requirements', {
      SPEC_CONTENT: specContent,
      PROJECT_NAME: projectName,
      SPEC_FILE: specFile,
    });

    const result = this.claudeRunner.run(prompt, {
      timeout: this.config.timeouts?.plan || 300000,
      logLabel: 'extract-requirements',
    });

    if (result.exitCode !== 0) {
      throw new Error(`Requirements extraction failed:\n${result.output}`);
    }

    // Parse the YAML output
    const requirements = this._parseRequirementsOutput(result.output);
    if (!requirements || !requirements.requirements) {
      throw new Error('Requirements extraction produced no parseable requirements. Check the extract-requirements prompt.');
    }

    // Write requirements.yaml
    const reqPath = path.join(this.planningDir, 'requirements.yaml');
    const yamlStr = yaml.dump(requirements, { lineWidth: 120, noRefs: true, sortKeys: false });
    fs.writeFileSync(reqPath, yamlStr, 'utf8');

    // Also write a human-readable version
    const readablePath = path.join(this.planningDir, 'REQUIREMENTS.md');
    const readable = this._generateReadableRequirements(requirements);
    fs.writeFileSync(readablePath, readable, 'utf8');

    const total = Object.keys(requirements.requirements).length;
    return { total, filepath: reqPath, readablePath };
  }

  // ============================================================
  //  BUILD — Create the RTM for a specific phase
  // ============================================================

  /**
   * Build the Requirements Traceability Matrix for a phase.
   * Traces requirements through plans, tests, code, and evidence.
   *
   * @param {number} phaseNumber
   * @param {object} phaseState — The phase's state
   * @returns {object} { complete, gaps, total, covered, partial, filepath }
   */
  async buildPhaseRTM(phaseNumber, phaseState) {
    // Step 1: Load requirements assigned to this phase
    const allRequirements = this._loadRequirements();
    if (!allRequirements) {
      return {
        complete: false,
        gaps: [{ severity: 'high', detail: 'No requirements.yaml found — run init with RTM extraction' }],
        total: 0,
        covered: 0,
        partial: 0,
      };
    }

    const phaseReqs = this._getPhaseRequirements(allRequirements, phaseNumber);

    if (Object.keys(phaseReqs).length === 0) {
      // No requirements mapped to this phase — that itself might be a concern,
      // but we'll let it pass. The project-level RTM will catch orphaned requirements.
      return {
        complete: true,
        gaps: [],
        total: 0,
        covered: 0,
        partial: 0,
        verdict: 'NO_REQUIREMENTS',
      };
    }

    // Step 2: Do a local scan first (fast, no Claude invocation needed)
    const localRTM = this._localScan(phaseNumber, phaseReqs);

    // Step 3: Call Claude for deeper tracing — it reads actual code and tests
    const phaseReqsYaml = yaml.dump(phaseReqs, { lineWidth: 120 });

    const prompt = this.claudeRunner.loadPrompt('build-rtm', {
      PHASE_NUMBER: String(phaseNumber),
      PHASE_REQUIREMENTS: phaseReqsYaml,
    });

    const result = await this.claudeRunner.runExecution(prompt, {
      allowedTools: ['Bash', 'Read'],
      timeout: this.config.timeouts?.rtm || 600000, // 10 min
      logLabel: `rtm-phase-${phaseNumber}`,
    });

    // Step 4: Parse Claude's RTM output
    const claudeRTM = this._parseRTMOutput(result.output);

    // Step 5: Merge local scan with Claude's findings (Claude's findings win on conflicts)
    const mergedRTM = claudeRTM || localRTM;

    // Step 6: Write the RTM artifacts
    const rtmDir = path.join(this.planningDir, 'rtm');
    fs.mkdirSync(rtmDir, { recursive: true });

    // Write raw YAML for machine parsing
    const rtmYamlPath = path.join(rtmDir, `phase-${phaseNumber}-rtm.yaml`);
    const rtmYaml = yaml.dump(mergedRTM, { lineWidth: 120, noRefs: true, sortKeys: false });
    fs.writeFileSync(rtmYamlPath, rtmYaml, 'utf8');

    // Write human-readable report
    const rtmReportPath = path.join(rtmDir, `phase-${phaseNumber}-rtm-report.md`);
    const report = this._generateReadableRTM(mergedRTM, phaseNumber);
    fs.writeFileSync(rtmReportPath, report, 'utf8');

    // Step 7: Compute results
    const gaps = this._extractGaps(mergedRTM);
    const total = mergedRTM.total_requirements || Object.keys(phaseReqs).length;
    const covered = mergedRTM.covered || 0;
    const partial = mergedRTM.partial || 0;
    const gapCount = mergedRTM.gaps || gaps.length;

    const highSevGaps = gaps.filter(g => g.severity === 'high');

    return {
      complete: highSevGaps.length === 0,
      gaps,
      total,
      covered,
      partial,
      gapCount,
      verdict: mergedRTM.summary?.verdict || (highSevGaps.length === 0 ? 'COMPLETE' : 'GAPS_FOUND'),
      filepath: rtmYamlPath,
      reportPath: rtmReportPath,
      exitCode: result.exitCode,
    };
  }

  // ============================================================
  //  PROJECT-LEVEL RTM — Aggregates all phase RTMs
  // ============================================================

  /**
   * Build the project-level RTM summary.
   * Called during evidence package assembly to provide the complete picture.
   *
   * @returns {object} { summary, report }
   */
  buildProjectRTMSummary() {
    const allReqs = this._loadRequirements();
    if (!allReqs) return { summary: 'No requirements extracted', report: '' };

    const rtmDir = path.join(this.planningDir, 'rtm');
    if (!fs.existsSync(rtmDir)) return { summary: 'No RTM data found', report: '' };

    // Load all phase RTMs
    const phaseRTMs = [];
    const rtmFiles = fs.readdirSync(rtmDir)
      .filter(f => f.match(/^phase-\d+-rtm\.yaml$/))
      .sort();

    for (const file of rtmFiles) {
      try {
        const content = fs.readFileSync(path.join(rtmDir, file), 'utf8');
        const rtm = yaml.load(content);
        if (rtm) phaseRTMs.push(rtm);
      } catch (e) {
        // Skip unparseable RTM files
      }
    }

    // Aggregate stats
    let totalReqs = Object.keys(allReqs.requirements || {}).length;
    let totalCovered = 0;
    let totalPartial = 0;
    let totalGaps = 0;
    const allGaps = [];
    const reqStatus = {}; // Track per-requirement status across phases

    for (const rtm of phaseRTMs) {
      totalCovered += rtm.covered || 0;
      totalPartial += rtm.partial || 0;
      totalGaps += rtm.gaps || 0;

      // Merge per-requirement traceability
      if (rtm.traceability) {
        for (const [reqId, trace] of Object.entries(rtm.traceability)) {
          if (!reqStatus[reqId]) reqStatus[reqId] = trace;
          else if (trace.status === 'covered') reqStatus[reqId] = trace; // upgrade
        }
      }

      if (rtm.gap_findings) {
        allGaps.push(...rtm.gap_findings);
      }
    }

    // Find orphaned requirements (in registry but never appeared in any phase RTM)
    const tracedReqs = new Set(Object.keys(reqStatus));
    const orphaned = Object.keys(allReqs.requirements || {}).filter(r => !tracedReqs.has(r));

    // Build the report
    const report = this._generateProjectRTMReport({
      totalReqs,
      totalCovered,
      totalPartial,
      totalGaps,
      allGaps,
      orphaned,
      reqStatus,
      allReqs,
      phaseRTMs,
    });

    // Write to disk
    const summaryPath = path.join(rtmDir, 'PROJECT-RTM-SUMMARY.md');
    fs.writeFileSync(summaryPath, report, 'utf8');

    return {
      summary: `${totalCovered}/${totalReqs} requirements fully traced, ${totalGaps} gaps, ${orphaned.length} orphaned`,
      report,
      filepath: summaryPath,
      stats: { totalReqs, totalCovered, totalPartial, totalGaps, orphaned: orphaned.length },
    };
  }

  // ============================================================
  //  LOCAL SCAN — Fast requirement tracing without Claude
  // ============================================================

  /**
   * Scan plan files, evidence, and known artifacts for R-XXX references.
   * This is a fast preliminary scan — Claude does the deep trace.
   */
  _localScan(phaseNumber, phaseReqs) {
    const traceability = {};

    for (const [reqId, req] of Object.entries(phaseReqs)) {
      traceability[reqId] = {
        text: req.text,
        status: 'gap',
        plan: { found: false, references: [] },
        test: { found: false, references: [] },
        code: { found: false, references: [] },
        evidence: { found: false, references: [] },
      };
    }

    // Scan plans
    const plans = this.planParser.listPlans(phaseNumber);
    const strengthenedPlans = this.planParser.listStrengthenedPlans(phaseNumber);
    const allPlans = [...plans, ...strengthenedPlans];

    for (const plan of allPlans) {
      try {
        const content = fs.readFileSync(plan.filepath, 'utf8');
        const refs = this._scanForRequirementRefs(content);
        for (const refId of refs) {
          if (traceability[refId]) {
            traceability[refId].plan.found = true;
            traceability[refId].plan.references.push({
              file: path.relative(this.planningDir, plan.filepath),
              section: 'detected via R-XXX reference',
            });
          }
        }
      } catch (e) { /* skip unreadable files */ }
    }

    // Scan evidence
    const evidencePath = path.join(this.planningDir, 'evidence', `phase-${phaseNumber}-evidence.md`);
    if (fs.existsSync(evidencePath)) {
      try {
        const content = fs.readFileSync(evidencePath, 'utf8');
        const refs = this._scanForRequirementRefs(content);
        for (const refId of refs) {
          if (traceability[refId]) {
            traceability[refId].evidence.found = true;
            traceability[refId].evidence.references.push({
              file: `evidence/phase-${phaseNumber}-evidence.md`,
              section: 'detected via R-XXX reference',
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    // Scan IV&V report
    const ivvPath = path.join(this.planningDir, 'ivv', `phase-${phaseNumber}-ivv-report.md`);
    if (fs.existsSync(ivvPath)) {
      try {
        const content = fs.readFileSync(ivvPath, 'utf8');
        const refs = this._scanForRequirementRefs(content);
        for (const refId of refs) {
          if (traceability[refId]) {
            // IV&V references count as evidence reinforcement
            traceability[refId].evidence.found = true;
            traceability[refId].evidence.references.push({
              file: `ivv/phase-${phaseNumber}-ivv-report.md`,
              section: 'detected via R-XXX reference in IV&V report',
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    // Compute status per requirement
    let covered = 0;
    let partial = 0;
    let gaps = 0;
    const gapFindings = [];

    for (const [reqId, trace] of Object.entries(traceability)) {
      const links = [trace.plan.found, trace.test.found, trace.code.found, trace.evidence.found];
      const foundCount = links.filter(Boolean).length;

      if (foundCount >= 3) {
        trace.status = 'covered';
        covered++;
      } else if (foundCount > 0) {
        trace.status = 'partial';
        partial++;
      } else {
        trace.status = 'gap';
        gaps++;
      }

      // Record gaps
      if (!trace.plan.found) {
        gapFindings.push({
          requirement: reqId,
          missing: 'plan',
          severity: 'high',
          detail: `Requirement ${reqId} has no plan reference — work may be missing`,
          recommended_action: 'Verify requirement is addressed in a plan, add R-XXX tag',
        });
      }
      if (!trace.test.found) {
        gapFindings.push({
          requirement: reqId,
          missing: 'test',
          severity: 'high',
          detail: `Requirement ${reqId} has no test reference — cannot verify correctness`,
          recommended_action: 'Add test that verifies this requirement, tag with R-XXX',
        });
      }
    }

    return {
      phase: phaseNumber,
      built_at: new Date().toISOString(),
      total_requirements: Object.keys(traceability).length,
      covered,
      partial,
      gaps,
      traceability,
      gap_findings: gapFindings,
      summary: {
        coverage_percentage: Object.keys(traceability).length > 0
          ? Math.round((covered / Object.keys(traceability).length) * 100)
          : 100,
        high_severity_gaps: gapFindings.filter(g => g.severity === 'high').length,
        medium_severity_gaps: gapFindings.filter(g => g.severity === 'medium').length,
        low_severity_gaps: gapFindings.filter(g => g.severity === 'low').length,
        verdict: gaps === 0 && partial === 0 ? 'COMPLETE' : (gaps > 0 ? 'GAPS FOUND' : 'PARTIAL'),
      },
    };
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  /**
   * Load requirements from requirements.yaml
   */
  _loadRequirements() {
    const reqPath = path.join(this.planningDir, 'requirements.yaml');
    if (!fs.existsSync(reqPath)) return null;
    try {
      return yaml.load(fs.readFileSync(reqPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  /**
   * Get requirements that belong to a specific phase.
   * Uses estimated_phase from extraction, plus any that have no phase assignment
   * (those need to be checked everywhere).
   */
  _getPhaseRequirements(allReqs, phaseNumber) {
    const phaseReqs = {};
    if (!allReqs?.requirements) return phaseReqs;

    for (const [reqId, req] of Object.entries(allReqs.requirements)) {
      // Include if assigned to this phase, or if no phase assigned (must be checked everywhere)
      if (req.estimated_phase === phaseNumber ||
          req.estimated_phase === null ||
          req.estimated_phase === undefined ||
          req.estimated_phase === 'null') {
        phaseReqs[reqId] = req;
      }
    }
    return phaseReqs;
  }

  /**
   * Scan content for R-XXX requirement references.
   * Returns an array of matched requirement IDs.
   */
  _scanForRequirementRefs(content) {
    const refs = [];
    const pattern = /R-(\d{3,4})/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      refs.push(`R-${match[1]}`);
    }
    return [...new Set(refs)]; // dedupe
  }

  /**
   * Parse requirements extraction output from Claude.
   * Handles YAML that may be wrapped in code fences.
   */
  _parseRequirementsOutput(output) {
    // Strip code fences if present
    let cleaned = output.trim();
    cleaned = cleaned.replace(/^```(?:yaml)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');

    try {
      return yaml.load(cleaned);
    } catch (e) {
      // Try extracting YAML from within the output
      const yamlMatch = output.match(/```yaml\n([\s\S]*?)\n```/);
      if (yamlMatch) {
        try { return yaml.load(yamlMatch[1]); }
        catch (e2) { /* fall through */ }
      }

      // Last resort: find lines that look like YAML
      const lines = output.split('\n');
      const yamlStart = lines.findIndex(l => l.match(/^(project|requirements):/));
      if (yamlStart >= 0) {
        try { return yaml.load(lines.slice(yamlStart).join('\n')); }
        catch (e3) { /* fall through */ }
      }

      return null;
    }
  }

  /**
   * Parse RTM output from Claude.
   */
  _parseRTMOutput(output) {
    return this._parseRequirementsOutput(output); // Same parsing logic
  }

  /**
   * Extract gap findings from a parsed RTM.
   */
  _extractGaps(rtm) {
    if (!rtm) return [];
    if (rtm.gap_findings && Array.isArray(rtm.gap_findings)) return rtm.gap_findings;

    // Reconstruct from traceability if gap_findings not present
    const gaps = [];
    if (rtm.traceability) {
      for (const [reqId, trace] of Object.entries(rtm.traceability)) {
        if (trace.status === 'gap' || trace.status === 'partial') {
          if (!trace.plan?.found) {
            gaps.push({ requirement: reqId, missing: 'plan', severity: 'high', detail: `${reqId} not found in plans` });
          }
          if (!trace.test?.found) {
            gaps.push({ requirement: reqId, missing: 'test', severity: 'high', detail: `${reqId} not found in tests` });
          }
          if (!trace.code?.found) {
            gaps.push({ requirement: reqId, missing: 'code', severity: 'medium', detail: `${reqId} not found in code` });
          }
          if (!trace.evidence?.found) {
            gaps.push({ requirement: reqId, missing: 'evidence', severity: 'medium', detail: `${reqId} not found in evidence` });
          }
        }
      }
    }
    return gaps;
  }

  /**
   * Generate a human-readable requirements document.
   */
  _generateReadableRequirements(reqs) {
    const lines = [
      `# REQUIREMENTS REGISTRY`,
      ``,
      `*Extracted: ${reqs.extracted_at || new Date().toISOString()}*`,
      `*Source: ${reqs.source || 'spec'}*`,
      `*Total: ${reqs.total_requirements || Object.keys(reqs.requirements || {}).length} requirements*`,
      ``,
      `---`,
      ``,
      `| ID | Type | Priority | Text | Verification | Phase |`,
      `|-----|------|----------|------|--------------|-------|`,
    ];

    for (const [reqId, req] of Object.entries(reqs.requirements || {})) {
      const text = (req.text || '').replace(/\|/g, '\\|').substring(0, 80);
      const method = (req.verification_method || '').replace(/\|/g, '\\|').substring(0, 40);
      lines.push(
        `| ${reqId} | ${req.type || '-'} | ${req.priority || '-'} | ${text} | ${method} | ${req.estimated_phase || '-'} |`
      );
    }

    lines.push('', '---', '', '*Generated by Overdrive RTM Builder*');
    return lines.join('\n');
  }

  /**
   * Generate a human-readable RTM report for a phase.
   */
  _generateReadableRTM(rtm, phaseNumber) {
    const lines = [
      `# RTM Report: Phase ${phaseNumber}`,
      ``,
      `*Built: ${rtm.built_at || new Date().toISOString()}*`,
      ``,
      `## Summary`,
      ``,
      `- **Total requirements:** ${rtm.total_requirements || 0}`,
      `- **Fully covered:** ${rtm.covered || 0}`,
      `- **Partially covered:** ${rtm.partial || 0}`,
      `- **Gaps:** ${rtm.gaps || 0}`,
      `- **Coverage:** ${rtm.summary?.coverage_percentage || 0}%`,
      `- **Verdict:** ${rtm.summary?.verdict || 'UNKNOWN'}`,
      ``,
      `---`,
      ``,
      `## Traceability Matrix`,
      ``,
      `| Requirement | Plan | Test | Code | Evidence | Status |`,
      `|-------------|------|------|------|----------|--------|`,
    ];

    for (const [reqId, trace] of Object.entries(rtm.traceability || {})) {
      const plan = trace.plan?.found ? '✅' : '❌';
      const test = trace.test?.found ? '✅' : '❌';
      const code = trace.code?.found ? '✅' : '❌';
      const evidence = trace.evidence?.found ? '✅' : '❌';
      const status = trace.status === 'covered' ? '🟢' : (trace.status === 'partial' ? '🟡' : '🔴');
      const text = (trace.text || '').substring(0, 50);
      lines.push(`| ${reqId}: ${text} | ${plan} | ${test} | ${code} | ${evidence} | ${status} |`);
    }

    // Gap findings
    const gaps = rtm.gap_findings || [];
    if (gaps.length > 0) {
      lines.push('', '---', '', '## Gap Findings', '');
      lines.push('| # | Requirement | Missing | Severity | Detail |');
      lines.push('|---|-------------|---------|----------|--------|');
      gaps.forEach((gap, i) => {
        lines.push(`| ${i + 1} | ${gap.requirement || '-'} | ${gap.missing || '-'} | ${gap.severity || '-'} | ${(gap.detail || '').substring(0, 80)} |`);
      });
    }

    lines.push('', '---', '', '*Generated by Overdrive RTM Builder*');
    return lines.join('\n');
  }

  /**
   * Generate the project-level RTM summary report.
   */
  _generateProjectRTMReport({ totalReqs, totalCovered, totalPartial, totalGaps, allGaps, orphaned, reqStatus, allReqs, phaseRTMs }) {
    const coveragePct = totalReqs > 0 ? Math.round((totalCovered / totalReqs) * 100) : 100;

    const lines = [
      `# PROJECT RTM SUMMARY`,
      ``,
      `*Generated: ${new Date().toISOString()}*`,
      ``,
      `## Coverage Overview`,
      ``,
      `- **Total requirements:** ${totalReqs}`,
      `- **Fully traced:** ${totalCovered} (${coveragePct}%)`,
      `- **Partially traced:** ${totalPartial}`,
      `- **Gaps:** ${totalGaps}`,
      `- **Orphaned (not assigned to any phase):** ${orphaned.length}`,
      ``,
    ];

    // Verdict
    if (totalGaps === 0 && orphaned.length === 0) {
      lines.push(`## Verdict: ✅ COMPLETE`, ``, `All requirements are fully traced through the pipeline.`);
    } else {
      lines.push(`## Verdict: ⚠️ GAPS FOUND`, ``, `${totalGaps} gap(s) and ${orphaned.length} orphaned requirement(s) require attention.`);
    }

    // Master matrix
    lines.push('', '---', '', '## Master Traceability Matrix', '');
    lines.push('| Requirement | Type | Plan | Test | Code | Evidence | Status |');
    lines.push('|-------------|------|------|------|------|----------|--------|');

    for (const [reqId, req] of Object.entries(allReqs.requirements || {})) {
      const trace = reqStatus[reqId];
      if (trace) {
        const plan = trace.plan?.found ? '✅' : '❌';
        const test = trace.test?.found ? '✅' : '❌';
        const code = trace.code?.found ? '✅' : '❌';
        const evidence = trace.evidence?.found ? '✅' : '❌';
        const status = trace.status === 'covered' ? '🟢' : (trace.status === 'partial' ? '🟡' : '🔴');
        lines.push(`| ${reqId} | ${req.type || '-'} | ${plan} | ${test} | ${code} | ${evidence} | ${status} |`);
      } else {
        lines.push(`| ${reqId} | ${req.type || '-'} | ❓ | ❓ | ❓ | ❓ | ⚪ ORPHANED |`);
      }
    }

    // Orphaned requirements
    if (orphaned.length > 0) {
      lines.push('', '---', '', '## Orphaned Requirements', '');
      lines.push('These requirements were extracted from the spec but never appeared in any phase RTM:');
      lines.push('');
      for (const reqId of orphaned) {
        const req = allReqs.requirements[reqId];
        lines.push(`- **${reqId}:** ${req?.text || 'unknown'} (estimated phase: ${req?.estimated_phase || 'none'})`);
      }
    }

    // Gap findings
    if (allGaps.length > 0) {
      const highGaps = allGaps.filter(g => g.severity === 'high');
      const medGaps = allGaps.filter(g => g.severity === 'medium');
      const lowGaps = allGaps.filter(g => g.severity === 'low');

      lines.push('', '---', '', '## All Gap Findings', '');
      lines.push(`- High severity: ${highGaps.length}`);
      lines.push(`- Medium severity: ${medGaps.length}`);
      lines.push(`- Low severity: ${lowGaps.length}`);
      lines.push('');

      if (highGaps.length > 0) {
        lines.push('### High Severity Gaps', '');
        lines.push('| # | Requirement | Missing | Detail |');
        lines.push('|---|-------------|---------|--------|');
        highGaps.forEach((g, i) => {
          lines.push(`| ${i + 1} | ${g.requirement} | ${g.missing} | ${(g.detail || '').substring(0, 100)} |`);
        });
        lines.push('');
      }
    }

    lines.push('', '---', '', '*Generated by Overdrive RTM Builder*');
    return lines.join('\n');
  }
}

module.exports = RTMBuilder;
