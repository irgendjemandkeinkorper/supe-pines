#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, HEROES, SIGNALS } from '../js/data/index.js';
import {
  STYLE_PROMPTS, caseArt, heroArt, signalArt, slugify, threatArt, validatePromptCoverage
} from './gen-prompts.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_VAULT = process.env.SUPE_PINES_VAULT || path.join(REPO, '..', 'supe-pines-vault');
const PAGES_BASE = (process.env.SUPE_PINES_PAGES_BASE || 'https://irgendjemandkeinkorper.github.io/supe-pines').replace(/\/$/, '');
const STYLES = ['ink', 'burden'];
const ASPECTS = { heroes:'3:4', cases:'3:4', signals:'1:1', threats:'3:4' };

function artField(style, side){ return side ? `image_${style}_${side}` : `image_${style}`; }

function addRecord(manifest, { id, category, style, side = null, name, subject }){
  const suffix = side ? `--${side}` : '';
  const basePath = `art/images/${style}/${category}/${id}${suffix}`;
  manifest.push({
    id,
    category,
    style,
    side,
    field:artField(style, side),
    name,
    prompt:`${STYLE_PROMPTS[style]} Subject: ${subject}`,
    aspectRatio:ASPECTS[category],
    savePath:`${basePath}.png`,
    imageUrl:`${PAGES_BASE}/${basePath}.png`,
    vaultPath:`${category}/${id}.md`
  });
}

export function buildManifest(){
  const coverageErrors = validatePromptCoverage();
  if(coverageErrors.length) throw new Error(`Prompt coverage is incomplete:\n${coverageErrors.join('\n')}`);
  const manifest = [];

  HEROES.forEach(hero => {
    const id = slugify(hero.role);
    STYLES.forEach(style => {
      addRecord(manifest, { id, category:'heroes', style, side:'front', name:hero.role, subject:heroArt[hero.role].front });
      addRecord(manifest, { id, category:'heroes', style, side:'turned', name:hero.role, subject:heroArt[hero.role].turned });
    });
  });
  CASES.forEach(item => STYLES.forEach(style => {
    addRecord(manifest, { id:item.id, category:'cases', style, name:item.title, subject:caseArt[item.id] });
  }));
  SIGNALS.forEach(item => STYLES.forEach(style => {
    addRecord(manifest, { id:slugify(item.title), category:'signals', style, name:item.title, subject:signalArt[item.title] });
  }));
  CASES.forEach(item => STYLES.forEach(style => {
    addRecord(manifest, { id:item.id, category:'threats', style, name:`The Threat — ${item.title}`, subject:threatArt[item.id] });
  }));
  return manifest;
}

export function validateManifest(manifest){
  const errors = [];
  const categories = new Set(Object.keys(ASPECTS));
  const styles = new Set(STYLES);
  const seenPaths = new Set();
  manifest.forEach((record, index) => {
    const label = `${record?.category || 'unknown'}/${record?.id || index}/${record?.style || 'unknown'}${record?.side ? `/${record.side}` : ''}`;
    for(const field of ['id', 'category', 'style', 'field', 'name', 'prompt', 'aspectRatio', 'savePath', 'imageUrl', 'vaultPath']){
      if(typeof record?.[field] !== 'string' || !record[field].trim()) errors.push(`${label}: ${field} must be a non-empty string.`);
    }
    if(!categories.has(record?.category)) errors.push(`${label}: unsupported category "${record?.category}".`);
    if(!styles.has(record?.style)) errors.push(`${label}: unsupported style "${record?.style}".`);
    if(record?.category === 'heroes' && !['front', 'turned'].includes(record?.side)) errors.push(`${label}: Hero record must use front or turned side.`);
    if(record?.category !== 'heroes' && record?.side !== null) errors.push(`${label}: only Hero records may have a side.`);
    if(record?.aspectRatio !== ASPECTS[record?.category]) errors.push(`${label}: expected aspect ratio ${ASPECTS[record?.category]}.`);
    if(!record?.savePath?.startsWith(`art/images/${record?.style}/${record?.category}/`)) errors.push(`${label}: savePath does not match the Gallery convention.`);
    if(record?.savePath?.includes('..')) errors.push(`${label}: savePath may not traverse directories.`);
    if(seenPaths.has(record?.savePath)) errors.push(`${label}: duplicate savePath "${record.savePath}".`);
    seenPaths.add(record?.savePath);
  });
  const expected = HEROES.length * 4 + CASES.length * 4 + SIGNALS.length * 2;
  if(manifest.length !== expected) errors.push(`Manifest: expected ${expected} records, found ${manifest.length}.`);
  return errors;
}

