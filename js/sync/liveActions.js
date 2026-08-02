/* Every function here wraps one guarded Firestore transaction. Privacy
   split: hand[]/secrets[] live in rooms/{code}/private/{uid}, readable and
   writable only by that uid (see firestore.rules) — so a transaction run
   on behalf of player A can read/write player A's own private doc, but can
   never touch player B's. That constraint is why secret-matching is not
   computed inside the scene-resolving transaction: resolving a scene only
   records tones/journal/flips, and each client reactively checks its OWN
   cached private secrets against the newest journal entry, claiming it via
   liveClaimSecret if it matches. Acts still auto-advance, but via a
   separately callable, idempotent liveAdvanceAfterClose() rather than
   inline in resolve — every client schedules a short delayed call to it
   once it sees closeDone with nothing pending, so whichever client's timer
   fires first wins and everyone else's attempt safely no-ops. */
import { runTransaction } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { roomRef, privateRef, dealAct, dealHeroesAndCloses, getUid } from './liveRoom.js';
import { db } from './firebase-init.js';
import { SCENES, SIGNALS, SECRETS, TONES, villainForCase } from '../data/index.js';
import { shuffle } from '../engine/utils.js';
import { maxContrib, HEROES_PER_GAME } from '../engine/rules.js';

function mySeat(room){
  const uid = getUid();
  const idx = room.seats ? room.seats[uid] : undefined;
  return idx===undefined ? -1 : idx;
}

async function readRoom(t, code){
  const snap = await t.get(roomRef(code));
  if(!snap.exists()) throw new Error('This case no longer exists.');
  return snap.data();
}

export async function liveBeginTale(code){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(room.phase !== 'lobby') throw new Error('The case has already begun.');
    if(getUid() !== room.hostUid) throw new Error('Only the one who opened this table may begin the case.');
    dealHeroesAndCloses(room);
    room.threat = {name:'', facts:[], profile:villainForCase(room.case?.id)};
    room.journal = [];
    room.archIdx = 0;
    room.firstScenePlayer = null;
    room.closeDone = false;
    room.pendingSecret = null;
    room.status = 'active';
    room.phase = 'herosetup';
    t.set(roomRef(code), room);
  });
}

export async function liveSaveHeroSetup(code, name, answer){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(room.phase !== 'herosetup') throw new Error('Not answering questions right now.');
    const answerer = room.players[room.archIdx % room.players.length];
    // Deliberately not gated to the assigned answerer's uid: Heroes are
    // never owned by one player, and without this, a disconnected player
    // stuck as "current answerer" would deadlock the whole game — archIdx
    // can only ever be advanced by this function. Any seated player may
    // answer on their behalf; the UI (js/ui/online.js) still shows the
    // input to the assigned answerer by default and only reveals it to
    // others via an explicit "answer for them" action, so this doesn't
    // change normal-flow turn-taking.
    if(mySeat(room) < 0) throw new Error('Not seated at this table.');
    const h = room.heroes[room.archIdx];
    h.name = (name||'').trim() || h.role;
    h.setupA = (answer||'').trim() || '(left unspoken)';
    h.answeredBy = answerer.name;
    room.threat.facts.push({role:h.role, who:h.name, q:h.setup[room.case.id], a:h.setupA});
    room.archIdx++;
    if(room.archIdx >= HEROES_PER_GAME) room.phase = 'threat';
    t.set(roomRef(code), room);
  });
}

