import { $, ACT_NAMES } from '../engine/utils.js';
import { TONES } from '../data/index.js';
import { actToneCounts } from '../engine/rules.js';
import { State } from '../engine/state.js';
import { hasSeenIntro, markIntroSeen } from '../engine/firstrun.js';

/* ---------------- browser history (Back button) ----------------
   A lightweight stack riding on the History API: every screen swap and
   every overlay open/close pushes one state entry, so the browser Back
   button steps backward through them instead of leaving the site.
   Deliberately scoped to local/hotseat navigation only — while playing
   in an online room, screen changes are server/peer-driven (Firestore
   snapshots), and "rewinding" someone else's action has no sane meaning,
   so history pushes are skipped whenever State.onlineRoomCode is set.
   Back there still closes an open overlay (always safe, purely local
   UI), it just won't step between game screens. */
let suppressHistory = false;
let lastFocusBeforeOverlay = null;

export function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo({top:0,behavior:'auto'});
  renderTopbar();
  pushHistory({screen:id, overlay:false});
}

/* Shared modal open/close for every #overlay consumer (Rules, the
   Gallery, "Stakeout" — the Dossier itself is a real screen, not an
   overlay). Centralized here, rather than in each caller, so history
   bookkeeping and focus-return happen exactly once. */
export function openOverlay(){
  lastFocusBeforeOverlay = document.activeElement;
  $('overlay').style.display = 'block';
  pushHistory({...currentScreenState(), overlay:true});
}
export function closeOverlay(){
  if($('overlay').style.display !== 'block') return;
  $('overlay').style.display = 'none';
  lastFocusBeforeOverlay?.focus?.();
  lastFocusBeforeOverlay = null;
  if(!suppressHistory && history.state?.overlay) history.back();
}

function currentScreenState(){
  const active = document.querySelector('.screen.active');
  return {screen: active ? active.id : 'scr-title'};
}
function pushHistory(state){
  if(suppressHistory || State.onlineRoomCode) return;
  const cur = history.state;
  if(cur && cur.screen===state.screen && !!cur.overlay===!!state.overlay) return;
  history.pushState(state, '');
}
/* Called once at startup. Seeds a baseline history entry (so the very
   first Back press has something defined to land on instead of an
   undefined state) and wires popstate to replay screen/overlay changes
   without re-pushing them — suppressHistory guards that reentrancy. */
export function initHistoryNav(){
  if(!history.state) history.replaceState({screen:'scr-title', overlay:false}, '');
  window.addEventListener('popstate', e=>{
    const st = e.state || {screen:'scr-title', overlay:false};
    suppressHistory = true;
    try{
      if($('overlay').style.display==='block' && !st.overlay) closeOverlay();
      if(st.screen && $(st.screen) && !$(st.screen).classList.contains('active')) show(st.screen);
      if(st.overlay && $('overlay').style.display!=='block') $('overlay').style.display='block';
    } finally { suppressHistory = false; }
  });
}

/* Title-screen first-run nudge — see js/engine/firstrun.js. Hidden
   outright once the flag is set (no point re-adding it to the DOM only
   to hide it again on every title-screen visit). */
export function applyFirstrunVisibility(){
  if(hasSeenIntro()){ const el = $('firstrun-hint'); if(el) el.style.display = 'none'; }
}
export function dismissFirstrunHint(){
  markIntroSeen();
  const el = $('firstrun-hint'); if(el) el.style.display = 'none';
}

export function renderTopbar(){
  const G = State.G;
  const tb = $('topbar');
  if(!G){ tb.style.display='none'; return; }
  tb.style.display='flex';
  $('tb-act').textContent = G.act<=3 ? `${ACT_NAMES[G.act]} — ${G.case.title}` : 'The Dossier';
  const counts = actToneCounts();
  $('tb-tones').innerHTML = TONES.map(t=>`<span class="tone count ${t}" title="${t} this act">${counts[t]}</span>`).join('');
}
