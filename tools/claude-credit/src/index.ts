/** Programmatic entry point. CLI lives in src/cli.ts. */
export * from './taxonomy.js';
export * from './report.js';
export * from './multi-report.js';
export * from './classifier.js';
export * from './counter.js';
export * from './git-stats.js';
export * from './proxies.js';
export * from './walker.js';
export * from './config.js';
export { logGeneration, readGenerationLog } from './log-generation.js';
export type { GenerationLogEntry, GenerationKind, GenerationStatus, LogGenerationOptions } from './log-generation.js';
