#!/usr/bin/env node
// 免费样板 → 加密后放到 GitHub 的 previews 分支 → Netlify 分支部署（branch deploy，不扣点数）。
//
// 为什么：Netlify 免费方案每次正式部署扣 15 点（每月 300 点），分支部署不扣（2026-11-09 查：
// https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ ）。
// repo 是公开的，所以每一页和每一张照片都用样板密码加密（AES-256-GCM，密码用 PBKDF2 变成金钥）；
// 没有密码的人（包括看 GitHub 的人）只看到密码页和乱码。不需要任何金钥：用现有的 git push。
// Netlify 要先在 Branch deploys 加上 previews 分支（docs/09-netlify-guide.md 第 D 部分）。
//
// 用法（先 python3 site/build.py --preview clients/<代号>/preview/preview.json）：
//   node scripts/local/preview-publish.js publish p012        # 加密 + push，印出网址和密码
//   node scripts/local/preview-publish.js list                # 列出 previews 分支上的样板和删除日期
//   node scripts/local/preview-publish.js delete p012         # 删除（14 天内一定要删）
//   node scripts/local/preview-publish.js encrypt p012 <资料夹>  # 只加密到本机资料夹（测试用，不 push）
//   node scripts/local/preview-publish.js desk-note p012      # 把网址 + 加密的密码写进 sales/leads/previews.json（publish 会自动做）
// 工作台备注：密码用工作台的公钥（/api/desk?pubkey=1）加密后才写进 repo，只有工作台解得开；
// preview.json 要有 lead_id（新商家 id）或 instagram，工作台才知道是哪一家。commit sales/leads/previews.json 到 leads 分支。
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BRANCH = 'previews';
const ITER = 150000;
const studio = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'studio.json'), 'utf8'));
const SITE_HOST = new URL(studio.site_url || 'https://cartsmith.netlify.app').host; // cartsmith.netlify.app
const BASE_URL = `https://${BRANCH}--${SITE_HOST}`;

const die = (m) => { console.error(m); process.exit(1); };
const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function previewOf(code) {
  if (!/^[a-z0-9-]{2,40}$/.test(code || '')) die('代号只能用小写英文、数字和连字符，例如 p012');
  const dir = path.join(ROOT, 'clients', code, 'preview');
  const cfgPath = path.join(dir, 'preview.json');
  if (!fs.existsSync(cfgPath)) die(`找不到 ${cfgPath}`);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const site = path.join(dir, 'site');
  if (!fs.existsSync(path.join(site, 'index.html'))) die(`还没做好样板：先跑 python3 site/build.py --preview clients/${code}/preview/preview.json`);
  const pw = String(cfg.password || '');
  if (pw.length < 6 || /改成/.test(pw)) die('preview.json 的 password 要设好（至少 6 个字）');
  const recPath = path.join(dir, 'publish.json');
  const rec = fs.existsSync(recPath) ? JSON.parse(fs.readFileSync(recPath, 'utf8')) : {};
  const slug = rec.slug || `${code}-${crypto.randomBytes(4).toString('hex')}`;
  return { code, dir, site, pw, cfg, slug, recPath };
}

// ---------------------------------------------------------------- encryption
const b64 = (b) => Buffer.from(b).toString('base64');
function seal(key, data) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(data), c.final(), c.getAuthTag()]);
  return { iv, ct };
}
const IMG = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

// runs inside the decrypted page: swaps img/… for decrypted copies (also for images added later by store.js)
const RUNTIME = `(function(){var S=__SLUG__,raw;try{raw=localStorage.getItem('pvk:'+S)}catch(e){}if(!raw)return;
var b=atob(raw),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);
var kp=crypto.subtle.importKey('raw',a,'AES-GCM',false,['decrypt']),cache={},MT={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif'};
function dec(u){return cache[u]||(cache[u]=Promise.all([kp,fetch(u+'.enc').then(function(r){if(!r.ok)throw new Error(r.status);return r.arrayBuffer()})]).then(function(x){return crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(x[1],0,12)},x[0],new Uint8Array(x[1],12))}).then(function(p){var e=u.split('?')[0].split('.').pop().toLowerCase();return URL.createObjectURL(new Blob([p],{type:MT[e]||'application/octet-stream'}))}))}
var RX=/(^|\\/)img\\/[^?#]+\\.(jpe?g|png|webp|gif|svg|avif)/i;
function fix(img){var s=img.getAttribute('data-pv-src')||img.getAttribute('src');if(!s||/^(blob|data):/.test(s)||!RX.test(s))return;img.removeAttribute('data-pv-src');var u=new URL(s,location.href).href;img.setAttribute('data-pv-want',u);dec(u).then(function(bl){if(img.getAttribute('data-pv-want')===u)img.src=bl})}
function scan(n){if(n.nodeType!==1)return;if(n.tagName==='IMG')fix(n);n.querySelectorAll&&n.querySelectorAll('img').forEach(fix)}
new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='attributes')fix(m.target);else m.addedNodes.forEach(scan)})}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src'],attributeOldValue:false});
document.addEventListener('DOMContentLoaded',function(){scan(document.documentElement)});})();`;

