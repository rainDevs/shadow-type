import { useMemo } from 'react';

// Decorative rising embers for menu screens (CSS-animated, no canvas).
// Hidden from assistive tech; honors prefers-reduced-motion via CSS.
export function Embers({ count = 24 }) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 97) % 100}%`,
        duration: `${7 + ((i * 37) % 9)}s`,
        delay: `${-((i * 53) % 12)}s`,
        size: 2 + ((i * 29) % 3),
      })),
    [count],
  );
  return (
    <div className="st-embers" aria-hidden="true">
      {embers.map((e) => (
        <i
          key={e.id}
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDuration: e.duration,
            animationDelay: e.delay,
          }}
        />
      ))}
    </div>
  );
}
