import { $, esc, slugify } from '../engine/utils.js';
import { HEROES, CASES, SIGNALS, VILLAINS } from '../data/index.js';
import { openOverlay } from './screens.js';
import { ART_STYLES, normalizeArtStyle } from './art.js';

/* The card-art Gallery — a pure browsing surface, deliberately independent
   of any game in progress (uses the static data tables, not State.G), so
   it's available from the title screen as well as mid-game. Image files
   are entirely optional: see art/IMAGE_PROMPTS.md (once generated) for the
   exact path each tile below expects. Until a file exists at that path,
   the tile shows a plain text fallback card instead of a broken image —
   the Gallery (and the game) never depends on art actually existing. The
   both visual languages are available even while their generated files are
   still being filled in; every missing tile shows an intentional text fallback. */
let gState = { style:'ink', cat:'heroes', detail:null };
const STYLE_READY = { ink:true, expressionist:true };

function heroTiles(style){
  return HEROES.map(a=>{
    const slug = slugify(a.role);
    return {
      cat:'heroes', key:slug, title:a.role, sub:'Good Day', backSub:'Bad Day',
      flavor:a.flavor, quote:a.sides[0].cond, backQuote:a.sides[1].cond,
      frontBackground:a.sides[0].detail, backBackground:a.sides[1].detail,
      path:`art/images/${style}/heroes/${slug}--front`,
      backPath:`art/images/${style}/heroes/${slug}--turned`, flippable:true
    };
  });
}
function caseTiles(style){
  return CASES.map(h=>({cat:'cases', key:h.id, title:h.title, sub:'The Case', flavor:h.epigraph, path:`art/images/${style}/cases/${h.id}`}));
}
function signalTiles(style){
  return SIGNALS.map(o=>({cat:'signals', key:slugify(o.title), title:o.title, sub:o.glyph, flavor:o.line, path:`art/images/${style}/signals/${slugify(o.title)}`}));
}
function threatTiles(style){
  return VILLAINS.map(v=>({
    cat:'threats', key:v.id, title:v.name,
    sub:'Good Day', backSub:'Bad Day — attachment exposed',
    flavor:v.threat, quote:v.threat, backQuote:v.flaw,
    frontBackground:v.role, backBackground:v.flaw,
    path:`art/images/${style}/threats/${v.id}`,
    backPath:`art/images/${style}/threats/${v.id}--turned`, flippable:true
  }));
}
const CATS = [
  {id:'heroes', label:'Heroes', build:heroTiles},
  {id:'cases', label:'Cases', build:caseTiles},
  {id:'signals', label:'Signals', build:signalTiles},
  {id:'threats', label:'Threats', build:threatTiles}
];

/* Try a handful of extensions in turn before giving up and revealing the
   text fallback underneath — the naming doc promises .jpg, but nothing
   stops someone from exporting .png/.webp instead. */
const EXTS = ['jpg','jpeg','png','webp'];
function imgWithFallback(path, alt){
  const rest = EXTS.slice(1).join(',');
  return `<img loading="lazy" src="${path}.${EXTS[0]}" data-base="${path}" data-exts="${rest}" onerror="galleryImgError(this)" alt="${esc(alt)}">`;
}
export function galleryImgError(img){
  const exts = (img.dataset.exts||'').split(',').filter(Boolean);
  if(exts.length){
    const next = exts.shift();
    img.dataset.exts = exts.join(',');
    img.src = img.dataset.base + '.' + next;
  } else {
    (img.closest('.gallery-face') || img.closest('.gtile-media, .gdetail-media'))?.classList.add('g-missing');
    img.remove();
  }
}

function fallbackHTML(t, sub=t.sub){
  return `<div class="gtile-fallback"><span class="gf-title">${esc(t.title)}</span>${sub?`<span class="gf-sub">${esc(sub)}</span>`:''}</div>`;
}
function galleryMediaHTML(t, detail=false){
  const cls = detail ? 'gdetail-media' : 'gtile-media';
  if(!t.flippable) return `<div class="${cls}">${imgWithFallback(t.path,t.title)}${fallbackHTML(t)}</div>`;
  return `<div class="${cls} gallery-flip">
    <div class="gallery-flip-inner">
      <div class="gallery-face gallery-front">${imgWithFallback(t.path,`${t.title}, ${t.sub}`)}${fallbackHTML(t,t.sub)}<span class="gallery-face-label">${esc(t.sub)}</span></div>
      <div class="gallery-face gallery-back">${imgWithFallback(t.backPath,`${t.title}, ${t.backSub}`)}${fallbackHTML(t,t.backSub)}<span class="gallery-face-label">${esc(t.backSub)}</span></div>
    </div>
    <button class="gallery-flip-control" type="button" onclick="event.stopPropagation();flipGalleryCard(this)" data-front-label="${esc(t.sub)}" data-back-label="${esc(t.backSub)}" aria-label="View ${esc(t.backSub)}" aria-pressed="false">⟳ <span>${esc(t.backSub)}</span></button>
  </div>`;
}
function tileHTML(t){
  return `<div class="gtile" role="group" aria-label="${esc(t.title)} card preview" tabindex="0" onclick="openGalleryDetail('${t.cat}','${t.key}')" onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();openGalleryDetail('${t.cat}','${t.key}')}">
    ${galleryMediaHTML(t)}
    <div class="gtile-cap">${esc(t.title)}${t.sub?` <span class="muted small">— <span data-gallery-side-label>${esc(t.sub)}</span></span>`:''}</div>
    ${t.flippable?gallerySideQuoteHTML(t):''}
  </div>`;
}

