# DD1 Lab Kit — Prompt & Context Engineering
**PwC Full-Stack AI track · Wed 30 Sep 2026 · 08:00–11:00**

## Setup (2 minutes, no install required)

```bash
node --version          # need 20 or newer
npm test                # should print 5 passing tests
```

**There are no dependencies.** Validation uses a small built-in JSON-Schema validator
(`scripts/validate.js`) and tests use Node's built-in runner, so nothing blocks on a
corporate proxy. Production would use `ajv` — same API shape, see slide 17.

## Running a ticket

```bash
node scripts/run-prompt.js --template account-freeze-request --input tickets/sample-3.json
```

| Flag | Effect |
|---|---|
| *(none)* | Uses `ANTHROPIC_API_KEY` if set; **falls back to mock automatically if not** |
| `--mock` | Force canned responses — no API key needed |
| `--ungrounded` | Drop the policy + account snapshot (the Step 5 comparison) |
| `--show-prompt` | Print the fully resolved prompt before sending |
| `--force-repair` | Make the first attempt fail validation (the Step 6 demo) |

**You can complete every step of this lab without an API key.** With a key, steps 3–8 hit
the real Messages API using tool-use to enforce the schema.

## Layout

```
tickets/           3 anonymised BFSI tickets + the adversarial T-9981
legacy/            the five ad-hoc output shapes  (Step 1 — the mess)
grounding/         KB-114 policy excerpt + account snapshot  (Step 5)
prompts/account-freeze-request/
  schema.json      the canonical contract
  template.md      the system+task prompt   ← Step 3
  meta.json        owner, versions, changelog  (Step 7)
  fixtures/        happy · edge · adversarial
  prompt.test.js   the fixture suite
scripts/           run-prompt.js · validate.js · test.js · mock-responses.json
```
