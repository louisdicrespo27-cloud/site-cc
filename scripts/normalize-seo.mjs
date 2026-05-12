#!/usr/bin/env node
/**
 * Normaliza meta Open Graph / Twitter e gera sitemap.xml.
 * Executar: node scripts/normalize-seo.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.correiacrespo-advogados.pt';
const OG_IMAGE = `${SITE}/assets/img/og.jpg`;
const LASTMOD = new Date().toISOString().split('T')[0];

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walkHtml(p, acc);
    } else if (ent.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function escAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function decodeEnt(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function fileToUrl(relFromRoot) {
  const norm = relFromRoot.replace(/\\/g, '/');
  if (norm === 'index.html') return `${SITE}/`;
  return `${SITE}/${norm}`;
}

function isNoindex(html) {
  return /name="robots"\s+content="[^"]*noindex/i.test(html);
}

function isRedirectStub(html) {
  return /http-equiv="refresh"/i.test(html) && /location\.replace/i.test(html);
}

function patchHead(html, relPath) {
  if (!html.includes('<head>')) return html;
  if (isRedirectStub(html)) return html;

  const descM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const desc = descM ? decodeEnt(descM[1]) : '';

  let ogLocale = 'pt_PT';
  if (relPath.startsWith('en/')) ogLocale = 'en_US';
  if (relPath.startsWith('fr/')) ogLocale = 'fr_FR';

  let out = html;

  const ogTitleM = out.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
  const titleM = out.match(/<title>([^<]*)<\/title>/i);
  const twTitle = ogTitleM ? decodeEnt(ogTitleM[1]) : titleM ? titleM[1].trim() : 'Correia Crespo';
  const twDesc = desc ? (desc.length > 200 ? `${desc.slice(0, 197)}…` : desc) : twTitle;

  const toInject = [];
  if (out.includes('property="og:image"') && !out.includes('property="og:description"') && desc) {
    toInject.push(`  <meta property="og:description" content="${escAttr(desc)}" />`);
  }
  if (!out.includes('name="twitter:card"') && out.includes('property="og:image"')) {
    toInject.push(`  <meta name="twitter:card" content="summary_large_image" />`);
    toInject.push(`  <meta name="twitter:title" content="${escAttr(twTitle)}" />`);
    toInject.push(`  <meta name="twitter:description" content="${escAttr(twDesc)}" />`);
    toInject.push(`  <meta name="twitter:image" content="${OG_IMAGE}" />`);
  }

  if (toInject.length) {
    out = out.replace(
      /(<meta\s+property="og:image"\s+content="[^"]+"\s*\/?>)/i,
      `$1\n${toInject.join('\n')}`
    );
  }

  if (out.includes('property="og:site_name"') && !out.includes('property="og:locale"')) {
    out = out.replace(
      /(<meta\s+property="og:site_name"\s+content="[^"]+"\s*\/?>)/i,
      `$1\n  <meta property="og:locale" content="${ogLocale}" />`
    );
  }

  if (out.includes('name="twitter:title"') && !out.includes('name="twitter:description"') && desc) {
    const short = desc.length > 200 ? `${desc.slice(0, 197)}…` : desc;
    out = out.replace(
      /(<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>)/i,
      `$1\n  <meta name="twitter:description" content="${escAttr(short)}" />`
    );
  }

  return out;
}

function shouldIncludeInSitemap(relPath, html) {
  if (relPath.startsWith('partials/')) return false;
  if (isNoindex(html)) return false;
  return true;
}

function main() {
  const files = walkHtml(ROOT);
  let changed = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (rel.startsWith('templates/') || rel.startsWith('partials/')) continue;
    const raw = fs.readFileSync(abs, 'utf8');
    const next = patchHead(raw, rel);
    if (next !== raw) {
      fs.writeFileSync(abs, next);
      changed++;
    }
  }
  console.log(`Heads atualizados: ${changed} ficheiros.`);

  const urls = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (rel.startsWith('templates/') || rel.startsWith('partials/')) continue;
    const raw = fs.readFileSync(abs, 'utf8');
    if (!shouldIncludeInSitemap(rel, raw)) continue;
    urls.push({ loc: fileToUrl(rel), lastmod: LASTMOD });
  }
  urls.sort((a, b) => a.loc.localeCompare(b.loc));

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`).join('\n') +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log(`sitemap.xml: ${urls.length} URLs.`);
}

main();
