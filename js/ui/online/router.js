/* Routes each room snapshot to the screen for its phase. */
import { State } from '../../engine/state.js';
import { show, announce } from '../screens.js';
import { renderChronicle } from '../renderChronicle.js';
import { getUid } from '../../sync/auth.js';
import { mySeatIndex, preserveDraftFor, reactToRoom } from './session.js';
import { renderOnlineHeroSetup, renderOnlineLobby, renderOnlineThreatSetup } from './lobby.js';
import { renderOnlineCloseIntro, renderOnlineHub } from './hub.js';
import { renderOnlineScene } from './scene.js';
import { renderOnlineSecret } from './secret.js';

/* ---------------- router ---------------- */
/* Turn and waiting changes often keep the same screen, so show() won't
   announce them; voice them through the shared status region instead. */
let lastOnlineStatus = '';
export function onlineStatusMessage(room){
  const me = mySeatIndex(room);
  if(room.phase==='lobby') return getUid()===room.hostUid ? '' : 'Waiting for the host to begin.';
  if(room.pendingSecret && me!==room.pendingSecret.pi){
    return `Waiting for ${room.players[room.pendingSecret.pi]?.name || 'a storyteller'} to reveal a Buried Secret.`;
  }
  if(room.current){
    const starter = room.current.starter;
    return starter===me ? 'Your scene is in progress. You decide when it ends.' : `${room.players[starter]?.name || 'A storyteller'} is running a scene.`;
  }
  return '';
}

export function routeAndRender(room){
  State.G = room;
  preserveDraftFor(room);
  reactToRoom(room);
  const status = onlineStatusMessage(room);
  if(status && status!==lastOnlineStatus) announce(status);
  lastOnlineStatus = status;
  if(room.phase==='lobby'){ renderOnlineLobby(room); show('scr-online-lobby'); return; }
  if(room.phase==='finished' || room.act>3){ renderChronicle(false); show('scr-chronicle'); return; }
  if(room.phase==='herosetup'){ renderOnlineHeroSetup(room); show('scr-archsetup'); return; }
  if(room.phase==='threat'){ renderOnlineThreatSetup(room); show('scr-victim'); return; }
  // phase === 'playing'
  if(room.pendingSecret){
    if(mySeatIndex(room)===room.pendingSecret.pi){ renderOnlineSecret(room); show('scr-secret'); return; }
    renderOnlineHub(room); show('scr-hub'); return; // banner inside renderOnlineHub explains the wait
  }
  if(room.current){ renderOnlineScene(room); show('scr-scene'); return; }
  const remaining = room.players.reduce((s,p)=>s+p.scenesLeft,0);
  if(remaining<=0 && !room.closeDone){ renderOnlineCloseIntro(room); show('scr-close'); return; }
  renderOnlineHub(room); show('scr-hub');
}
