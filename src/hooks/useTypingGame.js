// Central timed-turn combat state machine (Monkeytype-style).
// Player turn: type a continuous flowing passage for turnSeconds; damage
// comes from window adjusted-WPM. Then a quick CPU strike. React owns ALL
// game logic; PixiGame only plays animations on command.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DIFFICULTIES } from '../data/difficulty.js';
import { MODES } from '../data/modes.js';
import { TIMED_WORDS } from '../data/timedWords.js';
import { calculateWPM, calculateAccuracy } from '../utils/typingMetrics.js';
import { calculateWindowDamage } from '../utils/damageCalculator.js';
import { calculateCharScore, calculateWindowBonus } from '../utils/scoreCalculator.js';
import { pickChallenge, randomInt } from '../utils/random.js';
import { qualifiesForHighScores, addHighScore } from '../utils/storage.js';
import { audio } from '../utils/audioManager.js';

let feedbackId = 0;

// Pre-fight countdown: lets the player prepare before the first turn.
// The passage is already visible (sharp, input disabled) so they can read it.
const COUNTDOWN_STEPS = [
  { value: '3', ms: 750, freq: 440 },
  { value: '2', ms: 750, freq: 440 },
  { value: '1', ms: 750, freq: 440 },
  { value: 'Type!', ms: 600, freq: 880 },
];

// Beat between time-up and the strike (lets the player see TIME!).
const STRIKE_DELAY_MS = 650;

const PASSAGE_WORDS = 100; // generated per turn; extended as needed
const EXTEND_THRESHOLD = 30; // chars from the end that trigger extension
const EXTEND_WORDS = 30;

function buildPassage(pool, count, previous) {
  const words = [];
  let prev = previous ?? '';
  for (let i = 0; i < count; i++) {
    const w = pickChallenge(pool, prev);
    words.push(w);
    prev = w;
  }
  return words.join(' ');
}

// Word boundaries [{start, end}] over a passage (end excludes trailing space).
function wordBounds(passage) {
  const bounds = [];
  let start = 0;
  for (let i = 0; i <= passage.length; i++) {
    if (i === passage.length || passage[i] === ' ') {
      if (i > start) bounds.push({ start, end: i });
      start = i + 1;
    }
  }
  return bounds;
}

