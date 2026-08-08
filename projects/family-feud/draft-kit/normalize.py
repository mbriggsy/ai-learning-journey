#!/usr/bin/env python3
"""The name normalizer -- one copy of the rules, three runtimes.

    python normalize.py --emit          rewrite draft-kit/norm_spec.json from SPEC
    python normalize.py --check         exit non-zero if norm_spec.json has drifted from SPEC

WHY THIS FILE EXISTS
--------------------
`draft_engine.py` held two normalizers -- `norm()` and `tokens()` -- in the same file, repeating
three of four cleaning steps verbatim. A JS port (the live board), the schema gate, the Wire
matcher and the sleeperId resolver each want one of them. Six consumers of a rule that was written
down twice is the drift class this rebuild exists to kill.

So the rules are DATA (`SPEC`), not code. This module is a thin interpreter of that data; the JS is
a second thin interpreter of the same data, emitted by `js_source()`. Neither runtime holds an
independent copy, which is stronger than two implementations agreeing on golden vectors -- vectors
only catch divergence on inputs somebody thought of, and the August waiver wire does not consult
our test suite.

`norm_spec.json` is a BUILD OUTPUT for the JS. It is never read at runtime by anything Python:
`draft_engine.py` runs with cwd set to wherever the operator is standing, and a literal-name read
would kill it from any other directory (the subprocess test harness runs it from a tmpdir). The
rules ship inside this module; the JSON is emitted from them and verified against them.

ORDERING IS LOAD-BEARING. ASCII folding runs FIRST, so every later step sees pure ASCII. That is
what makes `\\b` mean the same thing in Python `re` (Unicode word chars by default) and in JS
`RegExp` (ASCII word chars, always). Reorder these steps and the two runtimes silently diverge on
any accented name.

NON-STRING INPUT IS LOUD, BY DECISION. The old `tokens()` coerced with `str(s)` and the old
`norm()` did not, so a malformed board `name` (a number, a null) failed loudly on one path and
silently stringified on the other. Extracting the shared prefix forced the choice. This project
prefers loud: a board row whose `name` is not a string is a corrupt row, and `float('nan')` quietly
becoming the token `nan` is how a bad row reaches BEST AVAILABLE wearing a name.
"""
import json
import os
import re
import sys
import unicodedata

# --- THE RULES. The only copy. Everything else in this file, and the JS, interprets this. --------
SPEC = {
    "version": 1,
    # Nickname -> legal first name. Applied to the FIRST token only, and only by norm().
    # tokens() deliberately skips it: it exists to survive re-renderings, and collapsing
    # nicknames there would let two different men on one (team, pos) share a token.
    "aliases": {
        "kenny": "kenneth", "cam": "cameron", "mike": "michael", "matt": "matthew",
        "josh": "joshua", "chris": "christopher", "jon": "jonathan", "jonathon": "jonathan",
        "zach": "zachary", "alex": "alexander", "nick": "nicholas", "jeff": "jeffrey",
        "dan": "daniel", "dave": "david", "rob": "robert", "will": "william", "tony": "anthony",
    },
    # The shared cleaning prefix, in order. Both norm() and tokens() run exactly this.
    "steps": [
        # Decompose, then drop everything outside ASCII. Diacritics fold (Ekelé -> Ekele);
        # non-decomposable non-ASCII is DELETED, not transliterated.
        {"op": "nfkd_ascii"},
        {"op": "lower"},
        # Generational suffixes, with an optional trailing period ("Jr." / "III").
        # Alternation order matters and is identical in both engines: "ii" is tried before "iii"
        # and fails its closing \b against the third i, then backtracks. Do not reorder.
        {"op": "regex_remove", "pattern": r"\b(jr|sr|ii|iii|iv|v)\b\.?"},
        # Everything that is not a lowercase letter or a space. Apostrophes, hyphens and periods
        # die here: Ja'Marr -> jamarr, Amon-Ra -> amonra.
        {"op": "regex_remove", "pattern": r"[^a-z ]"},
        {"op": "split_ws"},
    ],
}

SPEC_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "norm_spec.json")


class SpecError(Exception):
    """The spec itself is malformed -- a programming error, not bad input."""


def _run_steps(s, trace_into=None):
    """Run the shared cleaning prefix. Returns a list of tokens. Raises TypeError on non-str.

    `trace_into`, if given, collects the value after EVERY step. The equivalence check compares
    those intermediates pairwise rather than only the final string, because the last step
    (`[^a-z ]`) is aggressive enough to mask a real divergence in an earlier one -- a JS that
    folded only combining marks instead of all non-ASCII would still produce identical output on
    every name we could think of, and would diverge on the one we could not.
    """
    if not isinstance(s, str):
        raise TypeError(
            f"name must be str, got {type(s).__name__}: {s!r}. "
            "A non-string name is a corrupt row -- fix the source, do not coerce here."
        )
    v = s
    for i, step in enumerate(SPEC["steps"]):
        op = step["op"]
        if op == "nfkd_ascii":
            v = unicodedata.normalize("NFKD", v).encode("ascii", "ignore").decode("ascii")
        elif op == "lower":
            v = v.lower()
        elif op == "regex_remove":
            v = re.sub(step["pattern"], "", v)
        elif op == "split_ws":
            if i != len(SPEC["steps"]) - 1:
                raise SpecError("split_ws must be the final step -- it changes str to list")
            v = v.split()
            if trace_into is not None:
                trace_into.append(list(v))
            return v
        else:
            raise SpecError(f"unknown op {op!r} at step {i}")
        if trace_into is not None:
            trace_into.append(v)
    raise SpecError("spec did not end in split_ws")


