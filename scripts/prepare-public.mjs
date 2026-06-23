#!/usr/bin/env node
/**
 * prepare-public.mjs — Gera dist/ com apenas ficheiros públicos para produção.
 * Executar: node scripts/prepare-public.mjs  (ou: npm run prepare:public)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const SKIP_NAMES = new Set([
  '.DS_Store',
  '__MACOSX',
  '.git',
  'Thumbs.db',
]);

const ROOT_ICON_FILES = [
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
];

const ROOT_STATIC_FILES = [
  'sitemap.xml',
  'robots.txt',
  'llms.txt',
  'site.webmanifest',
  'CNAME',
  '_headers',
];

const EXCLUDED_HTML = new Set(['og-image-template.html']);

/** Pastas de topo que nunca são publicadas como subpastas de idioma. */
const SKIP_TOP_LEVEL_DIRS = new Set([
  'assets',
  'dist',
  'node_modules',
  'scripts',
  'partials',
  'docs',
  'templates',
  '.git',
]);

function shouldSkipEntry(name) {
  return SKIP_NAMES.has(name) || name.endsWith('.zip');
}

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (shouldSkipEntry(ent.name)) continue;
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(src, dest);
    } else if (ent.isFile()) {
      copyFile(src, dest);
    }
  }
}

function copyRootHtml() {
  let count = 0;
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.html')) continue;
    if (EXCLUDED_HTML.has(ent.name)) continue;
    copyFile(path.join(ROOT, ent.name), path.join(DIST, ent.name));
    count++;
  }
  return count;
}

function countHtmlInDir(dir) {
  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkipEntry(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countHtmlInDir(p);
    else if (ent.isFile() && ent.name.endsWith('.html') && !EXCLUDED_HTML.has(ent.name)) count++;
  }
  return count;
}

function dirContainsHtml(dir) {
  return countHtmlInDir(dir) > 0;
}

/** Copia subpastas de topo com HTML (ex.: en/, fr/) para dist/, recursivamente. */
function copyLanguageSubdirs() {
  let total = 0;
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || SKIP_TOP_LEVEL_DIRS.has(ent.name) || shouldSkipEntry(ent.name)) continue;
    const srcDir = path.join(ROOT, ent.name);
    if (!dirContainsHtml(srcDir)) continue;
    copyDirRecursive(srcDir, path.join(DIST, ent.name));
    const count = countHtmlInDir(path.join(DIST, ent.name));
    console.log(`${ent.name}/: ${count} ficheiro(s) HTML copiado(s).`);
    total += count;
  }
  return total;
}

function copyIfExists(relPath) {
  const src = path.join(ROOT, relPath);
  if (!fs.existsSync(src)) return false;
  const dest = path.join(DIST, relPath);
  copyFile(src, dest);
  return true;
}

function main() {
  console.log('A preparar artefacto público em dist/…');
  rmDirRecursive(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  const htmlCount = copyRootHtml();
  console.log(`HTML: ${htmlCount} ficheiro(s) copiado(s).`);

  const localeHtmlCount = copyLanguageSubdirs();
  if (localeHtmlCount > 0) {
    console.log(`HTML (subpastas de idioma): ${localeHtmlCount} ficheiro(s) no total.`);
  }

  const assetsSrc = path.join(ROOT, 'assets');
  if (!fs.existsSync(assetsSrc)) {
    console.error('Falta a pasta assets/.');
    process.exit(1);
  }
  copyDirRecursive(assetsSrc, path.join(DIST, 'assets'));
  console.log('assets/ copiado.');

  let staticCount = 0;
  for (const name of ROOT_STATIC_FILES) {
    if (copyIfExists(name)) staticCount++;
  }
  console.log(`Estáticos raiz: ${staticCount} ficheiro(s) copiado(s).`);

  let iconCount = 0;
  for (const name of ROOT_ICON_FILES) {
    if (copyIfExists(name)) iconCount++;
  }
  if (iconCount) console.log(`Ícones raiz: ${iconCount} ficheiro(s) copiado(s).`);

  console.log('\nConcluído: dist/ pronto para publicação.');
}

main();
