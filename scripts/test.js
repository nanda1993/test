#!/usr/bin/env node
// Test entry point.
//   npm test                                  → every *.test.js in prompts/
//   npm test -- prompts/account-freeze-request → just that prompt's tests
//
// Why this wrapper exists: from Node 22 onward, `node --test <dir>` tries to LOAD
// the directory as a module instead of discovering tests inside it, so the command
// printed on the slide fails with MODULE_NOT_FOUND. This normalises a directory
// argument into the file list Node expects.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const walk = dir => readdirSync(dir).flatMap(entry => {
  const p = join(dir, entry);
  return statSync(p).isDirectory() ? walk(p) : (p.endsWith('.test.js') ? [p] : []);
});

const targets = process.argv.slice(2).filter(a => !a.startsWith('--'));
const roots   = targets.length ? targets : ['prompts'];
const files   = roots.flatMap(r => {
  if (!existsSync(r)) { console.error(`no such path: ${r}`); process.exit(1); }
  return statSync(r).isDirectory() ? walk(r) : [r];
});

if (!files.length) { console.error('no *.test.js files found'); process.exit(1); }
process.exit(spawnSync('node', ['--test', ...files], { stdio: 'inherit' }).status ?? 1);
