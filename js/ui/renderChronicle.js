import { $, esc, nl2br, toneBadge, ACT_NAMES, casePhaseRail } from '../engine/utils.js';
import { TONES, TONE_GLOSS, EPILOGUE_QUESTIONS } from '../data/index.js';
import { State } from '../engine/state.js';
import { show, openOverlay, closeOverlay, dismissFirstrunHint } from './screens.js';
import { faceUp } from '../engine/rules.js';
import { liveToggleStrike } from '../sync/liveActions.js';
import { sceneAnatomyDiagramHTML } from './cards.js';
import { fail } from './online.js';
import { markIntroSeen } from '../engine/firstrun.js';

/* ---------------- the dossier ---------------- */
export function viewChronicle(interim){
  if(!State.G) return;
  if(interim){
    const active = document.querySelector('.screen.active');
    State.chronReturn = active ? active.id : 'scr-hub';
    if(State.chronReturn==='scr-chronicle') { return; }
  } else State.chronReturn = null;
  renderChronicle(interim);
  show('scr-chronicle');
}
export function returnFromChronicle(){ show(State.chronReturn||'scr-hub'); }

export function renderChronicle(interim){
  const G = State.G;
  const over = G.act>3;
  const entriesByAct = [1,2,3].map(act=>G.journal.filter(e=>e.act===act));
  const entryHTML = (e,gi,ri)=>{
    const delay = `style="animation-delay:${Math.min(ri,10)*0.04}s"`;
    const strike = `<button class="ghost" style="float:right;font-size:.7rem" onclick="toggleStrike(${gi},${interim?'true':'false'})">${e.struck?'restore':'☒ strike'}</button>`;
    if(e.type==='note') return `<div class="chron-entry${e.struck?' struck':''}" ${delay}>${strike}<span class="small muted">${esc(e.text)}</span></div>`;
    if(e.type==='secret') return `
      <div class="chron-entry secret${e.struck?' struck':''}" ${delay}>${strike}
        <div class="ce-head"><span class="ce-title" style="color:#c9b3de">A Buried Secret Revealed</span>
          <span class="ce-meta">${esc(e.playerName)} · ${e.combo.map(toneBadge).join(' ')}</span></div>
        <p class="ce-q">“${esc(e.question)}”</p>
        <p class="small muted">Answered through the signals: ${e.signals.map(o=>`${o.glyph} ${esc(o.title)}`).join(' · ')}</p>
        ${e.answer?`<blockquote>${nl2br(e.answer)}</blockquote>`:''}
      </div>`;
    return `
      <div class="chron-entry ${e.type==='close'?'close':''}${e.struck?' struck':''}" ${delay}>${strike}
        <div class="ce-head">
          <span class="ce-title">${e.type==='close'?'ACT CLOSE — ':''}${esc(e.cardTitle)}</span>
          <span class="ce-meta">led by ${esc(e.playerName)} as ${esc(e.archName)} (${esc(e.archRole)})</span>
        </div>
        <span class="ce-meta">Tones: ${e.tones.map(toneBadge).join(' ')}</span>
        ${e.element?`<p class="small" style="color:var(--blood-bright)">Commanded to include: ${esc(e.element)}</p>`:''}
        ${e.opening?`<blockquote>${nl2br(e.opening)}</blockquote>`:''}
        ${e.contributions.map(x=>`<p class="small"><span style="color:var(--gold)">${x.kind==='omen'?(x.glyph+' '):''}${esc(x.title)}</span> <span class="muted">(${esc(x.playerName)})</span>${x.how?` — <span>${esc(x.how)}</span>`:''}</p>`).join('')}
        ${e.happened?`<p style="color:#e3d7b8">${nl2br(e.happened)}</p>`:''}
        ${e.flips.length?`<p class="small muted">${e.flips.map(esc).join('; ')}.</p>`:''}
      </div>`;
  };
  let gi=-1, ri=0;
  const acts = entriesByAct.map((list,ai)=> list.length ? `
    <h3 class="sc" style="color:var(--gold);margin-top:22px">${ACT_NAMES[ai+1]}</h3>
    ${list.map(e=>{gi=G.journal.indexOf(e);return entryHTML(e,gi,ri++);}).join('')}` : '').join('');

  $('scr-chronicle').innerHTML = `
    ${casePhaseRail('dossier', over ? 'Read the finished case together.' : 'Review what the table has made so far.')}
    <div class="masthead" style="padding-top:16px">
      <div class="m-over">${over?'The Case Is Closed':'The Dossier, So Far'}</div>
      <h1 style="font-size:2.4rem">THE MILLHAVEN DOSSIER</h1>
      <div class="m-sub">${esc(G.case.title)} · a case file on the Threat known as ${esc(G.threat.name)}</div>
    </div>
    <div class="panel tight">
      <h3 style="color:var(--gold)">Concerning the Threat</h3>
      ${G.threat.facts.map(f=>`<p class="small" style="margin:5px 0"><span style="color:var(--gold)">${esc(f.who)}, ${esc(f.role)}</span> — <span class="muted">“${esc(f.q)}”</span><br>${esc(f.a)}</p>`).join('')}
    </div>
    <div class="panel tight">
      <h3 style="color:var(--gold)">The Roster</h3>
      ${G.heroes.map(a=>`<p class="small" style="margin:4px 0"><span class="sc" style="color:#eddfba">${esc(a.name||a.role)}</span> — ${esc(a.role)}${a.flipped?' <span style="color:var(--blood-bright)">(turned)</span>':''} ${toneBadge(faceUp(a).tone)}</p>`).join('')}
    </div>
    ${acts || '<p class="center muted" style="margin-top:20px">Nothing is yet written. The file is still thin.</p>'}
    ${over?`
      <div class="ornament">❦ ✦ ❦</div>
      <div class="panel">
        <h3 style="color:var(--gold)">Debrief Questions</h3>
        ${EPILOGUE_QUESTIONS.map(q=>`<p class="small" style="color:#cfc2a2;margin:8px 0">— ${esc(q)}</p>`).join('')}
      </div>`:''}
    <div class="btnrow" style="justify-content:center;margin-top:20px">
      ${interim?`<button class="primary" onclick="returnFromChronicle()">Return to the Case</button>`:''}
      <button onclick="copyChronicle()" id="btn-copy">Copy as Markdown</button>
      <button onclick="downloadChronicle()">Download the Dossier</button>
      ${over?`<button class="blood" onclick="startNewCase()">Open Another Case</button>`:''}
    </div>
    <p class="small muted center" style="margin-top:8px">Anything stricken from the record never was. No questions asked; no reasons owed.</p>`;
}
export function toggleStrike(gi, interim){
  if(State.onlineRoomCode){
    liveToggleStrike(State.onlineRoomCode, gi).catch(err=>fail(err));
    return; // the onSnapshot listener re-renders once the write lands
  }
  State.G.journal[gi].struck = !State.G.journal[gi].struck;
  renderChronicle(interim);
}

