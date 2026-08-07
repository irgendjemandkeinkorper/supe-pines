import { register } from 'node:module';
register('./loader.mjs', import.meta.url);

import { resetDOM, elementStore } from './dom-mock.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { State } from '../js/engine/state.js';

// Dynamically import targets to ensure the loader is registered first
const { applyResolve, confirmSecret } = await import('../js/ui/resolve.js');
const { renderCloseIntro, beginClose, afterSceneFlow } = await import('../js/ui/hub.js');
const { matchSecret } = await import('../js/engine/rules.js');

// Setup basic game structure
function setupBaseGame() {
  resetDOM();
  State.G = {
    act: 1,
    closeDone: false,
    discardTones: [],
    players: [
      { name: 'Alice', hand: [], signals: [], secrets: [], scenesLeft: 0 },
      { name: 'Bob', hand: [], signals: [], secrets: [], scenesLeft: 0 }
    ],
    heroes: [
      { name: 'The Nightwatch', role: 'Vigilante', sides: [{ tone: 'Fury', cond: 'Front' }, { tone: 'Dread', cond: 'Turned' }], flipped: false },
      { name: 'Powerline', role: 'Spark', sides: [{ tone: 'Fury', cond: 'Front' }, { tone: 'Dread', cond: 'Turned' }], flipped: false }
    ],
    actClose: {
      1: {
        title: 'The Block Party',
        cond: 'Whoever has fed someone this act begins this scene.',
        prompt: 'Prompt text...',
        elements: { Fury: 'Include a shoving match.', Guilt: 'Include someone thanking a Hero.', Dread: 'Include a face in the crowd.' }
      }
    },
    signalRow: [
      { glyph: '🎚️', title: 'A Dead Scanner Channel' },
      { glyph: '📄', title: 'A Torn Flyer' },
      { glyph: '🔋', title: 'A Phone at One Percent' }
    ],
    signalDeck: [],
    sceneDeck: [],
    journal: [],
    case: { id: 'toll', title: 'The Toll' },
    threat: { name: 'The Extortionist', facts: [] }
  };
}

test('Act Close tone selection - non-tied dominant tone', () => {
  setupBaseGame();

  // Make Fury dominant
  State.G.discardTones = ['Fury', 'Fury']; // plus 2 Fury on face-up heroes = 4 Fury total, others 0

  renderCloseIntro();

  const closeHTML = document.getElementById('scr-close').innerHTML;
  assert.ok(closeHTML.includes('The act’s dominant tone is'));
  assert.ok(closeHTML.includes('Fury'));
  assert.ok(closeHTML.includes('Include a shoving match.'));

  // Set starter, arch and opening in mock inputs
  document.getElementById('close-starter').value = '0';
  document.getElementById('close-arch').value = '1';
  document.getElementById('close-opening').value = 'The rain falls on Ferrous Ave...';

  beginClose();

  assert.deepEqual(State.G.current, {
    type: 'close',
    starter: 0,
    archIdx: 1,
    card: { title: 'The Block Party', prompt: 'Prompt text...', tone: null },
    element: 'Include a shoving match.',
    opening: 'The rain falls on Ferrous Ave...',
    contributions: [],
    happened: '',
    adding: null,
    phase: 'play'
  });
});

test('Act Close tone selection - tied tones', () => {
  setupBaseGame();

  // Fury and Dread are tied (2 each: 0 in G.discardTones, but 1 each on the 2 heroes, wait!)
  State.G.heroes[1].flipped = true; // Side II tone is Dread

  // Now face-up hero tones are: The Nightwatch (Fury), Powerline (Dread).
  // G.discardTones is empty.
  // Fury count = 1, Dread count = 1. They are tied!

  renderCloseIntro();

  const closeHTML = document.getElementById('scr-close').innerHTML;
  assert.ok(closeHTML.includes('The tones stand tied.'));
  assert.ok(closeHTML.includes('Fury'));
  assert.ok(closeHTML.includes('Dread'));

  // Set the selected mock radio button directly to Dread to prevent multiple checked issues
  elementStore.set('close-el-checked', { value: 'Dread', checked: true });

  // Set inputs
  document.getElementById('close-starter').value = '1';
  document.getElementById('close-arch').value = '0';
  document.getElementById('close-opening').value = 'Lights flicker...';

  beginClose();

  assert.equal(State.G.current.element, 'Include a face in the crowd.'); // Dread element
  assert.equal(State.G.current.starter, 1);
  assert.equal(State.G.current.archIdx, 0);
});

