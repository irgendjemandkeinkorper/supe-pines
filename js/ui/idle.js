import { $ } from '../engine/utils.js';
import { openOverlay } from './screens.js';
import { idleClickPop } from './motion.js';

/* A pure distraction, deliberately disconnected from game state — no
   sync, no scoring that matters, nothing here should ever gate or
   affect play. Persisted per-device via localStorage purely so it
   feels like it's "yours" across sessions, not because it matters.

   FIREWALL: this module does not import js/engine/state.js and never
   reads or writes State.G. Verified by test/idle-firewall.test.mjs.
   */
const STORAGE_KEY = 'sp:idleClicks';
const PASSIVE_INTERVAL_MS = 5000; // one passive tick every 5 seconds

function getCount(){
  try { return Math.max(0, +(localStorage.getItem(STORAGE_KEY)) || 0); }
  catch(e){ return 0; }
}
function setCount(n){
  try { localStorage.setItem(STORAGE_KEY, String(n)); } catch(e){ /* private mode, etc — fine, just don't persist */ }
}

/* ---- milestone prose (expanded register) ---- */
const MILESTONES = [
  [1, "You count the first train past on the El. It doesn't slow down for anyone."],
  [5, 'Five trains now. You’ve started recognizing the conductor’s silhouette.'],
  [13, 'Thirteen. Someone at the diner swears the 13th train never actually stops in Millhaven. You did not listen.'],
  [25, "A streetlight down the block flickers on early. It wasn't due for another hour."],
  [50, 'Something bigger than a pigeon passes low over the rooftops. You do not look up.'],
  [100, 'One hundred. The dispatcher on the scanner has started using your call sign without asking.'],
  [200, 'Two hundred. You could almost swear the rooftops have gotten closer together.'],
  [500, "Five hundred. Whatever you're counting, it stopped being trains a long time ago."],
  [750, 'Seven-fifty. The street below rearranges itself when you look away. You are not afraid. You are only watching.'],
  [1000, 'One thousand. The El runs on time, impossibly, every time. Someone is keeping a schedule for you.'],
  [1500, "Fifteen hundred. You're not sure you could stop counting now even if you wanted to. You don't."],
  [2500, 'Two-thousand five hundred. The city breathes in counts. You can feel the exhale coming.'],
  [5000, "Five thousand. The dispatcher stopped transmitting. You don't need the scanner anymore."],
  [10000, "Ten thousand. There is no train. There never was. You're still counting."]
];

/* ---- tiered unlocks (expanded beyond initial three) ---- */
const UNLOCKS = [
  { at:0,    id:'pigeon',      glyph:'⁘', label:'A pigeon, watching from the fire escape.' },
  { at:10,   id:'streetlamp',  glyph:'◉', label:'A streetlamp flickers to life down the block.' },
  { at:25,   id:'eyes',        glyph:'◐', label:"Something with eyes, further back, in a window that shouldn't be lit." },
  { at:50,   id:'rooftop',     glyph:'◬', label:'A figure on the rooftop across the street. They are not looking at you. Yet.' },
  { at:100,  id:'scanner',     glyph:'◈', label:'The police scanner crackles with a voice that knows your name.' },
  { at:200,  id:'dispatcher',  glyph:'◉', label:'The dispatcher has started leaving pauses where your call sign should be.' },
  { at:500,  id:'shadow',      glyph:'◑', label:'A shadow that arrives before its owner. It waits outside the cordon.' }
];

/* ---- passive accrual ---- */
let passiveTimer = null;

function startPassiveAccrual() {
  stopPassiveAccrual();
  passiveTimer = setInterval(() => {
    // Only tick while overlay is visible
    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('overlay');
      if (!overlay || overlay.style.display !== 'block') return;
    }
    passiveTick();
  }, PASSIVE_INTERVAL_MS);
}

function stopPassiveAccrual() {
  if (passiveTimer !== null) {
    clearInterval(passiveTimer);
    passiveTimer = null;
  }
}

