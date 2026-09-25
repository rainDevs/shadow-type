// Typing metric calculations (PLAN.md section 10).

// WPM calculations.
// Gross WPM = (characters typed / 5) / elapsed minutes.
// Adjusted WPM (modern leaderboard style) scales gross down by accuracy:
//   Adjusted WPM = Gross WPM × (Accuracy % / 100)
export function calculateWPM(charactersTyped, elapsedMs, accuracy = 100) {
  if (elapsedMs <= 0 || charactersTyped <= 0) return 0;
  const minutes = elapsedMs / 60000;
  const gross = charactersTyped / 5 / minutes;
  const factor = Math.min(100, Math.max(0, accuracy)) / 100;
  return gross * factor;
}

// accuracy = correct characters / total characters typed * 100
export function calculateAccuracy(correctChars, totalTyped) {
  if (totalTyped <= 0) return 100;
  return (correctChars / totalTyped) * 100;
}

export function round1(value) {
  return Math.round(value * 10) / 10;
}