def _clean_tokens(s):
    return _run_steps(s)


def trace(s):
    """Every intermediate value, one per step. For the equivalence gate, not for callers."""
    out = []
    _run_steps(s, out)
    return out


def norm(s):
    """Board/pick name -> a single comparison key. 'Ja'Marr Chase' -> 'jamarrchase'."""
    parts = _clean_tokens(s)
    if parts:
        parts[0] = SPEC["aliases"].get(parts[0], parts[0])
    return "".join(parts)


def tokens(s):
    """Cleaned name tokens -- {first, last}. No alias map, by design (see SPEC['aliases']).

    Nicknames replace the FIRST name and leave the surname (Hollywood/Marquise Brown);
    re-renderings change the SURNAME and leave the first (Jaxon Smith-Njigba / Jaxon Njigba).
    Requiring either one to survive keeps both, while excluding two different men who merely
    share a team and position.
    """
    t = _clean_tokens(s)
    return {t[0], t[-1]} if t else set()


# --- Emitters. The JS interpreter is generic; every rule it applies comes from NORM_SPEC. -------

_JS_INTERPRETER = r"""// GENERATED by draft-kit/normalize.py -- do not edit. Rules live in NORM_SPEC below.
function normRunSteps(s, spec, traceInto) {
  if (typeof s !== "string") {
    throw new TypeError("name must be a string, got " + (typeof s) + ": " + String(s));
  }
  var v = s;
  for (var i = 0; i < spec.steps.length; i++) {
    var step = spec.steps[i];
    if (step.op === "nfkd_ascii") {
      // Python's .encode("ascii", "ignore") drops every code point above 127, not just marks.
      v = v.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
    } else if (step.op === "lower") {
      v = v.toLowerCase();
    } else if (step.op === "regex_remove") {
      // "g" is mandatory: Python's re.sub replaces every occurrence; JS replace() without it
      // replaces the first only. A player with two suffix tokens would diverge silently.
      v = v.replace(new RegExp(step.pattern, "g"), "");
    } else if (step.op === "split_ws") {
      if (i !== spec.steps.length - 1) throw new Error("split_ws must be the final step");
      // Python's bare .split() drops empty fields; JS keeps them at both ends.
      var parts = v.split(/\s+/).filter(Boolean);
      if (traceInto) traceInto.push(parts.slice());
      return parts;
    } else {
      throw new Error("unknown op " + step.op);
    }
    if (traceInto) traceInto.push(v);
  }
  throw new Error("spec did not end in split_ws");
}

function normCleanTokens(s, spec) {
  return normRunSteps(s, spec, null);
}

// Every intermediate value, one per step -- the other half of the equivalence proof.
function normTrace(s, spec) {
  var out = [];
  normRunSteps(s, spec, out);
  return out;
}

function normName(s, spec) {
  var t = normCleanTokens(s, spec);
  // hasOwnProperty, not a bare lookup: spec.aliases came from JSON.parse, so it inherits
  // Object.prototype and a token like "constructor" would resolve to a function.
  if (t.length && Object.prototype.hasOwnProperty.call(spec.aliases, t[0])) {
    t[0] = spec.aliases[t[0]];
  }
  return t.join("");
}

function normTokens(s, spec) {
  var t = normCleanTokens(s, spec);
  if (!t.length) return [];
  return t[0] === t[t.length - 1] ? [t[0]] : [t[0], t[t.length - 1]];
}
"""


def spec_json():
    """The spec as the exact bytes that belong in norm_spec.json."""
    return json.dumps(SPEC, indent=2, ensure_ascii=False, sort_keys=False) + "\n"


def js_source():
    """The generic JS interpreter plus the rules, ready to embed beside `const DATA` (U6)."""
    return f"{_JS_INTERPRETER}\nvar NORM_SPEC = {json.dumps(SPEC, ensure_ascii=False)};\n"


def _main(argv):
    if "--check" in argv:
        try:
            on_disk = open(SPEC_PATH, encoding="utf-8").read()
        except FileNotFoundError:
            print(f"norm_spec.json is missing at {SPEC_PATH} -- run: python normalize.py --emit")
            return 1
        if on_disk != spec_json():
            print("norm_spec.json has DRIFTED from SPEC in normalize.py.")
            print("The JS on the live board is applying different rules than Python.")
            print("Run: python normalize.py --emit")
            return 1
        print("norm_spec.json matches SPEC")
        return 0
    if "--emit" in argv:
        with open(SPEC_PATH, "w", encoding="utf-8", newline="\n") as f:
            f.write(spec_json())
        print(f"wrote {SPEC_PATH}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
