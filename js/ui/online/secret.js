/* Online Buried Secret reveal. */
import { $, esc, toneBadge } from '../../engine/utils.js';
import { State } from '../../engine/state.js';
import { signalCard } from '../cards.js';
import { liveConfirmSecret } from '../../sync/liveActions.js';
import { session } from './session.js';
import { fail, withPendingState } from './errors.js';
import { routeAndRender } from './router.js';
import { onlineSetSecretAnswer } from './scene.js';

/* ---------------- secret reveal ---------------- */
export function renderOnlineSecret(room){
  const u = room.pendingSecret;
  const p = room.players[u.pi]; // this screen only ever renders for its own owner (gated in routeAndRender)
  const secret = session.myPrivate.secrets[u.secretIndex];
  const sel = session.draft.secretSel || (session.draft.secretSel = []);
  $('scr-secret').innerHTML = `
    <div class="center u-mt-20">
      <h2 style="color:var(--secret-lilac);margin-top:6px">A Buried Secret Comes to Light</h2>
      <p class="muted">${esc(p.name)}’s secret is unlocked.</p>
    </div>
    <div class="ornament" style="color:var(--secret-violet)">✧</div>
    <div class="u-col-720">
      <div class="secretbox" style="padding:16px">
        <div>${secret.combo.map(toneBadge).join(' ')}</div>
        <p style="font-size:1.15rem;color:var(--secret-lilac-pale);margin-top:8px">“${esc(secret.q)}”</p>
      </div>
      <h3 style="color:var(--secret-lilac);margin-top:16px">Choose three signals <span class="small">(${sel.length} of ${Math.min(3,room.signalRow.length)})</span></h3>
      <div class="cardgrid compact">${room.signalRow.map((o,i)=>signalCard(o,'onlineToggleSecretOmen',i)).join('')}</div>
      <div class="panel spotlight">
        <label class="fld u-secret" for="secret-answer">The vignette</label>
        <textarea id="secret-answer" style="min-height:120px" oninput="onlineSetSecretAnswer(this.value)">${esc(session.draft.secretAnswer||'')}</textarea>
        <div class="btnrow"><button class="ghost" onclick="bleakifyField('secret-answer','secret reveal vignette',this)">Bleakify</button><button class="primary" ${sel.length!==Math.min(3,room.signalRow.length)?'disabled':''} onclick="onlineConfirmSecret(this)">So It Is Revealed</button></div>
      </div>
    </div>`;
  document.querySelectorAll('[id^="omen-pick-"]').forEach((el,idx)=>el.classList.toggle('selected', sel.includes(idx)));
}
export function onlineToggleSecretOmen(i){
  const room = State.G, need = Math.min(3, room.signalRow.length);
  const sel = session.draft.secretSel || (session.draft.secretSel=[]);
  const at = sel.indexOf(i);
  if(at>=0) sel.splice(at,1); else if(sel.length<need) sel.push(i);
  renderOnlineSecret(room);
}
export async function onlineConfirmSecret(btn){
  try{ await withPendingState(btn, "Revealing...", () => liveConfirmSecret(State.onlineRoomCode, session.draft.secretSel||[], session.draft.secretAnswer||'')); session.draft={}; }
  catch(err){ fail(err); }
}
