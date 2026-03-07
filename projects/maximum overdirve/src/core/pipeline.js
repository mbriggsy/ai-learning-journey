/**
 * core/pipeline.js — Pipeline Step Definitions
 *
 * Describes WHAT each pipeline step does. Zero knowledge of HOW steps execute.
 * Drivers (CLI, Interactive) use these definitions to drive the pipeline.
 *
 * The 9-stage pipeline:
 *   plan -> strengthen -> gate-check -> code -> verify -> IV&V -> evidence -> RTM -> evidence-package
 */

const path = require('path');

// The 9 pipeline stages in execution order
const PIPELINE_STAGES = [
  'plan', 'strengthen', 'gate-check', 'code', 'verify',
  'ivv', 'evidence', 'rtm', 'evidence-package',
];

// Valid values for --upto flag
const VALID_UPTO_VALUES = [
  'plan', 'strengthen', 'gate-check', 'code', 'verify',
  'ivv', 'evidence', 'rtm', 'evidence-package',
];

// Maps phase status to the next pipeline stage to execute
const STATUS_TO_STAGE = {
  'pending':            'plan',
  'planned':            'strengthen',
  'strengthened':       'gate-check',
  'coding':             'code',
  'coded':              'verify',
  'verified':           'ivv',
  'ivv-passed':         'evidence',
  'evidence-collected': 'rtm',
  'rtm-complete':       null,     // phase complete
  'blocked':            'blocked', // needs gate resolution
};

// ============================================================
//  Step Descriptors — tell the driver what prompt to run
// ============================================================

/**
 * Get a step descriptor for a pipeline stage.
 *
 * @param {string} stage — Pipeline stage name (or 'init-roadmap', 'extract-requirements')
 * @param {object} params — Stage-specific parameters
 * @returns {object} { prompt, templateVars, executionType, allowedTools, timeoutKey, defaultTimeout, logLabel, ... }
 */
function getStepDescriptor(stage, params) {
  switch (stage) {
    case 'init-roadmap':
      return {
        prompt: 'create-roadmap',
        templateVars: { SPEC_CONTENT: params.specContent },
        executionType: 'prompt',
        timeoutKey: 'plan',
        defaultTimeout: 300000,
        logLabel: 'init-roadmap',
      };

    case 'plan':
      return {
        prompt: 'plan-phase',
        templateVars: {
          PHASE_NUMBER: String(params.phaseNumber),
          PHASE_NAME: params.phaseName,
          SPEC_CONTENT: params.specContent,
          ROADMAP_CONTENT: params.roadmapContent || '',
        },
        executionType: 'prompt',
        timeoutKey: 'plan',
        defaultTimeout: 300000,
        logLabel: `plan-phase-${params.phaseNumber}`,
      };

    case 'strengthen':
      return {
        prompt: 'strengthen-plan',
        templateVars: {
          PLAN_CONTENT: params.planContent,
          PLAN_ID: params.planId,
          PHASE_NUMBER: String(params.phaseNumber),
          SPEC_CONTENT: params.specContent,
          MCP_ENHANCEMENT: params.mcpEnhancement || '',
          COMPLEXITY_LEVEL: params.complexity || 'high',
        },
        contextFiles: params.contextFiles || [],
        mcpServers: params.mcpServers || [],
        executionType: 'prompt',
        timeoutKey: 'strengthen',
        defaultTimeout: 600000,
        logLabel: `strengthen-phase-${params.phaseNumber}-${params.planId}`,
      };

    case 'code':
      return {
        prompt: 'code-plan',
        templateVars: {
          PLAN_CONTENT: params.planContent,
          PLAN_ID: params.planId,
          PHASE_NUMBER: String(params.phaseNumber),
          SPEC_CONTENT: params.specContent,
        },
        executionType: 'execution',
        allowedTools: ['Bash', 'Read', 'Write', 'Edit'],
        timeoutKey: 'code',
        defaultTimeout: 600000,
        logLabel: `code-phase-${params.phaseNumber}-${params.planId}`,
        maxAttempts: 2,
      };

    case 'verify':
      return {
        prompt: 'verify-phase',
        templateVars: {
          PHASE_NUMBER: String(params.phaseNumber),
          PHASE_NAME: params.phaseName,
          SPEC_CONTENT: params.specContent,
        },
        executionType: 'execution',
        allowedTools: ['Bash', 'Read'],
        timeoutKey: 'verify',
        defaultTimeout: 300000,
        logLabel: `verify-phase-${params.phaseNumber}`,
      };

    case 'ivv':
      return {
        prompt: 'ivv-verify',
        templateVars: {
          PHASE_NUMBER: String(params.phaseNumber),
          ACCEPTANCE_CRITERIA: params.acceptanceCriteria,
          COMPLEXITY_LEVEL: params.complexity || 'high',
          COLD_CODE_READ_INSTRUCTIONS: params.coldCodeReadInstructions || '',
          COLD_CODE_READ_SECTION: params.coldCodeReadSection || '',
        },
        executionType: 'execution',
        allowedTools: ['Bash', 'Read'],
        timeoutKey: 'ivv',
        defaultTimeout: 600000,
        logLabel: `ivv-phase-${params.phaseNumber}`,
      };

    case 'evidence':
      return {
        prompt: 'collect-evidence',
        templateVars: {
          PHASE_NUMBER: String(params.phaseNumber),
          PHASE_NAME: params.phaseName,
          SPEC_CONTENT: params.specContent,
        },
        executionType: 'execution',
        allowedTools: ['Bash', 'Read'],
        timeoutKey: 'evidence',
        defaultTimeout: 300000,
        logLabel: `evidence-phase-${params.phaseNumber}`,
      };

    case 'rtm':
      return {
        prompt: 'build-rtm',
        templateVars: {
          PHASE_NUMBER: String(params.phaseNumber),
          PHASE_REQUIREMENTS: params.phaseRequirementsYaml,
        },
        executionType: 'execution',
        allowedTools: ['Bash', 'Read'],
        timeoutKey: 'rtm',
        defaultTimeout: 600000,
        logLabel: `rtm-phase-${params.phaseNumber}`,
      };

    case 'evidence-package':
      return {
        prompt: 'evidence-package',
        templateVars: {
          PROJECT_NAME: params.projectName,
          SPEC_FILE: params.specFile,
          BUILD_STARTED: params.buildStarted,
          BUILD_COMPLETED: params.buildCompleted || new Date().toISOString(),
          EVIDENCE_FILES: params.evidenceFiles || '(No phase evidence files found)',
          IVV_FILES: params.ivvFiles || '(No IV&V reports found)',
          RTM_SUMMARY: params.rtmSummary || '(No RTM summary available)',
          SPEC_CONTENT: params.specContent,
          STATE_CONTENT: params.stateContent,
        },
        executionType: 'execution',
        allowedTools: ['Bash', 'Read'],
        timeoutKey: 'evidence_package',
        defaultTimeout: 600000,
        logLabel: 'evidence-package',
      };

    case 'extract-requirements':
      return {
        prompt: 'extract-requirements',
        templateVars: {
          SPEC_CONTENT: params.specContent,
          PROJECT_NAME: params.projectName,
          SPEC_FILE: params.specFile,
        },
        executionType: 'prompt',
        timeoutKey: 'plan',
        defaultTimeout: 300000,
        logLabel: 'extract-requirements',
      };

    default:
      throw new Error(`Unknown pipeline stage: ${stage}`);
  }
}

