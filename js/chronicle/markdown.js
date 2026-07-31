import { $, esc, ACT_NAMES } from '../engine/utils.js';
import { EPILOGUE_QUESTIONS } from '../data/index.js';
import { State } from '../engine/state.js';
import { faceUp } from '../engine/rules.js';
import { openOverlay } from '../ui/screens.js';

export function buildMarkdown(){
  const G = State.G;
  const L = [];
  L.push('# THE MILLHAVEN DOSSIER');
  L.push(`## ${G.case.title}`);
  L.push(`*Case file compiled on the Threat known as **${G.threat.name}**.*`, '');
  L.push('### Concerning the Threat');
  G.threat.facts.forEach(f=>L.push(`- **${f.who}** (${f.role}) — *“${f.q}”* — ${f.a}`));
  L.push('', '### The Roster');
  G.heroes.forEach(h=>L.push(`- **${h.name||h.role}** — ${h.role}${h.flipped?' *(turned)*':''} — Tone: ${faceUp(h).tone}`));
  [1,2,3].forEach(act=>{
    const list = G.journal.filter(e=>e.act===act && !e.struck);
    if(!list.length) return;
    L.push('', `## ${ACT_NAMES[act]}`);
    list.forEach(e=>{
      if(e.type==='note'){ L.push('', `*${e.text}*`); return; }
      if(e.type==='secret'){
        L.push('', `### ✧ A Buried Secret Revealed — ${e.playerName}`);
        L.push(`> **“${e.question}”**`);
        L.push(`*Answered through the signals: ${e.signals.map(o=>o.title).join(', ')}.*`);
        if(e.answer) L.push('', e.answer);
        return;
      }
      L.push('', `### ${e.type==='close'?'ACT CLOSE — ':''}${e.cardTitle}`);
      L.push(`*Led by ${e.playerName} as ${e.archName} (${e.archRole}). Tones: ${e.tones.join(', ')}.*`);
      if(e.element) L.push(`*Commanded to include: ${e.element}*`);
      if(e.opening) L.push('', `> ${e.opening.replace(/\n/g,'\n> ')}`);
      e.contributions.forEach(x=>L.push(`- **${x.title}** (${x.playerName})${x.how?` — ${x.how}`:''}`));
      if(e.happened) L.push('', e.happened);
      if(e.flips.length) L.push('', `*${e.flips.join('; ')}.*`);
    });
  });
  if(G.act>3){
    L.push('', '## Debrief Questions');
    EPILOGUE_QUESTIONS.forEach(q=>L.push(`- ${q}`));
  }
  L.push('', '---', '*Played in Supe Pines — a superhero re-imagining after the design of Tall Pines by Miles Gaborit, by way of its sibling Bleakwood Vale.*');
  return L.join('\n');
}
export function copyChronicle(){
  const md = buildMarkdown();
  const done = ()=>{ const b=$('btn-copy'); if(b){ b.textContent='Copied to the Clipboard'; setTimeout(()=>b.textContent='Copy as Markdown',2200); } };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(md).then(done).catch(()=>fallbackCopy(md));
  } else fallbackCopy(md);
}
export function fallbackCopy(md){
  $('overlay-content').innerHTML = `
    <h2 style="color:var(--gold)">Copy the Dossier</h2>
    <p class="small muted">Select all and copy:</p>
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
