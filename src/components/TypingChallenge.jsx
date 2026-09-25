// Typing challenge display + input (PLAN.md section 9).
// Correct → cyan, incorrect → red with strikethrough (not color alone),
// current char underlined, remaining muted.

import { useEffect, useRef } from 'react';

export function TypingChallenge({ challenge, typed, disabled, onType }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [challenge, disabled]);

  return (
    <div className="typing-panel">
      <p className="typing-label">Type this</p>
      <p className="challenge-text" aria-label={`Type: ${challenge}`}>
        {challenge.split('').map((ch, i) => {
          let cls = 'ch-remaining';
          if (i < typed.length) cls = typed[i] === ch ? 'ch-correct' : 'ch-wrong';
          else if (i === typed.length && !disabled) cls = 'ch-current';
          return (
            <span key={i} className={cls}>
              {ch === ' ' ? ' ' : ch}
            </span>
          );
        })}
      </p>
      <input
        ref={inputRef}
        className="typing-input"
        value={typed}
        disabled={disabled}
        onChange={(e) => onType(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Typing input"
        placeholder={disabled ? '' : 'Type here…'}
      />
    </div>
  );
}