function vaultEntities(){
  const heroes = HEROES.map(hero => ({
    id:slugify(hero.role),
    type:'hero',
    category:'heroes',
    name:hero.role,
    tags:['hero', ...new Set(hero.sides.map(side => side.tone.toLowerCase()))],
    summary:hero.flavor,
    body:`# ${hero.role}\n\n*${hero.flavor}*\n\n## Sides\n\n- **Side I (${hero.sides[0].tone}):** ${hero.sides[0].cond}\n- **Side II (${hero.sides[1].tone}):** ${hero.sides[1].cond}\n\n## Setup questions by Case\n\n${CASES.map(item => `- **${item.title}:** ${hero.setup[item.id]}`).join('\n')}\n`,
    imageFields:STYLES.flatMap(style => [artField(style, 'front'), artField(style, 'turned')]),
    related:[]
  }));
  const cases = CASES.map(item => ({
    id:item.id,
    type:'case',
    category:'cases',
    name:item.title,
    tags:['case'],
    summary:item.epigraph,
    body:`# ${item.title}\n\n*${item.epigraph}*\n\n${item.threatLine}\n\n## Read-aloud introduction\n\n${item.intro.replace(/<br><br>/g, '\n\n')}\n`,
    imageFields:STYLES.map(style => artField(style, null)),
    related:[item.id]
  }));
  const signals = SIGNALS.map(item => ({
    id:slugify(item.title),
    type:'signal',
    category:'signals',
    name:item.title,
    tags:['signal'],
    summary:item.line,
    body:`# ${item.glyph} ${item.title}\n\n*${item.line}*\n`,
    imageFields:STYLES.map(style => artField(style, null)),
    related:[]
  }));
  const threats = CASES.map(item => ({
    id:item.id,
    type:'threat',
    category:'threats',
    name:`The Threat — ${item.title}`,
    tags:['threat', item.id],
    summary:item.threatLine,
    body:`# The Threat — ${item.title}\n\n${item.threatLine}\n\nThe Threat’s exact identity is established by the players during setup; this art direction keeps the figure obscured so it remains compatible with each table’s answer.\n`,
    imageFields:STYLES.map(style => artField(style, null)),
    related:[item.id]
  }));
  return [...heroes, ...cases, ...signals, ...threats];
}

function writeVault(vaultRoot){
  const entities = vaultEntities();
  entities.forEach(entity => {
    const directory = path.join(vaultRoot, entity.category);
    fs.mkdirSync(directory, { recursive:true });
    const frontmatter = [
      '---',
      `id: ${entity.id}`,
      `name: ${JSON.stringify(entity.name)}`,
      `type: ${entity.type}`,
      `tags: [${entity.tags.map(tag => JSON.stringify(tag)).join(', ')}]`,
      `related: [${entity.related.map(id => JSON.stringify(id)).join(', ')}]`,
      `summary: ${JSON.stringify(entity.summary)}`,
      ...entity.imageFields.map(field => `${field}: `),
      '---',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(directory, `${entity.id}.md`), `${frontmatter}\n${entity.body}`);
  });
  const index = {
    world:'Supe Pines',
    count:entities.length,
    entities:entities.map(entity => ({
      id:entity.id,
      name:entity.name,
      type:entity.type,
      tags:entity.tags,
      related:entity.related,
      summary:entity.summary,
      path:`${entity.category}/${entity.id}.md`
    }))
  };
  fs.mkdirSync(vaultRoot, { recursive:true });
  fs.writeFileSync(path.join(vaultRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return entities.length;
}

function usage(){
  console.log(`Usage: node scripts/gen-manifest.mjs [options]\n\nOptions:\n  --check            Build and validate in memory; write nothing\n  --manifest PATH    Manifest output (default: manifest.json)\n  --vault PATH       Vault output (default: ../supe-pines-vault)\n  --no-vault         Do not create or overwrite vault entity files\n  --help             Show this help\n\nEnvironment:\n  SUPE_PINES_VAULT       Override the default sibling vault path\n  SUPE_PINES_PAGES_BASE  Override the GitHub Pages base URL`);
}

function parseArgs(args){
  const options = { check:false, noVault:false, manifest:path.join(REPO, 'manifest.json'), vault:DEFAULT_VAULT };
  for(let i = 0; i < args.length; i++){
    const arg = args[i];
    if(arg === '--check') options.check = true;
    else if(arg === '--no-vault') options.noVault = true;
    else if(arg === '--manifest' || arg === '--vault'){
      if(!args[i + 1]) throw new Error(`${arg} requires a path.`);
      options[arg.slice(2)] = path.resolve(REPO, args[++i]);
    } else if(arg !== '--help') throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function main(){
  const args = process.argv.slice(2);
  if(args.includes('--help')){ usage(); return; }
  let options;
  try { options = parseArgs(args); }
  catch(error){ console.error(error.message); usage(); process.exitCode = 1; return; }
  let manifest;
  try { manifest = buildManifest(); }
  catch(error){ console.error(error.message); process.exitCode = 1; return; }
  const errors = validateManifest(manifest);
  if(errors.length){
    console.error(`Manifest validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
    errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  const secondBuild = JSON.stringify(buildManifest());
  if(secondBuild !== JSON.stringify(manifest)){
    console.error('Manifest generation is not deterministic.');
    process.exitCode = 1;
    return;
  }
  if(options.check){
    console.log(`Manifest valid and deterministic: ${manifest.length} images (${HEROES.length * 4} Hero, ${CASES.length * 2} Case, ${SIGNALS.length * 2} Signal, ${CASES.length * 2} Threat).`);
    return;
  }
  fs.mkdirSync(path.dirname(options.manifest), { recursive:true });
  fs.writeFileSync(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${path.relative(REPO, options.manifest)} with ${manifest.length} entries.`);
  if(!options.noVault){
    const count = writeVault(options.vault);
    console.log(`Wrote ${count} vault entities and index to ${options.vault}.`);
  }
}

const directPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if(directPath && fileURLToPath(import.meta.url) === directPath) main();
