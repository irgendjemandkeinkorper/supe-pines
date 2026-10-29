import { register } from 'node:module';
register('./loader.mjs', import.meta.url);

import test from 'node:test';
import assert from 'node:assert/strict';

const fake = await import('./fakes/firebase.mjs');
const { CASES, SECRETS } = await import('../js/data/index.js');
const { createRoom, joinRoom } = await import('../js/sync/liveRoom.js');
const live = await import('../js/sync/liveActions.js');

const HOST = 'uid-host';
const GUEST = 'uid-guest';
const room = code => fake.store.get(`rooms/${code}`);
const priv = (code, uid) => fake.store.get(`rooms/${code}/private/${uid}`);
const patchRoom = (code, patch) => fake.store.set(`rooms/${code}`, {...room(code), ...patch});

async function seatedRoom(){
  fake.__reset();
  fake.__signInAs(HOST);
  const code = await createRoom(CASES[0], 'Host');
  fake.__signInAs(GUEST);
  await joinRoom(code, 'Guest');
  fake.__signInAs(HOST);
  return code;
}

async function playingRoom(){
  const code = await seatedRoom();
  await live.liveBeginTale(code);
  patchRoom(code, {phase:'threat'});
  await live.liveFinishThreat(code, 'The Test Threat');
  return code;
}

test('create/join seats two players and reconnecting does not add a seat', async () => {
  const code = await seatedRoom();
  assert.deepEqual(room(code).seats, {[HOST]:0, [GUEST]:1});
  assert.deepEqual(priv(code, GUEST), {hand:[], secrets:[]});
  fake.__signInAs(GUEST);
  await joinRoom(code.toLowerCase(), 'Guest again');
  assert.equal(room(code).players.length, 2);
});

test('only the host may begin, and a rejected transaction writes nothing', async () => {
  const code = await seatedRoom();
  const before = structuredClone(room(code));
  fake.__signInAs(GUEST);
  await assert.rejects(live.liveBeginTale(code), /Only the one who opened this table/);
  assert.deepEqual(room(code), before);
  fake.__signInAs(HOST);
  await live.liveBeginTale(code);
  assert.equal(room(code).phase, 'herosetup');
  assert.ok(room(code).heroes.length > 0);
  assert.ok(room(code).actClose[1] && room(code).actClose[3]);
});

test('dealing Act I writes hands and secrets only to private docs', async () => {
  const code = await playingRoom();
  const pub = room(code);
  assert.equal(pub.phase, 'playing');
  assert.equal(pub.act, 1);
  assert.equal(pub.threat.name, 'The Test Threat');
  assert.equal(pub.signalRow.length, 6);
  for(const p of pub.players){
    const own = priv(code, p.uid);
    assert.equal(own.hand.length, 3);
    assert.equal(own.secrets.length, 1);
    assert.equal(p.handCount, 3);
    assert.equal(p.unrevealedSecretsCount, 1);
    assert.equal(p.scenesLeft, 2);
    assert.equal('hand' in p || 'secrets' in p, false);
  }
  assert.doesNotMatch(JSON.stringify(pub), /"secrets"\s*:|"hand"\s*:/);
});

test('a client cannot read another player private document', async () => {
  const code = await playingRoom();
  fake.__signInAs(GUEST);
  await assert.rejects(fake.getDoc(fake.doc({}, 'rooms', code, 'private', HOST)), /permission-denied/);
});

test('scene forfeiture only applies to a player with nothing to play', async () => {
  const code = await playingRoom();
  await assert.rejects(live.liveForfeitScene(code, 1), /still have a card or signal/);
  const players = room(code).players;
  players[1] = {...players[1], handCount:0, signals:[]};
  patchRoom(code, {players});
  await live.liveForfeitScene(code, 1);
  assert.equal(room(code).players[1].scenesLeft, 1);
  assert.equal(room(code).journal.at(-1).type, 'note');
  await assert.rejects(live.liveForfeitScene(code, 9), /No such storyteller/);
});

test('a matching Buried Secret can be claimed and revealed only by its owner', async () => {
  const code = await playingRoom();
  const secret = {...SECRETS[0], used:false};
  fake.store.set(`rooms/${code}/private/${GUEST}`, {...priv(code, GUEST), secrets:[secret]});
  patchRoom(code, {current:null, journal:[{type:'scene', act:1, tones:secret.combo.slice()}]});

  fake.__signInAs(HOST);
  await assert.rejects(live.liveClaimSecret(code, 0), /No matching Buried Secret/);
  await assert.rejects(live.liveClaimSecret(code, 5), /That moment has passed/);

  fake.__signInAs(GUEST);
  await live.liveClaimSecret(code, 0);
  assert.deepEqual(room(code).pendingSecret, {pi:1, secretIndex:0, journalIndex:0});
  await assert.rejects(live.liveClaimSecret(code, 0), /already claimed/);

  fake.__signInAs(HOST);
  await assert.rejects(live.liveConfirmSecret(code, [0], 'no'), /not yours to reveal/);

  fake.__signInAs(GUEST);
  await live.liveConfirmSecret(code, [0], '  The answer.  ');
  const pub = room(code);
  assert.equal(pub.pendingSecret, null);
  assert.equal(pub.players[1].unrevealedSecretsCount, 0);
  assert.equal(pub.journal.at(-1).type, 'secret');
  assert.equal(pub.journal.at(-1).answer, 'The answer.');
  assert.equal(priv(code, GUEST).secrets[0].used, true);
});

test('act-close advance is an idempotent no-op until the close is done', async () => {
  const code = await playingRoom();
  const before = structuredClone(room(code));
  await live.liveAdvanceAfterClose(code);
  assert.deepEqual(room(code), before);

  patchRoom(code, {closeDone:true, current:null, pendingSecret:null});
  await live.liveAdvanceAfterClose(code);
  assert.equal(room(code).act, 2);
  assert.equal(room(code).closeDone, false);
  assert.equal(priv(code, HOST).hand.length, 3);
  assert.equal(priv(code, GUEST).secrets.length, 1, 'advancing must not overwrite secrets');

  // A racing second client sees closeDone already reset and does nothing.
  await live.liveAdvanceAfterClose(code);
  assert.equal(room(code).act, 2);

  patchRoom(code, {act:3, closeDone:true});
  await live.liveAdvanceAfterClose(code);
  assert.equal(room(code).phase, 'finished');
  assert.equal(room(code).status, 'finished');
});

test('beginning a scene moves the card out of the starter private hand', async () => {
  const code = await playingRoom();
  const card = priv(code, HOST).hand[0];
  await live.liveBeginScene(code, 0, [0], 'Rain on the overpass.');
  assert.equal(priv(code, HOST).hand.length, 2);
  assert.equal(room(code).players[0].handCount, 2);
  assert.deepEqual(room(code).current.card, card);
  await assert.rejects(live.liveBeginScene(code, 0, [0], ''), /already in progress/);

  fake.__signInAs(GUEST);
  await live.liveContribute(code, 'scene', 0, 'From the rooftop.');
  assert.equal(priv(code, GUEST).hand.length, 2);
  fake.__signInAs(HOST);
  await live.liveEndSceneAndResolve(code, 'It went badly.', []);
  assert.equal(room(code).current, null);
  assert.equal(room(code).journal.at(-1).happened, 'It went badly.');
});
