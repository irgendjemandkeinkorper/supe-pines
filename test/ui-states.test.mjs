import test from 'node:test';
import assert from 'node:assert/strict';
import { stateBlockHTML } from '../js/ui/states.js';

test('state blocks pick the live-region role from their kind', () => {
  assert.match(stateBlockHTML({kind:'loading', title:'Working'}), /role="status" aria-busy="true"/);
  assert.match(stateBlockHTML({kind:'error', title:'Broke'}), /role="alert"/);
  assert.match(stateBlockHTML({kind:'offline', title:'Down'}), /role="alert"/);
  assert.match(stateBlockHTML({kind:'empty', title:'None'}), /role="status"/);
  assert.doesNotMatch(stateBlockHTML({kind:'error', title:'Inner', live:false}), /role=/);
});

test('state blocks escape copy and render recovery actions', () => {
  const html = stateBlockHTML({kind:'error', title:'<b>x</b>', body:'a & b', next:'Retry it', actions:[
    {label:'Retry', onclick:'retry()', variant:'primary'}, {label:'Back', onclick:"show('scr-title')"}
  ]});
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /a &amp; b/);
  assert.match(html, /<strong>Next:<\/strong> Retry it/);
  assert.match(html, /<button class="primary" type="button" onclick="retry\(\)">Retry<\/button>/);
  assert.match(html, /<button class="ghost" type="button" onclick="show\('scr-title'\)">Back<\/button>/);
  assert.match(html, /data-ui-state="error"/);
});

test('only loading states show the spinner', () => {
  assert.match(stateBlockHTML({kind:'loading', title:'t'}), /ui-state-spinner/);
  assert.doesNotMatch(stateBlockHTML({kind:'empty', title:'t'}), /ui-state-spinner/);
});
