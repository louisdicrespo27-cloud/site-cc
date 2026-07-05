#!/usr/bin/env node
/**
 * QA i18n — páginas EN/FR, navegação, órfãos, termos proibidos, sitemap
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.correiacrespo-advogados.pt';
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-map.json'), 'utf8'));

const failures = [];
const warnings = [];

const FORBIDDEN = [
  /\blaw firm\b/i,
  /\blegal firm\b/i,
  /\bour lawyers\b/i,
  /\bour team\b/i,
  /\bthe firm\b/i,
  /\bcabinet d['']avocats\b/i,
  /\bsociété d['']avocats\b/i,
  /\bnotre équipe\b/i,
  /\bnos avocats\b/i,
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'partials', 'templates', 'docs', 'scripts']);

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkHtml(path.join(dir, ent.name), acc);
    } else if (ent.name.endsWith('.html')) {
      acc.push(path.join(dir, ent.name));
    }
  }
  return acc;
}

function relFromRoot(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function isRedirectStub(html) {
  return /http-equiv="refresh"/i.test(html) && /location\.replace/i.test(html);
}

function fileToUrl(rel) {
  if (rel === 'index.html') return `${SITE}/`;
  return `${SITE}/${rel}`;
}

function extractNavLinks(html) {
  const headerMatch = html.match(/<header\b[^>]*class="header"[^>]*>([\s\S]*?)<\/header>/i);
  if (!headerMatch) return [];
  const navMatch = headerMatch[1].match(/<div\s+class="nav-links"[^>]*>([\s\S]*?)<\/div>/i);
  if (!navMatch) return [];
  const links = [];
  const re = /<a\b[^>]*href="([^"#?][^"]*)"/gi;
  let m;
  while ((m = re.exec(navMatch[1]))) links.push(m[1]);
  return links;
}

function isPortuguesePath(href) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  const clean = href.replace(/^\.\.\//, '').split('#')[0];
  if (clean.startsWith('en/') || clean.startsWith('fr/')) return false;
  if (/^(index\.html|about\.html|contact\.html|legal-consultation|privacy|legal-notice|request-received|a-propos|consultation-juridique|confidentialite|mentions-legales|demande-recue)/.test(clean)) return false;
  return !clean.includes('/') && !/^(imovel-portugal|heranca-portugal|why-portugal|pourquoi-le-portugal|buying-property|conditions\.html)/.test(clean);
}

function countH1(html) {
  return (html.match(/<h1\b/gi) || []).length;
}

const allHtml = walkHtml(ROOT).filter((abs) => {
  const rel = relFromRoot(abs);
  return !rel.startsWith('partials/') && !rel.startsWith('templates/');
});

const enPages = allHtml.filter((abs) => relFromRoot(abs).startsWith('en/'));
const frPages = allHtml.filter((abs) => relFromRoot(abs).startsWith('fr/'));

const inbound = new Map();
for (const abs of allHtml) {
  const from = relFromRoot(abs);
  const html = fs.readFileSync(abs, 'utf8');
  if (isRedirectStub(html)) continue;
  const re = /href="(\.\.?\/[^"#?][^"]*|[^"#?:][^"]*\.html[^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    let target = m[1].split('#')[0];
    if (target.startsWith('http') || target.startsWith('mailto:') || target.startsWith('tel:')) continue;
    const fromDir = path.dirname(from);
    const resolved = path.normalize(path.join(fromDir === '.' ? '' : fromDir, target)).replace(/\\/g, '/');
    if (!inbound.has(resolved)) inbound.set(resolved, new Set());
    inbound.get(resolved).add(from);
  }
}

for (const abs of [...enPages, ...frPages]) {
  const rel = relFromRoot(abs);
  const html = fs.readFileSync(abs, 'utf8');
  if (isRedirectStub(html)) continue;

  const lang = rel.startsWith('en/') ? 'en' : 'fr';
  const htmlLang = html.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1] || '';
  if (lang === 'en' && !htmlLang.startsWith('en')) failures.push(`${rel}: lang HTML incorrecto (${htmlLang})`);
  if (lang === 'fr' && !htmlLang.startsWith('fr')) failures.push(`${rel}: lang HTML incorrecto (${htmlLang})`);

  if (!html.includes('language-switcher')) failures.push(`${rel}: falta seletor de idioma`);

  const h1Count = countH1(html);
  if (h1Count !== 1) failures.push(`${rel}: ${h1Count} H1 (esperado 1)`);

  if ((html.match(/style="/g) || []).length) failures.push(`${rel}: contém style="" inline`);

  for (const re of FORBIDDEN) {
    if (re.test(html)) failures.push(`${rel}: termo proibido ${re}`);
  }

  if (html.includes('"@type": "Attorney"') || html.includes('"@type":"Attorney"')) {
    failures.push(`${rel}: JSON-LD Attorney proibido`);
  }

  const navLinks = extractNavLinks(html);
  for (const href of navLinks) {
    if (isPortuguesePath(href)) {
      failures.push(`${rel}: nav principal liga silenciosamente para PT: ${href}`);
    }
  }

  const refs = inbound.get(rel);
  if (!refs || refs.size === 0) {
    if (!rel.includes('request-received') && !rel.includes('demande-recue') && !rel.includes('conditions.html')) {
      failures.push(`${rel}: página órfã (sem inbound interno)`);
    }
  }
}

const requiredEn = [
  'en/index.html', 'en/about.html', 'en/contact.html', 'en/legal-consultation.html',
  'en/privacy.html', 'en/legal-notice.html', 'en/request-received.html',
];
const requiredFr = [
  'fr/index.html', 'fr/a-propos.html', 'fr/contact.html', 'fr/consultation-juridique.html',
  'fr/confidentialite.html', 'fr/mentions-legales.html', 'fr/demande-recue.html',
];
for (const rel of [...requiredEn, ...requiredFr]) {
  if (!fs.existsSync(path.join(ROOT, rel))) failures.push(`${rel}: página obrigatória em falta`);
}

if (fs.existsSync(path.join(ROOT, 'sitemap.xml'))) {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const noindexPath of map.noindex) {
    const url = fileToUrl(noindexPath === '/' ? 'index.html' : noindexPath.replace(/^\//, ''));
    if (sitemap.includes(url)) failures.push(`sitemap inclui noindex: ${url}`);
  }
} else {
  warnings.push('sitemap.xml não encontrado — executar npm run seo');
}

if (failures.length) {
  console.error(`qa:i18n FAIL (${failures.length} problemas)`);
  failures.forEach((f) => console.error(' -', f));
  if (warnings.length) warnings.forEach((w) => console.warn(' !', w));
  process.exit(1);
}

console.log(`qa:i18n PASS (EN: ${enPages.length}, FR: ${frPages.length} páginas)`);
if (warnings.length) warnings.forEach((w) => console.warn(' !', w));
