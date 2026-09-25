// Central typing-combat state machine (PLAN.md sections 14, 25).
// React owns ALL game logic; PixiGame only plays animations on command.

import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTIES } from '../data/difficulty.js';
import { EASY_WORDS } from '../data/typingWords.js';
import { NORMAL_SENTENCES } from '../data/typingSentences.js';
import { HARD_SENTENCES } from '../data/hardSentences.js';
import { calculateWPM, calculateAccuracy } from '../utils/typingMetrics.js';
import { calculateDamage } from '../utils/damageCalculator.js';
import { calculateChallengeScore } from '../utils/scoreCalculator.js';
import { pickChallenge, randomInt } from '../utils/random.js';
import { qualifiesForHighScores, addHighScore } from '../utils/storage.js';
import { audio } from '../utils/audioManager.js';

const POOLS = {
  word: EASY_WORDS,
  sentence: NORMAL_SENTENCES,
  hard_sentence: HARD_SENTENCES,
};

let feedbackId = 0;

export function useTypingGame({ difficultyId, pixiRef }) {
  const config = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.normal;
  const pool = POOLS[config.challengeType];

  const [status, setStatus] = useState('playing'); // playing | paused | won | lost
  const [playerHp, setPlayerHp] = useState(100);
  const [cpuHp, setCpuHp] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [challenge, setChallenge] = useState(() => pickChallenge(pool, ''));
  const [typed, setTyped] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);

  // Mutable mirrors for timer callbacks.
  const statusRef = useRef('playing');
  const playerHpRef = useRef(100);
  const cpuHpRef = useRef(100);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const challengeRef = useRef('');
  const attackingRef = useRef(false);
  const matchStartRef = useRef(0);
  const challengeStartRef = useRef(0);
  const challengeErrorsRef = useRef(0);
  const pausedAccumRef = useRef(0); // total ms spent paused
  const pauseStartRef = useRef(0);
  const totalCorrectRef = useRef(0);
  const totalTypedRef = useRef(0);
  const maxComboRef = useRef(0);
  const totalDamageRef = useRef(0);
  const critsRef = useRef(0);
  const doneRef = useRef(0);
  const wpmSumRef = useRef(0);
  const cpuTimeoutRef = useRef(null);
  const cpuNextAtRef = useRef(0);
  const cpuRemainingRef = useRef(0);
  const countdownTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const aliveRef = useRef(true);
  const matchGenRef = useRef(0); // bumped on restart; stale async work aborts
  // Indirection for the mutually-recursive CPU scheduler.
  const fireCpuRef = useRef(null);
  const scheduleCpuRef = useRef(null);

  const setStatusBoth = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
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
    setLiveWpm(calculateWPM(totalTypedRef.current, Date.now() - matchStartRef.current - pausedAccumRef.current));
    setLiveAcc(calculateAccuracy(totalCorrectRef.current, totalTypedRef.current));
  }, []);

  // --- match end (declared before the CPU/player actions that call it) ------------
  const endMatch = useCallback(
    (won) => {
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setCountdown(null);
      const pixi = pixiRef.current;
      if (won) {
        pixi?.victory();
        audio.playVictory();
      } else {
        pixi?.defeat();
        audio.playDefeat();
      }
      audio.stopMusic();
      const avgWpm = doneRef.current > 0 ? wpmSumRef.current / doneRef.current : 0;
      const accuracy = calculateAccuracy(totalCorrectRef.current, totalTypedRef.current);
      const finalScore = scoreRef.current;
      setResults({
        won,
        score: finalScore,
        avgWpm,
        accuracy,
        maxCombo: maxComboRef.current,
        totalDamage: totalDamageRef.current,
        crits: critsRef.current,
        challenges: doneRef.current,
        difficulty: difficultyId,
        qualifies: qualifiesForHighScores(finalScore),
      });
      setStatusBoth(won ? 'won' : 'lost');
    },
    [difficultyId, pixiRef, setStatusBoth],
  );

  // --- CPU AI ------------------------------------------------------------------
  const scheduleCpu = useCallback((delayMs) => {
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    cpuNextAtRef.current = Date.now() + delayMs;
    cpuTimeoutRef.current = setTimeout(() => fireCpuRef.current?.(), delayMs);
  }, []);

  const fireCpu = useCallback(async () => {
    if (!aliveRef.current || statusRef.current !== 'playing') return;
    const damage = randomInt(config.cpuDamageMin, config.cpuDamageMax);
    const myGen = matchGenRef.current;
    const pixi = pixiRef.current;
    // Damage lands with the visual impact.
    setTimeout(() => {
      if (!aliveRef.current || myGen !== matchGenRef.current || statusRef.current !== 'playing') return;
      playerHpRef.current = Math.max(0, playerHpRef.current - damage);
      setPlayerHp(playerHpRef.current);
      showFeedback('cpu', `ENEMY STRIKE -${damage}`, damage);
    }, 220);
    audio.playAttack();
    try {
      await pixi?.cpuAttack({ damage });
    } catch {
      /* arena unavailable — logic continues */
    }
    if (!aliveRef.current) return;
    if (myGen !== matchGenRef.current) return;
    if (statusRef.current !== 'playing') return;
    audio.playHit();
    if (playerHpRef.current <= 0) {
      endMatch(false);
    } else {
      scheduleCpuRef.current?.(randomInt(config.cpuAttackMin, config.cpuAttackMax));
    }
  }, [config, endMatch, pixiRef, showFeedback]);

  const startCountdownTicker = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      if (!aliveRef.current || statusRef.current !== 'playing') return;
      setCountdown(Math.max(0, (cpuNextAtRef.current - Date.now()) / 1000));
    }, 100);
  }, []);

  // Keep the scheduler indirection fresh.
  useEffect(() => {
    fireCpuRef.current = fireCpu;
    scheduleCpuRef.current = scheduleCpu;
  });

  // --- player attack ----------------------------------------------------------------
  const completeChallenge = useCallback(async () => {
    if (attackingRef.current || statusRef.current !== 'playing') return;
    attackingRef.current = true;
    const text = challengeRef.current;
    const challengeMs = Date.now() - challengeStartRef.current - pausedAccumRef.current;
    const wpm = calculateWPM(text.length, challengeMs);
    const errors = challengeErrorsRef.current;
    // Accuracy for this strike: correct chars of this challenge vs its length.
    const strikeAcc = text.length === 0 ? 100 : ((text.length - Math.min(errors, text.length)) / text.length) * 100;
    const comboNow = comboRef.current + 1;
    comboRef.current = comboNow;
    maxComboRef.current = Math.max(maxComboRef.current, comboNow);
    setCombo(comboNow);

    const { damage, critical } = calculateDamage({ wpm, accuracy: strikeAcc, combo: comboNow });
    const gained = calculateChallengeScore({
      charsTyped: text.length,
      accuracy: strikeAcc,
      combo: comboNow,
      damage,
      critical,
    });
    scoreRef.current += gained;
    setScore(scoreRef.current);
    wpmSumRef.current += wpm;
    doneRef.current += 1;
    if (critical) critsRef.current += 1;

    showFeedback(critical ? 'crit' : 'attack', critical ? `CRITICAL! -${damage}` : `+${gained}  -${damage} DMG`, damage);
    audio.playAttack();
    const myGen = matchGenRef.current;
    const pixi = pixiRef.current;
    setTimeout(() => {
      if (!aliveRef.current || myGen !== matchGenRef.current) return;
      const dealt = Math.min(damage, cpuHpRef.current);
      cpuHpRef.current = Math.max(0, cpuHpRef.current - damage);
      totalDamageRef.current += dealt;
      setCpuHp(cpuHpRef.current);
    }, 200);
    try {
      await pixi?.playerAttack({ damage, critical });
    } catch {
      /* arena unavailable — logic continues */
    }
    if (!aliveRef.current) return;
    if (myGen !== matchGenRef.current) {
      attackingRef.current = false;
      return;
    }
    if (critical) audio.playCritical();
    else audio.playHit();
    if (cpuHpRef.current <= 0 && statusRef.current === 'playing') {
      endMatch(true);
      return;
    }
    // Next challenge.
    const next = pickChallenge(pool, text);
    challengeRef.current = next;
    challengeErrorsRef.current = 0;
    challengeStartRef.current = Date.now();
    setChallenge(next);
    setTyped('');
    refreshLive();
    attackingRef.current = false;
  }, [endMatch, pixiRef, pool, refreshLive, showFeedback]);

  // --- typing input -------------------------------------------------------------------
  const typeText = useCallback(
    (value) => {
      if (statusRef.current !== 'playing' || attackingRef.current) return;
      const target = challengeRef.current;
      const next = value.slice(0, target.length);
      const prevLen = typed.length;
      // Count newly added characters.
      if (next.length > prevLen) {
        for (let i = prevLen; i < next.length; i++) {
          totalTypedRef.current += 1;
          if (next[i] === target[i]) {
            totalCorrectRef.current += 1;
            audio.playKey();
          } else {
            challengeErrorsRef.current += 1;
            comboRef.current = 0;
            setCombo(0);
            audio.playError();
            showFeedback('miss', 'MISS — COMBO LOST', 0);
          }
        }
      }
      setTyped(next);
      refreshLive();
      if (next === target) completeChallenge();
    },
    [completeChallenge, refreshLive, showFeedback, typed],
  );

  // --- pause ------------------------------------------------------------------------------
  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    pauseStartRef.current = Date.now();
    cpuRemainingRef.current = Math.max(0, cpuNextAtRef.current - Date.now());
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    pixiRef.current?.setPaused(true);
    setStatusBoth('paused');
  }, [pixiRef, setStatusBoth]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    pausedAccumRef.current += Date.now() - pauseStartRef.current;
    pixiRef.current?.setPaused(false);
    setStatusBoth('playing');
    scheduleCpu(cpuRemainingRef.current || randomInt(config.cpuAttackMin, config.cpuAttackMax));
    startCountdownTicker();
  }, [config, pixiRef, scheduleCpu, setStatusBoth, startCountdownTicker]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') pause();
    else if (statusRef.current === 'paused') resume();
  }, [pause, resume]);

  // --- restart ------------------------------------------------------------------------------
  const restart = useCallback(() => {
    matchGenRef.current += 1; // abort any in-flight attack/damage work
    if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    playerHpRef.current = 100;
    cpuHpRef.current = 100;
    comboRef.current = 0;
    scoreRef.current = 0;
    totalCorrectRef.current = 0;
    totalTypedRef.current = 0;
    maxComboRef.current = 0;
    totalDamageRef.current = 0;
    critsRef.current = 0;
    doneRef.current = 0;
    wpmSumRef.current = 0;
    challengeErrorsRef.current = 0;
    pausedAccumRef.current = 0;
    attackingRef.current = false;
    matchStartRef.current = Date.now();
    challengeStartRef.current = Date.now();
    const first = pickChallenge(pool, '');
    challengeRef.current = first;
    setPlayerHp(100);
    setCpuHp(100);
    setScore(0);
    setCombo(0);
    setChallenge(first);
    setTyped('');
    setResults(null);
    setFeedback(null);
    setCountdown(null);
    setLiveWpm(0);
    setLiveAcc(100);
    pixiRef.current?.setPaused(false);
    pixiRef.current?.reset();
    setStatusBoth('playing');
    audio.startMusic();
    scheduleCpu(randomInt(config.cpuAttackMin, config.cpuAttackMax));
    startCountdownTicker();
  }, [config, pixiRef, pool, scheduleCpu, setStatusBoth, startCountdownTicker]);

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

  // --- lifecycle: start CPU + music on mount ---------------------------------------------------
  useEffect(() => {
    aliveRef.current = true;
    challengeRef.current = challenge;
    matchStartRef.current = Date.now();
    challengeStartRef.current = Date.now();
    audio.startMusic();
    scheduleCpu(randomInt(config.cpuAttackMin, config.cpuAttackMax));
    startCountdownTicker();
    return () => {
      aliveRef.current = false;
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      audio.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    playerHp,
    cpuHp,
    score,
    combo,
    challenge,
    typed,
    countdown,
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
