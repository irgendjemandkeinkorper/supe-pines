#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { ACT_CLOSES, CASES, EPILOGUE_QUESTIONS, HEROES, SCENES, SECRETS, SIGNALS, TONES, VILLAINS } from '../js/data/index.js';

const isText = value => typeof value === 'string' && value.trim().length > 0;

function duplicateValues(values){
  const seen = new Set();
  const duplicates = new Set();
  values.forEach(value => seen.has(value) ? duplicates.add(value) : seen.add(value));
  return [...duplicates];
}

export function validateData(data = { ACT_CLOSES, CASES, EPILOGUE_QUESTIONS, HEROES, SCENES, SECRETS, SIGNALS, TONES, VILLAINS }){
  const errors = [];
  const fail = (collection, entry, message) => errors.push(`${collection}${entry ? ` [${entry}]` : ''}: ${message}`);
  const tones = new Set(data.TONES);

  if(!Array.isArray(data.TONES) || data.TONES.length === 0){
    fail('Tones', '', 'expected a non-empty array.');
  } else {
    data.TONES.forEach((tone, i) => { if(!isText(tone)) fail('Tones', `index ${i}`, 'tone must be a non-empty string.'); });
    duplicateValues(data.TONES).forEach(tone => fail('Tones', tone, 'duplicate tone.'));
  }

  if(!Array.isArray(data.CASES) || data.CASES.length === 0){
    fail('Cases', '', 'expected a non-empty array.');
  } else {
    duplicateValues(data.CASES.map(item => item.id)).forEach(id => fail('Cases', id, 'duplicate id.'));
    duplicateValues(data.CASES.map(item => item.title)).forEach(title => fail('Cases', title, 'duplicate title.'));
    data.CASES.forEach((item, i) => {
      const label = item?.id || `index ${i}`;
      ['id', 'title', 'epigraph', 'threatLine', 'intro'].forEach(field => {
        if(!isText(item?.[field])) fail('Cases', label, `${field} must be a non-empty string.`);
      });
    });
  }

  const caseIds = new Set((data.CASES || []).map(item => item.id));
  const villainIds = new Set((data.VILLAINS || []).map(item => item.id));
  const villainsByCase = Object.fromEntries([...caseIds].map(id => [id, []]));
  if(data.VILLAINS){
    duplicateValues(data.VILLAINS.map(item => item.id)).forEach(id => fail('Villains', id, 'duplicate id.'));
    duplicateValues(data.VILLAINS.map(item => item.name)).forEach(name => fail('Villains', name, 'duplicate name.'));
    data.VILLAINS.forEach((item, i) => {
      const label = item?.id || `index ${i}`;
      ['id', 'caseId', 'name', 'faction', 'role', 'threat', 'power', 'flaw'].forEach(field => {
        if(!isText(item?.[field])) fail('Villains', label, `${field} must be a non-empty string.`);
      });
      if(item?.caseId && !caseIds.has(item.caseId)) fail('Villains', label, `caseId references unknown Case "${item.caseId}".`);
    });
    data.VILLAINS.forEach(item => {
      if(item?.caseId && villainsByCase[item.caseId]) villainsByCase[item.caseId].push(item.id);
    });
    data.CASES?.forEach(item => {
      if(!isText(item?.villainId)) fail('Cases', item?.id, 'villainId must be a non-empty string.');
      else if(!villainIds.has(item.villainId)) fail('Cases', item.id, `villainId references unknown Villain "${item.villainId}".`);
      else if(!villainsByCase[item.id]?.includes(item.villainId)) fail('Cases', item.id, 'villainId "' + item.villainId + '" does not belong to Case "' + item.id + '".');
      if(villainsByCase[item.id]?.length !== 2) fail('Cases', item.id, 'expected exactly two Threats, found ' + (villainsByCase[item.id]?.length || 0) + '.');
    });
  }
  if(!Array.isArray(data.HEROES) || data.HEROES.length === 0){
    fail('Heroes', '', 'expected a non-empty array.');
  } else {
    duplicateValues(data.HEROES.map(item => item.role)).forEach(role => fail('Heroes', role, 'duplicate role.'));
    data.HEROES.forEach((item, i) => {
      const label = item?.role || `index ${i}`;
      if(!isText(item?.role)) fail('Heroes', label, 'role must be a non-empty string.');
      if(!isText(item?.flavor)) fail('Heroes', label, 'flavor must be a non-empty string.');
      const setupKeys = Object.keys(item?.setup || {});
      caseIds.forEach(id => {
        if(!isText(item?.setup?.[id])) fail('Heroes', label, `missing a non-empty setup question for Case "${id}".`);
      });
      setupKeys.filter(id => !caseIds.has(id)).forEach(id => fail('Heroes', label, `setup references unknown Case "${id}".`));
      if(!Array.isArray(item?.sides) || item.sides.length !== 2){
        fail('Heroes', label, 'expected exactly two sides.');
      } else {
        item.sides.forEach((side, sideIndex) => {
          if(!isText(side?.cond)) fail('Heroes', label, `side ${sideIndex + 1} condition must be a non-empty string.`);
          if(!tones.has(side?.tone)) fail('Heroes', label, `side ${sideIndex + 1} uses unknown tone "${side?.tone}".`);
        });
      }
    });
  }

  const allScenes = [];
  const hookedScenesByCase = Object.fromEntries([...caseIds].map(id => [id, []]));
  const sceneToneCounts = Object.fromEntries([1, 2, 3].map(act => [act, Object.fromEntries((data.TONES || []).map(tone => [tone, 0]))]));
  for(const act of [1, 2, 3]){
    const scenes = data.SCENES?.[act];
    if(!Array.isArray(scenes) || scenes.length === 0){
      fail('Scenes', `Act ${act}`, 'expected a non-empty scene array.');
      continue;
    }
    scenes.forEach((item, i) => {
      const label = `Act ${act}: ${item?.title || `index ${i}`}`;
      if(!isText(item?.title)) fail('Scenes', label, 'title must be a non-empty string.');
      if(!isText(item?.prompt)) fail('Scenes', label, 'prompt must be a non-empty string.');
      if(!tones.has(item?.tone)) fail('Scenes', label, `unknown tone "${item?.tone}".`);
      if(item?.hook !== null && !caseIds.has(item?.hook)) fail('Scenes', label, `hook references unknown Case "${item?.hook}".`);
      if(item?.hook && hookedScenesByCase[item.hook]) hookedScenesByCase[item.hook].push(item);
      if(item?.tone && sceneToneCounts[act]?.[item.tone] !== undefined) sceneToneCounts[act][item.tone]++;
      allScenes.push(item);
    });
  }
  duplicateValues(allScenes.map(item => item.title)).forEach(title => fail('Scenes', title, 'duplicate title across acts.'));
  Object.entries(hookedScenesByCase).forEach(([id, scenes]) => {
    if(scenes.length < 6) fail('Scenes', id, `expected at least six Case-specific scenes (two per act), found ${scenes.length}.`);
    [1, 2, 3].forEach(act => {
      const count = data.SCENES?.[act]?.filter(scene => scene?.hook === id).length || 0;
      if(count < 2) fail('Scenes', id, `expected at least two Case-specific scenes in Act ${act}, found ${count}.`);
    });
  });

  if(!Array.isArray(data.SIGNALS) || data.SIGNALS.length === 0){
    fail('Signals', '', 'expected a non-empty array.');
  } else {
    duplicateValues(data.SIGNALS.map(item => item.title)).forEach(title => fail('Signals', title, 'duplicate title.'));
    data.SIGNALS.forEach((item, i) => {
      const label = item?.title || `index ${i}`;
      ['glyph', 'title', 'line'].forEach(field => {
        if(!isText(item?.[field])) fail('Signals', label, `${field} must be a non-empty string.`);
      });
    });
  }

  if(!Array.isArray(data.SECRETS) || data.SECRETS.length === 0){
    fail('Secrets', '', 'expected a non-empty array.');
  } else {
    const combinations = [];
    data.SECRETS.forEach((item, i) => {
      const label = `index ${i}`;
      if(!Array.isArray(item?.combo) || item.combo.length === 0){
        fail('Secrets', label, 'combo must be a non-empty array.');
      } else {
        item.combo.forEach(tone => { if(!tones.has(tone)) fail('Secrets', label, `combo uses unknown tone "${tone}".`); });
        combinations.push(item.combo.slice().sort((a, b) => data.TONES.indexOf(a) - data.TONES.indexOf(b)).join('|'));
      }
      if(!isText(item?.q)) fail('Secrets', label, 'question must be a non-empty string.');
    });
    duplicateValues(combinations).forEach(combo => fail('Secrets', combo, 'duplicate tone combination.'));
  }

  for(const act of [1, 2, 3]){
    const closes = data.ACT_CLOSES?.[act];
    if(!Array.isArray(closes) || closes.length === 0){
      fail('Act Closes', `Act ${act}`, 'expected a non-empty Act Close array.');
      continue;
    }
    closes.forEach((item, i) => {
      const label = `Act ${act}: ${item?.title || `index ${i}`}`;
      ['title', 'cond', 'prompt'].forEach(field => {
        if(!isText(item?.[field])) fail('Act Closes', label, `${field} must be a non-empty string.`);
      });
      data.TONES.forEach(tone => {
        if(!isText(item?.elements?.[tone])) fail('Act Closes', label, `missing a non-empty ${tone} element.`);
      });
      Object.keys(item?.elements || {}).filter(tone => !tones.has(tone)).forEach(tone => {
        fail('Act Closes', label, `element references unknown tone "${tone}".`);
      });
    });
  }

  if(!Array.isArray(data.EPILOGUE_QUESTIONS) || data.EPILOGUE_QUESTIONS.length === 0 || data.EPILOGUE_QUESTIONS.some(q => !isText(q))){
    fail('Epilogue', '', 'questions must be a non-empty array of non-empty strings.');
  }

  return {
    errors,
    summary: {
      cases: data.CASES?.length || 0,
      villains: data.VILLAINS?.length || 0,
      heroes: data.HEROES?.length || 0,
      scenes: allScenes.length,
      signals: data.SIGNALS?.length || 0,
      secrets: data.SECRETS?.length || 0,
      actCloses: [1, 2, 3].reduce((total, act) => total + (data.ACT_CLOSES?.[act]?.length || 0), 0)
      ,sceneToneCounts
      ,hookedScenesByCase: Object.fromEntries(Object.entries(hookedScenesByCase).map(([id, scenes]) => [id, scenes.length]))
      ,threatsByCase: Object.fromEntries(Object.entries(villainsByCase).map(([id, villains]) => [id, villains.length]))
    }
  };
}

function main(){
  const result = validateData();
  if(result.errors.length){
    console.error(`Game data validation failed with ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}:`);
    result.errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  const s = result.summary;
  console.log(`Game data valid: ${s.cases} Cases, ${s.heroes} Heroes, ${s.scenes} Scenes, ${s.signals} Signals, ${s.secrets} Secrets, ${s.actCloses} Act Closes.`);
}

if(process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))){
  main();
}
