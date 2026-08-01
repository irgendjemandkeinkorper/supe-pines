import { $, esc, ACT_NAMES } from '../engine/utils.js';
import { EPILOGUE_QUESTIONS } from '../data/index.js';
import { State } from '../engine/state.js';
import { openOverlay } from '../ui/screens.js';

const text = value => value === null || value === undefined ? '' : String(value);
const list = value => Array.isArray(value) ? value : [];
const first = (value, fallback) => text(value).trim() || fallback;

function heroTone(hero){
  if(!hero || !Array.isArray(hero.sides) || !hero.sides.length) return 'Unknown';
  const side = hero.sides[hero.flipped ? 1 : 0] || hero.sides[0];
  return first(side?.tone, 'Unknown');
}

export function buildMarkdown(){
  const G = State.G || {};
  const caseTitle = first(G.case?.title, 'An Untold Case');
  const threatName = first(G.threat?.name, 'the Unnamed Threat');
  const facts = list(G.threat?.facts);
  const heroes = list(G.heroes);
  const journal = list(G.journal);
  const acts = Number.isFinite(G.act) ? G.act : 0;
  const L = [];

  L.push('# THE MILLHAVEN DOSSIER');
  L.push(`## ${caseTitle}`);
  L.push(`*${acts > 3 ? 'Case file completed' : 'In-progress case file'} on the Threat known as **${threatName}**.*`, '');
  L.push('### Concerning the Threat');
  if(facts.length){
    facts.forEach(f=>{
      if(!f) return;
      L.push(`- **${first(f.who, 'Unnamed')}** (${first(f.role, 'No Role')}) — *“${text(f.q)}”* — ${text(f.a)}`);
    });
  } else L.push('- No Threat facts have been established yet.');

  L.push('', '### The Roster');
  if(heroes.length){
    heroes.forEach(h=>{
      if(!h) return;
      L.push(`- **${first(h.name || h.role, 'Unnamed Hero')}** — ${first(h.role, 'No Role')}${h.flipped?' *(turned)*':''} — Tone: ${heroTone(h)}`);
    });
  } else L.push('- The Heroes have not yet been dealt.');

  [1,2,3].forEach(act=>{
    const entries = journal.filter(e=>e && e.act===act && !e.struck);
    if(!entries.length) return;
    L.push('', `## ${ACT_NAMES[act] || `Act ${act}`}`);
    entries.forEach(e=>{
      if(e.type==='note'){
        if(text(e.text).trim()) L.push('', `*${text(e.text).trim()}*`);
        return;
      }
      if(e.type==='secret'){
        L.push('', `### ✧ A Buried Secret Revealed — ${first(e.playerName, 'Anonymous')}`);
        L.push(`> **“${first(e.question, 'A Secret')}”**`);
        const signals = list(e.signals).map(o=>first(o?.title, 'Unknown Signal')).filter(Boolean);
        L.push(`*Answered through the Signals: ${signals.length ? signals.join(', ') : 'no Signals'}.*`);
        if(text(e.answer).trim()) L.push('', text(e.answer).trim());
        return;
      }

      const isClose = e.type==='close';
      const contributions = list(e.contributions);
      const tones = list(e.tones).map(t=>first(t, 'Unknown')).filter(Boolean);
      L.push('', `### ${isClose?'ACT CLOSE — ':''}${first(e.cardTitle, 'An Untitled Card')}`);
      L.push(`*Led by ${first(e.playerName, 'Someone')} as ${first(e.archName, 'Unnamed Hero')} (${first(e.archRole, 'No Role')}). Tones: ${tones.length ? tones.join(', ') : 'None'}.*`);
      if(text(e.element).trim()) L.push(`*Commanded to include: ${text(e.element).trim()}*`);
      if(text(e.opening).trim()) L.push('', `> ${text(e.opening).trim().replace(/\n/g,'\n> ')}`);
      contributions.forEach(x=>{
        if(!x) return;
        const how = text(x.how).trim() ? ` — ${text(x.how).trim()}` : '';
        L.push(`- **${first(x.title, 'Untitled')}** (${first(x.playerName, 'Anonymous')})${how}`);
      });
      if(text(e.happened).trim()) L.push('', text(e.happened).trim());
      const flips = list(e.flips).filter(Boolean);
      if(flips.length) L.push('', `*${flips.join('; ')}.*`);
    });
  });

  if(acts>3){
    L.push('', '## Debrief Questions');
    list(EPILOGUE_QUESTIONS).forEach(q=>{ if(text(q).trim()) L.push(`- ${text(q).trim()}`); });
  }
  L.push('', '---', '*Played in Supe Pines — a superhero re-imagining after the design of Tall Pines by Miles Gaborit, by way of its sibling Bleakwood Vale.*');
  return L.join('\n');
}

export function copyChronicle(){
  const md = buildMarkdown();
  const done = ()=>{ const b=$('btn-copy'); if(b){ b.textContent='Copied to the Clipboard'; setTimeout(()=>b.textContent='Copy as Markdown',2200); } };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(md).then(done).catch(()=>fallbackCopy(md));
  else fallbackCopy(md);
}

export function fallbackCopy(md){
  $('overlay-content').innerHTML = `
    <h2 style="color:var(--gold)">Copy the Dossier</h2>
    <label class="small muted" for="fallback-md" style="display:block;margin-bottom:6px">Select all and copy:</label>
    <textarea style="min-height:340px" id="fallback-md">${esc(md)}</textarea>
    <div class="btnrow"><button onclick="closeOverlay()">Close</button></div>`;
  openOverlay();
  const t=$('fallback-md'); t.focus(); t.select();
}

export function downloadChronicle(){
  const blob = new Blob([buildMarkdown()], {type:'text/markdown'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'supe-pines-dossier.md';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}
