/**
 * js/ui/motion.js — shared card-event animation vocabulary.
 *
 * One single prefers-reduced-motion check lives here. Every named event
 * maps onto an existing CSS keyframe family from css/style.css:
 *
 *   deal         → sceneCardDeal  + sceneSlotGlow
 *   play         → sceneCardDeal
 *   buyIn        → sceneCardDeal
 *   trade        → sceneCardDeal
 *   heroTurn     → hero-flip      (CSS transition on .hero-flip-inner)
 *   toneTally    → sceneArrivalCallout (short)
 *   secretReveal → sceneArrivalCallout (long)
 *   closeOpen    → fadein
 *   dossierEntry → chronIn
 *
 * Every function returns a Promise that resolves when the animation
 * finishes (or immediately when prefers-reduced-motion is set).
 *
 * Zero dependencies. Plain ES module. No imports from engine/ or sync/.
 */

const reduced = (() => {
  try {
    return globalThis.__MOTION_TEST_REDUCED === true ||
      (globalThis.matchMedia &&
        globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) {
    return false;
  }
})();

/**
 * Animate a single element via the Web Animations API.
 * Returns a Promise resolving when the animation finishes.
 * If reduced motion is preferred, resolves immediately without animating.
 *
 * @param {Element|null} el
 * @param {Array<Object>} keyframes
 * @param {Object} options - { duration, easing, fill }
 * @returns {Promise<void>}
 */
function animateEl(el, keyframes, options) {
  if (!el || reduced) return Promise.resolve();
  try {
    const anim = el.animate(keyframes, options);
    if (anim && anim.finished) return anim.finished.then(() => {});
    // Fallback: resolve after duration
    return new Promise(r => setTimeout(r, options.duration || 400));
  } catch (_) {
    return Promise.resolve();
  }
}

/**
 * Wait for a CSS transition to complete on an element.
 * @param {Element} el
 * @param {string} property - CSS property name to wait for
 * @param {number} timeout - max wait in ms
 * @returns {Promise<void>}
 */
function waitForTransition(el, property, timeout) {
  if (reduced) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    const handler = (e) => {
      if (e.propertyName === property) {
        clearTimeout(timer);
        el.removeEventListener('transitionend', handler);
        resolve();
      }
    };
    el.addEventListener('transitionend', handler);
  });
}

/* ------------------------------------------------------------------ */
/*  sceneCardDeal keyframes (css/style.css line 660)                   */
/*  0.82s cubic-bezier(.16,.74,.22,1.04)                              */
/* ------------------------------------------------------------------ */
const CARD_DEAL_KF = [
  { opacity: 0, transform: 'translateY(-38px) rotate(-3.5deg) scale(0.88)', filter: 'blur(3px)' },
  { opacity: 1, transform: 'translateY(4px) rotate(0.5deg) scale(1.015)', filter: 'blur(0)', offset: 0.58 },
  { transform: 'translateY(-2px) rotate(-0.2deg) scale(0.995)', offset: 0.78 },
  { opacity: 1, transform: 'none', filter: 'none' },
];
const CARD_DEAL_OPTS = { duration: 820, easing: 'cubic-bezier(.16,.74,.22,1.04)', fill: 'both' };

/* ------------------------------------------------------------------ */
/*  sceneSlotGlow keyframes (css/style.css line 661)                   */
/*  1.15s ease                                                         */
/* ------------------------------------------------------------------ */
const SLOT_GLOW_KF = [
  { filter: 'none', offset: 0 },
  { filter: 'drop-shadow(0 0 13px rgba(242,169,31,.65))', offset: 0.42 },
  { filter: 'none', offset: 1 },
];
const SLOT_GLOW_OPTS = { duration: 1150, easing: 'ease', fill: 'both' };

/* ------------------------------------------------------------------ */
/*  sceneArrivalCallout keyframes (css/style.css line 662)             */
/*  3.1s ease (full) / 1.8s ease (short for tone tally)                */
/* ------------------------------------------------------------------ */
const ARRIVAL_KF_FULL = [
  { opacity: 0, transform: 'translateY(-8px)' },
  { opacity: 1, transform: 'none', offset: 0.12 },
  { opacity: 1, transform: 'none', offset: 0.70 },
  { opacity: 0, transform: 'translateY(-4px)' },
];
const ARRIVAL_KF_SHORT = [
  { opacity: 0, transform: 'translateY(-8px)' },
  { opacity: 1, transform: 'none', offset: 0.20 },
  { opacity: 1, transform: 'none', offset: 0.80 },
  { opacity: 0, transform: 'translateY(-4px)' },
];

