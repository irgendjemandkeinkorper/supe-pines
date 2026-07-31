import { signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { auth } from './firebase-init.js';

let currentUid = null;
let readyResolve;
export const authReady = new Promise(res => { readyResolve = res; });

onAuthStateChanged(auth, user => {
  if (user) {
    currentUid = user.uid;
    readyResolve(user.uid);
  }
});

export function getUid(){ return currentUid; }

/* Idempotent: safe to call from many places. Firebase Auth persists the
   session itself across reloads, so this only actually signs in once per
   device — later calls just resolve authReady immediately. */
let signingIn = null;
export function ensureSignedIn(){
  if (currentUid) return Promise.resolve(currentUid);
  if (!signingIn) {
    signingIn = (auth.currentUser ? Promise.resolve() : signInAnonymously(auth))
      .then(() => authReady);
  }
  return signingIn;
}
