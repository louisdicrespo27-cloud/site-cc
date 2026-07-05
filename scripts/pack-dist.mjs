#!/usr/bin/env node
/**
 * pack-dist.mjs — Cria um ZIP de entrega com APENAS o conteúdo de dist/.
 * Executar: npm run pack  (requer dist/ gerado por npm run prepare:public)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/** Nomes/pastas que nunca entram no pacote, mesmo que apareçam em dist/. */
const SKIP_NAMES = new Set([
  '.git',
  '.DS_Store',
  '__MACOSX',
  'node_modules',
  'docs',
]);

/** Extensões de ficheiros-fonte que não pertencem a um pacote de produção. */
const SOURCE_EXTENSIONS = new Set([
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.map',
]);

function shouldSkip(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  const base = path.basename(relPath);

  if (SKIP_NAMES.has(base)) return true;
  if (normalized.split('/').some((part) => SKIP_NAMES.has(part))) return true;
  if (base.startsWith('.env')) return true;
  if (SOURCE_EXTENSIONS.has(path.extname(base).toLowerCase())) return true;

  return false;
}

function collectFiles(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (shouldSkip(rel)) continue;

    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(abs, rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }

  return files;
}

function main() {
  if (!fs.existsSync(DIST) || !fs.statSync(DIST).isDirectory()) {
    console.error('Erro: dist/ não existe. Execute primeiro: npm run build && npm run seo && npm run prepare:public');
    process.exit(1);
  }

  const files = collectFiles(DIST);
  if (files.length === 0) {
    console.error('Erro: dist/ está vazio ou só contém ficheiros excluídos.');
    process.exit(1);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const zipName = `site-cc-dist-${stamp}.zip`;
  const zipPath = path.join(ROOT, zipName);

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  // zip grava caminhos relativos a dist/ — o ZIP abre directamente no conteúdo público.
  execFileSync('zip', ['-q', zipPath, ...files], { cwd: DIST, stdio: 'inherit' });

  const sizeKb = Math.round(fs.statSync(zipPath).size / 1024);
  console.log(`OK ${zipName} (${files.length} ficheiro(s), ~${sizeKb} KiB)`);
}

main();
