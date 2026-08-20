/* Entry point. Wires the handful of functions referenced by inline
   onclick/oninput/onchange attributes in index.html onto window — ES
   modules are not global scope, so this is the one place that bridges
   the two. Everything else stays module-scoped. */
import { show, closeOverlay, initHistoryNav, applyFirstrunVisibility, dismissFirstrunHint } from './ui/screens.js';
import { flipHeroCard } from './ui/cards.js';
import { openCardDetail, closeCardDetail } from './ui/cardModal.js';
import { showIdleClicker, idleClick } from './ui/idle.js';
import { showGallery, setGalleryStyle, setGalleryCat, openGalleryDetail,
         closeGalleryDetail, navigateGallery, galleryImgError, flipGalleryCard } from './ui/gallery.js';
import { gameArtImgError } from './ui/art.js';
import { renderHooks, chooseCase, renderPlayerInputs, confirmPlayers,
         beginArchSetup, renderArchSetup, saveArchSetup, renderVictim, finishVictim } from './ui/setup.js';
import { renderHub, renderCloseIntro, openLocalHand, tradeSignal, forfeitScene, beginClose, setReadyRole, voteOmenReplacement } from './ui/hub.js';
import { startSceneFor, renderScenePick, renderScenePlay, pickSceneCard, pickArch, beginScene, pickContrib,
         pickContribScene, pickContribOmen, confirmContrib, cancelContrib,
         setContribHow, setSceneHappened, dismissScenePrimer, setSceneOpening } from './ui/scene.js';
import { endScene, renderResolve, renderSecretUnlock, applyResolve, toggleSecretOmen, confirmSecret, toggleResolveFlip, setSecretAnswer } from './ui/resolve.js';
import { viewChronicle, returnFromChronicle, toggleStrike, showRules,
         returnFromRules, initOverlayDismiss, renderChronicle } from './ui/renderChronicle.js';
import { copyChronicle, downloadChronicle } from './chronicle/markdown.js';
import { bleakifyField } from './ai/bleakify.js';
import { State } from './engine/state.js';
import { clearSavedGame, hasSavedGame, readSave, saveGame, exportSaveJSON, importSaveJSON } from './engine/persistence.js';
import { firebaseConfigured } from './sync/config.js';

const ONLINE_LOAD_TIMEOUT_MS = 10000;
let onlineModulePromise = null;

function withPendingState(btn, pendingText, actionFn){
  if(!btn) return Promise.resolve().then(actionFn);
  if(btn.disabled) return Promise.resolve();
  const originalText = btn.textContent || btn.value;
  btn.disabled = true;
  btn.textContent = pendingText;
  return Promise.resolve().then(actionFn).finally(() => {
    btn.disabled = false;
    btn.textContent = originalText;
  });
}

function loadOnlineModule(){
  if(!onlineModulePromise){
    const moduleLoad = import('./ui/online.js');
    const timeout = new Promise((_, reject) => setTimeout(
      () => reject(new Error('The online multiplayer module could not load. Check your network and try again.')),
      ONLINE_LOAD_TIMEOUT_MS
    ));
    onlineModulePromise = Promise.race([moduleLoad, timeout]).catch(error => {
      onlineModulePromise = null;
      throw error;
    });
  }
  return onlineModulePromise;
}

function renderOnlineUnavailable(error){
  const message = error?.message || 'The online multiplayer module could not load.';
  const entry = document.getElementById('scr-online-entry');
  if(!entry) return;
  entry.innerHTML = `<div class="panel" style="max-width:680px;margin:36px auto;text-align:center">
    <div class="sc" style="color:var(--blood-bright);letter-spacing:.22em">SWITCHBOARD OFFLINE</div>
    <h2 style="margin-top:10px">Connection Failed</h2>
    <div class="panel tight" style="text-align:left;margin:20px auto;max-width:540px">
      <p class="small"><strong>Details:</strong> ${String(message).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
      <p class="small muted">The remote table could not load. Hotseat play is ready and does not require Firebase.</p>
    </div>
    <div class="btnrow" style="justify-content:center;margin-top:22px">
      <button class="primary" onclick="showOnlineEntry()">Retry Connection</button>
      <button class="primary" onclick="show('scr-hook')">Play Hotseat (Open the Case)</button>
      <button class="ghost" onclick="show('scr-title')">Back</button>
    </div>
  </div>`;
  show('scr-online-entry');
}

