import { useMemo } from 'react';

// Decorative floating keyboard keycaps for the main menu (CSS-animated).
// Deterministic pseudo-random layout; hidden from assistive tech;
// honors prefers-reduced-motion via CSS like Embers.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function Keycaps({ count = 18 }) {
  const caps = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        glyph: GLYPHS[(i * 7 + 3) % GLYPHS.length],
        left: `${(i * 53 + 11) % 100}%`,
        duration: `${9 + ((i * 37) % 9)}s`,
        delay: `${-((i * 61) % 16)}s`,
        font: 10 + ((i * 29) % 13),
        drift: (i % 2 === 0 ? 1 : -1) * (20 + ((i * 13) % 30)),
        spin: (i % 2 === 0 ? 1 : -1) * (8 + ((i * 17) % 14)),
      })),
    [count],
  );
  return (
    <div className="st-keycaps" aria-hidden="true">
      {caps.map((c) => (
        <span
          key={c.id}
          className="keycap"
          style={{
            left: c.left,
            fontSize: c.font,
            animationDuration: c.duration,
            animationDelay: c.delay,
            '--drift': `${c.drift}px`,
            '--spin': `${c.spin}deg`,
          }}
        >
          {c.glyph}
        </span>
      ))}
    </div>
  );
}
