/* Agency Core — AI 客服聊天视窗（客人主动开始；对话只存在这个分页的 sessionStorage） */
(function () {
  'use strict';
  var cfg = window.agcAiChat; var root = document.querySelector('[data-agc-ai-chat]');
  if (!cfg || !root) { return; }
  var KEY = 'agc_ai_chat_v1';
  var state = { open: false, busy: false, messages: [], session: '' };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (saved) { state.messages = saved.messages || []; state.session = saved.session || ''; } } catch (e) {}
  if (!state.session) { state.session = 's' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function persist() { try { sessionStorage.setItem(KEY, JSON.stringify({ messages: state.messages.slice(-30), session: state.session })); } catch (e) {} }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text != null) { n.textContent = text; } return n; }

  var btn = el('button', 'agc-ai-toggle'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'agc-ai-panel');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg><span>' + (cfg.title || 'Chat') + '</span>';
  var panel = el('div', 'agc-ai-panel'); panel.id = 'agc-ai-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', cfg.title || 'Chat'); panel.hidden = true;
  var head = el('div', 'agc-ai-head'); head.appendChild(el('strong', '', cfg.title || 'Chat'));
  var close = el('button', 'agc-ai-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close'); head.appendChild(close);
  var log = el('div', 'agc-ai-log'); log.setAttribute('aria-live', 'polite');
  var form = el('form', 'agc-ai-form'); var input = el('textarea'); input.rows = 1; input.maxLength = 1500; input.placeholder = 'Type your question…'; input.setAttribute('aria-label', 'Message');
  var send = el('button', 'agc-ai-send', '➤'); send.type = 'submit'; send.setAttribute('aria-label', 'Send');
  form.appendChild(input); form.appendChild(send);
  var note = el('p', 'agc-ai-note', cfg.note || '');
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(form); panel.appendChild(note);
  root.appendChild(panel); root.appendChild(btn);

  function bubble(role, text) { var b = el('div', 'agc-ai-msg agc-ai-' + role, text); log.appendChild(b); log.scrollTop = log.scrollHeight; return b; }
  function render() { log.innerHTML = ''; bubble('assistant', cfg.greeting || 'Hi!'); state.messages.forEach(function (m) { bubble(m.role, m.content); }); }
  function toggle(open) {
    state.open = open; panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); root.classList.toggle('is-open', open);
    if (open) { render(); setTimeout(function () { input.focus(); }, 50); }
  }
  btn.addEventListener('click', function () { toggle(!state.open); });
  close.addEventListener('click', function () { toggle(false); btn.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) { toggle(false); } });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); } });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim(); if (!text || state.busy) { return; }
    state.busy = true; send.disabled = true; input.value = '';
    state.messages.push({ role: 'user', content: text }); persist(); bubble('user', text);
    var typing = bubble('assistant agc-ai-typing', '…');
    var body = new FormData(); body.append('action', 'agc_ai_chat'); body.append('nonce', cfg.nonce); body.append('session', state.session); body.append('messages', JSON.stringify(state.messages.slice(-20)));
    fetch(cfg.url, { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        typing.remove();
        if (!res || !res.success) { throw new Error('fail'); }
        state.messages.push({ role: 'assistant', content: res.data.reply }); persist(); bubble('assistant', res.data.reply);
        if (res.data.lead && window.agcTrack) { window.agcTrack('generate_lead', { form: 'ai_chat' }); }
        if (res.data.handoff && cfg.wa) { var a = el('a', 'agc-ai-wa', 'Continue on WhatsApp →'); a.href = cfg.wa; a.target = '_blank'; a.rel = 'noopener'; log.appendChild(a); log.scrollTop = log.scrollHeight; }
      })
      .catch(function () { typing.remove(); bubble('assistant', cfg.error); if (cfg.wa) { var a = el('a', 'agc-ai-wa', 'WhatsApp →'); a.href = cfg.wa; a.target = '_blank'; a.rel = 'noopener'; log.appendChild(a); } })
      .finally(function () { state.busy = false; send.disabled = false; input.focus(); });
  });
})();
