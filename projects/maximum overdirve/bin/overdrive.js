#!/usr/bin/env node

/**
 * overdrive CLI — Autonomous Software Development Lifecycle
 * 
 * The pipeline: plan → strengthen → code → verify → IV&V → evidence → RTM → evidence package
 * 
 * Sits OUTSIDE Claude Code. Calls `claude` as a subprocess.
 * Each step = fresh 200K context window. No context rot. Ever.
 * Strengthening is mandatory. IV&V is independent. RTM traces everything.
 */

const { Command } = require('commander');
const chalk = require('chalk');
const Orchestrator = require('../src/orchestrator');
const { printBanner } = require('../src/banner');

const program = new Command();

program
  .name('overdrive')
  .description('Autonomous Software Development Lifecycle — spec to shipped product with evidence')
  .version('0.3.0');

// ── INIT ──────────────────────────────────────────────────────
program
  .command('init <spec-file>')
  .description('Initialize a new project from a spec file')
  .option('-d, --dir <dir>', 'Project root directory', process.cwd())
  .action(async (specFile, options) => {
    try {
      const orchestrator = new Orchestrator(options.dir);
      await orchestrator.init(specFile);
    } catch (err) {
      console.error(chalk.red(`\n  ✗ Init failed: ${err.message}\n`));
      if (process.env.ASDLC_VERBOSE === '1') console.error(err.stack);
      process.exit(1);
    }
  });

// ── RUN ───────────────────────────────────────────────────────
program
  .command('run')
  .description('Start or resume autonomous execution')
  .option('-d, --dir <dir>', 'Project root directory', process.cwd())
  .option('--upto <step>', 'Pause after completing this step (plan, strengthen, gate-check, code, verify, ivv, evidence, rtm, evidence-package)')
  .action(async (options) => {
    try {
      if (options.upto) {
        const valid = ['plan', 'strengthen', 'gate-check', 'code', 'verify', 'ivv', 'evidence', 'rtm', 'evidence-package'];
        if (!valid.includes(options.upto)) {
          console.error(chalk.red(`\n  ✗ Invalid --upto value: ${options.upto}. Valid: ${valid.join(', ')}\n`));
          process.exit(1);
        }
      }
      const orchestrator = new Orchestrator(options.dir);
      await orchestrator.run({ upto: options.upto });
    } catch (err) {
      console.error(chalk.red(`\n  ✗ Run failed: ${err.message}\n`));
      if (process.env.ASDLC_VERBOSE === '1') console.error(err.stack);
      process.exit(1);
    }
  });

// ── STATUS ────────────────────────────────────────────────────
program
  .command('status')
  .description('Check current project status (read-only)')
  .option('-d, --dir <dir>', 'Project root directory', process.cwd())
  .action((options) => {
    try {
      const orchestrator = new Orchestrator(options.dir);
      orchestrator.status();
    } catch (err) {
      console.error(chalk.red(`\n  ✗ Status failed: ${err.message}\n`));
      process.exit(1);
    }
  });

// ── RESUME ────────────────────────────────────────────────────
program
  .command('resume')
  .description('Resume after resolving human gates')
  .option('-d, --dir <dir>', 'Project root directory', process.cwd())
  .option('--upto <step>', 'Pause after completing this step (plan, strengthen, gate-check, code, verify, ivv, evidence, rtm, evidence-package)')
  .action(async (options) => {
    try {
      if (options.upto) {
        const valid = ['plan', 'strengthen', 'gate-check', 'code', 'verify', 'ivv', 'evidence', 'rtm', 'evidence-package'];
        if (!valid.includes(options.upto)) {
          console.error(chalk.red(`\n  ✗ Invalid --upto value: ${options.upto}. Valid: ${valid.join(', ')}\n`));
          process.exit(1);
        }
      }
      const orchestrator = new Orchestrator(options.dir);
      await orchestrator.resume({ upto: options.upto });
    } catch (err) {
      console.error(chalk.red(`\n  ✗ Resume failed: ${err.message}\n`));
      if (process.env.ASDLC_VERBOSE === '1') console.error(err.stack);
      process.exit(1);
    }
  });

// ── STEP (escape hatch) ──────────────────────────────────────
program
  .command('step <phase> <step-name>')
  .description('Run a single step manually (escape hatch). Steps: plan, strengthen, code, verify, ivv, evidence, rtm, extract-requirements')
  .option('-d, --dir <dir>', 'Project root directory', process.cwd())
  .action(async (phase, stepName, options) => {
    const phaseNumber = parseInt(phase);
    if (isNaN(phaseNumber)) {
      console.error(chalk.red(`\n  ✗ Phase must be a number, got: ${phase}\n`));
      process.exit(1);
    }

    const validSteps = ['plan', 'strengthen', 'code', 'verify', 'ivv', 'evidence', 'rtm', 'extract-requirements'];
    if (!validSteps.includes(stepName)) {
      console.error(chalk.red(`\n  ✗ Invalid step: ${stepName}. Valid: ${validSteps.join(', ')}\n`));
      process.exit(1);
    }

    try {
      const orchestrator = new Orchestrator(options.dir);
      await orchestrator.step(phaseNumber, stepName);
    } catch (err) {
      console.error(chalk.red(`\n  ✗ Step failed: ${err.message}\n`));
      if (process.env.ASDLC_VERBOSE === '1') console.error(err.stack);
      process.exit(1);
    }
  });

// ── Banner ────────────────────────────────────────────────────
if (process.argv.length <= 2) {
  printBanner();
  program.help();
}

program.parse(process.argv);
