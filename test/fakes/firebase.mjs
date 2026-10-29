/* In-memory stand-in for the Firebase app/auth/firestore CDN modules, wired
   in by test/loader.mjs. It covers only the API surface js/sync/ uses, and
   mirrors the one firestore.rules constraint the sync layer is designed
   around: a client may read only its OWN rooms/{code}/private/{uid} doc. */
const clone = value => value === undefined ? undefined : structuredClone(value);

/* ---- firebase-app ---- */
export const initializeApp = () => ({});

/* ---- firebase-auth ---- */
let authCallback = null;
let currentUser = {uid:'test-uid'};
export const getAuth = () => ({ currentUser });
export const signInAnonymously = () => Promise.resolve({user:currentUser});
export const onAuthStateChanged = (auth, cb) => { authCallback = cb; cb(currentUser); return () => {}; };
export function __signInAs(uid){
  currentUser = {uid};
  authCallback?.(currentUser);
}

/* ---- firebase-firestore ---- */
export const store = new Map();
export const getFirestore = () => ({});
export const doc = (db, ...segments) => ({path:segments.join('/')});

function snapshot(path){
  const data = clone(store.get(path));
  return {exists:() => data !== undefined, data:() => data};
}

function assertReadable(path){
  const match = /^rooms\/[^/]+\/private\/([^/]+)$/.exec(path);
  if(match && match[1] !== currentUser.uid) throw new Error(`permission-denied: ${currentUser.uid} read ${path}`);
}

export const getDoc = async ref => { assertReadable(ref.path); return snapshot(ref.path); };
export const setDoc = async (ref, data) => { store.set(ref.path, clone(data)); };

/* Writes are buffered and applied only if the callback resolves, so a
   throwing transaction leaves the store untouched — like Firestore. */
export async function runTransaction(db, fn){
  const writes = [];
  const tx = {
    get:async ref => { assertReadable(ref.path); return snapshot(ref.path); },
    set:(ref, data) => { writes.push(() => store.set(ref.path, clone(data))); return tx; },
    update:(ref, data) => {
      writes.push(() => {
        if(!store.has(ref.path)) throw new Error(`not-found: ${ref.path}`);
        store.set(ref.path, {...store.get(ref.path), ...clone(data)});
      });
      return tx;
    }
  };
  const result = await fn(tx);
  writes.forEach(write => write());
  return result;
}

export const onSnapshot = () => () => {};

export function __reset(){
  store.clear();
  __signInAs('test-uid');
}
