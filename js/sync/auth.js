import { signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { auth } from './firebase-init.js';

let currentUid = null;
let signingIn = null;
let readyResolve;
let readyReject;
let readyTimer = null;
export let authReady;

function resetAuthReady(){
  if(readyTimer) clearTimeout(readyTimer);
  authReady = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  // A caller may not be waiting yet. Consume the rejection so a blocked
  // browser does not create an unhandled promise warning.
  authReady.catch(()=>{});
  readyTimer = setTimeout(()=>{
    const error = new Error('Anonymous sign-in timed out. Check Firebase authorized domains and try again.');
    readyReject(error);
    resetAuthReady();
  }, 10000);
}

resetAuthReady();

onAuthStateChanged(auth,
  user => {
    if(!user) return;
    currentUid = user.uid;
    if(readyTimer) clearTimeout(readyTimer);
    readyResolve(user.uid);
  },
  error => {
    currentUid = null;
    readyReject(error);
    resetAuthReady();
  }
);

export function getUid(){ return currentUid; }

/* Idempotent and retryable: callers can safely invoke this from entry,
   reconnect, and room actions without starting multiple auth flows. */
export function ensureSignedIn(){
  if(currentUid) return Promise.resolve(currentUid);
  if(!signingIn){
    signingIn = (auth.currentUser ? Promise.resolve() : signInAnonymously(auth))
      .then(() => authReady)
      .catch(error => {
        signingIn = null;
        resetAuthReady();
        throw error;
      });
  }
  return signingIn;
}