export function useTypingGame({ modeId, mode, difficultyId, difficulty, pixiRef }) {
  // Mode sets turn length + word pool; difficulty sets CPU damage.
  // Accept both new (modeId/difficultyId) and legacy (difficulty as id) props.
  const modeKey = modeId ?? mode ?? 'medium';
  const diffKeyRaw = difficultyId ?? difficulty ?? 'medium';
  const diffKey = diffKeyRaw === 'normal' ? 'medium' : diffKeyRaw;
  const modeCfg = MODES[modeKey] ?? MODES.medium;
  const diffCfg = DIFFICULTIES[diffKey] ?? DIFFICULTIES.medium;
  const config = useMemo(
    () => ({
      ...modeCfg,
      ...diffCfg,
      turnSeconds: modeCfg.turnSeconds,
      wordPool: modeCfg.wordPool,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modeKey, diffKey],
  );
  const difficultyLabel = diffCfg.id;
  const modeLabel = modeCfg.id;
  const pool = TIMED_WORDS[config.wordPool];
  const turnMs = config.turnSeconds * 1000;
  const maxHp = config.maxHp;

  const [status, setStatus] = useState('countdown'); // countdown | playing | paused | won | lost
  const [countdown, setCountdown] = useState('3');
  const [turn, setTurn] = useState('player'); // player | cpu
  const [playerHp, setPlayerHp] = useState(maxHp);
  const [cpuHp, setCpuHp] = useState(maxHp);
  const [score, setScore] = useState(0);
  const [passage, setPassage] = useState(() => buildPassage(pool, PASSAGE_WORDS));
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(config.turnSeconds);
  const [wordsDone, setWordsDone] = useState(0);
  const [locked, setLocked] = useState(false); // window over, strike pending
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);

  const statusRef = useRef('countdown');
  const turnRef = useRef('player');
  const playerHpRef = useRef(maxHp);
  const cpuHpRef = useRef(maxHp);
  const scoreRef = useRef(0);
  const passageRef = useRef('');
  const boundsRef = useRef([]);
  const bankedRef = useRef(0); // words banked for score so far
  const busyRef = useRef(false);
  const turnEndsAtRef = useRef(0);
  const pauseStartRef = useRef(0);
  const remainingRef = useRef(0);
  // Per-position correctness for the current window (true/false/null).
  const recordRef = useRef([]);
  // Match totals (keystroke accuracy).
  const keysCorrectRef = useRef(0);
  const keysTotalRef = useRef(0);
  const totalDamageRef = useRef(0);
  const matchWordsRef = useRef(0);
  const turnsRef = useRef(0);
  const wpmSumRef = useRef(0);
  const windowTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const cpuTimeoutRef = useRef(null);
  const strikeTimeoutRef = useRef(null);
  const strikeDueAtRef = useRef(0);
  const strikeRemainingRef = useRef(0);
  const struckRef = useRef(false);
  const feedbackTimerRef = useRef(null);
  const aliveRef = useRef(true);
  const matchGenRef = useRef(0);
  const endWindowRef = useRef(null);
  const doStrikeRef = useRef(null);
  const startCpuTurnRef = useRef(null);
  const startPlayerTurnRef = useRef(null);

  const setStatusBoth = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const setTurnBoth = useCallback((t) => {
    turnRef.current = t;
    setTurn(t);
  }, []);

  const showFeedback = useCallback((kind, text, amount) => {
    feedbackId += 1;
    const id = feedbackId;
    setFeedback({ id, kind, text, amount });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      if (aliveRef.current) setFeedback(null);
    }, 1800);
  }, []);

  // Window totals derived from the position record.
  const windowTotals = useCallback(() => {
    let correct = 0;
    let total = 0;
    for (const r of recordRef.current) {
      if (r != null) {
        total += 1;
        if (r) correct += 1;
      }
    }
    return { correct, total };
  }, []);

  const refreshLive = useCallback(() => {
    const elapsedMs = Math.max(1, turnMs - Math.max(0, turnEndsAtRef.current - Date.now()));
    const { correct, total } = windowTotals();
    const acc = total > 0 ? (correct / total) * 100 : 100;
    setLiveWpm(calculateWPM(total, elapsedMs, acc));
    setLiveAcc(calculateAccuracy(keysCorrectRef.current, keysTotalRef.current));
  }, [turnMs, windowTotals]);

  // --- match end (declared before the turn actions that call it) -------------------
  const endMatch = useCallback(
    (won) => {
      if (windowTimerRef.current) clearInterval(windowTimerRef.current);
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      if (strikeTimeoutRef.current) clearTimeout(strikeTimeoutRef.current);
      const pixi = pixiRef.current;
      if (won) {
        pixi?.victory();
        audio.playVictory();
      } else {
        pixi?.defeat();
        audio.playDefeat();
      }
      audio.stopMusic();
      const avgWpm = turnsRef.current > 0 ? wpmSumRef.current / turnsRef.current : 0;
      const accuracy = calculateAccuracy(keysCorrectRef.current, keysTotalRef.current);
      const finalScore = scoreRef.current;
      setResults({
        won,
        score: finalScore,
        avgWpm,
        accuracy,
        totalDamage: totalDamageRef.current,
        turns: turnsRef.current,
        words: matchWordsRef.current,
        difficulty: difficultyLabel,
        mode: modeLabel,
        qualifies: qualifiesForHighScores(finalScore),
      });
      // Announce first (fighters play defeat/victory in full view), then the
      // player clicks anywhere to reveal the results screen.
      setStatusBoth('announce');
    },
    [difficultyLabel, modeLabel, pixiRef, setStatusBoth],
  );

  // Player clicked through the end-of-fight banner → show results.
  const acknowledgeEnd = useCallback(() => {
    if (statusRef.current !== 'announce') return;
    setStatusBoth(results?.won ? 'won' : 'lost');
  }, [results, setStatusBoth]);

  // --- countdown: 3-2-1-Type! before the first turn of a match -------------------
  // Builds the opening passage up front so the player can read it while the
  // countdown runs (input stays disabled until status flips to playing).
  const runCountdown = useCallback(() => {
    const myGen = matchGenRef.current;
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setStatusBoth('countdown');
    const text = buildPassage(pool, PASSAGE_WORDS);
    passageRef.current = text;
    boundsRef.current = wordBounds(text);
    bankedRef.current = 0;
    recordRef.current = [];
    setPassage(text);
    setTyped('');
    setWordsDone(0);
    setLiveWpm(0);
    setTimeLeft(config.turnSeconds);
    let i = 0;
    const step = () => {
      if (!aliveRef.current || myGen !== matchGenRef.current) return;
      if (i >= COUNTDOWN_STEPS.length) {
        setStatusBoth('playing');
        startPlayerTurnRef.current?.(true); // reuse the previewed text
        return;
      }
      const s = COUNTDOWN_STEPS[i];
      setCountdown(s.value);
      audio.blip({ freq: s.freq, type: 'square', duration: 0.12, volume: 0.3 });
      i += 1;
      countdownTimerRef.current = setTimeout(step, s.ms);
    };
    step();
  }, [config, pool, setStatusBoth]);

  // --- player turn ---------------------------------------------------------------------------
  const startPlayerTurn = useCallback((keepText = false) => {
    if (!aliveRef.current || statusRef.current !== 'playing') return;
    setTurnBoth('player');
    busyRef.current = false;
    struckRef.current = false;
    setLocked(false);
    turnsRef.current += 1;
    const text = keepText && passageRef.current ? passageRef.current : buildPassage(pool, PASSAGE_WORDS);
    passageRef.current = text;
    boundsRef.current = wordBounds(text);
    bankedRef.current = 0;
    recordRef.current = [];
    setPassage(text);
    setTyped('');
    setWordsDone(0);
    setLiveWpm(0);
    turnEndsAtRef.current = Date.now() + turnMs;
    setTimeLeft(config.turnSeconds);
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    windowTimerRef.current = setInterval(() => {
      if (!aliveRef.current || statusRef.current !== 'playing') return;
      const remain = turnEndsAtRef.current - Date.now();
      setTimeLeft(Math.max(0, remain / 1000));
      if (remain <= 0) endWindowRef.current?.();
    }, 100);
  }, [config, pool, setTurnBoth, turnMs]);

  // --- window end: lock input, beat, then strike -----------------------------------------------
  const endWindow = useCallback(() => {
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    if (busyRef.current || statusRef.current !== 'playing') return;
    busyRef.current = true;
    struckRef.current = false;
    setLocked(true);
    showFeedback('info', 'TIME!', 0);
    if (strikeTimeoutRef.current) clearTimeout(strikeTimeoutRef.current);
    strikeDueAtRef.current = Date.now() + STRIKE_DELAY_MS;
    strikeTimeoutRef.current = setTimeout(() => doStrikeRef.current?.(), STRIKE_DELAY_MS);
  }, [showFeedback]);

  const doStrike = useCallback(() => {
    if (struckRef.current || statusRef.current !== 'playing') return;
    struckRef.current = true;
    const { correct, total } = windowTotals();
    const wpm = calculateWPM(total, turnMs, total > 0 ? (correct / total) * 100 : 0);
    const acc = total > 0 ? (correct / total) * 100 : 0;
    const words = bankedRef.current;
    wpmSumRef.current += wpm;

    const { damage } = calculateWindowDamage({ wpm });
    const bonus = calculateWindowBonus({ accuracy: acc, words, damage });
    scoreRef.current += bonus;
    setScore(scoreRef.current);

    showFeedback('attack', `+${bonus}  -${damage} DMG`, damage);
    audio.playAttack();
    const myGen = matchGenRef.current;
    setTimeout(() => {
      if (!aliveRef.current || myGen !== matchGenRef.current) return;
      const dealt = Math.min(damage, cpuHpRef.current);
      cpuHpRef.current = Math.max(0, cpuHpRef.current - damage);
      totalDamageRef.current += dealt;
      setCpuHp(cpuHpRef.current);
    }, 200);
    const strike = pixiRef.current?.playerAttack({ damage }) ?? Promise.resolve();
    strike
      .catch(() => {
        /* arena unavailable — logic continues */
      })
      .finally(() => {
        if (!aliveRef.current || myGen !== matchGenRef.current) {
          busyRef.current = false;
          return;
        }
        audio.playHit();
        if (cpuHpRef.current <= 0 && statusRef.current === 'playing') {
          endMatch(true);
          return;
        }
        startCpuTurnRef.current?.();
      });
  }, [endMatch, pixiRef, showFeedback, turnMs, windowTotals]);

  // --- CPU turn: short telegraph, then strike --------------------------------------------------
  const fireCpuStrike = useCallback(
    (myGen) => {
      if (windowTimerRef.current) clearInterval(windowTimerRef.current);
      if (!aliveRef.current || myGen !== matchGenRef.current || statusRef.current !== 'playing') return;
      const damage = randomInt(config.cpuDamageMin, config.cpuDamageMax);
      const pixi = pixiRef.current;
      setTimeout(() => {
        if (!aliveRef.current || myGen !== matchGenRef.current || statusRef.current !== 'playing') return;
        playerHpRef.current = Math.max(0, playerHpRef.current - damage);
        setPlayerHp(playerHpRef.current);
        showFeedback('cpu', `ENEMY STRIKE -${damage}`, damage);
      }, 220);
      audio.playAttack();
      const strike = pixi?.cpuAttack({ damage }) ?? Promise.resolve();
      strike
        .catch(() => {
          /* arena unavailable — logic continues */
        })
        .finally(() => {
          if (!aliveRef.current || myGen !== matchGenRef.current || statusRef.current !== 'playing') return;
          audio.playHit();
          if (playerHpRef.current <= 0) {
            endMatch(false);
          } else {
            startPlayerTurnRef.current?.();
          }
        });
    },
    [config, endMatch, pixiRef, showFeedback],
  );

  const startCpuTurn = useCallback(() => {
    if (!aliveRef.current || statusRef.current !== 'playing') return;
    setTurnBoth('cpu');
    setTimeLeft(config.cpuTelegraphMs / 1000);
    turnEndsAtRef.current = Date.now() + config.cpuTelegraphMs;
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    windowTimerRef.current = setInterval(() => {
      if (!aliveRef.current || statusRef.current !== 'playing') return;
      setTimeLeft(Math.max(0, (turnEndsAtRef.current - Date.now()) / 1000));
    }, 100);
    const myGen = matchGenRef.current;
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    cpuTimeoutRef.current = setTimeout(() => fireCpuStrike(myGen), config.cpuTelegraphMs);
  }, [config, fireCpuStrike, setTurnBoth]);

  // Keep the turn-cycle indirection fresh.
  useEffect(() => {
    endWindowRef.current = endWindow;
    doStrikeRef.current = doStrike;
    startCpuTurnRef.current = startCpuTurn;
    startPlayerTurnRef.current = startPlayerTurn;
  });

  // --- typing input: continuous caret through the passage -----------------------------------------
  const typeText = useCallback(
    (value) => {
      if (statusRef.current !== 'playing' || turnRef.current !== 'player' || busyRef.current) return;
      const target = passageRef.current;
      const old = typed;
      let next = value;
      if (next.length > old.length) {
        // Added characters: record each at the caret, advance on every key.
        let pos = old.length;
        let applied = old;
        for (let i = old.length; i < next.length && pos < target.length; i++) {
          const ch = next[i];
          keysTotalRef.current += 1;
          const ok = ch === target[pos];
          recordRef.current[pos] = ok;
          if (ok) {
            keysCorrectRef.current += 1;
            audio.playKey();
          } else {
            audio.playError();
            showFeedback('miss', 'MISS', 0);
          }
          applied += ch;
          pos += 1;
        }
        next = applied;
        // Extend the passage before the fast typist runs out of road.
        if (target.length - pos < EXTEND_THRESHOLD) {
          let prev = target.split(' ').pop() ?? '';
          const extra = [];
          for (let i = 0; i < EXTEND_WORDS; i++) {
            const w = pickChallenge(pool, prev);
            extra.push(w);
            prev = w;
          }
          const grown = `${target} ${extra.join(' ')}`;
          passageRef.current = grown;
          boundsRef.current = wordBounds(grown);
          setPassage(grown);
        }
      } else if (next.length < old.length) {
        // Backspaces: pull the caret back, clearing records.
        recordRef.current.length = next.length;
      } else {
        // Same length (e.g. IME replace): re-verify the whole line.
        const rec = recordRef.current;
        for (let i = 0; i < next.length && i < target.length; i++) {
          rec[i] = next[i] === target[i];
        }
      }
      setTyped(next);
      // Bank every word the caret has passed (pays 10 per correct char).
      const pos = next.length;
      const bounds = boundsRef.current;
      let banked = bankedRef.current;
      let gained = 0;
      while (banked < bounds.length && pos > bounds[banked].end) {
        const { start, end } = bounds[banked];
        let correct = 0;
        for (let i = start; i < end; i++) {
          if (recordRef.current[i]) correct += 1;
        }
        gained += calculateCharScore(correct);
        banked += 1;
        matchWordsRef.current += 1;
      }
      if (gained > 0) {
        scoreRef.current += gained;
        setScore(scoreRef.current);
      }
      if (banked !== bankedRef.current) {
        bankedRef.current = banked;
        setWordsDone(banked);
      }
      refreshLive();
    },
    [pool, refreshLive, showFeedback, typed],
  );

  // --- pause ------------------------------------------------------------------------------------------
  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    pauseStartRef.current = Date.now();
    remainingRef.current = Math.max(0, turnEndsAtRef.current - Date.now());
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    if (strikeTimeoutRef.current) {
      clearTimeout(strikeTimeoutRef.current);
      strikeRemainingRef.current = Math.max(0, strikeDueAtRef.current - Date.now());
    }
    pixiRef.current?.setPaused(true);
    setStatusBoth('paused');
  }, [pixiRef, setStatusBoth]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    turnEndsAtRef.current = Date.now() + (remainingRef.current || 0);
    pixiRef.current?.setPaused(false);
    setStatusBoth('playing');
    if (struckRef.current === false && busyRef.current) {
      // Strike was pending when paused — resume its countdown.
      if (strikeTimeoutRef.current) clearTimeout(strikeTimeoutRef.current);
      strikeTimeoutRef.current = setTimeout(
        () => doStrikeRef.current?.(),
        strikeRemainingRef.current || STRIKE_DELAY_MS,
      );
      return;
    }
    if (turnRef.current === 'player') {
      windowTimerRef.current = setInterval(() => {
        if (!aliveRef.current || statusRef.current !== 'playing') return;
        const remain = turnEndsAtRef.current - Date.now();
        setTimeLeft(Math.max(0, remain / 1000));
        if (remain <= 0) endWindowRef.current?.();
      }, 100);
    } else {
      windowTimerRef.current = setInterval(() => {
        if (!aliveRef.current || statusRef.current !== 'playing') return;
        setTimeLeft(Math.max(0, (turnEndsAtRef.current - Date.now()) / 1000));
      }, 100);
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      cpuTimeoutRef.current = setTimeout(
        () => fireCpuStrike(matchGenRef.current),
        remainingRef.current || config.cpuTelegraphMs,
      );
    }
  }, [config, fireCpuStrike, pixiRef, setStatusBoth]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') pause();
    else if (statusRef.current === 'paused') resume();
  }, [pause, resume]);

  // --- restart ------------------------------------------------------------------------------------------
  const restart = useCallback(() => {
    matchGenRef.current += 1; // abort any in-flight strike/damage/countdown work
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    if (strikeTimeoutRef.current) clearTimeout(strikeTimeoutRef.current);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    struckRef.current = false;
    setLocked(false);
    playerHpRef.current = maxHp;
    cpuHpRef.current = maxHp;
    scoreRef.current = 0;
    keysCorrectRef.current = 0;
    keysTotalRef.current = 0;
    totalDamageRef.current = 0;
    matchWordsRef.current = 0;
    turnsRef.current = 0;
    wpmSumRef.current = 0;
    busyRef.current = false;
    setPlayerHp(maxHp);
    setCpuHp(maxHp);
    setScore(0);
    setTyped('');
    setResults(null);
    setFeedback(null);
    setLiveWpm(0);
    setLiveAcc(100);
    pixiRef.current?.setPaused(false);
    pixiRef.current?.reset();
    audio.startMusic();
    runCountdown();
  }, [maxHp, pixiRef, runCountdown]);

  const submitScore = useCallback(
    (name) => {
      if (!results) return -1;
      const rank = addHighScore({
        name,
        score: results.score,
        wpm: results.avgWpm,
        accuracy: results.accuracy,
        difficulty: results.difficulty,
      });
      setResults((r) => (r ? { ...r, qualifies: false } : r));
      return rank;
    },
    [results],
  );

  // --- lifecycle ------------------------------------------------------------------------------------------
  useEffect(() => {
    aliveRef.current = true;
    audio.startMusic();
    // Countdown drives its own timers; initial state already matches step 1.
    const t = setTimeout(() => runCountdown(), 0);
    return () => {
      clearTimeout(t);
      aliveRef.current = false;
      if (windowTimerRef.current) clearInterval(windowTimerRef.current);
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      if (strikeTimeoutRef.current) clearTimeout(strikeTimeoutRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      audio.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    countdown,
    turn,
    playerHp,
    cpuHp,
    maxHp,
    score,
    challenge: passage,
    typed,
    timeLeft,
    turnSeconds: config.turnSeconds,
    turnTotal: turn === 'player' ? config.turnSeconds : config.cpuTelegraphMs / 1000,
    wordsDone,
    locked,
    feedback,
    results,
    wpm: liveWpm,
    accuracy: liveAcc,
    typeText,
    togglePause,
    pause,
    resume,
    restart,
    acknowledgeEnd,
    submitScore,
  };
}
