import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Module mock (hoisted above imports by Vitest) ───
// NOTE: vi.mock() factory is hoisted above all imports and variable declarations.
// We must NOT reference outer-scope variables here. Instead, use vi.fn() stubs
// that we configure in beforeEach via vi.mocked().

vi.mock('onnxruntime-web', () => ({
  env: { wasm: { wasmPaths: '', numThreads: 1 } },
  InferenceSession: {
    create: vi.fn(),
  },
  Tensor: vi.fn(function (this: any, type: string, data: Float32Array, shape: number[]) {
    this.type = type;
    this.data = data;
    this.dims = shape;
  }),
}));

// ─── Mock fixtures (configured in beforeEach) ───

const mockDispose = vi.fn();
const mockRun = vi.fn();
const mockRelease = vi.fn();

const mockSession = {
  run: mockRun,
  release: mockRelease,
  inputNames: ['obs'],
  outputNames: ['actions', 'values', 'log_probs'],
};

// ─── Imports (receive mocked ort) ───

import * as ort from 'onnxruntime-web';
import { BrowserAIRunner } from '../../src/ai/browser-ai-runner';
import { OBSERVATION_SIZE } from '../../src/ai/observations';

// ─── Test helpers ───

const defaultStats = {
  obs_mean: new Array(OBSERVATION_SIZE).fill(0),
  obs_var: new Array(OBSERVATION_SIZE).fill(1),
  clip_obs: 10.0,
  epsilon: 1e-8,
};

function stubFetch(
  overrides: Partial<{
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
  }> = {},
) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(defaultStats),
      ...overrides,
    }),
  );
}

function makeRawObs(): number[] {
  return new Array(OBSERVATION_SIZE).fill(0.5);
}

// ─── Tests ───

describe('BrowserAIRunner', () => {
  let runner: BrowserAIRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    stubFetch();
    vi.mocked(ort.InferenceSession.create).mockResolvedValue(
      mockSession as unknown as ort.InferenceSession,
    );
    mockRun.mockResolvedValue({
      actions: { data: new Float32Array([0.5, 0.8, 0.0]), dispose: mockDispose },
    });
    runner = new BrowserAIRunner();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── load() ──

  it('load() creates an InferenceSession and fetches stats', async () => {
    await runner.load('/model.onnx', '/stats.json');

    expect(ort.InferenceSession.create).toHaveBeenCalledWith(
      '/model.onnx',
      expect.objectContaining({ executionProviders: ['wasm'] }),
    );
    expect(fetch).toHaveBeenCalledWith('/stats.json');
  });

  it('load() rejects when fetch response is not ok', async () => {
    stubFetch({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(runner.load('/model.onnx', '/stats.json')).rejects.toThrow(
      'Failed to load stats: 404 Not Found',
    );
  });

  it('load() rejects on invalid stats JSON shape (missing fields)', async () => {
    stubFetch({ json: () => Promise.resolve({ bad: 'data' }) });

    await expect(runner.load('/model.onnx', '/stats.json')).rejects.toThrow(
      /Invalid VecNormStats/,
    );
  });

  it('load() rejects on wrong obs_mean length', async () => {
    stubFetch({
      json: () =>
        Promise.resolve({
          obs_mean: [0, 1, 2], // wrong length
          obs_var: new Array(OBSERVATION_SIZE).fill(1),
          clip_obs: 10.0,
          epsilon: 1e-8,
        }),
    });

    await expect(runner.load('/model.onnx', '/stats.json')).rejects.toThrow(
      /Invalid VecNormStats/,
    );
  });

  it('load() remaps snake_case JSON keys to camelCase VecNormStats', async () => {
    const customStats = {
      obs_mean: new Array(OBSERVATION_SIZE).fill(2.0),
      obs_var: new Array(OBSERVATION_SIZE).fill(3.0),
      clip_obs: 5.0,
      epsilon: 1e-6,
    };
    stubFetch({ json: () => Promise.resolve(customStats) });

    await runner.load('/model.onnx', '/stats.json');

    // After loading, infer should use the mapped stats
    // We verify indirectly through a successful infer() call
    const result = await runner.infer(makeRawObs());
    expect(result).toHaveLength(3);
  });

  // ── infer() ──

  it('infer() before load() throws', async () => {
    await expect(runner.infer(makeRawObs())).rejects.toThrow(
      'BrowserAIRunner not loaded',
    );
  });

  it('infer() creates ort.Tensor with shape [1, OBSERVATION_SIZE]', async () => {
    await runner.load('/model.onnx', '/stats.json');
    await runner.infer(makeRawObs());

    expect(ort.Tensor).toHaveBeenCalledWith(
      'float32',
      expect.any(Float32Array),
      [1, OBSERVATION_SIZE],
    );
  });

  it('infer() returns [steer, throttle, brake] as a 3-tuple', async () => {
    await runner.load('/model.onnx', '/stats.json');
    const result = await runner.infer(makeRawObs());

    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(0.5, 5);
    expect(result[1]).toBeCloseTo(0.8, 5);
    expect(result[2]).toBeCloseTo(0.0, 5);
  });

  it('infer() disposes output tensors after extracting values', async () => {
    await runner.load('/model.onnx', '/stats.json');
    await runner.infer(makeRawObs());

    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('infer() clamps steer to [-1, 1] — value 2.5 clamped to 1.0', async () => {
    mockRun.mockResolvedValue({
      actions: { data: new Float32Array([2.5, 0.5, 0.0]), dispose: mockDispose },
    });

    await runner.load('/model.onnx', '/stats.json');
    const [steer] = await runner.infer(makeRawObs());

    expect(steer).toBe(1.0);
  });

  it('infer() clamps steer to [-1, 1] — value -3.0 clamped to -1.0', async () => {
    mockRun.mockResolvedValue({
      actions: { data: new Float32Array([-3.0, 0.5, 0.0]), dispose: mockDispose },
    });

    await runner.load('/model.onnx', '/stats.json');
    const [steer] = await runner.infer(makeRawObs());

    expect(steer).toBe(-1.0);
  });

  it('infer() clamps throttle to [0, 1] — value -0.5 clamped to 0.0', async () => {
    mockRun.mockResolvedValue({
      actions: { data: new Float32Array([0.0, -0.5, 0.0]), dispose: mockDispose },
    });

    await runner.load('/model.onnx', '/stats.json');
    const [, throttle] = await runner.infer(makeRawObs());

    expect(throttle).toBe(0.0);
  });

  it('infer() clamps brake to [0, 1] — value 1.5 clamped to 1.0', async () => {
    mockRun.mockResolvedValue({
      actions: { data: new Float32Array([0.0, 0.5, 1.5]), dispose: mockDispose },
    });

    await runner.load('/model.onnx', '/stats.json');
    const [, , brake] = await runner.infer(makeRawObs());

    expect(brake).toBe(1.0);
  });

  // ── dispose() ──

  it('dispose() calls session.release() and nullifies session', async () => {
    await runner.load('/model.onnx', '/stats.json');
    await runner.dispose();

    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('dispose() without load() does not throw', async () => {
    await expect(runner.dispose()).resolves.toBeUndefined();
  });

  it('infer() after dispose() throws', async () => {
    await runner.load('/model.onnx', '/stats.json');
    await runner.dispose();

    await expect(runner.infer(makeRawObs())).rejects.toThrow(
      'BrowserAIRunner not loaded',
    );
  });
});
