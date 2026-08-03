import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.FIRESTORE_TEST_PROJECT_ID || 'demo-supe-pines';
const emulatorRequired = process.env.FIRESTORE_RULES_REQUIRED === '1';
const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let testEnv;

function db(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function unauthenticatedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

const room = {
  seats: { host: { name: 'Host' } },
  phase: 'lobby',
  expireAt: new Date('2030-01-01T00:00:00Z'),
};

if (emulatorAvailable || emulatorRequired) {
before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test('unauthenticated clients cannot read or write rooms', async () => {
  const roomRef = doc(unauthenticatedDb(), 'rooms/ROOM1');
  await assertFails(getDoc(roomRef));
  await assertFails(setDoc(roomRef, room));
});

test('a signed-in host can create and read a public room', async () => {
  const roomRef = doc(db('host'), 'rooms/ROOM1');
  await assertSucceeds(setDoc(roomRef, room));
  await assertSucceeds(getDoc(roomRef));
});

test('a signed-in player can join through the documented lobby update', async () => {
  const hostRoom = doc(db('host'), 'rooms/ROOM1');
  await setDoc(hostRoom, room);

  const joinedRoom = doc(db('guest'), 'rooms/ROOM1');
  await assertSucceeds(updateDoc(joinedRoom, {
    seats: {
      host: { name: 'Host' },
      guest: { name: 'Guest' },
    },
  }));
});

test('a non-seated client cannot mutate an existing room without joining', async () => {
  await setDoc(doc(db('host'), 'rooms/ROOM1'), room);
  await assertFails(updateDoc(doc(db('stranger'), 'rooms/ROOM1'), {
    phase: 'act',
  }));
});

test('private documents are readable only by their owner', async () => {
  const roomRef = doc(db('host'), 'rooms/ROOM1');
  await setDoc(roomRef, {
    seats: {
      host: { name: 'Host' },
      guest: { name: 'Guest' },
    },
  });

  const guestPrivate = doc(db('guest'), 'rooms/ROOM1/private/guest');
  await setDoc(guestPrivate, { hand: ['secret-card'] });
  await assertSucceeds(getDoc(guestPrivate));
  await assertFails(getDoc(doc(db('host'), 'rooms/ROOM1/private/guest')));
  await assertFails(getDoc(doc(db('stranger'), 'rooms/ROOM1/private/guest')));
  await assertFails(getDoc(doc(unauthenticatedDb(), 'rooms/ROOM1/private/guest')));
});

test('the accepted seated-participant write trust model is enforced', async () => {
  await setDoc(doc(db('host'), 'rooms/ROOM1'), {
    seats: {
      host: { name: 'Host' },
      guest: { name: 'Guest' },
    },
  });

  // Dealing is intentionally allowed by any seated participant, including
  // writes to another player's private document. Reads remain owner-only.
  await assertSucceeds(setDoc(doc(db('host'), 'rooms/ROOM1/private/guest'), {
    hand: ['dealt-by-host'],
  }));
  await assertFails(setDoc(doc(db('stranger'), 'rooms/ROOM1/private/guest'), {
    hand: ['not-seated'],
  }));
});
} else {
  test('Firestore rules suite requires the Firebase emulator', {
    skip: 'run with firebase emulators:exec or FIRESTORE_RULES_REQUIRED=1',
  }, () => {});
}
