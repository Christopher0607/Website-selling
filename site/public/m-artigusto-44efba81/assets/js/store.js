/* Cartsmith store templates — cart, variants, shipping and demo checkout.
   Everything runs in the visitor's browser. Nothing is sent anywhere (demo stores). */
(function () {
  'use strict';
  const S = window.STORE;
  if (!S) return;
  const SP = document.body.getAttribute('data-sroot') || '';
  const KEY = 'cs_cart_' + S.slug;
  const CKEY = 'cs_coupon_' + S.slug;
  const OKEY = 'cs_order_' + S.slug;
  const EAST = ['Sabah', 'Sarawak', 'Labuan'];
  const mem = {};

  // ---------- storage (falls back to memory when storage is blocked) ----------
  function load(store, k, fb) {
    try { const v = window[store].getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return k in mem ? mem[k] : fb; }
  }
  function save(store, k, v) {
    try { window[store].setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; }
  }
  function drop(store, k) { try { window[store].removeItem(k); } catch (e) { delete mem[k]; } }

  // ---------- helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rm = (n) => (n == null || isNaN(n) ? '' : 'RM' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); // mockups: products without a published price
  const ico = (n) => '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>';

  function unit(id, sel) {
    const p = S.products[id];
    let price = p.s || p.p;
    (p.o || []).forEach((o, i) => { const v = o.v.find((x) => x[0] === sel[i]); if (v) price += v[1]; });
    return price;
  }
  function lineImg(l) {
    const p = S.products[l.id];
    let img = p.img;
    (p.o || []).forEach((o, i) => { const v = o.v.find((x) => x[0] === l.sel[i]); if (v && v[2]) img = v[2]; });
    return SP + 'img/' + img;
  }
  const lineVar = (l) => (S.products[l.id].o || []).map((o, i) => o.n + ': ' + l.sel[i]).join(' · ');

  // ---------- cart ----------
  function cart() { return load('localStorage', KEY, []).filter((l) => S.products[l.id]); }
  function setCart(c) { save('localStorage', KEY, c); render(); }
  function subtotal(c) { return c.reduce((s, l) => s + unit(l.id, l.sel) * l.q, 0); }
  function count(c) { return c.reduce((s, l) => s + l.q, 0); }
  function coupon() { return load('localStorage', CKEY, null); }
  function totals(c, zone) {
    const sub = subtotal(c);
    const cp = coupon();
    const disc = cp ? Math.round(sub * cp.pct) / 100 : 0;
    let ship = null;
    if (zone) ship = sub >= S.ship.free_min ? 0 : (zone === 'east' ? S.ship.east : S.ship.west);
    if (!c.length) ship = 0;
    return { sub, disc, ship, total: sub - disc + (ship || 0) };
  }
  function add(id, sel, qty, silent) {
    sel = sel || []; qty = Math.max(1, Math.min(99, qty || 1));
    const c = cart();
    const k = id + '|' + sel.join('|');
    const line = c.find((l) => l.k === k);
    if (line) line.q = Math.min(99, line.q + qty); else c.push({ k, id, sel, q: qty });
    setCart(c);
    $$('.cart-btn').forEach((b) => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
    if (!silent) open('cart');
  }
  function changeQty(k, d) {
    const c = cart();
    const l = c.find((x) => x.k === k);
    if (!l) return;
    l.q += d;
    setCart(l.q <= 0 ? c.filter((x) => x.k !== k) : c);
  }
  function removeLine(k) { setCart(cart().filter((x) => x.k !== k)); }

  function lineHTML(l) {
    const p = S.products[l.id];
    const url = SP + 'p/' + l.id + '.html';
    const v = lineVar(l);
    return '<div class="line"><a href="' + url + '"><img src="' + lineImg(l) + '" alt=""></a><div>' +
      '<a class="line__name" href="' + url + '">' + esc(p.n) + '</a>' + (v ? '<p class="line__var">' + esc(v) + '</p>' : '<p class="line__var">' + rm(unit(l.id, l.sel)) + '</p>') +
      '<div class="qty qty--sm"><button type="button" data-q="-1" data-k="' + esc(l.k) + '" aria-label="Less">' + ico('minus') + '</button><input value="' + l.q + '" readonly aria-label="Quantity"><button type="button" data-q="1" data-k="' + esc(l.k) + '" aria-label="More">' + ico('plus') + '</button></div>' +
      '<button class="line__rm" type="button" data-rm="' + esc(l.k) + '">Remove</button></div>' +
      '<span class="line__price">' + rm(unit(l.id, l.sel) * l.q) + '</span></div>';
  }
  const emptyHTML = () => '<div class="empty"><p>Your cart is empty.</p><a class="btn" href="' + SP + 'shop.html">Start shopping</a></div>';

  function shipbarHTML(sub) {
    if (sub <= 0) return '';
    const left = S.ship.free_min - sub;
    const pct = Math.min(100, (sub / S.ship.free_min) * 100);
    const msg = left > 0 ? 'Spend <b>' + rm(left) + '</b> more for <b>free shipping</b>' : '<b>You’ve unlocked free shipping!</b>';
    return '<p>' + msg + '</p><div class="shipbar__track"><div class="shipbar__fill" style="width:' + pct + '%"></div></div>';
  }

  function render() {
    const c = cart();
    const n = count(c);
    const sub = subtotal(c);
    $$('[data-cart-count]').forEach((el) => { el.textContent = n; el.toggleAttribute('data-zero', n === 0); });
    $$('[data-shipbar]').forEach((el) => { el.innerHTML = shipbarHTML(sub); });
    const lines = $('[data-cart-lines]');
    if (lines) lines.innerHTML = c.length ? c.map(lineHTML).join('') : emptyHTML();
    const foot = $('[data-cart-foot]');
    if (foot) foot.hidden = !c.length;
    $$('[data-cart-subtotal]').forEach((el) => { el.textContent = rm(sub); });
    renderCartPage(c);
    renderCheckout(c);
  }

  // ---------- drawers ----------
  let lastFocus = null;
  function open(id) {
    const d = document.getElementById(id);
    if (!d) return;
    lastFocus = document.activeElement;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    const f = $('[data-close].icon-btn', d);
    if (f) setTimeout(() => f.focus(), 50);
  }
  function close(d) {
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  // ---------- toast ----------
  let toastT = null;
  function toast(msg) {
    const t = $('[data-toast]');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-on'), 4200);
  }

  // ---------- global clicks ----------
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-open],[data-close],[data-q],[data-rm],[data-add],[data-demo]');
    if (!t) return;
    if (t.hasAttribute('data-open')) { ev.preventDefault(); open(t.getAttribute('data-open')); }
    else if (t.hasAttribute('data-close')) { close(t.closest('.drawer')); }
    else if (t.hasAttribute('data-q')) { changeQty(t.getAttribute('data-k'), parseInt(t.getAttribute('data-q'), 10)); }
    else if (t.hasAttribute('data-rm')) { removeLine(t.getAttribute('data-rm')); }
    else if (t.hasAttribute('data-add')) { add(t.getAttribute('data-add'), [], 1); }
    else if (t.hasAttribute('data-demo')) { ev.preventDefault(); toast('Demo: ' + t.getAttribute('data-demo')); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') $$('.drawer.is-open').forEach(close);
  });
  $$('[data-demo-form]').forEach((f) => f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    toast('Demo: in your store this adds the email to your mailing list (with the customer’s consent).');
    f.reset();
  }));

  // ---------- announcement ----------
  const ann = $('[data-msgs]');
  if (ann) {
    const msgs = JSON.parse(ann.getAttribute('data-msgs'));
    const p = $('[data-announce]', ann);
    let i = 0;
    if (msgs.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInterval(() => {
        p.style.opacity = 0;
        setTimeout(() => { i = (i + 1) % msgs.length; p.textContent = msgs[i]; p.style.opacity = 1; }, 350);
      }, 4500);
    }
  }

  // ---------- shop filters ----------
  const grid = $('[data-grid]');
  if (grid) {
    const cards = $$('.card', grid);
    cards.forEach((c, i) => c.setAttribute('data-order', i));
    const title = $('[data-shop-title]');
    const cnt = $('[data-shop-count]');
    const filter = (cat) => {
      let n = 0;
      cards.forEach((c) => { const show = cat === 'all' || c.getAttribute('data-cat') === cat; c.hidden = !show; if (show) n++; });
      $$('[data-filter]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-filter') === cat));
      const chip = $('[data-filter="' + cat + '"]');
      if (title) title.textContent = cat === 'all' || !chip ? 'Shop all' : chip.textContent;
      if (cnt) cnt.textContent = n;
    };
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      const cat = b.getAttribute('data-filter');
      filter(cat);
      try { history.replaceState(null, '', cat === 'all' ? location.pathname : '?cat=' + cat); } catch (e) { /* ignore */ }
    }));
    const sort = $('[data-sort]');
    if (sort) sort.addEventListener('change', () => {
      const v = sort.value;
      const by = (c) => v === 'featured' ? +c.getAttribute('data-order') : +c.getAttribute('data-price');
      cards.slice().sort((a, b) => v === 'high' ? by(b) - by(a) : by(a) - by(b)).forEach((c) => grid.appendChild(c));
    });
    const q = new URLSearchParams(location.search).get('cat');
    filter(q && $('[data-filter="' + q + '"]') ? q : 'all');
  }

  // ---------- product page ----------
  const pdp = $('[data-product]');
  const form = $('[data-buy]');
  if (pdp && form) {
    const id = pdp.getAttribute('data-product');
    const p = S.products[id];
    const mainImg = $('[data-main-img]');
    const qty = form.querySelector('input[name="qty"]');
    const sel = () => (p.o || []).map((o, i) => { const r = form.querySelector('input[name="o' + i + '"]:checked'); return r ? r.value : o.v[0][0]; });
    const priceEl = $('[data-pdp-price]');
    const stickyPrice = $('[data-sticky-price]');
    const update = () => {
      const s = sel();
      const u = unit(id, s);
      let html = '<span class="now">' + rm(u) + '</span>';
      if (p.s) html += ' <s class="was">' + rm(u - p.s + p.p) + '</s>';
      if (priceEl) priceEl.innerHTML = html;
      if (stickyPrice) stickyPrice.textContent = rm(u);
      (p.o || []).forEach((o, i) => {
        const lab = form.querySelector('[data-opt-label="' + i + '"]');
        if (lab) lab.textContent = s[i];
        const v = o.v.find((x) => x[0] === s[i]);
        if (v && v[2] && mainImg) mainImg.src = SP + 'img/' + v[2];
      });
    };
    form.addEventListener('change', update);
    form.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-step]');
      if (!b) return;
      qty.value = Math.max(1, Math.min(99, (parseInt(qty.value, 10) || 1) + parseInt(b.getAttribute('data-step'), 10)));
    });
    form.addEventListener('submit', (ev) => { ev.preventDefault(); add(id, sel(), parseInt(qty.value, 10) || 1); });
    const now = $('[data-buy-now]');
    if (now) now.addEventListener('click', () => { add(id, sel(), parseInt(qty.value, 10) || 1, true); location.href = SP + 'checkout.html'; });
    const thumbs = $$('.thumb');
    const dots = $$('.gallery__dots i');
    let cur = 0;
    const show = (i, dir) => {
      if (!thumbs.length) return;
      cur = (i + thumbs.length) % thumbs.length;
      thumbs.forEach((x, k) => x.classList.toggle('is-on', k === cur));
      dots.forEach((x, k) => x.classList.toggle('is-on', k === cur));
      mainImg.src = thumbs[cur].getAttribute('data-img');
      if (dir && mainImg.animate) mainImg.animate([{ opacity: 0.35, transform: 'translateX(' + (dir * 28) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
    };
    thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    // phones: swipe the big image left / right to see the other photos
    const gal = $('.gallery__main');
    if (gal && thumbs.length > 1) {
      let x0 = null, y0 = 0;
      gal.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
      gal.addEventListener('touchend', (ev) => {
        if (x0 === null) return;
        const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    // sticky add-to-cart on phones once the main button scrolls away
    const sticky = $('[data-sticky-atc]');
    const atc = $('[data-atc]');
    if (sticky && atc && 'IntersectionObserver' in window) {
      const mq = matchMedia('(max-width: 860px)');
      new IntersectionObserver((ents) => {
        const e = ents[0];
        const on = mq.matches && !e.isIntersecting && e.boundingClientRect.top < 0;
        sticky.classList.toggle('is-on', on);
        sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
        document.body.classList.toggle('has-sticky', on);
        document.body.classList.toggle('atc-in-view', mq.matches && e.isIntersecting); // phones: chat button stays off the buy buttons
      }).observe(atc);
      $('[data-sticky-add]', sticky).addEventListener('click', () => add(id, sel(), parseInt(qty.value, 10) || 1));
    }
    // "Ask for price" products have no cart button: keep the chat button off the WhatsApp button the same way
    const ask = $('[data-ask]');
    if (ask && 'IntersectionObserver' in window) {
      const mq = matchMedia('(max-width: 860px)');
      new IntersectionObserver((ents) => document.body.classList.toggle('atc-in-view', mq.matches && ents[0].isIntersecting)).observe(ask);
    }
    update();
  }

  // ---------- cart page ----------
  function zoneNow() { const r = $('input[name="zone"]:checked'); return r ? r.value : 'west'; }
  function renderCartPage(c) {
    const table = $('[data-cart-table]');
    if (!table) return;
    table.innerHTML = c.length ? c.map(lineHTML).join('') : emptyHTML();
    const sum = $('[data-cart-summary]');
    if (sum) sum.hidden = !c.length;
    const t = totals(c, zoneNow());
    $('[data-sum-subtotal]').textContent = rm(t.sub);
    $('[data-sum-ship]').textContent = t.ship === 0 ? 'Free' : rm(t.ship);
    $('[data-sum-total]').textContent = rm(t.total);
    const dr = $('[data-sum-disc-row]');
    dr.hidden = !t.disc;
    $('[data-sum-disc]').textContent = '−' + rm(t.disc) + ' (' + coupon()?.code + ')';
    // phones: total + checkout pinned to the bottom of the screen
    const bar = $('[data-cart-bar]');
    if (bar) { bar.hidden = !c.length; $('[data-bar-total]', bar).textContent = rm(t.total); }
  }
  const cbar = $('[data-cart-bar]');
  const cbtn = $('[data-checkout-btn]');
  if (cbar && cbtn && 'IntersectionObserver' in window) {
    // hide the pinned bar while the summary's own checkout button is on screen
    new IntersectionObserver((ents) => cbar.classList.toggle('is-away', ents[0].isIntersecting)).observe(cbtn);
  }
  $$('input[name="zone"]').forEach((r) => r.addEventListener('change', render));
  const cform = $('[data-coupon]');
  if (cform) cform.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const inp = cform.querySelector('input');
    const code = inp.value.trim().toUpperCase();
    if (code === S.coupon.code) { save('localStorage', CKEY, S.coupon); toast('Code ' + code + ' applied: ' + S.coupon.pct + '% off.'); }
    else { toast('That code isn’t valid. (Demo code: ' + S.coupon.code + ')'); }
    inp.value = '';
    render();
  });

  // ---------- checkout ----------
  const co = $('[data-checkout]');
  function coZone() {
    const st = co && co.elements.state.value;
    return st ? (EAST.indexOf(st) >= 0 ? 'east' : 'west') : null;
  }
  function renderCheckout(c) {
    const box = $('[data-co-lines]');
    if (!box) return;
    box.innerHTML = c.length ? c.map((l) => '<div class="co-line"><span class="co-line__img"><img src="' + lineImg(l) + '" alt=""><span class="co-line__q">' + l.q + '</span></span><span>' + esc(S.products[l.id].n) + (lineVar(l) ? '<small>' + esc(lineVar(l)) + '</small>' : '') + '</span><span>' + rm(unit(l.id, l.sel) * l.q) + '</span></div>').join('')
      : '<p class="muted">Your cart is empty. <a href="shop.html">Add something first</a>.</p>';
    const z = coZone();
    const t = totals(c, z);
    $('[data-co-subtotal]').textContent = rm(t.sub);
    $('[data-co-ship]').textContent = t.ship === null ? 'Choose state' : (t.ship === 0 ? 'Free' : rm(t.ship));
    $('[data-co-total]').textContent = rm(t.total);
    $('[data-co-disc-row]').hidden = !t.disc;
    $('[data-co-disc]').textContent = '−' + rm(t.disc);
    const opt = $('[data-ship-opt]');
    if (opt) {
      if (!z) opt.innerHTML = '<p class="muted">Choose your state to see the shipping fee.</p>';
      else opt.innerHTML = '<p><b>' + (z === 'east' ? 'East Malaysia' : 'West Malaysia') + ' standard delivery</b> — ' + (t.ship === 0 ? 'Free' : rm(t.ship)) + '<br><span class="muted small">' + (z === 'east' ? '4–7' : '2–4') + ' working days · tracking number sent when it ships</span></p>';
    }
  }
  if (co) {
    co.elements.state.addEventListener('change', render);
    co.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const c = cart();
      const err = $('[data-form-error]');
      const f = co.elements;
      const bad = [];
      const need = ['email', 'phone', 'name', 'addr1', 'postcode', 'city', 'state'];
      need.forEach((n) => { f[n].classList.remove('is-bad'); if (!f[n].value.trim()) bad.push(n); });
      if (f.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) bad.push('email');
      const digits = f.phone.value.replace(/\D/g, '');
      if (f.phone.value && !/^(0|60)1\d{7,9}$/.test(digits)) bad.push('phone');
      if (f.postcode.value && !/^\d{5}$/.test(f.postcode.value.trim())) bad.push('postcode');
      if (!c.length) { err.textContent = 'Your cart is empty.'; err.hidden = false; return; }
      if (bad.length) {
        bad.forEach((n) => f[n].classList.add('is-bad'));
        err.textContent = 'Please check: ' + Array.from(new Set(bad)).map((n) => ({ email: 'email', phone: 'phone number (e.g. 012-345 6789)', name: 'name', addr1: 'address', postcode: '5-digit postcode', city: 'city', state: 'state' }[n])).join(', ') + '.';
        err.hidden = false;
        f[bad[0]].focus();
        return;
      }
      err.hidden = true;
      const z = coZone();
      const t = totals(c, z);
      const order = {
        no: S.prefix + (1000 + Math.floor(Math.random() * 9000)),
        name: f.name.value.trim().split(' ')[0],
        lines: c.map((l) => ({ n: S.products[l.id].n, v: lineVar(l), q: l.q, t: unit(l.id, l.sel) * l.q, img: lineImg(l) })),
        sub: t.sub, disc: t.disc, ship: t.ship, total: t.total,
        pay: (co.querySelector('input[name="pay"]:checked') || {}).value,
        to: f.city.value.trim() + ', ' + f.state.value
      };
      save('sessionStorage', OKEY, order);
      drop('localStorage', KEY);
      drop('localStorage', CKEY);
      location.href = 'order.html';
    });
  }

  // ---------- order page ----------
  const op = $('[data-order]');
  if (op) {
    const o = load('sessionStorage', OKEY, null);
    if (o) {
      $('[data-order-no]').textContent = '#' + o.no;
      $('[data-order-name]').textContent = o.name ? ', ' + o.name : '';
      $('[data-order-box]').innerHTML = o.lines.map((l) => '<div class="co-line"><span class="co-line__img"><img src="' + esc(l.img) + '" alt=""><span class="co-line__q">' + l.q + '</span></span><span>' + esc(l.n) + (l.v ? '<small>' + esc(l.v) + '</small>' : '') + '</span><span>' + rm(l.t) + '</span></div>').join('') +
        '<p class="row"><span>Subtotal</span><span>' + rm(o.sub) + '</span></p>' + (o.disc ? '<p class="row"><span>Discount</span><span>−' + rm(o.disc) + '</span></p>' : '') +
        '<p class="row"><span>Shipping</span><span>' + (o.ship ? rm(o.ship) : 'Free') + '</span></p><p class="row row--total"><span>Total</span><strong>' + rm(o.total) + '</strong></p>' +
        '<p class="muted small">Ship to ' + esc(o.to) + ' · Payment: ' + esc(o.pay || '') + ' (demo — not charged)</p>';
    }
  }

  render();
  document.documentElement.setAttribute('data-store', 'ready'); // check-preview.js: proves this script ran on the page
})();
