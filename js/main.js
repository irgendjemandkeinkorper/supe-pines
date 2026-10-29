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
import { renderCases, chooseCase, renderPlayerInputs, confirmPlayers,
         beginHeroSetup, renderHeroSetup, saveHeroSetup, renderThreatSetup, finishThreatSetup } from './ui/setup.js';
import { renderHub, renderCloseIntro, openLocalHand, tradeSignal, forfeitScene, beginClose, setReadyRole, voteSignalReplacement } from './ui/hub.js';
import { startSceneFor, renderScenePick, renderScenePlay, pickSceneCard, pickHero, beginScene, pickContrib,
         pickContribScene, pickContribSignal, confirmContrib, cancelContrib,
         setContribHow, setSceneHappened, dismissScenePrimer, setSceneOpening } from './ui/scene.js';
import { endScene, renderResolve, renderSecretUnlock, applyResolve, toggleSecretSignal, confirmSecret, toggleResolveFlip, setSecretAnswer } from './ui/resolve.js';
import { viewChronicle, returnFromChronicle, toggleStrike, showRules,
         returnFromRules, initOverlayDismiss, renderChronicle } from './ui/renderChronicle.js';
import { copyChronicle, downloadChronicle } from './chronicle/markdown.js';
import { bleakifyField } from './ai/bleakify.js';
import { State } from './engine/state.js';
import { stateBlockHTML } from './ui/states.js';
import { clearSavedGame, readSave, readSaveStatus, saveGame, exportSaveJSON, importSaveJSON } from './engine/persistence.js';
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
    const moduleLoad = import('./ui/online/index.js');
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
  entry.innerHTML = `<div class="panel u-panel-centered">${stateBlockHTML({
    kind:'error',
    eyebrow:'Switchboard offline',
    title:'Connection Failed',
    body:`Details: ${message}`,
    next:'The remote table could not load. Hotseat play is ready and does not require Firebase.',
    actions:[
      {label:'Retry Connection', onclick:'showOnlineEntry()', variant:'primary'},
      {label:'Play Hotseat (Open the Case)', onclick:"show('scr-hook')", variant:'primary'},
      {label:'Back', onclick:"show('scr-title')"}
    ]
  })}</div>`;
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
const onlineSaveHeroSetup = onlineBridge('onlineSaveHeroSetup');
const onlineFinishThreatSetup = onlineBridge('onlineFinishThreatSetup');
const onlineStartScene = onlineBridge('onlineStartScene');
const onlineTradeSignal = onlineBridge('onlineTradeSignal');
const onlineForfeitScene = onlineBridge('onlineForfeitScene');
const onlineBeginClose = onlineBridge('onlineBeginClose');
const onlineSetReadyRole = onlineBridge('onlineSetReadyRole');
const onlineVoteSignalReplacement = onlineBridge('onlineVoteSignalReplacement');
const onlinePickSceneCard = onlineBridge('onlinePickSceneCard');
const onlinePickHero = onlineBridge('onlinePickHero');
const onlineBeginScene = onlineBridge('onlineBeginScene');
const routeAndRenderCurrent = onlineBridge('routeAndRenderCurrent');
const onlineStartContrib = onlineBridge('onlineStartContrib');
const onlinePickContribScene = onlineBridge('onlinePickContribScene');
const onlinePickContribSignal = onlineBridge('onlinePickContribSignal');
const onlineCancelContrib = onlineBridge('onlineCancelContrib');
const onlineSetContribHow = onlineBridge('onlineSetContribHow');
const onlineSetSceneHappened = onlineBridge('onlineSetSceneHappened');
const onlineSetSecretAnswer = onlineBridge('onlineSetSecretAnswer');
const onlineConfirmContrib = onlineBridge('onlineConfirmContrib');
const onlineEndScene = onlineBridge('onlineEndScene');
const onlineApplyResolve = onlineBridge('onlineApplyResolve');
const onlineToggleSecretSignal = onlineBridge('onlineToggleSecretSignal');
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
  chooseCase, renderPlayerInputs, confirmPlayers, beginHeroSetup, renderHeroSetup, saveHeroSetup, renderThreatSetup, finishThreatSetup,
  renderHub, openLocalHand, tradeSignal, forfeitScene, beginClose, setReadyRole, voteSignalReplacement,
  startSceneFor, renderScenePick, renderScenePlay, pickSceneCard, pickHero, beginScene, pickContrib, pickContribScene, pickContribSignal,
  confirmContrib, cancelContrib, setContribHow, setSceneHappened, dismissScenePrimer, setSceneOpening,
  endScene, renderResolve, renderSecretUnlock, applyResolve, toggleSecretSignal, confirmSecret, toggleResolveFlip, setSecretAnswer,
  viewChronicle, returnFromChronicle, toggleStrike, showRules, returnFromRules, closeOverlay,
  copyChronicle, downloadChronicle,
  bleakifyField,
  showOnlineEntry, onlineCreateRoom, onlineJoinRoom, leaveOnlineRoom,
  onlineRefreshArtPicker,
  onlineBeginTale, onlineSaveHeroSetup, onlineFinishThreatSetup,
  onlineStartScene, onlineTradeSignal, onlineForfeitScene, onlineBeginClose,
  onlineSetReadyRole, onlineVoteSignalReplacement,
  onlinePickSceneCard, onlinePickHero, onlineBeginScene, routeAndRenderCurrent,
  onlineStartContrib, onlinePickContribScene, onlinePickContribSignal, onlineCancelContrib,
  onlineSetContribHow, onlineSetSceneHappened, onlineSetSecretAnswer,
  onlineConfirmContrib, onlineEndScene, onlineApplyResolve,
  onlineToggleSecretSignal, onlineConfirmSecret,
  onlineAnswerForAbsent, onlineCopyRoomLink, onlineDismissScenePrimer, openOnlineHand,
  showOnlineError, hideOnlineError, onlineRetryConnection, onlineFallbackToHotseat,
  onlineVerifyAndProceed, withPendingState
});

