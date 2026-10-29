/* Online lobby, Hero setup, and naming the Threat. */
import { $, esc, toneBadge, ROMAN, progressDotsHTML } from '../../engine/utils.js';
import { villainForCase } from '../../data/index.js';
import { State } from '../../engine/state.js';
import { HEROES_PER_GAME } from '../../engine/rules.js';
import { getUid } from '../../sync/auth.js';
import { ART_STYLES, normalizeArtStyle } from '../art.js';
import { liveBeginTale, liveSaveHeroSetup, liveFinishThreat } from '../../sync/liveActions.js';
import { session } from './session.js';
import { mySeatIndex } from './session.js';
import { fail, withPendingState } from './errors.js';
import { leaveOnlineRoom } from './entry.js';

/* ---------------- lobby ---------------- */
export function renderOnlineLobby(room){
  const uid = getUid();
  const isHost = uid===room.hostUid;
  const seatCount = room.players.length;
  const emptySeats = Math.max(0, 6-seatCount);
  $('scr-online-lobby').innerHTML = `
    <h2 class="center">The Team Gathers</h2>
    <div class="ornament">❦</div>
    <div class="panel u-col-640">
      <p class="small u-gold">${esc(room.case.title)}</p>
      <p class="small muted">${esc(room.case.epigraph)}</p>
      <p class="small u-gold">Visual language: ${esc(ART_STYLES.find(style=>style.id===normalizeArtStyle(room.artStyle))?.label || 'Bold Comic')}</p>
      <p class="center" style="margin:14px 0">
        <span class="sc" style="color:var(--gold);font-size:.85rem;letter-spacing:.15em">ROOM CODE</span><br>
        <span style="font-size:2.2rem;letter-spacing:.3em;color:var(--text-parchment-bright)">${esc(State.onlineRoomCode)}</span>
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
export function renderOnlineHeroSetup(room){
  const i = room.archIdx, a = room.heroes[i];
  const answerer = room.players[i % room.players.length];
  const isMe = mySeatIndex(room) === (i % room.players.length);
  const showForm = isMe || session.draft.answeringForAbsent;
  $('scr-archsetup').innerHTML = `
    <p class="center muted sc" style="letter-spacing:.2em">PROFILING THE THREAT</p>
    ${progressDotsHTML(i, HEROES_PER_GAME, `Question ${ROMAN[i+1]} of VI`)}
    <div class="ornament">❦</div>
    <div class="u-col-640">
      <div class="card">
        <div class="c-kicker">Hero</div>
        <div class="c-title" style="font-size:1.5rem">${a.role}</div>
        <div class="c-prompt">${a.flavor}</div>
        <hr class="rule" style="border-color:rgba(60,45,25,.3)">
        <div style="font-size:1.05rem">“${a.setup[room.case.id]}”</div>
        <div class="small u-mt-8 u-blood-dark">${toneBadge(a.sides[0].tone)} <span class="u-ink-soft">— ${esc(a.sides[0].cond)} flip this card.</span></div>
      </div>
      <div class="panel">
        ${showForm ? `
          <p class="small muted">${isMe ? 'Answer in character, or plainly. The answer becomes a fact about the Threat and about this Hero.' : `Answering on behalf of ${esc(answerer.name)}, since they’re away.`}</p>
          <label class="fld" for="arch-name">Name this Hero</label>
          <input type="text" id="arch-name" placeholder="e.g. The Nightwatch">
          <label class="fld" for="arch-answer">The answer</label>
          <textarea id="arch-answer" placeholder="What is established…"></textarea>
          <div class="btnrow"><button class="primary" onclick="onlineSaveHeroSetup(this)">${i<5?'Next Question':'To the Threat'}</button></div>
        ` : `
          <p class="small muted center">Waiting on ${esc(answerer.name)} to answer…</p>
          <p class="center"><button class="ghost" onclick="onlineAnswerForAbsent()">Answer for them, if they’re away</button></p>
        `}
      </div>
    </div>`;
}
export function onlineAnswerForAbsent(){ session.draft.answeringForAbsent = true; renderOnlineHeroSetup(State.G); }
export async function onlineSaveHeroSetup(btn){
  try{
    const name = $('arch-name').value, answer = $('arch-answer').value;
    await withPendingState(btn, "Saving...", () => liveSaveHeroSetup(State.onlineRoomCode, name, answer));
  } catch(err){ fail(err); }
}

/* ---------------- the threat ---------------- */
export function renderOnlineThreatSetup(room){
  const profile = room.threat?.profile || villainForCase(room.case?.id);
  $('scr-victim').innerHTML = `
    <h2 class="center">The Threat</h2>
    <p class="center muted" style="max-width:640px;margin:6px auto">${room.case.threatLine}</p>
    <div class="ornament">❦</div>
    <div class="u-col-680">
      <div class="panel tight">
        ${room.threat.facts.map(f=>`<p class="small" style="margin:6px 0"><span class="u-gold">${esc(f.role)}:</span> <span>${esc(f.a)}</span></p>`).join('')}
      </div>
      <div class="panel">
        <div class="threat-profile">
          <div class="c-kicker">Threat profile · ${esc(profile?.faction || 'Millhaven')}</div>
          <h3>${esc(profile?.name || 'The Unnamed Threat')}</h3>
          <p class="small">${esc(profile?.threat || room.case.threatLine)}</p>
          <p class="small"><strong>Power:</strong> ${esc(profile?.power || 'Unknown')}</p>
          <p class="small"><strong>Flaw:</strong> ${esc(profile?.flaw || 'Unknown')}</p>
        </div>
        <label class="fld" for="victim-name">Name the Threat at your table</label>
        <input type="text" id="victim-name" placeholder="${esc(profile?.name || 'The Unnamed Threat')}">
        <div class="btnrow"><button class="primary" onclick="onlineFinishThreatSetup(this)">Deal the Cards</button></div>
      </div>
    </div>`;
}
export async function onlineFinishThreatSetup(btn){
  try{ await withPendingState(btn, "Dealing Cards...", () => liveFinishThreat(State.onlineRoomCode, $('victim-name').value)); } catch(err){ fail(err); }
}
