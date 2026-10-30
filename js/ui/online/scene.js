/* Online scene pick, scene play, contributions, and inline resolution. */
import { $, esc, toneBadge } from '../../engine/utils.js';
import { State } from '../../engine/state.js';
import { show } from '../screens.js';
import { heroCard, signalCard, sceneCardHTML, sceneAnatomyDiagramHTML, sceneTrackerHTML } from '../cards.js';
import { faceUp, maxContrib } from '../../engine/rules.js';
import { hasSeenIntro, markIntroSeen } from '../../engine/firstrun.js';
import { liveBeginScene, liveContribute, liveEndSceneAndResolve } from '../../sync/liveActions.js';
import { session } from './session.js';
import { mySeatIndex, resetDraft } from './session.js';
import { fail, withPendingState } from './errors.js';
import { renderOnlineCloseIntro, renderOnlineHub } from './hub.js';

/* ---------------- scene: pick ---------------- */
export function renderOnlineScenePick(){
  const room = State.G;
  const primerHTML = !hasSeenIntro() ? `
    <div class="panel spotlight">
      <h3 class="u-gold">Before your first scene</h3>
      ${sceneAnatomyDiagramHTML()}
      <div class="btnrow"><button class="primary" onclick="onlineDismissScenePrimer()">Got it — begin</button></div>
    </div>` : '';
  $('scr-scene').innerHTML = `
    ${primerHTML}
    <h2 class="center">You begin a scene</h2>
    <div class="ornament">❦</div>
    <h3 class="u-gold">Choose a scene card from your hand</h3>
    <div class="cardgrid">${session.myPrivate.hand.map((sc,i)=>sceneCardHTML(sc,'onlinePickSceneCard',i)).join('')}</div>
    <h3 class="u-gold">Choose up to two lead Heroes</h3>
    <div class="pgrid u-grid-cards u-mt-8">
      ${room.heroes.map((a,i)=>heroCard(a,'onlinePickHero',i)).join('')}
    </div>
    <div class="panel">
      <label class="fld" for="scene-opening">What the camera sees as the scene opens</label>
      <textarea id="scene-opening" placeholder="The camera drifts through…"></textarea>
      <div class="btnrow">
        <button class="ghost" onclick="bleakifyField('scene-opening','scene opening',this)">Bleakify</button>
        <button class="primary" id="btn-begin" disabled onclick="onlineBeginScene(this)">Begin the Scene</button>
        <button class="ghost" onclick="routeAndRenderCurrent()">Back to the Table</button>
      </div>
    </div>`;
}
export function onlineDismissScenePrimer(){ markIntroSeen(); renderOnlineScenePick(); }
export function onlinePickSceneCard(i){
  session.draft.cardIdx = i;
  document.querySelectorAll('[id^="scene-pick-"]').forEach(el=>el.classList.remove('selected'));
  $('scene-pick-'+i).classList.add('selected');
  onlineCheckBegin();
}
export function onlinePickHero(i){
  const at = session.draft.archIdxs.indexOf(i);
  if(at>=0) session.draft.archIdxs.splice(at,1);
  else if(session.draft.archIdxs.length<2) session.draft.archIdxs.push(i);
  document.querySelectorAll('[id^="arch-pick-"]').forEach(el=>el.classList.remove('selected'));
  $('arch-pick-'+i).classList.add('selected');
  onlineCheckBegin();
}
export function onlineCheckBegin(){
  $('btn-begin').disabled = !(session.draft.cardIdx!=null && session.draft.archIdxs.length>0);
}
export async function onlineBeginScene(btn){
  try{ await withPendingState(btn, "Beginning Scene...", () => liveBeginScene(State.onlineRoomCode, session.draft.cardIdx, session.draft.archIdxs, $('scene-opening').value)); }
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
export function renderOnlineScene(room){
  const c = room.current, p = room.players[c.starter];
  const mySeat = mySeatIndex(room);
  const iAmStarter = mySeat===c.starter;
  const contributionCount = c.contributions.filter(x=>x.pi===mySeat).length;

  let addingHTML = '';
  if(!iAmStarter && contributionCount < 2 && c.contributions.length < maxContrib()){
    if(!session.draft.adding){
      addingHTML = `<div class="btnrow"><button class="ghost" onclick="onlineStartContrib()">Play a card into this scene</button></div>`;
    } else if(!session.draft.adding.pick){
      addingHTML = `
        <p class="small u-gold">Choose a scene card from your hand, or a signal from the row:</p>
        ${session.myPrivate.hand.length?`<div class="cardgrid">${session.myPrivate.hand.map((sc,i)=>sceneCardHTML(sc,'onlinePickContribScene',i)).join('')}</div>`:''}
        ${room.signalRow.length?`<div class="cardgrid compact">${room.signalRow.map((o,i)=>signalCard(o,'onlinePickContribSignal',i)).join('')}</div>`:''}
        <button class="ghost" onclick="onlineCancelContrib()">Never mind</button>`;
    } else {
      const pk = session.draft.adding.pick;
      const card = pk.kind==='scene' ? session.myPrivate.hand[pk.idx] : room.signalRow[pk.idx];
      addingHTML = `
        <div style="max-width:280px">${pk.kind==='scene'?sceneCardHTML(card):signalCard(card)}</div>
        <label class="fld" for="contrib-how">How does it manifest in the scene?</label>
        <textarea id="contrib-how" oninput="onlineSetContribHow(this.value)">${esc(session.draft.adding.how||'')}</textarea>
        <div class="btnrow">
          <button class="ghost" onclick="bleakifyField('contrib-how','scene contribution',this)">Bleakify</button>
          <button class="primary" onclick="onlineConfirmContrib(this)">Play It</button>
          <button class="ghost" onclick="onlineCancelContrib()">Never mind</button>
        </div>`;
    }
  }

  const endSceneHTML = iAmStarter ? (!session.draft.resolving ? `
    <div class="panel spotlight">
      <label class="fld" for="scene-happened">The record of what happens</label>
      <p class="small muted u-mb-6">Play the scene aloud. Note what the Dossier should remember: who appeared, what was said, and what was discovered.</p>
      <textarea id="scene-happened" style="min-height:130px" oninput="onlineSetSceneHappened(this.value)" placeholder="What the Dossier will remember of this scene…">${esc(session.draft.happened||'')}</textarea>
      <div class="btnrow"><button class="ghost" onclick="bleakifyField('scene-happened','record of what happened',this)">Bleakify</button><button class="blood" onclick="onlineEndScene()">The scene ends</button></div>
    </div>` : renderOnlineResolveInline(room)) : '';

  $('scr-scene').innerHTML = `
    ${sceneTrackerHTML(room,{viewerSeat:mySeat,phase:session.draft.resolving?'resolve':'play',happened:session.draft.happened})}
    ${addingHTML?`<div class="panel scene-action-panel${session.draft.adding?' spotlight':''}">
      <div class="scene-action-head">
          <div><span class="sc">Add to the scene</span><p>You may play up to two cards; the scene holds three cards at most.</p></div>
          <span class="pill">${1+c.contributions.length} of 3 filled · ${contributionCount}/2 by you</span>
      </div>
      ${addingHTML}
    </div>`:''}
    ${endSceneHTML || (iAmStarter?'':'<p class="small muted center">Waiting for '+esc(p.name)+' to end the scene…</p>')}`;
}
export function renderOnlineSceneRefresh(){ renderOnlineScene(State.G); }
export function onlineStartContrib(){ session.draft.adding = {pick:null, how:''}; renderOnlineSceneRefresh(); }
export function onlinePickContribScene(i){ session.draft.adding.pick={kind:'scene', idx:i}; renderOnlineSceneRefresh(); }
export function onlinePickContribSignal(i){ session.draft.adding.pick={kind:'omen', idx:i}; renderOnlineSceneRefresh(); }
export function onlineCancelContrib(){ session.draft.adding = null; renderOnlineSceneRefresh(); }
export function onlineSetContribHow(v){ if(session.draft.adding) session.draft.adding.how = v; }
export function onlineSetSceneHappened(v){ session.draft.happened = v; }
export function onlineSetSecretAnswer(v){ session.draft.secretAnswer = v; }
export async function onlineConfirmContrib(btn){
  try{
    const {kind, idx, how} = session.draft.adding.pick.kind==='scene'
      ? {kind:'scene', idx:session.draft.adding.pick.idx, how:session.draft.adding.how}
      : {kind:'omen', idx:session.draft.adding.pick.idx, how:session.draft.adding.how};
    await withPendingState(btn, "Playing...", async () => {
      await liveContribute(State.onlineRoomCode, kind, idx, how);
      session.draft.adding = null;
    });
  } catch(err){ fail(err); }
}
export function onlineEndScene(){
  session.draft.resolving = true;
  renderOnlineSceneRefresh();
}
export function renderOnlineResolveInline(room){
  const c = room.current;
  return `
    <div class="panel spotlight">
      <h3 class="u-gold">Consult each Hero’s face-up condition</h3>
      <p class="small muted">If it was met in this scene, check it to turn the card.</p>
      ${room.heroes.map((a,i)=>{
        const s = faceUp(a);
        return `<div class="panel tight" style="display:flex;gap:12px;align-items:flex-start">
          <input type="checkbox" id="online-flip-${i}" style="width:auto;margin-top:6px;transform:scale(1.3)">
          <label class="u-pointer" for="online-flip-${i}">
            <span class="sc u-parchment-bright">${esc(a.name||a.role)}</span>
            ${i===c.archIdx?'<span class="pill" style="border-color:var(--blood-bright);color:var(--text-blush)">led this scene</span>':''}
            <br><span class="small" style="color:var(--text-parchment-dim)">${esc(s.cond)}</span> ${toneBadge(s.tone)}
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
      await liveEndSceneAndResolve(State.onlineRoomCode, session.draft.happened, flips);
      session.draft.resolving = false; session.draft.happened = '';
    });
  } catch(err){ fail(err); }
}
