#!/usr/bin/env node
/**
 * Remove entidade Organization (#organization) da marca e uniformiza relações JSON-LD.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ORG_ID = 'https://www.correiacrespo-advogados.pt/#organization';
const LEGAL_ID = 'https://www.correiacrespo-advogados.pt/#legal-service';
const WEBSITE_ID = 'https://www.correiacrespo-advogados.pt/#website';
const PERSON_ID = 'https://www.correiacrespo-advogados.pt/sobre.html#luis-correia-crespo';

const SKIP = new Set(['node_modules', '.git', 'dist', 'partials', 'templates']);

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP.has(ent.name)) continue;
      walkHtml(p, acc);
    } else if (ent.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function isBrandOrganization(node) {
  if (!node || typeof node !== 'object') return false;
  if (node['@id'] === ORG_ID) return true;
  if (
    node['@type'] === 'Organization' &&
    typeof node.name === 'string' &&
    node.name.includes('Correia Crespo')
  ) {
    return true;
  }
  return false;
}

function replaceOrgRefs(value) {
  if (Array.isArray(value)) return value.map(replaceOrgRefs);
  if (!value || typeof value !== 'object') return value;

  if (value['@id'] === ORG_ID) {
    return { '@id': LEGAL_ID };
  }

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'publisher' && isBrandOrganization(v)) {
      out[k] = { '@id': LEGAL_ID };
      continue;
    }
    if (k === 'worksFor' && v && v['@id'] === ORG_ID) {
      out[k] = { '@id': LEGAL_ID };
      continue;
    }
    out[k] = replaceOrgRefs(v);
  }
  return out;
}

function normalizePersonNodes(graph) {
  for (const node of graph) {
    if (node['@type'] !== 'Person') continue;
    if (node.name === 'Luís Correia Crespo') {
      node['@id'] = PERSON_ID;
      node.worksFor = { '@id': LEGAL_ID };
    }
  }
}

function normalizeLegalService(graph) {
  for (const node of graph) {
    if (node['@type'] !== 'LegalService') continue;
    if (node.name === 'Correia Crespo — Advogados') {
      node['@id'] = LEGAL_ID;
      node.founder = { '@id': PERSON_ID };
    }
  }
}

function normalizeWebSite(graph) {
  for (const node of graph) {
    if (node['@type'] !== 'WebSite') continue;
    node.publisher = { '@id': LEGAL_ID };
  }
}

function ensureIndexEntities(graph) {
  const hasPerson = graph.some((n) => n['@id'] === PERSON_ID);
  const legal = graph.find((n) => n['@type'] === 'LegalService' && n['@id'] === LEGAL_ID);
  if (legal) legal.founder = { '@id': PERSON_ID };
  if (!hasPerson) {
    graph.push({
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Luís Correia Crespo',
      worksFor: { '@id': LEGAL_ID },
    });
  }
}

function processHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  let changed = false;

  html = html.replace(re, (full, jsonText) => {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return full;
    }

    let graph = data['@graph'] ?? (Array.isArray(data) ? data : [data]);
    const before = JSON.stringify(graph);

    graph = graph.filter((node) => !isBrandOrganization(node));
    graph = replaceOrgRefs(graph);
    if (!Array.isArray(graph)) graph = [graph];

    normalizePersonNodes(graph);
    normalizeLegalService(graph);
    normalizeWebSite(graph);

    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    if (rel === 'index.html') ensureIndexEntities(graph);

    const after = JSON.stringify(graph);
    if (before === after) return full;

    changed = true;
    const out = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
    return `<script type="application/ld+json">\n${out}\n  </script>`;
  });

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('OK', path.relative(ROOT, filePath));
  }
}

function patchApplyGeoTrust() {
  const p = path.join(__dirname, 'apply-geo-trust.mjs');
  let src = fs.readFileSync(p, 'utf8');
  const next = src
    .replace(
      /node\.publisher\['@type'\] = node\.publisher\['@type'\] \|\| 'Organization';[\s\S]*?node\.publisher\.name = 'Correia Crespo — Advogados';/,
      `node.publisher = { '@id': '${LEGAL_ID}' };`
    );
  if (next !== src) {
    fs.writeFileSync(p, next, 'utf8');
    console.log('OK scripts/apply-geo-trust.mjs');
  }
}

for (const abs of walkHtml(ROOT)) {
  if (abs.includes(`${path.sep}partials${path.sep}`)) continue;
  processHtml(abs);
}
patchApplyGeoTrust();
