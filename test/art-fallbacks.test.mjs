import test from 'node:test';
import assert from 'node:assert/strict';
import { caseArtHTML, threatArtHTML, gameArtImgError } from '../js/ui/art.js';

test('Case art HTML follows the shipped title-slug asset convention', () => {
  const item = { id: 'toll', title: 'The Toll' };
  const html = caseArtHTML(item, { style: 'ink' });

  assert.ok(html.includes('src="art/thumbs/ink/cases/the-toll.webp"'), 'HTML must use the Case title slug');
});

test('Threat art HTML generation and fallback attributes', () => {
  // Real VILLAINS entries carry `name`; the old `title` lookup rendered "undefined".
  const item = { id: 'toll', name: 'The Toll' };
  // Mock currentArtStyle to return 'ink'
  const html = threatArtHTML(item, { style: 'ink' });

  // Verify HTML contains container with class game-art
  assert.ok(html.includes('class="game-art'), 'HTML must include class="game-art"');
  // Verify HTML contains fallback text
  assert.ok(html.includes('The Toll, the Threat'), 'HTML must include fallback text');
  assert.ok(!html.includes('undefined'), 'HTML must not render undefined');
  // Verify image path is correct
  assert.ok(html.includes('src="art/thumbs/ink/threats/toll.webp"'), 'HTML must include correct image src');
  // Verify onerror attribute triggers gameArtImgError
  assert.ok(html.includes('onerror="gameArtImgError(this)"'), 'HTML must include correct onerror attribute');
});

test('gameArtImgError walks thumbnail, then full-size extensions, then the text fallback', () => {
  const holder = { classList: { added: [], add(c){ this.added.push(c); } } };
  const mockImg = {
    dataset: { srcs: 'art/images/ink/threats/toll.png,art/images/ink/threats/toll.webp' },
    src: 'art/thumbs/ink/threats/toll.webp',
    closest: () => holder,
    removed: false,
    remove(){ this.removed = true; }
  };

  gameArtImgError(mockImg);
  assert.equal(mockImg.src, 'art/images/ink/threats/toll.png');
  gameArtImgError(mockImg);
  assert.equal(mockImg.src, 'art/images/ink/threats/toll.webp');
  gameArtImgError(mockImg);
  assert.ok(mockImg.removed);
  assert.deepEqual(holder.classList.added, ['missing']);
});

test('full-bleed art skips the thumbnail', () => {
  const html = caseArtHTML({ id: 'toll', title: 'The Toll' }, { style: 'ink', full: true });
  assert.ok(html.includes('src="art/images/ink/cases/the-toll.png"'));
});