/* ---------------- rules overlay ---------------- */
export function showRules(){
  // Reading the rules from any entry point (title screen, case select,
  // scene primer) permanently retires this device's first-run nudges.
  markIntroSeen();
  dismissFirstrunHint();
  $('overlay-content').innerHTML = `
    <h2 style="color:var(--gold)">How the Case Is Run</h2>
    <div class="panel tight small" style="line-height:1.7">
      <p><strong style="color:var(--gold)">The shape of it.</strong> One sitting, three acts, one Threat. You will profile the Threat by answering questions, then take turns beginning scenes — each storyteller begins one scene per act (more in small groups; three in solo). After everyone's scenes, the Act Close plays, and a new act begins. After the third close, the Dossier is complete.</p>
    </div>

    <h3 class="center" style="color:var(--gold);margin-top:16px">Anatomy of a Scene</h3>
    ${sceneAnatomyDiagramHTML()}

    <div class="panel tight small" style="line-height:1.7">
      <p><strong style="color:var(--gold)">Beginning a scene.</strong> Choose a scene card from your hand and a Hero to lead it. Describe what the camera sees as the scene opens, then narrate freely — as director, as actor, or both. Cast the others in roles; no one owns any character. The prompt on the card is a door, not a cage.</p>
      <p><strong style="color:var(--gold)">Buying in.</strong> Any other storyteller may play one card into your scene — a scene card from their hand, or a signal from the row — and describe how it manifests. Three cards at most may enter a scene, counting the first. The one who began the scene decides when it ends.</p>
      <div class="rules-example">For example: Alice begins with <strong>Rooftop Standoff</strong> (Guilt), led by The Nightwatch. Bob plays <strong>A Dead Scanner Channel</strong> from the signal row, describing the silence right before the call came in. That's two cards in the scene — one more storyteller could still buy in before Alice ends it.</div>
      <p><strong style="color:var(--gold)">Signals.</strong> Interpret them literally, metaphorically, or obliquely. They accrue meaning with each recurrence. After a scene, a signal you played returns to you; trade it back to the signal deck at the table any time to draw a fresh scene card. If you must begin a scene with no scene card and no signal to trade, you lose your scene for the act.</p>
      <div class="rules-example">For example: if <strong>A Torn Flyer</strong> has already appeared twice this session — once literally, once as a metaphor for a promise nobody kept — a third appearance doesn't need explaining. The table already knows what it means now.</div>
      <p><strong style="color:var(--gold)">Turning the Heroes.</strong> When a scene ends, check every Hero's face-up condition — if it was met, the card turns, and its tone changes with it.</p>
      <p><strong style="color:var(--gold)">The tones.</strong> ${TONES.map(t=>`<span>${t}</span> — ${TONE_GLOSS[t]}`).join(' ')}</p>
      <p><strong style="color:var(--gold)">Buried Secrets.</strong> Each storyteller holds one secret keyed to a combination of tones. When a scene's counted tones contain that combination, the secret comes to light at once: a bonus vignette told through three signals, answering the secret's question. Each secret is revealed but once.</p>
      <div class="rules-example">For example: a scene's counted tones land on Guilt, Guilt, Dread. If a storyteller holds a secret keyed to exactly that combination, it comes to light immediately — even mid-act, before the next storyteller begins their own scene.</div>
      <p><strong style="color:var(--gold)">The Act Close.</strong> Its condition names who begins it; the act's most numerous tone commands an element it must include. Others may buy in as usual.</p>
      <div class="rules-example">For example: if Dread came up most often this act, the Close might command "include a light that goes out and will not come back on" — whoever the condition names begins the scene, and must weave that in somewhere.</div>
      <p><strong style="color:var(--blood-bright)">The Strike.</strong> Anyone may strike anything from the story at any moment — no questions asked, no reasons owed. Use the ☒ in the Dossier, or simply say so aloud. The stricken thing never was. Care for the people at your table above all else.</p>
    </div>
    <div class="btnrow"><button class="primary" onclick="closeOverlay()">Return</button></div>`;
  openOverlay();
  $('overlay-content').querySelector('button')?.focus();
}

export function initOverlayDismiss(){
  // Deliberately no click-outside-to-close: the Gallery's grid doesn't fill
  // the overlay width, so a stray click in the margin beside a card used to
  // close the whole thing — jarring. Escape and the explicit close buttons
  // remain the ways out.
  document.addEventListener('keydown', e=>{
    if(e.key!=='Escape') return;
    if($('overlay').style.display==='block'){ closeOverlay(); return; }
    // No other screen currently has a "close" concept — the overlay is
    // the only modal-like surface in the app today.
  });
}
