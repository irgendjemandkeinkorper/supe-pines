/* Online act hub, private hand, and the Act Close intro. */
import { $, esc, toneBadge, toneCountBadge, ACT_NAMES, actTrackHTML } from '../../engine/utils.js';
import { TONES } from '../../data/index.js';
import { State } from '../../engine/state.js';
import { show } from '../screens.js';
import { heroCard, signalCard, sceneCardHTML, journalEntrySummaryHTML } from '../cards.js';
import { actToneCounts } from '../../engine/rules.js';
import { liveBeginClose, liveTradeSignal, liveForfeitScene, liveSetReadyRole, liveVoteOmenReplacement } from '../../sync/liveActions.js';
import { session } from './session.js';
import { mySeatIndex } from './session.js';
import { fail, withPendingState } from './errors.js';
import { renderOnlineScenePick } from './scene.js';

/* ---------------- hub ---------------- */
export function onlineTurnSeatHTML(room,p,i,mySeat){
  const isMe = i===mySeat;
  const noWayToLead = p.handCount===0 && (p.signals.length===0 || room.sceneDeck.length===0);
  const needsTrade = p.handCount===0 && !noWayToLead;
  const state = p.scenesLeft<=0 ? 'done' : noWayToLead ? 'blocked' : needsTrade ? 'trade' : 'ready';
  const label = state==='done' ? 'Finished this act' : state==='blocked' ? 'No card to lead' : state==='trade' ? 'Trade first' : isMe ? 'You are ready' : 'Ready to lead';
  return `<div class="turn-seat ${state}${isMe?' mine':''}">
    <div class="turn-seat-head"><strong>${esc(p.name)}${isMe?' · you':''}</strong><span>${label}</span></div>
    <p>${p.scenesLeft} scene${p.scenesLeft===1?'':'s'} left to lead · ${p.handCount} scene card${p.handCount===1?'':'s'} · ${p.signals.length} held Signal${p.signals.length===1?'':'s'}</p>
    <div class="ready-role-row" aria-label="${esc(p.name)} scene preference">
      ${['lead','follow','watch'].map(role=>`<button class="ghost ${p.readyRole===role?'selected':''}" onclick="onlineSetReadyRole('${role}')" ${i!==mySeat?'disabled':''}>Ready to ${role}</button>`).join('')}
    </div>
    <div class="turn-seat-actions">
      ${state==='ready' && isMe?'<button class="primary" onclick="onlineStartScene()">Begin a scene</button>':''}
      ${state==='blocked' && p.scenesLeft>0?`<button class="blood" onclick="onlineForfeitScene(${i}, this)">${isMe?'Forfeit my scene':`Forfeit for ${esc(p.name)}`}</button>`:''}
      ${isMe?`<button class="ghost" onclick="openOnlineHand()">View my cards (${session.myPrivate.hand.length+p.signals.length})</button>`:''}
    </div>
  </div>`;
}

export function onlineMyHandHTML(room,mySeat){
  const me = room.players[mySeat];
  if(!me) return '';
  return `<details class="disclose personal-hand" id="online-my-hand">
    <summary>My Hand <span class="small muted">${session.myPrivate.hand.length} scene card${session.myPrivate.hand.length===1?'':'s'} · ${me.signals.length} Signal${me.signals.length===1?'':'s'} · private to this screen</span></summary>
    <div class="disclose-body">
      <p class="hand-section-label">Scene cards · ${session.myPrivate.hand.length}</p>
      <div class="cardgrid hand-cardgrid">${session.myPrivate.hand.map(c=>sceneCardHTML(c)).join('') || '<span class="small muted">No scene cards in hand.</span>'}</div>
      ${me.signals.length?`<p class="hand-section-label">Held Signals · ${me.signals.length}</p><div class="cardgrid hand-cardgrid">${me.signals.map((o,oi)=>`
        <div class="held-card">${signalCard(o)}${room.sceneDeck.length?`<button class="ghost" onclick="onlineTradeOmen(${oi}, this)">Trade for a scene card</button>`:''}</div>`).join('')}</div>`:''}
      ${session.myPrivate.secrets.map(s=>`<details class="secretbox"><summary>Buried Secret ${s.used?'— revealed':'(yours alone to read)'}</summary>
        <div class="small u-mt-6">${s.combo.map(toneBadge).join(' ')}<br><span class="u-secret">${esc(s.q)}</span>
        ${s.used?'':'<br><span class="muted">Unlocks when a scene’s tones contain this combination.</span>'}</div></details>`).join('')}
    </div>
  </details>`;
}

