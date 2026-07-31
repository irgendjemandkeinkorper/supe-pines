import test from 'node:test';
import assert from 'node:assert/strict';

import { ACT_CLOSES, CASES, EPILOGUE_QUESTIONS, HEROES, SCENES, SECRETS, SIGNALS, TONES } from '../js/data/index.js';
import { validateData } from '../scripts/validate-data.mjs';
import { State } from '../js/engine/state.js';
import { eligibleContributors, faceUp, matchSecret, maxContrib } from '../js/engine/rules.js';
import { esc } from '../js/engine/utils.js';

test('current data satisfies the authored roster contract', () => {
  const result = validateData({ ACT_CLOSES, CASES, EPILOGUE_QUESTIONS, HEROES, SCENES, SECRETS, SIGNALS, TONES });
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.cases, 8);
  assert.equal(result.summary.heroes, 12);
  assert.equal(result.summary.scenes, 144);
  assert.deepEqual(result.summary.hookedScenesByCase, {
    toll:6, casting:6, renovation:6, lastcall:6,
    afterhours:6, deadair:6, lastroute:6, openhouse:6
  });
});

test('validator catches incomplete Case-specific scene coverage', () => {
  const broken = {
    ACT_CLOSES, CASES, HEROES, SCENES: {
      1: SCENES[1].filter(scene => scene.hook !== 'openhouse'),
      2: SCENES[2],
      3: SCENES[3]
    }, EPILOGUE_QUESTIONS, SECRETS, SIGNALS, TONES
  };
  const result = validateData(broken);
  assert.ok(result.errors.some(error => error.includes('openhouse') && error.includes('Act 1')));
});

test('Hero face-up state and contribution cap stay deterministic', () => {
  const hero = {sides:[{tone:'Fury',cond:'front'},{tone:'Dread',cond:'turned'}], flipped:false};
  assert.equal(faceUp(hero).tone, 'Fury');
  hero.flipped = true;
  assert.equal(faceUp(hero).tone, 'Dread');
  assert.equal(maxContrib(), 2);
});

test('Secret matching checks the next player and skips used Secrets', () => {
  State.G = {
    players: [
      {secrets:[{combo:['Fury','Guilt','Dread'], used:false}]},
      {secrets:[{combo:['Fury','Fury','Dread'], used:true}]},
      {secrets:[{combo:['Fury','Guilt','Dread'], used:false}]}
    ]
  };
  const unlock = matchSecret(['Fury','Guilt','Dread'], 0);
  assert.equal(unlock.pi, 2);
  assert.equal(matchSecret(['Guilt'], 0), null);
  State.G = null;
});

test('eligible contributors enforce starter exclusion, one buy-in each, and solo cap', () => {
  State.G = {
    players: [
      {hand:[{title:'a'}], signals:[]},
      {hand:[{title:'b'}], signals:[]},
      {hand:[], signals:[]}
    ],
    signalRow: [{title:'signal'}],
    current: {starter:0, contributions:[{pi:1}]}
  };
  assert.deepEqual(eligibleContributors(), [2]);
  State.G.players = [{hand:[{title:'a'}], signals:[]}];
  State.G.current = {starter:0, contributions:[]};
  assert.deepEqual(eligibleContributors(), [0]);
  State.G.current.contributions = [{pi:0},{pi:0}];
  assert.deepEqual(eligibleContributors(), []);
  State.G = null;
});

test('data-driven copy is escaped before it reaches HTML', () => {
  assert.equal(esc('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});
