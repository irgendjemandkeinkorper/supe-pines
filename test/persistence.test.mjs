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

test('readSaveStatus distinguishes no save from a corrupt save', async () => {
  const { readSaveStatus } = await import('../js/engine/persistence.js');
  const values = installStorage();
  assert.equal(readSaveStatus().status, 'none');
  values.set(SAVE_KEY, '{not json');
  assert.deepEqual(readSaveStatus(), {status:'corrupt', snapshot:null});
  assert.equal(readSave(), null);
  values.set(SAVE_KEY, JSON.stringify({version:99, mode:'local'}));
  assert.equal(readSaveStatus().status, 'corrupt');
  globalThis.localStorage = { getItem(){ throw new Error('SecurityError'); } };
  assert.equal(readSaveStatus().status, 'unreadable');
});

test('a quota-exceeded save raises one sp:save-failed event per failure streak', async () => {
  const { isSaveFailing } = await import('../js/engine/persistence.js');
  const values = installStorage();
  const events = [];
  const previousWindow = globalThis.window;
  globalThis.window = { dispatchEvent:event => events.push(event) };
  const quota = Object.assign(new Error('full'), {name:'QuotaExceededError'});
  globalThis.localStorage.setItem = () => { throw quota; };
  State.onlineRoomCode = null;
  State.G = {case:{id:'toll'}, players:[{name:'A'}]};
  try {
    assert.equal(saveGame('scr-hub'), false);
    assert.equal(saveGame('scr-hub'), false);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'sp:save-failed');
    assert.equal(events[0].detail.reason, 'quota');
    assert.equal(isSaveFailing(), true);
    globalThis.localStorage.setItem = (key, value) => values.set(key, String(value));
    assert.equal(saveGame('scr-hub'), true);
    assert.equal(isSaveFailing(), false);
    assert.equal(readSave().screen, 'scr-hub');
  } finally {
    globalThis.window = previousWindow;
    State.G = null;
  }
});
