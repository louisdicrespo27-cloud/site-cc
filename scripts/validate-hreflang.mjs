#!/usr/bin/env node
/**
 * Valida clusters hreflang definidos em scripts/i18n-map.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.correiacrespo-advogados.pt';
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-map.json'), 'utf8'));

const HREFLANG_CODES = { pt: 'pt-PT', en: 'en', fr: 'fr' };
const failures = [];

function clusterPathToRel(clusterPath) {
  if (clusterPath === '/') return 'index.html';
  return clusterPath.replace(/^\//, '');
}

function readPage(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function extractHreflangs(html) {
  const links = [];
  const re = /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) links.push({ hreflang: m[1], href: m[2] });
  return links;
}

function canonicalOf(html) {
  const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return m ? m[1] : null;
}

for (const cluster of map.clusters) {
  const members = ['pt', 'en', 'fr'].map((lang) => ({
    lang,
    url: `${SITE}${cluster[lang] === '/' ? '/' : cluster[lang]}`,
    rel: clusterPathToRel(cluster[lang]),
  }));

  for (const member of members) {
    const html = readPage(member.rel);
    if (!html) {
      failures.push(`${member.rel}: ficheiro em falta para cluster ${cluster.key}`);
      continue;
    }

    const canonical = canonicalOf(html);
    if (canonical !== member.url) {
      failures.push(`${member.rel}: canonical ${canonical} ≠ ${member.url}`);
    }

    const hreflangs = extractHreflangs(html);
    for (const other of members) {
      const code = HREFLANG_CODES[other.lang];
      const found = hreflangs.find((h) => h.hreflang === code);
      if (!found) {
        failures.push(`${member.rel}: falta hreflang ${code}`);
      } else if (found.href !== other.url) {
        failures.push(`${member.rel}: hreflang ${code} aponta para ${found.href}, esperado ${other.url}`);
      }
    }

    if (cluster.key === 'index' && cluster.xDefault) {
      const xd = hreflangs.find((h) => h.hreflang === 'x-default');
      const expected = `${SITE}${cluster.xDefault === '/' ? '/' : cluster.xDefault}`;
      if (!xd) failures.push(`${member.rel}: falta x-default na homepage`);
      else if (xd.href !== expected) failures.push(`${member.rel}: x-default incorrecto`);
    } else {
      const xd = hreflangs.find((h) => h.hreflang === 'x-default');
      if (xd) failures.push(`${member.rel}: x-default só permitido na homepage`);
    }
  }
}

for (const noindexPath of map.noindex) {
  const rel = clusterPathToRel(noindexPath);
  const html = readPage(rel);
  if (!html) continue;
  if (!/noindex/i.test(html)) failures.push(`${rel}: deveria ser noindex`);
  if (extractHreflangs(html).length) failures.push(`${rel}: noindex não deve ter hreflang`);
}

if (failures.length) {
  console.error('validate:hreflang FAIL');
  failures.forEach((f) => console.error(' -', f));
  process.exit(1);
}

console.log(`validate:hreflang PASS (${map.clusters.length} clusters, ${map.noindex.length} noindex)`);
