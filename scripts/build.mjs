#!/usr/bin/env node
/**
 * build.mjs — Injeta header e footer inline em todas as páginas HTML da raiz.
 * Executar: node scripts/build.mjs  (ou: npm run build)
 *
 * Lê partials/header.html e partials/footer.html, substitui %%BASE%% pelo valor
 * de data-site-base na tag <body> de cada página (normalmente vazio na raiz),
 * e substitui os divs site-header-mount / site-footer-mount pelo markup inline.
 *
 * Se os mounts já não existirem (página já construída), substitui o bloco
 * <header class="header">…</header> e <footer class="footer">…</footer>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PARTIALS = path.join(ROOT, 'partials');

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

function injectOrReplace(html, headerHtml, footerHtml) {
  let out = html;
  // Incluir indentação da linha antes do mount, para não duplicar espaços.
  // Só consumir quebras de linha após o mount, nunca `\s*` (absorvia a indentação do <main> seguinte).
  const headerMount = /[\t ]*<div\s+id="site-header-mount"\s*>\s*<\/div>(?:\r?\n)+/;
  const footerMount = /[\t ]*<div\s+id="site-footer-mount"\s*>\s*<\/div>(?:\r?\n)+/;
  const headerBlock = /[\t ]*<header\b[^>]*class="header"[^>]*>[\s\S]*?<\/header>(?:\r?\n)+/i;
  const footerBlock = /[\t ]*<footer\b[^>]*class="footer"[^>]*>[\s\S]*?<\/footer>(?:\r?\n)+/i;

  if (headerMount.test(out)) {
    out = out.replace(headerMount, `${headerHtml}\n\n`);
  } else {
    out = out.replace(headerBlock, `${headerHtml}\n\n`);
  }

  if (footerMount.test(out)) {
    out = out.replace(footerMount, `${footerHtml}\n\n`);
  } else {
    out = out.replace(footerBlock, `${footerHtml}\n\n`);
  }

  return out;
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

  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  const htmlFiles = entries
    .filter((d) => d.isFile() && d.name.endsWith('.html'))
    .map((d) => d.name);

  let updated = 0;
  for (const name of htmlFiles) {
    const filePath = path.join(ROOT, name);
    const raw = readUtf8(filePath);
    const base = extractDataSiteBase(raw);
    const headerHtml = indentBlock(applyBase(headerTpl, base));
    const footerHtml = indentBlock(applyBase(footerTpl, base));
    const next = injectOrReplace(raw, headerHtml, footerHtml);

    if (next !== raw) {
      writeUtf8(filePath, next);
      updated++;
      console.log('OK', name);
    }
  }

  console.log(`\nConcluído: ${updated} ficheiro(s) actualizado(s).`);
}

main();
