// This folder is public. Nothing in it may carry a real session id or a path
// under a Windows user profile.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const USER_PROFILE = new RegExp('[A-Za-z]:' + '[\\\\/]+' + 'Users' + '[\\\\/]', 'i');
const MSYS_PROFILE = new RegExp('/[a-z]/' + 'Users' + '/', 'i');

function files(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

test('no session UUIDs or user-profile paths anywhere in the skill folder', () => {
  const hits = [];
  for (const f of files(SKILL_DIR)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const [label, re] of [['uuid', UUID], ['user path', USER_PROFILE], ['user path', MSYS_PROFILE]]) {
        if (re.test(line)) hits.push(`${path.relative(SKILL_DIR, f)}:${i + 1}: ${label}`);
      }
    });
  }
  assert.deepEqual(hits, []);
});
