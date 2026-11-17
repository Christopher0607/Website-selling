// 2026-11-17 (docs/14-wordpress-demos.md): the 10 demo websites run on real WordPress + WooCommerce at
// https://<demo>.demo.cartsmithstudio.com/. Old links to the copies on the studio site (/demo/<demo>/…, sent to shops on
// WhatsApp, in the desk, on the price sheet) go there, with the same page and ?fest= / ?cat= / #… kept. Photos, styles and
// scripts stay here (the studio pages use some of them). Same list as WP_DEMO_SLUGS in site/build.py.
export const WP_DEMOS = ['sireh-salt', 'maison-cendre', 'dulang-daun', 'butter-lantern', 'voltnest', 'chili-pantry', 'dewlane', 'lowlight', 'plainfold', 'tailmate'];
export const WP_DEMO_HOST = 'demo.cartsmithstudio.com';
export const wpDemoUrl = (slug, page = '') => `https://${slug}.${WP_DEMO_HOST}/${page}`;

// "/demo/sireh-salt/menu.html?x=1" → "https://sireh-salt.demo.cartsmithstudio.com/menu.html?x=1"; null = serve the file here
export function demoMove(url) {
  const m = url.pathname.match(/^\/demo\/([a-z0-9-]+)(\/.*)?$/);
  if (!m || !WP_DEMOS.includes(m[1])) return null;
  const rest = m[2] || '/';
  if (/\.(?:css|js|mjs|json|webp|avif|jpe?g|png|gif|svg|ico|woff2?|ttf|txt|xml)$/i.test(rest)) return null;
  return wpDemoUrl(m[1], rest.replace(/^\/(?:index(?:\.html)?)?$/, '').replace(/^\//, '')) + url.search;
}
