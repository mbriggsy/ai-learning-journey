import { test } from "node:test";
import assert from "node:assert/strict";
import { PAYLOAD, SCHEMAS, SIZE, SIZE_LAWS, budgetOf, capOf, maxPayload, maximalOf, schemaProblems } from "./caps.mjs";

// The ceiling a size-law line states, read from the line itself, so the line and the check can't drift.
const statedCeiling = (line) => {
  const m = line.match(/The whole call stays under ([\d,]+) characters\./);
  assert.ok(m, `no stated ceiling in: ${line.slice(0, 80)}...`);
  return Number(m[1].replace(/,/g, ""));
};

test("every schema is capped: each list has maxItems, each string maxLength, each number a maximum, and its required fields lead", () => {
  for (const [name, schema] of Object.entries(SCHEMAS)) assert.deepEqual(schemaProblems(schema), [], name);
});

test("the maximal legal finder payload stays under the size budget its size-law line states", () => {
  const ceiling = statedCeiling(SIZE_LAWS.finder);
  assert.equal(ceiling, PAYLOAD);
  const max = maxPayload(SCHEMAS.finder);
  assert.ok(max <= ceiling, `a maximal finder call is ${max} characters, over the ${ceiling} its size-law line states`);
  // The maximal value really is maximal: four findings, each string at its cap.
  const m = maximalOf(SCHEMAS.finder);
  assert.equal(m.findings.length, capOf("findings"));
  assert.equal(m.findings[0].why_it_matters.length, capOf("why"));
  assert.equal(m.last_line_number, capOf("line"));
});

test("every schema's maximal legal call stays under the ceiling its own size-law line states", () => {
  assert.deepEqual(Object.keys(SIZE_LAWS).sort(), Object.keys(SCHEMAS).sort(), "one size-law line per schema");
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const max = maxPayload(schema);
    assert.ok(max <= statedCeiling(SIZE_LAWS[name]), `${name}: ${max} characters`);
  }
});

test("a string's cap is 25% above the budget its prompt states; a list's and a number's caps equal their budgets", () => {
  for (const [key, e] of Object.entries(SIZE)) {
    if (e.chars !== undefined) assert.equal(capOf(key), Math.ceil(e.chars * 1.25), key);
    else assert.equal(capOf(key), budgetOf(key), key);
  }
  assert.equal(capOf("why"), 450);
  assert.equal(budgetOf("why"), 360);
  assert.equal(SCHEMAS.finder.properties.findings.items.properties.why_it_matters.maxLength, capOf("why"));
  assert.throws(() => capOf("nope"), /no size entry/);
});

test("each size-law line states the budgets, not the caps, of the fields its schema carries", () => {
  assert.match(SIZE_LAWS.finder, new RegExp(`At most ${budgetOf("findings")} findings`));
  assert.match(SIZE_LAWS.finder, new RegExp(`why_it_matters ${budgetOf("why")},`));
  assert.doesNotMatch(SIZE_LAWS.finder, new RegExp(`why_it_matters ${capOf("why")}`));
  assert.match(SIZE_LAWS.finder, new RegExp(`first ${budgetOf("lastLineText")} characters of the last line`));
  assert.match(SIZE_LAWS.verdict, new RegExp(`reasoning at most ${budgetOf("reasoning")} characters`));
  assert.match(SIZE_LAWS.scorer, new RegExp(`At most ${budgetOf("sections")} sections`));
  assert.match(SIZE_LAWS.amendment, new RegExp(`at most ${budgetOf("oldValues")} old_values of at most ${budgetOf("oldValue")} characters`));
  assert.match(SIZE_LAWS.gist, new RegExp(`gist at most ${budgetOf("gist")} characters`));
});

test("the inventory asks for the last line holding text as Read returned it, without its line-number prefix", () => {
  for (const name of ["finder", "scorer"]) assert.ok(SIZE_LAWS[name].includes(`last_line_text: the first ${budgetOf("lastLineText")} characters of the last line holding text you read, as Read returned it, without its line-number prefix`), name);
});