export async function liveFinishThreat(code, threatName){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(room.phase !== 'threat') throw new Error('Not naming the Threat right now.');

    room.threat.name = (threatName||'').trim() || room.threat.profile?.name || villainForCase(room.case?.id)?.name || 'The Unnamed Threat';
    room.signalDeck = shuffle(SIGNALS);
    room.signalRow = room.signalDeck.splice(0,6);

    // Never read another player's private doc (the rules wouldn't allow
    // it) — deal blind, writing each uid's fresh secrets with a partial
    // update() rather than a read-then-overwrite.
    const secrets = shuffle(SECRETS);
    const secretsToWrite = {};
    room.players.forEach(p=>{
      secretsToWrite[p.uid] = [{...secrets.pop(), used:false}];
      p.secretsCount = 1;
      p.unrevealedSecretsCount = 1;
    });
    if(room.players.length===1){
      const p = room.players[0];
      secretsToWrite[p.uid].push({...secrets.pop(), used:false});
      p.secretsCount = 2; p.unrevealedSecretsCount = 2;
    }

    const hands = dealAct(room, 1, SCENES);
    room.phase = 'playing';

    t.set(roomRef(code), room);
    room.players.forEach(p => {
      t.update(privateRef(code, p.uid), {hand: hands[p.uid], secrets: secretsToWrite[p.uid]});
    });
  });
}

export async function liveBeginScene(code, cardIdx, archIdx, opening){
  const uid = getUid();
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(room.phase !== 'playing' || room.current !== null) throw new Error('A scene is already in progress.');
    if(room.pendingSecret) throw new Error('A Buried Secret must be revealed first.');
    const pi = mySeat(room);
    const p = room.players[pi];
    if(!p || p.scenesLeft<=0) throw new Error('You have no scene left to start this act.');

    const pref = privateRef(code, uid);
    const psnap = await t.get(pref);
    const priv = psnap.exists() ? psnap.data() : {hand:[], secrets:[]};
    if(cardIdx<0 || cardIdx>=priv.hand.length) throw new Error('That card is no longer in your hand.');
    const card = priv.hand.splice(cardIdx,1)[0];
    p.handCount = priv.hand.length;

    room.current = {type:'scene', starter:pi, archIdx, card, contributions:[], happened:'', opening:(opening||'').trim(), phase:'play'};

    t.set(roomRef(code), room);
    t.set(pref, priv);
  });
}

export async function liveBeginClose(code, archIdx, starterSeat, element, opening, closeTitle, closePrompt){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(room.current !== null) throw new Error('Something is already in progress.');
    if(room.pendingSecret) throw new Error('A Buried Secret must be revealed first.');
    if(room.closeDone) throw new Error('The Act Close has already played.');
    const remaining = room.players.reduce((s,p)=>s+p.scenesLeft,0);
    if(remaining>0) throw new Error('Scenes remain before the Act may close.');
    room.current = {
      type:'close', starter:starterSeat, archIdx,
      card:{title:closeTitle, prompt:closePrompt, tone:null},
      element, opening:(opening||'').trim(),
      contributions:[], happened:'', phase:'play'
    };
    t.set(roomRef(code), room);
  });
}

export async function liveContribute(code, kind, idx, how){
  const uid = getUid();
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    const c = room.current;
    if(!c) throw new Error('No scene in progress.');
    if(c.contributions.length >= maxContrib()) throw new Error('This scene already holds three cards.');
    const pi = mySeat(room);
    if(pi === c.starter) throw new Error('You already opened this scene.');
    if(c.contributions.some(x=>x.pi===pi)) throw new Error('You already played into this scene.');

    let card, pref, priv;
    if(kind==='scene'){
      pref = privateRef(code, uid);
      const psnap = await t.get(pref);
      priv = psnap.exists() ? psnap.data() : {hand:[], secrets:[]};
      if(idx<0 || idx>=priv.hand.length) throw new Error('That card is no longer in your hand.');
      card = priv.hand.splice(idx,1)[0];
      room.players[pi].handCount = priv.hand.length;
    } else {
      if(idx<0 || idx>=room.signalRow.length) throw new Error('That signal is no longer in the row.');
      card = room.signalRow.splice(idx,1)[0];
      if(room.signalDeck.length) room.signalRow.push(room.signalDeck.shift());
    }
    c.contributions.push({pi, kind, card, how:(how||'').trim()});

    t.set(roomRef(code), room);
    if(pref) t.set(pref, priv);
  });
}

