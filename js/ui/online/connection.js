/* Firebase readiness check and the online entry-screen states (missing config, verifying, failed, form). */
import { $, esc } from '../../engine/utils.js';
import { CASES } from '../../data/index.js';
import { show } from '../screens.js';
import { verifyFirebaseReadiness } from '../../sync/auth.js';
import { firebaseConfigured } from '../../sync/config.js';
import { artStylePickerHTML } from '../art.js';
import { session } from './session.js';
import { leaveOnlineRoom, onlineCreateRoom, onlineJoinRoom, onlineRefreshArtPicker, showOnlineEntry, tryAutoRejoin } from './entry.js';

export async function onlineVerifyAndProceed() {
  session.firebaseVerificationStatus = 'verifying';
  session.firebaseVerificationError = null;
  renderOnlineVerificationLoading();
  show('scr-online-entry');

  try {
    await verifyFirebaseReadiness();
    session.firebaseVerificationStatus = 'ready';
    showOnlineEntry(); // Re-render with the ready state (the entry form)
  } catch (err) {
    session.firebaseVerificationStatus = 'failed';
    session.firebaseVerificationError = err;
    renderOnlineVerificationFailed(err);
    show('scr-online-entry');
  }
}

export async function initFirebaseConnection() {
  if (!firebaseConfigured) return;
  session.firebaseVerificationStatus = 'verifying';
  try {
    await verifyFirebaseReadiness();
    session.firebaseVerificationStatus = 'ready';
    await tryAutoRejoin();
  } catch (err) {
    console.warn('[sync] Firebase background verification failed', err);
    session.firebaseVerificationStatus = 'failed';
    session.firebaseVerificationError = err;
    const onlineButton = document.getElementById('title-online-button');
    if(onlineButton){
      onlineButton.classList.remove('primary');
      onlineButton.classList.add('ghost');
      onlineButton.textContent = 'Online (connection issue)';
      onlineButton.title = 'Firebase connection failed. Click to view details and troubleshoot.';
    }
    const params = new URLSearchParams(location.search);
    if(params.get('room')){
      showOnlineEntry();
    }
  }
}

export function renderOnlineMissingConfig() {
  $('scr-online-entry').innerHTML = `
    <div class="panel u-panel-centered">
      <div class="sc" style="color:var(--blood-bright);letter-spacing:.22em">REMOTE TABLES</div>
      <h2 class="u-mt-10">The Switchboard Isn’t Live Yet</h2>
      <p class="muted" style="max-width:540px;margin:12px auto 0">This public build is ready for hotseat play on one shared screen. Separate-screen rooms need a dedicated Firebase project before they can safely open.</p>

      <div class="panel tight" style="text-align:left;background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.1);margin:20px auto;max-width:540px;">
        <h4 class="u-gold u-mt-0">Required Firebase Setup Steps:</h4>
        <ol class="small" style="padding-left:18px;line-height:1.5;color:var(--text-parchment)">
          <li><strong>Firebase Config:</strong> Register a Web app in the Firebase console, and copy the config object into <code class="u-blood">js/sync/config.js</code>.</li>
          <li><strong>Anonymous Auth:</strong> Enable Anonymous sign-in under Build → Authentication → Sign-in method.</li>
          <li><strong>Firestore Database:</strong> Create a Firestore database in <strong>Production Mode</strong>.</li>
          <li><strong>Firestore Rules:</strong> Publish the rules from <code class="u-blood">firestore.rules</code> in the Firestore Rules tab.</li>
          <li><strong>Authorized Domains:</strong> Add your deployment domain (e.g. your-username.github.io) under Authentication → Settings → Authorized domains.</li>
        </ol>
      </div>

      <p class="small" style="max-width:540px;margin:14px auto 0;color:var(--text-parchment-muted)">If you’re hosting tonight, choose <strong>Open the Case</strong>. Nothing in the local game depends on Firebase.</p>
      <div class="btnrow u-justify-center u-mt-22">
        <button class="primary" onclick="show('scr-hook')">Open the Case</button>
        <button class="ghost" onclick="show('scr-title')">Back</button>
      </div>
    </div>`;
}

export function renderOnlineVerificationLoading() {
  $('scr-online-entry').innerHTML = `
    <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    </style>
    <div class="panel u-panel-centered">
      <div class="sc" style="color:var(--gold);letter-spacing:.22em">VERIFYING SWITCHBOARD</div>
      <h2 class="u-mt-10">Testing Connection to Millhaven...</h2>
      <p class="muted" style="max-width:540px;margin:12px auto 0">Verifying Anonymous Authentication and Firestore database availability.</p>
      <div style="margin:24px 0;">
        <div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.1); border-left-color: var(--gold); border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <div class="btnrow u-justify-center u-mt-22">
        <button class="ghost" onclick="leaveOnlineRoom()">Cancel</button>
      </div>
    </div>`;
}

