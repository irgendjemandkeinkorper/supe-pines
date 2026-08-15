import { signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { auth, db } from './firebase-init.js';
import { firebaseConfigured } from './config.js';

let currentUid = null;
let signingIn = null;
let readyResolve;
let readyReject;
let readyTimer = null;
export let authReady;
const FIREBASE_REQUEST_TIMEOUT_MS = 10000;

export function withTimeout(operation, timeoutMs, message){
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => clearTimeout(timer));
}

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
    const signIn = auth.currentUser ? Promise.resolve() : signInAnonymously(auth);
    signingIn = withTimeout(
      signIn,
      FIREBASE_REQUEST_TIMEOUT_MS,
      'Anonymous sign-in timed out. Check Firebase authorized domains and try again.'
    )
      .then(() => withTimeout(
        authReady,
        FIREBASE_REQUEST_TIMEOUT_MS,
        'Anonymous sign-in timed out. Check Firebase authorized domains and try again.'
      ))
      .catch(error => {
        signingIn = null;
        resetAuthReady();
        throw error;
      });
  }
  return signingIn;
}

let verificationPromise = null;

export function verifyFirebaseReadiness() {
  if (!firebaseConfigured) {
    return Promise.reject(new Error('Firebase is not configured. Config contains placeholder or empty values.'));
  }
  if (verificationPromise) return verificationPromise;

  verificationPromise = (async () => {
    try {
      // 1. Ensure anonymous sign-in is successful.
      // This verifies that Firebase Auth is reachable and Anonymous Auth is enabled.
      await ensureSignedIn();

      // 2. Ensure Firestore is reachable and rules are published by attempting a read
      // on a specific path in the allowed 'rooms' collection.
      const testRef = doc(db, 'rooms', '_test_readiness');
      await withTimeout(
        getDoc(testRef),
        FIREBASE_REQUEST_TIMEOUT_MS,
        'Firebase Firestore readiness check timed out. Check your network and try again.'
      );

      return true;
    } catch (err) {
      verificationPromise = null; // allow retries
      throw err;
    }
  })();

  return verificationPromise;
}