function countTonesAndResolve(room, flips){
  const c = room.current;
  flips.forEach(i=>{ const h = room.heroes[i]; h.flipped = !h.flipped; });
  const lead = room.heroes[c.archIdx];
  const tones = [];
  if(c.card.tone) tones.push(c.card.tone);
  c.contributions.forEach(x=>{ if(x.kind==='scene') tones.push(x.card.tone); });
  tones.push(lead.sides[lead.flipped?1:0].tone);
  room.discardTones.push(...tones);
  c.contributions.forEach(x=>{ if(x.kind==='signal') room.players[x.pi].signals.push(x.card); });

  const flipNames = flips.map(i=>{
    const h = room.heroes[i];
    return `${h.name||h.role} turned to side ${h.flipped?'II':'I'}`;
  });

  room.journal.push({
    type:c.type, act:room.act,
    playerName:room.players[c.starter].name,
    archName:lead.name||lead.role, archRole:lead.role,
    cardTitle:c.card.title, cardPrompt:c.card.prompt, element:c.element||null,
    opening:c.opening, happened:c.happened,
    contributions:c.contributions.map(x=>({playerName:room.players[x.pi].name, kind:x.kind,
      title:x.card.title, glyph:x.card.glyph||null, tone:x.card.tone||null, how:x.how})),
    tones:tones.slice(), flips:flipNames, struck:false
  });

  if(c.type==='scene'){
    if(room.firstScenePlayer===null) room.firstScenePlayer = c.starter;
    room.players[c.starter].scenesLeft--;
  }
  if(c.type==='close') room.closeDone = true;
  room.current = null;
  // No secret-matching here — see file header. The client (js/ui/online.js)
  // reactively checks the new journal entry against its own private
  // secrets and, on a match, calls liveClaimSecret. If nothing is claimed,
  // every client's delayed liveAdvanceAfterClose() call handles cascading
  // to the next act once closeDone is true.
}

export async function liveEndSceneAndResolve(code, happenedText, flips){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    const c = room.current;
    if(!c) throw new Error('No scene in progress.');
    const pi = mySeat(room);
    if(pi !== c.starter) throw new Error('Only the one who began this scene may end it.');
    c.happened = (happenedText||'').trim();
    countTonesAndResolve(room, flips||[]);
    t.set(roomRef(code), room);
  });
}

/* Called reactively by a client that believes its own (privately held,
   locally cached) secrets match the tones of the most recent journal
   entry. journalIndex is passed by the caller (computed against its own
   snapshot) and re-verified fresh here — if the group has moved on
   (a new scene started, or someone else already claimed) this simply
   fails with a friendly error and the caller gives up gracefully. */
export async function liveClaimSecret(code, journalIndex){
  const uid = getUid();
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(room.pendingSecret) throw new Error('Someone already claimed a Secret from this scene.');
    if(room.current !== null) throw new Error('A new scene has already begun.');
    if(journalIndex !== room.journal.length - 1) throw new Error('That moment has passed.');
    const entry = room.journal[journalIndex];
    if(!entry) throw new Error('Nothing to check yet.');
    const pi = mySeat(room);
    if(pi < 0) throw new Error('Not seated at this table.');

    const pref = privateRef(code, uid);
    const psnap = await t.get(pref);
    const priv = psnap.exists() ? psnap.data() : {hand:[], secrets:[]};
    const counts = Object.fromEntries(TONES.map(t=>[t,0]));
    entry.tones.forEach(tn=>counts[tn]++);
    let matchIdx = -1;
    for(let si=0; si<priv.secrets.length; si++){
      const s = priv.secrets[si];
      if(s.used) continue;
      const need = Object.fromEntries(TONES.map(t=>[t,0]));
      s.combo.forEach(tn=>need[tn]++);
      if(TONES.every(tn=>counts[tn]>=need[tn])){ matchIdx = si; break; }
    }
    if(matchIdx<0) throw new Error('No matching Buried Secret.');

    room.pendingSecret = {pi, secretIndex:matchIdx, journalIndex};
    t.set(roomRef(code), room);
  });
}

