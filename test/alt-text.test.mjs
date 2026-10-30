import test from 'node:test';
import assert from 'node:assert/strict';

import { CASES, HEROES, SIGNALS, VILLAINS } from '../js/data/index.js';
import { ART_STYLES, caseArtHTML, heroArtHTML, signalArtHTML, threatArtHTML } from '../js/ui/art.js';

const PLACEHOLDER = /undefined|null|placeholder|image of|\.(png|jpe?g|webp|avif)\b|^\s*$/i;

function altsIn(html){
  return [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => {
    const match = /\balt="([^"]*)"/.exec(tag);
    return match ? match[1] : null;
  });
}

function fixtures(style){
  return [
    ...HEROES.flatMap(hero => [0, 1].map(side => ({
      label:`hero ${hero.role} side ${side}`, html:heroArtHTML(hero, side, {style}),
      expect:`${hero.role} — ${hero.sides[side].state} portrait`
    }))),
    ...VILLAINS.map(item => ({label:`threat ${item.id}`, html:threatArtHTML(item, {style}), expect:`${item.name}, the Threat`})),
    ...SIGNALS.map(item => ({label:`signal ${item.title}`, html:signalArtHTML(item, {style}), expect:`${item.title} signal art`})),
    ...CASES.map(item => ({label:`case ${item.id}`, html:caseArtHTML(item, {style}), expect:`${item.title} Case cover`}))
  ];
}

test('every card artwork has meaningful, category-patterned alt text', () => {
  const styles = (ART_STYLES || [{id:'ink'}]).map(style => style.id);
  for(const style of styles){
    for(const {label, html, expect} of fixtures(style)){
      const alts = altsIn(html);
      assert.equal(alts.length, 1, `${style} ${label}: expected one <img>`);
      assert.notEqual(alts[0], null, `${style} ${label}: missing alt attribute`);
      assert.doesNotMatch(alts[0], PLACEHOLDER, `${style} ${label}: placeholder alt "${alts[0]}"`);
      assert.equal(alts[0].replace(/&#39;|&amp;|&quot;/g, m => ({'&#39;':"'", '&amp;':'&', '&quot;':'"'}[m])), expect, `${style} ${label}`);
    }
  }
});

test('the audit rejects missing and placeholder alt text', () => {
  assert.deepEqual(altsIn('<img src="x.png">'), [null]);
  assert.match('The Threat — undefined', PLACEHOLDER);
  assert.match('', PLACEHOLDER);
  assert.match('ballast--front.png', PLACEHOLDER);
});

test('missing art keeps a non-empty fallback that names the card', () => {
  for(const hero of HEROES){
    const fallback = /<div class="game-art-fallback"><span>([^<]*)<\/span>/.exec(heroArtHTML(hero, 0, {style:'ink'}))?.[1];
    assert.ok(fallback && fallback.includes(hero.role), `hero ${hero.role} fallback "${fallback}"`);
  }
  for(const item of CASES){
    const fallback = /<div class="game-art-fallback"><span>([^<]*)<\/span>/.exec(caseArtHTML(item, {style:'ink'}))?.[1];
    assert.ok(fallback && fallback.length > 0, `case ${item.id} fallback`);
  }
});
