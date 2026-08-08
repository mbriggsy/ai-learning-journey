#!/usr/bin/env python3
"""Tests for draft-kit/normalize.py -- the one normalizer, proven equal in two runtimes.

    python -m unittest discover -s tests -v        (from the project root)

WHAT THIS SUITE IS ACTUALLY FOR. Golden vectors alone cannot do this job: two implementations
agreeing on twenty inputs somebody thought of are still two implementations, and the name that
breaks them arrives on the August waiver wire, not in a test file. So the rules are data, both
runtimes interpret the same data, and the equivalence assertion below runs over the ENTIRE live
board plus the entire lab feed -- 300+ real names -- not over a vector list.

NODE ABSENCE FAILS, IT DOES NOT SKIP. A skipped equivalence check is insight 006 exactly: a
verification step that silently does nothing while reading green. The live board ships JS; a
machine that cannot run it cannot verify it, and that is a red suite, not a quiet pass.
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
sys.path.insert(0, KIT)
import normalize  # noqa: E402

BOARD_PATH = os.path.join(KIT, "players_data.json")
FEED_PATH = os.path.join(ROOT, "tests", "fixtures", "lab_feed_120.json")
ENGINE_PATH = os.path.join(KIT, "draft_engine.py")

# The plan's golden vectors, verbatim.
GOLDEN = [
    ("Ja'Marr Chase", "jamarrchase"),
    ("Ja’Marr Chase", "jamarrchase"),          # U+2019, non-decomposable -> deleted
    ("Amon-Ra St. Brown", "amonrastbrown"),
    ("Kenneth Walker III", "kennethwalker"),
    ("Marvin Harrison Jr.", "marvinharrison"),
    ("A.J. Brown", "ajbrown"),
    ("AJ Brown", "ajbrown"),
    ("Kenny Gainwell", "kennethgainwell"),          # alias, first token only
]

# Inputs chosen to break a hand-ported JS regex rather than to look like football.
TRAPS = [
    "  spaced   out  ",              # leading/trailing/internal runs -> .filter(Boolean)
    "Marquise Brown Jr. III",        # two suffix tokens -> the /g flag
    "Ekelé Ekelé",         # decomposable accents fold
    "山田 Tanaka",           # non-decomposable non-ASCII is DELETED, not transliterated
    "Bijan Robinson ",          # NBSP: NFKD turns it into a plain space
    "constructor toString",          # JS bare alias lookup would hit Object.prototype
    "__proto__ valueOf",
    "hasOwnProperty x",
    "D'Andre Swift",
    "De'Von Achane",
    "Jaxon Smith-Njigba",
    "Robert Griffin III",
    "Odell Beckham Jr",              # no trailing period
    "Cam Ward",                      # alias on a real player
    "",
    "   ",
]


def board_names():
    with open(BOARD_PATH, encoding="utf-8") as f:
        d = json.load(f)
    return [p["name"] for p in d["players"]], [x["team"] for x in d["dst"]]


def feed_names():
    with open(FEED_PATH, encoding="utf-8") as f:
        picks = json.load(f)
    out = []
    for p in picks:
        md = p.get("metadata") or {}
        out.append(f"{md.get('first_name', '')} {md.get('last_name', '')}".strip())
    return out


def run_node(js_body, argv=(), js=None):
    """Concatenate the EMITTED JS with `js_body` and run the result as one node script.

    Concatenation rather than eval() on purpose, twice over: eval would be executing file
    contents at runtime for no benefit, and inlining is also exactly how U6 embeds this into
    the board's HTML beside `const DATA` -- so the test exercises the real deployment shape.

    Failure here is a real failure. There is no skip path: see the module docstring.
    """
    with tempfile.TemporaryDirectory() as d:
        run_js = os.path.join(d, "run.js")
        with open(run_js, "w", encoding="utf-8") as f:
            f.write(normalize.js_source() if js is None else js)
            f.write("\n// ---- test driver ----\n")
            f.write(js_body)
        try:
            p = subprocess.run(["node", run_js, *argv],
                               capture_output=True, text=True, encoding="utf-8")
        except FileNotFoundError:
            raise AssertionError(
                "node is not on PATH. The live board's normalizer is JS and this suite is the "
                "only thing that proves it agrees with Python. Install node -- do not skip."
            )
        if p.returncode != 0:
            raise AssertionError(f"the emitted JS failed to run:\n{p.stderr[:4000]}")
        return p.stdout


def js_eval(names, js=None):
    """Normalize `names` through the emitted JS. Returns [{"norm": str, "tokens": [sorted]}]."""
    with tempfile.TemporaryDirectory() as d:
        names_json = os.path.join(d, "names.json")
        with open(names_json, "w", encoding="utf-8") as f:
            json.dump(names, f, ensure_ascii=False)
        out = run_node(
            'const names = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));\n'
            'process.stdout.write(JSON.stringify(names.map(n => ({\n'
            '  norm: normName(n, NORM_SPEC),\n'
            '  tokens: normTokens(n, NORM_SPEC).slice().sort()\n'
            '}))));\n',
            argv=(names_json,), js=js)
    return json.loads(out)


class GoldenVectors(unittest.TestCase):
    def test_norm_golden_vectors(self):
        for raw, want in GOLDEN:
            with self.subTest(raw=raw):
                self.assertEqual(normalize.norm(raw), want)

    def test_alias_applies_to_first_token_only(self):
        # "will" is in the alias table; as a surname it must survive untouched.
        self.assertEqual(normalize.norm("Will Levis"), "williamlevis")
        self.assertEqual(normalize.norm("Levis Will"), "leviswill")

    def test_tokens_does_not_alias(self):
        # norm() collapses the nickname; tokens() deliberately does not -- it exists to survive
        # re-renderings, and aliasing there would let two men on one (team,pos) share a token.
        self.assertEqual(normalize.norm("Kenny Gainwell"), "kennethgainwell")
        self.assertEqual(normalize.tokens("Kenny Gainwell"), {"kenny", "gainwell"})

    def test_tokens_keeps_first_and_last_only(self):
        self.assertEqual(normalize.tokens("Amon-Ra St. Brown"), {"amonra", "brown"})
        self.assertEqual(normalize.tokens("Chase"), {"chase"})
        self.assertEqual(normalize.tokens(""), set())
        self.assertEqual(normalize.tokens("   "), set())

    def test_empty_and_whitespace_norm_to_empty_string(self):
        self.assertEqual(normalize.norm(""), "")
        self.assertEqual(normalize.norm("   "), "")
        self.assertEqual(normalize.norm("Jr."), "")   # nothing but a suffix

    def test_suffix_removal_is_global_not_first_occurrence(self):
        # If re.sub/replace lost its global behaviour this would keep the second suffix.
        self.assertEqual(normalize.norm("Marquise Brown Jr. III"), "marquisebrown")


class NonStringIsLoud(unittest.TestCase):
    """The one deliberate behaviour change in U3, recorded as a test so it cannot drift back.

    Before extraction tokens() coerced with str(s) and norm() did not. tokens(float('nan'))
    returned {'nan'} -- a corrupt board row acquiring a name and entering the candidate set.
    Both paths are now loud.
    """

    def test_norm_rejects_non_string(self):
        for bad in (None, 3, 4.5, float("nan"), ["a"], {"a": 1}):
            with self.subTest(bad=bad), self.assertRaises(TypeError):
                normalize.norm(bad)

    def test_tokens_rejects_non_string(self):
        for bad in (None, 3, 4.5, float("nan"), ["a"], {"a": 1}):
            with self.subTest(bad=bad), self.assertRaises(TypeError):
                normalize.tokens(bad)

    def test_the_error_is_ours_and_is_actionable(self):
        """Not just "it raised" -- deleting our isinstance check still raises, because
        unicodedata.normalize refuses a non-str on its own. But it says
        "normalize() argument 2 must be str, not NoneType", which tells a draft-morning
        operator nothing about which board row to go fix. Assert OUR message survives."""
        with self.assertRaises(TypeError) as cm:
            normalize.norm(None)
        msg = str(cm.exception)
        self.assertIn("None", msg)          # what was wrong
        self.assertIn("corrupt row", msg)   # what it means
        self.assertIn("do not coerce", msg)  # what not to do about it

    def test_js_also_rejects_non_string(self):
        out = run_node(
            'let threw = 0;\n'
            'for (const bad of [null, 3, 4.5, NaN, ["a"], {}]) {\n'
            '  try { normName(bad, NORM_SPEC); } catch (e) {'
            ' if (e instanceof TypeError) threw++; }\n'
            '}\n'
            'process.stdout.write(String(threw));\n'
        )
        self.assertEqual(out, "6", "the JS silently coerced a non-string")


class BoardSweep(unittest.TestCase):
    def test_every_board_name_normalizes_to_a_distinct_key(self):
        players, _ = board_names()
        self.assertEqual(len(players), 174, "board size changed -- re-verify this sweep")
        keys = {}
        for name in players:
            keys.setdefault(normalize.norm(name), []).append(name)
        collisions = {k: v for k, v in keys.items() if len(v) > 1}
        self.assertEqual(collisions, {},
                         "two board rows share a norm() key -- one pick would remove both")

    def test_the_collision_sweep_can_actually_fail(self):
        """Positive control. A sweep that cannot go red proves nothing (amendment 4)."""
        colliding = ["Marvin Harrison Jr.", "Marvin Harrison"]
        keys = {}
        for name in colliding:
            keys.setdefault(normalize.norm(name), []).append(name)
        self.assertEqual(len(keys), 1, "the sweep's own detection logic is broken")

    def test_every_board_name_is_a_string(self):
        players, dst = board_names()
        for name in players + dst:
            self.assertIsInstance(name, str)


class PythonJsEquivalence(unittest.TestCase):
    def test_agree_across_the_whole_live_corpus(self):
        players, dst = board_names()
        names = players + dst + feed_names() + [g[0] for g in GOLDEN] + TRAPS
        self.assertGreater(len(names), 300, "corpus shrank -- this is the load-bearing test")
        js = js_eval(names)
        self.assertEqual(len(js), len(names))
        diffs = []
        for name, got in zip(names, js):
            if normalize.norm(name) != got["norm"]:
                diffs.append(f"norm({name!r}): py={normalize.norm(name)!r} js={got['norm']!r}")
            if sorted(normalize.tokens(name)) != got["tokens"]:
                diffs.append(f"tokens({name!r}): py={sorted(normalize.tokens(name))} "
                             f"js={got['tokens']}")
        self.assertEqual(diffs, [], "\n".join(diffs))

    def test_agree_at_every_step_not_just_at_the_end(self):
        """The stronger claim, and the one that actually protects us.

        The final step, `[^a-z ]`, deletes everything that is not a lowercase letter or a space.
        It is aggressive enough to MASK an earlier divergence: a JS that folded only combining
        marks instead of dropping all non-ASCII produces byte-identical output on every name in
        the corpus below, because the leftover characters get deleted a step later anyway. That
        mutant survives an end-to-end comparison. It does not survive this one.
        """
        players, dst = board_names()
        names = players + dst + feed_names() + [g[0] for g in GOLDEN] + TRAPS
        with tempfile.TemporaryDirectory() as d:
            names_json = os.path.join(d, "names.json")
            with open(names_json, "w", encoding="utf-8") as f:
                json.dump(names, f, ensure_ascii=False)
            out = run_node(
                'const names = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));\n'
                'process.stdout.write(JSON.stringify('
                'names.map(n => normTrace(n, NORM_SPEC))));\n',
                argv=(names_json,))
        js_traces = json.loads(out)
        n_steps = len(normalize.SPEC["steps"])
        diffs = []
        for name, js_trace in zip(names, js_traces):
            py_trace = normalize.trace(name)
            self.assertEqual(len(py_trace), n_steps)
            self.assertEqual(len(js_trace), n_steps, f"JS emitted {len(js_trace)} intermediates")
            for i, (a, b) in enumerate(zip(py_trace, js_trace)):
                if a != b:
                    op = normalize.SPEC["steps"][i]["op"]
                    diffs.append(f"step {i} ({op}) on {name!r}: py={a!r} js={b!r}")
        self.assertEqual(diffs, [], "\n".join(diffs[:20]))

    def test_the_step_by_step_harness_can_actually_fail(self):
        """Positive control for the check above, using the exact mutant that survived
        end-to-end comparison during U3's mutation pass."""
        target = 'replace(/[^\\x00-\\x7F]/g, "")'
        source = normalize.js_source()
        self.assertIn(target, source, "mutation target vanished -- this control is vacuous")
        broken = source.replace(target, 'replace(/[\\u0300-\\u036f]/g, "")')
        self.assertNotEqual(broken, source)
        with tempfile.TemporaryDirectory() as d:
            names_json = os.path.join(d, "names.json")
            with open(names_json, "w", encoding="utf-8") as f:
                json.dump(["山田 Tanaka"], f, ensure_ascii=False)
            out = run_node(
                'const names = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));\n'
                'process.stdout.write(JSON.stringify('
                'names.map(n => normTrace(n, NORM_SPEC))));\n',
                argv=(names_json,), js=broken)
        js_trace = json.loads(out)[0]
        py_trace = normalize.trace("山田 Tanaka")
        self.assertEqual(py_trace[-1], js_trace[-1],
                         "this mutant is supposed to be invisible end-to-end")
        self.assertNotEqual(py_trace[0], js_trace[0],
                            "the step-by-step check failed to see a divergence it exists to catch")

    def test_js_prototype_lookup_is_guarded(self):
        # A bare `spec.aliases[t[0]]` in JS resolves "constructor" to Object and produces
        # "function Object() { [native code] }". Python's dict.get() cannot do this, so the
        # divergence exists only in the JS and only for these tokens.
        got = js_eval(["constructor Smith", "toString Jones", "hasOwnProperty Brown"])
        self.assertEqual([g["norm"] for g in got],
                         ["constructorsmith", "tostringjones", "hasownpropertybrown"])

    def test_the_equivalence_harness_can_actually_fail(self):
        """Positive control: hand the harness a deliberately wrong JS and watch it go red."""
        broken = normalize.js_source().replace('v.toLowerCase()', 'v')     # drop the lower step
        self.assertIn('v.toLowerCase()', normalize.js_source(),
                      "the mutation target vanished -- this control is no longer testing anything")
        got = js_eval(["Ja'Marr Chase"], js=broken)
        self.assertNotEqual(got[0]["norm"], normalize.norm("Ja'Marr Chase"),
                            "a broken JS agreed with Python -- the harness is not comparing")