/* ------------------------------------------------------------------ */
/*  fadein keyframes (css/style.css line 142)                          */
/*  0.6s cubic-bezier(.2,.6,.2,1)                                      */
/* ------------------------------------------------------------------ */
const FADEIN_KF = [
  { opacity: 0, transform: 'translateY(10px) scale(0.986)', filter: 'blur(3px)' },
  { opacity: 1, transform: 'none', filter: 'blur(0)' },
];
const FADEIN_OPTS = { duration: 600, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'both' };

/* ------------------------------------------------------------------ */
/*  chronIn keyframes (css/style.css line 414)                         */
/*  0.5s ease                                                          */
/* ------------------------------------------------------------------ */
const CHRONIN_KF = [
  { opacity: 0, transform: 'translateY(6px)' },
  { opacity: 1, transform: 'none' },
];
const CHRONIN_OPTS = { duration: 500, easing: 'ease', fill: 'both' };

/* ------------------------------------------------------------------ */
/*  msIn keyframes (css/style.css line 406)                            */
/*  0.45s ease                                                         */
/* ------------------------------------------------------------------ */
const MSIN_KF = [
  { opacity: 0, transform: 'translateX(-6px)' },
  { opacity: 1, transform: 'none' },
];
const MSIN_OPTS = { duration: 450, easing: 'ease', fill: 'both' };

/* ================================================================== */
/*  PUBLIC API                                                        */
/* ================================================================== */

/**
 * Animate a card being dealt into a slot.
 * @param {Element} cardEl - the card element
 * @param {Element} [slotEl] - optional slot container (gets glow)
 * @returns {Promise<void>}
 */
export function deal(cardEl, slotEl) {
  const tasks = [animateEl(cardEl, CARD_DEAL_KF, CARD_DEAL_OPTS)];
  if (slotEl) tasks.push(animateEl(slotEl, SLOT_GLOW_KF, SLOT_GLOW_OPTS));
  return Promise.all(tasks).then(() => {});
}

/**
 * Animate a card being played into a scene.
 * @param {Element} cardEl
 * @returns {Promise<void>}
 */
export function play(cardEl) {
  return animateEl(cardEl, CARD_DEAL_KF, CARD_DEAL_OPTS);
}

/**
 * Animate a buy-in card appearing in the scene.
 * @param {Element} cardEl
 * @returns {Promise<void>}
 */
export function buyIn(cardEl) {
  return animateEl(cardEl, CARD_DEAL_KF, { ...CARD_DEAL_OPTS, duration: 700 });
}

/**
 * Animate a signal being traded.
 * @param {Element} cardEl
 * @returns {Promise<void>}
 */
export function trade(cardEl) {
  return animateEl(cardEl, CARD_DEAL_KF, CARD_DEAL_OPTS);
}

/**
 * Trigger a hero card flip (CSS transition on .hero-flip-inner).
 * Adds class 'peeking', waits for the transition, then removes it.
 * @param {Element} heroFlipEl - the .hero-flip container
 * @returns {Promise<void>}
 */
export function heroTurn(heroFlipEl) {
  if (!heroFlipEl || reduced) return Promise.resolve();
  const inner = heroFlipEl.querySelector('.hero-flip-inner');
  if (!inner) return Promise.resolve();

  heroFlipEl.classList.add('peeking');

  return waitForTransition(inner, 'transform', 700).then(() => {
    heroFlipEl.classList.remove('peeking');
  });
}

/**
 * Animate a tone-tally callout (short arrival).
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function toneTally(el) {
  return animateEl(el, ARRIVAL_KF_SHORT, { duration: 1800, easing: 'ease', fill: 'both' });
}

/**
 * Animate a secret-reveal callout (full arrival).
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function secretReveal(el) {
  return animateEl(el, ARRIVAL_KF_FULL, { duration: 3100, easing: 'ease', fill: 'both' });
}

/**
 * Animate a screen/element fading open (used for Act Close).
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function closeOpen(el) {
  return animateEl(el, FADEIN_KF, FADEIN_OPTS);
}

/**
 * Animate a dossier entry appearing (chronIn).
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function dossierEntry(el) {
  return animateEl(el, CHRONIN_KF, CHRONIN_OPTS);
}

/* ------------------------------------------------------------------ */
/*  Stakeout click reaction — the one motion that belongs to the idle  */
/*  overlay rather than to a card event. Lives here so idle.js gets    */
/*  the same single reduced-motion check as everything else, and so    */
/*  its caller can await completion before re-rendering the panel.     */
/* ------------------------------------------------------------------ */
const IDLE_POP_KF = [
  { transform: 'scale(1) rotate(0deg)' },
  { transform: 'scale(1.18) rotate(-5deg)' },
  { transform: 'scale(.96) rotate(3deg)' },
  { transform: 'scale(1) rotate(0deg)' },
];
const IDLE_POP_OPTS = { duration: 380, easing: 'ease-out' };

/**
 * Animate a Stakeout object reacting to a click.
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function idleClickPop(el) {
  return animateEl(el, IDLE_POP_KF, IDLE_POP_OPTS);
}
