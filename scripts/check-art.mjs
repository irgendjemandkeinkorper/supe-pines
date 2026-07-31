#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './gen-manifest.mjs';

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const records = buildManifest();
const extensions = ['png', 'jpg', 'jpeg', 'webp'];
const existingPath = record => {
  const base = record.savePath.replace(/\.[^.]+$/, '');
  return extensions.map(ext => path.join(repo, `${base}.${ext}`)).find(fs.existsSync);
};
const missing = records.filter(record => !existingPath(record));

const byStyle = [...new Set(records.map(record => record.style))]
  .map(style => {
    const styleRecords = records.filter(record => record.style === style);
    const styleMissing = missing.filter(record => record.style === style);
    return `${style}: ${styleRecords.length - styleMissing.length}/${styleRecords.length}`;
  }).join(' · ');
console.log(`Art coverage: ${byStyle}.`);
if(missing.length){
  console.log('Missing paths:');
  missing.forEach(record => console.log(`- ${record.savePath}`));
  if(args.has('--strict')) process.exitCode = 1;
}
