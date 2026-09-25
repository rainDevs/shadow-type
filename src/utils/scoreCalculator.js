// Score calculation for timed turns.
// Correct characters pay 10 points each as words complete; the window bonus
// rewards accuracy, throughput and damage when the turn ends.

export function calculateCharScore(correctChars) {
  return correctChars * 10;
}

export function calculateWindowBonus({ accuracy, words, damage }) {
  const accuracyBonus = Math.round((accuracy / 100) * words * 10);
  const damageScore = damage * 10;
  return accuracyBonus + damageScore;
}
