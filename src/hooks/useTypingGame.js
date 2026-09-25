// Central timed-turn combat state machine.
// Player turn: type endless words for turnSeconds; damage comes from window
// WPM + accuracy. Then a quick CPU strike. React owns ALL game logic;
// PixiGame only plays animations on command.

import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTIES } from '../data/difficulty.js';
import { TIMED_WORDS } from '../data/timedWords.js';
import { calculateWPM, calculateAccuracy } from '../utils/typingMetrics.js';
import { calculateWindowDamage } from '../utils/damageCalculator.js';
import { calculateWordScore, calculateWindowBonus } from '../utils/scoreCalculator.js';
import { pickChallenge, randomInt } from '../utils/random.js';
import { qualifiesForHighScores, addHighScore } from '../utils/storage.js';
import { audio } from '../utils/audioManager.js';

let feedbackId = 0;

export function useTypingGame({ difficultyId, pixiRef }) {
  const config = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.normal;
  const pool = TIMED_WORDS[config.wordPool];
  const turnMs = config.turnSeconds * 1000;

  const [status, setStatus] = useState('playing'); // playing | paused | won | lost
  const [turn, setTurn] = useState('player'); // player | cpu
  const [playerHp, setPlayerHp] = useState(100);
  const [cpuHp, setCpuHp] = useState(100);
  const [score, setScore] = useState(0);
  const [word, setWord] = useState(() => pickChallenge(pool, ''));
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(config.turnSeconds);
  const [wordsDone, setWordsDone] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);

  const statusRef = useRef('playing');
  const turnRef = useRef('player');
  const playerHpRef = useRef(100);
  const cpuHpRef = useRef(100);
  const scoreRef = useRef(0);
  const wordRef = useRef('');
  const typedRef = useRef('');
  const busyRef = useRef(false);
  const turnEndsAtRef = useRef(0);
  const pauseStartRef = useRef(0);
  const remainingRef = useRef(0);
  // Window accumulators (final-text per word).
  const windowWordsRef = useRef(0);
  const windowCorrectRef = useRef(0);
  const windowTotalRef = useRef(0);
  // Match totals (keystroke accuracy).
  const keysCorrectRef = useRef(0);
  const keysTotalRef = useRef(0);
  const totalDamageRef = useRef(0);
  const critsRef = useRef(0);
  const turnsRef = useRef(0);
  const wpmSumRef = useRef(0);
  const windowTimerRef = useRef(null);
  const cpuTimeoutRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const aliveRef = useRef(true);
  const matchGenRef = useRef(0);
  // Indirection for the turn cycle (avoids declaration-order cycles).
  const endWindowRef = useRef(null);
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

  const refreshLive = useCallback(() => {
    const elapsedMs = Math.max(1, turnMs - Math.max(0, turnEndsAtRef.current - Date.now()));
    setLiveWpm(calculateWPM(windowTotalRef.current, elapsedMs));
    setLiveAcc(calculateAccuracy(keysCorrectRef.current, keysTotalRef.current));
  }, [turnMs]);

  // --- match end (declared before the turn actions that call it) -------------------
  const endMatch = useCallback(
    (won) => {
      if (windowTimerRef.current) clearInterval(windowTimerRef.current);
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
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
        crits: critsRef.current,
        turns: turnsRef.current,
        difficulty: difficultyId,
        qualifies: qualifiesForHighScores(finalScore),
      });
      setStatusBoth(won ? 'won' : 'lost');
    },
    [difficultyId, pixiRef, setStatusBoth],
  );

  // --- player turn ---------------------------------------------------------------------------
  const startPlayerTurn = useCallback(() => {
    if (!aliveRef.current || statusRef.current !== 'playing') return;
    setTurnBoth('player');
    busyRef.current = false;
    windowWordsRef.current = 0;
    windowCorrectRef.current = 0;
    windowTotalRef.current = 0;
    turnsRef.current += 1;
    const first = pickChallenge(pool, wordRef.current);
    wordRef.current = first;
    typedRef.current = '';
    setWord(first);
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

  // --- window end: bank partial word, strike ---------------------------------------------------
  const endWindow = useCallback(() => {
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    if (busyRef.current || statusRef.current !== 'playing') return;
    busyRef.current = true;
    // Bank the in-progress word by its typed portion.
    const w = wordRef.current;
    const t = typedRef.current;
    if (t.length > 0) {
      let correct = 0;
      for (let i = 0; i < t.length; i++) {
        if (t[i] === w[i]) correct += 1;
      }
      windowCorrectRef.current += correct;
      windowTotalRef.current += t.length;
    }
    const total = windowTotalRef.current;
    const wpm = calculateWPM(total, turnMs);
    const acc = total > 0 ? (windowCorrectRef.current / total) * 100 : 0;
    const words = windowWordsRef.current;
    wpmSumRef.current += wpm;

    const { damage, critical } = calculateWindowDamage({ wpm, accuracy: acc, turnSeconds: config.turnSeconds });
    const bonus = calculateWindowBonus({ accuracy: acc, words, damage, critical });
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    if (critical) critsRef.current += 1;

    showFeedback(
      critical ? 'crit' : 'attack',
      critical ? `CRITICAL! -${damage}` : `+${bonus}  -${damage} DMG`,
      damage,
    );
    audio.playAttack();
    const myGen = matchGenRef.current;
    setTimeout(() => {
      if (!aliveRef.current || myGen !== matchGenRef.current) return;
      const dealt = Math.min(damage, cpuHpRef.current);
      cpuHpRef.current = Math.max(0, cpuHpRef.current - damage);
      totalDamageRef.current += dealt;
      setCpuHp(cpuHpRef.current);
    }, 200);
    const strike = pixiRef.current?.playerAttack({ damage, critical }) ?? Promise.resolve();
    strike
      .catch(() => {
        /* arena unavailable — logic continues */
      })
      .finally(() => {
        if (!aliveRef.current || myGen !== matchGenRef.current) {
          busyRef.current = false;
          return;
        }
        if (critical) audio.playCritical();
        else audio.playHit();
        if (cpuHpRef.current <= 0 && statusRef.current === 'playing') {
          endMatch(true);
          return;
        }
        startCpuTurnRef.current?.();
      });
  }, [config, endMatch, pixiRef, showFeedback, turnMs]);

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
    startCpuTurnRef.current = startCpuTurn;
    startPlayerTurnRef.current = startPlayerTurn;
  });

  // --- typing input -------------------------------------------------------------------------------
  const typeText = useCallback(
    (value) => {
      if (statusRef.current !== 'playing' || turnRef.current !== 'player' || busyRef.current) return;
      const target = wordRef.current;
      const next = value.slice(0, target.length);
      const prevLen = typed.length;
      if (next.length > prevLen) {
        for (let i = prevLen; i < next.length; i++) {
          keysTotalRef.current += 1;
          if (next[i] === target[i]) {
            keysCorrectRef.current += 1;
            audio.playKey();
          } else {
            audio.playError();
            showFeedback('miss', 'MISS', 0);
          }
        }
      }
      typedRef.current = next;
      setTyped(next);
      refreshLive();
      if (next.length === target.length) {
        // Word complete: bank final-text accuracy, pay per-character score.
        let correct = 0;
        for (let i = 0; i < target.length; i++) {
          if (next[i] === target[i]) correct += 1;
        }
        windowCorrectRef.current += correct;
        windowTotalRef.current += target.length;
        windowWordsRef.current += 1;
        const gained = calculateWordScore(target.length);
        scoreRef.current += gained;
        setScore(scoreRef.current);
        setWordsDone(windowWordsRef.current);
        const following = pickChallenge(pool, target);
        wordRef.current = following;
        typedRef.current = '';
        setWord(following);
        setTyped('');
        refreshLive();
      }
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
    pixiRef.current?.setPaused(true);
    setStatusBoth('paused');
  }, [pixiRef, setStatusBoth]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    turnEndsAtRef.current = Date.now() + (remainingRef.current || 0);
    pixiRef.current?.setPaused(false);
    setStatusBoth('playing');
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
    matchGenRef.current += 1; // abort any in-flight strike/damage work
    if (windowTimerRef.current) clearInterval(windowTimerRef.current);
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    playerHpRef.current = 100;
    cpuHpRef.current = 100;
    scoreRef.current = 0;
    keysCorrectRef.current = 0;
    keysTotalRef.current = 0;
    totalDamageRef.current = 0;
    critsRef.current = 0;
    turnsRef.current = 0;
    wpmSumRef.current = 0;
    busyRef.current = false;
    typedRef.current = '';
    setPlayerHp(100);
    setCpuHp(100);
    setScore(0);
    setTyped('');
    setResults(null);
    setFeedback(null);
    setLiveWpm(0);
    setLiveAcc(100);
    pixiRef.current?.setPaused(false);
    pixiRef.current?.reset();
    setStatusBoth('playing');
    audio.startMusic();
    startPlayerTurn();
  }, [pixiRef, setStatusBoth, startPlayerTurn]);

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
    startPlayerTurn();
    return () => {
      aliveRef.current = false;
      if (windowTimerRef.current) clearInterval(windowTimerRef.current);
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      audio.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    turn,
    playerHp,
    cpuHp,
    score,
    challenge: word,
    typed,
    timeLeft,
    turnSeconds: config.turnSeconds,
    wordsDone,
    feedback,
    results,
    wpm: liveWpm,
    accuracy: liveAcc,
    typeText,
    togglePause,
    pause,
    resume,
    restart,
    submitScore,
  };
}