export function renderOnlineVerificationFailed(error) {
  const msg = error && error.message ? error.message : String(error);

  // Categorize the error for the user
  let categoryTitle = "Connection Failed";
  let diagnostic = "An unknown error occurred while establishing a secure session with Firebase.";
  let actionRequired = "Verify that your internet connection is active and that your Firebase project configuration in <code>js/sync/config.js</code> is valid and contains no placeholder values.";

  if (!firebaseConfigured) {
    categoryTitle = "Missing Configuration";
    diagnostic = "The Firebase SDK config contains empty or default values.";
    actionRequired = "Add your web app credentials to <code>js/sync/config.js</code> before launching remote multiplayer.";
  } else if (msg.includes("auth") || msg.includes("operation-not-allowed") || msg.includes("sign-in") || msg.includes("uid") || msg.includes("unauthorized") || msg.includes("domains")) {
    categoryTitle = "Authentication Blocked";
    diagnostic = "The application could not establish an anonymous session (Auth error).";
    actionRequired = "Ensure that <strong>Anonymous Sign-in</strong> is enabled under Build → Authentication → Sign-in method in your Firebase Console, and that your current domain is listed in <strong>Authorized domains</strong>.";
  } else if (msg.includes("permission-denied") || msg.includes("rules") || msg.includes("Firestore") || msg.includes("denied")) {
    categoryTitle = "Database Read Blocked";
    diagnostic = "Authenticated successfully, but the test read was blocked by Firestore security rules.";
    actionRequired = "Ensure that your Firestore Database has been created (in <strong>Production Mode</strong>) and that the security rules from <code>firestore.rules</code> are pasted and published under the Firestore Rules tab in your Firebase Console.";
  } else if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch") || msg.includes("offline")) {
    categoryTitle = "Network Offline";
    diagnostic = "The request to the Firebase servers timed out or failed to route.";
    actionRequired = "Check your internet connection or firewall. If you are deploying to GitHub Pages, ensure you have added your custom domain or GitHub Pages URL to your Firebase Authorized Domains list.";
  }

  $('scr-online-entry').innerHTML = `
    <div class="panel u-panel-centered">
      <div class="sc" style="color:var(--blood-bright);letter-spacing:.22em">SWITCHBOARD OFFLINE</div>
      <h2 class="u-mt-10">${esc(categoryTitle)}</h2>

      <div class="panel tight" style="text-align:left;background:rgba(217, 83, 79, 0.05);border-color:var(--blood);margin:20px auto;max-width:540px;">
        <p class="small" style="margin-top:0"><strong>Details:</strong> <span style="color:var(--text-blush-pale)">${esc(msg)}</span></p>
        <p class="small" style="margin-bottom:0;color:var(--text-parchment)"><strong>Diagnostic:</strong> ${diagnostic}</p>
      </div>

      <div class="panel tight" style="text-align:left;background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.1);margin:20px auto;max-width:540px;">
        <h4 class="u-gold u-mt-0">How to Fix This:</h4>
        <p class="small" style="line-height:1.5;color:var(--text-parchment);margin-bottom:0">${actionRequired}</p>
        <hr class="rule" style="border-color:rgba(255,255,255,0.1);margin:12px 0">
        <h4 class="u-gold u-mt-0">The Firebase Release Checklist:</h4>
        <ol class="small" style="padding-left:18px;line-height:1.5;color:var(--text-parchment);margin-bottom:0">
          <li><strong>Firebase Config:</strong> Web app config populated in <code>js/sync/config.js</code>.</li>
          <li><strong>Anonymous Auth:</strong> Enabled in Build → Authentication → Sign-in method.</li>
          <li><strong>Firestore Database:</strong> Created in <strong>Production Mode</strong> (not test mode).</li>
          <li><strong>Firestore Rules:</strong> Rules from <code>firestore.rules</code> copied & published.</li>
          <li><strong>Authorized Domains:</strong> Deployment URL authorized under Authentication → Settings.</li>
        </ol>
      </div>

      <p class="small" style="max-width:540px;margin:14px auto 0;color:var(--text-parchment-muted)">You can still play tonight using Hotseat mode (all storytellers sharing one screen).</p>

      <div class="btnrow u-justify-center u-mt-22">
        <button class="primary" onclick="onlineVerifyAndProceed()">Retry Connection</button>
        <button class="primary" onclick="show('scr-hook')">Play Hotseat (Open the Case)</button>
        <button class="ghost" onclick="leaveOnlineRoom()">Back</button>
      </div>
    </div>`;
}

export function renderOnlineEntryForm() {
  $('scr-online-entry').innerHTML = `
    <h2 class="center">Play Online</h2>
    <p class="center muted">Gather your team across separate screens. One person opens the case; everyone else joins with the code.</p>
    <div class="ornament">❦</div>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));max-width:900px;margin:0 auto">
      <div class="panel">
        <h3 class="u-gold">Open a New Case</h3>
        <label class="fld" for="oe-case">Choose the Case</label>
        <select id="oe-case" onchange="onlineRefreshArtPicker()">${CASES.map((h,i)=>`<option value="${i}">${esc(h.title)}</option>`).join('')}</select>
        <div id="oe-art-style-picker">${artStylePickerHTML('oe-art-style', null, CASES[0].id)}</div>
        <label class="fld" for="oe-host-name">Your name</label>
        <input type="text" id="oe-host-name" placeholder="Storyteller I">
        <div class="btnrow">
          <button class="primary" onclick="onlineCreateRoom()">Open the Table</button>
        </div>
      </div>
      <div class="panel">
        <h3 class="u-gold">Join a Case in Progress</h3>
        <label class="fld" for="oe-join-code">Room code</label>
        <input type="text" id="oe-join-code" placeholder="e.g. K7QRM" style="text-transform:uppercase">
        <label class="fld" for="oe-join-name">Your name</label>
        <input type="text" id="oe-join-name" placeholder="Your name">
        <div class="btnrow">
          <button class="primary" onclick="onlineJoinRoom()">Join the Table</button>
        </div>
      </div>
    </div>
    <div class="btnrow u-justify-center u-mt-20">
      <button class="ghost" onclick="leaveOnlineRoom()">Back</button>
    </div>`;
}

/* Small per-device scratch state for in-progress, uncommitted composition
   (which card/Hero picked, contribution draft, flip checkboxes,
   secret-signal picks). None of this is synced — only the final submit
   actions above write to Firestore. Reset whenever the underlying
   room-driven phase changes shape from under it. */
