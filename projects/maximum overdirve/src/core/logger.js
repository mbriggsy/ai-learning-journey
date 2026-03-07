/**
 * logger.js — Append-only execution log
 * 
 * Rules from the spec:
 * - Log is append-only. Never edit or truncate.
 * - Write after every step, not after every phase.
 * - Human-readable, git-trackable.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Logger {
  constructor(planningDir) {
    this.planningDir = planningDir;
    this.logFile = path.join(planningDir, 'execution-log.md');
    this.verbose = process.env.ASDLC_VERBOSE === '1';
  }

  /**
   * Initialize the log file if it doesn't exist
   */
  init() {
    if (!fs.existsSync(this.logFile)) {
      const header = [
        '# Execution Log',
        '',
        `*Started: ${new Date().toISOString()}*`,
        '',
        '---',
        '',
      ].join('\n');
      fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
      fs.writeFileSync(this.logFile, header, 'utf8');
    }
  }

  /**
   * Append a log entry — never overwrites, never truncates
   */
  append(entry) {
    const timestamp = new Date().toISOString();
    const { action, phase, detail, level = 'info' } = entry;

    // Build the log line
    const parts = [`- **${timestamp}**`];
    parts.push(`\`${action}\``);
    if (phase != null) parts.push(`Phase ${phase}`);
    if (detail) parts.push(`— ${detail}`);

    const logLine = parts.join(' | ') + '\n';

    // Append to file (crash-safe — atomic write to end of file)
    fs.appendFileSync(this.logFile, logLine, 'utf8');

    // Console output
    this._console(level, action, phase, detail);

    return { timestamp, action, phase, detail };
  }

  /**
   * Log a step start
   */
  stepStart(action, phase, detail) {
    return this.append({ action: `${action}:start`, phase, detail, level: 'info' });
  }

  /**
   * Log a step completion
   */
  stepDone(action, phase, detail) {
    return this.append({ action: `${action}:done`, phase, detail, level: 'success' });
  }

  /**
   * Log an error
   */
  error(action, phase, detail) {
    return this.append({ action: `${action}:error`, phase, detail, level: 'error' });
  }

  /**
   * Log a gate event
   */
  gate(gateId, phase, detail) {
    return this.append({ action: `gate:${gateId}`, phase, detail, level: 'warn' });
  }

  /**
   * Log a skip-ahead decision
   */
  skipAhead(fromPhase, toPhase, rationale) {
    return this.append({
      action: 'skip-ahead',
      phase: toPhase,
      detail: `Skipped from Phase ${fromPhase} — ${rationale}`,
      level: 'info',
    });
  }

  /**
   * Log token usage / cost tracking
   */
  tokens(phase, step, inputTokens, outputTokens) {
    const detail = `tokens: ${inputTokens} in / ${outputTokens} out`;
    return this.append({ action: `cost:${step}`, phase, detail, level: 'info' });
  }

  /**
   * Console output with colors
   */
  _console(level, action, phase, detail) {
    const phaseStr = phase != null ? ` [Phase ${phase}]` : '';
    const msg = `${action}${phaseStr}${detail ? ' — ' + detail : ''}`;

    switch (level) {
      case 'success':
        console.log(chalk.green('  ✓ ') + msg);
        break;
      case 'error':
        console.error(chalk.red('  ✗ ') + msg);
        break;
      case 'warn':
        console.log(chalk.yellow('  ⚠ ') + msg);
        break;
      default:
        if (this.verbose) {
          console.log(chalk.gray('  · ') + msg);
        }
        break;
    }
  }
}

module.exports = Logger;