export function renderOnlineHub(room){
  const mySeat = mySeatIndex(room);
  const me = room.players[mySeat];
  const close = room.actClose[room.act];
  const remaining = room.players.reduce((s,p)=>s+p.scenesLeft,0);
  const banner = room.pendingSecret ? `<div class="notice">A Buried Secret is being revealed at the table right now…</div>` : '';
  const iCanLead = me && me.scenesLeft>0 && me.handCount>0;
  $('scr-hub').innerHTML = `
    <h2 class="center u-mt-8">${ACT_NAMES[room.act]}</h2>
    <p class="center"><span class="pill">Room code: <strong>${esc(State.onlineRoomCode||'')}</strong></span></p>
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
    ${room.journal.length ? `<h3 class="u-gold">Last Scene</h3>${journalEntrySummaryHTML(room.journal[room.journal.length-1], {compact:true})}` : ''}
    <div class="panel tight">
      <h3 class="u-blood">The Act Close — foreseen</h3>
      <p><span class="sc u-parchment-bright">${esc(close.title)}.</span> <span class="muted small">${esc(close.cond)}</span></p>
      <p class="small u-parchment">${esc(close.prompt)}</p>
      <p class="small muted">${TONES.map(t=>`${toneBadge(t)} <span>${esc(close.elements[t])}</span>`).join('<br>')}</p>
    </div>
    <details class="disclose" open>
      <summary>The Heroes <span class="small muted">(${room.heroes.length})</span></summary>
      <div class="disclose-body">
        <div class="pgrid u-grid-cards u-mt-8">
          ${room.heroes.map(a=>heroCard(a)).join('')}
        </div>
      </div>
    </details>
    <details class="disclose" open>
      <summary>The Signal Row <span class="small muted">(${room.signalRow.length})</span></summary>
      <div class="disclose-body">
        <div class="cardgrid compact">${room.signalRow.map((o,i)=>`<div class="card-vote-wrap">${signalCard(o,null,i)}<button class="ghost" onclick="onlineVoteOmenReplacement(${i}, this)">Vote to replace <span class="small muted">(${(room.omenVotes?.[String(i)]||[]).length}/${room.players.length})</span></button></div>`).join('')}</div>
      </div>
    </details>
    <details class="disclose">
      <summary>The Storytellers <span class="small muted">${room.players.length} in play · Scene deck ${room.sceneDeck.length} · Signal deck ${room.signalDeck.length}</span></summary>
      <div class="disclose-body">
        <div class="pgrid u-mt-8">
          ${room.players.map((p,i)=>onlinePlayerPanel(p,i===mySeat)).join('')}
        </div>
      </div>
    </details>`;
}
export function onlinePlayerPanel(p, isMe){
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
  session.draft = {cardIdx:null, archIdxs:[]};
  renderOnlineScenePick();
  show('scr-scene');
}
export async function onlineTradeOmen(signalIdx, btn){
  try{ await withPendingState(btn, "Trading...", () => liveTradeSignal(State.onlineRoomCode, signalIdx)); } catch(err){ fail(err); }
}
export async function onlineSetReadyRole(role, btn){
  try{ await withPendingState(btn, "Saving...", () => liveSetReadyRole(State.onlineRoomCode, role)); } catch(err){ fail(err); }
}
export async function onlineVoteOmenReplacement(signalIndex, btn){
  try{ await withPendingState(btn, "Voting...", () => liveVoteOmenReplacement(State.onlineRoomCode, signalIndex)); } catch(err){ fail(err); }
}
export async function onlineForfeitScene(seat, btn){
  try{ await withPendingState(btn, "Forfeiting...", () => liveForfeitScene(State.onlineRoomCode, seat)); } catch(err){ fail(err); }
}

/* ---------------- act close intro ---------------- */
export function renderOnlineCloseIntro(room){
  const close = room.actClose[room.act];
  const counts = actToneCounts();
  const max = Math.max(...TONES.map(t=>counts[t]));
  const tied = TONES.filter(t=>counts[t]===max);
  const chosenTone = tied[0];
  $('scr-close').innerHTML = `
    <h2 class="center u-blood">${ACT_NAMES[room.act]} draws to a close</h2>
    ${actTrackHTML(room.act)}
    <div class="ornament">✦</div>
    <div class="u-col-720">
      <div class="card">
        <div class="c-kicker">Act Close</div>
        <div class="c-title" style="font-size:1.4rem">${esc(close.title)}</div>
        <div class="c-prompt">${esc(close.prompt)}</div>
      </div>
      <div class="panel spotlight">
        <p class="small u-gold">${esc(close.cond)}</p>
        <p class="small muted">Tones this act: ${TONES.map(t=>toneCountBadge(t, counts[t])).join(' ')}</p>
        ${tied.length===1
          ? `<p><strong class="u-blood">Dominant tone: ${toneBadge(tied[0])}</strong> — must <span>${esc(close.elements[tied[0]])}</span></p>`
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
  session.draft.closeTone = chosenTone;
}
export async function onlineBeginClose(btn){
  try{
    const room = State.G;
    const close = room.actClose[room.act];
    const elHidden = $('close-el');
    const tone = elHidden ? elHidden.value : session.draft.closeTone;
    await withPendingState(btn, "Starting Act Close...", () => liveBeginClose(State.onlineRoomCode, +$('close-arch').value, +$('close-starter').value,
      close.elements[tone], $('close-opening').value, close.title, close.prompt));
  } catch(err){ fail(err); }
}
