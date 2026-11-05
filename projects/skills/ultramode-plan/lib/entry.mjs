// The entry check shared by every command-line module, in lib/ and bench/ alike (KTD1 of
// docs/plans/hybrid-plan-step-plan.md). It lives in lib/ because lib/ is runtime: KTD16 copies
// SKILL.md, lib/ and workflows/ into an arm's copy and never bench/, so a lib command may not
// import from bench/.

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// True when the module at `importMetaUrl` is the script node was asked to run, compared by
// real path. The brief bench's commands ran as silent no-ops through the ~/.claude/skills
// junction until ee67c08a, because a plain string compare saw two different paths.
export function isMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]).toLowerCase() === realpathSync(fileURLToPath(importMetaUrl)).toLowerCase();
  } catch {
    return false;
  }
}

// Prints a usage line and exits non-zero: a command given no arguments never does nothing quietly.
export function usage(line) {
  console.error(`usage: ${line}`);
  process.exit(2);
}
