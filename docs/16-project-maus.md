# Project MAUS · Cartsmith operating loop

The Sales Desk remains the customer system of record. Project MAUS is a set of
internal departments around it, not a second CRM.

```text
Public research → qualified daily queue → owner-reviewed draft → owner sends
      ↑                                                        ↓
weekly learning ← delivery quality ← interested customer / project outcome
```

## What is live in this branch

- `/api/maus` is a separate, bearer-token protected bridge for MAUS.
- It exposes at most 30 eligible new leads for a day, sorted by score.
- The queue excludes do-not-contact, duplicate and skipped leads.
- It exposes only business name, score and public source URLs. It does **not**
  expose phone numbers, email addresses, owner notes, customer conversations or
  message drafts.
- A department may submit a bounded internal recommendation. It cannot change a
  lead, send a message, call a number, delete data, deploy code or access
  Cloudflare administration.
- The Desk has a **MAUS** tab where the owner accepts or rejects recommendations.
  Approval is a record of the decision, never an automatic external action.

## Department capabilities

| Department | Token secret | Read | May submit |
| --- | --- | --- | --- |
| Lead Intelligence | `MAUS_RESEARCH_KEY` | daily queue, metrics | `lead_research` |
| Sales Conversion | `MAUS_SALES_KEY` | daily queue, metrics | `message_draft` |
| Delivery Quality | `MAUS_DELIVERY_KEY` | metrics | `delivery_check` |
| Finance & Learning | `MAUS_FINANCE_KEY` | metrics | `weekly_report` |
| Operations Director | `MAUS_OPS_KEY` | daily queue, metrics | `operating_plan` |

Each value must be a different random secret, added in Cloudflare Workers as a
**Secret**. Never place one in Git, a browser URL, a bot prompt, an OpenMaus
team YAML file, or chat.

## API contract

All calls use `Authorization: Bearer <department-secret>`.

```text
GET /api/maus?resource=capabilities
GET /api/maus?resource=daily-queue&limit=30
GET /api/maus?resource=metrics
POST /api/maus
{
  "action": "submit_review",
  "kind": "lead_research",
  "lead_id": "p001",
  "title": "Public source check",
  "summary": "Facts and recommendation only.",
  "evidence": [{"url": "https://example.com/", "note": "What was verified."}]
}
```

The caller's token fixes its department and permitted `kind`; a caller cannot
choose another department in the body. Recommendations stay
`pending_owner_review` until the owner decides in `/desk/`.

## Safe rollout

1. Run the local checks below and deploy the Worker only after they pass.
2. Add the five independent Cloudflare secrets. Start with the research token
   only; keep all other integrations disabled until their work is reviewed.
3. Give Lead Intelligence a browser limited to public, no-login research. Do
   not give it the Desk password, SSH, Docker, Cloudflare, WordPress, email,
   WhatsApp, payment or deployment credentials.
4. When 2–3 days of recommendations are useful, add the Sales Conversion token
   so it can submit drafts to the owner review queue. It still must not send.
5. Turn on each remaining department only after a useful weekly output exists.

The 30/day target means **30 qualified, deduplicated and reviewable prospects in
the work queue**, not 30 unsolicited automated messages. Contact is only via an
approved official channel with a documented lawful basis, rate limit, audit
trail and immediate do-not-contact handling; the owner takes the final send
action.

## Local checks

```text
node --check site/worker.mjs
node --check site/server/maus.mjs
node site/tools/check-maus.js
python site/build.py
```
