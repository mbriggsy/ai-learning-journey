# Duration Reconciliation — Unit 2.4 output

Generated: 2026-05-22T14:07:14.391Z
Composition fps: 30
Tolerance bands: sustained ±5%, list ±7%, payoff ±4%, scream ±20%, cold-open ±5%.
WARN = drift within 2× tolerance; FAIL = beyond 2× tolerance.

Routing: drift items → Unit 2.7 reconciliation. Some drift is expected to
resolve in Unit 2.5 (silenceremove + loudnorm) and Unit 2.6 (intra-line
[BEAT NNNms] stitching).

| Cue | Type | Expected | Actual | Drift | Tolerance | Verdict |
|-----|------|----------|--------|-------|-----------|---------|
| `s01-cue-60-janet.wav` | cold-open | 150 | 139 | -7.3% | ±5% | WARN |
| `s02-cue-219-dash.wav` | sustained | 351 | 357 | 1.7% | ±5% | OK |
| `s03-cue-570-dash.wav` | sustained | 270 | 407 | 50.7% | ±5% | FAIL |
| `s03-cue-870-dash.wav` | sustained | 180 | 362 | 101.1% | ±5% | FAIL |
| `s04-cue-1050-dash.wav` | list | 60 | 55 | -8.3% | ±7% | WARN |
| `s04-cue-1110-dash.wav` | list | 90 | 106 | 17.8% | ±7% | FAIL |
| `s04-cue-1200-dash.wav` | list | 90 | 132 | 46.7% | ±7% | FAIL |
| `s04-cue-1290-dash.wav` | list | 120 | 137 | 14.2% | ±7% | FAIL |
| `s04-cue-1410-dash.wav` | list | 150 | 152 | 1.3% | ±7% | OK |
| `s04-cue-1560-dash.wav` | list | 120 | 133 | 10.8% | ±7% | WARN |
| `s04-cue-1680-dash.wav` | list | 180 | 174 | -3.3% | ±7% | OK |
| `s04-cue-1950-dash.wav` | payoff | 60 | 63 | 5.0% | ±4% | WARN |
| `s05-cue-2280-dash.wav` | sustained | 150 | 118 | -21.3% | ±5% | FAIL |
| `s05-cue-2400-dash.wav` | scream | 50 | 72 | 44.0% | ±20% | FAIL |
| `s06-cue-2580-dash.wav` | payoff | 222 | 157 | -29.3% | ±4% | FAIL |
| `s06-cue-2814-dash.wav` | payoff | 12 | 19 | 58.3% | ±4% | FAIL |
