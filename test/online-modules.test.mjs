import { register } from 'node:module';
register('./loader.mjs', import.meta.url);

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

await import('./dom-mock.mjs');
const online = await import('../js/ui/online/index.js');

test('every online function main.js bridges is exported by js/ui/online/', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const bridged = [...main.matchAll(/onlineBridge\('(\w+)'\)/g)].map(match => match[1]);
  assert.ok(bridged.length > 20, 'expected the main.js online bridge list');
  const missing = bridged.filter(name => typeof online[name] !== 'function');
  assert.deepEqual(missing, []);
});

test('online screen modules stay under ~300 lines', () => {
  const dir = new URL('../js/ui/online/', import.meta.url);
  for(const file of readdirSync(dir)){
    const lines = readFileSync(new URL(file, dir), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${file} has ${lines} lines`);
  }
});
