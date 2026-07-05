#!/usr/bin/env node
/**
 * Valida parse de todos os blocos application/ld+json em HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'dist', 'partials', 'templates']);

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP.has(ent.name)) continue;
      walkHtml(p, acc);
    } else if (ent.name.endsWith('.html') && ent.name !== 'og-image-template.html') {
      acc.push(p);
    }
  }
  return acc;
}

let errors = 0;
let blocks = 0;
const files = walkHtml(ROOT);

for (const abs of files) {
  const rel = path.relative(ROOT, abs);
  const html = fs.readFileSync(abs, 'utf8');
  const matches = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];

  matches.forEach((match, index) => {
    blocks += 1;
    try {
      JSON.parse(match[1]);
    } catch (err) {
      errors += 1;
      console.error(`${rel} [bloco ${index + 1}]: ${err.message}`);
    }
  });
}

if (errors > 0) {
  console.error(`\nFalha: ${errors} bloco(s) inválido(s) em ${blocks} total.`);
  process.exit(1);
}

console.log(`OK: ${blocks} bloco(s) JSON-LD parseáveis em ${files.length} ficheiro(s).`);