const SAVE_WARNINGS = {
  quota:'Autosave failed: this browser\'s storage is full. Progress since the last save will be lost on reload — use Export JSON save in the hub to keep a copy.',
  unavailable:'Autosave failed: this browser is blocking local storage. Progress will be lost on reload — use Export JSON save in the hub to keep a copy.',
  corrupt:'A saved Case was found but could not be read. Starting a new Case will replace it.',
  unreadable:'A saved Case may exist, but this browser is blocking local storage, so it cannot be resumed.'
};

export function showSaveWarning(reason){
  const box = document.getElementById('save-warning');
  const text = document.getElementById('save-warning-text');
  if(!box || !text) return;
  text.textContent = SAVE_WARNINGS[reason] || SAVE_WARNINGS.unavailable;
  box.hidden = false;
}

export function dismissSaveWarning(){
  const box = document.getElementById('save-warning');
  if(box) box.hidden = true;
}

export function refreshResumeControl(){
  const { status } = readSaveStatus();
  const button = document.getElementById('resume-local-button');
  if(button) button.hidden = status !== 'ok';
  if(status === 'corrupt' || status === 'unreadable') showSaveWarning(status);
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
  } else if(screen==='scr-archsetup') { renderHeroSetup(); show(screen); }
  else if(screen==='scr-victim') { renderThreatSetup(); }
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
  dismissSaveWarning();
  State.G = null;
  State.pendingCase = null;
  refreshResumeControl();
  show('scr-hook');
}

Object.assign(window, { State, resumeLocalGame, refreshResumeControl, startNewCase, saveGame, dismissSaveWarning });
window.addEventListener('sp:save-failed', event => showSaveWarning(event.detail?.reason));

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
renderCases();
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
