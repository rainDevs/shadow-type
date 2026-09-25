// Score calculation (PLAN.md section 19).

export function calculateChallengeScore({ charsTyped, accuracy, combo, damage, critical }) {
  const typingScore = charsTyped * 10;
  const accuracyBonus = Math.round((accuracy / 100) * charsTyped * 5);
  const comboBonus = combo * 25;
  const damageScore = damage * 10;
  const criticalBonus = critical ? 150 : 0;
  return typingScore + accuracyBonus + comboBonus + damageScore + criticalBonus;
}
