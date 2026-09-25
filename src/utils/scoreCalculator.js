// Score calculation for timed turns.
// Words pay per character as they land; the window bonus rewards
// accuracy, throughput and damage when the turn ends.

export function calculateWordScore(chars) {
  return chars * 10;
}

export function calculateWindowBonus({ accuracy, words, damage, critical }) {
  const accuracyBonus = Math.round((accuracy / 100) * words * 10);
  const damageScore = damage * 10;
  const criticalBonus = critical ? 150 : 0;
  return accuracyBonus + damageScore + criticalBonus;
}
