"""Measure the lag between a Sleeper pick landing and the PLAIN /picks URL showing it.

    python scripts/probe_picks_cache.py <draft_id> [seconds]      # run against a LIVE draft

This is the instrument behind [insight 020](../docs/insights/020-the-cdn-served-a-contiguous-prefix-and-every-gate-passed.md)
and it is committed so that finding can be re-measured rather than taken on trust. Its numbers
justified adding a cache-buster to `merge_picks.fetch()`, which is in the draft-day critical
path, so "believe the commit message" is not good enough.

Two requests per tick: one with a unique nonce (ground truth, always `cf-cache-status: MISS`)
and one plain (exactly what `merge_picks.py` used to send). The gap between them is the
exposure window, and it is a property of the CDN rather than of how fast the room drafts.

Measured 2026-08-09 on a live 8-team mock: the plain URL was behind on **76 of 77 observations**,
by up to **16 picks** (mean 8.1), and served a cached `pre_draft` body of ZERO picks for 30+
seconds after the draft began.

⚠️ Two traps if you re-run this. **The TTL depends on draft status** (`s-maxage` 30 pre_draft,
15 drafting, 86400 complete) so a draft that COMPLETES mid-run will change the policy underneath
you and confound the reading -- that happened on the first attempt. And **the summary's
"catch-up lag" figure is misleading**: the plain URL only ever emits a handful of distinct
values, so that metric times the sawtooth edges rather than the error. Read `picks behind`.
"""
import json, sys, time, urllib.request

DRAFT = sys.argv[1]
DEADLINE = float(sys.argv[2]) if len(sys.argv) > 2 else 420.0
BASE = f"https://api.sleeper.app/v1/draft/{DRAFT}/picks"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "family-feud-probe/1.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode()), dict(r.headers)


t0 = time.time()
nonce = 0
truth_first = {}     # pick_count -> t when the nonce URL first reported it
plain_first = {}     # pick_count -> t when the plain URL first reported it
samples = []
last_truth = last_plain = -1

while time.time() - t0 < DEADLINE:
    now = time.time() - t0
    nonce += 1
    try:
        tb, th = get(f"{BASE}?probe={int(t0*1000)}-{nonce}")
        pb, ph = get(BASE)
    except Exception as e:                      # a transient failure must not kill the probe
        print(f"[{now:6.1f}] fetch error: {e}", flush=True)
        time.sleep(1.5)
        continue

    tc, pc = len(tb), len(pb)
    truth_first.setdefault(tc, now)
    plain_first.setdefault(pc, now)
    if tc != last_truth or pc != last_plain:
        print("[%6.1f] truth=%-4d plain=%-4d behind=%-3d  cf=%-8s age=%-5s ttl=%s"
              % (now, tc, pc, tc - pc, ph.get("cf-cache-status"), ph.get("Age"),
                 (ph.get("cache-control") or "").replace("public, ", "")), flush=True)
        last_truth, last_plain = tc, pc
    samples.append((now, tc, pc))

    if tc >= 120 and pc >= 120:
        print("[%6.1f] both reached 120 -- done" % now, flush=True)
        break
    time.sleep(1.5)

# --- lag per pick count: when did plain catch up to what truth already knew? ---
lags = []
for count, t_truth in sorted(truth_first.items()):
    t_plain = plain_first.get(count)
    if t_plain is not None and t_plain >= t_truth:
        lags.append((count, t_plain - t_truth))

behind = [t - p for _, t, p in samples if t != p]
print()
print("==== SUMMARY ====")
print("samples            :", len(samples))
print("ticks plain behind :", len(behind), "of", len(samples),
      "(%.0f%%)" % (100.0 * len(behind) / max(1, len(samples))))
if behind:
    print("picks behind       : max %d, mean %.2f" % (max(behind), sum(behind) / len(behind)))
if lags:
    vals = [l for _, l in lags]
    print("catch-up lag (s)   : max %.1f, mean %.1f, n=%d" % (max(vals), sum(vals) / len(vals), len(vals)))
    print("worst 8            :", ", ".join("%d:%.1fs" % (c, l)
          for c, l in sorted(lags, key=lambda x: -x[1])[:8]))