function shell(slug, salt, iv, ct, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title>
<style>body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f2ee;color:#1b1b1b;display:grid;place-items:center;min-height:100vh}form{background:#fff;padding:28px 24px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.08);width:min(340px,88vw)}h1{font-size:1.15rem;margin:0 0 6px}p{margin:0 0 16px;color:#666;font-size:.9rem}input{width:100%;box-sizing:border-box;height:46px;border:1.5px solid #ddd;border-radius:10px;padding:0 12px;font-size:1rem}button{margin-top:12px;width:100%;height:46px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:600;font-size:1rem}.e{color:#b3261e;margin:10px 0 0}</style></head>
<body><form id="f" hidden><h1>Private mockup</h1><p>Made by Cartsmith Studio for one business only. Enter the password you received. · 请输入收到的密码。</p><input id="pw" type="password" autocomplete="off" placeholder="Password · 密码" aria-label="Password"><button>Open · 打开</button><p class="e" id="e" hidden>Wrong password · 密码不对</p></form>
<script>(function(){var S=${JSON.stringify(slug)},SALT=${JSON.stringify(b64(salt))},IV=${JSON.stringify(b64(iv))},CT=${JSON.stringify(b64(ct))},K='pvk:'+S,RT=${JSON.stringify(RUNTIME.replace('__SLUG__', JSON.stringify(slug)))};
function u8(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function s64(a){var s='';a=new Uint8Array(a);for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
function show(bad){var f=document.getElementById('f');f.hidden=false;document.getElementById('e').hidden=!bad;document.getElementById('pw').focus()}
function open(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']).then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:u8(IV)},k,u8(CT))}).then(function(pt){
  try{localStorage.setItem(K,s64(raw))}catch(e){}
  var h=new TextDecoder().decode(pt),m=h.match(/var H='([0-9a-f]+)'/);if(m){try{localStorage.setItem('pv_'+m[1],'1')}catch(e){}}
  h=h.replace(/<head([^>]*)>/i,'<head$1><style>img[data-pv-src]{visibility:hidden}</style><script>'+RT.replace(/<\\/script/gi,'<\\\\/script')+'<\\/script>');
  document.open();document.write(h);document.close()})}
if(!window.crypto||!crypto.subtle){document.body.innerHTML='<p style="padding:24px">Please open this link in Chrome or Safari. · 请用 Chrome 或 Safari 打开。</p>';return}
var saved;try{saved=localStorage.getItem(K)}catch(e){}
if(saved)open(u8(saved)).catch(function(){try{localStorage.removeItem(K)}catch(e){}show(false)});else show(false);
document.getElementById('f').addEventListener('submit',function(ev){ev.preventDefault();var pw=document.getElementById('pw').value;
  crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']).then(function(k){return crypto.subtle.deriveBits({name:'PBKDF2',salt:u8(SALT),iterations:${ITER},hash:'SHA-256'},k,256)})
  .then(function(bits){return open(new Uint8Array(bits))}).catch(function(){show(true)})});
})();</script></body></html>`;
}

function encryptSite(p, out) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(p.pw, salt, ITER, 32, 'sha256');
  fs.rmSync(out, { recursive: true, force: true });
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  let pages = 0, imgs = 0;
  for (const f of walk(p.site)) {
    const rel = path.relative(p.site, f).split(path.sep).join('/');
    const dest = path.join(out, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (rel.endsWith('.html')) {
      let h = fs.readFileSync(f, 'utf8');
      // inline the product data (names / prices) so it is encrypted with the page
      h = h.replace(/<script src="((?:\.\.\/)*)data\.js"[^>]*><\/script>/, (m, up) => `<script>${fs.readFileSync(path.join(p.site, 'data.js'), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
      // no request for the (unpublished) original photos; the runtime fills them in
      h = h.replace(/(<img\b[^>]*?)\ssrc="([^"]*img\/[^"]+)"/gi, '$1 data-pv-src="$2"');
      const { iv, ct } = seal(key, Buffer.from(h, 'utf8'));
      fs.writeFileSync(dest, shell(p.slug, salt, iv, ct, 'Private mockup'));
      pages++;
    } else if (rel === 'data.js') {
      continue; // inlined above
    } else if (/(^|\/)img\//.test(rel) && IMG.test(rel)) {
      const { iv, ct } = seal(key, fs.readFileSync(f));
      fs.writeFileSync(dest + '.enc', Buffer.concat([iv, ct]));
      imgs++;
    } else {
      fs.copyFileSync(f, dest); // template css / js / fonts / _headers: nothing about the prospect
    }
  }
  return { pages, imgs };
}

