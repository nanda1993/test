#!/usr/bin/env node
// DD1 lab runner.
//   node scripts/run-prompt.js --template account-freeze-request --input tickets/sample-3.json
// Flags: --mock (no API key needed) --ungrounded (Step 5 comparison)
//        --show-prompt (print the resolved prompt) --force-repair (Step 6 demo)
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateAgainst, formatErrors } from './validate.js';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i > -1 ? argv[i + 1] : d; };
const has = n => argv.includes(`--${n}`);

const templateName = arg('template', 'account-freeze-request');
const inputPath    = arg('input', 'tickets/sample-1.json');
const grounded     = !has('ungrounded');
const MAX_REPAIRS  = 1;                    // hard limit — see slide 8

const dir      = `prompts/${templateName}`;
const schema   = JSON.parse(readFileSync(`${dir}/schema.json`, 'utf8'));
const template = readFileSync(`${dir}/template.md`, 'utf8');
const ticket   = JSON.parse(readFileSync(inputPath, 'utf8'));

function buildPrompt() {
  const kb   = grounded ? readFileSync('grounding/kb-freeze-policy.md', 'utf8')
                        : '(no policy provided)';
  const snap = grounded ? readFileSync('grounding/account-snapshot.json', 'utf8')
                        : '(no account snapshot provided)';
  return template
    .replace('{{KB_EXCERPT}}', kb)
    .replace('{{ACCOUNT_SNAPSHOT}}', snap)
    .replace('{{TICKET_JSON}}', JSON.stringify(ticket, null, 2));
}

async function callClaude(prompt, repairNote) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || has('mock')) {                                    // ── mock path
    const m = JSON.parse(readFileSync('scripts/mock-responses.json', 'utf8'));
    if (has('force-repair') && !repairNote) return m._malformed_first_attempt;
    const entry = m[ticket.ticket_id];
    if (!entry) throw new Error(`no mock response for ${ticket.ticket_id}`);
    return grounded ? entry.grounded : entry.ungrounded;
  }
  const messages = [{ role: 'user', content: prompt }];         // ── real path
  if (repairNote) messages.push(
    { role: 'assistant', content: 'I returned a decision record.' },
    { role: 'user', content: `Your previous output failed schema validation:\n${repairNote}\n`
                           + `Return a corrected call to submit_freeze_decision. Change only what is invalid.` });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key,
               'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5', max_tokens: 1024, messages,
      tools: [{ name: 'submit_freeze_decision',
                description: 'Submit the structured freeze decision for this ticket.',
                input_schema: schema }],
      tool_choice: { type: 'tool', name: 'submit_freeze_decision' } }) });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const block = body.content.find(c => c.type === 'tool_use');
  if (!block) throw new Error('model returned no tool_use block');
  return block.input;
}

export async function run() {
  const prompt = buildPrompt();
  if (has('show-prompt')) { console.log(prompt); console.log('─'.repeat(70)); }

  let repairNote = null;
  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    const out = await callClaude(prompt, repairNote);
    if (typeof out !== 'object' || out === null) {
      repairNote = `Output was not an object. Received: ${JSON.stringify(out)}`;
      console.log(`❌ attempt ${attempt + 1}: not an object — ${JSON.stringify(out)}`);
      continue;
    }
    const { valid, errors } = validateAgainst(schema, out);
    if (valid) {
      console.log(`✅ valid on attempt ${attempt + 1}${grounded ? '' : '  (UNGROUNDED)'}`);
      console.log(JSON.stringify(out, null, 2));
      return { status: 'accepted', attempts: attempt + 1, output: out };
    }
    console.log(`❌ attempt ${attempt + 1} failed validation:\n${formatErrors(errors)}`);
    repairNote = formatErrors(errors);
  }
  console.log(`\n🚦 repair limit (${MAX_REPAIRS}) reached → routing ${ticket.ticket_id} to HUMAN REVIEW`);
  return { status: 'human_review', attempts: MAX_REPAIRS + 1, output: null };
}

// NB: compare real paths — import.meta.url percent-encodes spaces, so the
// usual `file://${process.argv[1]}` check silently fails on a path like
// "/1 FullStack/_Delivery/...". That is why this runs nothing when you expect output.
const isMain = process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
}