export async function liveConfirmSecret(code, signalIndices, answerText){
  const uid = getUid();
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    const u = room.pendingSecret;
    if(!u) throw new Error('No Buried Secret is waiting to be revealed.');
    const pi = mySeat(room);
    if(pi !== u.pi) throw new Error('This Secret is not yours to reveal.');

    const pref = privateRef(code, uid);
    const psnap = await t.get(pref);
    const priv = psnap.exists() ? psnap.data() : {hand:[], secrets:[]};
    const secret = priv.secrets[u.secretIndex];
    secret.used = true;
    room.players[pi].unrevealedSecretsCount = priv.secrets.filter(s=>!s.used).length;

    room.journal.push({
      type:'secret', act:room.act, playerName:room.players[pi].name,
      question:secret.q, combo:secret.combo.slice(),
      signals: signalIndices.map(i=>({glyph:room.signalRow[i].glyph, title:room.signalRow[i].title})),
      answer:(answerText||'').trim(), struck:false
    });
    room.pendingSecret = null;

    t.set(roomRef(code), room);
    t.set(pref, priv);
  });
}

/* Idempotent — safe for every client to call speculatively. Advances to
   the next act (or finishes the game) only if the room is genuinely in
   the "just closed, nothing pending" state; otherwise it's a silent
   no-op, which is what lets multiple clients race this call safely. */
export async function liveAdvanceAfterClose(code){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(!room.closeDone || room.current !== null || room.pendingSecret) return;
    if(room.act>=3){
      room.phase='finished'; room.status='finished'; room.act=4;
      t.set(roomRef(code), room);
      return;
    }
    const hands = dealAct(room, room.act+1, SCENES); // never reads other players' private docs — see dealAct's comment
    t.set(roomRef(code), room);
    room.players.forEach(p => t.update(privateRef(code, p.uid), {hand: hands[p.uid]}));
  });
}

export async function liveTradeSignal(code, signalIdx){
  const uid = getUid();
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    const pi = mySeat(room);
    const p = room.players[pi];
    if(!room.sceneDeck.length) throw new Error('The scene deck is empty.');
    if(signalIdx<0 || signalIdx>=p.signals.length) throw new Error('You don’t hold that signal.');

    const pref = privateRef(code, uid);
    const psnap = await t.get(pref);
    const priv = psnap.exists() ? psnap.data() : {hand:[], secrets:[]};

    const o = p.signals.splice(signalIdx,1)[0];
    room.signalDeck.unshift(o);
    priv.hand.push(room.sceneDeck.pop());
    p.handCount = priv.hand.length;

    t.set(roomRef(code), room);
    t.set(pref, priv);
  });
}

export async function liveForfeitScene(code, targetSeat){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    const p = room.players[targetSeat];
    if(!p) throw new Error('No such storyteller.');
    if(p.scenesLeft<=0) throw new Error('Nothing to forfeit.');
    if(p.handCount>0 || p.signals.length>0) throw new Error('They still have a card or signal to play.');
    p.scenesLeft--;
    room.journal.push({type:'note', act:room.act, text:`${p.name} had no scene card or signal to trade, and lost their scene. Millhaven went unwatched a while.`, struck:false});
    t.set(roomRef(code), room);
  });
}

export async function liveToggleStrike(code, journalIndex){
  await runTransaction(db, async t => {
    const room = await readRoom(t, code);
    if(!room.journal[journalIndex]) throw new Error('No such entry.');
    room.journal[journalIndex].struck = !room.journal[journalIndex].struck;
    t.set(roomRef(code), room);
  });
}

export { mySeat };