function gallerySideQuoteHTML(t){
  return `<q class="gallery-side-quote" data-gallery-side-quote data-front-quote="${esc(t.quote)}" data-back-quote="${esc(t.backQuote)}">${esc(t.quote)}</q>`;
}

export function flipGalleryCard(btn){
  const card = btn.closest('.gallery-flip');
  if(!card) return;
  const flipped = card.classList.toggle('is-flipped');
  const frontLabel = btn.dataset.frontLabel || 'Good Day';
  const backLabel = btn.dataset.backLabel || 'Bad Day';
  btn.setAttribute('aria-label',`View ${flipped?frontLabel:backLabel}`);
  btn.setAttribute('aria-pressed',String(flipped));
  btn.innerHTML = `${flipped?'↶':'⟳'} <span>${esc(flipped?frontLabel:backLabel)}</span>`;
  const container = card.closest('.gtile, .gdetail');
  const label = container?.querySelector('[data-gallery-side-label]');
  if(label) label.textContent = flipped ? backLabel : frontLabel;
  const quote = container?.querySelector('[data-gallery-side-quote]');
  if(quote) quote.textContent = flipped ? quote.dataset.backQuote : quote.dataset.frontQuote;
}

export function showGallery(){
  gState.detail = null;
  renderGallery();
  openOverlay();
}
function renderGallery(){
  if(gState.detail){ $('overlay-content').innerHTML = detailHTML(); return; }
  const active = CATS.find(c=>c.id===gState.cat);
  const tiles = active.build(gState.style);
  $('overlay-content').innerHTML = `
    <h2 style="color:var(--gold)">The Gallery</h2>
    <p class="small muted">Browse every card face in Supe Pines. Text fallback is a fully supported and intentional launch state. Currently, 46 Hero and Threat portraits feature finalized art in both visual languages, while remaining slots show beautifully integrated text previews. Hero cards have two distinct sides: use the turn button to compare their conditions and variants without opening the card.</p>
    <div class="btnrow" style="margin-top:12px">
      ${ART_STYLES.map(style => `<button class="${gState.style===style.id?'primary':'ghost'}" onclick="setGalleryStyle('${style.id}')">${style.label}</button>`).join('')}
    </div>
    <div class="btnrow" style="margin-top:6px">
      ${CATS.map(c=>`<button class="${c.id===gState.cat?'primary':'ghost'}" onclick="setGalleryCat('${c.id}')">${c.label}</button>`).join('')}
    </div>
    <div class="ggrid gcat-${gState.cat}" style="margin-top:16px">${tiles.map(tileHTML).join('')}</div>
    <div class="btnrow" style="justify-content:center;margin-top:20px"><button class="primary" onclick="closeOverlay()">Back to Millhaven</button></div>`;
}
export function setGalleryStyle(style){
  const normalized = normalizeArtStyle(style);
  if(!STYLE_READY[normalized]) return;
  gState.style = normalized;
  renderGallery();
}
export function setGalleryCat(cat){ gState.cat = cat; renderGallery(); }
export function openGalleryDetail(cat, key){
  const c = CATS.find(x=>x.id===cat);
  const t = c && c.build(gState.style).find(x=>x.key===key);
  if(!t) return;
  gState.detail = t;
  renderGallery();
}
export function closeGalleryDetail(){ gState.detail = null; renderGallery(); }
function detailHTML(){
  const t = gState.detail;
  return `
    <button class="ghost" onclick="closeGalleryDetail()">← Back to the Gallery</button>
    <div class="gdetail">
      ${galleryMediaHTML(t,true)}
      <h3 style="color:var(--gold);margin-top:12px">${esc(t.title)}</h3>
      ${t.sub?`<p class="small muted"><span data-gallery-side-label>${esc(t.sub)}</span></p>`:''}
      ${t.flippable?gallerySideQuoteHTML(t):''}
      ${t.flavor?`<p class="gallery-flavor">${esc(t.flavor)}</p>`:''}
      ${t.frontBackground?`<details class="gallery-background"><summary>Character background</summary><div class="small"><p><strong>${esc(t.sub)}</strong><br>${esc(t.frontBackground)}</p><p><strong>${esc(t.backSub)}</strong><br>${esc(t.backBackground||'')}</p></div></details>`:''}
      ${t.flippable?'<p class="small muted" style="margin-top:8px">Use the turn button on the card to compare its two faces.</p>':''}
    </div>
    <div class="btnrow" style="justify-content:center;margin-top:16px"><button class="primary" onclick="closeGalleryDetail()">← Back to the Gallery</button></div>`;
}
