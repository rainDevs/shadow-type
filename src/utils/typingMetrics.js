// Typing metric calculations (PLAN.md section 10).

// WPM = (characters typed / 5) / elapsed minutes
export function calculateWPM(charactersTyped, elapsedMs) {
  if (elapsedMs <= 0 || charactersTyped <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return (charactersTyped / 5) / minutes;
}

// accuracy = correct characters / total characters typed * 100
export function calculateAccuracy(correctChars, totalTyped) {
  if (totalTyped <= 0) return 100;
  return (correctChars / totalTyped) * 100;
}

export function round1(value) {
  return Math.round(value * 10) / 10;
}
