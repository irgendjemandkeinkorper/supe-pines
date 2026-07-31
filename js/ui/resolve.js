import { $, esc, toneBadge } from '../engine/utils.js';
import { State } from '../engine/state.js';
import { show } from './screens.js';
import { faceUp, matchSecret } from '../engine/rules.js';
import { signalCard, sceneTrackerHTML } from './cards.js';
import { afterSceneFlow } from './hub.js';
import { saveGame } from '../engine/persistence.js';

/* ---------------- resolution ---------------- */
export function endScene(){
  State.G.current.happened = ($('scene-happened').value||'').trim();
  renderResolve();
  show('scr-resolve');
}
export function renderResolve(){
  const G = State.G;
  const c = G.current;
  $('scr-resolve').innerHTML = `
    ${sceneTrackerHTML(G,{phase:'resolve'})}
    <h2 class="center" style="margin-top:24px">The scene concludes</h2>
    <p class="center muted">Consult each Hero’s face-up condition. If it was met in this scene, turn the card.</p>
    <div class="ornament">❦</div>
    <div class="panel spotlight" style="max-width:680px;margin:0 auto">
      ${G.heroes.map((a,i)=>{
        const s = faceUp(a);
        return `<div class="panel tight" style="display:flex;gap:12px;align-items:flex-start">
          <input type="checkbox" id="flip-${i}" style="width:auto;margin-top:6px;transform:scale(1.3)">
          <label for="flip-${i}" style="cursor:pointer">
            <span class="sc" style="color:#eddfba">${esc(a.name||a.role)}</span>
            ${i===c.archIdx?'<span class="pill" style="border-color:var(--blood-bright);color:#e8c9c9">led this scene</span>':''}
            <br><span class="small" style="color:#b3a687">${esc(s.cond)}</span> ${toneBadge(s.tone)}
          </label>
        </div>`;
      }).join('')}
      <div class="btnrow">
        <button class="primary" onclick="applyResolve()">Count the Tones</button>
      </div>
    </div>`;
}
export function applyResolve(){
  const G = State.G;
  const c = G.current;
  const flips = [];
  G.heroes.forEach((a,i)=>{
    if($('flip-'+i).checked){ a.flipped = !a.flipped; flips.push(`${a.name||a.role} turned to side ${a.flipped?'II':'I'}`); }
  });
  const lead = G.heroes[c.archIdx];
  const tones = [];
  if(c.card.tone) tones.push(c.card.tone);
  c.contributions.forEach(x=>{ if(x.kind==='scene') tones.push(x.card.tone); });
  tones.push(faceUp(lead).tone);
  G.discardTones.push(...tones);
  c.contributions.forEach(x=>{ if(x.kind==='omen') G.players[x.pi].signals.push(x.card); });

  G.journal.push({
    type:c.type, act:G.act,
    playerName:G.players[c.starter].name,
    archName:lead.name||lead.role, archRole:lead.role,
    cardTitle:c.card.title, cardPrompt:c.card.prompt, element:c.element||null,
    opening:c.opening, happened:c.happened,
    contributions:c.contributions.map(x=>({playerName:G.players[x.pi].name, kind:x.kind,
      title:x.card.title, glyph:x.card.glyph||null, tone:x.card.tone||null, how:x.how})),
    tones:tones.slice(), flips, struck:false
  });

  if(c.type==='scene'){
    if(G.firstScenePlayer===null) G.firstScenePlayer = c.starter;
    G.players[c.starter].scenesLeft--;
  }
  if(c.type==='close') G.closeDone = true;

  const unlock = matchSecret(tones, c.starter);
  if(unlock){ unlock.tones = tones.slice(); renderSecretUnlock(unlock, tones); show('scr-secret'); }
  else afterSceneFlow();
  saveGame(unlock ? 'scr-secret' : 'scr-hub');
}

/* ---------------- secret scenes ---------------- */
export function renderSecretUnlock(unlock, tones){
  const G = State.G;
  State.secretSel = [];
  G.pendingSecret = unlock;
  const p = G.players[unlock.pi];
  $('scr-secret').innerHTML = `
    <div class="center" style="margin-top:20px">
      <div class="sc" style="color:#c9b3de;letter-spacing:.35em;font-size:.85rem">THE TONES ALIGN — ${tones.map(t=>t.toUpperCase()).join(', ')}</div>
      <h2 style="color:#c9b3de;margin-top:6px">A Buried Secret Comes to Light</h2>
      <p class="muted">${esc(p.name)}’s secret is unlocked. This is a bonus scene: theirs alone. No cards may be played into it.</p>
    </div>
    <div class="ornament" style="color:#8a63a8">✧</div>
    <div style="max-width:720px;margin:0 auto">
      <div class="secretbox" style="padding:16px">
        <div>${unlock.secret.combo.map(toneBadge).join(' ')}</div>
        <p style="font-size:1.15rem;color:#e0d4ec;margin-top:8px">“${esc(unlock.secret.q)}”</p>
      </div>
      <h3 style="color:#c9b3de;margin-top:16px">Choose three signals to answer with <span class="small" id="secret-count">(0 of 3)</span></h3>
      <div class="cardgrid compact">${G.signalRow.map((o,i)=>signalCard(o,'toggleSecretOmen',i)).join('')}</div>
      <div class="panel spotlight">
        <label class="fld" style="color:#c9b3de">The vignette</label>
        <p class="small muted" style="margin-bottom:6px">Use the three signals — literally, metaphorically, obliquely — to show us the answer.</p>
        <textarea id="secret-answer" style="min-height:120px" placeholder="Show us…"></textarea>
        <div class="btnrow">
          <button class="primary" id="btn-secret" disabled onclick="confirmSecret()">So It Is Revealed</button>
        </div>
      </div>
    </div>`;
}
export function toggleSecretOmen(i){
  const G = State.G;
  const need = Math.min(3, G.signalRow.length);
  const at = State.secretSel.indexOf(i);
  if(at>=0) State.secretSel.splice(at,1);
  else if(State.secretSel.length<need) State.secretSel.push(i);
  document.querySelectorAll('[id^="omen-pick-"]').forEach((el,idx)=>{
    const selected = State.secretSel.includes(idx);
    el.classList.toggle('selected', selected);
    el.setAttribute('aria-pressed', String(selected));
  });
  $('secret-count').textContent = `(${State.secretSel.length} of ${need})`;
  $('btn-secret').disabled = State.secretSel.length!==need;
}
export function confirmSecret(){
  const G = State.G;
  const u = G.pendingSecret, p = G.players[u.pi];
  u.secret.used = true;
  G.journal.push({
    type:'secret', act:G.act, playerName:p.name,
    question:u.secret.q, combo:u.secret.combo.slice(),
    signals:State.secretSel.map(i=>({glyph:G.signalRow[i].glyph, title:G.signalRow[i].title})),
    answer:($('secret-answer').value||'').trim(), struck:false
  });
  G.pendingSecret = null;
  afterSceneFlow();
  saveGame('scr-hub');
}
