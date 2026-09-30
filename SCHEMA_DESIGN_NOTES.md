# Account Freeze Request Schema Design Notes

## Field Mapping from Five Samples

### Required Fields (All Normalized from Existing Samples)

| Field | dev_a | dev_b | dev_c | dev_d | dev_e | Normalization |
|-------|-------|-------|-------|-------|-------|---------------|
| **ticket_id** | `ticketId` | `ticket.id` | `id` | `ticket_id` | `ticketRef` | Unified field name; all contained "T-4471" |
| **action** | `decision: "FREEZE"` | `outcome.action: "freeze_all"` | `result: "frozen"` | `action_taken: true` + `freeze_type: "full"` | `recommendation.type: "FREEZE"` | Collapsed to enum: all meant "full account freeze" |
| **affected_accounts** | `accounts: [...]` (array) | `affected: "..."` (CSV string) | `account_list: [{number:...}]` (objects) | (implied in summary) | `scope: "ALL_LINKED"` (scope) | Always normalized to array of account strings |
| **reason_code** | `why: "..."` (narrative) | `reason: "fraud"` (string) | `reason_code: 3` (numeric) | (implied in summary) | `reasonCode: "FRAUD_SUSPECTED"` (string enum) | Mapped to categorical enum; dev_c's code 3 → `fraud_suspected` |
| **evidence_summary** | `why: "customer reports unauthorised transactions"` | `reason: "fraud"` | `notes: "Three disputed txns totalling 121700 INR. Card still in possession."` | `summary: "Unauthorised transactions reported; account frozen pending fraud desk review."` | `evidence: ["3 disputed transactions", "beneficiary not recognised", "card not lost"]` | Consolidated into single string field; narrative/list formats normalized to prose |

---

## Fields Invented (Not in Any Sample)

### **None — All required fields are present in the five samples, just in different shapes and locations.**

Every required field in the schema is a **normalization or consolidation** of data that appears in at least one sample:

- **ticket_id** — Present as-is in all 5 (just different property names)
- **action** — Present as some form of decision state in all 5 (decision, outcome.action, result, action_taken, recommendation)
- **affected_accounts** — Present in all 5, just in different formats (arrays, CSV strings, nested objects)
- **reason_code** — Present in all 5 (both as strings and numeric codes, or extractable from narratives)
- **evidence_summary** — Present in all 5 (as `why`, `reason`, `notes`, `summary`, or `evidence` arrays)

---

## Design Choices & Tradeoffs

### 1. **evidence_summary as a single string field**
   - **Why:** Most downstream routing/alerting systems need a human-readable reason at a glance. The 300-char limit forces clarity.
   - **Cost:** Loss of detail vs. dev_e's array format (`["3 disputed transactions", "beneficiary not recognised", ...]`). Mitigation: optional `notes` field for overflow.

### 2. **reason_code as enum (not numeric)**
   - **Why:** Symbolic codes are self-documenting and harder to misinterpret. Dev_c's numeric code 3 has no context.
   - **Cost:** Requires mapping for any legacy numeric systems. Schema maps conceptually; consumption code maps numerically.

### 3. **action as enum, not boolean or nested**
   - **Why:** Dev_d's `action_taken: true` loses the *type* of action (partial vs. full). Dev_b's nested `outcome: {action, confidence}` is hard to route on. A flat enum is clearer.
   - **Cost:** Cannot express uncertainty (dev_b had 0.91 confidence). Mitigation: optional `confidence` field.

### 4. **affected_accounts as array of strings (not objects)**
   - **Why:** Simplest for downstream filtering/routing. Dev_c's `[{number: ...}]` adds a layer that adds no value for typical operations.
   - **Cost:** If account metadata becomes needed (e.g., account type, owner), this design doesn't scale. Mitigation: add optional `account_metadata` object if required later.

### 5. **Optional fields (confidence, status, notes)**
   - **Why:** Some samples carry auxiliary data (dev_b's confidence, dev_e's status, dev_c's detailed notes) that is valuable but not always present.
   - **Cost:** Consumers must handle optional fields. Mitigation: Clear defaults/fallbacks in documentation.

---

## Mapping Examples

### Dev A → Normalized
```json
{
  "ticketId": "T-4471",
  "decision": "FREEZE",
  "accounts": ["AC-5510029", "AC-5510030"],
  "why": "customer reports unauthorised transactions"
}
```
↓
```json
{
  "ticket_id": "T-4471",
  "action": "freeze",
  "affected_accounts": ["AC-5510029", "AC-5510030"],
  "reason_code": "fraud_suspected",
  "evidence_summary": "Customer reports unauthorised transactions"
}
```

### Dev B → Normalized
```json
{
  "ticket": { "id": "T-4471" },
  "outcome": { "action": "freeze_all", "confidence": 0.91 },
  "affected": "AC-5510029,AC-5510030",
  "reason": "fraud"
}
```
↓
```json
{
  "ticket_id": "T-4471",
  "action": "freeze",
  "affected_accounts": ["AC-5510029", "AC-5510030"],
  "reason_code": "fraud_suspected",
  "evidence_summary": "Fraud detected",
  "confidence": 0.91
}
```

### Dev C → Normalized
```json
{
  "id": "T-4471",
  "result": "frozen",
  "account_list": [{ "number": "AC-5510029" }, { "number": "AC-5510030" }],
  "reason_code": 3,
  "notes": "Three disputed txns totalling 121700 INR. Card still in possession."
}
```
↓
```json
{
  "ticket_id": "T-4471",
  "action": "freeze",
  "affected_accounts": ["AC-5510029", "AC-5510030"],
  "reason_code": "fraud_suspected",
  "evidence_summary": "Three disputed transactions totalling 121700 INR. Card still in possession.",
  "notes": "Card still in possession — may assist recovery investigation."
}
```

---

## Validation Notes

- **ticket_id** follows pattern `T-\d+`
- **affected_accounts** items follow pattern `AC-\d+`
- **evidence_summary** capped at 300 chars to force brevity
- **confidence** (when present) is 0–1
- **action** values are mutually exclusive; exactly one must apply
- **reason_code** enum is fixed; new codes require schema version bump
