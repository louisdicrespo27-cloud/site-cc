#!/usr/bin/env node
/**
 * generate-redirects.mjs — Gera stubs HTML de redirecionamento para URLs antigas.
 * Executar: npm run redirects
 *
 * Lê redirects.json (pares from → to) e templates/redirect-stub.html.
 * Os destinos em redirects.json usam caminhos relativos ao site; o script
 * converte-os em URLs absolutas em SITE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.correiacrespo-advogados.pt';

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeUtf8(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, 'utf8');
}

function toAbsoluteUrl(toPath) {
  if (/^https?:\/\//i.test(toPath)) return toPath;
  const norm = toPath.startsWith('/') ? toPath : `/${toPath}`;
  return `${SITE}${norm}`;
}

function escapeForJsString(url) {
  return url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function renderStub(template, { lang, destUrl }) {
  return template
    .replaceAll('%%LANG%%', lang)
    .replaceAll('%%DEST_URL%%', destUrl)
    .replaceAll('%%DEST_URL_JS%%', escapeForJsString(destUrl));
}

function main() {
  const configPath = path.join(ROOT, 'redirects.json');
  const templatePath = path.join(ROOT, 'templates', 'redirect-stub.html');

  if (!fs.existsSync(configPath) || !fs.existsSync(templatePath)) {
    console.error('Faltam redirects.json ou templates/redirect-stub.html');
    process.exit(1);
  }

  const redirects = JSON.parse(readUtf8(configPath));
  const template = readUtf8(templatePath);
  let written = 0;

  for (const entry of redirects) {
    const { from, to, lang = 'pt-PT' } = entry;
    if (!from || !to) {
      console.error('Entrada inválida em redirects.json:', entry);
      process.exit(1);
    }

    const destUrl = toAbsoluteUrl(to);
    const html = renderStub(template, { lang, destUrl });
    const outPath = path.join(ROOT, from);
    writeUtf8(outPath, html);
    written++;
    console.log('OK', from, '→', destUrl);
  }

  console.log(`\nConcluído: ${written} stub(s) gerado(s).`);
}

main();
