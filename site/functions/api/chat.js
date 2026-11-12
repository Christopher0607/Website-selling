// Cloudflare Pages Function: /api/chat → site/server/chat.mjs (the same code runs in the local tests: site/tools/dev-server.mjs)
import { handleChat } from '../../server/chat.mjs';
export const onRequest = (ctx) => handleChat(ctx.request, { env: (k) => ctx.env[k], ip: ctx.request.headers.get('CF-Connecting-IP') || 'unknown' });
