import { State } from './state.js';

export const SAVE_KEY = 'sp:save:v1';
export const SAVE_VERSION = 1;
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;

function localStorageAvailable(){
  try { return typeof localStorage !== 'undefined'; }
  catch(e){ return false; }
}

// Tracks the ok -> failing transition so a full or blocked storage area
// raises one notice per failure streak instead of one per autosave.
let saveFailing = false;

function notifySaveFailure(error){
  if(saveFailing) return;
  saveFailing = true;
  const reason = error?.name === 'QuotaExceededError' ? 'quota' : 'unavailable';
  if(typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function'){
    window.dispatchEvent(new CustomEvent('sp:save-failed', {detail:{reason}}));
  }
}

export function isSaveFailing(){ return saveFailing; }

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
    saveFailing = false;
    return true;
  } catch(e){
    notifySaveFailure(e);
    return false;
  }
}

/* Distinguishes "nothing saved" from "a save exists but can't be used", so
   the title screen can tell players their progress was not silently lost. */
export function readSaveStatus(){
  if(!localStorageAvailable()) return {status:'none', snapshot:null};
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); }
  catch(e){ return {status:'unreadable', snapshot:null}; }
  if(!raw) return {status:'none', snapshot:null};
  try {
    const snapshot = JSON.parse(raw);
    if(snapshot?.version !== SAVE_VERSION || snapshot.mode !== 'local' || !snapshot.game?.case || !Array.isArray(snapshot.game.players)) {
      return {status:'corrupt', snapshot:null};
    }
    return {status:'ok', snapshot};
  } catch(e){ return {status:'corrupt', snapshot:null}; }
}

export function readSave(){ return readSaveStatus().snapshot; }

export function hasSavedGame(){ return !!readSave(); }

export function clearSavedGame(){
  if(!localStorageAvailable()) return;
  try { localStorage.removeItem(SAVE_KEY); }
  catch(e){ /* blocked storage must never prevent starting a Case */ }
}

export function exportSaveJSON(){
  if(!State.G || State.onlineRoomCode) return null;
  const snapshot = {version:SAVE_VERSION, savedAt:new Date().toISOString(), mode:'local', screen:'scr-hub', game:State.G};
  return JSON.stringify(snapshot, null, 2);
}

export function parseSaveJSON(raw){
  if(typeof raw !== 'string' || raw.length > MAX_SAVE_BYTES) throw new Error('That save file is too large.');
  const snapshot = JSON.parse(raw);
  if(snapshot?.version !== SAVE_VERSION || snapshot.mode !== 'local' || !snapshot.game?.case || !Array.isArray(snapshot.game.players)) {
    throw new Error('That file is not a valid Supe Pines local save.');
  }
  return snapshot;
}

export function importSaveJSON(raw){
  const snapshot = parseSaveJSON(raw);
  State.onlineRoomCode = null;
  State.pendingCase = snapshot.game.case;
  State.G = snapshot.game;
  saveGame(snapshot.screen || 'scr-hub');
  return snapshot;
}
