#!/usr/bin/env node
/**
 * Normaliza meta Open Graph / Twitter, injeta CSP (meta http-equiv) e gera sitemap.xml.
 * lastmod: JSON-LD dateModified → mapa explícito → data de modificação do ficheiro.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.correiacrespo-advogados.pt';
const OG_IMAGE = `${SITE}/assets/img/og.jpg`;

const CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; script-src 'self' https://www.googletagmanager.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://api.web3forms.com; form-action 'self' https://api.web3forms.com;";

const EXCLUDED_HTML = new Set(['og-image-template.html']);

/** Páginas institucionais EN/FR criadas na implementação i18n (Prompt 6). */
const I18N_INSTITUTIONAL_LASTMOD = {
  'en/about.html': '2026-07-05',
  'en/contact.html': '2026-07-05',
  'en/legal-consultation.html': '2026-07-05',
  'en/privacy.html': '2026-07-05',
  'en/legal-notice.html': '2026-07-05',
  'fr/a-propos.html': '2026-07-05',
  'fr/contact.html': '2026-07-05',
  'fr/consultation-juridique.html': '2026-07-05',
  'fr/confidentialite.html': '2026-07-05',
  'fr/mentions-legales.html': '2026-07-05',
};

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist' || ent.name === 'scripts') continue;
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
  return (
    /<html\b[^>]*\bdata-redirect-stub\b/i.test(html) ||
    (/http-equiv="refresh"/i.test(html) && /location\.replace/i.test(html))
  );
}

/**
 * Resolve lastmod: dateModified no JSON-LD, mapa institucional, ou mtime do ficheiro.
 * Sempre devolve YYYY-MM-DD (todas as URLs do sitemap têm <lastmod>).
 */
function resolveLastmod(html, rel, absPath) {
  const jsonLdMatch = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  if (jsonLdMatch) return jsonLdMatch[1];

  if (I18N_INSTITUTIONAL_LASTMOD[rel]) return I18N_INSTITUTIONAL_LASTMOD[rel];

  const mtime = fs.statSync(absPath).mtime;
  return mtime.toISOString().slice(0, 10);
}

function injectCspMeta(html) {
  const tag = `  <meta http-equiv="Content-Security-Policy" content="${escAttr(CSP)}" />`;
  const existing = html.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/i
  );
  if (existing) {
    const current = decodeEnt(existing[1]);
    if (current === CSP) return html;
    return html.replace(existing[0], tag);
  }
  if (/<meta\s+charset=/i.test(html)) {
    return html.replace(/(<meta\s+charset=[^>]+>)/i, `$1\n${tag}`);
  }
  return html.replace(/<head>/i, `<head>\n${tag}`);
}

function patchHead(html, relPath) {
  if (!html.includes('<head>')) return html;
  if (isRedirectStub(html)) return html;

  const descM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const desc = descM ? decodeEnt(descM[1]) : '';

  let ogLocale = 'pt_PT';
  if (relPath.startsWith('en/')) {
    ogLocale = relPath.includes('buying-property-portugal-us-citizens') ? 'en_US' : 'en_GB';
  }
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

  if (shouldInjectCsp(relPath, html)) {
    out = injectCspMeta(out);
  }

  return out;
}

/** Gate de CSP independente do sitemap — inclui páginas noindex servidas ao utilizador. */
function shouldInjectCsp(relPath, html) {
  if (EXCLUDED_HTML.has(relPath)) return false;
  if (relPath.startsWith('partials/')) return false;
  if (isRedirectStub(html)) return false;
  return true;
}

function shouldIncludeInSitemap(relPath, html) {
  if (EXCLUDED_HTML.has(relPath)) return false;
  if (relPath.startsWith('partials/')) return false;
  if (isNoindex(html)) return false;
  if (isRedirectStub(html)) return false;
  return true;
}

function buildUrlXmlEntry(entry) {
  return (
    `  <url>\n` +
    `    <loc>${entry.loc}</loc>\n` +
    `    <lastmod>${entry.lastmod}</lastmod>\n` +
    `    <changefreq>monthly</changefreq>\n` +
    `  </url>`
  );
}

function main() {
  const files = walkHtml(ROOT);
  let changed = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (rel.startsWith('templates/') || rel.startsWith('partials/') || EXCLUDED_HTML.has(rel)) continue;
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
    if (rel.startsWith('templates/') || rel.startsWith('partials/') || EXCLUDED_HTML.has(rel)) continue;
    const raw = fs.readFileSync(abs, 'utf8');
    if (!shouldIncludeInSitemap(rel, raw)) continue;
    const lastmod = resolveLastmod(raw, rel, abs);
    urls.push({ loc: fileToUrl(rel), lastmod });
  }
  urls.sort((a, b) => a.loc.localeCompare(b.loc));

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(buildUrlXmlEntry).join('\n') +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log(`sitemap.xml: ${urls.length} URLs (${urls.length} com lastmod).`);
}

main();
