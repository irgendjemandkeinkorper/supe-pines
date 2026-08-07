import test from 'node:test';
import assert from 'node:assert/strict';

import {
  characterSideLabel,
  normalizeArchIndices,
  canAddContribution,
  replaceOmenByVote,
  roomExpiryTimestamp
} from '../js/engine/gameplay.js';

test('character sides use Good Day and Bad Day labels', () => {
  assert.equal(characterSideLabel('hero', 0), 'Good Day');
  assert.equal(characterSideLabel('hero', 1), 'Bad Day');
  assert.equal(characterSideLabel('hero', 0, 'Bad Day'), 'Bad Day');
  assert.equal(characterSideLabel('villain', 0), 'Good Day');
  assert.equal(characterSideLabel('villain', 1), 'Bad Day');
});

test('scene archetype selection normalizes to one or two unique indices', () => {
  assert.deepEqual(normalizeArchIndices([], 4), []);
  assert.deepEqual(normalizeArchIndices([4, 4, 9], 6), [4]);
  assert.deepEqual(normalizeArchIndices([4, 2, 9], 6), [4, 2]);
});

test('a player may contribute at most two cards to one scene', () => {
  assert.equal(canAddContribution([], 1), true);
  assert.equal(canAddContribution([{pi:1}], 1), true);
  assert.equal(canAddContribution([{pi:1}, {pi:1}], 1), false);
});

test('omen replacement requires unanimous votes and reshuffles the old omen', () => {
  const state = {
    signalRow: [{title:'A'}, {title:'B'}],
    signalDeck: [{title:'C'}]
  };
  assert.equal(replaceOmenByVote(state, 0, [0], 2), false);
  assert.deepEqual(state.signalRow.map(x=>x.title), ['A', 'B']);
  assert.equal(replaceOmenByVote(state, 0, [0, 1], 2), true);
  assert.deepEqual(state.signalRow.map(x=>x.title), ['C', 'B']);
  assert.deepEqual(state.signalDeck.map(x=>x.title), ['A']);
});

test('rooms expire at least one hour after their last activity', () => {
  const now = 1_000_000;
  assert.equal(roomExpiryTimestamp(now), now + 60 * 60 * 1000);
});
