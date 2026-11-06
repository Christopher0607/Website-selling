/* Agency Core — 点击事件追踪（只有装了 GA4 / Meta Pixel 才会送出） */
(function () {
  'use strict';
  function send(name, params) {
    params = params || {};
    if (typeof window.gtag === 'function') { window.gtag('event', name, params); }
    if (typeof window.fbq === 'function') {
      if (name === 'whatsapp_click') { window.fbq('track', 'Contact', params); }
      else if (name === 'generate_lead') { window.fbq('track', 'Lead', params); }
      else { window.fbq('trackCustom', name, params); }
    }
  }
  window.agcTrack = send;
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-agc-event]') : null;
    if (!el) { return; }
    send(el.getAttribute('data-agc-event'), { location: el.getAttribute('data-agc-location') || '' });
  });
  // 自建询价表单提交成功 → generate_lead
  if (document.querySelector('[data-agc-lead-sent]')) { window.addEventListener('load', function () { send('generate_lead', { form: 'agc_lead_form' }); }); }
  // Fluent Forms 成功提交 → generate_lead
  document.addEventListener('fluentform_submission_success', function () { send('generate_lead', { form: 'fluentform' }); });
  if (window.jQuery) {
    window.jQuery(document).on('fluentform_submission_success', function () { send('generate_lead', { form: 'fluentform' }); });
  }
})();
