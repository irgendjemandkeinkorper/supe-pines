import { $ } from '../engine/utils.js';
import { openOverlay } from './screens.js';

/* A pure distraction, deliberately disconnected from game state — no
   sync, no scoring that matters, nothing here should ever gate or
   affect play. Persisted per-device via localStorage purely so it
   feels like it's "yours" across sessions, not because it matters. */
const STORAGE_KEY = 'sp:idleClicks';

function getCount(){
  try { return Math.max(0, +(localStorage.getItem(STORAGE_KEY)) || 0); }
  catch(e){ return 0; }
}
function setCount(n){
  try { localStorage.setItem(STORAGE_KEY, String(n)); } catch(e){ /* private mode, etc — fine, just don't persist */ }
}

const MILESTONES = [
  [1, "You count the first train past on the El. It doesn't slow down for anyone."],
  [5, 'Five trains now. You’ve started recognizing the conductor’s silhouette.'],
  [13, 'Thirteen. Someone at the diner swears the 13th train never actually stops in Millhaven. You did not listen.'],
  [25, "A streetlight down the block flickers on early. It wasn't due for another hour."],
  [50, 'Something bigger than a pigeon passes low over the rooftops. You do not look up.'],
  [100, 'One hundred. The dispatcher on the scanner has started using your call sign without asking.'],
  [200, 'Two hundred. You could almost swear the rooftops have gotten closer together.'],
  [500, "Five hundred. Whatever you're counting, it stopped being trains a long time ago."]
];
const UNLOCKS = [
  {at:0,  id:'pigeon',    glyph:'⁘', label:'A pigeon, watching from the fire escape.'},
  {at:10, id:'streetlamp', glyph:'◉', label:'A streetlamp flickers to life down the block.'},
  {at:25, id:'eyes',      glyph:'◐', label:"Something with eyes, further back, in a window that shouldn't be lit."}
];

function currentMilestoneText(count){
  let text = '';
  for(const [n, msg] of MILESTONES){ if(count>=n) text = msg; }
  return text;
}

export function showIdleClicker(){
  renderIdlePanel();
  openOverlay();
  const firstButton = document.querySelector('#overlay-content .idle-obj') || document.querySelector('#overlay-content .primary');
  firstButton?.focus();
}

function renderIdlePanel(){
  const count = getCount();
  const unlocked = UNLOCKS.filter(u=>count>=u.at);
  const active = document.activeElement;
  const activeId = active?.className?.split(' ').find(name=>name.startsWith('idle-')) || null;
  const returning = active?.classList.contains('primary');
  $('overlay-content').innerHTML = `
    <h2 style="color:var(--gold)">Stakeout</h2>
    <p class="small muted">Something to do with your hands while the others work the case.</p>
    <div class="idle-scene" id="idle-scene">
      ${unlocked.map(u=>`<button class="idle-obj idle-${u.id}" onclick="idleClick('${u.id}')" aria-label="${u.label}" title="${u.label}">${u.glyph}</button>`).join('')}
    </div>
    <p class="center" style="margin-top:10px" role="status" aria-live="polite" aria-atomic="true"><span class="idle-count" id="idle-count">${count}</span> <span class="small muted">counted</span></p>
    <p class="small" id="idle-milestone" role="status" aria-live="polite" aria-atomic="true" style="min-height:1.4em;color:#cfc2a2;text-align:center">${currentMilestoneText(count)}</p>
    <div class="btnrow" style="justify-content:center"><button class="primary" onclick="closeOverlay()">Back to Millhaven</button></div>`;
  if(returning) $('overlay-content').querySelector('.primary')?.focus();
  else if(activeId) $('overlay-content').querySelector(`.${activeId}`)?.focus();
}

export function idleClick(id){
  const before = getCount();
  const after = before+1;
  setCount(after);

  const btn = document.querySelector(`.idle-${id}`);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!reduced && btn && btn.animate){
    btn.animate([
      {transform:'scale(1) rotate(0deg)'},
      {transform:'scale(1.18) rotate(-5deg)'},
      {transform:'scale(.96) rotate(3deg)'},
      {transform:'scale(1) rotate(0deg)'}
    ], {duration:380, easing:'ease-out'});
  }

  const justUnlocked = UNLOCKS.some(u=>u.at===after);
  if(justUnlocked){
    // Let the click's own reaction animation finish before the panel
    // re-renders to reveal the newly unlocked object — re-rendering
    // immediately would cancel the in-flight animation on `btn`.
    if(reduced) renderIdlePanel();
    else setTimeout(renderIdlePanel, 380);
  } else {
    const countEl = $('idle-count'); if(countEl) countEl.textContent = after;
    const msgEl = $('idle-milestone'); if(msgEl) msgEl.textContent = currentMilestoneText(after);
  }
}
