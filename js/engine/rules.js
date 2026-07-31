import { TONES } from '../data/index.js';
import { State } from './state.js';

export function actToneCounts(){
  const G = State.G;
  const c = Object.fromEntries(TONES.map(t=>[t,0]));
  if(!G) return c;
  G.discardTones.forEach(t=>c[t]++);
  G.heroes.forEach(h=>c[faceUp(h).tone]++);
  return c;
}
export const faceUp = h => h.sides[h.flipped?1:0];

export function matchSecret(tones, fromPi){
  const G = State.G;
  const counts = Object.fromEntries(TONES.map(t=>[t,0]));
  tones.forEach(t=>counts[t]++);
  const np = G.players.length;
  for(let k=1;k<=np;k++){
    const pi = (fromPi+k)%np;
    for(const s of G.players[pi].secrets){
      if(s.used) continue;
      const need = Object.fromEntries(TONES.map(t=>[t,0]));
      s.combo.forEach(t=>need[t]++);
      if(TONES.every(t=>counts[t]>=need[t])) return {pi, secret:s};
    }
  }
  return null;
}

export function maxContrib(){ return 2; } // starter's card + 2 others = 3 total
export const HEROES_PER_GAME = 6; // how many Heroes are dealt into a single game, out of the full roster

export function eligibleContributors(){
  const G = State.G;
  const c = G.current, np = G.players.length;
  const done = new Set(c.contributions.map(x=>x.pi));
  if(np===1) return c.contributions.length<maxContrib() ? [0] : [];
  const out=[];
  for(let i=0;i<np;i++){
    if(i===c.starter || done.has(i)) continue;
    if(G.players[i].hand.length>0 || G.signalRow.length>0) out.push(i);
  }
  return out;
}