async function callOnline(name, args){
  try {
    const online = await loadOnlineModule();
    return online[name](...args);
  } catch(error) {
    renderOnlineUnavailable(error);
  }
}

function onlineBridge(name){
  return (...args) => callOnline(name, args);
}

const showOnlineEntry = onlineBridge('showOnlineEntry');
const onlineCreateRoom = onlineBridge('onlineCreateRoom');
const onlineJoinRoom = onlineBridge('onlineJoinRoom');
const leaveOnlineRoom = onlineBridge('leaveOnlineRoom');
const tryAutoRejoin = onlineBridge('tryAutoRejoin');
const onlineRefreshArtPicker = onlineBridge('onlineRefreshArtPicker');
const onlineBeginTale = onlineBridge('onlineBeginTale');
const onlineSaveArchSetup = onlineBridge('onlineSaveArchSetup');
const onlineFinishVictim = onlineBridge('onlineFinishVictim');
const onlineStartScene = onlineBridge('onlineStartScene');
const onlineTradeOmen = onlineBridge('onlineTradeOmen');
const onlineForfeitScene = onlineBridge('onlineForfeitScene');
const onlineBeginClose = onlineBridge('onlineBeginClose');
const onlineSetReadyRole = onlineBridge('onlineSetReadyRole');
const onlineVoteOmenReplacement = onlineBridge('onlineVoteOmenReplacement');
const onlinePickSceneCard = onlineBridge('onlinePickSceneCard');
const onlinePickArch = onlineBridge('onlinePickArch');
const onlineBeginScene = onlineBridge('onlineBeginScene');
const routeAndRenderCurrent = onlineBridge('routeAndRenderCurrent');
const onlineStartContrib = onlineBridge('onlineStartContrib');
const onlinePickContribScene = onlineBridge('onlinePickContribScene');
const onlinePickContribOmen = onlineBridge('onlinePickContribOmen');
const onlineCancelContrib = onlineBridge('onlineCancelContrib');
const onlineSetContribHow = onlineBridge('onlineSetContribHow');
const onlineSetSceneHappened = onlineBridge('onlineSetSceneHappened');
const onlineSetSecretAnswer = onlineBridge('onlineSetSecretAnswer');
const onlineConfirmContrib = onlineBridge('onlineConfirmContrib');
const onlineEndScene = onlineBridge('onlineEndScene');
const onlineApplyResolve = onlineBridge('onlineApplyResolve');
const onlineToggleSecretOmen = onlineBridge('onlineToggleSecretOmen');
const onlineConfirmSecret = onlineBridge('onlineConfirmSecret');
const onlineAnswerForAbsent = onlineBridge('onlineAnswerForAbsent');
const onlineCopyRoomLink = onlineBridge('onlineCopyRoomLink');
const onlineDismissScenePrimer = onlineBridge('onlineDismissScenePrimer');
const openOnlineHand = onlineBridge('openOnlineHand');
const showOnlineError = onlineBridge('showOnlineError');
const hideOnlineError = onlineBridge('hideOnlineError');
const onlineRetryConnection = onlineBridge('onlineRetryConnection');
const onlineFallbackToHotseat = onlineBridge('onlineFallbackToHotseat');
const onlineVerifyAndProceed = onlineBridge('onlineVerifyAndProceed');