// ---------------------------------------------------------------- previews branch
const BRANCH_FILES = {
  'netlify.toml': '# previews 分支：只放加密的免费样板（scripts/local/preview-publish.js）。分支部署不扣 Netlify 点数。\n[build]\n  base = "site"\n  publish = "public"\n  command = "echo previews"\n',
  'site/netlify.toml': '[build]\n  publish = "public"\n  command = "echo previews"\n',
  'site/public/index.html': '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Cartsmith Studio</title><p style="font:16px system-ui;padding:24px">Nothing here. <a href="https://cartsmith.netlify.app/">Cartsmith Studio</a></p>\n',
  'site/public/robots.txt': 'User-agent: *\nDisallow: /\n',
  'site/public/_headers': '/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n',
  'README.md': '# previews 分支\n\n只放**加密**的免费样板，每个样板 14 天内删除。不要合并到其他分支。说明见 `scripts/local/preview-publish.js`（在 ccr 分支）。\n',
};

function withBranch(fn) {
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'previews-'));
  let exists = true;
  try { git(['fetch', '-q', 'origin', BRANCH]); } catch (e) { exists = false; }
  try {
    git(['worktree', 'add', '-q', '--detach', wt]);
    if (exists) git(['checkout', '-q', '-B', BRANCH + '-wt', 'origin/' + BRANCH], wt);
    else { git(['checkout', '-q', '--orphan', BRANCH + '-wt'], wt); git(['rm', '-rfq', '.'], wt); }
    for (const [f, txt] of Object.entries(BRANCH_FILES)) { fs.mkdirSync(path.dirname(path.join(wt, f)), { recursive: true }); fs.writeFileSync(path.join(wt, f), txt); }
    const msg = fn(wt);
    git(['add', '-A'], wt);
    if (git(['status', '--porcelain'], wt)) {
      git(['-c', 'user.name=Cartsmith Studio', '-c', 'user.email=noreply@cartsmith.studio', 'commit', '-q', '-m', msg], wt);
      let ok = false;
      for (const wait of [0, 2, 4, 8, 16]) {
        if (wait) execFileSync('sleep', [String(wait)]);
        try { git(['push', '-q', 'origin', `HEAD:refs/heads/${BRANCH}`], wt); ok = true; break; } catch (e) { if (/403|denied|forbidden/i.test(String(e.stderr || e))) break; }
      }
      if (!ok) die('push 到 previews 分支失败（网络或权限），没有发布。');
    }
  } finally {
    try { git(['worktree', 'remove', '--force', wt]); } catch (e) { /* ignore */ }
    try { git(['branch', '-D', BRANCH + '-wt']); } catch (e) { /* ignore */ }
  }
}

function listOnBranch() {
  try { git(['fetch', '-q', 'origin', BRANCH]); } catch (e) { return []; }
  const out = git(['ls-tree', '-d', '--name-only', `origin/${BRANCH}:site/public`]);
  return out.split('\n').filter((s) => /^[a-z0-9-]+-[0-9a-f]{8}$/.test(s));
}