class SpecArtifact(unittest.TestCase):
    def test_committed_spec_json_matches_the_module(self):
        with open(normalize.SPEC_PATH, encoding="utf-8") as f:
            self.assertEqual(f.read(), normalize.spec_json(),
                             "norm_spec.json drifted from SPEC -- run: python normalize.py --emit")

    def test_check_flag_goes_red_on_drift(self):
        """The drift guard must fail on a file that really changed (amendment 4, clause 3)."""
        with open(normalize.SPEC_PATH, encoding="utf-8") as f:
            original = f.read()
        mutated = original.replace('"kenny": "kenneth"', '"kenny": "KENNETH"')
        self.assertNotEqual(mutated, original, "the mutation did not apply -- test is vacuous")
        try:
            with open(normalize.SPEC_PATH, "w", encoding="utf-8", newline="\n") as f:
                f.write(mutated)
            p = subprocess.run([sys.executable, os.path.join(KIT, "normalize.py"), "--check"],
                               capture_output=True, text=True, encoding="utf-8", cwd=ROOT)
            self.assertNotEqual(p.returncode, 0, "--check passed a drifted spec")
            self.assertIn("DRIFTED", p.stdout)
        finally:
            with open(normalize.SPEC_PATH, "w", encoding="utf-8", newline="\n") as f:
                f.write(original)
        p = subprocess.run([sys.executable, os.path.join(KIT, "normalize.py"), "--check"],
                           capture_output=True, text=True, encoding="utf-8", cwd=ROOT)
        self.assertEqual(p.returncode, 0, f"--check failed on a clean spec: {p.stdout}{p.stderr}")

    def test_spec_json_is_valid_json_and_carries_both_halves(self):
        with open(normalize.SPEC_PATH, encoding="utf-8") as f:
            spec = json.load(f)
        self.assertEqual(spec, normalize.SPEC)
        self.assertEqual(len(spec["aliases"]), 17)
        self.assertEqual(spec["steps"][-1]["op"], "split_ws")

    def test_ascii_folding_runs_before_the_word_boundary_steps(self):
        """Ordering is load-bearing: \\b means Unicode word chars in Python and ASCII in JS.
        Folding first is what makes them agree. Assert the order, not just the behaviour."""
        ops = [s["op"] for s in normalize.SPEC["steps"]]
        self.assertEqual(ops[0], "nfkd_ascii")
        self.assertLess(ops.index("nfkd_ascii"), ops.index("regex_remove"))


