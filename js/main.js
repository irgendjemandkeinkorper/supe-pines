/* Entry point. Wires the handful of functions referenced by inline
   onclick/oninput/onchange attributes in index.html onto window — ES
   modules are not global scope, so this is the one place that bridges
   the two. Everything else stays module-scoped. */
import { show, closeOverlay, initHistoryNav, applyFirstrunVisibility, dismissFirstrunHint } from './ui/screens.js';
import { flipHeroCard } from './ui/cards.js';
import { showIdleClicker, idleClick } from './ui/idle.js';
import { showGallery, setGalleryStyle, setGalleryCat, openGalleryDetail,
         closeGalleryDetail, galleryImgError, flipGalleryCard } from './ui/gallery.js';
import { renderHooks, chooseCase, renderPlayerInputs, confirmPlayers,
         beginArchSetup, saveArchSetup, finishVictim } from './ui/setup.js';
import { renderHub, openLocalHand, tradeSignal, forfeitScene, beginClose } from './ui/hub.js';
import { startSceneFor, pickSceneCard, pickArch, beginScene, pickContrib,
         pickContribScene, pickContribOmen, confirmContrib, cancelContrib,
         setContribHow, setSceneHappened, dismissScenePrimer } from './ui/scene.js';
import { endScene, applyResolve, toggleSecretOmen, confirmSecret } from './ui/resolve.js';
import { viewChronicle, returnFromChronicle, toggleStrike, showRules,
         initOverlayDismiss } from './ui/renderChronicle.js';
import { copyChronicle, downloadChronicle } from './chronicle/markdown.js';
import { ensureSignedIn } from './sync/auth.js';
import { firebaseConfigured } from './sync/config.js';
import {
  showOnlineEntry, onlineCreateRoom, onlineJoinRoom, leaveOnlineRoom, tryAutoRejoin,
  onlineBeginTale, onlineSaveArchSetup, onlineFinishVictim,
  onlineStartScene, onlineTradeOmen, onlineForfeitScene, onlineBeginClose,
  onlinePickSceneCard, onlinePickArch, onlineBeginScene, routeAndRenderCurrent,
  onlineStartContrib, onlinePickContribScene, onlinePickContribOmen, onlineCancelContrib,
  onlineSetContribHow, onlineSetSceneHappened, onlineSetSecretAnswer,
  onlineConfirmContrib, onlineEndScene, onlineApplyResolve,
  onlineToggleSecretOmen, onlineConfirmSecret,
  onlineAnswerForAbsent, onlineCopyRoomLink, onlineDismissScenePrimer, openOnlineHand
} from './ui/online.js';

Object.assign(window, {
  show, flipHeroCard, showIdleClicker, idleClick, dismissFirstrunHint,
  showGallery, setGalleryStyle, setGalleryCat, openGalleryDetail, closeGalleryDetail, galleryImgError, flipGalleryCard,
  chooseCase, renderPlayerInputs, confirmPlayers, beginArchSetup, saveArchSetup, finishVictim,
  renderHub, openLocalHand, tradeSignal, forfeitScene, beginClose,
  startSceneFor, pickSceneCard, pickArch, beginScene, pickContrib, pickContribScene, pickContribOmen,
  confirmContrib, cancelContrib, setContribHow, setSceneHappened, dismissScenePrimer,
  endScene, applyResolve, toggleSecretOmen, confirmSecret,
  viewChronicle, returnFromChronicle, toggleStrike, showRules, closeOverlay,
  copyChronicle, downloadChronicle,
  showOnlineEntry, onlineCreateRoom, onlineJoinRoom, leaveOnlineRoom,
  onlineBeginTale, onlineSaveArchSetup, onlineFinishVictim,
  onlineStartScene, onlineTradeOmen, onlineForfeitScene, onlineBeginClose,
  onlinePickSceneCard, onlinePickArch, onlineBeginScene, routeAndRenderCurrent,
  onlineStartContrib, onlinePickContribScene, onlinePickContribOmen, onlineCancelContrib,
  onlineSetContribHow, onlineSetSceneHappened, onlineSetSecretAnswer,
  onlineConfirmContrib, onlineEndScene, onlineApplyResolve,
  onlineToggleSecretOmen, onlineConfirmSecret,
  onlineAnswerForAbsent, onlineCopyRoomLink, onlineDismissScenePrimer, openOnlineHand
});

/* ---------------- init ---------------- */
renderHooks();
renderPlayerInputs();
applyFirstrunVisibility();
initOverlayDismiss();
initHistoryNav();
if(firebaseConfigured){
  ensureSignedIn()
    .then(() => tryAutoRejoin())
    .catch(err => console.warn('[sync] anonymous sign-in failed', err));
} else {
  const onlineButton = document.getElementById('title-online-button');
  if(onlineButton){
    onlineButton.classList.remove('primary');
    onlineButton.classList.add('ghost');
    onlineButton.textContent = 'Online (setup required)';
    onlineButton.title = 'Remote rooms need the project Firebase configuration; hotseat play is ready.';
  }
}
