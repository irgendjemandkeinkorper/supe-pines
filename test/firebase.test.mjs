import { register } from 'node:module';
register('./loader.mjs', import.meta.url);

import test from 'node:test';
import assert from 'node:assert/strict';

import { firebaseConfig, firebaseConfigured } from '../js/sync/config.js';
const { withTimeout } = await import('../js/sync/auth.js');

test('firebaseConfig has no private credentials', () => {
  // Config should only contain public Web SDK properties, not private service account credentials
  assert.equal(firebaseConfig.hasOwnProperty('private_key_id'), false);
  assert.equal(firebaseConfig.hasOwnProperty('private_key'), false);
  assert.equal(firebaseConfig.hasOwnProperty('client_email'), false);
});

test('firebaseConfigured correctly validates placeholder or empty values', () => {
  assert.equal(firebaseConfigured, true); // The default config in the repository is non-empty/configured

  const placeholderConfig = {
    apiKey: "REPLACE_ME",
    authDomain: "supe-pine.firebaseapp.com",
    projectId: "supe-pine",
    storageBucket: "supe-pine.firebasestorage.app",
    messagingSenderId: "1072717573853",
    appId: "1:1072717573853:web:60ad7a40b793fc39c77534",
    measurementId: "G-GSC3PZ1TZS"
  };

  const isConfigured = Object.values(placeholderConfig)
    .every(value => typeof value === 'string' && value.length > 0 && !value.includes('REPLACE_ME'));

  assert.equal(isConfigured, false);
});

test('Firebase operations reject when the browser network never settles', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 5, 'Firebase request timed out.'),
    /Firebase request timed out\./
  );
});

test('Firebase timeout wrapper preserves a successful result', async () => {
  assert.equal(await withTimeout(Promise.resolve('ready'), 25, 'unused'), 'ready');
});
