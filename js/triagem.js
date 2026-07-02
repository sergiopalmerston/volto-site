/* Volto — formulário direcionador com score e desfecho condicional (site v3).
   Calibragem em js/score-config.json (pesos, régua de lead quente, endpoint, Cal.com).
   Sem endpoint configurado, o envio segue pelo WhatsApp; sem Cal.com, o desfecho
   quente também cai no WhatsApp com mensagem pronta. */
(function () {
  'use strict';

  var DEFAULTS = {
    endpoint: '',
    cal: { link: '' },
    whatsapp: '5564992686208',
    retornoHorasUteis: 4,
    pesos: {
      urgencia: { 'agora': 3, '30-dias': 2, '60-dias': 1, 'sem-pressa': 0 },
      orcamento: { 'acima-15-mil': 3, '7-15-mil': 3, '3-7-mil': 3, '1-3-mil': 2, 'ate-1-mil': 1, 'depende': 2, 'ainda-nao': 0 },
      porte: { '26-mais': 2, '11-25': 2, '6-10': 2, '2-5': 1, 'so-eu': 0 },
      faturamento: { 'acima-300-mil': 3, '100-300-mil': 3, '50-100-mil': 2, '20-50-mil': 1, 'ate-20-mil': 0, 'nao-informado': 1 }
    },
    quente: { scoreMinimo: 6, orcamentoMinimo: 2, faturamentoMinimo: 2 },
    trilhas: {
      'financeiro': { rotulo: 'Organizar o dinheiro / lucro', pagina: 'reorganizacao-financeira' },
      'vendas': { rotulo: 'Vender mais', pagina: 'posicionamento-marca-vendas' },
      'operacao': { rotulo: 'Rotina, processos e equipe', pagina: 'diagnostico-360' },
      'sistema': { rotulo: 'Sistema para o dia a dia', pagina: 'sistemas-de-gestao' },
      'marca': { rotulo: 'Marca / identidade', pagina: 'posicionamento-marca-vendas' },
      'site': { rotulo: 'Site ou página', pagina: 'sites-operaveis' },
      'automacao': { rotulo: 'Automatizar tarefas', pagina: 'automacoes-e-ia' },
      'nao-sei': { rotulo: 'Não sei dizer', pagina: 'diagnostico-360' }
    }
  };

  var cfg = DEFAULTS;
  fetch('js/score-config.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.pesos) cfg = j; })
    .catch(function () { /* mantém defaults embutidos */ });

  function val(form, name) {
    var el = form.elements[name];
    return el && el.value ? String(el.value).trim() : '';
  }

  function peso(tabela, chave, fallback) {
    if (!chave) return fallback;
    var t = cfg.pesos[tabela] || {};
    return (chave in t) ? t[chave] : fallback;
  }

  function calcula(form) {
    var urg = peso('urgencia', val(form, 'inicio'), 0);
    var orc = peso('orcamento', val(form, 'orcamento') || 'ainda-nao', 0);
    var pte = peso('porte', val(form, 'porte'), 0);
    var fat = peso('faturamento', val(form, 'faturamento') || 'nao-informado', 1);
    var score = urg + orc + pte + fat;
    var q = cfg.quente;
    var quente = score >= q.scoreMinimo && (orc >= q.orcamentoMinimo || fat >= q.faturamentoMinimo);
    return { score: score, quente: quente, partes: { urgencia: urg, orcamento: orc, porte: pte, faturamento: fat } };
  }

  function trilhaDe(form) {
    var k = val(form, 'area') || 'nao-sei';
    return cfg.trilhas[k] || cfg.trilhas['nao-sei'];
  }

  function montaPayload(form, r, trilha) {
    return {
      origem: 'site-v3/contato',
      area: val(form, 'area'),
      trilha: trilha.pagina,
      problema: val(form, 'problema'),
      controle: val(form, 'controle'),
      porte: val(form, 'porte'),
      faturamento: val(form, 'faturamento') || 'nao-informado',
      inicio: val(form, 'inicio'),
      orcamento: val(form, 'orcamento') || 'ainda-nao',
      nome: val(form, 'nome'),
      canal: val(form, 'canal'),
      contato: val(form, 'contato'),
      score: r.score,
      desfecho: r.quente ? 'quente-agendamento' : 'retorno-assincrono'
    };
  }

  function textoWhats(p) {
    var linhas = [
      'Olá! Preenchi o formulário no site da Volto.',
      '',
      'Nome: ' + p.nome,
      'Área mais urgente: ' + p.area,
      'Problema: ' + p.problema,
      'Como controla hoje: ' + p.controle,
      'Tamanho: ' + p.porte,
      'Quando quer começar: ' + p.inicio,
      p.desfecho === 'quente-agendamento' ? 'Quero agendar a triagem de 20 minutos.' : 'Aguardo o retorno de vocês.'
    ];
    return 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(linhas.join('\n'));
  }

  function enviaEndpoint(payload) {
    if (!cfg.endpoint) return Promise.resolve(false);
    return fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function mostraCal(container) {
    // Embed inline oficial do Cal.com; só roda quando cfg.cal.link estiver configurado.
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal, ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }, namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    window.Cal('init', { origin: 'https://cal.com' });
    window.Cal('inline', { elementOrSelector: container, calLink: cfg.cal.link, config: { layout: 'month_view' } });
  }

  function esconde(el) { if (el) el.hidden = true; }
  function mostra(el) { if (el) el.hidden = false; }

  function init() {
    var form = document.getElementById('triagem');
    if (!form) return;

    var painelForm = document.getElementById('painel-form');
    var painelQuente = document.getElementById('desfecho-quente');
    var painelRetorno = document.getElementById('desfecho-retorno');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (val(form, '_gotcha')) return; // honeypot: bot preencheu, descarta em silêncio

      var r = calcula(form);
      var trilha = trilhaDe(form);
      var payload = montaPayload(form, r, trilha);
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.rotulo = btn.textContent; btn.textContent = 'Enviando…'; }

      enviaEndpoint(payload).then(function (entregue) {
        var linkZap = textoWhats(payload);
        if (r.quente) {
          esconde(painelForm); mostra(painelQuente);
          var calBox = document.getElementById('cal-inline');
          var zapBox = document.getElementById('quente-whats');
          if (cfg.cal && cfg.cal.link) {
            mostra(calBox); mostraCal('#cal-inline');
            var alt = document.getElementById('quente-whats-alt');
            if (alt) { alt.href = linkZap; mostra(alt.closest('p') || alt); }
          } else {
            esconde(calBox);
            if (zapBox) { zapBox.href = linkZap; mostra(zapBox); }
          }
          if (!entregue && !cfg.endpoint && zapBox && cfg.cal && cfg.cal.link) {
            // sem endpoint, o registro do lead depende do WhatsApp ou do próprio Cal.com
            zapBox.href = linkZap;
          }
        } else {
          esconde(painelForm); mostra(painelRetorno);
          var canal = val(form, 'canal') === 'email' ? 'e-mail' : 'WhatsApp';
          var slot = document.getElementById('retorno-canal');
          if (slot) slot.textContent = canal;
          var horas = document.getElementById('retorno-horas');
          if (horas) horas.textContent = String(cfg.retornoHorasUteis || 4);
          var zap = document.getElementById('retorno-whats');
          if (zap) {
            zap.href = linkZap;
            // sem endpoint configurado, o envio pelo WhatsApp é o que registra o lead
            if (!entregue) mostra(zap.closest('.btn-row') || zap); else esconde(zap.closest('.btn-row') || zap);
          }
        }
        var topo = r.quente ? painelQuente : painelRetorno;
        if (topo && topo.scrollIntoView) topo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.rotulo || 'Enviar'; }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
