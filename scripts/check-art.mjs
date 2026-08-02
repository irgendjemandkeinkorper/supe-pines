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

// Define launch targets
const LAUNCH_TARGET_NUMBERS = {
  ink: { cases: 5, heroes: 0, signals: 20, threats: 0 },
  expressionist: { cases: 1, heroes: 0, signals: 0, threats: 0 }
};

const REQUIRED_LAUNCH_ASSETS = [
  { style: 'ink', category: 'cases', id: 'afterhours' },
  { style: 'ink', category: 'cases', id: 'casting' },
  { style: 'ink', category: 'cases', id: 'lastcall' },
  { style: 'ink', category: 'cases', id: 'renovation' },
  { style: 'ink', category: 'cases', id: 'toll' },
  { style: 'expressionist', category: 'cases', id: 'afterhours' }
];

// Calculate actual counts by style and category
const actualCounts = {
  ink: { cases: 0, heroes: 0, signals: 0, threats: 0 },
  expressionist: { cases: 0, heroes: 0, signals: 0, threats: 0 }
};

records.forEach(record => {
  if (existingPath(record)) {
    actualCounts[record.style][record.category]++;
  }
});

let launchFailed = false;

// 1. Verify numeric targets
console.log('\nVerifying numeric launch targets:');
for (const style of Object.keys(LAUNCH_TARGET_NUMBERS)) {
  for (const category of Object.keys(LAUNCH_TARGET_NUMBERS[style])) {
    const actual = actualCounts[style][category];
    const target = LAUNCH_TARGET_NUMBERS[style][category];
    if (actual < target) {
      console.error(`- [FAIL] Style "${style}" Category "${category}": actual ${actual} < target ${target}`);
      launchFailed = true;
    } else {
      console.log(`- [PASS] Style "${style}" Category "${category}": actual ${actual} >= target ${target}`);
    }
  }
}

// 2. Verify specific required assets
console.log('\nVerifying specific required launch assets:');
REQUIRED_LAUNCH_ASSETS.forEach(asset => {
  const match = records.find(r => r.style === asset.style && r.category === asset.category && r.id === asset.id);
  if (!match) {
    console.error(`- [FAIL] Asset expectation not found in manifest: style=${asset.style}, category=${asset.category}, id=${asset.id}`);
    launchFailed = true;
  } else if (!existingPath(match)) {
    console.error(`- [FAIL] Missing required launch asset: ${match.savePath}`);
    launchFailed = true;
  } else {
    console.log(`- [PASS] Found required launch asset: ${match.savePath}`);
  }
});

if (launchFailed) {
  console.error('\n[ERROR] Launch art coverage gate FAILED!');
  process.exitCode = 1;
} else {
  console.log('\n[SUCCESS] Launch art coverage gate PASSED!');
}

if(missing.length){
  if (args.has('--strict')) {
    console.log('\nStrict check requested. Full coverage is required.');
    console.log('Missing paths:');
    missing.forEach(record => console.log(`- ${record.savePath}`));
    process.exitCode = 1;
  }
}