function passiveTick() {
  const before = getCount();
  const after = before + 1;
  setCount(after);

  // Update the count display only (no re-render, no animation)
  const countEl = typeof document !== 'undefined' ? document.getElementById('idle-count') : null;
  if (countEl) countEl.textContent = after;

  // Update milestone text if it changed
  const oldMilestone = currentMilestoneText(before);
  const newMilestone = currentMilestoneText(after);
  if (newMilestone !== oldMilestone) {
    const msgEl = typeof document !== 'undefined' ? document.getElementById('idle-milestone') : null;
    if (msgEl) msgEl.textContent = newMilestone;
  }

  // If a new object just unlocked, re-render the whole panel to reveal it
  const justUnlocked = UNLOCKS.some(u => u.at === after);
  if (justUnlocked) renderIdlePanel();
}

/* ---- helpers ---- */
function currentMilestoneText(count){
  let text = '';
  for(const [n, msg] of MILESTONES){ if(count>=n) text = msg; }
  return text;
}

/* ---- public API ---- */
export function showIdleClicker(){
  renderIdlePanel();
  openOverlay();
  startPassiveAccrual();
  const firstButton = document.querySelector('#overlay-content .idle-obj') || document.querySelector('#overlay-content .primary');
  firstButton?.focus();
}

function renderIdlePanel(){
  const count = getCount();
  const unlocked = UNLOCKS.filter(u=>count>=u.at);
  const active = document.activeElement;
  const activeId = active?.className?.split(' ').find(name=>name.startsWith('idle-')) || null;
  const returning = active?.classList.contains('primary');
  const overlayContent = $('overlay-content');
  if (!overlayContent) return;
  overlayContent.innerHTML = `
    <h2 style="color:var(--gold)">Stakeout</h2>
    <p class="small muted">Something to do with your hands while the others work the case.</p>
    <div class="idle-scene" id="idle-scene">
      ${unlocked.map(u=>`<button class="idle-obj idle-${u.id}" onclick="idleClick('${u.id}')" aria-label="${u.label}" title="${u.label}">${u.glyph}</button>`).join('')}
    </div>
    <p class="center" style="margin-top:10px" role="status" aria-live="polite" aria-atomic="true"><span class="idle-count" id="idle-count">${count}</span> <span class="small muted">counted</span></p>
    <p class="small" id="idle-milestone" role="status" aria-live="polite" aria-atomic="true" style="min-height:1.4em;color:#cfc2a2;text-align:center">${currentMilestoneText(count)}</p>
    <p class="small muted center" style="margin-top:2px;font-size:.72rem">+1 every ${PASSIVE_INTERVAL_MS / 1000}s while open</p>
    <div class="btnrow" style="justify-content:center"><button class="primary" onclick="closeOverlay()">Back to Millhaven</button></div>`;
  if(returning) overlayContent.querySelector('.primary')?.focus();
  else if(activeId) overlayContent.querySelector(`.${activeId}`)?.focus();
}

export async function idleClick(id){
  const before = getCount();
  const after = before+1;
  setCount(after);

  const btn = document.querySelector(`.idle-${id}`);

  // Animate the click via the shared motion module
  if (btn) await idleClickPop(btn);

  const justUnlocked = UNLOCKS.some(u=>u.at===after);
  if(justUnlocked){
    // After the click animation finishes, re-render to reveal the
    // newly unlocked object. Using the motion module's
    // promise-returning API instead of setTimeout so the animation
    // completes before innerHTML cancels it.
    renderIdlePanel();
  } else {
    const countEl = $('idle-count'); if(countEl) countEl.textContent = after;
    const msgEl = $('idle-milestone'); if(msgEl) msgEl.textContent = currentMilestoneText(after);
  }
}

/* Listen for overlay-close events from screens.js so the passive timer
   stops when the overlay is dismissed (Back button, Escape, or button). */
if (typeof document !== 'undefined') {
  document.addEventListener('sp:overlayClosed', () => {
    stopPassiveAccrual();
  });
}
