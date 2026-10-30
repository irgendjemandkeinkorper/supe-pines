/* Shared presentation for loading, empty, error, offline, and success
   states (see docs/ui-states.md). One layout, one copy shape — eyebrow,
   title, what happened, what to do next — and the right live-region role
   per kind, so every flow reads and recovers the same way. */
import { esc } from '../engine/utils.js';

const ROLES = {
  loading:'role="status" aria-busy="true"',
  empty:'role="status"',
  success:'role="status"',
  error:'role="alert"',
  offline:'role="alert"'
};

/* actions: [{label, onclick, variant:'primary'|'ghost'|'blood'}]. onclick
   is an inline handler string authored in code, never user input.
   live:false when a parent already is the live region (avoids double alerts).
   detailHTML is trusted, code-authored markup (checklists, diagnostics). */
export function stateBlockHTML({kind='empty', eyebrow='', title, body='', next='', detailHTML='', actions=[], compact=false, live=true}){
  const buttons = actions.map(a => `<button class="${a.variant||'ghost'}" type="button" onclick="${a.onclick}">${esc(a.label)}</button>`).join('');
  return `<div class="ui-state ui-state--${kind}${compact?' ui-state--compact':''}" data-ui-state="${kind}" ${live?(ROLES[kind]||ROLES.empty):''}>
    ${eyebrow?`<div class="ui-state-eyebrow">${esc(eyebrow)}</div>`:''}
    ${kind==='loading'?'<div class="ui-state-spinner" aria-hidden="true"></div>':''}
    ${title?`<h2 class="ui-state-title">${esc(title)}</h2>`:''}
    ${body?`<p class="ui-state-body">${esc(body)}</p>`:''}
    ${detailHTML}
    ${next?`<p class="ui-state-next"><strong>Next:</strong> ${esc(next)}</p>`:''}
    ${buttons?`<div class="btnrow ui-state-actions">${buttons}</div>`:''}
  </div>`;
}
