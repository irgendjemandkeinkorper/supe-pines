import test from 'node:test';
import assert from 'node:assert/strict';
import { caseArtHTML, threatArtHTML, gameArtImgError } from '../js/ui/art.js';

test('Case art HTML follows the shipped title-slug asset convention', () => {
  const item = { id: 'toll', title: 'The Toll' };
  const html = caseArtHTML(item, { style: 'ink' });

  assert.ok(html.includes('src="art/images/ink/cases/the-toll.webp"'), 'HTML must use the Case title slug');
});

test('Threat art HTML generation and fallback attributes', () => {
  const item = { id: 'toll', title: 'The Toll' };
  // Mock currentArtStyle to return 'ink'
  const html = threatArtHTML(item, { style: 'ink' });

  // Verify HTML contains container with class game-art
  assert.ok(html.includes('class="game-art'), 'HTML must include class="game-art"');
  // Verify HTML contains fallback text
  assert.ok(html.includes('The Threat — The Toll'), 'HTML must include fallback text');
  // Verify image path is correct
  assert.ok(html.includes('src="art/images/ink/threats/toll.webp"'), 'HTML must include correct image src');
  // Verify onerror attribute triggers gameArtImgError
  assert.ok(html.includes('onerror="gameArtImgError(this)"'), 'HTML must include correct onerror attribute');
});

test('gameArtImgError fallback mechanism with extension fallback', () => {
  // Mock a DOM img element
  const dataset = {
    base: 'art/images/ink/threats/toll',
    exts: 'png,jpg,jpeg'
  };
  const mockImg = {
    dataset,
    src: 'art/images/ink/threats/toll.webp'
  };

  // Calling gameArtImgError with multiple exts should cycle to next extension
  gameArtImgError(mockImg);
  assert.equal(mockImg.src, 'art/images/ink/threats/toll.png');
  assert.equal(mockImg.dataset.exts, 'jpg,jpeg');

  // Next cycle
  gameArtImgError(mockImg);
  assert.equal(mockImg.src, 'art/images/ink/threats/toll.jpg');
  assert.equal(mockImg.dataset.exts, 'jpeg');
});