// ============================================================
//  Shared Utilities — used by any driver
// ============================================================

/**
 * Parse phases from roadmap output.
 * Handles "## Phase N: Name" and numbered list formats.
 */
function parsePhases(roadmapOutput) {
  const phases = [];
  const phasePattern = /##\s*Phase\s+(\d+)\s*[:—–\-]?\s*(.+)/gi;
  let match;
  while ((match = phasePattern.exec(roadmapOutput)) !== null) {
    const name = match[2].trim();
    if (name) phases.push({ number: parseInt(match[1]), name, dependencies: [] });
  }
  if (phases.length === 0) {
    const listPattern = /(\d+)\.\s*\*?\*?Phase[:\s]+(.+?)(?:\*?\*?\s*[-—]|$)/gim;
    while ((match = listPattern.exec(roadmapOutput)) !== null) {
      phases.push({ number: parseInt(match[1]), name: match[2].trim(), dependencies: [] });
    }
  }
  return phases;
}

/**
 * Extract project name from spec content, falling back to filename.
 */
function extractProjectName(specContent, specFile) {
  const titleMatch = specContent.match(/^#\s+(.+)/m);
  if (titleMatch) return titleMatch[1].trim();
  return path.basename(specFile, path.extname(specFile));
}

/**
 * Parse verification output for pass/fail.
 */
function parseVerificationResult(output) {
  const lower = output.toLowerCase();
  if (lower.includes('verification: pass') || lower.includes('result: pass') || lower.includes('\u2705 pass')) return true;
  if (lower.includes('verification: fail') || lower.includes('result: fail') || lower.includes('\u274c fail')) return false;
  if (lower.includes('all tests pass') || lower.includes('tests passed')) return true;
  if (lower.includes('test failed') || lower.includes('tests failed') || lower.includes('failure')) return false;
  return true;
}

/**
 * Split Claude's plan output into individual plan files.
 * Returns array of { number, content }.
 */
function splitPlanOutput(output) {
  const planSplitPattern = /(?:^|\n)(?:---+\s*\n)?##\s*Plan\s+(\d+)/gi;
  const sections = output.split(planSplitPattern);
  const plans = [];

  if (sections.length > 1) {
    for (let i = 1; i < sections.length; i += 2) {
      const planNum = parseInt(sections[i]);
      const content = (sections[i + 1] || '').trim();
      if (content) {
        plans.push({ number: planNum, content: `## Plan ${planNum}\n\n${content}` });
      }
    }
  }

  if (plans.length === 0) {
    plans.push({ number: 1, content: output });
  }

  return plans;
}

module.exports = {
  PIPELINE_STAGES,
  VALID_UPTO_VALUES,
  STATUS_TO_STAGE,
  getStepDescriptor,
  parsePhases,
  extractProjectName,
  parseVerificationResult,
  splitPlanOutput,
};
