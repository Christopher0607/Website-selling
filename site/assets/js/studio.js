/* Cartsmith Studio — menu, request form (/api/form, shown in the sales desk) and AI chat (DeepSeek via /api/chat). */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, fb) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  // our own form endpoint (2026-11-12, was Netlify Forms): stored for the sales desk
  function netlifySubmit(fields) {
    return fetch('/api/form', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(fields).toString() })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r; });
  }

  // ---------- header ----------
  const hdr = $('.s-hdr');
  const onScroll = () => hdr && hdr.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const menuBtn = $('[data-s-menu]');
  const nav = $('.s-nav');
  if (menuBtn && nav) menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // ---------- request form ----------
  const form = $('form[name="mockup-request"]');
  if (form) {
    const q = new URLSearchParams(location.search);
    ['template', 'package'].forEach((k) => {
      const v = q.get(k);
      const el = form.elements[k];
      if (v && el && Array.from(el.options).some((o) => o.value === v)) el.value = v;
    });
    const msg = $('[data-form-msg]', form);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      msg.className = 's-form__msg';
      msg.textContent = 'Sending…';
      const data = Object.fromEntries(new FormData(form).entries());
      netlifySubmit(data)
        .then(() => { location.href = 'thanks.html'; })
        .catch(() => {
          // Fallback so the request is never lost: show the details, copy them, open the Instagram DM.
          btn.disabled = false;
          const label = { name: 'Name', brand: 'Brand', whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'Email', shop_url: 'Shop', template: 'Template', package: 'Package', products: 'Products', message: 'Note' };
          const summary = 'Hi Cartsmith! Free mockup request:\n' + Object.keys(label).filter((k) => data[k]).map((k) => label[k] + ': ' + data[k]).join('\n');
          const dm = form.getAttribute('data-dm');
          msg.className = 's-form__msg s-form__msg--bad';
          msg.innerHTML = 'Sorry \u2014 our form couldn\u2019t send this time. Tap the button to copy your details and send them to us on Instagram (@' + esc(form.getAttribute('data-handle')) + '):' +
            '<textarea class="s-form__copy" readonly rows="6"></textarea><a class="s-btn s-btn--block" href="' + esc(dm) + '" target="_blank" rel="noopener" data-copy-dm>Copy &amp; open Instagram DM</a>';
          const ta = msg.querySelector('textarea');
          ta.value = summary;
          msg.querySelector('[data-copy-dm]').addEventListener('click', () => {
            try { navigator.clipboard.writeText(summary); } catch (e) { ta.select(); try { document.execCommand('copy'); } catch (e2) { /* manual copy */ } }
          });
        });
    });
  }

  // ---------- AI chat ----------
  const chat = $('[data-chat]');
  if (!chat) return;
  const panel = $('.chat__panel', chat);
  const fab = $('.chat__fab', chat);
  const log = $('[data-chat-log]', chat);
  const cform = $('[data-chat-form]', chat);
  const input = $('textarea', cform);
  const quick = $('[data-chat-quick]', chat);
  const endpoint = chat.getAttribute('data-endpoint');
  const dm = chat.getAttribute('data-dm');
  const KEY = 'cs_chat_v1';
  const MAX_TURNS = 30;
  let state = store.get(KEY, { msgs: [], lead: false });
  let busy = false;

  const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  function bubble(role, text, html) {
    const d = document.createElement('div');
    d.className = 'chat__msg chat__msg--' + role;
    d.innerHTML = html ? text : linkify(text);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function render() {
    log.innerHTML = '';
    bubble('bot', 'Hi! I’m Cartsmith’s AI assistant. Ask me about prices, the demo websites, timelines or how it works — in English, 中文 or Bahasa Malaysia.');
    state.msgs.forEach((m) => bubble(m.role === 'user' ? 'me' : 'bot', m.content));
    if (state.lead) bubble('note', '✓ Your details were sent to the Cartsmith team. We’ll reply on Instagram within 1 working day.');
    quick.hidden = state.msgs.length > 0;
  }
  function openChat() {
    panel.hidden = false;
    fab.hidden = true;
    render();
    setTimeout(() => input.focus(), 50);
  }
  function closeChat() { panel.hidden = true; fab.hidden = false; fab.focus(); }
  $$('[data-chat-open]').forEach((b) => b.addEventListener('click', openChat));
  $('[data-chat-close]', chat).addEventListener('click', closeChat);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closeChat(); });

  function offline() {
    bubble('note', 'The AI assistant isn’t available right now. Please message the Cartsmith team on Instagram — <a href="' + esc(dm) + '" target="_blank" rel="noopener">open Instagram DM</a>.', true);
  }
  function saveLead(lead) {
    if (state.lead) return;
    const transcript = state.msgs.map((m) => (m.role === 'user' ? 'Visitor: ' : 'AI: ') + m.content).join('\n').slice(-6000);
    netlifySubmit({
      'form-name': 'ai-chat-lead', name: lead.name || '', brand: lead.brand || '', instagram: lead.instagram || '', shop_url: lead.shop_url || '',
      contact: lead.contact || '', language: lead.language || '', interest: lead.interest || '', transcript
    }).then(() => {
      state.lead = true;
      store.set(KEY, state);
      bubble('note', '✓ Sent to the Cartsmith team. We’ll reply on Instagram within 1 working day.');
    }).catch(() => {
      bubble('note', 'Couldn’t save your details automatically — please <a href="' + esc(dm) + '" target="_blank" rel="noopener">DM us on Instagram</a> so we don’t miss you.', true);
    });
  }
  function send(text) {
    text = text.trim().slice(0, 800);
    if (!text || busy) return;
    if (state.msgs.length >= MAX_TURNS) { bubble('note', 'Let’s continue on Instagram — <a href="' + esc(dm) + '" target="_blank" rel="noopener">open DM</a>.', true); return; }
    quick.hidden = true;
    state.msgs.push({ role: 'user', content: text });
    if (window.csHit && state.msgs.filter((m) => m.role === 'user').length === 1) window.csHit('chat'); // the desk's 流量 tab counts chats started
    store.set(KEY, state);
    bubble('me', text);
    busy = true;
    const typing = document.createElement('div');
    typing.className = 'chat__typing';
    typing.textContent = 'typing…';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: state.msgs.slice(-12), page: location.pathname }) })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        typing.remove();
        if (!ok || !j || !j.reply) throw new Error((j && j.error) || 'bad response');
        state.msgs.push({ role: 'assistant', content: j.reply });
        store.set(KEY, state);
        bubble('bot', j.reply);
        if (j.lead_ready && j.lead && j.lead.name && (j.lead.instagram || j.lead.contact || j.lead.shop_url)) saveLead(j.lead);
        if (j.handoff) bubble('note', 'For this one, the Cartsmith team will help you directly — <a href="' + esc(dm) + '" target="_blank" rel="noopener">message us on Instagram</a>.', true);
      })
      .catch(() => { typing.remove(); state.msgs.pop(); store.set(KEY, state); offline(); })
      .finally(() => { busy = false; });
  }
  cform.addEventListener('submit', (e) => { e.preventDefault(); const t = input.value; input.value = ''; input.style.height = ''; send(t); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cform.requestSubmit(); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; });
  $$('button', quick).forEach((b) => b.addEventListener('click', () => send(b.textContent)));
})();