Object.assign(window, {
  State,
  show, flipHeroCard, openCardDetail, closeCardDetail, showIdleClicker, idleClick, dismissFirstrunHint,
  showGallery, setGalleryStyle, setGalleryCat, openGalleryDetail, closeGalleryDetail, navigateGallery, galleryImgError, flipGalleryCard, gameArtImgError,
  chooseCase, renderPlayerInputs, confirmPlayers, beginArchSetup, renderArchSetup, saveArchSetup, renderVictim, finishVictim,
  renderHub, openLocalHand, tradeSignal, forfeitScene, beginClose, setReadyRole, voteOmenReplacement,
  startSceneFor, renderScenePick, renderScenePlay, pickSceneCard, pickArch, beginScene, pickContrib, pickContribScene, pickContribOmen,
  confirmContrib, cancelContrib, setContribHow, setSceneHappened, dismissScenePrimer, setSceneOpening,
  endScene, renderResolve, renderSecretUnlock, applyResolve, toggleSecretOmen, confirmSecret, toggleResolveFlip, setSecretAnswer,
  viewChronicle, returnFromChronicle, toggleStrike, showRules, returnFromRules, closeOverlay,
  copyChronicle, downloadChronicle,
  bleakifyField,
  showOnlineEntry, onlineCreateRoom, onlineJoinRoom, leaveOnlineRoom,
  onlineRefreshArtPicker,
  onlineBeginTale, onlineSaveArchSetup, onlineFinishVictim,
  onlineStartScene, onlineTradeOmen, onlineForfeitScene, onlineBeginClose,
  onlineSetReadyRole, onlineVoteOmenReplacement,
  onlinePickSceneCard, onlinePickArch, onlineBeginScene, routeAndRenderCurrent,
  onlineStartContrib, onlinePickContribScene, onlinePickContribOmen, onlineCancelContrib,
  onlineSetContribHow, onlineSetSceneHappened, onlineSetSecretAnswer,
  onlineConfirmContrib, onlineEndScene, onlineApplyResolve,
  onlineToggleSecretOmen, onlineConfirmSecret,
  onlineAnswerForAbsent, onlineCopyRoomLink, onlineDismissScenePrimer, openOnlineHand,
  showOnlineError, hideOnlineError, onlineRetryConnection, onlineFallbackToHotseat,
  onlineVerifyAndProceed, withPendingState
});

export function refreshResumeControl(){
  const button = document.getElementById('resume-local-button');
  if(button) button.hidden = !hasSavedGame();
}

export function resumeLocalGame(){
  const snapshot = readSave();
  if(!snapshot){ refreshResumeControl(); return; }
  State.onlineRoomCode = null;
  State.pendingCase = snapshot.game.case;
  State.G = snapshot.game;
  const screen = snapshot.screen;
  if(screen==='scr-intro'){
    const intro = document.getElementById('intro-text');
    if(intro) intro.innerHTML = State.G.case.intro;
    show('scr-intro');
  } else if(screen==='scr-archsetup') { renderArchSetup(); show(screen); }
  else if(screen==='scr-victim') { renderVictim(); }
  else if(screen==='scr-scene') {
    if(State.G.current?.phase==='pick') renderScenePick(); else renderScenePlay();
    show(screen);
  } else if(screen==='scr-resolve') { renderResolve(); show(screen); }
  else if(screen==='scr-secret') {
    const entry = State.G.journal?.[State.G.journal.length-1];
    renderSecretUnlock(State.G.pendingSecret, entry?.tones || []); show(screen);
  } else if(screen==='scr-close') { renderCloseIntro(); show(screen); }
  else if(screen==='scr-chronicle') { renderChronicle(false); show(screen); }
  else { renderHub(); show('scr-hub'); }
  saveGame(screen);
  refreshResumeControl();
}

export function startNewCase(){
  clearSavedGame();
  State.G = null;
  State.pendingCase = null;
  refreshResumeControl();
  show('scr-hook');
}

Object.assign(window, { State, resumeLocalGame, refreshResumeControl, startNewCase, saveGame });

export function downloadGameSave(){
  const raw = exportSaveJSON();
  if(!raw) return;
  const url = URL.createObjectURL(new Blob([raw], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url; link.download = 'supe-pines-save.json'; link.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
export async function importGameFile(file){
  if(!file) return;
  try { importSaveJSON(await file.text()); resumeLocalGame(); }
  catch(error){ window.alert(error.message || 'Could not import that save.'); }
}
Object.assign(window, { downloadGameSave, importGameFile });

/* ---------------- init ---------------- */
renderHooks();
renderPlayerInputs();
refreshResumeControl();
applyFirstrunVisibility();
initOverlayDismiss();
initHistoryNav();
const onlineButton = document.getElementById('title-online-button');
if(onlineButton){
  onlineButton.classList.remove('primary');
  onlineButton.classList.add('ghost');
  onlineButton.textContent = firebaseConfigured ? 'Online (check connection)' : 'Online (setup required)';
  onlineButton.title = firebaseConfigured
    ? 'Remote rooms will verify Firebase when opened; hotseat play is ready.'
    : 'Remote rooms need the project Firebase configuration; hotseat play is ready.';
}

if(firebaseConfigured && new URLSearchParams(location.search).has('room')){
  tryAutoRejoin();
}
