// Cloudflare Worker (2026-11-12): serves the site from dist/ (static assets, no Worker run for those) and the API.
// /api/desk, /api/track, /api/form, /api/chat, /api/hit run the same code as the local tests (site/server/*.mjs).
// Settings: site/wrangler.jsonc (assets, D1 binding DB). Secrets in the dashboard: SALES_DESK_KEY, DEEPSEEK_API_KEY.
import { handleDesk, handleTrack, handleForm } from './server/desk.mjs';
import { handleChat } from './server/chat.mjs';
import { d1Store } from './server/store-d1.mjs';
import { handleHit } from './server/traffic.mjs';
import { demoMove } from './server/demos.mjs';
import { handleMaus } from './server/maus.mjs';

const ROUTES = { '/api/desk': handleDesk, '/api/maus': handleMaus, '/api/track': handleTrack, '/api/form': handleForm, '/api/chat': handleChat, '/api/hit': handleHit };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 2026-11-17: /demo/* runs here first (wrangler.jsonc run_worker_first): the demo pages moved to WordPress
    if (url.pathname.startsWith('/demo/')) {
      const to = demoMove(url);
      return to ? Response.redirect(to, 302) : env.ASSETS.fetch(request);
    }
    const fn = ROUTES[url.pathname];
    if (!fn) return env.ASSETS.fetch(request); // a path with no file: the normal 404
    const cf = request.cf || {};
    const plat = { env: (k) => env[k], store: fn === handleChat ? null : d1Store(env.DB), ip: request.headers.get('CF-Connecting-IP') || 'unknown', country: cf.country || '', region: cf.region || '' };
    return fn(request, plat);
  },
};
