import { $, esc, casePhaseRail } from '../engine/utils.js';
import { State } from '../engine/state.js';
import { show } from './screens.js';
import { heroCard, signalCard, sceneCardHTML, sceneAnatomyDiagramHTML, sceneTrackerHTML } from './cards.js';
import { eligibleContributors, maxContrib } from '../engine/rules.js';
import { hasSeenIntro, markIntroSeen } from '../engine/firstrun.js';
import { saveGame } from '../engine/persistence.js';

/* ---------------- scenes ---------------- */
export function startSceneFor(pi){
  State.G.current = {type:'scene', starter:pi, phase:'pick', cardIdx:null, archIdx:null,
               contributions:[], happened:'', opening:'', adding:null};
  renderScenePick();
  show('scr-scene');
}
export function renderScenePick(){
  const G = State.G;
  const c = G.current, p = G.players[c.starter];
  const primerHTML = !hasSeenIntro() ? `
    <div class="panel spotlight">
      <h3 style="color:var(--gold)">Before your first scene</h3>
      ${sceneAnatomyDiagramHTML()}
      <div class="btnrow"><button class="primary" onclick="dismissScenePrimer()">Got it — begin</button></div>
    </div>` : '';
  $('scr-scene').innerHTML = `
    ${casePhaseRail('acts', 'Choose a Scene card, choose a lead Hero, then describe what the camera sees.')}
    ${primerHTML}
    <h2 class="center">${esc(p.name)} begins a scene</h2>
    <div class="ornament">❦</div>
    <h3 style="color:var(--gold)">Choose a scene card from your hand</h3>
    <div class="cardgrid">${p.hand.map((sc,i)=>sceneCardHTML(sc,'pickSceneCard',i)).join('')}</div>
    <h3 style="color:var(--gold)">Choose the lead Hero</h3>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:8px">
      ${G.heroes.map((a,i)=>heroCard(a,'pickArch',i)).join('')}
    </div>
    <div class="panel">
      <label class="fld" for="scene-opening">What the camera sees as the scene opens</label>
      <p class="small muted" style="margin-bottom:6px">Every scene begins as if filmed. The block, the light, the hour, who stands where. Then narrate freely, aloud.</p>
      <textarea id="scene-opening" placeholder="The camera drifts through…"></textarea>
      <div class="btnrow">
        <button class="primary" id="btn-begin" disabled onclick="beginScene()">Begin the Scene</button>
        <button class="ghost" onclick="renderHub();show('scr-hub')">Back to the Table</button>
      </div>
    </div>`;
  saveGame('scr-scene');
}
export function dismissScenePrimer(){ markIntroSeen(); renderScenePick(); }
export function pickSceneCard(i){
  State.G.current.cardIdx = i;
  document.querySelectorAll('[id^="scene-pick-"]').forEach(el=>{ el.classList.remove('selected'); el.setAttribute('aria-pressed','false'); });
  $('scene-pick-'+i).classList.add('selected');
  $('scene-pick-'+i).setAttribute('aria-pressed','true');
  checkBegin();
}
export function pickArch(i){
  State.G.current.archIdx = i;
  document.querySelectorAll('[id^="arch-pick-"]').forEach(el=>{ el.classList.remove('selected'); el.setAttribute('aria-pressed','false'); });
  $('arch-pick-'+i).classList.add('selected');
  $('arch-pick-'+i).setAttribute('aria-pressed','true');
  checkBegin();
}
export function checkBegin(){
  $('btn-begin').disabled = !(State.G.current.cardIdx!==null && State.G.current.archIdx!==null);
}
export function beginScene(){
  const G = State.G;
  const c = G.current, p = G.players[c.starter];
  c.card = p.hand.splice(c.cardIdx,1)[0];
  c.opening = ($('scene-opening').value||'').trim();
  c.phase = 'play';
  renderScenePlay(0);
  saveGame('scr-scene');
  window.scrollTo(0,0);
}

