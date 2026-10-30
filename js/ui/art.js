import { esc, slugify } from '../engine/utils.js';
import { CASES } from '../data/cases.js';
import { State } from '../engine/state.js';

/* The two visual languages are deliberately different, but they share the
   same subject prompts and extensionless asset paths. This keeps a room or a
   local case internally consistent while letting the Gallery show either
   reading of the same evidence. */
export const ART_STYLES = [
  {
    id:'ink',
    label:'Bold Comic',
    note:'Thick expressive ink, flat punchy color, and exaggerated street-level silhouettes.'
  },
  {
    id:'expressionist',
    label:'Church Glass',
    note:'Abstract geometric panes, dark lead lines, sacred symmetry, and luminous color.'
  }
];

/* Shipped art is PNG; the other extensions cover hand-exported files. */
const ART_EXTS = ['png','webp','jpg','jpeg'];

export function normalizeArtStyle(style){
  if(style === 'burden') return 'expressionist';
  return ART_STYLES.some(item => item.id === style) ? style : 'ink';
}

export function currentArtStyle(game=State.G){
  return normalizeArtStyle(game?.artStyle);
}

/* Stamps the chosen visual language onto <html> so the surrounding chrome
   (see the art-style-reactive rules in css/style.css) can echo it — called
   on every topbar render and whenever the Gallery's own style picker
   changes, so it always reflects whichever art the player is looking at. */
export function applyArtStyleTheme(style){
  if(document.documentElement) document.documentElement.dataset.artStyle = normalizeArtStyle(style);
}

export function artPath(style, category, key){
  return `art/images/${normalizeArtStyle(style)}/${category}/${key}`;
}

/* Card-sized art starts with the small WebP from art/thumbs
   (scripts/make-thumbs.py). Decoding many 1254px PNGs at once crashed
   WebKit (#91); only full-bleed art (opts.full) needs the original. */
export function thumbPath(path){
  return path.replace(/^art\/images\//, 'art/thumbs/') + '.webp';
}

export function artImgHTML(path, alt, {thumb=true, onerror='gameArtImgError(this)'}={}){
  const srcs = [...(thumb ? [thumbPath(path)] : []), ...ART_EXTS.map(ext => `${path}.${ext}`)];
  return `<img loading="lazy" decoding="async" src="${srcs[0]}" data-srcs="${srcs.slice(1).join(',')}" onerror="${onerror}" alt="${esc(alt)}">`;
}

/* Shared by game art and the Gallery: try the next source, then reveal the text fallback. */
export function nextArtSource(img, missingSelector, missingClass){
  const srcs = (img.dataset.srcs||'').split(',').filter(Boolean);
  if(srcs.length){
    img.dataset.srcs = srcs.slice(1).join(',');
    img.src = srcs[0];
    return;
  }
  img.closest(missingSelector)?.classList.add(missingClass);
  img.remove();
}

export function gameArtImgError(img){
  nextArtSource(img, '.game-art, .hero-art, .casecard-art', 'missing');
}

export function gameArtHTML(category, key, alt, opts={}){
  const style = normalizeArtStyle(opts.style ?? currentArtStyle());
  const classes = ['game-art', opts.className||''].filter(Boolean).join(' ');
  return `<div class="${classes}">
    <div class="game-art-fallback"><span>${esc(opts.fallback||alt)}</span></div>
    ${artImgHTML(artPath(style, category, key), alt, {thumb:!opts.full})}
  </div>`;
}

export function heroArtHTML(hero, sideIdx, opts={}){
  const side = sideIdx===0 ? 'front' : 'turned';
  const state = hero.sides?.[sideIdx]?.state || (sideIdx===0 ? 'Side I' : 'Side II');
  return gameArtHTML('heroes', `${slugify(hero.role)}--${side}`, `${hero.role} — ${state} portrait`, opts);
}

export function signalArtHTML(signal, opts={}){
  return gameArtHTML('signals', slugify(signal.title), `${signal.title} signal art`, {...opts, fallback:opts.fallback||signal.glyph});
}

function caseArtKey(itemOrId){
  const item = typeof itemOrId === 'string'
    ? CASES.find(candidate => candidate.id === itemOrId)
    : itemOrId;
  return slugify(item?.title || itemOrId);
}

export function caseArtHTML(item, opts={}){
  return gameArtHTML('cases', caseArtKey(item), `${item.title} Case cover`, opts);
}

export function threatArtHTML(item, opts={}){
  return gameArtHTML('threats', item.id, `${item.name || item.title}, the Threat`, opts);
}

export function artStylePickerHTML(name, selected=null, sampleCase='toll'){
  return `<fieldset class="art-style-picker">
    <legend>Choose the visual language</legend>
    <p>Both styles tell the same story. The choice sets the art for this Case.</p>
    <div class="art-style-options">
      ${ART_STYLES.map(style => {
        const inputId = `${esc(name)}-${style.id}`;
        return `<label class="art-style-option" for="${inputId}">
        <input type="radio" id="${inputId}" name="${esc(name)}" value="${style.id}" ${selected===style.id?'checked':''} aria-label="${esc(style.label)}" required>
        <span class="art-style-choice">
          ${gameArtHTML('cases', caseArtKey(sampleCase), style.label, {style:style.id, className:'art-style-preview', fallback:style.label})}
          <span class="art-style-copy"><strong>${style.label}</strong><small>${style.note}</small><em>Use this style</em></span>
        </span>
      </label>`;
      }).join('')}
    </div>
    <p class="art-style-error" id="${esc(name)}-error" aria-live="polite"></p>
  </fieldset>`;
}
