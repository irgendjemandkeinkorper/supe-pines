import { $, esc, slugify } from '../engine/utils.js';
import { HEROES, CASES, SIGNALS } from '../data/index.js';
import { openOverlay } from './screens.js';

/* The card-art Gallery — a pure browsing surface, deliberately independent
   of any game in progress (uses the static data tables, not State.G), so
   it's available from the title screen as well as mid-game. Image files
   are entirely optional: see art/IMAGE_PROMPTS.md (once generated) for the
   exact path each tile below expects. Until a file exists at that path,
   the tile shows a plain text fallback card instead of a broken image —
   the Gallery (and the game) never depends on art actually existing. The
   launch set includes Comic Ink covers for all four Cases; every other tile
   currently shows its text fallback — that's expected, not a bug. */
let gState = { style:'ink', cat:'heroes', detail:null };

function heroTiles(style){
  return HEROES.map(a=>{
    const slug = slugify(a.role);
    return {
      cat:'heroes', key:slug, title:a.role, sub:'Side I', backSub:'Side II — turned',
      flavor:a.flavor, quote:a.sides[0].cond, backQuote:a.sides[1].cond,
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
  return CASES.map(h=>({cat:'threats', key:h.id, title:h.title, sub:'The Threat', flavor:h.threatLine, path:`art/images/${style}/threats/${h.id}`}));
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
    <button class="gallery-flip-control" type="button" onclick="event.stopPropagation();flipGalleryCard(this)" aria-label="View Side II" aria-pressed="false">⟳ <span>Side II</span></button>
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
  btn.setAttribute('aria-label',flipped?'View Side I':'View Side II');
  btn.setAttribute('aria-pressed',String(flipped));
  btn.innerHTML = `${flipped?'↶':'⟳'} <span>${flipped?'Side I':'Side II'}</span>`;
  const container = card.closest('.gtile, .gdetail');
  const label = container?.querySelector('[data-gallery-side-label]');
  if(label) label.textContent = flipped ? 'Side II — turned' : 'Side I';
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
    <p class="small muted">Browse every card face in Supe Pines. Hero cards have two distinct sides: use the turn button to compare their conditions and variants without opening the card. The four Comic Ink Case covers are the launch art set; missing images show intentional text cards until more art lands.</p>
    <div class="btnrow" style="margin-top:12px">
      <button class="${gState.style==='ink'?'primary':'ghost'}" onclick="setGalleryStyle('ink')">Comic Ink</button>
      <button class="${gState.style==='poster'?'primary':'ghost'}" onclick="setGalleryStyle('poster')">Painted Poster</button>
    </div>
    <div class="btnrow" style="margin-top:6px">
      ${CATS.map(c=>`<button class="${c.id===gState.cat?'primary':'ghost'}" onclick="setGalleryCat('${c.id}')">${c.label}</button>`).join('')}
    </div>
    <div class="ggrid gcat-${gState.cat}" style="margin-top:16px">${tiles.map(tileHTML).join('')}</div>
    <div class="btnrow" style="justify-content:center;margin-top:20px"><button class="primary" onclick="closeOverlay()">Back to Millhaven</button></div>`;
}
export function setGalleryStyle(style){ gState.style = style; renderGallery(); }
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
      ${t.flippable?'<p class="small muted" style="margin-top:8px">Use the turn button on the card to compare its two faces.</p>':''}
    </div>
    <div class="btnrow" style="justify-content:center;margin-top:16px"><button class="primary" onclick="closeGalleryDetail()">← Back to the Gallery</button></div>`;
}
