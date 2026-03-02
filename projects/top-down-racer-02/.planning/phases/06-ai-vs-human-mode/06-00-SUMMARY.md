---
phase: 06-ai-vs-human-mode
plan: 00
status: complete
date: "2026-03-02"
---

## Objective

Create the Python ONNX export script that converts a trained SB3 PPO model to ONNX format and dumps VecNormalize stats to JSON, enabling browser-side AI inference in Phase 6.

## Tasks Completed

| Task | Status | Files |
|------|--------|-------|
| Task 1: Write ONNX export script | PASSED | `python/training/export_onnx.py` |
| Task 2: Update requirements.txt | PASSED | `python/requirements.txt` |
| Task 3: Update .gitignore | PASSED | `.gitignore` |

## Key Files

| File | Action | Purpose |
|------|--------|---------|
| `python/training/export_onnx.py` | Created | One-time ONNX model export script with verification |
| `python/requirements.txt` | Modified | Added onnx>=1.15.0 and onnxruntime>=1.17.0 |
| `.gitignore` | Modified | Excludes public/assets/model.onnx and vecnorm_stats.json |

## Self-Check: PASSED

- `python -m training.export_onnx --help` works without error
- `--model` is required (no default)
- `--vecnorm` is required (no default)
- `--output-dir` defaults to `public/assets/` resolved from script location (CP-13 fix)
- `obs_size` derived from `model.observation_space.shape[0]` (not hardcoded)
- `OnnxableSB3Policy.forward()` returns only actions
- `output_names=["actions"]` only (no values/log_probs)
- `dynamo=False` passed explicitly to torch.onnx.export
- `onnx_policy.eval()` called before export
- `torch.no_grad()` wraps export call
- `VecNormalize.load()` used exclusively -- no pickle.load() (CWE-502)
- pathlib used throughout (no os.path)
- Type hints on all function signatures
- `verify_onnx()` loads exported model via onnxruntime and checks output shape
- requirements.txt includes onnx and onnxruntime with version pins
- .gitignore excludes generated ONNX assets

## Deviations

- Moved `numpy` and `onnxruntime` imports from top-level to local scope inside `verify_onnx()` so that `--help` works even before the user installs the new dependencies. This is a minor structural improvement that preserves all functionality.
