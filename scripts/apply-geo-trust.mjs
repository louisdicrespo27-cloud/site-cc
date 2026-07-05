#!/usr/bin/env node
/**
 * Aplica bloco editorial e melhora JSON-LD (Article / Service) nas páginas do PROMPT 5.
 * Uso: node scripts/apply-geo-trust.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://www.correiacrespo-advogados.pt';
const DATE_MODIFIED = '2026-06-16';
const REVISION_LABEL = '16 de junho de 2026';

const EDITORIAL_NOTE = `    <aside class="editorial-note" aria-labelledby="editorial-responsavel">
      <h2 class="editorial-note__title" id="editorial-responsavel">Responsável pelo conteúdo</h2>
      <p class="editorial-note__name"><strong>Luís Correia Crespo</strong>, Advogado</p>
      <p class="editorial-note__meta">Cédula profissional OA n.º 67709L</p>
      <p class="editorial-note__meta">Última revisão: ${REVISION_LABEL}</p>
      <p class="editorial-note__meta">Natureza: informação geral, não substitui consulta jurídica.</p>
    </aside>`;

const EDITORIAL_PAGES = [
  'empresas.html',
  'cobranca-dividas-empresas.html',
  'contratos-comerciais-empresas.html',
  'construcao-civil-obras-subempreitadas.html',
  'agricultura-fornecimentos-pagamentos.html',
  'arrendamento-comercial-imoveis-empresas.html',
  'sociedades-gerentes-empresas-familiares.html',
  'execucao-insolvencia-empresas.html',
  'particulares.html',
  'familia-menores.html',
  'imobiliario-arrendamento.html',
  'execucoes-insolvencia.html',
  'residentes-no-estrangeiro.html',
  'quanto-tempo-demora-divorcio-portugal.html',
  'insolvencia-pessoal-exoneracao-passivo-restante.html',
  'estrangeiro-heranca-imovel-portugal.html',
  'divorcio-casa-credito-habitacao.html',
  'cobranca-dividas-injuncao-execucao.html',
  'pensao-alimentos-em-atraso.html',
  'divorcio-mutuo-consentimento-filhos-menores.html',
  'responsabilidades-parentais-pais-nao-casados.html',
  'renda-em-atraso-senhorio-arrendatario.html',
];

const ARTICLE_PAGES = [
  'quanto-tempo-demora-divorcio-portugal.html',
  'insolvencia-pessoal-exoneracao-passivo-restante.html',
  'estrangeiro-heranca-imovel-portugal.html',
  'divorcio-casa-credito-habitacao.html',
  'cobranca-dividas-injuncao-execucao.html',
  'pensao-alimentos-em-atraso.html',
  'divorcio-mutuo-consentimento-filhos-menores.html',
  'responsabilidades-parentais-pais-nao-casados.html',
  'renda-em-atraso-senhorio-arrendatario.html',
];

const SERVICE_PAGES = {
  'particulares.html': {
    name: 'Apoio jurídico a famílias e particulares',
    serviceType: 'Apoio jurídico a particulares',
    audienceType: 'Famílias e particulares',
  },
  'familia-menores.html': {
    name: 'Família e menores',
    serviceType: 'Família, divórcio e responsabilidades parentais',
    audienceType: 'Particulares',
  },
  'imobiliario-arrendamento.html': {
    name: 'Imobiliário e arrendamento',
    serviceType: 'Imobiliário, compra e venda e arrendamento',
    audienceType: 'Particulares e empresas',
  },
  'execucoes-insolvencia.html': {
    name: 'Execuções e insolvência',
    serviceType: 'Execução, cobrança de dívidas e insolvência',
    audienceType: 'Particulares e empresas',
  },
  'residentes-no-estrangeiro.html': {
    name: 'Residentes no estrangeiro',
    serviceType: 'Assuntos jurídicos em Portugal para residentes no estrangeiro',
    audienceType: 'Residentes no estrangeiro',
  },
};

function applyEditorialNote(html) {
  if (html.includes('class="editorial-note"')) return html;
  return html.replace(/\n  <\/main>/, `\n\n${EDITORIAL_NOTE}\n  </main>`);
}

function serviceBlock(slug, config) {
  const url = `${BASE}/${slug}`;
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: config.name,
    serviceType: config.serviceType,
    provider: {
      '@type': 'LegalService',
      '@id': `${BASE}/#legal-service`,
      name: 'Correia Crespo — Advogados',
      url: `${BASE}/`,
    },
    areaServed: [
      { '@type': 'City', name: 'Lourinhã' },
      { '@type': 'AdministrativeArea', name: 'Litoral Oeste' },
      { '@type': 'Country', name: 'Portugal' },
    ],
    audience: {
      '@type': 'Audience',
      audienceType: config.audienceType,
    },
    url,
  };
}

function improveArticleJsonLd(html, slug) {
  const url = `${BASE}/${slug}`;
  const scriptMatch = html.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
  );
  if (!scriptMatch) return html;

  let graph;
  try {
    const data = JSON.parse(scriptMatch[1]);
    graph = data['@graph'] ?? (Array.isArray(data) ? data : [data]);
  } catch {
    return html;
  }

  let changed = false;
  for (const node of graph) {
    if (node['@type'] !== 'Article') continue;

    node.dateModified = DATE_MODIFIED;
    changed = true;

    if (!node.mainEntityOfPage) {
      node.mainEntityOfPage = {
        '@type': 'WebPage',
        '@id': url,
      };
    }

    if (node.publisher && !node.publisher.url) {
      node.publisher.url = `${BASE}/`;
      changed = true;
    }
    if (node.publisher && !node.publisher.name) {
      node.publisher = { '@id': 'https://www.correiacrespo-advogados.pt/#legal-service' };
      changed = true;
    }
  }

  if (!changed) return html;

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return html.replace(scriptMatch[0], `<script type="application/ld+json">\n${json}\n  </script>`);
}

function addServiceJsonLd(html, slug, config) {
  if (html.includes('#service')) return html;

  const scriptMatch = html.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
  );
  if (!scriptMatch) return html;

  let graph;
  try {
    const data = JSON.parse(scriptMatch[1]);
    graph = data['@graph'] ?? (Array.isArray(data) ? data : [data]);
  } catch {
    return html;
  }

  graph.push(serviceBlock(slug, config));
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return html.replace(scriptMatch[0], `<script type="application/ld+json">\n${json}\n  </script>`);
}

function improveEmpresaServiceJsonLd(html, slug) {
  const scriptMatch = html.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
  );
  if (!scriptMatch) return html;

  let graph;
  try {
    const data = JSON.parse(scriptMatch[1]);
    graph = data['@graph'] ?? (Array.isArray(data) ? data : [data]);
  } catch {
    return html;
  }

  let changed = false;
  for (const node of graph) {
    if (node['@type'] !== 'Service') continue;

    if (!node.provider || typeof node.provider === 'string') {
      node.provider = {
        '@type': 'LegalService',
        '@id': `${BASE}/#legal-service`,
        name: 'Correia Crespo — Advogados',
        url: `${BASE}/`,
      };
      changed = true;
    } else if (!node.provider.url) {
      node.provider.url = `${BASE}/`;
      changed = true;
    }

    const area = node.areaServed;
    const hasLourinha =
      Array.isArray(area) &&
      area.some(
        (a) =>
          (typeof a === 'object' && a.name === 'Lourinhã') ||
          (typeof a === 'string' && a.includes('Lourinhã'))
      );
    if (!hasLourinha) {
      node.areaServed = [
        { '@type': 'City', name: 'Lourinhã' },
        { '@type': 'AdministrativeArea', name: 'Litoral Oeste' },
        { '@type': 'Country', name: 'Portugal' },
      ];
      changed = true;
    }

    if (!node.audience) {
      node.audience = { '@type': 'Audience', audienceType: 'Empresas e PME' };
      changed = true;
    }
  }

  if (!changed) return html;

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return html.replace(scriptMatch[0], `<script type="application/ld+json">\n${json}\n  </script>`);
}

const EMPRESA_PAGES = EDITORIAL_PAGES.filter((f) => f.includes('empresas') || f === 'empresas.html');

let updated = 0;

for (const file of EDITORIAL_PAGES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Aviso: ${file} não encontrado`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  html = applyEditorialNote(html);

  if (ARTICLE_PAGES.includes(file)) {
    html = improveArticleJsonLd(html, file);
  }

  if (SERVICE_PAGES[file]) {
    html = addServiceJsonLd(html, file, SERVICE_PAGES[file]);
  }

  if (EMPRESA_PAGES.includes(file)) {
    html = improveEmpresaServiceJsonLd(html, file);
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    updated += 1;
    console.log(`Atualizado: ${file}`);
  }
}

console.log(`\nConcluído: ${updated} ficheiro(s) alterado(s).`);
