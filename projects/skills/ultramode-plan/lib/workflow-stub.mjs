// THE WORKFLOW STUB (U5 of docs/plans/hybrid-plan-step-plan.md). Runs a Workflow script's body in
// Node with the runtime's globals, so the generated scripts are tested against something that
// behaves like the Workflow tool. It follows the documented runtime (the workflow-authoring skill,
// read 2026-11-08), not a measured one: U6's smoke run supplies its anchor to the real runtime
// (insight 003: a rule about the platform is a map until a run measures it).
//
// What it holds the script to:
//   - the script begins with `export const meta = {...}`, a pure literal (no variable, call, spread
//     or template interpolation), and has no other export and no import;
//   - the body runs as an async function body in its own realm, with agent, parallel, pipeline,
//     phase, log, args, budget and workflow as its only globals beside the language's built-ins (no
//     process, require, console or filesystem);
//   - Date.now(), Math.random() and an argless new Date() throw (they would break resume); so does
//     Date() called as a function, which reads the clock too (stricter than the documented list);
//   - parallel(thunks) never rejects: a thunk that throws becomes null, and so does one whose agent
//     dies; pipeline(items, ...stages) runs each item through its stages with no barrier, each stage
//     given (previous result, item, index), and a stage that throws nulls its item and skips its
//     later stages (a stage that returns null passes null on); each takes at most 4096 items;
//   - agent(prompt, opts) throws on a schema whose root is not an object with properties, or whose
//     required fields are not all properties; with a schema it returns the responder's object, with
//     none its text, and null when the responder answers null (a helper that died on a terminal
//     error, or a user's skip);
//   - args arrive verbatim: an object stays an object, and a JSON string stays a string.
// What it records, for the tests to read: every agent() call's prompt and options in call order;
// each log and phase line; every error a parallel thunk or a pipeline stage swallowed (the runtime
// hides them as null, so a script bug would otherwise read as a dead helper); and every problem:
// a schema caps.mjs's schemaProblems finds uncapped or out of order (Back Nine insight 084), an
// option no agent() takes, an effort no agent() accepts, and a responder answer its schema rejects.
// A test reads `problems` and `swallowed` as well as the result.

import vm from "node:vm";
import { schemaProblems } from "./caps.mjs";

// The runtime's cap on the items one parallel() or pipeline() call accepts.
export const STUB_ITEMS = 4096;
const STUB_OPTS = ["label", "phase", "schema", "model", "effort", "isolation", "agentType"];
const STUB_EFFORTS = ["low", "medium", "high", "xhigh", "max"];

// ---------------------------------------------------------------- the script's parts

// The index just past the literal that opens at text[start] ("{" or "["), skipping strings and
// comments; a template literal is a string, and one with an interpolation throws (meta is a pure
// literal).
function stubLiteralEnd(text, start) {
  const close = { "{": "}", "[": "]" };
  const stack = [];
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      i = text.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
      if (i <= 0) break;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      for (; j < text.length && text[j] !== c; j++) {
        if (text[j] === "\\") j++;
        else if (c === "`" && text[j] === "$" && text[j + 1] === "{") throw new Error("workflow-stub: meta holds a template interpolation; it must be a pure literal");
        else if (c !== "`" && text[j] === "\n") throw new Error("workflow-stub: meta holds an unclosed string");
      }
      if (j >= text.length) throw new Error("workflow-stub: meta holds an unclosed string");
      i = j;
      continue;
    }
    if (c === "{" || c === "[") stack.push(close[c]);
    else if (c === "}" || c === "]") {
      if (stack.pop() !== c) throw new Error(`workflow-stub: meta's brackets do not match at character ${i}`);
      if (stack.length === 0) return i + 1;
    }
  }
  throw new Error("workflow-stub: meta's literal never closes");
}

