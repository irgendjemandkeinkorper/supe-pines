export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('https://')) {
    let exports = '';
    if (specifier.includes('firebase-app.js')) {
      exports = 'export const initializeApp = () => ({});';
    } else if (specifier.includes('firebase-auth.js')) {
      exports = 'export const getAuth = () => ({ currentUser: {} }); export const signInAnonymously = () => Promise.resolve({}); export const onAuthStateChanged = (auth, cb) => { cb({ uid: "test-uid" }); return () => {}; };';
    } else if (specifier.includes('firebase-firestore.js')) {
      exports = 'export const getFirestore = () => ({}); export const doc = () => ({}); export const setDoc = () => Promise.resolve(); export const runTransaction = () => Promise.resolve(); export const onSnapshot = () => (() => {});';
    }
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(exports)}`
    };
  }
  return nextResolve(specifier, context);
}
