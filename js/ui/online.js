import { $, esc, toneBadge, ACT_NAMES, ROMAN, progressDotsHTML, actTrackHTML } from '../engine/utils.js';
import { CASES, TONES } from '../data/index.js';
import { State } from '../engine/state.js';
import { show } from './screens.js';
import { heroCard, signalCard, sceneCardHTML, journalEntrySummaryHTML, sceneAnatomyDiagramHTML, sceneTrackerHTML } from './cards.js';
import { faceUp, maxContrib, actToneCounts, HEROES_PER_GAME } from '../engine/rules.js';
import { renderChronicle } from './renderChronicle.js';
import { hasSeenIntro, markIntroSeen } from '../engine/firstrun.js';
import { createRoom, joinRoom, subscribeRoom, unsubscribeRoom, subscribeMyPrivate, unsubscribeMyPrivate } from '../sync/liveRoom.js';
import { getUid, ensureSignedIn, verifyFirebaseReadiness } from '../sync/auth.js';
import { firebaseConfigured } from '../sync/config.js';

export let firebaseVerificationStatus = 'idle'; // 'idle', 'verifying', 'ready', 'failed'
export let firebaseVerificationError = null;

export async function onlineVerifyAndProceed() {
  firebaseVerificationStatus = 'verifying';
  firebaseVerificationError = null;
  renderOnlineVerificationLoading();
  show('scr-online-entry');

  try {
    await verifyFirebaseReadiness();
    firebaseVerificationStatus = 'ready';
    showOnlineEntry(); // Re-render with the ready state (the entry form)
  } catch (err) {
    firebaseVerificationStatus = 'failed';
    firebaseVerificationError = err;
    renderOnlineVerificationFailed(err);
    show('scr-online-entry');
  }
}

export async function initFirebaseConnection() {
  if (!firebaseConfigured) return;
  firebaseVerificationStatus = 'verifying';
  try {
    await verifyFirebaseReadiness();
    firebaseVerificationStatus = 'ready';
    await tryAutoRejoin();
  } catch (err) {
    console.warn('[sync] Firebase background verification failed', err);
    firebaseVerificationStatus = 'failed';
    firebaseVerificationError = err;
    const onlineButton = document.getElementById('title-online-button');
    if(onlineButton){
      onlineButton.classList.remove('primary');
      onlineButton.classList.add('ghost');
      onlineButton.textContent = 'Online (connection issue)';
      onlineButton.title = 'Firebase connection failed. Click to view details and troubleshoot.';
    }
    const params = new URLSearchParams(location.search);
    if(params.get('room')){
      showOnlineEntry();
    }
  }
}

function renderOnlineMissingConfig() {
  $('scr-online-entry').innerHTML = `
    <div class="panel" style="max-width:680px;margin:36px auto;text-align:center">
      <div class="sc" style="color:var(--blood-bright);letter-spacing:.22em">REMOTE TABLES</div>
      <h2 style="margin-top:10px">The Switchboard Isn’t Live Yet</h2>
      <p class="muted" style="max-width:540px;margin:12px auto 0">This public build is ready for hotseat play on one shared screen. Separate-screen rooms need a dedicated Firebase project before they can safely open.</p>

      <div class="panel tight" style="text-align:left;background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.1);margin:20px auto;max-width:540px;">
        <h4 style="color:var(--gold);margin-top:0">Required Firebase Setup Steps:</h4>
        <ol class="small" style="padding-left:18px;line-height:1.5;color:#cfc2a2">
          <li><strong>Firebase Config:</strong> Register a Web app in the Firebase console, and copy the config object into <code style="color:var(--blood-bright)">js/sync/config.js</code>.</li>
          <li><strong>Anonymous Auth:</strong> Enable Anonymous sign-in under Build → Authentication → Sign-in method.</li>
          <li><strong>Firestore Database:</strong> Create a Firestore database in <strong>Production Mode</strong>.</li>
          <li><strong>Firestore Rules:</strong> Publish the rules from <code style="color:var(--blood-bright)">firestore.rules</code> in the Firestore Rules tab.</li>
          <li><strong>Authorized Domains:</strong> Add your deployment domain (e.g. your-username.github.io) under Authentication → Settings → Authorized domains.</li>
        </ol>
      </div>

      <p class="small" style="max-width:540px;margin:14px auto 0;color:#d9cca9">If you’re hosting tonight, choose <strong>Open the Case</strong>. Nothing in the local game depends on Firebase.</p>
      <div class="btnrow" style="justify-content:center;margin-top:22px">
        <button class="primary" onclick="show('scr-hook')">Open the Case</button>
        <button class="ghost" onclick="show('scr-title')">Back</button>
      </div>
    </div>`;
}

function renderOnlineVerificationLoading() {
  $('scr-online-entry').innerHTML = `
    <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    </style>
    <div class="panel" style="max-width:680px;margin:36px auto;text-align:center">
      <div class="sc" style="color:var(--gold);letter-spacing:.22em">VERIFYING SWITCHBOARD</div>
      <h2 style="margin-top:10px">Testing Connection to Millhaven...</h2>
      <p class="muted" style="max-width:540px;margin:12px auto 0">Verifying Anonymous Authentication and Firestore database availability.</p>
      <div style="margin:24px 0;">
        <div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.1); border-left-color: var(--gold); border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <div class="btnrow" style="justify-content:center;margin-top:22px">
        <button class="ghost" onclick="leaveOnlineRoom()">Cancel</button>
      </div>
    </div>`;
}