// The names a pure literal may hold outside its strings: property keys (a name before ":") and the
// three literal words. Anything else is a free name: a variable, a call, a spread.
function stubFreeNames(literal) {
  // One pass, so a comment marker inside a string stays string and a quote inside a comment stays
  // comment: strings become "", comments a space.
  let stripped = "";
  for (let i = 0; i < literal.length; i++) {
    const c = literal[i];
    if (c === "/" && literal[i + 1] === "/") {
      const nl = literal.indexOf("\n", i);
      i = nl < 0 ? literal.length : nl - 1;
      stripped += " ";
    } else if (c === "/" && literal[i + 1] === "*") {
      i = literal.indexOf("*/", i + 2) + 1;
      stripped += " ";
    } else if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < literal.length && literal[j] !== c) j += literal[j] === "\\" ? 2 : 1;
      i = j;
      stripped += '""';
    } else stripped += c;
  }
  if (/\.\.\./.test(stripped)) return ["... (a spread)"];
  const out = [];
  for (const m of stripped.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const after = stripped.slice(m.index + m[0].length).match(/^\s*(.)/)?.[1];
    if (after === ":" || ["true", "false", "null"].includes(m[0])) continue;
    // A number's exponent or hex digits (1e3, 0x1F) are no names.
    if (/[\d.]$/.test(stripped.slice(0, m.index))) continue;
    out.push(m[0]);
  }
  return out;
}

