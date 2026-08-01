// Firebase project config for Supe Pines. This is a client-side identifier,
// not a service-account secret. Firestore rules and Firebase Auth settings
// provide the access control for remote rooms.
export const firebaseConfig = {
  apiKey: "AIzaSyDKzNktpABqEvyoxVH_usylJadHwdlqSb8",
  authDomain: "supe-pine.firebaseapp.com",
  projectId: "supe-pine",
  storageBucket: "supe-pine.firebasestorage.app",
  messagingSenderId: "1072717573853",
  appId: "1:1072717573853:web:60ad7a40b793fc39c77534",
  measurementId: "G-GSC3PZ1TZS"
};

export const firebaseConfigured = Object.values(firebaseConfig)
  .every(value => typeof value === 'string' && value.length > 0 && !value.includes('REPLACE_ME'));
