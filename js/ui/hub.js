import { $, esc, shuffle, toneBadge, toneCountBadge, ACT_NAMES, actTrackHTML, casePhaseRail } from '../engine/utils.js';
import { TONES, SCENES } from '../data/index.js';
import { State } from '../engine/state.js';
import { show, renderTopbar } from './screens.js';
import { heroCard, signalCard, playerPanel, journalEntrySummaryHTML } from './cards.js';
import { actToneCounts } from '../engine/rules.js';
import { renderScenePlay } from './scene.js';
import { viewChronicle } from './renderChronicle.js';
import { saveGame } from '../engine/persistence.js';
import { replaceOmenByVote } from '../engine/gameplay.js';

/* ---------------- milestone rail ----------------
   A compact, newest-first digest of the story's key beats — act
   boundaries, Heroes turning, and Buried Secrets coming to light —
   so the table can glance back without leaving the hub. The Dossier
   (renderChronicle.js) remains the full detailed account; this is a
   summary derived from the same G.journal, not a second source of truth. */
function computeMilestones(G){
  const ms = [];
  let lastAct = 0;
  const openAct = a => { for(let n=lastAct+1;n<=a;n++) ms.push({icon:'●', text:`${ACT_NAMES[n]} began`}); lastAct = a; };
  G.journal.forEach(e=>{
    if(e.struck) return; // stricken things never were
    if(e.act > lastAct) openAct(e.act);
    if(e.type==='close') ms.push({icon:'●', text:`${ACT_NAMES[e.act]} closed — ${e.cardTitle}`});
    else if(e.type==='secret') ms.push({icon:'✦', text:`A Buried Secret revealed — ${e.playerName}`});
    else if(e.type==='scene') (e.flips||[]).forEach(f=>ms.push({icon:'◆', text:f}));
  });
  if(G.act>=1 && G.act<=3 && G.act>lastAct) openAct(G.act);
  return ms;
}
function milestoneRailHTML(G){
  const all = computeMilestones(G);
  if(!all.length) return '';
  const shown = all.slice().reverse().slice(0,8);
  return `<div class="panel tight ms-rail">
    <h3 style="color:var(--gold)">The Case So Far</h3>
    <div class="ms-list">
      ${shown.map((m,i)=>`<div class="ms-row" role="button" tabindex="0" aria-label="Open the Dossier" style="animation-delay:${i*0.05}s" onclick="viewChronicle(true)" onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();viewChronicle(true)}"><span class="ms-icon">${m.icon}</span><span class="ms-text">${esc(m.text)}</span></div>`).join('')}
    </div>
    ${all.length>shown.length?`<p class="small muted" role="button" tabindex="0" style="margin-top:6px;cursor:pointer" onclick="viewChronicle(true)" onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();viewChronicle(true)}">+${all.length-shown.length} earlier beat${all.length-shown.length===1?'':'s'} — open The Dossier</p>`:''}
  </div>`;
}

function localTurnSeatHTML(G,p,i){
  const noWayToLead = p.hand.length===0 && (p.signals.length===0 || G.sceneDeck.length===0);
  const needsTrade = p.hand.length===0 && !noWayToLead;
  const state = p.scenesLeft<=0 ? 'done' : noWayToLead ? 'blocked' : needsTrade ? 'trade' : 'ready';
  const label = state==='done' ? 'Finished this act' : state==='blocked' ? 'No card to lead' : state==='trade' ? 'Trade first' : 'Ready to lead';
  return `<div class="turn-seat ${state}">
    <div class="turn-seat-head"><strong>${esc(p.name)}</strong><span>${label}</span></div>
    <p>${p.scenesLeft} scene${p.scenesLeft===1?'':'s'} left to lead · ${p.hand.length} scene card${p.hand.length===1?'':'s'} · ${p.signals.length} held Signal${p.signals.length===1?'':'s'}</p>
    <div class="ready-role-row" aria-label="${esc(p.name)} scene role">
      ${['lead','follow','watch'].map(role=>`<button class="ghost ${G.readyRoles?.[i]===role?'selected':''}" onclick="setReadyRole(${i},'${role}')">Ready to ${role}</button>`).join('')}
    </div>
    <div class="turn-seat-actions">
      ${state==='ready'?`<button class="primary" onclick="startSceneFor(${i})">Begin a scene</button>`:''}
      ${state==='blocked' && p.scenesLeft>0?`<button class="blood" onclick="forfeitScene(${i})">Forfeit scene</button>`:''}
      <button class="ghost" onclick="openLocalHand(${i})">View ${esc(p.name)}’s cards</button>
    </div>
  </div>`;
}

export function setReadyRole(pi, role){
  const G = State.G;
  if(!G?.players?.[pi] || !['lead','follow','watch'].includes(role)) return;
  if(!Array.isArray(G.readyRoles)) G.readyRoles = G.players.map(()=>null);
  G.readyRoles[pi] = G.readyRoles[pi] === role ? null : role;
  renderHub();
  saveGame('scr-hub');
}

export function voteOmenReplacement(signalIndex, playerIndex){
  const G = State.G;
  if(!G?.signalRow?.[signalIndex] || !G.players[playerIndex]) return;
  if(!G.omenVotes) G.omenVotes = {};
  const voters = new Set(G.omenVotes[signalIndex] || []);
  voters.add(playerIndex);
  G.omenVotes[signalIndex] = [...voters];
  if(replaceOmenByVote(G, signalIndex, G.omenVotes[signalIndex], G.players.length)){
    G.signalDeck = shuffle(G.signalDeck);
    G.omenVotes = {};
  }
  renderHub();
  saveGame('scr-hub');
}

/* ---------------- acts ---------------- */
export function startAct(act){
  const G = State.G;
  G.act = act;
  G.closeDone = false;
  G.discardTones = [];
  const np = G.players.length;
  G.sceneDeck = shuffle(SCENES[act].filter(s=>!s.hook || s.hook===G.case.id).map(s=>({...s})));
  const handSize = np===1?5:3;
  G.players.forEach(p=>{
    p.hand = G.sceneDeck.splice(0, handSize);
    p.scenesLeft = np===1?3 : np===2?2 : 1;
  });
  renderHub();
  show('scr-hub');
}

export function renderHub(){
  const G = State.G;
  const close = G.actClose[G.act];
  const remaining = G.players.reduce((s,p)=>s+p.scenesLeft,0);
  $('scr-hub').innerHTML = `
    ${casePhaseRail('acts', `Choose a storyteller to begin ${ACT_NAMES[G.act]}.`)}
    <h2 class="center" style="margin-top:8px">${ACT_NAMES[G.act]}</h2>
    <p class="center muted">${esc(G.case.title)} · The Threat: ${esc(G.threat.name)}</p>
    ${actTrackHTML(G.act)}
    <div class="ornament">✦ ❦ ✦</div>
    <div class="panel tight save-tools">
      <strong style="color:var(--gold)">Keep this case</strong>
      <span class="small muted">Export a portable save before closing the tab, or import one on another device.</span>
      <div class="btnrow">
        <button class="ghost" onclick="downloadGameSave()">Export JSON save</button>
        <label class="button ghost" for="import-save-file">Import JSON save</label>
        <input id="import-save-file" type="file" accept="application/json,.json" hidden onchange="importGameFile(this.files[0])">
      </div>
    </div>

    <div class="panel spotlight turn-board">
      <div class="turn-board-head">
        <div><span class="turn-kicker">Who acts now?</span><h3>Any ready storyteller may begin</h3></div>
        <span class="pill">${remaining} scene${remaining===1?'':'s'} before the close</span>
      </div>
      <p class="turn-guidance">There is no fixed turn order. Whoever has the next idea chooses <strong>Begin a scene</strong>; everyone else may buy in once play starts.</p>
      <div class="turn-seats">${G.players.map((p,i)=>localTurnSeatHTML(G,p,i)).join('')}</div>
    </div>

    ${milestoneRailHTML(G)}

    ${G.journal.length ? `<h3 style="color:var(--gold)">Last Scene</h3>${journalEntrySummaryHTML(G.journal[G.journal.length-1], {compact:true})}` : ''}

    <div class="panel tight">
      <h3 style="color:var(--blood-bright)">The Act Close — foreseen</h3>
      <p><span class="sc" style="color:#eddfba">${esc(close.title)}.</span> <span class="muted small">${esc(close.cond)}</span></p>
      <p class="small" style="color:#cfc2a2">${esc(close.prompt)}</p>
      <p class="small muted">${TONES.map(t=>`${toneBadge(t)} <span>${esc(close.elements[t])}</span>`).join('<br>')}</p>
    </div>

    <details class="disclose" open>
      <summary>The Heroes <span class="small muted">(${G.heroes.length})</span></summary>
      <div class="disclose-body">
        <div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:8px">
          ${G.heroes.map(h=>heroCard(h)).join('')}
        </div>
      </div>
    </details>

    <details class="disclose" open>
      <summary>The Signal Row <span class="small muted">(${G.signalRow.length})</span></summary>
      <div class="disclose-body">
        <p class="small muted">Read them literally, metaphorically, or obliquely — as you see fit. They accrue meaning as they recur.</p>
        <div class="cardgrid compact">${G.signalRow.map((o,i)=>`<div class="omen-row-card">${signalCard(o, null, i)}<p class="small muted">Vote to replace this Omen — unanimous consent draws a fresh one.</p><div class="btnrow">${G.players.map((p,pi)=>`<button class="ghost" onclick="voteOmenReplacement(${i},${pi})">${esc(p.name)} votes</button>`).join('')}</div></div>`).join('')}</div>
      </div>
    </details>

    <details class="disclose" id="storyteller-hands">
      <summary>Hands &amp; Buried Secrets <span class="small muted">${G.players.length} storytellers · Scene deck ${G.sceneDeck.length} · Signal deck ${G.signalDeck.length}</span></summary>
      <div class="disclose-body">
        <div class="pgrid" style="margin-top:8px">
          ${G.players.map((p,i)=>playerPanel(p,i)).join('')}
        </div>
      </div>
    </details>`;
  renderTopbar();
  saveGame('scr-hub');
}

export function openLocalHand(i){
  const shelf = $('storyteller-hands');
  const panel = $('player-panel-'+i);
  if(!shelf || !panel) return;
  shelf.open = true;
  panel.classList.remove('hand-focus');
  requestAnimationFrame(()=>{
    panel.classList.add('hand-focus');
    panel.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>panel.classList.remove('hand-focus'),1400);
  });
}

export function tradeSignal(pi,oi){
  const G = State.G;
  const p = G.players[pi];
  if(!G.sceneDeck.length) return;
  const o = p.signals.splice(oi,1)[0];
  G.signalDeck.unshift(o);
  p.hand.push(G.sceneDeck.pop());
  renderHub();
  saveGame('scr-hub');
}
export function forfeitScene(pi){
  const G = State.G;
  const p = G.players[pi];
  p.scenesLeft--;
  G.journal.push({type:'note', act:G.act, text:`${p.name} had neither scene card nor signal to trade, and lost their scene. Millhaven went unwatched a while.`, struck:false});
  afterSceneFlow();
}

/* ---------------- act close & flow ---------------- */
export function afterSceneFlow(){
  const G = State.G;
  if(G.closeDone){ advanceAct(); return; }
  const remaining = G.players.reduce((s,p)=>s+p.scenesLeft,0);
  if(remaining<=0){ renderCloseIntro(); show('scr-close'); }
  else { renderHub(); show('scr-hub'); }
}
export function renderCloseIntro(){
  const G = State.G;
  const close = G.actClose[G.act];
  const counts = actToneCounts();
  const max = Math.max(...TONES.map(t=>counts[t]));
  const tied = TONES.filter(t=>counts[t]===max);
  const elementHTML = tied.length===1
    ? `<p><strong style="color:var(--blood-bright)">The act’s dominant tone is ${toneBadge(tied[0])}</strong> — the close must <span>${esc(close.elements[tied[0]])}</span></p>
       <input type="hidden" id="close-el" value="${tied[0]}">`
    : `<fieldset class="close-el-picker" style="border:none;margin:0;padding:0">
         <legend class="fld" style="color:var(--gold);font-weight:bold;margin-bottom:8px">The tones stand tied. Choose the dominant element:</legend>` +
         tied.map((t,i)=>`<p><label style="cursor:pointer" for="close-el-${t}"><input type="radio" id="close-el-${t}" name="close-el" value="${t}" style="width:auto" ${i===0?'checked':''}> ${toneBadge(t)} <span class="small">${esc(close.elements[t])}</span></label></p>`).join('') +
      `</fieldset>`;
  $('scr-close').innerHTML = `
    ${casePhaseRail('acts', 'The Act Close is the next scene.')}
    <h2 class="center" style="color:var(--blood-bright)">${ACT_NAMES[G.act]} draws to a close</h2>
    ${actTrackHTML(G.act)}
    <div class="ornament">✦</div>
    <div style="max-width:720px;margin:0 auto">
      <div class="card">
        <div class="c-kicker">Act Close</div>
        <div class="c-title" style="font-size:1.4rem">${esc(close.title)}</div>
        <div class="c-prompt">${esc(close.prompt)}</div>
      </div>
      <div class="panel spotlight">
        <p class="small" style="color:var(--gold)">${esc(close.cond)}</p>
        <p class="small muted">The tally of tones this act — from every card played and every Hero’s face — stands at:
        ${TONES.map(t=>toneCountBadge(t, counts[t])).join(' ')}</p>
        ${elementHTML}
        <label class="fld" for="close-starter">Who begins the close?</label>
        <select id="close-starter">${G.players.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('')}</select>
        <label class="fld" for="close-arch">Which Hero leads it?</label>
        <select id="close-arch">${G.heroes.map((a,i)=>`<option value="${i}">${esc(a.name||a.role)} — ${esc(a.role)}</option>`).join('')}</select>
        <label class="fld" for="close-opening">What the camera sees as the close opens</label>
        <textarea id="close-opening" placeholder="The camera rises above Millhaven…"></textarea>
        <div class="btnrow">
          <button class="primary" onclick="beginClose()">Play the Act Close</button>
        </div>
      </div>
    </div>`;
}
export function beginClose(){
  const G = State.G;
  const close = G.actClose[G.act];
  let el;
  const hidden = $('close-el');
  if(hidden && hidden.type==='hidden') el = hidden.value;
  else el = (document.querySelector('input[name="close-el"]:checked')||{}).value || TONES[0];
  G.current = {
    type:'close', starter:+$('close-starter').value, archIdx:+$('close-arch').value,
    card:{title:close.title, prompt:close.prompt, tone:null},
    element: close.elements[el],
    opening:($('close-opening').value||'').trim(),
    contributions:[], happened:'', adding:null, phase:'play'
  };
  renderScenePlay();
  show('scr-scene');
}
export function advanceAct(){
  const G = State.G;
  if(G.act>=3){ G.act=4; viewChronicle(false); }
  else startAct(G.act+1);
}