test("each scorer note carries its row's line first, so the run joins notes to the rows selection picks by line, never by a name two sections can share", () => {
  const note = SCHEMAS.scorer.properties.notes.items;
  assert.equal(Object.keys(note.properties)[0], "line");
  assert.deepEqual(note.properties.line, SCHEMAS.scorer.properties.sections.items.properties.line);
  assert.deepEqual(note.required, ["line", "section", "triggers_named"]);
  assert.match(SIZE_LAWS.scorer, new RegExp(`at most ${budgetOf("notes")} notes, one per section scoring 2 points or more \\(past ${budgetOf("notes")}, the ${budgetOf("notes")} that rank highest\\), each with its row's line and naming its triggers in at most ${budgetOf("triggersNamed")} characters`));
});

test("an amendment call can say outside research ran, in a field of its own after the required amendments; the size law says who sets it", () => {
  const props = SCHEMAS.amendment.properties;
  assert.deepEqual(props.outside_ran, { type: "boolean" });
  assert.deepEqual(Object.keys(props).slice(0, 2), ["amendments", "outside_ran"]);
  assert.deepEqual(SCHEMAS.amendment.required, ["amendments"]);
  assert.match(SIZE_LAWS.amendment, /outside_ran: an external researcher's only, true when a web search ran and every page cited as read was fetched\./);
});

test("each amendment states the gap it closes, capped, so its verifiers judge the gap it names", () => {
  const a = SCHEMAS.amendment.properties.amendments.items;
  assert.deepEqual(a.properties.gap, { type: "string", maxLength: capOf("gap") });
  assert.ok(a.required.includes("gap"));
  assert.match(SIZE_LAWS.amendment, new RegExp(`section at most ${budgetOf("section")} characters, gap ${budgetOf("gap")} \\(the gap it closes, with its plan line\\), change ${budgetOf("change")}`));
});

test("schemaProblems names each way a schema goes unbounded, and a capped one has none", () => {
  const ok = { type: "object", properties: { a: { type: "string", maxLength: 5 }, b: { type: "array", maxItems: 2, items: { type: "integer", maximum: 9 } } }, required: ["a"] };
  assert.deepEqual(schemaProblems(ok), []);
  const cases = [
    [{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }, /root\.a: a string with no maxLength/],
    [{ type: "object", properties: { a: { type: "array", items: { type: "string", maxLength: 1 } } }, required: ["a"] }, /root\.a: a list with no maxItems/],
    [{ type: "object", properties: { a: { type: "integer" } }, required: ["a"] }, /root\.a: a number with no maximum/],
    [{ type: "object", properties: { a: { type: "boolean" }, b: { type: "boolean" } }, required: ["b"] }, /required fields \(b\) are not the first properties \(a\)/],
    [{ type: "object", properties: { a: { type: "boolean" } }, required: ["z"] }, /required "z" is not a property/],
    [{ type: "object", properties: { a: { type: "boolean" } } }, /no required field/],
    [{ type: "object", properties: { a: { type: "object", properties: { c: { type: "string" } }, required: ["c"] } }, required: ["a"] }, /root\.a\.c: a string with no maxLength/],
    [{ type: "object", properties: { a: { type: "null" } }, required: ["a"] }, /not one this table caps/],
  ];
  for (const [schema, re] of cases) assert.match(schemaProblems(schema).join("; "), re);
  assert.throws(() => maxPayload(cases[0][0]), /uncapped schema/);
});

test("maxPayload counts a maximal call's JSON characters, and a cap past the ceiling shows up past it", () => {
  const s = { type: "object", properties: { a: { type: "string", maxLength: 3 }, b: { type: "integer", maximum: 120 }, c: { type: "string", enum: ["P0", "drop"] }, d: { type: "boolean" } }, required: ["a"] };
  assert.equal(maxPayload(s), JSON.stringify({ a: "xxx", b: 120, c: "drop", d: false }).length);
  const big = { type: "object", properties: { a: { type: "string", maxLength: PAYLOAD } }, required: ["a"] };
  assert.ok(maxPayload(big) > PAYLOAD);
});

test("the finder's and verdict's severities are the vote law's", async () => {
  const { SEVERITIES } = await import("./vote-law.mjs");
  assert.deepEqual(SCHEMAS.finder.properties.findings.items.properties.severity.enum, SEVERITIES);
  assert.deepEqual(SCHEMAS.verdict.properties.corrected_severity.enum, [...SEVERITIES, "drop"]);
});
