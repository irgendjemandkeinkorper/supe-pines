const HOUR_MS = 60 * 60 * 1000;

export function characterSideLabel(_kind, sideIndex){
  return sideIndex === 1 ? 'Bad Day' : 'Good Day';
}

export function normalizeArchIndices(indices, heroCount){
  if(!Array.isArray(indices)) return [];
  return [...new Set(indices)]
    .filter(index => Number.isInteger(index) && index >= 0 && index < heroCount)
    .slice(0, 2);
}

export function canAddContribution(contributions, playerIndex, maxPerPlayer=2){
  if(!Array.isArray(contributions)) return true;
  return contributions.filter(item => item?.pi === playerIndex).length < maxPerPlayer;
}

export function replaceOmenByVote(state, signalIndex, voters, playerCount){
  if(!state || !Array.isArray(state.signalRow) || !Array.isArray(state.signalDeck)) return false;
  if(!Number.isInteger(signalIndex) || signalIndex < 0 || signalIndex >= state.signalRow.length) return false;
  const uniqueVoters = [...new Set(Array.isArray(voters) ? voters : [])];
  if(uniqueVoters.length < playerCount) return false;
  const [oldOmen] = state.signalRow.splice(signalIndex, 1);
  state.signalDeck.push(oldOmen);
  const replacement = state.signalDeck.shift();
  if(replacement) state.signalRow.splice(signalIndex, 0, replacement);
  return true;
}

export function roomExpiryTimestamp(now=Date.now()){
  return now + HOUR_MS;
}

export const ROOM_RETENTION_MS = HOUR_MS;
