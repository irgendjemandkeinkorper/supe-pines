import test from 'node:test';
import assert from 'node:assert/strict';

import { State } from '../js/engine/state.js';
import { SAVE_KEY, clearSavedGame, hasSavedGame, readSave, saveGame } from '../js/engine/persistence.js';

function installStorage(){
  const values = new Map();
  globalThis.localStorage = {
    getItem:key => values.has(key) ? values.get(key) : null,
    setItem:(key,value) => values.set(key, String(value)),
    removeItem:key => values.delete(key)
  };
  return values;
}

test('local SaveSnapshot round-trips committed game state', () => {
  const values = installStorage();
  State.onlineRoomCode = null;
  State.G = {case:{id:'toll'}, players:[{name:'A'}], act:1, journal:[]};
  assert.equal(saveGame('scr-hub'), true);
  assert.equal(values.has(SAVE_KEY), true);
  const snapshot = readSave();
  assert.equal(snapshot.screen, 'scr-hub');
  assert.deepEqual(snapshot.game, State.G);
  assert.equal(hasSavedGame(), true);
  clearSavedGame();
  assert.equal(readSave(), null);
  State.G = null;
});

test('online state is never serialized as a local save', () => {
  installStorage();
  State.G = {case:{id:'toll'}, players:[{name:'A'}]};
  State.onlineRoomCode = 'ABCDE';
  assert.equal(saveGame('scr-hub'), false);
  assert.equal(readSave(), null);
  State.onlineRoomCode = null;
  State.G = null;
});
