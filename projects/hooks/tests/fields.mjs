// fields.mjs: the documented hook input fields, per event, for the events the
// flow's hooks use. Source: the hooks reference,
// https://code.claude.com/docs/en/hooks.md, fetched 2026-10-21 (CLI 2.1.306):
// "Common input fields" and each event's "<Event> input" section.
//
// The probes capture what the real CLI sends (probes/, recorded in the
// private probes.md); a field the CLI sends that isn't here is a probe
// finding, not a fixture error. Fixtures stay inside this table.
//
// Field spec: [type, required] where type is 'string' | 'number' | 'boolean'
// | 'object' | 'array' | 'any', or an array of allowed string values. One
// enum comes from a probe, not the reference: command_source (Q3).

export const DOCS_SOURCE = 'https://code.claude.com/docs/en/hooks.md (fetched 2026-10-21)';

// Every event. agent_id and agent_type appear when the hook fires inside a
// subagent or the session runs with --agent; prompt_id is "absent until the
// first user input"; permission_mode and effort are on some events only.
export const COMMON = {
  session_id: ['string', true],
  transcript_path: ['string', true],
  cwd: ['string', true],
  hook_event_name: ['string', true],
  prompt_id: ['string', false],
  scratchpad_dir: ['string', false],
  permission_mode: [['default', 'plan', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'], false],
  effort: ['object', false],
  agent_id: ['string', false],
  agent_type: ['string', false],
};

const BACKGROUND = { background_tasks: ['array', false], session_crons: ['array', false] };

export const EVENTS = {
  SessionStart: {
    source: [['startup', 'resume', 'clear', 'compact', 'fork'], true],
    model: ['string', false],
    session_title: ['string', false],
    seconds_since_last_response: ['number', false],
    context_tokens: ['number', false],
    prompt_cache_likely_expired: ['boolean', false],
    estimated_cache_write_usd: ['number', false],
  },
  UserPromptSubmit: {
    prompt: ['string', true],
    session_title: ['string', false],
  },
  UserPromptExpansion: {
    expansion_type: [['slash_command', 'mcp_prompt'], true],
    command_name: ['string', true],
    command_args: ['string', true],
    // The reference names no values. Probe Q3 measured these on 2.1.306 and
    // pins them per arm (EXPECTED_SOURCE in q03-prompt-expansion.mjs, hashed
    // with it): a project skill, a .claude/commands file or a saved workflow
    // (projectSettings), a user skill (userSettings), a plugin skill or
    // command (plugin), a built-in (builtin). tests/verdicts-sources.test.mjs
    // holds the two sets equal, so a value outside them turns Q3
    // CONTRADICTED. An MCP prompt's was not measured.
    command_source: [['projectSettings', 'userSettings', 'plugin', 'builtin'], true],
    prompt: ['string', true],
  },
  PreToolUse: {
    tool_name: ['string', true],
    tool_input: ['object', true],
    tool_use_id: ['string', true],
    mcp_server: ['object', false],
  },
  PostToolUse: {
    tool_name: ['string', true],
    tool_input: ['object', true],
    tool_response: ['any', true],
    tool_use_id: ['string', true],
    duration_ms: ['number', false],
    mcp_server: ['object', false],
  },
  PostToolUseFailure: {
    tool_name: ['string', true],
    tool_input: ['object', true],
    tool_use_id: ['string', true],
    error: ['string', true],
    is_interrupt: ['boolean', false],
    duration_ms: ['number', false],
    mcp_server: ['object', false],
  },
  PostToolBatch: {
    tool_calls: ['array', true],
  },
  Stop: {
    stop_hook_active: ['boolean', true],
    last_assistant_message: ['string', true],
    ...BACKGROUND,
  },
  SubagentStart: {
    agent_id: ['string', true],
    agent_type: ['string', true],
  },
  SubagentStop: {
    stop_hook_active: ['boolean', true],
    agent_id: ['string', true],
    agent_type: ['string', true],
    agent_transcript_path: ['string', true],
    last_assistant_message: ['string', true],
    ...BACKGROUND,
  },
  StopFailure: {
    error: [['rate_limit', 'overloaded', 'authentication_failed', 'oauth_org_not_allowed', 'account_on_hold', 'billing_error', 'invalid_request', 'model_not_found', 'server_error', 'max_output_tokens', 'cloud_credential_error', 'unknown'], true],
    error_details: ['string', false],
    last_assistant_message: ['string', false],
  },
  ConfigChange: {
    source: [['user_settings', 'project_settings', 'local_settings', 'policy_settings', 'skills'], true],
    file_path: ['string', false],
  },
  SessionEnd: {
    reason: [['clear', 'resume', 'logout', 'prompt_input_exit', 'other'], true],
  },
};

// Each PostToolBatch tool_calls entry ("PostToolBatch input"). Its
// tool_input is the call as the model wrote it and its tool_response a string
// (a Read's numbered lines), while PreToolUse and PostToolUse hand over
// tool_input with the CLI's own path spelling. Probe Q4 (2.1.306, Windows)
// saw one Read's path spelled two ways: backslashes in PreToolUse and
// PostToolUse tool_input, forward slashes in PostToolUse
// tool_response.file.filePath and in the batch, as the model typed it (the
// *-windows fixtures copy that with synthetic paths). So one call's
// tool_input differs across events: a join across them goes by tool_use_id,
// and a path is normalized before any compare (U7 paths.mjs).
export const TOOL_CALL = {
  tool_name: ['string', true],
  tool_input: ['object', true],
  tool_use_id: ['string', true],
  tool_response: ['any', true],
};

// Each Stop / SubagentStop background_tasks entry ("Stop input").
export const BACKGROUND_TASK = {
  id: ['string', true],
  type: ['string', true],
  status: ['string', true],
  description: ['string', true],
  command: ['string', false],
  agent_type: ['string', false],
  server: ['string', false],
  tool: ['string', false],
  name: ['string', false],
};

function typeOk(type, v) {
  if (Array.isArray(type)) return typeof v === 'string' && type.includes(v);
  if (type === 'any') return v !== undefined;
  if (type === 'array') return Array.isArray(v);
  if (type === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
  return typeof v === type;
}

function check(spec, obj, where, problems) {
  for (const [k, [type, required]] of Object.entries(spec)) {
    if (!(k in obj)) {
      if (required) problems.push(`${where}: missing ${k}`);
    } else if (!typeOk(type, obj[k])) {
      problems.push(`${where}: ${k} should be ${Array.isArray(type) ? `one of ${type.join('|')}` : type}, got ${JSON.stringify(obj[k])}`);
    }
  }
  for (const k of Object.keys(obj)) if (!(k in spec)) problems.push(`${where}: ${k} is not a documented field`);
}

// The problems with `input` as a `event` hook payload; [] when it validates.
export function validateInput(event, input) {
  const own = EVENTS[event];
  if (!own) return [`${event}: no field table for this event`];
  const problems = [];
  check({ ...COMMON, ...own }, input, event, problems);
  if (input.hook_event_name !== undefined && input.hook_event_name !== event) problems.push(`${event}: hook_event_name is ${input.hook_event_name}`);
  if (event === 'PostToolBatch' && Array.isArray(input.tool_calls)) {
    input.tool_calls.forEach((c, i) => check(TOOL_CALL, c ?? {}, `${event}.tool_calls[${i}]`, problems));
  }
  if ((event === 'Stop' || event === 'SubagentStop') && Array.isArray(input.background_tasks)) {
    input.background_tasks.forEach((t, i) => check(BACKGROUND_TASK, t ?? {}, `${event}.background_tasks[${i}]`, problems));
  }
  return problems;
}
