/* Create, join, leave, and auto-rejoin a room. */
import { $ } from '../../engine/utils.js';
import { CASES } from '../../data/index.js';
import { State } from '../../engine/state.js';
import { show } from '../screens.js';
import { createRoom, joinRoom, subscribeRoom, unsubscribeRoom, subscribeMyPrivate, unsubscribeMyPrivate } from '../../sync/liveRoom.js';
import { getUid, ensureSignedIn } from '../../sync/auth.js';
import { firebaseConfigured } from '../../sync/config.js';
import { artStylePickerHTML, normalizeArtStyle } from '../art.js';
import { touchRoomPresence } from '../../sync/liveActions.js';
import { session } from './session.js';
import { onlineVerifyAndProceed, renderOnlineEntryForm, renderOnlineMissingConfig, renderOnlineVerificationFailed, renderOnlineVerificationLoading } from './connection.js';
import { clearAdvanceTimer, resetDraft } from './session.js';
import { fail, withPendingState } from './errors.js';
import { routeAndRender } from './router.js';

/* ---------------- entry: create or join ---------------- */
export function showOnlineEntry(){
  unsubscribeRoom();
  unsubscribeMyPrivate();
  clearAdvanceTimer();
  resetDraft();
  State.onlineRoomCode = null;
  State.G = null;

  if(!firebaseConfigured){
    renderOnlineMissingConfig();
    show('scr-online-entry');
    return;
  }
  if (session.firebaseVerificationStatus === 'ready') {
    renderOnlineEntryForm();
    show('scr-online-entry');
  } else if (session.firebaseVerificationStatus === 'verifying') {
    renderOnlineVerificationLoading();
    show('scr-online-entry');
  } else if (session.firebaseVerificationStatus === 'failed') {
    renderOnlineVerificationFailed(session.firebaseVerificationError);
    show('scr-online-entry');
  } else {
    // Start verification
    onlineVerifyAndProceed();
  }
}
export function onlineRefreshArtPicker(){
  const picker = $('oe-art-style-picker');
  const item = CASES[+$('oe-case').value] || CASES[0];
  if(picker) picker.innerHTML = artStylePickerHTML('oe-art-style', document.querySelector('input[name="oe-art-style"]:checked')?.value || null, item.id);
}
export async function onlineCreateRoom(btn){
  try{
    const chosenCase = CASES[+$('oe-case').value];
    const name = ($('oe-host-name').value||'').trim();
    const artStyle = document.querySelector('input[name="oe-art-style"]:checked')?.value;
    await withPendingState(btn, "Creating Room...", async () => {
      const code = await createRoom(chosenCase, name, normalizeArtStyle(artStyle));
      enterRoom(code);
    });
  } catch(err){ fail(err, 'create'); }
}
export async function onlineJoinRoom(btn){
  try{
    const code = ($('oe-join-code').value||'').trim().toUpperCase();
    const name = ($('oe-join-name').value||'').trim();
    await withPendingState(btn, "Joining...", async () => {
      await joinRoom(code, name);
      enterRoom(code);
    });
  } catch(err){ fail(err, 'join'); }
}
export function enterRoom(code){
  State.onlineRoomCode = code;
  try { history.replaceState(null, '', '?room='+code); } catch(e){}
  session.myPrivate = {hand:[], secrets:[]};
  resetDraft();
  if(session.presenceTimer) clearInterval(session.presenceTimer);
  touchRoomPresence(code).catch(()=>{});
  session.presenceTimer = setInterval(()=>touchRoomPresence(code).catch(()=>{}), 30000);
  session.lastClaimAttempt = -1;
  subscribeMyPrivate(code, getUid(), priv => { session.myPrivate = priv; });
  subscribeRoom(code, routeAndRender, error => {
    console.warn('[online] room subscription lost', error);
    fail(new Error('The remote case connection was lost. Reopen this room link to try again.'));
  });
}

export async function leaveOnlineRoom(btn){
  try {
    await withPendingState(btn, "Leaving...", async () => {
      unsubscribeRoom();
      unsubscribeMyPrivate();
      if(session.presenceTimer) clearInterval(session.presenceTimer);
      session.presenceTimer = null;
      clearAdvanceTimer();
      resetDraft();
      State.onlineRoomCode = null;
      State.G = null;
      try { history.replaceState(null, '', location.pathname); } catch(e){}
      show('scr-title');
    });
  } catch(err){ fail(err); }
}

/* Auto-rejoin if the URL already carries ?room=CODE (e.g. a reopened tab). */
export async function tryAutoRejoin(){
  if(!firebaseConfigured) return false;
  const params = new URLSearchParams(location.search);
  const code = params.get('room');
  if(!code) return false;
  try {
    await ensureSignedIn();
    // joinRoom() is a no-op write if we're already seated, which is exactly
    // the reconnect case; it throws if we're a stranger to a live game.
    await joinRoom(code, '');
    enterRoom(code);
    return true;
  } catch(err){
    console.warn('[online] auto-rejoin failed', err);
    return false;
  }
}
