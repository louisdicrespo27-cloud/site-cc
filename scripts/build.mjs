#!/usr/bin/env node
/**
 * build.mjs — Injeta header, footer e seletor de idioma conforme o idioma da página.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PARTIALS = path.join(ROOT, 'partials');
const I18N_MAP_PATH = path.join(__dirname, 'i18n-map.json');

const SKIP_SUBDIR_BUILD = new Set([
  'assets',
  'artigos',
  'dist',
  'node_modules',
  'scripts',
  'partials',
  'docs',
  'templates',
  '.git',
]);

const EXCLUDED_HTML = new Set(['og-image-template.html']);

const PATH_I18N_KEY = {
  'index.html': 'index',
  'sobre.html': 'about',
  'contactos.html': 'contact',
  'consulta-juridica.html': 'consultation',
  'politica-de-privacidade.html': 'privacy',
  'aviso-legal.html': 'legal-notice',
  'imovel-portugal-nao-residentes.html': 'property',
  'heranca-portugal-nao-residentes.html': 'inheritance',
  'en/index.html': 'index',
  'en/about.html': 'about',
  'en/contact.html': 'contact',
  'en/legal-consultation.html': 'consultation',
  'en/privacy.html': 'privacy',
  'en/legal-notice.html': 'legal-notice',
  'en/imovel-portugal-nao-residentes.html': 'property',
  'en/heranca-portugal-nao-residentes.html': 'inheritance',
  'fr/index.html': 'index',
  'fr/a-propos.html': 'about',
  'fr/contact.html': 'contact',
  'fr/consultation-juridique.html': 'consultation',
  'fr/confidentialite.html': 'privacy',
  'fr/mentions-legales.html': 'legal-notice',
  'fr/imovel-portugal-nao-residentes.html': 'property',
  'fr/heranca-portugal-nao-residentes.html': 'inheritance',
};

const SWITCHER_LABELS = {
  pt: 'Idioma',
  en: 'Language',
  fr: 'Langue',
};

const HREFLANG = { pt: 'pt-PT', en: 'en', fr: 'fr' };

function isRedirectStub(html) {
  return (
    /<html\b[^>]*\bdata-redirect-stub\b/i.test(html) ||
    (/http-equiv="refresh"/i.test(html) && /location\.replace/i.test(html))
  );
}

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeUtf8(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}

function indentBlock(html, indent = '  ') {
  return html
    .trimEnd()
    .split('\n')
    .map((line) => (line.length ? indent + line : line))
    .join('\n');
}

function applyBase(template, base) {
  return template.replaceAll('%%BASE%%', base);
}

function extractDataSiteBase(html) {
  const open = html.match(/<body\b[\s\S]*?>/i);
  if (!open) return '';
  const m = open[0].match(/\bdata-site-base="([^"]*)"/i);
  return m ? m[1] : '';
}

function extractI18nKey(html, rel) {
  const bodyOpen = html.match(/<body\b[^>]*>/i);
  if (bodyOpen) {
    const m = bodyOpen[0].match(/\bdata-i18n-key="([^"]+)"/i);
    if (m) return m[1];
  }
  return PATH_I18N_KEY[rel] || null;
}

function detectLang(rel) {
  if (rel.startsWith('en/')) return 'en';
  if (rel.startsWith('fr/')) return 'fr';
  return 'pt';
}

function clusterPathToFile(clusterPath) {
  if (clusterPath === '/') return 'index.html';
  return clusterPath.replace(/^\//, '');
}

function relativeHref(fromRel, targetFile) {
  const fromDir = path.dirname(fromRel);
  const rel = path.relative(fromDir === '.' ? '' : fromDir, targetFile);
  return rel.split(path.sep).join('/');
}

function loadI18nMap() {
  return JSON.parse(readUtf8(I18N_MAP_PATH));
}

function resolveClusterUrls(i18nMap, key, fromRel) {
  const cluster = i18nMap.clusters.find((c) => c.key === key);
  const hubs = i18nMap.hubs;
  const result = {};
  for (const lang of ['pt', 'en', 'fr']) {
    const abs = cluster ? cluster[lang] : hubs[lang];
    result[lang] = relativeHref(fromRel, clusterPathToFile(abs));
  }
  return result;
}

function renderLangItem(langCode, href, isCurrent) {
  const hreflang = HREFLANG[langCode];
  const label = langCode.toUpperCase();
  if (isCurrent) {
    return `<span class="language-switcher__current" aria-current="page" lang="${langCode === 'pt' ? 'pt' : langCode}">${label}</span>`;
  }
  return `<a href="${href}" hreflang="${hreflang}" lang="${langCode === 'pt' ? 'pt' : langCode}">${label}</a>`;
}

function buildLanguageSwitcher(fromRel, currentLang, i18nKey, i18nMap) {
  const urls = resolveClusterUrls(i18nMap, i18nKey, fromRel);
  const label = SWITCHER_LABELS[currentLang];
  const ptItem = renderLangItem('pt', urls.pt, currentLang === 'pt');
  const enItem = renderLangItem('en', urls.en, currentLang === 'en');
  const frItem = renderLangItem('fr', urls.fr, currentLang === 'fr');
  return `<nav class="language-switcher" aria-label="${label}">
  <ul class="language-switcher__list">
    <li>${ptItem}</li>
    <li>${enItem}</li>
    <li>${frItem}</li>
  </ul>
</nav>`;
}

function injectOrReplace(html, headerHtml, footerHtml, { replaceHeader = true } = {}) {
  let out = html;
  const headerMount = /[\t ]*<div\s+id="site-header-mount"\s*>\s*<\/div>(?:\r?\n)+/;
  const footerMount = /[\t ]*<div\s+id="site-footer-mount"\s*>\s*<\/div>(?:\r?\n)+/;
  const headerBlock = /[\t ]*<header\b[^>]*class="header"[^>]*>[\s\S]*?<\/header>(?:\r?\n)+/i;

  if (replaceHeader) {
    if (headerMount.test(out)) {
      out = out.replace(headerMount, `${headerHtml}\n\n`);
    } else {
      out = out.replace(headerBlock, `${headerHtml}\n\n`);
    }
  }

  if (footerMount.test(out)) {
    out = out.replace(footerMount, `${footerHtml}\n\n`);
  } else {
    out = replaceBuiltFooterRegion(out, footerHtml);
  }

  return out;
}

function replaceBuiltFooterRegion(html, footerHtml) {
  const footerMatch = html.match(/[\t ]*<footer\b[^>]*class="footer"[^>]*>/i);
  if (!footerMatch || footerMatch.index === undefined) return html;

  const footerStart = footerMatch.index;
  const tail = html.slice(footerStart);
  const scriptMatch = tail.match(/[\t ]*<script\b/i);
  if (!scriptMatch || scriptMatch.index === undefined) return html;

  const scriptStart = footerStart + scriptMatch.index;
  const before = html.slice(0, footerStart);
  const after = html.slice(scriptStart);
  return `${before}${footerHtml}\n\n${after}`;
}

function resolveHeaderPartial(rel) {
  if (rel.startsWith('en/')) return path.join(PARTIALS, 'header-en.html');
  if (rel.startsWith('fr/')) return path.join(PARTIALS, 'header-fr.html');
  return path.join(PARTIALS, 'header.html');
}

function resolveFooterPartial(rel) {
  if (rel.startsWith('en/')) return path.join(PARTIALS, 'footer-en.html');
  if (rel.startsWith('fr/')) return path.join(PARTIALS, 'footer-fr.html');
  return path.join(PARTIALS, 'footer.html');
}

function collectBuildTargets() {
  const targets = [];

  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (ent.isFile() && ent.name.endsWith('.html') && !EXCLUDED_HTML.has(ent.name)) {
      targets.push({ rel: ent.name, replaceHeader: true });
    }
  }

  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || SKIP_SUBDIR_BUILD.has(ent.name)) continue;
    const subDir = path.join(ROOT, ent.name);
    for (const file of fs.readdirSync(subDir, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.html') || EXCLUDED_HTML.has(file.name)) continue;
      targets.push({
        rel: path.join(ent.name, file.name).replace(/\\/g, '/'),
        replaceHeader: true,
      });
    }
  }

  return targets;
}

function processHtmlFile(filePath, headerTpl, footerTpl, replaceHeader, rel, i18nMap) {
  const raw = readUtf8(filePath);
  const base = extractDataSiteBase(raw);
  const currentLang = detectLang(rel);
  const i18nKey = extractI18nKey(raw, rel);
  const switcher = buildLanguageSwitcher(rel, currentLang, i18nKey, i18nMap);
  let headerWithSwitcher = headerTpl.replace('%%LANGUAGE_SWITCHER%%', switcher);
  const headerHtml = indentBlock(applyBase(headerWithSwitcher, base));
  const footerHtml = indentBlock(applyBase(footerTpl, base));
  const next = injectOrReplace(raw, headerHtml, footerHtml, { replaceHeader });
  return { raw, next };
}

function main() {
  const headerPaths = [
    path.join(PARTIALS, 'header.html'),
    path.join(PARTIALS, 'header-en.html'),
    path.join(PARTIALS, 'header-fr.html'),
  ];
  const footerPaths = [
    path.join(PARTIALS, 'footer.html'),
    path.join(PARTIALS, 'footer-en.html'),
    path.join(PARTIALS, 'footer-fr.html'),
  ];
  if (headerPaths.some((p) => !fs.existsSync(p)) || footerPaths.some((p) => !fs.existsSync(p))) {
    console.error('Faltam partials de header ou footer em', PARTIALS);
    process.exit(1);
  }
  if (!fs.existsSync(I18N_MAP_PATH)) {
    console.error('Falta scripts/i18n-map.json');
    process.exit(1);
  }

  const i18nMap = loadI18nMap();
  const targets = collectBuildTargets();
  let updated = 0;
  for (const { rel, replaceHeader } of targets) {
    const filePath = path.join(ROOT, rel);
    const raw = readUtf8(filePath);
    if (isRedirectStub(raw)) continue;

    const headerTpl = readUtf8(resolveHeaderPartial(rel));
    const footerTpl = readUtf8(resolveFooterPartial(rel));
    const { raw: pageRaw, next } = processHtmlFile(
      filePath,
      headerTpl,
      footerTpl,
      replaceHeader,
      rel,
      i18nMap
    );

    if (next !== pageRaw) {
      writeUtf8(filePath, next);
      updated++;
      console.log('OK', rel);
    }
  }

  console.log(`\nConcluído: ${updated} ficheiro(s) actualizado(s).`);
}

main();
