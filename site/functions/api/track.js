// Cloudflare Pages Function: /api/track → site/server/desk.mjs (the same code runs in the local tests: site/tools/dev-server.mjs)
import { handleTrack } from '../../server/desk.mjs';
import { d1Store } from '../../server/store-d1.mjs';
export const onRequest = (ctx) => handleTrack(ctx.request, { env: (k) => ctx.env[k], store: d1Store(ctx.env.DB), ip: ctx.request.headers.get('CF-Connecting-IP') || 'unknown' });
