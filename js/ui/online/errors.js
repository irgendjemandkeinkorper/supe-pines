/* Online error panel, retry/fallback actions, and the shared pending-button helper. */
import { $, esc } from '../../engine/utils.js';
import { State } from '../../engine/state.js';
import { show } from '../screens.js';
import { subscribeRoom, unsubscribeRoom, subscribeMyPrivate, unsubscribeMyPrivate } from '../../sync/liveRoom.js';
import { getUid } from '../../sync/auth.js';
import { afterSceneFlow } from '../hub.js';
import { renderScenePlay } from '../scene.js';
import { stateBlockHTML } from '../states.js';
import { session } from './session.js';
import { mySeatIndex } from './session.js';
import { leaveOnlineRoom, onlineCreateRoom, onlineJoinRoom } from './entry.js';
import { routeAndRender } from './router.js';

export function hideOnlineError() {
  const container = $('online-error-container');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

export function showOnlineError(err, type, options = {}) {
  const container = $('online-error-container');
  if (!container) return;

  const msg = err && err.message ? err.message : String(err || 'An unknown error occurred.');

  let title = 'Error';
  let cause = msg;
  let nextAction = 'Verify your inputs and try again.';
  let actions = [];

  if (type === 'create') {
    title = 'Failed to Create Room';
    cause = `Could not open a new case on the server. ${msg}`;
    nextAction = 'Try opening the table again, or check your internet connection.';
    actions = [
      {label:'Try Again', onclick:'onlineCreateRoom()', variant:'primary'},
      {label:'Dismiss', onclick:'hideOnlineError()', variant:'ghost'}
    ];
  } else if (type === 'join') {
    title = 'Failed to Join Case';
    cause = `Could not join the case. ${msg}`;
    nextAction = 'Double-check the room code, or ask the host to confirm if the lobby is still open.';
    actions = [
      {label:'Try Again', onclick:'onlineJoinRoom()', variant:'primary'},
      {label:'Dismiss', onclick:'hideOnlineError()', variant:'ghost'}
    ];
  } else if (type === 'auth') {
    title = 'Authentication Failure';
    cause = `We couldn't securely sign you into the switchboard: ${msg}`;
    nextAction = 'Please reload the page to re-authenticate and try again.';
    actions = [
      {label:'Reload Page', onclick:'location.reload()', variant:'primary'},
      {label:'Dismiss', onclick:'hideOnlineError()', variant:'ghost'}
    ];
  } else if (type === 'subscription' || type === 'connection') {
    title = 'Connection Lost';
    cause = `The connection to the remote table was lost. (${msg})`;
    nextAction = 'You can retry connecting to the table, leave the table, or continue playing right now in Hotseat mode on this screen.';
    actions = [
      {label:'Retry Connection', onclick:'onlineRetryConnection()', variant:'primary'},
      {label:'Continue in Hotseat', onclick:'onlineFallbackToHotseat()', variant:'blood'},
      {label:'Leave Room', onclick:'leaveOnlineRoom(); hideOnlineError();', variant:'ghost'}
    ];
  } else {
    title = 'Action Failed';
    cause = `The action could not be completed. ${msg}`;
    nextAction = 'Check your selection and try playing the action again.';
    actions = [
      {label:'Dismiss', onclick:'hideOnlineError()', variant:'ghost'}
    ];
  }

  container.innerHTML = `<div class="panel spotlight ui-state-panel">
      <button class="ghost ui-state-dismiss" type="button" onclick="hideOnlineError()" aria-label="Dismiss error">✕</button>
      ${stateBlockHTML({kind:'error', compact:true, live:false, eyebrow:title, body:cause, next:nextAction, actions})}
    </div>`;

  container.style.display = 'block';
  container.focus();
}

export function onlineRetryConnection() {
  hideOnlineError();
  const code = State.onlineRoomCode;
  if (!code) {
    showOnlineError(new Error('No active room code to reconnect to.'), 'connection');
    return;
  }
  subscribeMyPrivate(code, getUid(), priv => { session.myPrivate = priv; });
  subscribeRoom(code, routeAndRender, error => {
    console.warn('[online] room subscription lost', error);
    showOnlineError(error, 'connection');
  });
}

export function onlineFallbackToHotseat() {
  hideOnlineError();
  const room = State.G;
  if (!room) {
    showOnlineError(new Error('No game state available to fall back to.'), 'action');
    return;
  }

  State.onlineRoomCode = null;
  unsubscribeRoom();
  unsubscribeMyPrivate();

  try { history.replaceState(null, '', location.pathname); } catch(e) {}

  const myUid = getUid();
  const myIdx = mySeatIndex(room);

  room.players.forEach((p, i) => {
    if (i === myIdx && myUid) {
      p.hand = session.myPrivate.hand || [];
      p.secrets = session.myPrivate.secrets || [];
    } else {
      p.hand = [];
      const hCount = p.handCount || 0;
      for (let k = 0; k < hCount; k++) {
        if (room.sceneDeck && room.sceneDeck.length) {
          p.hand.push(room.sceneDeck.pop());
        }
      }
      p.secrets = [];
      const sCount = p.secretsCount || 0;
      const unrevealed = p.unrevealedSecretsCount || 0;
      for (let k = 0; k < sCount; k++) {
        p.secrets.push({ q: 'A secret is kept...', combo: ['Guilt'], used: k >= unrevealed });
      }
    }
  });

  if (room.current) {
    renderScenePlay();
    show('scr-scene');
  } else {
    afterSceneFlow();
  }
}

export function fail(err, forcedType) {
  if (err && (err.message?.includes('subscription') || err.message?.includes('connection') || err.message?.includes('lost'))) {
    showOnlineError(err, 'connection');
  } else if (forcedType) {
    showOnlineError(err, forcedType);
  } else {
    const container = $('scr-online-entry');
    const containerActive = container && container.classList.contains('active');
    if (containerActive) {
      const codeVal = ($('oe-join-code')?.value || '').trim();
      if (codeVal) {
        showOnlineError(err, 'join');
      } else {
        showOnlineError(err, 'create');
      }
    } else {
      showOnlineError(err, 'action');
    }
  }
}

export async function withPendingState(btn, pendingText, actionFn) {
  if (!btn) {
    await actionFn();
    return;
  }
  if (btn.disabled) return;
  const originalText = btn.textContent || btn.value;
  btn.disabled = true;
  btn.textContent = pendingText;
  try {
    await actionFn();
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
