import path from 'node:path';
import process from 'node:process';
import kleur from 'kleur';
import { buildProjectReport } from './report.js';
import { buildMultiProjectReport } from './multi-report.js';
import {
  renderMultiProjectMarkdown,
  renderProjectMarkdown,
} from './format/markdown.js';
import {
  renderMultiProjectTerminal,
  renderProjectTerminal,
} from './format/terminal.js';

interface ParsedArgs {
  positional: string[];
  flags: {
    all: boolean;
    json: boolean;
    markdown: boolean;
    includeIgnored: boolean;
    help: boolean;
  };
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = {
    all: false,
    json: false,
    markdown: false,
    includeIgnored: false,
    help: false,
  };
  for (const arg of argv) {
    switch (arg) {
      case '--all':
        flags.all = true;
        break;
      case '--json':
        flags.json = true;
        break;
      case '--markdown':
      case '--md':
        flags.markdown = true;
        break;
      case '--include-ignored':
        flags.includeIgnored = true;
        break;
      case '--help':
      case '-h':
        flags.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          process.stderr.write(kleur.yellow(`Warning: unknown flag "${arg}" ignored\n`));
        } else {
          positional.push(arg);
        }
    }
  }
  return { positional, flags };
}

function printHelp(): void {
  const out = `
${kleur.bold('project-metrics')} — tally every byte of authored / pipeline-generated work in a project

${kleur.bold('Usage')}
  project-metrics [path]              Scan a single project (defaults to cwd)
  project-metrics --all               Scan all projects in ~/.project-metrics-projects.yaml

${kleur.bold('Flags')}
  --json                Emit machine-readable JSON
  --markdown, --md      Emit a Markdown report (ideal for slides / video stat sheets)
  --include-ignored     Include files matching .gitignore (skipped by default)
  -h, --help            Show this help

${kleur.bold('Per-project config (optional)')}
  Drop a ${kleur.cyan('project-metrics.config.yaml')} (or .json / .mjs / .js) at the project root to
  add custom classification rules, exclude additional dirs, or declare generation-log
  locations for v2.

${kleur.bold('Multi-project config')}
  ${kleur.cyan('~/.project-metrics-projects.yaml')} — auto-created on first ${kleur.cyan('--all')} run.

${kleur.bold('Examples')}
  project-metrics                                # scan current dir
  project-metrics ~/code/burned                  # scan a specific project
  project-metrics --all                          # all projects, terminal output
  project-metrics --all --markdown > report.md   # markdown for a slide deck
  project-metrics ~/code/burned --json | jq .    # JSON for scripting
`;
  process.stdout.write(out);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.help) {
    printHelp();
    return;
  }

  try {
    if (args.flags.all) {
      const { report, configCreated, configPath, orphanSlugs } = await buildMultiProjectReport({
        includeIgnored: args.flags.includeIgnored,
      });
      if (configCreated && configPath) {
        process.stderr.write(
          kleur.cyan(`Created ${configPath} — edit it to control which projects --all scans.\n`),
        );
      }
      if (orphanSlugs.length > 0) {
        process.stderr.write(
          kleur.yellow(
            `Note: ${orphanSlugs.length} session slug${orphanSlugs.length === 1 ? '' : 's'} in ` +
              `~/.claude/projects matched no configured project (their tokens are NOT counted). ` +
              `Add the project to your config to include them.\n`,
          ),
        );
      }
      if (args.flags.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      } else if (args.flags.markdown) {
        process.stdout.write(renderMultiProjectMarkdown(report));
      } else {
        process.stdout.write(renderMultiProjectTerminal(report));
      }
      return;
    }

    const target = args.positional[0] ?? process.cwd();
    const rootDir = path.resolve(target);
    const report = await buildProjectReport({
      rootDir,
      includeIgnored: args.flags.includeIgnored,
    });

    if (args.flags.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else if (args.flags.markdown) {
      process.stdout.write(renderProjectMarkdown(report));
    } else {
      process.stdout.write(renderProjectTerminal(report));
    }
  } catch (err) {
    process.stderr.write(kleur.red(`project-metrics failed: ${(err as Error).message}\n`));
    if (process.env.DEBUG) {
      process.stderr.write((err as Error).stack + '\n');
    }
    process.exit(1);
  }
}

void main();