// ---------------------------------------------------------------- desk note (url + password encrypted for the sales desk)
const NOTES = path.join(ROOT, 'sales', 'leads', 'previews.json');
async function deskNote(code) {
  const p = previewOf(code);
  if (!fs.existsSync(p.recPath)) die(`${code} 还没发布：先跑 publish`);
  const rec = JSON.parse(fs.readFileSync(p.recPath, 'utf8'));
  if (!p.cfg.lead_id && !p.cfg.instagram) die('preview.json 要有 lead_id 或 instagram，工作台才知道是哪一家');
  const deskUrl = (process.env.DESK_URL || studio.site_url || 'https://cartsmith.netlify.app').replace(/\/$/, '') + '/api/desk?pubkey=1';
  let pubkey;
  for (const wait of [0, 3, 10, 20]) {
    if (wait) execFileSync('sleep', [String(wait)]);
    try { const r = await fetch(deskUrl); if (r.ok) { pubkey = (await r.json()).pubkey; if (pubkey) break; } } catch (e) { /* retry */ }
  }
  if (!pubkey) die(`拿不到工作台的公钥（${deskUrl}）。工作台的新版本还没上线？晚一点再跑：node scripts/local/preview-publish.js desk-note ${code}`);
  const enc = crypto.publicEncrypt({ key: pubkey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(JSON.stringify({ password: p.pw }))).toString('base64');
  const doc = fs.existsSync(NOTES) ? JSON.parse(fs.readFileSync(NOTES, 'utf8')) : { note: '做好的免费样板。网址公开，密码用工作台的公钥加密（只有工作台解得开）。scripts/local/preview-publish.js 自动写。', previews: [] };
  doc.previews = (doc.previews || []).filter((x) => x.slug !== rec.slug && x.code !== code);
  doc.previews.push({ code, slug: rec.slug, url: rec.url, delete_by: rec.delete_by || p.cfg.delete_by || '', lead_id: p.cfg.lead_id || '', instagram: String(p.cfg.instagram || '').replace(/^@/, ''), name: (p.cfg.brand && p.cfg.brand.name) || '', photos: p.cfg.photos || '', enc });
  fs.writeFileSync(NOTES, JSON.stringify(doc, null, 1) + '\n');
  console.log(`工作台备注写好了：sales/leads/previews.json（${code}）。commit + push 到 leads 分支后，工作台 5 分钟内在那张卡显示网址和密码。`);
}
function dropNote(code) {
  if (!fs.existsSync(NOTES)) return;
  const doc = JSON.parse(fs.readFileSync(NOTES, 'utf8'));
  const before = (doc.previews || []).length;
  doc.previews = (doc.previews || []).filter((x) => x.code !== code);
  if (doc.previews.length !== before) { fs.writeFileSync(NOTES, JSON.stringify(doc, null, 1) + '\n'); console.log('也从 sales/leads/previews.json 拿掉了（记得 commit 到 leads 分支）。'); }
}

// ---------------------------------------------------------------- commands
const [cmd, code, extra] = process.argv.slice(2);
(async () => {
if (cmd === 'desk-note') {
  await deskNote(code);
} else if (cmd === 'encrypt') {
  const p = previewOf(code);
  const out = path.resolve(extra || path.join(os.tmpdir(), 'pv-' + p.slug));
  const n = encryptSite(p, path.join(out, p.slug));
  console.log(`加密好了：${n.pages} 页、${n.imgs} 张照片 → ${path.join(out, p.slug)}（本机测试用，没有 push）`);
} else if (cmd === 'publish') {
  const p = previewOf(code);
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  let n;
  withBranch((wt) => {
    const dest = path.join(wt, 'site', 'public', p.slug);
    n = encryptSite(p, dest);
    fs.writeFileSync(path.join(dest, '.meta.json'), JSON.stringify({ code: p.code, published: today, delete_by: p.cfg.delete_by || '' }) + '\n');
    return `Preview ${p.code} (${today}, delete by ${p.cfg.delete_by || '?'})`;
  });
  const url = `${BASE_URL}/${p.slug}/`;
  fs.writeFileSync(p.recPath, JSON.stringify({ slug: p.slug, url, published: today, delete_by: p.cfg.delete_by || '' }, null, 2));
  console.log(`发布好了（${n.pages} 页、${n.imgs} 张照片，全部加密）。Netlify 大约 1 分钟后更新：`);
  console.log(`网址：${url}`);
  console.log(`密码：${p.pw}`);
  console.log(`删除日期：${p.cfg.delete_by || '（preview.json 没写）'} —— 到期跑：node scripts/local/preview-publish.js delete ${p.code}`);
  if (p.cfg.lead_id || p.cfg.instagram) await deskNote(p.code);
  else console.log('（preview.json 没有 lead_id / instagram，所以没有写工作台备注）');
} else if (cmd === 'list') {
  const slugs = listOnBranch();
  if (!slugs.length) console.log('previews 分支上没有样板。');
  for (const s of slugs) {
    let meta = {};
    try { meta = JSON.parse(git(['show', `origin/${BRANCH}:site/public/${s}/.meta.json`])); } catch (e) { /* ignore */ }
    const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
    const late = meta.delete_by && meta.delete_by <= today ? '  ← 到期了，要删除' : '';
    console.log(`${s}  发布 ${meta.published || '?'}  删除 ${meta.delete_by || '?'}  ${BASE_URL}/${s}/${late}`);
  }
} else if (cmd === 'delete') {
  const slugs = listOnBranch().filter((s) => s.startsWith(code + '-'));
  if (!slugs.length) die(`previews 分支上没有 ${code} 的样板。`);
  withBranch((wt) => { for (const s of slugs) fs.rmSync(path.join(wt, 'site', 'public', s), { recursive: true, force: true }); return `Delete preview ${code}`; });
  const rec = path.join(ROOT, 'clients', code, 'preview', 'publish.json');
  if (fs.existsSync(rec)) fs.rmSync(rec);
  console.log(`已从网站删除 ${slugs.join(', ')}（大约 1 分钟后生效）。git 历史里只剩加密过的档案，没有密码打不开。`);
  dropNote(code);
} else {
  console.log('用法：publish <代号> | list | delete <代号> | desk-note <代号> | encrypt <代号> [资料夹]（见档案开头的说明）');
}
})().catch((e) => die(String(e && e.stack || e)));
