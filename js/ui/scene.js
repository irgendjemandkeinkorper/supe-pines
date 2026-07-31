import { $, esc, nl2br, toneBadge, ACT_NAMES } from '../engine/utils.js';
import { State } from '../engine/state.js';
import { show } from './screens.js';
import { heroCard, signalCard, sceneCardHTML, sceneAnatomyDiagramHTML } from './cards.js';
import { eligibleContributors, maxContrib } from '../engine/rules.js';
import { hasSeenIntro, markIntroSeen } from '../engine/firstrun.js';

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
      <label class="fld">What the camera sees as the scene opens</label>
      <p class="small muted" style="margin-bottom:6px">Every scene begins as if filmed. The block, the light, the hour, who stands where. Then narrate freely, aloud.</p>
      <textarea id="scene-opening" placeholder="The camera drifts through…"></textarea>
      <div class="btnrow">
        <button class="primary" id="btn-begin" disabled onclick="beginScene()">Begin the Scene</button>
        <button class="ghost" onclick="renderHub();show('scr-hub')">Back to the Table</button>
      </div>
    </div>`;
}
export function dismissScenePrimer(){ markIntroSeen(); renderScenePick(); }
export function pickSceneCard(i){
  State.G.current.cardIdx = i;
  document.querySelectorAll('[id^="scene-pick-"]').forEach(el=>el.classList.remove('selected'));
  $('scene-pick-'+i).classList.add('selected');
  checkBegin();
}
export function pickArch(i){
  State.G.current.archIdx = i;
  document.querySelectorAll('[id^="arch-pick-"]').forEach(el=>el.classList.remove('selected'));
  $('arch-pick-'+i).classList.add('selected');
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
  renderScenePlay();
  window.scrollTo(0,0);
}

export function renderScenePlay(){
  const G = State.G;
  const c = G.current, p = G.players[c.starter], a = G.heroes[c.archIdx];
  const isClose = c.type==='close';
  const contribHTML = c.contributions.map(x=>`
    <div class="chron-entry" style="margin:8px 0">
      <div class="ce-head"><span class="ce-title" style="font-size:.95rem">${x.kind==='omen'?x.card.glyph+' ':''}${esc(x.card.title)}</span>
      <span class="ce-meta">played by ${esc(G.players[x.pi].name)}${x.kind==='scene'?' · '+toneBadge(x.card.tone):' · signal'}</span></div>
      <div class="small" style="color:#cfc2a2">${nl2br(x.how)||'<span class="muted">…manifests wordlessly.</span>'}</div>
    </div>`).join('');

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
          <label class="fld">How does it manifest in the scene?</label>
          <textarea id="contrib-how" oninput="setContribHow(this.value)" placeholder="Describe how it alters the scene in progress…">${esc(c.adding.how||'')}</textarea>
          <div class="btnrow">
            <button class="primary" onclick="confirmContrib()">Play It</button>
            <button class="ghost" onclick="cancelContrib()">Never mind</button>
          </div>`;
      }
    }
  }

  $('scr-scene').innerHTML = `
    <p class="center muted sc" style="letter-spacing:.2em">${isClose?'THE ACT CLOSE':'A SCENE'} — ${ACT_NAMES[G.act].toUpperCase()}</p>
    <div class="ornament">❦</div>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      <div class="card">
        <div class="c-kicker">${isClose?'Act Close':'Scene'}</div>
        <div class="c-title">${esc(c.card.title)}</div>
        <div class="c-prompt">${esc(c.card.prompt)}</div>
        ${c.card.tone?`<div style="margin-top:8px">${toneBadge(c.card.tone)}</div>`:''}
        ${c.element?`<hr class="rule" style="border-color:rgba(60,45,25,.3)"><div class="small" style="color:var(--blood)"><strong>Include:</strong> <span>${esc(c.element)}</span></div>`:''}
      </div>
      <div>${heroCard(a)}
        <p class="small muted" style="margin-top:6px">Led by ${esc(p.name)}. The prompt is a door, not a cage — interpret it as broadly as you please.</p>
      </div>
    </div>
    ${c.opening?`<div class="panel tight"><span class="sc small" style="color:var(--gold)">THE CAMERA SEES</span><p style="color:#e3d7b8">${nl2br(c.opening)}</p></div>`:''}

    <div class="panel tight">
      <h3 style="color:var(--gold)">Cards played into the scene <span class="muted small">(${1+c.contributions.length} of 3)</span></h3>
      ${contribHTML || '<p class="small muted">None yet. Any other storyteller may buy into the scene with one card apiece.</p>'}
      ${addingHTML}
    </div>

    <div class="panel spotlight">
      <label class="fld">The record of what happens</label>
      <p class="small muted" style="margin-bottom:6px">Play the scene aloud — narrate, act, cast one another in roles. Note here what the Dossier should remember: who appeared, what was said, what was discovered.</p>
      <textarea id="scene-happened" style="min-height:130px" oninput="setSceneHappened(this.value)" placeholder="What the Dossier will remember of this scene…">${esc(c.happened||'')}</textarea>
      <div class="btnrow">
        <button class="blood" onclick="endScene()">The scene ends — ${esc(p.name)} says so</button>
      </div>
    </div>`;
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
  renderScenePlay();
}

/* small helpers used directly by inline handlers so no globals leak into onclick strings */
export function cancelContrib(){ State.G.current.adding = null; renderScenePlay(); }
export function setContribHow(v){ if(State.G.current.adding) State.G.current.adding.how = v; }
export function setSceneHappened(v){ State.G.current.happened = v; }