class SpecInterpreter(unittest.TestCase):
    def test_unknown_op_raises(self):
        original = normalize.SPEC["steps"]
        try:
            normalize.SPEC["steps"] = [{"op": "teleport"}, {"op": "split_ws"}]
            with self.assertRaises(normalize.SpecError):
                normalize.norm("x")
        finally:
            normalize.SPEC["steps"] = original

    def test_split_ws_must_be_last(self):
        original = normalize.SPEC["steps"]
        try:
            normalize.SPEC["steps"] = [{"op": "split_ws"}, {"op": "lower"}]
            with self.assertRaises(normalize.SpecError):
                normalize.norm("x")
        finally:
            normalize.SPEC["steps"] = original

    def test_missing_split_ws_raises(self):
        original = normalize.SPEC["steps"]
        try:
            normalize.SPEC["steps"] = [{"op": "lower"}]
            with self.assertRaises(normalize.SpecError):
                normalize.norm("x")
        finally:
            normalize.SPEC["steps"] = original


class OneCopyOfTheRules(unittest.TestCase):
    """KTD-3's actual invariant: nothing outside normalize.py may hold a private normalizer.

    This is the test that keeps U3 done. Everything else here proves the extraction was correct
    on the day it happened; this proves nobody re-forked it in October.
    """

    def test_engine_imports_the_normalizer_and_defines_neither_function(self):
        with open(ENGINE_PATH, encoding="utf-8") as f:
            src = f.read()
        self.assertIn("from normalize import norm, tokens", src)
        self.assertNotIn("def norm(", src)
        self.assertNotIn("def tokens(", src)
        self.assertNotIn("ALIASES =", src)

    def test_no_second_copy_of_the_cleaning_regexes_anywhere_in_the_repo(self):
        needles = [r"[^a-z ]", r"\b(jr|sr|ii|iii|iv|v)\b"]
        offenders = []
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames
                           if d not in {".git", "__pycache__", "temp", "archive", "node_modules"}]
            for fn in filenames:
                if not fn.endswith((".py", ".js", ".html")):
                    continue
                path = os.path.join(dirpath, fn)
                if os.path.abspath(path) in (os.path.abspath(normalize.__file__),
                                             os.path.abspath(__file__)):
                    continue
                try:
                    with open(path, encoding="utf-8") as f:
                        text = f.read()
                except (UnicodeDecodeError, OSError):
                    continue
                for needle in needles:
                    if needle in text:
                        offenders.append(f"{os.path.relpath(path, ROOT)} contains {needle!r}")
        self.assertEqual(offenders, [],
                         "a second copy of the cleaning rules exists:\n" + "\n".join(offenders))


if __name__ == "__main__":
    unittest.main()
