import { State } from './state.js';

export const SAVE_KEY = 'sp:save:v1';
export const SAVE_VERSION = 1;

function localStorageAvailable(){
  try { return typeof localStorage !== 'undefined'; }
  catch(e){ return false; }
}

export function saveGame(screen = null){
  if(!State.G || State.onlineRoomCode || !localStorageAvailable()) return false;
  const activeScreen = screen || document.querySelector('.screen.active')?.id || 'scr-hub';
  const snapshot = {
    version:SAVE_VERSION,
    savedAt:new Date().toISOString(),
    mode:'local',
    screen:activeScreen,
    game:State.G
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch(e){ return false; }
}

export function readSave(){
  if(!localStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const snapshot = JSON.parse(raw);
    if(snapshot?.version !== SAVE_VERSION || snapshot.mode !== 'local' || !snapshot.game?.case || !Array.isArray(snapshot.game.players)) return null;
    return snapshot;
  } catch(e){ return null; }
}

export function hasSavedGame(){ return !!readSave(); }

export function clearSavedGame(){
  if(!localStorageAvailable()) return;
  try { localStorage.removeItem(SAVE_KEY); }
  catch(e){ /* blocked storage must never prevent starting a Case */ }
}
