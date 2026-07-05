(function () {
  var form = document.getElementById('form-exemplo');
  if (!form) return;
  var CFG = { endpoint: '', whatsapp: '' };
  fetch('js/score-config.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (j) {
        CFG.endpoint = j.exemploEndpoint || (j.endpoint ? j.endpoint.replace(/\/api\/triagem$/, '/api/exemplo') : '');
        CFG.whatsapp = j.whatsapp || '';
      }
    })
    .catch(function () {});
  var msg = document.getElementById('exemplo-msg');
  var btn = document.getElementById('exemplo-submit');
  function show(t) { if (msg) { msg.textContent = t; msg.hidden = false; } }
  function reativa() { if (btn) { btn.disabled = false; } }
  var whatsMsg = function () { return 'Não foi possível agora. Fale no WhatsApp' + (CFG.whatsapp ? ': ' + CFG.whatsapp : '.'); };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var hp = form.querySelector('[name=website]');
    if (hp && hp.value) { return; }
    var email = (form.querySelector('[name=email]') || {}).value || '';
    var consent = !!(form.querySelector('[name=consent]') || {}).checked;
    if (!consent) { show('Marque o consentimento para receber o material.'); return; }
    if (!CFG.endpoint) { show(whatsMsg()); return; }
    if (btn) { btn.disabled = true; }
    fetch(CFG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: email, consent: consent, origem: 'exemplo-360' })
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.ok && res.body.downloadUrl) {
          show('O download começou. Se quiser ver como isso ficaria no seu negócio, o primeiro passo é a triagem.');
          window.location.href = res.body.downloadUrl;
        } else if (res.status === 400) { show('Confira o e-mail digitado.'); reativa(); }
        else if (res.status === 429) { show('Muitas tentativas agora. Tente de novo em alguns minutos ou fale no WhatsApp.'); reativa(); }
        else { show(whatsMsg()); reativa(); }
      })
      .catch(function () { show(whatsMsg()); reativa(); });
  });
})();
