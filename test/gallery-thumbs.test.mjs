import { register } from 'node:module';
register('./loader.mjs', import.meta.url);

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

await import('./dom-mock.mjs');
const { galleryImgError } = await import('../js/ui/gallery.js');

test('gallery fallback walks thumbnail, then full-size extensions, then the text fallback', () => {
  const face = { classList: { added: [], add(c){ this.added.push(c); } } };
  const img = {
    src: 'art/thumbs/ink/heroes/fixer--front.webp',
    dataset: { srcs: 'art/images/ink/heroes/fixer--front.png,art/images/ink/heroes/fixer--front.webp' },
    closest: sel => sel === '.gallery-face' ? face : null,
    removed: false,
    remove(){ this.removed = true; }
  };
  galleryImgError(img);
  assert.equal(img.src, 'art/images/ink/heroes/fixer--front.png');
  galleryImgError(img);
  assert.equal(img.src, 'art/images/ink/heroes/fixer--front.webp');
  galleryImgError(img);
  assert.ok(img.removed);
  assert.deepEqual(face.classList.added, ['g-missing']);
});

test('every shipped artwork has a Gallery thumbnail (run scripts/make-thumbs.py)', () => {
  const root = new URL('../art/', import.meta.url).pathname;
  const walk = dir => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  const missing = walk(join(root, 'images'))
    .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
    .map(f => relative(join(root, 'images'), f).replace(/\.[^.]+$/, '.webp'))
    .filter(rel => !existsSync(join(root, 'thumbs', rel)));
  assert.deepEqual(missing, []);
});
