// Typing panel for timed turns: endless single-word stream.
// Correct → cyan, incorrect → red with underline (not color alone),
// current char underlined, remaining muted.

import { useEffect, useRef } from 'react';

export function TypingChallenge({ challenge, typed, disabled, onType, wordsDone }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [challenge, disabled]);

  return (
    <div className="typing-panel">
      <p className="typing-label">
        Type the word <span className="words-tally" aria-live="polite">{wordsDone} done</span>
      </p>
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