// A Workflow script's parts: the meta literal's text and value, and the body after it. Throws when
// the script does not begin with `export const meta = {`, when meta is no pure literal, or when the
// script holds another export or an import.
export function scriptParts(source) {
  if (typeof source !== "string") throw new Error("workflow-stub: a script is text");
  const head = "export const meta = ";
  if (!source.startsWith(`${head}{`)) throw new Error("workflow-stub: a Workflow script begins with `export const meta = {`");
  const end = stubLiteralEnd(source, head.length);
  const metaText = source.slice(head.length, end);
  const free = stubFreeNames(metaText);
  if (free.length) throw new Error(`workflow-stub: meta must be a pure literal; it names ${[...new Set(free)].join(", ")}`);
  const meta = vm.runInNewContext(`(${metaText})`, Object.create(null), { timeout: 1000 });
  if (!meta || typeof meta.name !== "string" || !meta.name.trim() || typeof meta.description !== "string" || !meta.description.trim()) throw new Error("workflow-stub: meta needs a name and a description");
  const body = source.slice(end);
  const exports = [...source.matchAll(/^export\b/gm)].length;
  if (exports !== 1) throw new Error(`workflow-stub: a Workflow script has one export, its meta; this one has ${exports}`);
  const imp = body.match(/^\s*import\b.*$|\bimport\s*\(/m);
  if (imp) throw new Error(`workflow-stub: a Workflow script imports nothing (no filesystem or Node.js API); found ${JSON.stringify(imp[0].trim())}`);
  return { metaText, meta: JSON.parse(JSON.stringify(meta)), body };
}

// ---------------------------------------------------------------- schema checks

// The documented check: agent() throws on a schema whose root is not an object with properties, or
// whose required fields are not all properties.
function stubSchemaRoot(schema) {
  if (!schema || typeof schema !== "object" || schema.type !== "object" || !schema.properties || typeof schema.properties !== "object") return "a schema's root is { type: 'object', properties: {...} }";
  const req = schema.required ?? [];
  if (!Array.isArray(req) || req.some((r) => !Object.hasOwn(schema.properties, r))) return "a schema's required fields are all properties";
  return null;
}

// Whether a value matches the subset of JSON Schema caps.mjs builds (object with properties and
// required, array with items and maxItems, string with maxLength or enum, integer with minimum,
// maximum or enum, boolean). Returns the first mismatch, or null.
function stubMismatch(schema, v, at = "root") {
  if (schema.enum !== undefined && !schema.enum.some((e) => e === v)) return `${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(schema.enum)}`;
  switch (schema.type) {
    case "object": {
      if (!v || typeof v !== "object" || Array.isArray(v)) return `${at}: not an object`;
      for (const r of schema.required ?? []) if (!Object.hasOwn(v, r)) return `${at}: required ${r} is missing`;
      for (const k of Object.keys(v)) {
        if (!Object.hasOwn(schema.properties, k)) return `${at}: ${k} is no property`;
        const m = stubMismatch(schema.properties[k], v[k], `${at}.${k}`);
        if (m) return m;
      }
      return null;
    }
    case "array":
      if (!Array.isArray(v)) return `${at}: not a list`;
      if (Number.isInteger(schema.maxItems) && v.length > schema.maxItems) return `${at}: ${v.length} items, past ${schema.maxItems}`;
      for (let i = 0; i < v.length; i++) {
        const m = stubMismatch(schema.items, v[i], `${at}[${i}]`);
        if (m) return m;
      }
      return null;
    case "string":
      if (typeof v !== "string") return `${at}: not text`;
      if (Number.isInteger(schema.maxLength) && v.length > schema.maxLength) return `${at}: ${v.length} characters, past ${schema.maxLength}`;
      return null;
    case "integer":
      if (!Number.isInteger(v)) return `${at}: not a whole number`;
      if (schema.minimum !== undefined && v < schema.minimum) return `${at}: under ${schema.minimum}`;
      if (schema.maximum !== undefined && v > schema.maximum) return `${at}: past ${schema.maximum}`;
      return null;
    case "number":
      return typeof v === "number" ? null : `${at}: not a number`;
    case "boolean":
      return typeof v === "boolean" ? null : `${at}: not true or false`;
    case undefined:
      return null;
    default:
      return `${at}: type ${schema.type} is not one the stub checks`;
  }
}

// ---------------------------------------------------------------- the run

// The clock and the random number, taken away inside the script's realm.
const STUB_PRELUDE = `(() => {
  const RealDate = Date;
  const gone = (what) => { throw new Error(what + " is unavailable in a Workflow script: it would break resume"); };
  function StubDate(...a) {
    if (!new.target) gone("Date() called as a function");
    if (a.length === 0) gone("an argless new Date()");
    return new RealDate(...a);
  }
  StubDate.prototype = RealDate.prototype;
  StubDate.UTC = RealDate.UTC;
  StubDate.parse = RealDate.parse;
  StubDate.now = () => gone("Date.now()");
  globalThis.Date = StubDate;
  Math.random = () => gone("Math.random()");
  // A fresh V8 realm carries a console; the runtime documents none, so a script never leans on it.
  delete globalThis.console;
})();`;

const stubPlain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// Runs a Workflow script. `respond(call)` answers each agent() call, given { n, prompt, opts } (n
// counts from 1 in call order): an object for a schema call, text for one without, null for a
// helper that died, or a promise of one of those; it may record or count, but a throw is a test's
// own bug and fails the run. `budget` is the runtime's budget global ({ total } at most; total null
// by default, so remaining() is Infinity).
// Resolves to { result, error, calls, logs, phases, problems, swallowed }: `result` is the body's
// return value as JSON would carry it (the Workflow tool saves it as JSON), `error` the message of
// an error that escaped the body (the run failed), null otherwise.
export async function runWorkflow(source, { args, respond, budget = {}, filename = "workflow.js" } = {}) {
  const { body } = scriptParts(source);
  if (typeof respond !== "function") throw new Error("workflow-stub: respond is the function that answers each agent() call");
  const calls = [];
  const logs = [];
  const phases = [];
  const problems = [];
  const swallowed = [];
  let fault = null;
  const total = budget.total ?? null;

  async function agent(prompt, opts = {}) {
    const n = calls.length + 1;
    if (typeof prompt !== "string" || !prompt.trim()) problems.push(`agent ${n}: the prompt is not text`);
    if (!opts || typeof opts !== "object") problems.push(`agent ${n}: opts is not an object`);
    const o = opts && typeof opts === "object" ? opts : {};
    for (const k of Object.keys(o)) if (!STUB_OPTS.includes(k)) problems.push(`agent ${n} (${o.label ?? "no label"}): no agent() option ${k}`);
    if (o.effort !== undefined && !STUB_EFFORTS.includes(o.effort)) problems.push(`agent ${n} (${o.label ?? "no label"}): effort ${JSON.stringify(o.effort)} is none agent() accepts`);
    const call = { n, prompt, opts: stubPlain(o) };
    calls.push(call);
    if (o.schema !== undefined) {
      const root = stubSchemaRoot(o.schema);
      if (root) {
        problems.push(`agent ${n} (${o.label ?? "no label"}): ${root}`);
        throw new Error(`agent: ${root}`);
      }
      for (const p of schemaProblems(o.schema)) problems.push(`agent ${n} (${o.label ?? "no label"}): ${p}`);
    }
    let answer;
    try {
      answer = await respond({ n, prompt, opts: call.opts });
    } catch (e) {
      fault ??= e;
      throw e;
    }
    if (answer === null || answer === undefined) return null;
    if (o.schema === undefined) {
      if (typeof answer !== "string") problems.push(`agent ${n} (${o.label ?? "no label"}): a call with no schema answers text, got ${typeof answer}`);
      return answer;
    }
    const bad = stubMismatch(o.schema, answer);
    if (bad) {
      problems.push(`agent ${n} (${o.label ?? "no label"}): the answer fails its schema: ${bad}`);
      throw new Error(`agent: the answer fails its schema: ${bad}`);
    }
    return stubPlain(answer);
  }

  const items = (what, list) => {
    if (!Array.isArray(list)) throw new Error(`${what}: takes a list`);
    if (list.length > STUB_ITEMS) throw new Error(`${what}: at most ${STUB_ITEMS} items, got ${list.length}`);
  };
  function parallel(thunks) {
    items("parallel", thunks);
    return Promise.all(
      thunks.map((t, i) => {
        const swallow = (e) => {
          swallowed.push({ where: `parallel item ${i}`, message: String(e?.message ?? e) });
          return null;
        };
        try {
          if (typeof t !== "function") throw new Error("parallel: each item is a function that returns a promise");
          return Promise.resolve(t()).catch(swallow);
        } catch (e) {
          return Promise.resolve(swallow(e));
        }
      }),
    );
  }
  function pipeline(list, ...stages) {
    items("pipeline", list);
    if (stages.some((s) => typeof s !== "function")) throw new Error("pipeline: each stage is a function");
    return Promise.all(
      list.map(async (item, i) => {
        let prev = item;
        for (let s = 0; s < stages.length; s++) {
          try {
            prev = await stages[s](prev, item, i);
          } catch (e) {
            swallowed.push({ where: `pipeline item ${i}, stage ${s + 1}`, message: String(e?.message ?? e) });
            return null;
          }
        }
        return prev;
      }),
    );
  }
  const globals = {
    agent,
    parallel,
    pipeline,
    phase: (title) => void phases.push(String(title)),
    log: (message) => void logs.push(String(message)),
    args,
    budget: { total, spent: () => 0, remaining: () => (total === null ? Infinity : total) },
    workflow: () => {
      throw new Error("workflow-stub: workflow() runs another saved workflow, which this skill's scripts never do");
    },
  };
  const ctx = vm.createContext(globals);
  vm.runInContext(STUB_PRELUDE, ctx);
  // The body runs as an async function body, so a top-level return is its result.
  const code = `(async () => {${body}\n})()`;
  let result;
  let error = null;
  try {
    result = stubPlain(await vm.runInContext(code, ctx, { filename }));
  } catch (e) {
    error = String(e?.message ?? e);
  }
  if (fault) throw fault;
  return { result, error, calls, logs, phases, problems, swallowed };
}
