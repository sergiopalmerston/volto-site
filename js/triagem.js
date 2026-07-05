/* Volto — formulário direcionador com score e desfecho condicional (site v3).
   Calibragem em js/score-config.json (pesos, régua de lead quente, endpoint, Cal.com).
   Sem endpoint configurado, o envio depende do WhatsApp e a interface diz isso
   com clareza (não afirma "recebido" antes de o lead chegar de fato à Volto).
   Sem Cal.com, o desfecho quente também cai no WhatsApp com mensagem pronta. */
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

  // Rótulos legíveis para a mensagem do WhatsApp (o dono vê o texto antes de enviar).
  var LABELS = {
    area: {
      'financeiro': 'Organizar o dinheiro / lucro', 'vendas': 'Vender mais', 'operacao': 'Rotina, processos e equipe',
      'sistema': 'Sistema para o dia a dia', 'marca': 'Marca / identidade', 'site': 'Site ou página',
      'automacao': 'Automatizar tarefas', 'nao-sei': 'Não sei dizer'
    },
    controle: { 'caderno': 'caderno / papel', 'planilha': 'planilha', 'whatsapp': 'WhatsApp', 'sistema': 'um sistema', 'memoria': 'na memória', 'equipe': 'a equipe resolve', 'outro': 'outro' },
    porte: { 'so-eu': 'só eu', '2-5': '2 a 5 pessoas', '6-10': '6 a 10 pessoas', '11-25': '11 a 25 pessoas', '26-mais': '26 ou mais' },
    inicio: { 'agora': 'agora', '30-dias': 'nos próximos 30 dias', '60-dias': 'em 60 dias', 'sem-pressa': 'sem pressa' }
  };
  function lbl(campo, v) { return (LABELS[campo] && LABELS[campo][v]) || v; }

  // merge raso das seções conhecidas: JSON parcial não zera as demais chaves nem quebra o submit
  function mergeCfg(j) {
    if (!j || typeof j !== 'object') return DEFAULTS;
    var c = {
      endpoint: typeof j.endpoint === 'string' ? j.endpoint : DEFAULTS.endpoint,
      cal: (j.cal && typeof j.cal === 'object') ? { link: j.cal.link || '' } : DEFAULTS.cal,
      whatsapp: j.whatsapp || DEFAULTS.whatsapp,
      retornoHorasUteis: j.retornoHorasUteis || DEFAULTS.retornoHorasUteis,
      pesos: {},
      quente: Object.assign({}, DEFAULTS.quente, j.quente || {}),
      trilhas: Object.assign({}, DEFAULTS.trilhas, j.trilhas || {})
    };
    var jp = j.pesos || {};
    ['urgencia', 'orcamento', 'porte', 'faturamento'].forEach(function (k) {
      c.pesos[k] = Object.assign({}, DEFAULTS.pesos[k], jp[k] || {});
    });
    return c;
  }

  var cfg = DEFAULTS;
  fetch('js/score-config.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { cfg = mergeCfg(j); })
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
      'Área mais urgente: ' + lbl('area', p.area),
      'Problema: ' + p.problema,
      'Como controla hoje: ' + lbl('controle', p.controle),
      'Tamanho: ' + lbl('porte', p.porte),
      'Quando quer começar: ' + lbl('inicio', p.inicio),
      p.desfecho === 'quente-agendamento' ? 'Quero agendar a triagem de 20 minutos.' : 'Aguardo o retorno de vocês.'
    ];
    return 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(linhas.join('\n'));
  }

  // Envia ao sistema (app.voltoconsultoria.com.br/api/triagem). Devolve o corpo
  // da resposta ({ ok, score, quente, desfecho, trilha }) ou null se falhar —
  // aí o formulário cai no fallback do WhatsApp e no cálculo local.
  function enviaEndpoint(payload) {
    if (!cfg.endpoint) return Promise.resolve(null);
    return fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.ok ? r.json().catch(function () { return null; }) : null; })
      .catch(function () { return null; });
  }

  function mostraCal(container) {
    // Embed inline oficial do Cal.com; só roda quando cfg.cal.link estiver configurado.
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal, ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }, namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    window.Cal('init', { origin: 'https://cal.com' });
    window.Cal('inline', { elementOrSelector: container, calLink: cfg.cal.link, config: { layout: 'month_view' } });
  }

  function esconde(el) { if (el) el.hidden = true; }
  function mostra(el) { if (el) el.hidden = false; }
  function txt(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

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

      var rLocal = calcula(form);
      var trilha = trilhaDe(form);
      var payload = montaPayload(form, rLocal, trilha);
      var linkZap = textoWhats(payload);
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.rotulo = btn.textContent; btn.textContent = 'Enviando…'; }

      enviaEndpoint(payload).then(function (resp) {
        // O sistema é a fonte de verdade do cálculo; sem resposta, usa o local (fallback).
        var srvOk = !!(resp && resp.ok);
        var r = srvOk ? { quente: !!resp.quente, score: resp.score } : rLocal;
        var entregue = srvOk;
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
        } else {
          esconde(painelForm); mostra(painelRetorno);
          var canal = val(form, 'canal') === 'email' ? 'e-mail' : 'WhatsApp';
          var horas = String(cfg.retornoHorasUteis || 4);
          var zap = document.getElementById('retorno-whats');
          var cta = document.getElementById('retorno-cta');
          if (zap) zap.href = linkZap;
          if (entregue) {
            // endpoint confirmou o recebimento: o lead já está com a Volto
            txt('retorno-eyebrow', 'Recebido');
            txt('retorno-titulo', 'Obrigado — suas respostas chegaram');
            txt('retorno-texto', 'Retornamos em até ' + horas + ' horas úteis pelo ' + canal + ', já com uma leitura inicial do seu caso e o caminho sugerido.');
            esconde(cta);
          } else {
            // sem endpoint (ou falha): o envio pelo WhatsApp é o que faz o lead chegar
            txt('retorno-eyebrow', 'Falta um passo');
            txt('retorno-titulo', 'Só falta enviar suas respostas');
            txt('retorno-texto', 'Toque no botão abaixo para enviar o que você preencheu pelo WhatsApp — a mensagem já vai pronta. Assim retornamos em até ' + horas + ' horas úteis com uma leitura inicial do seu caso.');
            mostra(cta);
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
