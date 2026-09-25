// Continuous Monkeytype-style passage typing.
// Flowing words, block caret, per-character coloring. A hidden input captures
// keys (mobile-friendly); clicking the passage focuses it.

import { useCallback, useEffect, useRef, useState } from 'react';

export function TypingChallenge({ challenge, typed, disabled, onType, wordsDone, enemyTurn, locked }) {
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const caretRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const pos = typed.length;

  const focusInput = useCallback(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    focusInput();
  }, [challenge, disabled, focusInput]);

  // Keep the caret line visible as the passage grows.
  useEffect(() => {
    const box = scrollRef.current;
    const caret = caretRef.current;
    if (box && caret) {
      const target = caret.offsetTop - box.clientHeight / 2 + caret.clientHeight / 2;
      box.scrollTop = Math.max(0, target);
    }
  }, [pos]);

  const showReminder = !disabled && !focused;

  return (
    <div className="typing-panel">
      <p className="typing-label">
        Type the text <span className="words-tally" aria-live="polite">{wordsDone} words</span>
      </p>
      <div
        className={`passage-box ${showReminder || enemyTurn || locked ? 'blurred' : ''}`}
        onClick={focusInput}
        role="presentation"
      >
        <div ref={scrollRef} className="passage-scroll">
          <p className="passage-text" aria-label={`Type: ${challenge.slice(0, 80)}…`}>
            {challenge.split('').map((ch, i) => {
              let cls = 'ch-remaining';
              if (i < typed.length) cls = typed[i] === ch ? 'ch-correct' : 'ch-wrong';
              const caret = i === pos && !disabled ? ' ch-caret' : '';
              const space = ch === ' ' ? ' ch-space' : '';
              return (
                <span
                  key={i}
                  ref={i === pos ? caretRef : undefined}
                  className={`${cls}${caret}${space}`}
                >
                  {ch}
                </span>
              );
            })}
            {pos >= challenge.length && <span ref={caretRef} className="ch-caret ch-end" />}
          </p>
        </div>
        {showReminder && (
          <button type="button" className="focus-reminder" onClick={focusInput}>
            Click here to focus
          </button>
        )}
        {enemyTurn && !locked && !showReminder && (
          <div className="focus-reminder" aria-live="polite">
            Enemy turn — stand by
          </div>
        )}
        {locked && (
          <div className="focus-reminder" aria-live="polite">
            Time!
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        className="typing-input-hidden"
        value={typed}
        disabled={disabled}
        onChange={(e) => onType(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Typing input"
      />
    </div>
  );
}
