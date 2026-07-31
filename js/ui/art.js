import { esc, slugify } from '../engine/utils.js';
import { State } from '../engine/state.js';

/* The two visual languages are deliberately different, but they share the
   same subject prompts and extensionless asset paths. This keeps a room or a
   local case internally consistent while letting the Gallery show either
   reading of the same evidence. */
export const ART_STYLES = [
  {
    id:'ink',
    label:'Noir Comic',
    note:'Hard ink, halftone weather, and street-level color — the city as evidence.'
  },
  {
    id:'burden',
    label:'Burden Realist',
    note:'Magical realism that makes each Hero’s shortcoming visible in the world around them.'
  }
];

const ART_EXTS = ['png','jpg','jpeg','webp'];

export function normalizeArtStyle(style){
  return ART_STYLES.some(item => item.id === style) ? style : 'ink';
}

export function currentArtStyle(game=State.G){
  return normalizeArtStyle(game?.artStyle);
}

export function artPath(style, category, key){
  return `art/images/${normalizeArtStyle(style)}/${category}/${key}`;
}

function imageHTML(path, alt){
  return `<img loading="lazy" src="${path}.${ART_EXTS[0]}" data-base="${path}" data-exts="${ART_EXTS.slice(1).join(',')}" onerror="gameArtImgError(this)" alt="${esc(alt)}">`;
}

export function gameArtImgError(img){
  const exts = (img.dataset.exts||'').split(',').filter(Boolean);
  if(exts.length){
    const next = exts.shift();
    img.dataset.exts = exts.join(',');
    img.src = `${img.dataset.base}.${next}`;
    return;
  }
  img.closest('.game-art, .hero-art, .casecard-art')?.classList.add('missing');
  img.remove();
}

export function gameArtHTML(category, key, alt, opts={}){
  const style = normalizeArtStyle(opts.style ?? currentArtStyle());
  const classes = ['game-art', opts.className||''].filter(Boolean).join(' ');
  return `<div class="${classes}">
    <div class="game-art-fallback"><span>${esc(opts.fallback||alt)}</span></div>
    ${imageHTML(artPath(style, category, key), alt)}
  </div>`;
}

export function heroArtHTML(hero, sideIdx, opts={}){
  const side = sideIdx===0 ? 'front' : 'turned';
  return gameArtHTML('heroes', `${slugify(hero.role)}--${side}`, `${hero.role}, Side ${sideIdx===0?'I':'II'}`, opts);
}

export function signalArtHTML(signal, opts={}){
  return gameArtHTML('signals', slugify(signal.title), signal.title, {...opts, fallback:opts.fallback||signal.glyph});
}

export function caseArtHTML(item, opts={}){
  return gameArtHTML('cases', item.id, `${item.title} Case cover`, opts);
}

export function threatArtHTML(item, opts={}){
  return gameArtHTML('threats', item.id, `The Threat — ${item.title}`, opts);
}

export function artStylePickerHTML(name, selected=null, sampleCase='toll'){
  return `<fieldset class="art-style-picker">
    <legend>Choose the visual language</legend>
    <p>Both styles tell the same story. The choice sets the art for this Case.</p>
    <div class="art-style-options">
      ${ART_STYLES.map(style => `<label class="art-style-option">
        <input type="radio" name="${esc(name)}" value="${style.id}" ${selected===style.id?'checked':''} required>
        <span class="art-style-choice">
          ${gameArtHTML('cases', sampleCase, style.label, {style:style.id, className:'art-style-preview', fallback:style.label})}
          <span class="art-style-copy"><strong>${style.label}</strong><small>${style.note}</small><em>Use this style</em></span>
        </span>
      </label>`).join('')}
    </div>
    <p class="art-style-error" id="${esc(name)}-error" aria-live="polite"></p>
  </fieldset>`;
}