function renderOnlineVerificationFailed(error) {
  const msg = error && error.message ? error.message : String(error);

  // Categorize the error for the user
  let categoryTitle = "Connection Failed";
  let diagnostic = "An unknown error occurred while establishing a secure session with Firebase.";
  let actionRequired = "Verify that your internet connection is active and that your Firebase project configuration in <code>js/sync/config.js</code> is valid and contains no placeholder values.";

  if (!firebaseConfigured) {
    categoryTitle = "Missing Configuration";
    diagnostic = "The Firebase SDK config contains empty or default values.";
    actionRequired = "Add your web app credentials to <code>js/sync/config.js</code> before launching remote multiplayer.";
  } else if (msg.includes("auth") || msg.includes("operation-not-allowed") || msg.includes("sign-in") || msg.includes("uid") || msg.includes("unauthorized") || msg.includes("domains")) {
    categoryTitle = "Authentication Blocked";
    diagnostic = "The application could not establish an anonymous session (Auth error).";
    actionRequired = "Ensure that <strong>Anonymous Sign-in</strong> is enabled under Build → Authentication → Sign-in method in your Firebase Console, and that your current domain is listed in <strong>Authorized domains</strong>.";
  } else if (msg.includes("permission-denied") || msg.includes("rules") || msg.includes("Firestore") || msg.includes("denied")) {
    categoryTitle = "Database Read Blocked";
    diagnostic = "Authenticated successfully, but the test read was blocked by Firestore security rules.";
    actionRequired = "Ensure that your Firestore Database has been created (in <strong>Production Mode</strong>) and that the security rules from <code>firestore.rules</code> are pasted and published under the Firestore Rules tab in your Firebase Console.";
  } else if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch") || msg.includes("offline")) {
    categoryTitle = "Network Offline";
    diagnostic = "The request to the Firebase servers timed out or failed to route.";
    actionRequired = "Check your internet connection or firewall. If you are deploying to GitHub Pages, ensure you have added your custom domain or GitHub Pages URL to your Firebase Authorized Domains list.";
  }

  $('scr-online-entry').innerHTML = `
    <div class="panel" style="max-width:680px;margin:36px auto;text-align:center">
      <div class="sc" style="color:var(--blood-bright);letter-spacing:.22em">SWITCHBOARD OFFLINE</div>
      <h2 style="margin-top:10px">${esc(categoryTitle)}</h2>

      <div class="panel tight" style="text-align:left;background:rgba(217, 83, 79, 0.05);border-color:var(--blood);margin:20px auto;max-width:540px;">
        <p class="small" style="margin-top:0"><strong>Details:</strong> <span style="color:#f2dede">${esc(msg)}</span></p>
        <p class="small" style="margin-bottom:0;color:#cfc2a2"><strong>Diagnostic:</strong> ${diagnostic}</p>
      </div>

      <div class="panel tight" style="text-align:left;background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.1);margin:20px auto;max-width:540px;">
        <h4 style="color:var(--gold);margin-top:0">How to Fix This:</h4>
        <p class="small" style="line-height:1.5;color:#cfc2a2;margin-bottom:0">${actionRequired}</p>
        <hr class="rule" style="border-color:rgba(255,255,255,0.1);margin:12px 0">
        <h4 style="color:var(--gold);margin-top:0">The Firebase Release Checklist:</h4>
        <ol class="small" style="padding-left:18px;line-height:1.5;color:#cfc2a2;margin-bottom:0">
          <li><strong>Firebase Config:</strong> Web app config populated in <code>js/sync/config.js</code>.</li>
          <li><strong>Anonymous Auth:</strong> Enabled in Build → Authentication → Sign-in method.</li>
          <li><strong>Firestore Database:</strong> Created in <strong>Production Mode</strong> (not test mode).</li>
          <li><strong>Firestore Rules:</strong> Rules from <code>firestore.rules</code> copied & published.</li>
          <li><strong>Authorized Domains:</strong> Deployment URL authorized under Authentication → Settings.</li>
        </ol>
      </div>

      <p class="small" style="max-width:540px;margin:14px auto 0;color:#d9cca9">You can still play tonight using Hotseat mode (all storytellers sharing one screen).</p>

      <div class="btnrow" style="justify-content:center;margin-top:22px">
        <button class="primary" onclick="onlineVerifyAndProceed()">Retry Connection</button>
        <button class="primary" onclick="show('scr-hook')">Play Hotseat (Open the Case)</button>
        <button class="ghost" onclick="leaveOnlineRoom()">Back</button>
      </div>
    </div>`;
}

function renderOnlineEntryForm() {
  $('scr-online-entry').innerHTML = `
    <h2 class="center">Play Online</h2>
    <p class="center muted">Gather your team across separate screens. One person opens the case; everyone else joins with the code.</p>
    <div class="ornament">❦</div>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));max-width:900px;margin:0 auto">
      <div class="panel">
        <h3 style="color:var(--gold)">Open a New Case</h3>
        <label class="fld" for="oe-case">Choose the Case</label>
        <select id="oe-case" onchange="onlineRefreshArtPicker()">${CASES.map((h,i)=>`<option value="${i}">${esc(h.title)}</option>`).join('')}</select>
        <div id="oe-art-style-picker">${artStylePickerHTML('oe-art-style', null, CASES[0].id)}</div>
        <label class="fld" for="oe-host-name">Your name</label>
        <input type="text" id="oe-host-name" placeholder="Storyteller I">
        <div class="btnrow">
          <button class="primary" onclick="onlineCreateRoom()">Open the Table</button>
        </div>
      </div>
      <div class="panel">
        <h3 style="color:var(--gold)">Join a Case in Progress</h3>
        <label class="fld" for="oe-join-code">Room code</label>
        <input type="text" id="oe-join-code" placeholder="e.g. K7QRM" style="text-transform:uppercase">
        <label class="fld" for="oe-join-name">Your name</label>
        <input type="text" id="oe-join-name" placeholder="Your name">
        <div class="btnrow">
          <button class="primary" onclick="onlineJoinRoom()">Join the Table</button>
        </div>
      </div>
    </div>
    <div class="btnrow" style="justify-content:center;margin-top:20px">
      <button class="ghost" onclick="leaveOnlineRoom()">Back</button>
    </div>`;
}
import { ART_STYLES, artStylePickerHTML, normalizeArtStyle } from './art.js';
import {
  liveBeginTale, liveSaveHeroSetup, liveFinishThreat, liveBeginScene, liveBeginClose,
  liveContribute, liveEndSceneAndResolve, liveConfirmSecret, liveClaimSecret,
  liveAdvanceAfterClose, liveTradeSignal, liveForfeitScene
} from '../sync/liveActions.js';
import { renderHub, afterSceneFlow } from './hub.js';
import { renderScenePlay } from './scene.js';