test('Hero face transitions and recorded flip names', () => {
  setupBaseGame();

  // Set up current scene state
  State.G.current = {
    type: 'scene',
    starter: 0,
    archIdx: 0,
    card: { title: 'Rooftop Standoff', prompt: '...', tone: 'Fury' },
    contributions: [],
    opening: 'Starts...',
    happened: 'Happened...',
  };

  // Mock check-boxes on resolve screen
  document.getElementById('flip-0').checked = true;  // The Nightwatch flipped from false to true (side II)
  document.getElementById('flip-1').checked = false; // Powerline stays false

  applyResolve();

  // Verify state
  assert.equal(State.G.heroes[0].flipped, true);
  assert.equal(State.G.heroes[1].flipped, false);

  // Verify journal flip logs
  const lastJournal = State.G.journal[State.G.journal.length - 1];
  assert.deepEqual(lastJournal.flips, ['The Nightwatch turned to Bad Day']);

  // Now resolve another scene and flip back (The Nightwatch true to false, i.e. side I)
  State.G.current = {
    type: 'scene',
    starter: 0,
    archIdx: 1,
    card: { title: 'Diner Conversation', prompt: '...', tone: 'Dread' },
    contributions: [],
    opening: 'Starts...',
    happened: 'Happened...',
  };

  document.getElementById('flip-0').checked = true;
  document.getElementById('flip-1').checked = true;

  applyResolve();

  assert.equal(State.G.heroes[0].flipped, false); // Side I
  assert.equal(State.G.heroes[1].flipped, true);  // Side II

  const lastJournal2 = State.G.journal[State.G.journal.length - 1];
  assert.ok(lastJournal2.flips.includes('The Nightwatch turned to Good Day'));
  assert.ok(lastJournal2.flips.includes('Powerline turned to Bad Day'));
});

test('Secret matching, used Secret exclusion, and one-time reveal behavior', () => {
  setupBaseGame();

  // Initialize secrets
  State.G.players[0].secrets = [
    { q: 'What is Alice hiding?', combo: ['Fury', 'Dread'], used: false }
  ];
  State.G.players[1].secrets = [
    { q: 'What is Bob hiding?', combo: ['Fury', 'Fury', 'Fury'], used: false }
  ];

  // 1. Secret matching verification
  // Match for Fury, Dread
  const match1 = matchSecret(['Fury', 'Dread'], 0); // checked from index 1 (Bob) then index 0 (Alice)
  assert.ok(match1);
  assert.equal(match1.pi, 0);
  assert.equal(match1.secret.q, 'What is Alice hiding?');

  // 2. Secret unlock during resolve
  State.G.current = {
    type: 'scene',
    starter: 1, // Bob started
    archIdx: 0, // Nightwatch led (Fury)
    card: { title: 'Rooftop Standoff', prompt: '...', tone: 'Dread' }, // scene card tone Dread
    contributions: [],
    opening: '...',
    happened: '...',
  };

  // Tones resolved will be: card.tone (Dread) + faceUp(arch).tone (Fury) = ['Dread', 'Fury']
  document.getElementById('flip-0').checked = false;
  document.getElementById('flip-1').checked = false;

  applyResolve();

  // Since tones ['Dread', 'Fury'] matches Alice's secret, G.pendingSecret should be set
  assert.ok(State.G.pendingSecret);
  assert.equal(State.G.pendingSecret.pi, 0);
  assert.equal(State.G.pendingSecret.secret.q, 'What is Alice hiding?');

  // 3. Confirm secret reveal
  State.secretSel = [0, 1, 2]; // picked first 3 signals from signalRow
  document.getElementById('secret-answer').value = 'Alice revealed her secret.';

  confirmSecret();

  // Verify secret is marked used and journal records it
  assert.equal(State.G.players[0].secrets[0].used, true);
  assert.equal(State.G.pendingSecret, null);

  const lastJournal = State.G.journal[State.G.journal.length - 1];
  assert.equal(lastJournal.type, 'secret');
  assert.equal(lastJournal.playerName, 'Alice');
  assert.equal(lastJournal.question, 'What is Alice hiding?');
  assert.equal(lastJournal.answer, 'Alice revealed her secret.');
  assert.deepEqual(lastJournal.signals, [
    { glyph: '🎚️', title: 'A Dead Scanner Channel' },
    { glyph: '📄', title: 'A Torn Flyer' },
    { glyph: '🔋', title: 'A Phone at One Percent' }
  ]);

  // 4. Used Secret exclusion & one-time reveal behavior
  // Reset current scene and try to trigger matching again with same tones
  State.G.current = {
    type: 'scene',
    starter: 1,
    archIdx: 0,
    card: { title: 'Rooftop Standoff', prompt: '...', tone: 'Dread' },
    contributions: [],
    opening: '...',
    happened: '...',
  };

  applyResolve();

  // Because Alice's secret is already used, there should be no new secret unlock
  assert.equal(State.G.pendingSecret, null);
});

test('Act III close advancing to finished Dossier state', () => {
  setupBaseGame();

  State.G.act = 3;
  State.G.closeDone = true;

  afterSceneFlow();

  assert.equal(State.G.act, 4);
});
