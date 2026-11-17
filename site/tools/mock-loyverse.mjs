// A stand-in for the Loyverse API (2026-11-17), for testing the agency-core Loyverse sync without a real account.
// It follows the public API: GET /v1.0/stores, /v1.0/payment_types, /v1.0/items (cursor pages), POST /v1.0/receipts.
// It checks what a real Loyverse would refuse (wrong token, unknown store / item / payment type, payment not equal to the lines).
//
//   node site/tools/mock-loyverse.mjs [port]            (default 9930; token: lv_test_token_123456)
//   GET /__receipts  → the receipts received so far;  POST /__reset → forget them;  POST /__down?on=1 → answer 503 (Loyverse down)
//
// The local WordPress points at it with  define( 'AGC_LOYVERSE_BASE', 'http://127.0.0.1:9930/v1.0' );  (never on a real site).
import http from 'node:http';

const PORT = +(process.argv[2] || 9930);
const TOKEN = 'lv_test_token_123456';
const STORES = [{ id: 'st-1', name: 'Sireh & Salt (Loyverse)' }, { id: 'st-old', name: 'Closed branch', deleted_at: '2026-01-01T00:00:00.000Z' }];
const TYPES = [
  { id: 'pt-cash', name: 'Cash', type: 'CASH' },
  { id: 'pt-card', name: 'Card', type: 'NONINTEGRATEDCARDPAYMENT' },
  { id: 'pt-qr', name: 'DuitNow QR', type: 'OTHER' },
  { id: 'pt-grab', name: 'GrabFood', type: 'OTHER' },
  { id: 'pt-web', name: 'Online', type: 'OTHER' },
];
let n = 0;
const item = (name, sku, opts) => ({ id: 'it-' + (++n), item_name: name, variants: (opts || [null]).map((o, i) => ({ variant_id: `va-${n}-${i}`, sku: i === 0 ? sku || '' : '', option1_value: o, default_price: 10 })) });
const ITEMS = [
  item('Kopi Ais'), item('teh tarik  ais'), item('Nasi Lemak Ayam Berempah'), item('Curry Laksa'), item('Mee Kari Ayam'),
  item('Rendang Rice (website)', 'SS-RENDANG'), item('Chicken Satay', '', ['6 sticks', '12 sticks']), item('Cendol Gula Melaka'),
  item('Wok-fried Kway Teow'), item('Ayam Percik'), item('Website extras'), { ...item('Old dish'), deleted_at: '2026-01-01T00:00:00.000Z' },
];
const VARIANTS = new Set(ITEMS.filter((i) => !i.deleted_at).flatMap((i) => i.variants.map((v) => v.variant_id)));
let receipts = [];
let down = false;

const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const err = (res, code, c, details) => send(res, code, { errors: [{ code: c, details }] });

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (u.pathname === '/__receipts') return send(res, 200, receipts);
    if (u.pathname === '/__reset') { receipts = []; down = false; return send(res, 200, { ok: true }); }
    if (u.pathname === '/__down') { down = u.searchParams.get('on') === '1'; return send(res, 200, { down }); }
    if (down) return err(res, 503, 'INTERNAL_SERVER_ERROR', 'Service unavailable');
    if (req.headers.authorization !== 'Bearer ' + TOKEN) return err(res, 401, 'UNAUTHORIZED', 'Invalid token');
    if (req.method === 'GET' && u.pathname === '/v1.0/stores') return send(res, 200, { stores: STORES });
    if (req.method === 'GET' && u.pathname === '/v1.0/payment_types') return send(res, 200, { payment_types: TYPES });
    if (req.method === 'GET' && u.pathname === '/v1.0/items') {
      const page = u.searchParams.get('cursor') === 'p2' ? 1 : 0; // two pages, to test the cursor
      return send(res, 200, page ? { items: ITEMS.slice(6) } : { items: ITEMS.slice(0, 6), cursor: 'p2' });
    }
    if (req.method === 'POST' && u.pathname === '/v1.0/receipts') {
      let b;
      try { b = JSON.parse(raw); } catch (e) { return err(res, 400, 'BAD_REQUEST', 'Invalid JSON'); }
      if (!STORES.some((s) => s.id === b.store_id && !s.deleted_at)) return err(res, 400, 'BAD_REQUEST', 'Unknown store_id');
      if (!Array.isArray(b.line_items) || !b.line_items.length) return err(res, 400, 'MISSING_REQUIRED_PARAMETER', 'line_items');
      for (const l of b.line_items) {
        if (!VARIANTS.has(l.variant_id)) return err(res, 400, 'NOT_FOUND', 'variant ' + l.variant_id);
        if (!(l.quantity > 0) || typeof l.price !== 'number') return err(res, 400, 'INVALID_VALUE', 'quantity / price');
      }
      if (!Array.isArray(b.payments) || b.payments.length !== 1 || !TYPES.some((t) => t.id === b.payments[0].payment_type_id)) return err(res, 400, 'NOT_FOUND', 'payment_type_id');
      const sum = Math.round(b.line_items.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
      if (Math.abs(sum - b.payments[0].money_amount) > 0.001) return err(res, 400, 'INVALID_VALUE', `payments ${b.payments[0].money_amount} != total ${sum}`);
      const receipt = { ...b, receipt_number: '1-' + (1001 + receipts.length), total_money: sum, created_at: new Date().toISOString() };
      receipts.push(receipt);
      return send(res, 200, receipt);
    }
    return err(res, 404, 'NOT_FOUND', u.pathname);
  });
}).listen(PORT, '127.0.0.1', () => console.log('mock Loyverse on http://127.0.0.1:' + PORT + '/v1.0'));
