#!/usr/bin/env node
/**
 * Valida parse de todos os blocos application/ld+json em HTML na raiz.
 * Uso: node scripts/validate-jsonld.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && f !== 'og-image-template.html');

let errors = 0;
let blocks = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const matches = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];

  matches.forEach((match, index) => {
    blocks += 1;
    try {
      JSON.parse(match[1]);
    } catch (err) {
      errors += 1;
      console.error(`${file} [bloco ${index + 1}]: ${err.message}`);
    }
  });
}

if (errors > 0) {
  console.error(`\nFalha: ${errors} bloco(s) inválido(s) em ${blocks} total.`);
  process.exit(1);
}

console.log(`OK: ${blocks} bloco(s) JSON-LD parseáveis em ${htmlFiles.length} ficheiro(s).`);
