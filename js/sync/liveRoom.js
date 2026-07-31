/* Room lifecycle: create, join, subscribe. Privacy split: hands/secrets
   live in a private per-uid subcollection (see firestore.rules), never in
   the public room doc. */
import { doc, setDoc, runTransaction, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase-init.js';
import { ensureSignedIn, getUid } from './auth.js';
import { HEROES, ACT_CLOSES } from '../data/index.js';
import { shuffle } from '../engine/utils.js';
import { HEROES_PER_GAME } from '../engine/rules.js';
import { normalizeArtStyle } from '../ui/art.js';

export let roomCode = null;
let unsub = null;

export const roomRef = code => doc(db, 'rooms', code);
export const privateRef = (code, uid) => doc(db, 'rooms', code, 'private', uid);

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
function genCode(){
  let s=''; for(let i=0;i<5;i++) s += CODE_LETTERS[Math.floor(Math.random()*CODE_LETTERS.length)];
  return s;
}

function emptyPlayer(name, uid){
  // Signals were never secret, so they live on the public record alongside
  // counts; hand/secrets are private (rooms/{code}/private/{uid}) so other
  // players' UIs can show "has 3 cards, 1 unrevealed secret" without ever
  // reading their data.
  return {name, uid, signals:[], handCount:0, secretsCount:0, unrevealedSecretsCount:0, scenesLeft:0};
}

export async function createRoom(theCase, hostName, artStyle='ink'){
  const uid = await ensureSignedIn();
  const code = genCode();
  await setDoc(roomRef(code), {
    status:'lobby', phase:'lobby', hostUid:uid, case:theCase, artStyle:normalizeArtStyle(artStyle),
    players:[emptyPlayer(hostName||'Storyteller I', uid)],
    seats:{[uid]:0},
    act:0, heroes:[], threat:{name:'', facts:[]},
    sceneDeck:[], discardTones:[], signalDeck:[], signalRow:[],
    actClose:{}, journal:[], current:null, archIdx:0,
    firstScenePlayer:null, closeDone:false, pendingSecret:null,
    createdAt: Date.now(),
    // Firestore TTL can reap abandoned rooms once the project enables a
    // policy on this field. Seven days leaves enough room for a long-running
    // case without keeping a public room forever.
    expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  // Pre-create my own private doc. Not strictly required by the rules
  // (I could write it lazily later, since I always have write access to
  // my own doc) — done here so dealing logic can always use a plain
  // update() rather than create-or-update branching.
  await setDoc(privateRef(code, uid), {hand:[], secrets:[]});
  roomCode = code;
  return code;
}

export async function joinRoom(code, name){
  const uid = await ensureSignedIn();
  code = (code||'').trim().toUpperCase();
  if(!code) throw new Error('Enter a room code.');
  const ref = roomRef(code);
  let joined = false;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if(!snap.exists()) throw new Error('No case is being run at that code.');
    const room = snap.data();
    if(room.seats && uid in room.seats) return; // already seated — just reconnecting
    if(room.status !== 'lobby') throw new Error('This case already has its full team.');
    if(room.players.length >= 6) throw new Error('The team is full — six storytellers is the most this case allows.');
    const idx = room.players.length;
    const players = room.players.concat([emptyPlayer(name||`Storyteller ${idx+1}`, uid)]);
    const seats = {...room.seats, [uid]: idx};
    tx.update(ref, {players, seats});
    joined = true;
  });
  if(joined) await setDoc(privateRef(code, uid), {hand:[], secrets:[]});
  roomCode = code;
}

export function subscribeRoom(code, onChange, onError){
  if(unsub) unsub();
  unsub = onSnapshot(roomRef(code), snap => { if(snap.exists()) onChange(snap.data()); }, error => onError?.(error));
  return unsub;
}
export function unsubscribeRoom(){ if(unsub){ unsub(); unsub=null; } }

let unsubPrivate = null;
export function subscribeMyPrivate(code, uid, onChange){
  if(unsubPrivate) unsubPrivate();
  unsubPrivate = onSnapshot(privateRef(code, uid), snap => {
    onChange(snap.exists() ? snap.data() : {hand:[], secrets:[]});
  });
  return unsubPrivate;
}
export function unsubscribeMyPrivate(){ if(unsubPrivate){ unsubPrivate(); unsubPrivate=null; } }

/* Shared by liveFinishThreat (Act I) and the delayed advance-after-close
   cascade (Acts II/III) — mirrors startAct() from js/ui/hub.js, operating
   on a plain room object instead of State.G. Mutates `room`'s public
   fields in place and RETURNS a { uid: hand[] } map for the caller to
   write out with a partial update() per uid — deliberately not a read-
   then-overwrite of each private doc, since Firestore's owner-only read
   rule on rooms/{code}/private/{uid} means a transaction acting as one
   player can never read another player's doc, only write to it. A
   partial update() only ever touches the `hand` field, leaving each
   player's `secrets` untouched without needing to have read it. */
export function dealAct(room, act, SCENES){
  room.act = act;
  room.closeDone = false;
  room.discardTones = [];
  const np = room.players.length;
  room.sceneDeck = shuffle(SCENES[act].filter(s=>!s.hook || s.hook===room.case.id).map(s=>({...s})));
  const handSize = np===1?5:3;
  const hands = {};
  room.players.forEach(p=>{
    const hand = room.sceneDeck.splice(0, handSize);
    hands[p.uid] = hand;
    p.handCount = hand.length;
    p.scenesLeft = np===1?3 : np===2?2 : 1;
  });
  return hands;
}

export function dealHeroesAndCloses(room){
  room.heroes = shuffle(HEROES).slice(0,HEROES_PER_GAME).map(h=>({...h, name:'', setupA:'', answeredBy:'', flipped:false}));
  room.actClose = {1:shuffle(ACT_CLOSES[1])[0], 2:shuffle(ACT_CLOSES[2])[0], 3:shuffle(ACT_CLOSES[3])[0]};
}

export { getUid };
