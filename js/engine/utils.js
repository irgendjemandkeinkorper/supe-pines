export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const nl2br = s => esc(s).replace(/\n/g,'<br>');
export function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export const toneBadge = t => `<span class="tone ${t}">${t}</span>`;
export const ACT_NAMES = ['','Act the First','Act the Second','Act the Third'];
// Covers up to 12 so numbering a longer Case roster never silently breaks.
export const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

export const CASE_PHASES = [
  {id:'case', label:'Choose Case'},
  {id:'gather', label:'Gather'},
  {id:'profile', label:'Profile Heroes'},
  {id:'threat', label:'Name Threat'},
  {id:'acts', label:'Run the Acts'},
  {id:'dossier', label:'Write Dossier'}
];

export function casePhaseRail(active='case', caption=''){
  const activeIndex = Math.max(0, CASE_PHASES.findIndex(phase => phase.id === active));
  return `<nav class="case-phase-rail" aria-label="Case progress">
    ${CASE_PHASES.map((phase, index) => `
      ${index ? '<span class="cpr-line" aria-hidden="true"></span>' : ''}
      <span class="cpr-node ${index<activeIndex?'done ':''}${index===activeIndex?'current':''}" aria-current="${index===activeIndex?'step':'false'}">
        <span class="cpr-dot" aria-hidden="true">${index<activeIndex?'✓':index+1}</span>
        <span class="cpr-label">${esc(phase.label)}</span>
      </span>`).join('')}
    ${caption?`<span class="cpr-caption">${esc(caption)}</span>`:''}
  </nav>`;
}

/* A row of dots marking progress through a fixed sequence (e.g. the six
   hero setup questions) — done/current/upcoming, plus a text label
   for the current step. */
export function progressDotsHTML(current, total, label){
  const dots = Array.from({length: total}, (_, i) => {
    const cls = i < current ? 'done' : i === current ? 'current' : '';
    return `<span class="pd-dot ${cls}"></span>`;
  }).join('');
  return `<div class="progress-dots">${dots}<span class="pd-label">${esc(label)}</span></div>`;
}

/* A three-node track marking which act is done/current/upcoming. */
export function actTrackHTML(act){
  return `<div class="act-track">${[1,2,3].map((n,i)=>
    `${i>0?'<span class="at-line"></span>':''}<span class="at-node ${act>n?'done':act===n?'current':''}">${ROMAN[n]}</span>`
  ).join('')}</div>`;
}
/* Matches the slug algorithm documented in art/IMAGE_PROMPTS.md — keep
   the two in sync if either changes, since that doc is the human-facing
   spec for where generated art files belong on disk. */
export const slugify = s => String(s).toLowerCase()
  .replace(/[’'′`]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
