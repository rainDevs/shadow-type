// Small random helpers.

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Pick a challenge different from the previous one when possible.
export function pickChallenge(list, previous) {
  if (list.length <= 1) return list[0];
  let next = randomItem(list);
  let guard = 0;
  while (next === previous && guard++ < 8) next = randomItem(list);
  return next;
}