export function renderScenePlay(animateSlot=null){
  const G = State.G;
  const c = G.current, p = G.players[c.starter];

  let addingHTML = '';
  const elig = eligibleContributors();
  if(c.contributions.length < maxContrib() && (elig.length || c.adding)){
    if(!c.adding){
      addingHTML = `<div class="btnrow">${elig.map(i=>`<button class="ghost" onclick="pickContrib(${i})">${esc(G.players[i].name)} plays a card into this scene</button>`).join('')}</div>`;
    } else {
      const ap = G.players[c.adding.pi];
      if(!c.adding.pick){
        addingHTML = `
          <p class="small" style="color:var(--gold)">${esc(ap.name)} — choose a scene card from your hand, or a signal from the row:</p>
          ${ap.hand.length?`<div class="cardgrid">${ap.hand.map((sc,i)=>sceneCardHTML(sc,'pickContribScene',i)).join('')}</div>`:''}
          ${G.signalRow.length?`<div class="cardgrid compact">${G.signalRow.map((o,i)=>signalCard(o,'pickContribOmen',i)).join('')}</div>`:''}
          <button class="ghost" onclick="cancelContrib()">Never mind</button>`;
      } else {
        const pk = c.adding.pick;
        const card = pk.kind==='scene' ? ap.hand[pk.idx] : G.signalRow[pk.idx];
        addingHTML = `
          <div style="max-width:280px">${pk.kind==='scene'?sceneCardHTML(card):signalCard(card)}</div>
          <label class="fld" for="contrib-how">How does it manifest in the scene?</label>
          <textarea id="contrib-how" oninput="setContribHow(this.value)" placeholder="Describe how it alters the scene in progress…">${esc(c.adding.how||'')}</textarea>
          <div class="btnrow">
            <button class="primary" onclick="confirmContrib()">Play It</button>
            <button class="ghost" onclick="cancelContrib()">Never mind</button>
          </div>`;
      }
    }
  }

  $('scr-scene').innerHTML = `
    ${casePhaseRail('acts', 'Narrate together. The starter decides when the scene ends.')}
    ${sceneTrackerHTML(G,{animateSlot})}

    ${addingHTML?`<div class="panel scene-action-panel${c.adding?' spotlight':''}">
      <div class="scene-action-head">
        <div><span class="sc">Add to the scene</span><p>Each storyteller may buy in once; the scene holds three cards at most.</p></div>
        <span class="pill">${1+c.contributions.length} of 3 filled</span>
      </div>
      ${addingHTML}
    </div>`:''}

    <div class="panel spotlight">
      <label class="fld" for="scene-happened">The record of what happens</label>
      <p class="small muted" style="margin-bottom:6px">Play the scene aloud — narrate, act, cast one another in roles. Note here what the Dossier should remember: who appeared, what was said, what was discovered.</p>
      <textarea id="scene-happened" style="min-height:130px" oninput="setSceneHappened(this.value)" placeholder="What the Dossier will remember of this scene…">${esc(c.happened||'')}</textarea>
      <div class="btnrow">
        <button class="blood" onclick="endScene()">The scene ends — ${esc(p.name)} says so</button>
      </div>
    </div>`;
  saveGame('scr-scene');
}
export function pickContrib(pi){ State.G.current.adding = {pi, pick:null, how:''}; renderScenePlay(); }
export function pickContribScene(i){ State.G.current.adding.pick={kind:'scene', idx:i}; renderScenePlay(); }
export function pickContribOmen(i){ State.G.current.adding.pick={kind:'omen', idx:i}; renderScenePlay(); }
export function confirmContrib(){
  const G = State.G;
  const c = G.current, ad = c.adding, ap = G.players[ad.pi];
  let card;
  if(ad.pick.kind==='scene') card = ap.hand.splice(ad.pick.idx,1)[0];
  else {
    card = G.signalRow.splice(ad.pick.idx,1)[0];
    if(G.signalDeck.length) G.signalRow.push(G.signalDeck.shift());
  }
  c.contributions.push({pi:ad.pi, kind:ad.pick.kind, card, how:(ad.how||'').trim()});
  c.adding = null;
  renderScenePlay(c.contributions.length);
  saveGame('scr-scene');
}

/* small helpers used directly by inline handlers so no globals leak into onclick strings */
export function cancelContrib(){ State.G.current.adding = null; renderScenePlay(); }
export function setContribHow(v){ if(State.G.current.adding) State.G.current.adding.how = v; }
export function setSceneHappened(v){ State.G.current.happened = v; }
