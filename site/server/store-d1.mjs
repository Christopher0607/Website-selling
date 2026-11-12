// Desk storage on Cloudflare D1 (binding DB). One table: kv(k, v = JSON text, t = ms).
// D1 limits (2026-11-12, developers.cloudflare.com/d1/platform/limits): row / string up to 2 MB, 50 queries per request
// on the free plan. Big values (the desk document grows with AI conversations) are split into parts k#000, k#001, ...
// and the main row only says how many parts there are.
const PART = 500000; // characters per row: JSON text with Chinese can be 3 bytes a character, so well under 2 MB
let ready = null;

export function d1Store(db) {
  if (!db) throw new Error('D1 binding "DB" is missing (Pages project → Settings → Bindings)');
  const init = () => (ready = ready || db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, t INTEGER NOT NULL)').run());
  const parse = (v) => { try { return JSON.parse(v); } catch (e) { return null; } };
  const partsOf = async (k) => (await db.prepare('SELECT v FROM kv WHERE k >= ? AND k < ? ORDER BY k').bind(k + '#', k + '#~').all()).results.map((r) => r.v).join('');

  return {
    async get(k) {
      await init();
      const row = await db.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first();
      if (!row) return null;
      const v = parse(row.v);
      if (v && v.__parts) return parse(await partsOf(k));
      return v;
    },
    async set(k, value) {
      await init();
      const text = JSON.stringify(value);
      const now = Date.now();
      const put = db.prepare('INSERT OR REPLACE INTO kv (k, v, t) VALUES (?, ?, ?)');
      const stmts = [db.prepare('DELETE FROM kv WHERE k >= ? AND k < ?').bind(k + '#', k + '#~')];
      if (text.length <= PART) stmts.push(put.bind(k, text, now));
      else {
        const n = Math.ceil(text.length / PART);
        for (let i = 0; i < n; i++) stmts.push(put.bind(k + '#' + String(i).padStart(3, '0'), text.slice(i * PART, (i + 1) * PART), now));
        stmts.push(put.bind(k, JSON.stringify({ __parts: n }), now));
      }
      await db.batch(stmts);
    },
    async getMany(keys) {
      await init();
      const out = new Map();
      for (let i = 0; i < keys.length; i += 90) { // D1: at most 100 bound values per query
        const chunk = keys.slice(i, i + 90);
        const rows = (await db.prepare(`SELECT k, v FROM kv WHERE k IN (${chunk.map(() => '?').join(',')})`).bind(...chunk).all()).results;
        for (const r of rows) out.set(r.k, parse(r.v));
      }
      return out;
    },
    async list(prefix, limit = 50) {
      await init();
      const rows = (await db.prepare('SELECT k, v FROM kv WHERE k >= ? AND k < ? ORDER BY k DESC LIMIT ?').bind(prefix, prefix + '~', limit).all()).results;
      return rows.map((r) => ({ key: r.k, value: parse(r.v) }));
    },
    async del(k) {
      await init();
      await db.batch([db.prepare('DELETE FROM kv WHERE k = ?').bind(k), db.prepare('DELETE FROM kv WHERE k >= ? AND k < ?').bind(k + '#', k + '#~')]);
    },
  };
}
