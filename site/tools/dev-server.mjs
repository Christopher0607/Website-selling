// Local stand-in for Cloudflare Pages: serves site/dist and runs /api/desk, /api/track, /api/form, /api/chat with the
// same code as production (site/server/*.mjs), storing the desk in local JSON files instead of D1.
// 用法（在 repo 根目录）：
//   python3 site/build.py
//   DESK_LOCAL_FILE=/tmp/desk.json SALES_DESK_KEY=testpass123 DEEPSEEK_API_KEY=sk-test DEEPSEEK_BASE_URL=http://localhost:9920 LEADS_URL=off \
//     node site/tools/dev-server.mjs [port]
//   node site/tools/check-desk.js http://localhost:8769 /tmp/desk.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDesk, handleTrack, handleForm } from '../server/desk.mjs';
import { handleChat } from '../server/chat.mjs';
import { fileStore } from '../server/store-file.mjs';
import { handleHit } from '../server/traffic.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, '..', 'dist');
const PORT = Number(process.argv[2] || 8769);
const FILE = process.env.DESK_LOCAL_FILE;
if (!FILE) { console.error('set DESK_LOCAL_FILE=/path/to/desk.json'); process.exit(1); }
// country / region: Cloudflare fills these in production; locally DEV_COUNTRY / DEV_REGION (tests)
const plat = { env: (k) => process.env[k], store: fileStore(FILE), ip: '127.0.0.1', country: process.env.DEV_COUNTRY || '', region: process.env.DEV_REGION || '' };
const routes = { '/api/desk': handleDesk, '/api/track': handleTrack, '/api/form': handleForm, '/api/chat': handleChat, '/api/hit': handleHit };
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json', '.xml': 'application/xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const fn = routes[url.pathname];
  if (fn) {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const r = await fn(new Request('http://' + req.headers.host + url.pathname + url.search, { method: req.method, headers, body }), plat);
    const out = {};
    r.headers.forEach((v, k) => { out[k] = v; });
    res.writeHead(r.status, out);
    res.end(r.status === 204 || r.status === 303 ? undefined : Buffer.from(await r.arrayBuffer()));
    return;
  }
  let f = path.join(DIST, decodeURIComponent(url.pathname));
  if (!f.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (f.endsWith('/')) f += 'index.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`dev-server on http://localhost:${PORT} (desk data: ${FILE})`));
