#!/usr/bin/env node
/**
 * build.mjs — Injeta header e footer inline em páginas HTML da raiz e footer+banner
 * nas subpastas de idioma (ex.: en/, fr/).
 * Executar: node scripts/build.mjs  (ou: npm run build)
 *
 * Lê partials/header.html e partials/footer.html, substitui %%BASE%% pelo valor
 * de data-site-base na tag <body> de cada página (vazio na raiz, ../ em subpastas),
 * e substitui os divs site-header-mount / site-footer-mount pelo markup inline.
 *
 * Se os mounts já não existirem (página já construída), substitui o bloco
 * <header class="header">…</header> e <footer class="footer">…</footer>
 * (e o banner #cookie-consent, se existir após o footer).
 *
 * Nas subpastas de topo com HTML, só o footer+banner é injetado (o header traduzido
 * permanece na página). Na raiz, header e footer são ambos injetados.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PARTIALS = path.join(ROOT, 'partials');

/** Subpastas de topo ignoradas pelo build de idiomas. */
const SKIP_SUBDIR_BUILD = new Set([
  'assets',
  'dist',
  'node_modules',
  'scripts',
  'partials',
  'docs',
  'templates',
  '.git',
]);

const EXCLUDED_HTML = new Set(['og-image-template.html']);

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeUtf8(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}

/** Prefixa cada linha com `indent` (ex.: dois espaços, alinhado ao resto do HTML). */
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

function injectOrReplace(html, headerHtml, footerHtml, { replaceHeader = true } = {}) {
  let out = html;
  // Incluir indentação da linha antes do mount, para não duplicar espaços.
  // Só consumir quebras de linha após o mount, nunca `\s*` (absorvia a indentação do <main> seguinte).
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

/**
 * Substitui a região já construída desde <footer class="footer"> até <script (exclusive).
 * Consumir o intervalo completo torna a injeção idempotente e elimina lixo residual
 * (ex.: </div> órfãos deixados por regex parcial no cookie-consent).
 */
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

/** Páginas da raiz (header+footer) e HTML em subpastas de topo (só footer+banner). */
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
        replaceHeader: false,
      });
    }
  }

  return targets;
}

function processHtmlFile(filePath, headerTpl, footerTpl, replaceHeader) {
  const raw = readUtf8(filePath);
  const base = extractDataSiteBase(raw);
  const headerHtml = indentBlock(applyBase(headerTpl, base));
  const footerHtml = indentBlock(applyBase(footerTpl, base));
  const next = injectOrReplace(raw, headerHtml, footerHtml, { replaceHeader });
  return { raw, next };
}

function main() {
  const headerPath = path.join(PARTIALS, 'header.html');
  const footerPath = path.join(PARTIALS, 'footer.html');
  if (!fs.existsSync(headerPath) || !fs.existsSync(footerPath)) {
    console.error('Faltam partials/header.html ou partials/footer.html em', PARTIALS);
    process.exit(1);
  }

  const headerTpl = readUtf8(headerPath);
  const footerTpl = readUtf8(footerPath);

  const targets = collectBuildTargets();
  let updated = 0;
  for (const { rel, replaceHeader } of targets) {
    const filePath = path.join(ROOT, rel);
    const { raw, next } = processHtmlFile(filePath, headerTpl, footerTpl, replaceHeader);

    if (next !== raw) {
      writeUtf8(filePath, next);
      updated++;
      console.log('OK', rel);
    }
  }

  console.log(`\nConcluído: ${updated} ficheiro(s) actualizado(s).`);
}

main();
