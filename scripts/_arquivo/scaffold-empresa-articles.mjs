#!/usr/bin/env node
/**
 * Gera os 3 artigos empresariais curtos (PROMPT 6A).
 * Uso: node scripts/scaffold-empresa-articles.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.correiacrespo-advogados.pt';
const REVISION_LABEL = '16 de junho de 2026';
const DATE = '2026-06-16';

const EDITORIAL_NOTE = `    <aside class="editorial-note" aria-labelledby="editorial-responsavel">
      <h2 class="editorial-note__title" id="editorial-responsavel">Responsável pelo conteúdo</h2>
      <p class="editorial-note__name"><strong>Luís Correia Crespo</strong>, Advogado</p>
      <p class="editorial-note__meta">Cédula profissional OA n.º 67709L</p>
      <p class="editorial-note__meta">Última revisão: ${REVISION_LABEL}</p>
      <p class="editorial-note__meta">Natureza: informação geral, não substitui consulta jurídica.</p>
    </aside>`;

const LEGAL_NOTE =
  'Este artigo tem natureza informativa. Não substitui consulta jurídica, não dispensa análise documental e não representa promessa de resultado. A atuação concreta depende dos factos, dos documentos, dos prazos, da prova disponível, da verificação de conflitos de interesses e da aceitação de mandato.';

const ARTICLES = [
  {
    file: 'fatura-por-cobrar-empresa.html',
    slug: 'fatura-por-cobrar-empresa',
    breadcrumb: 'Fatura por cobrar',
    title: 'Fatura por cobrar: primeiros passos para empresas | Correia Crespo — Advogados',
    ogTitle: 'Fatura por cobrar: primeiros passos para empresas | Correia Crespo',
    twitterTitle: 'Fatura por cobrar: primeiros passos para empresas',
    description:
      'Cliente não pagou uma fatura? Veja que documentos reunir e que cuidados ter antes de avançar para cobrança, injunção, ação ou execução.',
    headline: 'Fatura por cobrar: primeiros passos para empresas',
    lead:
      'Quando uma fatura fica por pagar, a empresa deve evitar agir apenas por impulso. Antes de enviar uma comunicação formal ou avançar para cobrança, é importante perceber se a dívida está bem documentada.',
    resumo: [
      'Confirmar valor, vencimento e identificação do devedor.',
      'Reunir faturas, contrato, proposta, mensagens e prova de entrega ou serviço.',
      'Verificar se houve pagamentos parciais ou reclamações.',
      'Avaliar a via adequada antes de avançar.',
    ],
    sections: [
      {
        id: 'confirmar-divida',
        title: 'Confirmar o que está em dívida',
        text: 'Comece por confirmar o valor em aberto, a data de vencimento, a entidade devedora e se existem pagamentos parciais. Em pequenas empresas, é comum haver várias conversas, mensagens e promessas de pagamento dispersas. Organizar essa informação evita decisões precipitadas.',
        extra:
          'Na Lourinhã e no Oeste, muitas PME trabalham com clientes recorrentes. Mesmo numa relação de confiança, convém manter registo claro do que ficou por liquidar.',
      },
      {
        id: 'prova-fatura',
        title: 'Ver se a fatura está acompanhada de prova',
        text: 'A fatura é importante, mas pode não bastar. Pode ser necessário demonstrar que houve encomenda, prestação de serviço, entrega de produto, aceitação da proposta ou reconhecimento da dívida.',
        extra:
          'Se o cliente contestar o valor, a data ou a prestação, a prova disponível passa a ser o ponto central da análise.',
      },
      {
        id: 'comunicar-cuidado',
        title: 'Comunicar com cuidado',
        text: 'Antes de avançar, pode ser útil reunir as comunicações já existentes. Uma comunicação mal preparada pode criar ruído, especialmente se o cliente invoca defeitos, atrasos ou divergência no preço.',
        extra:
          'Uma cronologia simples — datas, valores, mensagens e promessas de pagamento — ajuda a preparar o contacto com o devedor ou a consulta jurídica.',
      },
      {
        id: 'cobranca-formal',
        title: 'Quando ponderar cobrança formal',
        text: 'Dependendo dos documentos, do valor e da posição do devedor, podem ser ponderadas vias extrajudiciais, injunção, ação ou execução. A escolha deve ser feita depois de análise do caso concreto.',
        extra:
          'Para mais contexto sobre vias de cobrança, pode consultar a página sobre <a href="cobranca-dividas-empresas.html">cobrança de dívidas para empresas</a> e, se o contrato estiver em causa, a de <a href="contratos-comerciais-empresas.html">contratos comerciais</a>.',
      },
    ],
    documentos: [
      'Fatura.',
      'Contrato, proposta ou orçamento.',
      'Emails e mensagens.',
      'Guias de entrega ou transporte.',
      'Comprovativos de pagamento parcial.',
      'Identificação completa do devedor.',
      'Extrato de conta corrente.',
      'Reclamações recebidas, se existirem.',
    ],
    evitar: [
      'Apagar mensagens ou emails.',
      'Enviar comunicações agressivas.',
      'Aceitar novos adiamentos sem registo escrito.',
      'Avançar sem confirmar a identificação correta do devedor.',
      'Ignorar reclamações do cliente sem as documentar.',
    ],
    faq: [
      [
        'A fatura basta para avançar?',
        'Nem sempre. A fatura é relevante, mas pode ser necessário demonstrar o contrato, a encomenda, a entrega, a prestação do serviço ou outras comunicações.',
      ],
      [
        'Devo enviar uma carta antes de tribunal?',
        'Depende do caso. Em algumas situações pode ser útil; noutras, a prioridade pode ser confirmar prazos, prova e via adequada.',
      ],
      [
        'O cliente disse que vai pagar. Devo esperar?',
        'Depende do valor, do prazo, do histórico e da prova existente. Se houver novo prazo, é prudente que fique documentado.',
      ],
    ],
    related: [
      ['cobranca-dividas-empresas.html', 'Cobrança de dívidas para empresas'],
      ['contratos-comerciais-empresas.html', 'Contratos comerciais e prestação de serviços'],
      ['consulta-juridica.html#pedido-consulta', 'Consulta jurídica'],
    ],
  },
  {
    file: 'trabalhos-extra-obra-nao-pagos.html',
    slug: 'trabalhos-extra-obra-nao-pagos',
    breadcrumb: 'Trabalhos extra em obra',
    title: 'Trabalhos extra em obra não pagos | Correia Crespo — Advogados',
    ogTitle: 'Trabalhos extra em obra não pagos | Correia Crespo',
    twitterTitle: 'Trabalhos extra em obra não pagos',
    description:
      'Trabalhos extra em obra, alterações ao orçamento e pagamentos retidos: documentos que empresas de construção e subempreiteiros devem reunir.',
    headline: 'Trabalhos extra em obra não pagos: que cuidados ter',
    lead:
      'Na construção civil, os trabalhos extra são uma das fontes mais frequentes de conflito. O problema agrava-se quando as alterações foram combinadas verbalmente ou por mensagens dispersas.',
    resumo: [
      'Identificar que trabalhos estavam incluídos no orçamento inicial.',
      'Separar trabalhos contratados de trabalhos extra.',
      'Reunir mensagens, fotografias, autos, faturas e comprovativos.',
      'Analisar se o cliente aceitou ou beneficiou dos trabalhos.',
    ],
    sections: [
      {
        id: 'separar-orcamento',
        title: 'Separar o orçamento inicial dos trabalhos extra',
        text: 'O primeiro passo é perceber o que estava incluído no preço inicial e o que surgiu depois. Em obras e remodelações, pequenas alterações podem acumular valores relevantes.',
        extra:
          'Em obras na Lourinhã e no Oeste, é frequente haver alterações pedidas no local. Sem registo, cada parte pode recordar o acordo de forma diferente.',
      },
      {
        id: 'prova-alteracao',
        title: 'Procurar prova da alteração',
        text: 'Mesmo quando não há contrato escrito detalhado, podem existir mensagens, emails, fotografias, autos de medição, notas de encomenda, faturas ou testemunhos que ajudem a reconstruir o que foi pedido e executado.',
        extra:
          'Fotografias da obra, listas de materiais e comunicações sobre prazos podem complementar a prova escrita.',
      },
      {
        id: 'reclamacoes-defeitos',
        title: 'Atenção às reclamações de defeitos',
        text: 'É comum o cliente invocar defeitos, atrasos ou desacordo sobre o preço para reter pagamento. Essas reclamações devem ser documentadas e analisadas com cuidado, sem resposta impulsiva.',
        extra:
          'Uma resposta apressada por mensagem pode ser usada depois como prova. Convém ler o que já existe antes de responder.',
      },
      {
        id: 'subempreitadas',
        title: 'Subempreiteiros e cadeia de pagamentos',
        text: 'Nas subempreitadas, pode haver várias partes envolvidas. É importante perceber com quem foi feito o acordo, quem pediu os trabalhos, quem os aceitou e quem ficou responsável pelo pagamento.',
        extra:
          'Para o enquadramento geral deste tipo de conflito, veja também <a href="construcao-civil-obras-subempreitadas.html">construção civil, obras e subempreitadas</a> e <a href="cobranca-dividas-empresas.html">cobrança de dívidas para empresas</a>.',
      },
    ],
    documentos: [
      'Orçamento inicial.',
      'Contrato ou proposta aceite.',
      'Mensagens e emails.',
      'Fotografias da obra.',
      'Autos de medição, se existirem.',
      'Faturas.',
      'Lista de trabalhos extra.',
      'Comprovativos de pagamento parcial.',
    ],
    evitar: [
      'Continuar trabalhos extra sem qualquer registo.',
      'Misturar tudo numa conta final sem explicação.',
      'Ignorar reclamações de defeitos.',
      'Responder de forma agressiva por mensagem.',
      'Avançar contra a parte errada sem confirmar a relação contratual.',
    ],
    faq: [
      [
        'Trabalhos extra combinados verbalmente podem ser cobrados?',
        'Podem existir situações em que sim, mas a dificuldade estará muitas vezes na prova. Mensagens, fotografias, faturas e outros elementos podem ser relevantes.',
      ],
      [
        'O cliente pode reter pagamento por alegar defeitos?',
        'A resposta depende dos factos, do contrato, da natureza dos defeitos alegados, das comunicações e da prova existente.',
      ],
      [
        'O subempreiteiro pode cobrar ao dono da obra?',
        'Depende da relação contratual e dos documentos existentes. É necessário perceber quem contratou, quem aceitou os trabalhos e quem assumiu o pagamento.',
      ],
    ],
    related: [
      ['construcao-civil-obras-subempreitadas.html', 'Construção civil, obras e subempreitadas'],
      ['cobranca-dividas-empresas.html', 'Cobrança de dívidas para empresas'],
      ['consulta-juridica.html#pedido-consulta', 'Consulta jurídica'],
    ],
  },
  {
    file: 'produto-agricola-entregue-nao-pago.html',
    slug: 'produto-agricola-entregue-nao-pago',
    breadcrumb: 'Produto agrícola não pago',
    title: 'Produto agrícola entregue e não pago | Correia Crespo — Advogados',
    ogTitle: 'Produto agrícola entregue e não pago | Correia Crespo',
    twitterTitle: 'Produto agrícola entregue e não pago',
    description:
      'Produto agrícola entregue sem pagamento: faturas, guias, mensagens, acordos verbais e documentos úteis para produtores e empresas agrícolas.',
    headline: 'Produto agrícola entregue e não pago: que documentos reunir',
    lead:
      'Na agricultura e produção, muitos negócios assentam em confiança e rapidez. Quando o produto é entregue e o pagamento falha, a documentação disponível torna-se essencial.',
    resumo: [
      'Reunir faturas, guias, mensagens e prova de entrega.',
      'Confirmar quantidades, datas, preço e identificação do comprador.',
      'Guardar comunicações sobre promessas ou adiamentos de pagamento.',
      'Avaliar a cobrança com base nos documentos existentes.',
    ],
    sections: [
      {
        id: 'confirmar-entrega',
        title: 'Confirmar entrega, preço e comprador',
        text: 'O primeiro passo é confirmar o que foi entregue, em que data, a quem, por que preço e se existiu pagamento parcial. Em fornecimentos agrícolas, a pressa da campanha ou a relação de confiança pode deixar documentação incompleta.',
        extra:
          'No Oeste, fornecimentos sazonais e relações comerciais antigas são comuns. Ainda assim, convém saber exatamente que entrega corresponde a que valor em aberto.',
      },
      {
        id: 'acordos-verbais',
        title: 'Acordos verbais e prova',
        text: 'Um acordo verbal pode existir, mas pode ser difícil de provar. Guias, faturas, mensagens, notas de encomenda, transferências, registos de transporte e testemunhos podem ajudar a reconstruir a relação comercial.',
        extra:
          'Quanto mais cedo a empresa organizar estes elementos, mais fácil será perceber que caminho faz sentido analisar.',
      },
      {
        id: 'produto-perecivel',
        title: 'Produto perecível e urgência comercial',
        text: 'Quando está em causa produto perecível, o tempo pode tornar o conflito mais sensível. Ainda assim, antes de avançar, é importante organizar os elementos disponíveis e evitar comunicações precipitadas.',
        extra:
          'A urgência da campanha não deve levar a apagar mensagens ou a aceitar promessas vagas de pagamento sem registo.',
      },
      {
        id: 'relacao-antiga',
        title: 'Quando há relação comercial antiga',
        text: 'Em relações comerciais antigas, podem existir contas correntes, pagamentos parciais, fornecimentos sucessivos e acordos informais. Nesses casos, a cronologia dos fornecimentos e pagamentos é especialmente importante.',
        extra:
          'Para o enquadramento geral, veja <a href="agricultura-fornecimentos-pagamentos.html">agricultura, fornecimentos e pagamentos</a> e <a href="cobranca-dividas-empresas.html">cobrança de dívidas para empresas</a>.',
      },
    ],
    documentos: [
      'Faturas.',
      'Guias de transporte ou entrega.',
      'Mensagens e emails.',
      'Notas de encomenda.',
      'Comprovativos de pagamento parcial.',
      'Identificação do comprador ou intermediário.',
      'Registos de quantidades e datas.',
      'Extrato de conta corrente, se existir.',
    ],
    evitar: [
      'Entregar novos produtos sem registo quando há dívida anterior.',
      'Apagar mensagens.',
      'Aceitar sucessivos adiamentos sem prova escrita.',
      'Misturar fornecimentos diferentes sem cronologia.',
      'Avançar sem confirmar quem é o verdadeiro devedor.',
    ],
    faq: [
      [
        'Sem contrato escrito, posso cobrar?',
        'Pode haver situações em que sim, mas será necessário avaliar a prova disponível: faturas, guias, mensagens, pagamentos, encomendas ou testemunhos.',
      ],
      [
        'As guias de transporte são importantes?',
        'Podem ser relevantes para demonstrar entrega, datas, quantidades e identificação das partes envolvidas.',
      ],
      [
        'O comprador prometeu pagar depois da campanha. O que fazer?',
        'É prudente documentar o prazo, o valor e o reconhecimento da dívida, sem deixar que a situação fique indefinida.',
      ],
    ],
    related: [
      ['agricultura-fornecimentos-pagamentos.html', 'Agricultura, fornecimentos e pagamentos'],
      ['cobranca-dividas-empresas.html', 'Cobrança de dívidas para empresas'],
      ['consulta-juridica.html#pedido-consulta', 'Consulta jurídica'],
    ],
  },
];

function escJson(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function listItems(items) {
  return items.map((i) => `        <li>${i}</li>`).join('\n');
}

function faqJson(faq) {
  return faq
    .map(
      ([q, a]) => `        {
          "@type": "Question",
          "name": "${escJson(q)}",
          "acceptedAnswer": { "@type": "Answer", "text": "${escJson(a)}" }
        }`
    )
    .join(',\n');
}

function faqHtml(faq) {
  return faq
    .map(
      ([q, a]) => `        <button class="acc-item" type="button" aria-expanded="false">
          <span>${q}</span>
          <span class="acc-icon">+</span>
        </button>
        <div class="acc-panel" hidden>
          <p>${a}</p>
        </div>`
    )
    .join('\n');
}

function sectionsHtml(sections) {
  return sections
    .map(
      (s) => `    <section aria-labelledby="${s.id}">
      <h2 id="${s.id}">${s.title}</h2>
      <p>${s.text}</p>
      <p>${s.extra}</p>
    </section>`
    )
    .join('\n\n');
}

function relatedHtml(related) {
  return related
    .map(([href, label]) => `        <li><a href="${href}">${label}</a></li>`)
    .join('\n');
}

function renderArticle(a) {
  const url = `${SITE}/${a.file}`;
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="index,follow" />

  <title>${a.title}</title>
  <meta name="description" content="${a.description}" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Correia Crespo — Advogados" />
  <meta property="og:locale" content="pt_PT" />
  <meta property="og:title" content="${a.ogTitle}" />
  <meta property="og:description" content="${a.description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}/assets/img/og.jpg" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${a.twitterTitle}" />
  <meta name="twitter:description" content="${a.description}" />
  <meta name="twitter:image" content="${SITE}/assets/img/og.jpg" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/main.css" />

  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "${url}#article",
      "headline": "${escJson(a.headline)}",
      "description": "${escJson(a.description)}",
      "datePublished": "${DATE}",
      "dateModified": "${DATE}",
      "author": {
        "@type": "Person",
        "@id": "${SITE}/sobre.html#luis-correia-crespo",
        "name": "Luís Correia Crespo"
      },
      "publisher": {
        "@type": "LegalService",
        "@id": "${SITE}/#legal-service",
        "name": "Correia Crespo — Advogados",
        "url": "${SITE}/"
      },
      "url": "${url}",
      "inLanguage": "pt-PT",
      "isPartOf": { "@id": "${SITE}/#website" },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "${url}"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Início", "item": "${SITE}/" },
        { "@type": "ListItem", "position": 2, "name": "Empresas", "item": "${SITE}/empresas.html" },
        { "@type": "ListItem", "position": 3, "name": "${escJson(a.breadcrumb)}", "item": "${url}" }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "${url}#faq",
      "mainEntity": [
${faqJson(a.faq)}
      ]
    }
  ]
}
  </script>
  <link rel="icon" type="image/svg+xml" href="assets/img/logo-mark.svg" />
  <link rel="manifest" href="site.webmanifest" />
  <meta name="theme-color" content="#5c1829" />
</head>
<body class="site-page" data-site-base="" data-current-nav="empresas" data-ga-id="G-NGDK1RD6Y3">
  <a class="skip-link" href="#conteudo">Saltar para o conteúdo</a>

  <div id="site-header-mount"></div>

  <main id="conteudo" class="container page">
    <nav class="page-breadcrumb muted" aria-label="Breadcrumb">
      <a href="index.html">Início</a> <span aria-hidden="true">›</span>
      <a href="empresas.html">Empresas</a> <span aria-hidden="true">›</span>
      <span aria-current="page">${a.breadcrumb}</span>
    </nav>

    <h1>${a.headline}</h1>
    <p class="lead">${a.lead}</p>

    <section aria-labelledby="${a.slug}-resumo">
      <h2 id="${a.slug}-resumo">Resumo rápido</h2>
      <ul class="mini-list">
${listItems(a.resumo)}
      </ul>
    </section>

${sectionsHtml(a.sections)}

    <section aria-labelledby="${a.slug}-docs">
      <h2 id="${a.slug}-docs">Documentos úteis</h2>
      <ul class="mini-list">
${listItems(a.documentos)}
      </ul>
    </section>

    <section aria-labelledby="${a.slug}-evitar">
      <h2 id="${a.slug}-evitar">O que evitar</h2>
      <ul class="mini-list">
${listItems(a.evitar)}
      </ul>
    </section>

    <section aria-labelledby="${a.slug}-rel">
      <h2 id="${a.slug}-rel">Leitura relacionada</h2>
      <ul class="mini-list">
${relatedHtml(a.related)}
      </ul>
    </section>

    <section class="faq" aria-label="Perguntas frequentes">
      <h2 class="faq-title">Perguntas frequentes</h2>
      <div class="accordion" data-accordion>
${faqHtml(a.faq)}
      </div>
    </section>

    <section class="consulta-booking" aria-labelledby="${a.slug}-cta">
      <h2 class="consulta-booking__title" id="${a.slug}-cta">Consulta jurídica para empresa</h2>
      <p class="consulta-booking__intro">Se a empresa tem documentos, comunicações ou prazos a analisar, pode enviar um pedido inicial com descrição objetiva do assunto. A análise depende dos factos, da documentação disponível e da aceitação de mandato.</p>
      <div class="consulta-booking__actions">
        <a class="btn primary" href="consulta-juridica.html#pedido-consulta">Pedir consulta jurídica</a>
        <a class="btn secondary" href="empresas.html">Ver área Empresas</a>
      </div>
      <p class="consulta-booking__note">O envio de pedido inicial não cria, por si só, relação advogado-cliente nem substitui consulta jurídica.</p>
    </section>

    <section class="section legal-site-note" aria-labelledby="${a.slug}-nota">
      <h2 class="section-title legal-site-note__title" id="${a.slug}-nota">Nota informativa</h2>
      <p class="muted legal-site-note__text">${LEGAL_NOTE}</p>
    </section>

${EDITORIAL_NOTE}
  </main>

  <div id="site-footer-mount"></div>

  <script src="assets/js/main.js"></script>
</body>
</html>
`;
}

const writeMode = process.argv.includes('--write');

if (!writeMode) {
  console.log('Modo validação: 3 artigos prontos a gerar. Uso: node scripts/scaffold-empresa-articles.mjs --write');
  process.exit(0);
}

for (const a of ARTICLES) {
  fs.writeFileSync(path.join(ROOT, a.file), renderArticle(a), 'utf8');
  console.log('OK', a.file);
}
