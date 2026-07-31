/* Shared mutable state, held as properties on one object so every module
   gets a live reference without needing to reassign an imported binding
   (ES module `let`/`const` exports can't be rebound from outside their
   defining module). */
export const State = {
  G: null,          // the whole game-in-progress object
  pendingCase: null, // Case chosen on the Case screen, before players are set
  artStyle: 'ink',   // selected visual language for the next local or remote Case
  secretSel: [],     // signal indices picked while composing a Buried Secret reveal
  chronReturn: null, // screen id to return to after an interim Dossier view
  onlineRoomCode: null // non-null while playing in a synced Firebase room; null in local hotseat mode
};
