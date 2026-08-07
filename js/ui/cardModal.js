import { esc } from '../engine/utils.js';
import { State } from '../engine/state.js';
import { openOverlay, closeOverlay } from './screens.js';
import { heroCard, signalCard } from './cards.js';

export function openCardDetail(kind, index){
  const G = State.G;
  const card = kind === 'hero' ? G?.heroes?.[index] : G?.signalRow?.[index];
  if(!card) return;
  const title = kind === 'hero' ? (card.name || card.role) : card.title;
  const content = kind === 'hero' ? heroCard(card) : signalCard(card);
  document.getElementById('overlay-content').innerHTML = `
    <button class="ghost" onclick="closeCardDetail()">← Back</button>
    <div class="card-detail-modal">
      <h2 style="color:var(--gold)">${esc(title)}</h2>
      ${content}
      <div class="btnrow" style="justify-content:center;margin-top:16px">
        <button class="primary" onclick="closeCardDetail()">Return to the game</button>
      </div>
    </div>`;
  openOverlay();
  document.querySelector('.card-detail-modal button, .card-detail-modal .flip-btn')?.focus();
}

export function closeCardDetail(){ closeOverlay(); }
