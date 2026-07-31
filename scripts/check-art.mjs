#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './gen-manifest.mjs';

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const records = buildManifest().filter(record => record.style === 'ink');
const extensions = ['png', 'jpg', 'jpeg', 'webp'];
const existingPath = record => {
  const base = record.savePath.replace(/\.[^.]+$/, '');
  return extensions.map(ext => path.join(repo, `${base}.${ext}`)).find(fs.existsSync);
};
const missing = records.filter(record => !existingPath(record));

console.log(`Comic Ink art: ${records.length - missing.length}/${records.length} assets present.`);
if(missing.length){
  console.log('Missing paths:');
  missing.forEach(record => console.log(`- ${record.savePath}`));
  if(args.has('--strict-ink')) process.exitCode = 1;
}
