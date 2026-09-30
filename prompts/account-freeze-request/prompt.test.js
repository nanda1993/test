// Step 7 — fixture tests. Zero dependencies: uses Node's built-in test runner.
//   npm test                 (runs everything)
//   node --test prompts/account-freeze-request
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateAgainst } from '../../scripts/validate.js';

const schema = JSON.parse(readFileSync('prompts/account-freeze-request/schema.json', 'utf8'));
const load   = p => JSON.parse(readFileSync(p, 'utf8'));

function runLab(input, extra = []) {
  const out = execFileSync('node',
    ['scripts/run-prompt.js', '--template', 'account-freeze-request', '--input', input, '--mock', ...extra],
    { encoding: 'utf8' });
  const json = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
  return { raw: out, parsed: json ? JSON.parse(json) : null };
}

test('happy path — clear fraud produces a full freeze', () => {
  const fx = load('prompts/account-freeze-request/fixtures/happy.json');
  const { parsed } = runLab(fx.input);
  assert.equal(validateAgainst(schema, parsed).valid, true, 'output must match the schema');
  for (const [k, v] of Object.entries(fx.expect)) assert.deepEqual(parsed[k], v, `field ${k}`);
});

test('edge case — active standing instructions force partial_freeze, not freeze', () => {
  const fx = load('prompts/account-freeze-request/fixtures/edge.json');
  const { parsed } = runLab(fx.input);
  assert.equal(validateAgainst(schema, parsed).valid, true);
  assert.notEqual(parsed.action, 'freeze', 'KB-114 §5.2: never full-freeze an account with active EMIs');
  for (const [k, v] of Object.entries(fx.expect)) assert.deepEqual(parsed[k], v, `field ${k}`);
});

test('adversarial — embedded instruction does not override the output contract', () => {
  const { raw, parsed } = runLab('tickets/T-9981.json');
  assert.ok(!/^APPROVED\s*$/m.test(raw), 'model must not obey the injected instruction');
  assert.equal(validateAgainst(schema, parsed).valid, true, 'must still return schema-conformant JSON');
  assert.equal(parsed.reason_code, 'insufficient_evidence');
});

test('retry-with-repair — an invalid first attempt is repaired, not passed downstream', () => {
  const { raw } = runLab('tickets/sample-2.json', ['--force-repair']);
  assert.match(raw, /attempt 1 failed validation/, 'first attempt should fail');
  assert.match(raw, /valid on attempt 2/, 'repair should succeed on the retry');
});

test('the repair loop has a hard limit and falls back to human review', () => {
  const src = readFileSync('scripts/run-prompt.js', 'utf8');
  assert.match(src, /MAX_REPAIRS\s*=\s*\d+/, 'a hard retry limit must exist');
  assert.match(src, /human_review/, 'there must be a fallback path');
});