/* Small per-device scratch state for in-progress, uncommitted composition
   (which card/Hero picked, contribution draft, flip checkboxes,
   secret-signal picks). None of this is synced — only the final submit
   actions above write to Firestore. Reset whenever the underlying
   room-driven phase changes shape from under it. */
let draft = {};
let draftContext = null;
function resetDraft(){ draft = {}; draftContext = null; }

/* Keep local composition state while a peer's snapshot updates the same
   logical action. A new scene, phase, or Secret clears it deliberately. */
function roomDraftContext(room){
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
function preserveDraftFor(room){
  const nextContext = roomDraftContext(room);
  if(nextContext !== draftContext){ draft = {}; draftContext = nextContext; }
}

/* My own hand + Buried Secret(s) — kept live via a subscription to my own
   private doc, never read from the public room object. */
let myPrivate = {hand:[], secrets:[]};

/* Guards against re-attempting a claim we already tried for the same
   journal entry (e.g. if it fails, don't retry-spam on every snapshot). */
let lastClaimAttempt = -1;
/* Timer for the delayed advance-after-close cascade; cleared whenever the
   underlying condition stops being true so it never fires stale. */
let advanceTimer = null;

function clearAdvanceTimer(){ if(advanceTimer){ clearTimeout(advanceTimer); advanceTimer = null; } }

/* Called on every room snapshot. Reactively claims a Buried Secret if my
   own private secrets match the newest journal entry, and schedules the
   delayed act-advance once an Act Close has resolved with nothing
   pending — see the file header in js/sync/liveActions.js for why this
   can't just happen synchronously inside the resolving transaction. */
function reactToRoom(room){
  if(room.phase!=='playing'){ clearAdvanceTimer(); return; }
  if(room.current===null && !room.pendingSecret && room.journal.length>0){
    const idx = room.journal.length-1;
    if(idx!==lastClaimAttempt){
      lastClaimAttempt = idx;
      const entry = room.journal[idx];
      if(entry && (entry.type==='scene' || entry.type==='close')){
        const counts = Object.fromEntries(TONES.map(t=>[t,0]));
        entry.tones.forEach(t=>counts[t]++);
        const haveMatch = myPrivate.secrets.some(s => !s.used &&
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

function mySeatIndex(room){
  const uid = getUid();
  if(!room || !room.seats) return -1;
  const idx = room.seats[uid];
  return idx===undefined ? -1 : idx;
}
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
  let buttonsHTML = '';

  if (type === 'create') {
    title = 'Failed to Create Room';
    cause = `Could not open a new case on the server. ${msg}`;
    nextAction = 'Try opening the table again, or check your internet connection.';
    buttonsHTML = `
      <button class="primary" onclick="onlineCreateRoom()">Try Again</button>
      <button class="ghost" onclick="hideOnlineError()">Dismiss</button>
    `;
  } else if (type === 'join') {
    title = 'Failed to Join Case';
    cause = `Could not join the case. ${msg}`;
    nextAction = 'Double-check the room code, or ask the host to confirm if the lobby is still open.';
    buttonsHTML = `
      <button class="primary" onclick="onlineJoinRoom()">Try Again</button>
      <button class="ghost" onclick="hideOnlineError()">Dismiss</button>
    `;
  } else if (type === 'auth') {
    title = 'Authentication Failure';
    cause = `We couldn't securely sign you into the switchboard: ${msg}`;
    nextAction = 'Please reload the page to re-authenticate and try again.';
    buttonsHTML = `
      <button class="primary" onclick="location.reload()">Reload Page</button>
      <button class="ghost" onclick="hideOnlineError()">Dismiss</button>
    `;
  } else if (type === 'subscription' || type === 'connection') {
    title = 'Connection Lost';
    cause = `The connection to the remote table was lost. (${msg})`;
    nextAction = 'You can retry connecting to the table, leave the table, or continue playing right now in Hotseat mode on this screen.';
    buttonsHTML = `
      <button class="primary" onclick="onlineRetryConnection()">Retry Connection</button>
      <button class="blood" onclick="onlineFallbackToHotseat()">Continue in Hotseat</button>
      <button class="ghost" onclick="leaveOnlineRoom(); hideOnlineError();">Leave Room</button>
    `;
  } else {
    title = 'Action Failed';
    cause = `The action could not be completed. ${msg}`;
    nextAction = 'Check your selection and try playing the action again.';
    buttonsHTML = `
      <button class="ghost" onclick="hideOnlineError()">Dismiss</button>
    `;
  }

  container.innerHTML = `
    <div class="panel spotlight" style="border-color: var(--blood-bright); border-width: 2px; margin: 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span class="sc" style="color: var(--blood-bright); letter-spacing: .15em; font-size: 0.95rem;">${esc(title)}</span>
          <p style="margin-top: 6px; color: var(--paper); font-size: 1rem;">${esc(cause)}</p>
          <p style="margin-top: 8px; color: var(--gold); font-size: 0.85rem;"><strong>Next Action:</strong> ${esc(nextAction)}</p>
        </div>
        <button class="ghost" onclick="hideOnlineError()" style="border: none; background: none; box-shadow: none; padding: 0; color: var(--gold-soft); cursor: pointer; font-size: 1.4rem; line-height: 1;" aria-label="Dismiss error">✕</button>
      </div>
      <div class="btnrow" style="margin-top: 14px;">
        ${buttonsHTML}
      </div>
    </div>
  `;

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
  subscribeMyPrivate(code, getUid(), priv => { myPrivate = priv; });
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
      p.hand = myPrivate.hand || [];
      p.secrets = myPrivate.secrets || [];
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
  if (firebaseVerificationStatus === 'ready') {
    renderOnlineEntryForm();
    show('scr-online-entry');
  } else if (firebaseVerificationStatus === 'verifying') {
    renderOnlineVerificationLoading();
    show('scr-online-entry');
  } else if (firebaseVerificationStatus === 'failed') {
    renderOnlineVerificationFailed(firebaseVerificationError);
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
function enterRoom(code){
  State.onlineRoomCode = code;
  try { history.replaceState(null, '', '?room='+code); } catch(e){}
  myPrivate = {hand:[], secrets:[]};
  resetDraft();
  lastClaimAttempt = -1;
  subscribeMyPrivate(code, getUid(), priv => { myPrivate = priv; });
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

/* ---------------- router ---------------- */
export function routeAndRender(room){
  State.G = room;
  preserveDraftFor(room);
  reactToRoom(room);
  if(room.phase==='lobby'){ renderOnlineLobby(room); show('scr-online-lobby'); return; }
  if(room.phase==='finished' || room.act>3){ renderChronicle(false); show('scr-chronicle'); return; }
  if(room.phase==='herosetup'){ renderOnlineArchSetup(room); show('scr-archsetup'); return; }
  if(room.phase==='threat'){ renderOnlineVictim(room); show('scr-victim'); return; }
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

/* ---------------- lobby ---------------- */
function renderOnlineLobby(room){
  const uid = getUid();
  const isHost = uid===room.hostUid;
  const seatCount = room.players.length;
  const emptySeats = Math.max(0, 6-seatCount);
  $('scr-online-lobby').innerHTML = `
    <h2 class="center">The Team Gathers</h2>
    <div class="ornament">❦</div>
    <div class="panel" style="max-width:640px;margin:0 auto">
      <p class="small" style="color:var(--gold)">${esc(room.case.title)}</p>
      <p class="small muted">${esc(room.case.epigraph)}</p>
      <p class="small" style="color:var(--gold)">Visual language: ${esc(ART_STYLES.find(style=>style.id===normalizeArtStyle(room.artStyle))?.label || 'Noir Comic')}</p>
      <p class="center" style="margin:14px 0">
        <span class="sc" style="color:var(--gold);font-size:.85rem;letter-spacing:.15em">ROOM CODE</span><br>
        <span style="font-size:2.2rem;letter-spacing:.3em;color:#eddfba">${esc(State.onlineRoomCode)}</span>
      </p>
      <p class="center"><button class="ghost" id="btn-copy-link" onclick="onlineCopyRoomLink()">Copy invite link</button></p>
      <p class="small muted center">Share the code or link — everyone else joins from “Play Online.”</p>
      <h3 style="color:var(--gold);margin-top:18px">Seated (${seatCount} of 6)</h3>
      <div class="btnrow">
        ${room.players.map((p,i)=>`<span class="pill">${i===0?'👑 ':''}${esc(p.name)}${p.uid===uid?' (you)':''}</span>`).join('')}
        ${Array.from({length:emptySeats}).map(()=>`<span class="pill" style="opacity:.4">empty seat</span>`).join('')}
      </div>
      <div class="btnrow" style="margin-top:18px;justify-content:center">
        ${isHost
          ? `<button class="primary" onclick="onlineBeginTale(this)">Open the Case</button>`
          : `<span class="pill">Waiting for the host to begin…</span>`}
        <button class="ghost" onclick="leaveOnlineRoom(this)">Leave</button>
      </div>
    </div>`;
}
export async function onlineCopyRoomLink(){
  const url = location.origin + location.pathname + '?room=' + State.onlineRoomCode;
  const btn = $('btn-copy-link');
  try {
    await navigator.clipboard.writeText(url);
    if(btn){ const orig = btn.textContent; btn.textContent = 'Copied!'; setTimeout(()=>{ if(btn.isConnected) btn.textContent = orig; }, 1800); }
  } catch(err) {
    fail(new Error('Could not copy automatically — the link is: ' + url));
  }
}
export async function onlineBeginTale(btn){
  try{ await withPendingState(btn, "Opening Case...", () => liveBeginTale(State.onlineRoomCode)); } catch(err){ fail(err); }
}

/* ---------------- hero setup ---------------- */
function renderOnlineArchSetup(room){
  const i = room.archIdx, a = room.heroes[i];
  const answerer = room.players[i % room.players.length];
  const isMe = mySeatIndex(room) === (i % room.players.length);
  const showForm = isMe || draft.answeringForAbsent;
  $('scr-archsetup').innerHTML = `
    <p class="center muted sc" style="letter-spacing:.2em">PROFILING THE THREAT</p>
    ${progressDotsHTML(i, HEROES_PER_GAME, `Question ${ROMAN[i+1]} of VI`)}
    <div class="ornament">❦</div>
    <div style="max-width:640px;margin:0 auto">
      <div class="card">
        <div class="c-kicker">Hero</div>
        <div class="c-title" style="font-size:1.5rem">${a.role}</div>
        <div class="c-prompt">${a.flavor}</div>
        <hr class="rule" style="border-color:rgba(60,45,25,.3)">
        <div style="font-size:1.05rem">“${a.setup[room.case.id]}”</div>
        <div class="small" style="margin-top:8px;color:var(--blood)">${toneBadge(a.sides[0].tone)} <span style="color:var(--ink-soft)">— ${esc(a.sides[0].cond)} flip this card.</span></div>
      </div>
      <div class="panel">
        ${showForm ? `
          <p class="small muted">${isMe ? 'Answer in character, or plainly. The answer becomes a fact about the Threat and about this Hero.' : `Answering on behalf of ${esc(answerer.name)}, since they’re away.`}</p>
          <label class="fld" for="arch-name">Name this Hero</label>
          <input type="text" id="arch-name" placeholder="e.g. The Nightwatch">
          <label class="fld" for="arch-answer">The answer</label>
          <textarea id="arch-answer" placeholder="What is established…"></textarea>
          <div class="btnrow"><button class="primary" onclick="onlineSaveArchSetup(this)">${i<5?'Next Question':'To the Threat'}</button></div>
        ` : `
          <p class="small muted center">Waiting on ${esc(answerer.name)} to answer…</p>
          <p class="center"><button class="ghost" onclick="onlineAnswerForAbsent()">Answer for them, if they’re away</button></p>
        `}
      </div>
    </div>`;
}
export function onlineAnswerForAbsent(){ draft.answeringForAbsent = true; renderOnlineArchSetup(State.G); }
export async function onlineSaveArchSetup(btn){
  try{
    const name = $('arch-name').value, answer = $('arch-answer').value;
    await withPendingState(btn, "Saving...", () => liveSaveHeroSetup(State.onlineRoomCode, name, answer));
  } catch(err){ fail(err); }
}

/* ---------------- the threat ---------------- */
function renderOnlineVictim(room){
  $('scr-victim').innerHTML = `
    <h2 class="center">The Threat</h2>
    <p class="center muted" style="max-width:640px;margin:6px auto">${room.case.threatLine}</p>
    <div class="ornament">❦</div>
    <div style="max-width:680px;margin:0 auto">
      <div class="panel tight">
        ${room.threat.facts.map(f=>`<p class="small" style="margin:6px 0"><span style="color:var(--gold)">${esc(f.role)}:</span> <span>${esc(f.a)}</span></p>`).join('')}
      </div>
      <div class="panel">
        <label class="fld" for="victim-name">Together, name the Threat</label>
        <input type="text" id="victim-name" placeholder="This is usually the hardest part.">
        <div class="btnrow"><button class="primary" onclick="onlineFinishVictim(this)">Deal the Cards</button></div>
      </div>
    </div>`;
}
export async function onlineFinishVictim(btn){
  try{ await withPendingState(btn, "Dealing Cards...", () => liveFinishThreat(State.onlineRoomCode, $('victim-name').value)); } catch(err){ fail(err); }
}

/* ---------------- hub ---------------- */
function onlineTurnSeatHTML(room,p,i,mySeat){
  const isMe = i===mySeat;
  const noWayToLead = p.handCount===0 && (p.signals.length===0 || room.sceneDeck.length===0);
  const needsTrade = p.handCount===0 && !noWayToLead;
  const state = p.scenesLeft<=0 ? 'done' : noWayToLead ? 'blocked' : needsTrade ? 'trade' : 'ready';
  const label = state==='done' ? 'Finished this act' : state==='blocked' ? 'No card to lead' : state==='trade' ? 'Trade first' : isMe ? 'You are ready' : 'Ready to lead';
  return `<div class="turn-seat ${state}${isMe?' mine':''}">
    <div class="turn-seat-head"><strong>${esc(p.name)}${isMe?' · you':''}</strong><span>${label}</span></div>
    <p>${p.scenesLeft} scene${p.scenesLeft===1?'':'s'} left to lead · ${p.handCount} scene card${p.handCount===1?'':'s'} · ${p.signals.length} held Signal${p.signals.length===1?'':'s'}</p>
    <div class="turn-seat-actions">
      ${state==='ready' && isMe?'<button class="primary" onclick="onlineStartScene()">Begin a scene</button>':''}
      ${state==='blocked' && p.scenesLeft>0?`<button class="blood" onclick="onlineForfeitScene(${i}, this)">${isMe?'Forfeit my scene':`Forfeit for ${esc(p.name)}`}</button>`:''}
      ${isMe?`<button class="ghost" onclick="openOnlineHand()">View my cards (${myPrivate.hand.length+p.signals.length})</button>`:''}
    </div>
  </div>`;
}

function onlineMyHandHTML(room,mySeat){
  const me = room.players[mySeat];
  if(!me) return '';
  return `<details class="disclose personal-hand" id="online-my-hand">
    <summary>My Hand <span class="small muted">${myPrivate.hand.length} scene card${myPrivate.hand.length===1?'':'s'} · ${me.signals.length} Signal${me.signals.length===1?'':'s'} · private to this screen</span></summary>
    <div class="disclose-body">
      <p class="hand-section-label">Scene cards · ${myPrivate.hand.length}</p>
      <div class="cardgrid hand-cardgrid">${myPrivate.hand.map(c=>sceneCardHTML(c)).join('') || '<span class="small muted">No scene cards in hand.</span>'}</div>
      ${me.signals.length?`<p class="hand-section-label">Held Signals · ${me.signals.length}</p><div class="cardgrid hand-cardgrid">${me.signals.map((o,oi)=>`
        <div class="held-card">${signalCard(o)}${room.sceneDeck.length?`<button class="ghost" onclick="onlineTradeOmen(${oi}, this)">Trade for a scene card</button>`:''}</div>`).join('')}</div>`:''}
      ${myPrivate.secrets.map(s=>`<details class="secretbox"><summary>Buried Secret ${s.used?'— revealed':'(yours alone to read)'}</summary>
        <div class="small" style="margin-top:6px">${s.combo.map(toneBadge).join(' ')}<br><span style="color:#c9b3de">${esc(s.q)}</span>
        ${s.used?'':'<br><span class="muted">Unlocks when a scene’s tones contain this combination.</span>'}</div></details>`).join('')}
    </div>
  </details>`;
}

function renderOnlineHub(room){
  const mySeat = mySeatIndex(room);
  const me = room.players[mySeat];
  const close = room.actClose[room.act];
  const remaining = room.players.reduce((s,p)=>s+p.scenesLeft,0);
  const banner = room.pendingSecret ? `<div class="notice">A Buried Secret is being revealed at the table right now…</div>` : '';
  const iCanLead = me && me.scenesLeft>0 && me.handCount>0;
  $('scr-hub').innerHTML = `
    <h2 class="center" style="margin-top:8px">${ACT_NAMES[room.act]}</h2>
    <p class="center muted">${esc(room.case.title)} · The Threat: ${esc(room.threat.name)}</p>
    ${actTrackHTML(room.act)}
    <div class="ornament">✦ ❦ ✦</div>
    ${banner}
    <div class="panel spotlight turn-board">
      <div class="turn-board-head">
        <div><span class="turn-kicker">Who acts now?</span><h3>${iCanLead?'You may begin the next scene':'Any ready storyteller may begin'}</h3></div>
        <span class="pill">${remaining} scene${remaining===1?'':'s'} before the close</span>
      </div>
      <p class="turn-guidance">There is no fixed turn order. A storyteller marked ready may begin; once the scene opens, everyone else gets one chance to buy in.</p>
      <div class="turn-seats">${room.players.map((p,i)=>onlineTurnSeatHTML(room,p,i,mySeat)).join('')}</div>
    </div>
    ${onlineMyHandHTML(room,mySeat)}
    ${room.journal.length ? `<h3 style="color:var(--gold)">Last Scene</h3>${journalEntrySummaryHTML(room.journal[room.journal.length-1], {compact:true})}` : ''}
    <div class="panel tight">
      <h3 style="color:var(--blood-bright)">The Act Close — foreseen</h3>
      <p><span class="sc" style="color:#eddfba">${esc(close.title)}.</span> <span class="muted small">${esc(close.cond)}</span></p>
      <p class="small" style="color:#cfc2a2">${esc(close.prompt)}</p>
      <p class="small muted">${TONES.map(t=>`${toneBadge(t)} <span>${esc(close.elements[t])}</span>`).join('<br>')}</p>
    </div>
    <details class="disclose" open>
      <summary>The Heroes <span class="small muted">(${room.heroes.length})</span></summary>
      <div class="disclose-body">
        <div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:8px">
          ${room.heroes.map(a=>heroCard(a)).join('')}
        </div>
      </div>
    </details>
    <details class="disclose" open>
      <summary>The Signal Row <span class="small muted">(${room.signalRow.length})</span></summary>
      <div class="disclose-body">
        <div class="cardgrid compact">${room.signalRow.map(o=>signalCard(o)).join('')}</div>
      </div>
    </details>
    <details class="disclose">
      <summary>The Storytellers <span class="small muted">${room.players.length} in play · Scene deck ${room.sceneDeck.length} · Signal deck ${room.signalDeck.length}</span></summary>
      <div class="disclose-body">
        <div class="pgrid" style="margin-top:8px">
          ${room.players.map((p,i)=>onlinePlayerPanel(p,i===mySeat)).join('')}
        </div>
      </div>
    </details>`;
}
function onlinePlayerPanel(p, isMe){
  // This public roster shows counts and publicly held Signals only. The
  // seated player's real hand and Buried Secrets live in My Hand above.
  const handHTML = `<span class="small muted"><span>${p.handCount} scene card${p.handCount===1?'':'s'} in hand.${isMe?' Use “My Hand” above to read yours.':''}</span></span>`;
  const secretsHTML = !isMe && p.secretsCount ? `<p class="small muted">${p.unrevealedSecretsCount} unrevealed Buried Secret${p.unrevealedSecretsCount===1?'':'s'}.</p>` : '';
  return `<div class="ppanel">
    <h4>${esc(p.name)}${isMe?' (you)':''}</h4>
    <div class="handrow">${handHTML}</div>
    ${p.signals.length?`<div class="handrow">${p.signals.map(o=>`
      <div class="minicard signal"><div class="mc-t">${o.glyph} ${esc(o.title)}</div></div>`).join('')}</div>`:''}
    ${secretsHTML}
  </div>`;
}
export function openOnlineHand(){
  const hand = $('online-my-hand');
  if(!hand) return;
  hand.open = true;
  hand.classList.remove('hand-focus');
  requestAnimationFrame(()=>{
    hand.classList.add('hand-focus');
    hand.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>hand.classList.remove('hand-focus'),1400);
  });
}
export function onlineStartScene(){
  draft = {cardIdx:null, archIdx:null};
  renderOnlineScenePick();
  show('scr-scene');
}
export async function onlineTradeOmen(signalIdx, btn){
  try{ await withPendingState(btn, "Trading...", () => liveTradeSignal(State.onlineRoomCode, signalIdx)); } catch(err){ fail(err); }
}
export async function onlineForfeitScene(seat, btn){
  try{ await withPendingState(btn, "Forfeiting...", () => liveForfeitScene(State.onlineRoomCode, seat)); } catch(err){ fail(err); }
}

/* ---------------- act close intro ---------------- */
function renderOnlineCloseIntro(room){
  const close = room.actClose[room.act];
  const counts = actToneCounts();
  const max = Math.max(...TONES.map(t=>counts[t]));
  const tied = TONES.filter(t=>counts[t]===max);
  const chosenTone = tied[0];
  $('scr-close').innerHTML = `
    <h2 class="center" style="color:var(--blood-bright)">${ACT_NAMES[room.act]} draws to a close</h2>
    ${actTrackHTML(room.act)}
    <div class="ornament">✦</div>
    <div style="max-width:720px;margin:0 auto">
      <div class="card">
        <div class="c-kicker">Act Close</div>
        <div class="c-title" style="font-size:1.4rem">${esc(close.title)}</div>
        <div class="c-prompt">${esc(close.prompt)}</div>
      </div>
      <div class="panel spotlight">
        <p class="small" style="color:var(--gold)">${esc(close.cond)}</p>
        <p class="small muted">Tones this act: ${TONES.map(t=>`<span class="tone count ${t}">${counts[t]}</span>`).join(' ')}</p>
        ${tied.length===1
          ? `<p><strong style="color:var(--blood-bright)">Dominant tone: ${toneBadge(tied[0])}</strong> — must <span>${esc(close.elements[tied[0]])}</span></p>`
          : `<label class="fld" for="close-el">The tones are tied — choose the element</label>
             <select id="close-el">${tied.map(t=>`<option value="${t}">${t} — ${esc(close.elements[t])}</option>`).join('')}</select>`}
        <label class="fld" for="close-starter">Who begins the close?</label>
        <select id="close-starter">${room.players.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('')}</select>
        <label class="fld" for="close-arch">Which Hero leads it?</label>
        <select id="close-arch">${room.heroes.map((a,i)=>`<option value="${i}">${esc(a.name||a.role)} — ${esc(a.role)}</option>`).join('')}</select>
        <label class="fld" for="close-opening">What the camera sees as the close opens</label>
        <textarea id="close-opening" placeholder="The camera rises above Millhaven…"></textarea>
        <div class="btnrow"><button class="primary" onclick="onlineBeginClose(this)">Play the Act Close</button></div>
      </div>
    </div>`;
  draft.closeTone = chosenTone;
}
export async function onlineBeginClose(btn){
  try{
    const room = State.G;
    const close = room.actClose[room.act];
    const elHidden = $('close-el');
    const tone = elHidden ? elHidden.value : draft.closeTone;
    await withPendingState(btn, "Starting Act Close...", () => liveBeginClose(State.onlineRoomCode, +$('close-arch').value, +$('close-starter').value,
      close.elements[tone], $('close-opening').value, close.title, close.prompt));
  } catch(err){ fail(err); }
}

/* ---------------- scene: pick ---------------- */
function renderOnlineScenePick(){
  const room = State.G;
  const primerHTML = !hasSeenIntro() ? `
    <div class="panel spotlight">
      <h3 style="color:var(--gold)">Before your first scene</h3>
      ${sceneAnatomyDiagramHTML()}
      <div class="btnrow"><button class="primary" onclick="onlineDismissScenePrimer()">Got it — begin</button></div>
    </div>` : '';
  $('scr-scene').innerHTML = `
    ${primerHTML}
    <h2 class="center">You begin a scene</h2>
    <div class="ornament">❦</div>
    <h3 style="color:var(--gold)">Choose a scene card from your hand</h3>
    <div class="cardgrid">${myPrivate.hand.map((sc,i)=>sceneCardHTML(sc,'onlinePickSceneCard',i)).join('')}</div>
    <h3 style="color:var(--gold)">Choose the lead Hero</h3>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:8px">
      ${room.heroes.map((a,i)=>heroCard(a,'onlinePickArch',i)).join('')}
    </div>
    <div class="panel">
      <label class="fld" for="scene-opening">What the camera sees as the scene opens</label>
      <textarea id="scene-opening" placeholder="The camera drifts through…"></textarea>
      <div class="btnrow">
        <button class="primary" id="btn-begin" disabled onclick="onlineBeginScene(this)">Begin the Scene</button>
        <button class="ghost" onclick="routeAndRenderCurrent()">Back to the Table</button>
      </div>
    </div>`;
}
export function onlineDismissScenePrimer(){ markIntroSeen(); renderOnlineScenePick(); }
export function onlinePickSceneCard(i){
  draft.cardIdx = i;
  document.querySelectorAll('[id^="scene-pick-"]').forEach(el=>el.classList.remove('selected'));
  $('scene-pick-'+i).classList.add('selected');
  onlineCheckBegin();
}
export function onlinePickArch(i){
  draft.archIdx = i;
  document.querySelectorAll('[id^="arch-pick-"]').forEach(el=>el.classList.remove('selected'));
  $('arch-pick-'+i).classList.add('selected');
  onlineCheckBegin();
}
function onlineCheckBegin(){
  $('btn-begin').disabled = !(draft.cardIdx!=null && draft.archIdx!=null);
}
export async function onlineBeginScene(btn){
  try{ await withPendingState(btn, "Beginning Scene...", () => liveBeginScene(State.onlineRoomCode, draft.cardIdx, draft.archIdx, $('scene-opening').value)); }
  catch(err){ fail(err); }
}
export function routeAndRenderCurrent(){
  // "Back to the Table" before a scene is actually begun — nothing was
  // committed, so just re-render off the last known room state.
  if(State.G) { resetDraft(); const remaining = State.G.players.reduce((s,p)=>s+p.scenesLeft,0);
    if(remaining<=0 && !State.G.closeDone && !State.G.current){ renderOnlineCloseIntro(State.G); show('scr-close'); }
    else { renderOnlineHub(State.G); show('scr-hub'); } }
}

/* ---------------- scene: play ---------------- */
function renderOnlineScene(room){
  const c = room.current, p = room.players[c.starter];
  const mySeat = mySeatIndex(room);
  const iAmStarter = mySeat===c.starter;
  const iAlreadyContributed = c.contributions.some(x=>x.pi===mySeat);

  let addingHTML = '';
  if(!iAmStarter && !iAlreadyContributed && c.contributions.length < maxContrib()){
    if(!draft.adding){
      addingHTML = `<div class="btnrow"><button class="ghost" onclick="onlineStartContrib()">Play a card into this scene</button></div>`;
    } else if(!draft.adding.pick){
      addingHTML = `
        <p class="small" style="color:var(--gold)">Choose a scene card from your hand, or a signal from the row:</p>
        ${myPrivate.hand.length?`<div class="cardgrid">${myPrivate.hand.map((sc,i)=>sceneCardHTML(sc,'onlinePickContribScene',i)).join('')}</div>`:''}
        ${room.signalRow.length?`<div class="cardgrid compact">${room.signalRow.map((o,i)=>signalCard(o,'onlinePickContribOmen',i)).join('')}</div>`:''}
        <button class="ghost" onclick="onlineCancelContrib()">Never mind</button>`;
    } else {
      const pk = draft.adding.pick;
      const card = pk.kind==='scene' ? myPrivate.hand[pk.idx] : room.signalRow[pk.idx];
      addingHTML = `
        <div style="max-width:280px">${pk.kind==='scene'?sceneCardHTML(card):signalCard(card)}</div>
        <label class="fld" for="contrib-how">How does it manifest in the scene?</label>
        <textarea id="contrib-how" oninput="onlineSetContribHow(this.value)">${esc(draft.adding.how||'')}</textarea>
        <div class="btnrow">
          <button class="primary" onclick="onlineConfirmContrib(this)">Play It</button>
          <button class="ghost" onclick="onlineCancelContrib()">Never mind</button>
        </div>`;
    }
  }

  const endSceneHTML = iAmStarter ? (!draft.resolving ? `
    <div class="panel spotlight">
      <label class="fld" for="scene-happened">The record of what happens</label>
      <p class="small muted" style="margin-bottom:6px">Play the scene aloud. Note what the Dossier should remember: who appeared, what was said, and what was discovered.</p>
      <textarea id="scene-happened" style="min-height:130px" oninput="onlineSetSceneHappened(this.value)" placeholder="What the Dossier will remember of this scene…">${esc(draft.happened||'')}</textarea>
      <div class="btnrow"><button class="blood" onclick="onlineEndScene()">The scene ends</button></div>
    </div>` : renderOnlineResolveInline(room)) : '';

  $('scr-scene').innerHTML = `
    ${sceneTrackerHTML(room,{viewerSeat:mySeat,phase:draft.resolving?'resolve':'play',happened:draft.happened})}
    ${addingHTML?`<div class="panel scene-action-panel${draft.adding?' spotlight':''}">
      <div class="scene-action-head">
        <div><span class="sc">Add to the scene</span><p>You may buy in once; the scene holds three cards at most.</p></div>
        <span class="pill">${1+c.contributions.length} of 3 filled</span>
      </div>
      ${addingHTML}
    </div>`:''}
    ${endSceneHTML || (iAmStarter?'':'<p class="small muted center">Waiting for '+esc(p.name)+' to end the scene…</p>')}`;
}
function renderOnlineSceneRefresh(){ renderOnlineScene(State.G); }
export function onlineStartContrib(){ draft.adding = {pick:null, how:''}; renderOnlineSceneRefresh(); }
export function onlinePickContribScene(i){ draft.adding.pick={kind:'scene', idx:i}; renderOnlineSceneRefresh(); }
export function onlinePickContribOmen(i){ draft.adding.pick={kind:'omen', idx:i}; renderOnlineSceneRefresh(); }
export function onlineCancelContrib(){ draft.adding = null; renderOnlineSceneRefresh(); }
export function onlineSetContribHow(v){ if(draft.adding) draft.adding.how = v; }
export function onlineSetSceneHappened(v){ draft.happened = v; }
export function onlineSetSecretAnswer(v){ draft.secretAnswer = v; }
export async function onlineConfirmContrib(btn){
  try{
    const {kind, idx, how} = draft.adding.pick.kind==='scene'
      ? {kind:'scene', idx:draft.adding.pick.idx, how:draft.adding.how}
      : {kind:'omen', idx:draft.adding.pick.idx, how:draft.adding.how};
    await withPendingState(btn, "Playing...", async () => {
      await liveContribute(State.onlineRoomCode, kind, idx, how);
      draft.adding = null;
    });
  } catch(err){ fail(err); }
}
export function onlineEndScene(){
  draft.resolving = true;
  renderOnlineSceneRefresh();
}
function renderOnlineResolveInline(room){
  const c = room.current;
  return `
    <div class="panel spotlight">
      <h3 style="color:var(--gold)">Consult each Hero’s face-up condition</h3>
      <p class="small muted">If it was met in this scene, check it to turn the card.</p>
      ${room.heroes.map((a,i)=>{
        const s = faceUp(a);
        return `<div class="panel tight" style="display:flex;gap:12px;align-items:flex-start">
          <input type="checkbox" id="online-flip-${i}" style="width:auto;margin-top:6px;transform:scale(1.3)">
          <label for="online-flip-${i}" style="cursor:pointer">
            <span class="sc" style="color:#eddfba">${esc(a.name||a.role)}</span>
            ${i===c.archIdx?'<span class="pill" style="border-color:var(--blood-bright);color:#e8c9c9">led this scene</span>':''}
            <br><span class="small" style="color:#b3a687">${esc(s.cond)}</span> ${toneBadge(s.tone)}
          </label>
        </div>`;
      }).join('')}
      <div class="btnrow"><button class="primary" onclick="onlineApplyResolve(this)">Count the Tones</button></div>
    </div>`;
}
export async function onlineApplyResolve(btn){
  try{
    const room = State.G;
    const flips = [];
    room.heroes.forEach((a,i)=>{ if($('online-flip-'+i).checked) flips.push(i); });
    await withPendingState(btn, "Counting Tones...", async () => {
      await liveEndSceneAndResolve(State.onlineRoomCode, draft.happened, flips);
      draft.resolving = false; draft.happened = '';
    });
  } catch(err){ fail(err); }
}

/* ---------------- secret reveal ---------------- */
function renderOnlineSecret(room){
  const u = room.pendingSecret;
  const p = room.players[u.pi]; // this screen only ever renders for its own owner (gated in routeAndRender)
  const secret = myPrivate.secrets[u.secretIndex];
  const sel = draft.secretSel || (draft.secretSel = []);
  $('scr-secret').innerHTML = `
    <div class="center" style="margin-top:20px">
      <h2 style="color:#c9b3de;margin-top:6px">A Buried Secret Comes to Light</h2>
      <p class="muted">${esc(p.name)}’s secret is unlocked.</p>
    </div>
    <div class="ornament" style="color:#8a63a8">✧</div>
    <div style="max-width:720px;margin:0 auto">
      <div class="secretbox" style="padding:16px">
        <div>${secret.combo.map(toneBadge).join(' ')}</div>
        <p style="font-size:1.15rem;color:#e0d4ec;margin-top:8px">“${esc(secret.q)}”</p>
      </div>
      <h3 style="color:#c9b3de;margin-top:16px">Choose three signals <span class="small">(${sel.length} of ${Math.min(3,room.signalRow.length)})</span></h3>
      <div class="cardgrid compact">${room.signalRow.map((o,i)=>signalCard(o,'onlineToggleSecretOmen',i)).join('')}</div>
      <div class="panel spotlight">
        <label class="fld" style="color:#c9b3de" for="secret-answer">The vignette</label>
        <textarea id="secret-answer" style="min-height:120px" oninput="onlineSetSecretAnswer(this.value)">${esc(draft.secretAnswer||'')}</textarea>
        <div class="btnrow"><button class="primary" ${sel.length!==Math.min(3,room.signalRow.length)?'disabled':''} onclick="onlineConfirmSecret(this)">So It Is Revealed</button></div>
      </div>
    </div>`;
  document.querySelectorAll('[id^="omen-pick-"]').forEach((el,idx)=>el.classList.toggle('selected', sel.includes(idx)));
}
export function onlineToggleSecretOmen(i){
  const room = State.G, need = Math.min(3, room.signalRow.length);
  const sel = draft.secretSel || (draft.secretSel=[]);
  const at = sel.indexOf(i);
  if(at>=0) sel.splice(at,1); else if(sel.length<need) sel.push(i);
  renderOnlineSecret(room);
}
export async function onlineConfirmSecret(btn){
  try{ await withPendingState(btn, "Revealing...", () => liveConfirmSecret(State.onlineRoomCode, draft.secretSel||[], draft.secretAnswer||'')); draft={}; }
  catch(err){ fail(err); }
}
