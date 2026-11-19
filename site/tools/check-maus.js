// Narrow API contract tests for the Project MAUS bridge.
// Run from repo root: node site/tools/check-maus.js

(async () => {
  const { handleMaus } = await import('../server/maus.mjs');
  const { handleDesk } = await import('../server/desk.mjs');
  let savedReviews = null;
  const prospect = {
    id: 'p001', business_name: 'Example Bakery', niche: 'cakes', language: 'en', score: 4,
    status: 'new', instagram: 'examplebakery', store_url: 'https://example.test/',
    whatsapp: '60123456789', email: 'hello@example.test', notes: 'private owner note', message: 'private draft', created: '2026-11-19',
  };
  const doc = { items: [prospect,
    { id: 'p002', business_name: 'DNC Shop', status: 'do_not_contact', instagram: 'dnc', score: 5 },
    { id: 'p003', business_name: 'Duplicate Shop', status: 'new', instagram: 'dupe', score: 5, duplicate_of: 'p001' },
    { id: 'p004', business_name: 'Skip Shop', status: 'new', instagram: 'skip', fit: 'skip', score: 5 },
  ] };
  const envs = { MAUS_RESEARCH_KEY: 'research-test', MAUS_DELIVERY_KEY: 'delivery-test' };
  const plat = {
    env: (k) => envs[k],
    store: {
      async get(k) { return k === 'prospects-v1' ? doc : (k === 'maus-reviews-v1' ? savedReviews : null); },
      async set(k, v) { if (k === 'maus-reviews-v1') savedReviews = v; },
      async compareRevision(k, rev, value) {
        if (k !== 'maus-reviews-v1' || (savedReviews?.revision || 0) !== rev) return false;
        savedReviews = structuredClone(value);
        return true;
      },
    },
  };
  const req = (path, token, method = 'GET', body) => new Request('https://desk.test' + path, {
    method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  let failed = 0;
  const ok = (v, message) => { console.log((v ? '  OK ' : '  FAIL ') + message); if (!v) failed++; };

  let r = await handleMaus(req('/api/maus?resource=daily-queue', 'wrong'), plat);
  ok(r.status === 401, 'rejects an unknown token');
  r = await handleMaus(req('/api/maus?resource=daily-queue', 'delivery-test'), plat);
  ok(r.status === 403, 'delivery role cannot read the prospect queue');
  r = await handleMaus(req('/api/maus?resource=daily-queue&limit=99', 'research-test'), plat);
  const queue = await r.json();
  ok(r.status === 200 && queue.target === 30 && queue.queue.length === 1 && queue.queue[0].lead_id === 'p001', 'returns only an eligible, capped work queue');
  ok(!('whatsapp' in queue.queue[0]) && !('email' in queue.queue[0]) && !('notes' in queue.queue[0]) && !('message' in queue.queue[0]), 'does not expose contact details, notes, or message drafts');
  r = await handleMaus(req('/api/maus', 'research-test', 'POST', { action: 'submit_review', kind: 'lead_research', lead_id: 'p001', title: 'Public source check', summary: 'Public website is reachable.', evidence: [{ url: 'https://example.test/', note: 'Homepage loaded.' }] }), plat);
  const posted = await r.json();
  ok(r.status === 201 && posted.review.status === 'pending_owner_review' && savedReviews.records.length === 1, 'accepts a bounded internal review for owner approval');
  r = await handleMaus(req('/api/maus', 'research-test', 'POST', { action: 'submit_review', kind: 'weekly_report', title: 'not allowed', summary: 'nope' }), plat);
  ok(r.status === 403, 'prevents a department from submitting another department’s work');
  const submit = (body, token = 'research-test') => handleMaus(req('/api/maus', token, 'POST', { action: 'submit_review', kind: 'lead_research', lead_id: 'p001', title: '资料核对', summary: '已完成核对。', ...body }), plat);
  ok((await submit({ lead_id: 'p002' })).status === 400, 'refuses submissions against an opted-out lead');
  ok((await submit({ summary: '<｜DSML｜invoke>' })).status === 400, 'rejects model protocol in business reports');
  const deskPlat = { env: (k) => (k === 'SALES_DESK_KEY' ? 'desk-test-key' : envs[k]), store: plat.store, ip: '127.0.0.1' };
  const deskReq = (action, body) => new Request('https://desk.test/api/desk', { method: 'POST', headers: { 'x-desk-key': 'desk-test-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(body || {}) }) });
  r = await handleDesk(deskReq('maus-reviews'), deskPlat);
  const fromDesk = await r.json();
  ok(r.status === 200 && fromDesk.reviews.length === 1 && fromDesk.reviews[0].status === 'pending_owner_review', 'Desk shows internal recommendations for owner review');
  await handleDesk(deskReq('maus-review', { review_id: fromDesk.reviews[0].id, decision: 'rejected' }), deskPlat);
  const first = (await (await submit({})).json()).review;
  ok(first.status === 'pending_owner_review', 'rejecting a sample keeps the first approval pending');
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => submit({})));
  ok(concurrent.every(res => res.status === 201) && new Set(savedReviews.records.map(x => x.id)).size === 6, 'concurrent submissions keep separate receipts');
  const denied = deskReq('maus-review', { review_id: first.id, decision: 'approved' });
  denied.headers.set('x-desk-key', 'research-test');
  ok((await handleDesk(denied, deskPlat)).status === 401 && !savedReviews.firstApproval, 'department credential cannot grant itself approval');
  r = await handleDesk(deskReq('maus-review', { review_id: first.id, decision: 'approved' }), deskPlat);
  const decided = await r.json();
  ok(r.status === 200 && decided.review.status === 'approved', 'only the authenticated Desk owner can record approval');
  const later = await (await submit({ kind: 'delivery_check', lead_id: '' }, 'delivery-test')).json();
  ok(later.review.approval_id === first.id && later.review.status === 'accepted_under_policy' && savedReviews.records.filter(x => x.approval_id === first.id).length === 5, 'first approval applies across departments, including pending work');
  ok(!later.owner_approval_required && (await (await handleMaus(req('/api/maus', 'delivery-test'), plat)).json()).owner_approval_required === false, 'department sees its current approval state');
  process.exitCode = failed ? 1 : 0;
})();
