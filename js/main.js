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
import { ensureSignedIn } from './sync/auth.js';
import { firebaseConfigured } from './sync/config.js';
import {
  showOnlineEntry, onlineCreateRoom, onlineJoinRoom, leaveOnlineRoom, tryAutoRejoin,
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
  initFirebaseConnection, onlineVerifyAndProceed, withPendingState
} from './ui/online.js';

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
if(firebaseConfigured){
  initFirebaseConnection();
} else {
  const onlineButton = document.getElementById('title-online-button');
  if(onlineButton){
    onlineButton.classList.remove('primary');
    onlineButton.classList.add('ghost');
    onlineButton.textContent = 'Online (setup required)';
    onlineButton.title = 'Remote rooms need the project Firebase configuration; hotseat play is ready.';
  }
}
