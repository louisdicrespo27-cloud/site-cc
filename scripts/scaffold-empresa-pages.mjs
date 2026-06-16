#!/usr/bin/env node
// Este script regenera páginas empresariais. Após alterações manuais relevantes,
// validar sempre bloco editorial, JSON-LD, sitemap e deontologia antes de publicar.
//
// Uso: node scripts/scaffold-empresa-pages.mjs --write
// Sem --write: apenas valida o template (não altera ficheiros HTML).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.correiacrespo-advogados.pt';
const REVISION_LABEL = '16 de junho de 2026';

const EDITORIAL_NOTE = `    <aside class="editorial-note" aria-labelledby="editorial-responsavel">
      <h2 class="editorial-note__title" id="editorial-responsavel">Responsável pelo conteúdo</h2>
      <p class="editorial-note__name"><strong>Luís Correia Crespo</strong>, Advogado</p>
      <p class="editorial-note__meta">Cédula profissional OA n.º 67709L</p>
      <p class="editorial-note__meta">Última revisão: ${REVISION_LABEL}</p>
      <p class="editorial-note__meta">Natureza: informação geral, não substitui consulta jurídica.</p>
    </aside>`;

const PAGES = [
  {
    file: 'cobranca-dividas-empresas.html',
    slug: 'cobranca-dividas-empresas',
    breadcrumb: 'Cobrança de dívidas para empresas',
    title: 'Cobrança de dívidas para empresas | Correia Crespo — Advogados',
    description: 'Cobrança de faturas e dívidas comerciais para PME, construção, agricultura, comércio e serviços. Análise de documentos, prazos e vias possíveis.',
    h1: 'Cobrança de dívidas para empresas',
    lead: 'Quando uma empresa tem faturas por receber, o primeiro passo não deve ser agir no escuro. É necessário perceber que documentos existem, que comunicações foram trocadas, se houve pagamentos parciais e qual pode ser a via juridicamente adequada.',
    serviceName: 'Cobrança de dívidas para empresas',
    resumo: [
      'Verificar se a dívida está documentada.',
      'Reunir faturas, contratos, mensagens, guias ou comprovativos.',
      'Confirmar quem é o devedor e que valor está em causa.',
      'Avaliar se faz sentido contacto extrajudicial, injunção, ação ou execução.',
      'Nenhum resultado deve ser prometido.',
    ],
    situacoes: [
      'Cliente que não pagou fatura.',
      'Serviço prestado sem pagamento.',
      'Produto entregue e pagamento em atraso.',
      'Trabalhos extra não pagos.',
      'Pagamentos parciais sem regularização do restante.',
      'Dívida antiga que a empresa quer avaliar.',
      'Cliente que reconhece a dívida, mas adia o pagamento.',
    ],
    documentos: [
      'Faturas.',
      'Orçamentos ou propostas aceites.',
      'Contratos.',
      'Emails, mensagens ou cartas.',
      'Guias de transporte ou entrega.',
      'Autos de medição, se existirem.',
      'Comprovativos de pagamentos parciais.',
      'Identificação completa do devedor.',
    ],
    analise: 'A análise começa pela documentação disponível. Nem todas as dívidas têm a mesma prova, o mesmo risco ou a mesma via adequada. Em alguns casos pode fazer sentido uma abordagem extrajudicial; noutros, injunção, ação, execução ou outra atuação.',
    localNote: 'Em PME, comércio, serviços, construção ou agricultura, a cobrança começa quase sempre pela organização da prova.',
    faq: [
      ['Uma fatura basta para cobrar?', 'Nem sempre. A fatura é importante, mas pode ser necessário demonstrar a encomenda, a prestação do serviço, a entrega do produto, a aceitação ou outras comunicações.'],
      ['A cobrança exige sempre tribunal?', 'Não. A via adequada varia com o valor, o devedor, a prova existente e a estratégia ponderada para o caso.'],
      ['Vale a pena cobrar uma dívida pequena?', 'Depende do valor, dos custos, da prova disponível, da situação do devedor e do interesse prático da empresa.'],
      ['Pode ser prometido que a dívida será paga?', 'Não. A análise jurídica pode indicar vias possíveis, mas não deve prometer resultado.'],
    ],
  },
  {
    file: 'contratos-comerciais-empresas.html',
    slug: 'contratos-comerciais-empresas',
    breadcrumb: 'Contratos comerciais e prestação de serviços',
    title: 'Contratos comerciais para empresas | Correia Crespo — Advogados',
    description: 'Revisão de contratos, propostas, prestação de serviços, fornecimentos, pagamentos, prazos e comunicações para pequenas e médias empresas.',
    h1: 'Contratos comerciais e prestação de serviços',
    lead: 'Nas pequenas empresas, muitos conflitos começam com contratos incompletos, propostas pouco claras, mensagens dispersas ou alterações ao serviço que nunca ficaram bem documentadas.',
    serviceName: 'Contratos comerciais e prestação de serviços',
    resumo: [
      'Um contrato deve refletir o negócio real.',
      'Preço, prazos, pagamentos e responsabilidades devem estar claros.',
      'Alterações ao serviço devem ficar documentadas.',
      'Emails e mensagens podem ser importantes.',
      'A revisão deve considerar o contrato completo, não apenas uma cláusula isolada.',
    ],
    situacoes: [
      'Prestação de serviços.',
      'Fornecimento de bens.',
      'Propostas aceites por email ou mensagem.',
      'Condições de pagamento pouco claras.',
      'Prazos não cumpridos.',
      'Alterações ao serviço durante a execução.',
      'Reclamações do cliente.',
    ],
    documentos: [
      'Minuta ou contrato assinado.',
      'Propostas comerciais.',
      'Orçamentos.',
      'Condições gerais.',
      'Emails de negociação.',
      'Mensagens relevantes.',
      'Faturas.',
      'Comunicações sobre atrasos ou defeitos.',
    ],
    analise: 'A análise procura perceber o negócio real: o que foi combinado, o que ficou escrito, o que foi executado e que prova existe. Um contrato pode servir para prevenir conflitos, mas também para organizar a resposta quando o conflito já existe.',
    faq: [
      ['Posso usar um contrato encontrado online?', 'Pode existir essa tentação, mas o risco é o documento não corresponder ao negócio concreto, aos prazos, à forma de pagamento ou à prova necessária.'],
      ['Basta rever uma cláusula?', 'Às vezes é possível, mas uma cláusula deve ser lida no contexto do contrato inteiro.'],
      ['O contrato evita todos os conflitos?', 'Não. Um contrato claro reduz incerteza, mas não impede incumprimentos nem substitui a análise do caso concreto.'],
      ['A revisão inclui negociação com a outra parte?', 'Só se isso for acordado no âmbito do mandato. A revisão pode limitar-se à análise e sugestões.'],
    ],
  },
  {
    file: 'construcao-civil-obras-subempreitadas.html',
    slug: 'construcao-civil-obras-subempreitadas',
    breadcrumb: 'Construção civil, obras e subempreitadas',
    title: 'Construção civil, obras e subempreitadas | Correia Crespo — Advogados',
    description: 'Apoio jurídico em conflitos de construção civil, obras, subempreitadas, trabalhos extra, pagamentos retidos, defeitos alegados e documentação.',
    h1: 'Construção civil, obras e subempreitadas',
    lead: 'Na construção civil, muitos problemas surgem porque a obra mudou, os trabalhos extra não ficaram bem documentados, o pagamento foi retido ou as comunicações ficaram espalhadas por orçamentos, mensagens, chamadas e emails.',
    serviceName: 'Construção civil, obras e subempreitadas',
    resumo: [
      'Orçamentos e trabalhos extra devem estar documentados.',
      'Autos de medição, fotografias e mensagens podem ser relevantes.',
      'Defeitos alegados devem ser analisados com cuidado.',
      'A retenção de pagamento pode exigir leitura do contrato e da prova.',
      'Cada conflito depende do que foi contratado, executado e comunicado.',
    ],
    situacoes: [
      'Cliente que não paga a totalidade da obra.',
      'Trabalhos extra não pagos.',
      'Alterações ao orçamento inicial.',
      'Atrasos na obra.',
      'Defeitos alegados pelo dono da obra.',
      'Subempreiteiro sem pagamento.',
      'Discussão sobre o que estava incluído no preço.',
    ],
    documentos: [
      'Orçamento inicial.',
      'Contrato ou proposta aceite.',
      'Autos de medição.',
      'Fotografias da obra.',
      'Mensagens e emails.',
      'Faturas.',
      'Recibos e comprovativos.',
      'Lista de trabalhos extra.',
    ],
    analise: 'A análise procura reconstruir a obra: o que foi combinado, que alterações surgiram, que trabalhos foram executados, que pagamentos foram feitos e que reclamações existem. A prova documental e a cronologia dos factos podem ser decisivas para escolher o próximo passo.',
    localNote: 'Este tipo de questão pode surgir em obras, remodelações, subempreitadas e serviços técnicos frequentes em pequenas empresas da Lourinhã e do Oeste.',
    faq: [
      ['Os trabalhos extra têm de estar escritos?', 'É prudente que fiquem documentados. Quando não ficam, a prova pode ser mais difícil e depender de mensagens, fotografias, testemunhos, faturas ou outros elementos.'],
      ['O cliente pode recusar pagar por alegar defeitos?', 'Depende dos factos, do contrato, da natureza dos defeitos alegados, das comunicações e da prova existente.'],
      ['Um orçamento por mensagem é relevante?', 'Pode ser relevante, mas deve ser analisado no contexto das restantes comunicações e da execução da obra.'],
      ['O subempreiteiro pode cobrar diretamente?', 'A resposta depende da relação contratual, dos documentos existentes e das partes envolvidas.'],
    ],
  },
  {
    file: 'agricultura-fornecimentos-pagamentos.html',
    slug: 'agricultura-fornecimentos-pagamentos',
    breadcrumb: 'Agricultura, fornecimentos e pagamentos',
    title: 'Agricultura, fornecimentos e pagamentos | Correia Crespo — Advogados',
    description: 'Apoio jurídico a empresas agrícolas, produtores e fornecedores em pagamentos em atraso, vendas de produto, acordos verbais, maquinaria, terrenos e contratos.',
    h1: 'Agricultura, fornecimentos e pagamentos',
    lead: 'Na agricultura e produção, muitos problemas surgem em relações de confiança: produto entregue, pagamento adiado, acordo verbal, máquinas ou reparações por regularizar, terrenos, acessos ou fornecimentos sazonais.',
    serviceName: 'Agricultura, fornecimentos e pagamentos',
    resumo: [
      'Guardar prova de entrega e pagamento é essencial.',
      'Acordos verbais podem ser difíceis de provar.',
      'Produto perecível exige atenção à documentação.',
      'Guias, faturas e mensagens ajudam a reconstruir o acordo.',
      'Terrenos, arrendamentos e acessos devem ser analisados com documentos.',
    ],
    situacoes: [
      'Produto entregue e pagamento em atraso.',
      'Vendas sazonais sem contrato escrito.',
      'Fornecimentos agrícolas por liquidar.',
      'Reparação de maquinaria ou alfaias.',
      'Acordos verbais entre produtores, clientes ou fornecedores.',
      'Terrenos, acessos, serventias ou uso de espaços.',
      'Relações comerciais antigas sem documentação organizada.',
    ],
    documentos: [
      'Faturas.',
      'Guias de transporte ou entrega.',
      'Mensagens e emails.',
      'Notas de encomenda.',
      'Comprovativos de pagamento parcial.',
      'Fotografias, quando relevantes.',
      'Identificação do comprador, fornecedor ou intermediário.',
      'Documentos sobre terrenos, contratos ou arrendamentos.',
    ],
    analise: 'A análise começa por perceber o que foi combinado, que produto ou serviço esteve em causa, quando ocorreu a entrega e que pagamentos foram feitos. Em relações comerciais agrícolas, a simplicidade do acordo não deve impedir a organização dos documentos.',
    localNote: 'Em atividades agrícolas e de produção, a sazonalidade, a relação de confiança e a urgência dos pagamentos tornam a documentação especialmente importante.',
    faq: [
      ['Um acordo verbal tem valor?', 'Pode ter, mas a dificuldade costuma estar na prova. Mensagens, faturas, guias, pagamentos e testemunhos podem ser relevantes.'],
      ['Produto entregue sem pagamento pode ser cobrado?', 'A resposta varia com a prova de entrega, as comunicações trocadas e a identificação do devedor.'],
      ['Devo guardar guias e mensagens?', 'Sim. Podem ser importantes para demonstrar entrega, quantidades, datas, preço ou aceitação.'],
      ['Questões de terrenos também podem ser analisadas?', 'Podem ser enquadradas quando existam documentos, comunicações ou conflitos relacionados com uso, acesso, arrendamento ou propriedade.'],
    ],
  },
  {
    file: 'arrendamento-comercial-imoveis-empresas.html',
    slug: 'arrendamento-comercial-imoveis-empresas',
    breadcrumb: 'Arrendamento comercial e imóveis da empresa',
    title: 'Arrendamento comercial e imóveis da empresa | Correia Crespo — Advogados',
    description: 'Arrendamento comercial, lojas, armazéns, escritórios, rendas em atraso, obras, cauções, denúncia, entrega do imóvel e conflitos empresariais.',
    h1: 'Arrendamento comercial e imóveis da empresa',
    lead: 'Lojas, armazéns, escritórios e imóveis ligados à atividade da empresa exigem atenção ao contrato, às rendas, às obras, às cauções, aos prazos e às comunicações entre senhorio e arrendatário.',
    serviceName: 'Arrendamento comercial e imóveis da empresa',
    resumo: [
      'O contrato deve ser lido antes de qualquer decisão.',
      'Rendas, obras e comunicações devem estar documentadas.',
      'Prazos de denúncia, oposição ou resolução podem ser relevantes.',
      'A entrega do imóvel deve ser preparada com cuidado.',
      'Cada situação depende da finalidade do espaço e dos documentos.',
    ],
    situacoes: [
      'Rendas comerciais em atraso.',
      'Loja, escritório ou armazém com conflito.',
      'Obras no imóvel.',
      'Caução ou fiança.',
      'Comunicação de denúncia ou oposição à renovação.',
      'Entrega do imóvel.',
      'Uso do espaço diferente do previsto.',
    ],
    documentos: [
      'Contrato de arrendamento.',
      'Recibos e comprovativos de pagamento.',
      'Comunicações trocadas.',
      'Fotografias do imóvel.',
      'Documentos sobre obras.',
      'Certidão predial, se relevante.',
      'Caderneta predial, se relevante.',
      'Elementos sobre licenças ou uso, se existirem.',
    ],
    analise: 'A análise deve considerar o contrato, o uso do espaço, a situação das rendas, as obras, os prazos e as comunicações. Em contexto empresarial, o impacto prático para a atividade também pode ser relevante.',
    faq: [
      ['O arrendamento comercial é igual ao habitacional?', 'Não. A finalidade, o contrato, a negociação, os prazos e os interesses envolvidos podem ser diferentes.'],
      ['O senhorio pode terminar o contrato por falta de pagamento?', 'A resposta depende dos factos, dos valores em atraso, das comunicações e do regime aplicável.'],
      ['A empresa pode exigir obras?', 'Depende do contrato, do estado do imóvel, da causa do problema e das comunicações entre as partes.'],
      ['Antes de assinar contrato de loja devo pedir revisão?', 'Pode ser prudente, sobretudo se houver investimento inicial, obras, caução, fiança ou prazo longo.'],
    ],
  },
  {
    file: 'sociedades-gerentes-empresas-familiares.html',
    slug: 'sociedades-gerentes-empresas-familiares',
    breadcrumb: 'Sociedades, gerentes e empresas familiares',
    title: 'Sociedades, gerentes e empresas familiares | Correia Crespo — Advogados',
    description: 'Questões societárias em PME e empresas familiares: sócios, gerentes, quotas, saída de sócio, decisões não documentadas, dívidas e responsabilidade.',
    h1: 'Sociedades, gerentes e empresas familiares',
    lead: 'Em muitas pequenas empresas, a relação entre sócios, gerentes e familiares mistura confiança, trabalho, património e decisões pouco documentadas. Quando surge conflito, os documentos e a cronologia tornam-se essenciais.',
    serviceName: 'Sociedades, gerentes e empresas familiares',
    resumo: [
      'Sociedades familiares devem documentar decisões.',
      'Quotas, entradas e saídas de sócios exigem cuidado.',
      'O gerente deve perceber quando assina pela empresa e quando assina pessoalmente.',
      'Dívidas da sociedade não devem ser confundidas automaticamente com dívidas pessoais.',
      'Cada situação depende dos documentos e da atuação concreta.',
    ],
    situacoes: [
      'Conflito entre sócios.',
      'Saída de sócio.',
      'Transmissão de quotas.',
      'Decisões sem ata ou sem documentação.',
      'Gerente que assinou documentos pessoalmente.',
      'Dívidas da sociedade.',
      'Mistura entre contas da empresa e assuntos pessoais.',
    ],
    documentos: [
      'Certidão permanente.',
      'Pacto social.',
      'Atas.',
      'Contratos entre sócios.',
      'Documentos de cessão de quotas.',
      'Emails e mensagens entre sócios ou gerentes.',
      'Documentos bancários ou contabilísticos relevantes.',
      'Notificações judiciais ou extrajudiciais.',
    ],
    analise: 'A análise procura perceber quem são os sócios, quem gere a sociedade, que documentos existem, que decisões foram tomadas e que obrigações foram assumidas pela empresa ou pessoalmente.',
    faq: [
      ['Um conflito entre sócios deve ir logo para tribunal?', 'Nem sempre. Primeiro importa perceber os documentos, os factos, o pacto social e as vias possíveis.'],
      ['A saída de um sócio é simples?', 'Depende da sociedade, das quotas, dos documentos existentes e das formalidades aplicáveis.'],
      ['O gerente responde sempre pelas dívidas da empresa?', 'Não se deve generalizar. Depende do tipo de dívida, dos documentos assinados, da atuação concreta e do regime aplicável.'],
      ['Numa empresa familiar, basta combinar verbalmente?', 'A informalidade pode aumentar conflitos futuros. Quando há património, dívidas, trabalho ou quotas, a documentação é importante.'],
    ],
  },
  {
    file: 'execucao-insolvencia-empresas.html',
    slug: 'execucao-insolvencia-empresas',
    breadcrumb: 'Execução e insolvência de empresas',
    title: 'Execução e insolvência de empresas | Correia Crespo — Advogados',
    description: 'Empresas com execuções, penhoras, dívidas, insolvência, credores, reclamação de créditos e risco para gerentes. Análise por consulta jurídica.',
    h1: 'Execução e insolvência de empresas',
    lead: 'Quando uma empresa recebe uma execução, penhora, notificação ou pedido de pagamento, os prazos e documentos podem fazer diferença. Também os credores devem avaliar a forma adequada de proteger a sua posição.',
    serviceName: 'Execução e insolvência de empresas',
    resumo: [
      'Não ignorar notificações.',
      'Confirmar prazos e processo.',
      'Reunir contratos, faturas, comunicações e pagamentos.',
      'Avaliar se a empresa é devedora, credora ou terceira afetada.',
      'Em insolvência, a posição de credor ou gerente pode exigir atenção específica.',
    ],
    situacoes: [
      'Empresa recebeu execução.',
      'Penhora de conta, crédito ou bem.',
      'Credor quer reclamar crédito.',
      'Cliente entrou em insolvência.',
      'Empresa acumula dívidas.',
      'Gerente receia responsabilidade pessoal.',
      'Necessidade de responder a notificação.',
    ],
    documentos: [
      'Notificação recebida.',
      'Número do processo.',
      'Requerimento executivo, se existir.',
      'Faturas e contratos.',
      'Comprovativos de pagamento.',
      'Comunicações com credores ou devedores.',
      'Certidão permanente.',
      'Documentos sobre avales ou fianças, se existirem.',
    ],
    analise: 'A análise começa por identificar a posição da empresa: devedora, credora, executada, exequente ou interessada em processo de insolvência. Depois são verificados prazos, fundamentos e vias possíveis. Em execução e insolvência, a rapidez na organização dos elementos pode ser importante.',
    faq: [
      ['A empresa recebeu uma execução. O que deve fazer primeiro?', 'Deve confirmar o prazo, identificar o processo, guardar a notificação e reunir os elementos relacionados com a dívida.'],
      ['Um credor deve reclamar crédito em insolvência?', 'Em muitos casos pode ser necessário, mas é preciso verificar prazos e posição concreta do credor.'],
      ['A insolvência acaba automaticamente com todas as dívidas?', 'Não. Os efeitos dependem do processo, dos créditos, das decisões tomadas e da posição das partes.'],
      ['O gerente pode ser pessoalmente afetado?', 'Pode haver situações em que a atuação do gerente seja juridicamente relevante. A resposta varia com os factos, os documentos assinados e o regime aplicável.'],
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

function renderPage(p) {
  const url = `${SITE}/${p.file}`;
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="index,follow" />

  <title>${p.title}</title>
  <meta name="description" content="${p.description}" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Correia Crespo — Advogados" />
  <meta property="og:locale" content="pt_PT" />
  <meta property="og:title" content="${p.title.replace(' | Correia Crespo — Advogados', ' | Correia Crespo')}" />
  <meta property="og:description" content="${p.description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}/assets/img/og.jpg" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${p.title.replace(' | Correia Crespo — Advogados', '')}" />
  <meta name="twitter:description" content="${p.description}" />
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
      "@type": "WebPage",
      "@id": "${url}#webpage",
      "url": "${url}",
      "name": "${escJson(p.h1)}",
      "description": "${escJson(p.description)}",
      "isPartOf": { "@id": "${SITE}/#website" },
      "inLanguage": "pt-PT"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Início", "item": "${SITE}/" },
        { "@type": "ListItem", "position": 2, "name": "Empresas", "item": "${SITE}/empresas.html" },
        { "@type": "ListItem", "position": 3, "name": "${escJson(p.breadcrumb)}", "item": "${url}" }
      ]
    },
    {
      "@type": "Service",
      "@id": "${url}#service",
      "name": "${escJson(p.serviceName)}",
      "provider": {
        "@type": "LegalService",
        "@id": "${SITE}/#legal-service",
        "name": "Correia Crespo — Advogados",
        "url": "${SITE}/"
      },
      "areaServed": [
        { "@type": "City", "name": "Lourinhã" },
        { "@type": "AdministrativeArea", "name": "Litoral Oeste" },
        { "@type": "Country", "name": "Portugal" }
      ],
      "audience": {
        "@type": "Audience",
        "audienceType": "Empresas e PME"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "${url}#faq",
      "mainEntity": [
${faqJson(p.faq)}
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
      <span aria-current="page">${p.breadcrumb}</span>
    </nav>

    <h1>${p.h1}</h1>
    <p class="lead">${p.lead}</p>

    <section aria-labelledby="${p.slug}-resumo">
      <h2 id="${p.slug}-resumo">Resumo rápido</h2>
      <ul class="mini-list">
${listItems(p.resumo)}
      </ul>
    </section>

    <section aria-labelledby="${p.slug}-sit">
      <h2 id="${p.slug}-sit">Situações frequentes</h2>
      <ul class="mini-list">
${listItems(p.situacoes)}
      </ul>
    </section>

    <section aria-labelledby="${p.slug}-docs">
      <h2 id="${p.slug}-docs">Documentos úteis</h2>
      <ul class="mini-list">
${listItems(p.documentos)}
      </ul>
    </section>

    <section aria-labelledby="${p.slug}-analise">
      <h2 id="${p.slug}-analise">Como decorre a análise</h2>
      <p>${p.analise}</p>
      ${p.localNote ? `      <p class="muted hub-local-note">${p.localNote}</p>\n` : ''}
    </section>

    <section class="faq" aria-label="Perguntas frequentes">
      <h2 class="faq-title">Perguntas frequentes</h2>
      <div class="accordion" data-accordion>
${faqHtml(p.faq)}
      </div>
    </section>

    <section class="consulta-booking" aria-labelledby="${p.slug}-cta">
      <h2 class="consulta-booking__title" id="${p.slug}-cta">Consulta jurídica para empresa</h2>
      <p class="consulta-booking__intro">Para enquadrar a situação, envie um pedido inicial com descrição objetiva do assunto, identificação das partes envolvidas, documentos existentes e indicação de prazos conhecidos.</p>
      <div class="consulta-booking__actions">
        <a class="btn primary" href="consulta-juridica.html#pedido-consulta">Pedir consulta jurídica</a>
        <a class="btn secondary" href="contactos.html">Ver contactos</a>
      </div>
      <p class="consulta-booking__note">O envio de pedido inicial não cria, por si só, relação advogado-cliente nem substitui consulta jurídica.</p>
    </section>

    <section class="section legal-site-note" aria-labelledby="${p.slug}-nota">
      <h2 class="section-title legal-site-note__title" id="${p.slug}-nota">Nota informativa</h2>
      <p class="muted legal-site-note__text">Esta página tem natureza informativa. Não substitui consulta jurídica, não dispensa análise documental e não representa promessa de resultado. A atuação concreta depende dos factos, dos documentos, dos prazos, da prova disponível, da verificação de conflitos de interesses e da aceitação de mandato.</p>
    </section>

    <p class="muted"><a href="empresas.html">← Voltar a Empresas</a></p>

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
  console.log('Modo validação: template pronto. Para regenerar as 7 páginas: node scripts/scaffold-empresa-pages.mjs --write');
  console.log('Depois: npm run build && npm run seo && node scripts/validate-jsonld.mjs');
  process.exit(0);
}

for (const p of PAGES) {
  const out = path.join(ROOT, p.file);
  fs.writeFileSync(out, renderPage(p), 'utf8');
  console.log('OK', p.file);
}
