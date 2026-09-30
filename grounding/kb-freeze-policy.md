# KB-114 · Account Freeze Policy (excerpt)
**Version 4.2 · effective 2026-07-01 · supersedes 4.1**

## 3. Reason codes
- **fraud_suspected** — customer disputes one or more transactions they did not authorise,
  OR the fraud desk has flagged the account. Requires at least one disputed transaction reference.
- **customer_request** — customer initiates a restriction for their own reasons (travel,
  dormancy, dispute with a joint holder). **No fraud indicator present.**
- **court_order** — freeze compelled by a legal instrument. Requires an order reference number.
- **insufficient_evidence** — the request cannot be substantiated from the ticket and no
  follow-up response has been received within 24 hours.

## 4. Action scope
- **freeze** — all linked accounts blocked for debit and credit.
- **partial_freeze** — named channels or account subsets restricted while the account remains
  operational. **Use this where standing instructions or EMIs must continue.**
- **deny** — no restriction applied; ticket closed with a reason.

## 5. Escalation
> **5.1** Where evidence is ambiguous, agents must NOT infer intent. Record
> `insufficient_evidence` and route to human review rather than selecting a freeze action.
>
> **5.2** A full `freeze` on an account with active standing instructions requires
> supervisor approval, because it will cause EMI failures. Prefer `partial_freeze`.
