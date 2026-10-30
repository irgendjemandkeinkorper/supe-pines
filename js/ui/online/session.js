/* Per-tab online session state shared by the online screens, plus draft preservation and room reactions. */
import { TONES } from '../../data/index.js';
import { State } from '../../engine/state.js';
import { getUid } from '../../sync/auth.js';
import { liveClaimSecret, liveAdvanceAfterClose } from '../../sync/liveActions.js';

/* Shared mutable state lives on one object because ES module bindings are
   read-only to importers. */
export const session = {
  draft: {},
  presenceTimer: null,
  myPrivate: {hand:[], secrets:[]},
  lastClaimAttempt: -1,
  firebaseVerificationStatus: 'idle', // 'idle', 'verifying', 'ready', 'failed'
  firebaseVerificationError: null
};

let draftContext = null;
export function resetDraft(){ session.draft = {}; draftContext = null; }

/* Keep local composition state while a peer's snapshot updates the same
   logical action. A new scene, phase, or Secret clears it deliberately. */
export function roomDraftContext(room){
  if(!room) return null;
  const journalLength = Array.isArray(room.journal) ? room.journal.length : 0;
  if(room.phase==='herosetup') return `herosetup|${room.archIdx}`;
  if(room.phase==='threat') return `threat|${room.threat?.facts?.length||0}`;
  if(room.phase==='playing' && room.pendingSecret){
    const pending = room.pendingSecret;
    return `secret|${room.act}|${journalLength}|${pending.pi}|${pending.secretIndex ?? ''}`;
  }
  if(room.phase==='playing' && room.current){
    const current = room.current;
    return `scene|${room.act}|${journalLength}|${current.type}|${current.starter}|${current.archIdx ?? ''}|${current.card?.title||''}`;
  }
  return `${room.phase}|${room.act??0}|${journalLength}|${room.closeDone?'closed':'open'}`;
}
export function preserveDraftFor(room){
  const nextContext = roomDraftContext(room);
  if(nextContext !== draftContext){ session.draft = {}; draftContext = nextContext; }
}

/* My own hand + Buried Secret(s) — kept live via a subscription to my own
   private doc, never read from the public room object. */

/* Guards against re-attempting a claim we already tried for the same
   journal entry (e.g. if it fails, don't retry-spam on every snapshot). */
/* Timer for the delayed advance-after-close cascade; cleared whenever the
   underlying condition stops being true so it never fires stale. */
let advanceTimer = null;

export function clearAdvanceTimer(){ if(advanceTimer){ clearTimeout(advanceTimer); advanceTimer = null; } }

/* Called on every room snapshot. Reactively claims a Buried Secret if my
   own private secrets match the newest journal entry, and schedules the
   delayed act-advance once an Act Close has resolved with nothing
   pending — see the file header in js/sync/liveActions.js for why this
   can't just happen synchronously inside the resolving transaction. */
export function reactToRoom(room){
  if(room.phase!=='playing'){ clearAdvanceTimer(); return; }
  if(room.current===null && !room.pendingSecret && room.journal.length>0){
    const idx = room.journal.length-1;
    if(idx!==session.lastClaimAttempt){
      session.lastClaimAttempt = idx;
      const entry = room.journal[idx];
      if(entry && (entry.type==='scene' || entry.type==='close')){
        const counts = Object.fromEntries(TONES.map(t=>[t,0]));
        entry.tones.forEach(t=>counts[t]++);
        const haveMatch = session.myPrivate.secrets.some(s => !s.used &&
          (()=>{ const need=Object.fromEntries(TONES.map(t=>[t,0])); s.combo.forEach(t=>need[t]++);
                 return TONES.every(t=>counts[t]>=need[t]); })());
        if(haveMatch) liveClaimSecret(State.onlineRoomCode, idx).catch(()=>{}); // lost the race or stale — fine, silent
      }
    }
  }
  if(room.current===null && !room.pendingSecret && room.closeDone){
    if(!advanceTimer) advanceTimer = setTimeout(()=>{
      advanceTimer = null;
      liveAdvanceAfterClose(State.onlineRoomCode).catch(()=>{});
    }, 1500);
  } else {
    clearAdvanceTimer();
  }
}

export function mySeatIndex(room){
  const uid = getUid();
  if(!room || !room.seats) return -1;
  const idx = room.seats[uid];
  return idx===undefined ? -1 : idx;
}
