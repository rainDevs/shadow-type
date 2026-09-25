// Damage calculation (PLAN.md sections 11-12).
// Deterministic: damage comes from typing performance, never pure random.

export const DAMAGE_MIN = 3;
export const DAMAGE_MAX = 25;
export const CRITICAL_MULTIPLIER = 1.5;

export function calculateDamage({ wpm, accuracy, combo }) {
  const baseDamage = 5;
  const speedBonus = Math.max(0, wpm) / 20;
  const comboBonus = Math.max(0, combo) * 0.5;
  const accuracyMultiplier = Math.min(100, Math.max(0, accuracy)) / 100;

  let damage = (baseDamage + speedBonus + comboBonus) * accuracyMultiplier;
  const critical = isCriticalHit({ accuracy, combo });
  if (critical) damage *= CRITICAL_MULTIPLIER;

  damage = Math.round(damage);
  damage = Math.min(DAMAGE_MAX, Math.max(DAMAGE_MIN, damage));
  return { damage, critical };
}

export function isCriticalHit({ accuracy, combo }) {
  return accuracy >= 95 && combo >= 5;
}
