/* PLACEHOLDER — online multiplayer will not work until this is replaced.
   Hotseat play works fine regardless (this file is only ever touched by
   js/sync/firebase-init.js, and the app never requires online mode to
   function).

   To enable online multiplayer, see the "Firebase setup" section of
   README.md, then replace the object below with the real firebaseConfig
   shown to you when you register a Web app in the Firebase console. */
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.firebasestorage.app",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

/* Keep the public build honest while this object still contains the starter
   placeholders. The title screen can explain that remote rooms need their
   Firebase project instead of leading players into a sign-in failure. */
export const firebaseConfigured = Object.values(firebaseConfig)
  .every(value => typeof value === 'string' && value.length > 0 && !value.includes('REPLACE_ME'));
