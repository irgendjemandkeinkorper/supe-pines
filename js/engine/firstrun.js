/* Tracks, per-device, whether this player has already been shown the
   game's onboarding nudges (the title-screen hint, the first-scene
   primer). Purely local UI state — mirrors the sp:idleClicks pattern in
   js/ui/idle.js — never synced, never gates play. Fails open (acts as
   "already seen") if storage is blocked, so a private-browsing tab is
   never nagged. */
const SEEN_KEY = 'sp:seenIntro';

export function hasSeenIntro(){
  try { return !!localStorage.getItem(SEEN_KEY); }
  catch(e){ return true; }
}
export function markIntroSeen(){
  try { localStorage.setItem(SEEN_KEY, '1'); }
  catch(e){ /* private mode, etc — fine, just don't persist */ }
}
