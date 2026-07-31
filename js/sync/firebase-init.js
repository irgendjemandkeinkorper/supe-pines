/* Single place the Firebase SDK version is pinned. Every other sync file
   imports app/auth/db from HERE, not from the CDN URLs directly — mixing
   SDK versions across files causes duplicate-app / "no Firebase App"
   errors. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
