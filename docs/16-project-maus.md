# Project MAUS · Cartsmith operating loop

The Sales Desk holds customer records. Project MAUS coordinates four specialist
departments through an Operations Director.

```text
Public research → qualified daily queue → approved internal workflow → contact
      ↑                                                        ↓
weekly learning ← delivery quality ← interested customer / project outcome
```

## Implemented in this branch

- `/api/maus` is a separate, bearer-token protected bridge for MAUS.
- It exposes at most 30 eligible new leads for a day, sorted by score.
- The queue excludes do-not-contact, duplicate and skipped leads.
- It exposes only business name, score and public source URLs. It does **not**
  expose phone numbers, email addresses, owner notes, customer conversations or
  message drafts.
- A department may submit a bounded internal recommendation. It cannot change a
  lead, send a message, call a number, delete data, deploy code or access
  Cloudflare administration.
- The Desk has a **MAUS** tab for the first approval and department work history.
  The first accepted recommendation enables automatic collection of pending and
  future internal work across all departments. Each automatic receipt references
  that approval. Rejected work stays rejected.
- The review history uses revision checks to preserve concurrent submissions and
  approval decisions. The first approval persists independently of rolling history.
- Reports submitted through the bridge reject model protocol markers and fenced
  code. Bot instructions require short, conversational Chinese for the owner.
- `ops/maus/team.yaml` defines the four departments, the Operations Director and
  the room **总监汇报室**. Ordinary room messages use the Director as responder.
  Lead Intelligence has public-page browser tools. The Director has coordination
  tools.

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

The caller's token fixes its department and permitted `kind`. Before the first
approval, recommendations have `pending_owner_review` status. The accepted
example has `approved` status. Later work has `accepted_under_policy` status
and an `approval_id` pointing to that example.

## Cloud handoff · 20 November 2026

Continue from branch `feature/maus-departments`. The owner requested this GitHub
snapshot to continue in a Cloud environment.

The owner approved the first public-browser research task and subsequent work
of the same kind in this chat. This covers internal research, drafts, quality
checks and learning. Preserve that approval when continuing.

The live MAUS instance already has the five bots and **总监汇报室**. A real room
test returned one plain-Chinese Director response. A Lead Intelligence browser
call reached the platform's first permission card. Applying the owner's approval
to that card and verifying the resulting page read remain pending.

The code in this branch has local verification. Production deployment of the
updated Desk bridge and its five role secrets remains pending. The MAUS server
holds its own live configuration and data. A GitHub clone supplies the source
and team definition. Configure credentials through the Cloud environment's
secret settings.

Next integration work is to connect the departments to the deployed Desk
bridge, verify a real research-to-report batch and persist the first approval
receipt. Then add a recurring MAUS routine with quota and overlap handling.
A recurring daily routine has yet to be created.

The business target is **30 actual customers contacted per day**. The Desk
shows actual first contacts separately from eligible research candidates.
Configured external sending channels and verified delivery receipts are still
needed to automate that target. Current bridge submissions perform internal
work. Actual automated contacts completed in this setup so far total zero.

## Local checks

```text
node --check site/worker.mjs
node --check site/server/maus.mjs
node site/tools/check-maus.js
python site/build.py
node site/tools/check-boss.js
```

The browser check needs Playwright and Chromium. An installed Chrome can be
selected with `DESK_TEST_BROWSER`. Local verification passed 15 bridge contract
checks and 22 browser checks, including first approval, concurrent submissions,
automatic collection, persistence on another device and phone layout.
