import test from 'node:test';
import assert from 'node:assert/strict';

import { State } from '../js/engine/state.js';
import { buildMarkdown } from '../js/chronicle/markdown.js';

test('Dossier export tolerates an empty or partial game', () => {
  State.G = {};
  const empty = buildMarkdown();
  assert.match(empty, /An Untold Case/);
  assert.doesNotMatch(empty, /undefined|null/);

  State.G = {
    case:{title:'A Partial Case'},
    threat:{name:'The Placeholder', facts:[]},
    heroes:[{role:'The Nightwatch', sides:[{tone:'Fury'}], flipped:false}],
    journal:[{type:'note', act:1, text:'The lights went out.', struck:false}],
    act:1
  };
  const partial = buildMarkdown();
  assert.match(partial, /A Partial Case/);
  assert.match(partial, /The lights went out/);
  assert.doesNotMatch(partial, /undefined|null/);
  State.G = null;
});

test('Dossier export omits struck entries and includes completed debrief', () => {
  State.G = {
    case:{title:'The Test Case'}, threat:{name:'The Test Threat', facts:[]}, heroes:[], act:4,
    journal:[
      {type:'scene', act:1, cardTitle:'Kept', playerName:'A', archName:'Hero', archRole:'Role', tones:['Fury'], contributions:[], flips:[], struck:false},
      {type:'scene', act:1, cardTitle:'Struck', playerName:'A', archName:'Hero', archRole:'Role', tones:['Dread'], contributions:[], flips:[], struck:true}
    ]
  };
  const md = buildMarkdown();
  assert.match(md, /Kept/);
  assert.doesNotMatch(md, /Struck/);
  assert.match(md, /Debrief Questions/);
  State.G = null;
});
