// Shared platform detection for strict mobile-vs-mobile / desktop-vs-desktop matchmaking.
// Server keeps its own copy (server/arena-server.js must stay standalone for Render).

export function normalizePlatform(value) {
  return value === 'mobile' ? 'mobile' : 'desktop';
}

// Browser-only: coarse pointer + touch + mobile UA => mobile, else desktop.
// Deterministic and stable per session (no resize flip-flopping mid-queue).
export function getPlatform() {
  try {
    if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) {
      return 'mobile';
    }
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const touch = (navigator.maxTouchPoints ?? 0) > 0;
      if (coarse && touch) return 'mobile';
    }
  } catch {
    /* fall through to desktop */
  }
  return 'desktop';
}
