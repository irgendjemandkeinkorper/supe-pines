import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const idlePath = resolve(__dirname, '..', 'js', 'ui', 'idle.js');

test('idle.js firewall — imports nothing from js/engine/state.js', () => {
  const src = readFileSync(idlePath, 'utf-8');

  const importLines = src.split('\n').filter(line =>
    /^\s*import\b/.test(line) && !/^\s*\/\//.test(line)
  );

  const stateRefs = importLines.filter(line =>
    /state\.js/.test(line)
  );

  assert.equal(stateRefs.length, 0,
    `idle.js imports from state.js:\n${stateRefs.join('\n')}\n\nThe idle module must remain a pure distraction with zero access to game state.`
  );
});

test('idle.js firewall — does not reference State.G or State object', () => {
  const src = readFileSync(idlePath, 'utf-8');

  const codeLines = src.split('\n').filter(line =>
    !/^\s*\/\//.test(line) && !/^\s*\/\*/.test(line)
  );
  const joined = codeLines.join('\n');

  const stripped = joined
    .replace(/`[^`]*`/g, '')
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const hasStateRef = /\bState\b/.test(stripped);

  assert.equal(hasStateRef, false,
    'idle.js references `State` — the idle module must remain a pure distraction with zero access to game state.'
  );
});
