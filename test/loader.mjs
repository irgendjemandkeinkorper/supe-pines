/* Routes the pinned Firebase CDN imports to an in-memory fake so sync-layer
   modules load under `node --test` with no network or credentials. */
const FAKE_FIREBASE = new URL('./fakes/firebase.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('https://www.gstatic.com/firebasejs/')) {
    return { shortCircuit: true, url: FAKE_FIREBASE };
  }
  return nextResolve(specifier, context);
}
