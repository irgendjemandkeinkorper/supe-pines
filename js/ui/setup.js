import { $, esc, shuffle, ROMAN, toneBadge, progressDotsHTML } from '../engine/utils.js';
import { CASES, HEROES, SECRETS, SIGNALS, ACT_CLOSES } from '../data/index.js';
import { State } from '../engine/state.js';
import { show } from './screens.js';
import { startAct } from './hub.js';
import { HEROES_PER_GAME } from '../engine/rules.js';
import { hasSeenIntro } from '../engine/firstrun.js';

/* ---------------- setup: cases ---------------- */
export function renderHooks(){
  const hintEl = $('case-firsttime-hint');
  if(hintEl) hintEl.style.display = hasSeenIntro() ? 'none' : 'flex';
  $('case-list').innerHTML = CASES.map((h,i)=>`
    <div class="casecard" onclick="chooseCase(${i})">
      <div class="sc" style="color:var(--blood-bright);font-size:.75rem;letter-spacing:.25em">CASE ${ROMAN[i+1]}</div>
      <h3>${h.title}</h3>
      <div class="h-epi">${h.epigraph}</div>
      <hr class="rule">
      <div class="small" style="color:#cfc2a2">${h.threatLine}</div>
    </div>`).join('');
}
export function chooseCase(i){ State.pendingCase = CASES[i]; show('scr-players'); renderPlayerInputs(); }

/* ---------------- setup: players ---------------- */
export function renderPlayerInputs(){
  const n = +$('pl-count').value;
  let html='';
  for(let i=0;i<n;i++){
    html += `<label class="fld">Storyteller ${ROMAN[i+1]}</label>
             <input type="text" id="pl-name-${i}" placeholder="Name (optional)">`;
  }
  $('pl-names').innerHTML = html;
  $('pl-note').textContent =
    n===1 ? 'Solo mode: you will voice every Hero, play three scenes per act, and carry two Buried Secrets.' :
    n===2 ? 'Two storytellers: each of you begins two scenes per act.' :
    'Each storyteller begins one scene per act. Heroes belong to no one — pass them freely.';
}
export function confirmPlayers(){
  const n = +$('pl-count').value;
  const players=[];
  for(let i=0;i<n;i++){
    const v = ($('pl-name-'+i).value||'').trim();
    players.push({name: v || `Storyteller ${ROMAN[i+1]}`, hand:[], signals:[], secrets:[], scenesLeft:0});
  }
  State.G = {
    case: State.pendingCase, players, act:0,
    heroes: shuffle(HEROES).slice(0,HEROES_PER_GAME).map(a=>({...a, name:'', setupA:'', answeredBy:'', flipped:false})),
    threat:{name:'', facts:[]},
    sceneDeck:[], discardTones:[], signalDeck:[], signalRow:[],
    actClose:{1:shuffle(ACT_CLOSES[1])[0], 2:shuffle(ACT_CLOSES[2])[0], 3:shuffle(ACT_CLOSES[3])[0]},
    journal:[], current:null, archIdx:0, firstScenePlayer:null, closeDone:false
  };
  const G = State.G;
  $('intro-text').innerHTML = G.case.intro;
  show('scr-intro');
}

/* ---------------- setup: heroes ---------------- */
export function beginArchSetup(){ State.G.archIdx=0; renderArchSetup(); show('scr-archsetup'); }
export function renderArchSetup(){
  const G = State.G;
  const i = G.archIdx, a = G.heroes[i];
  const answerer = G.players[i % G.players.length];
  $('scr-archsetup').innerHTML = `
    <p class="center muted sc" style="letter-spacing:.2em">PROFILING THE THREAT</p>
    ${progressDotsHTML(i, 6, `Question ${ROMAN[i+1]} of VI`)}
    <div class="ornament">❦</div>
    <div style="max-width:640px;margin:0 auto">
      <div class="card">
        <div class="c-kicker">Hero</div>
        <div class="c-title" style="font-size:1.5rem">${a.role}</div>
        <div class="c-prompt">${a.flavor}</div>
        <hr class="rule" style="border-color:rgba(60,45,25,.3)">
        <div style="font-size:1.05rem">“${a.setup[G.case.id]}”</div>
        <div class="small" style="margin-top:8px;color:var(--blood)">${toneBadge(a.sides[0].tone)} <span style="color:var(--ink-soft)">— ${esc(a.sides[0].cond)} flip this card.</span></div>
      </div>
      <div class="panel">
        <p class="small muted">${esc(answerer.name)} answers — in character, or plainly. The answer becomes a fact about the Threat and about this Hero.</p>
        <label class="fld">Name this Hero</label>
        <input type="text" id="arch-name" placeholder="e.g. The Nightwatch">
        <label class="fld">The answer</label>
        <textarea id="arch-answer" placeholder="What is established…"></textarea>
        <div class="btnrow">
          <button class="primary" onclick="saveArchSetup()">${i<5?'Next Question':'To the Threat'}</button>
        </div>
      </div>
    </div>`;
}
export function saveArchSetup(){
  const G = State.G;
  const a = G.heroes[G.archIdx];
  a.name = ($('arch-name').value||'').trim() || a.role;
  a.setupA = ($('arch-answer').value||'').trim() || '(left unspoken)';
  a.answeredBy = G.players[G.archIdx % G.players.length].name;
  G.threat.facts.push({role:a.role, who:a.name, q:a.setup[G.case.id], a:a.setupA});
  G.archIdx++;
  if(G.archIdx<6){ renderArchSetup(); window.scrollTo(0,0); }
  else renderVictim();
}

/* ---------------- setup: the threat ---------------- */
export function renderVictim(){
  const G = State.G;
  $('scr-victim').innerHTML = `
    <h2 class="center">The Threat</h2>
    <p class="center muted" style="max-width:640px;margin:6px auto">${G.case.threatLine}</p>
    <div class="ornament">❦</div>
    <div style="max-width:680px;margin:0 auto">
      <div class="panel tight">
        ${G.threat.facts.map(f=>`<p class="small" style="margin:6px 0"><span style="color:var(--gold)">${esc(f.role)}:</span> <span>${esc(f.a)}</span></p>`).join('')}
      </div>
      <div class="panel">
        <label class="fld">Together, name the Threat</label>
        <input type="text" id="victim-name" placeholder="This is usually the hardest part.">
        <div class="btnrow">
          <button class="primary" onclick="finishVictim()">Deal the Cards</button>
        </div>
      </div>
    </div>`;
  show('scr-victim');
}
export function finishVictim(){
  const G = State.G;
  G.threat.name = ($('victim-name').value||'').trim() || 'The Unnamed Threat';
  // signals & secrets are dealt once, at the start
  G.signalDeck = shuffle(SIGNALS);
  G.signalRow = G.signalDeck.splice(0,6);
  const secrets = shuffle(SECRETS);
  G.players.forEach(p=>{ p.secrets=[{...secrets.pop(), used:false}]; });
  if(G.players.length===1) G.players[0].secrets.push({...secrets.pop(), used:false});
  startAct(1);
}
