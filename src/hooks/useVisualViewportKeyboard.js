// Tracks the on-screen keyboard via visualViewport.
// Sets --vv-height and toggles .keyboard-open on <body> so CSS can shrink
// the battle layout instead of hiding the typing row behind the keyboard.
import { useEffect } from 'react';

export function useVisualViewportKeyboard() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const isTouchKeyboard = () => {
      try {
        if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) return true;
        return !!window.matchMedia?.('(pointer: coarse)').matches;
      } catch {
        return false;
      }
    };
    const update = () => {
      try {
        const vh = vv.height;
        document.documentElement.style.setProperty('--vv-height', `${Math.round(vh)}px`);
        // Desktop resizes (e.g. devtools) must not trigger keyboard layout.
        if (!isTouchKeyboard()) {
          document.body.classList.remove('keyboard-open');
          return;
        }
        const inner = window.innerHeight || vh;
        // Keyboard open when the visual viewport is notably shorter.
        const open = vh < inner * 0.8;
        document.body.classList.toggle('keyboard-open', open);
        if (open) {
          document.querySelector('.typing-panel')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }
      } catch {
        /* best-effort */
      }
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      try {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
        window.removeEventListener('orientationchange', update);
      } catch {
        /* ignore */
      }
      try {
        document.body.classList.remove('keyboard-open');
        document.documentElement.style.removeProperty('--vv-height');
      } catch {
        /* ignore */
      }
    };
  }, []);
}
