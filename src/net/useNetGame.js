// PVP simultaneous-window hook (Arena). Both players type the same seeded
// passage for turnSeconds; server resolves damage at window end.
// API mirrors useTypingGame where practical for BattleHUD/TypingChallenge reuse.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODES } from '../data/modes.js';
import { calculateWPM, calculateAccuracy } from '../utils/typingMetrics.js';
import { tierForWpm } from '../utils/damageCalculator.js';
import { calculateCharScore, calculateWindowBonus } from '../utils/scoreCalculator.js';
import { audio } from '../utils/audioManager.js';
import { connectArena, sendJson } from './netClient.js';
import { seededPassage } from './seededWords.js';

let feedbackId = 0;
const MAX_HP = 100;

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

function mockBotTurn(turnSeconds) {
  // Simulated remote for offline demo: 25-75 WPM, 88-99% acc.
  const wpm = 25 + Math.random() * 50;
  const acc = 88 + Math.random() * 11;
  const total = Math.round((wpm / 60) * 5 * (turnSeconds / 60) * 60);
  const correct = Math.round(total * (acc / 100));
  const words = Math.max(1, Math.round(total / 5.5));
  return { wpm, acc, total, correct, words };
}

export function useNetGame({ modeId, heroId, name, action, code, pixiRef, mock = false }) {
  const modeKey = MODES[modeId] ? modeId : 'medium';
  const turnSeconds = MODES[modeKey].turnSeconds;

  const [status, setStatus] = useState('connecting'); // connecting|waiting|countdown|playing|announce|won|lost|draw|peer-left|error
  const [roomCode, setRoomCode] = useState(code ?? null);
  const [you, setYou] = useState(0);
  const [opponent, setOpponent] = useState(null);
  const [seed, setSeed] = useState(null);
  const [windowId, setWindowId] = useState(0);
  const [hpMe, setHpMe] = useState(MAX_HP);
  const [hpOpp, setHpOpp] = useState(MAX_HP);
  const [score, setScore] = useState(0);
  const [passage, setPassage] = useState('');
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(turnSeconds);
  const [wordsDone, setWordsDone] = useState(0);
  const [locked, setLocked] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);
  const [error, setError] = useState(null);
  const [oppWpm, setOppWpm] = useState(0);

  const wsRef = useRef(null);
  const roomIdRef = useRef(null);
  const seedRef = useRef(null);
  const youRef = useRef(0);
  const endsAtRef = useRef(0);
  const timerRef = useRef(null);
  const statusRef = useRef('connecting');
  const passageRef = useRef('');
  const boundsRef = useRef([]);
  const recordRef = useRef([]);
  const bankedRef = useRef(0);
  const keysCorrectRef = useRef(0);
  const keysTotalRef = useRef(0);
  const scoreRef = useRef(0);
  const hpMeRef = useRef(MAX_HP);
  const hpOppRef = useRef(MAX_HP);
  const turnsRef = useRef(0);
  const wpmSumRef = useRef(0);
  const totalDamageRef = useRef(0);
  const matchWordsRef = useRef(0);
  const aliveRef = useRef(true);
  const sentRef = useRef(0);
  const mockTimers = useRef([]);

  const setStatusBoth = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const showFeedback = useCallback((kind, text) => {
    feedbackId += 1;
    const id = feedbackId;
    setFeedback({ id, kind, text });
    setTimeout(() => {
      if (aliveRef.current) setFeedback((f) => (f && f.id === id ? null : f));
    }, 1800);
  }, []);

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
    const elapsedMs = Math.max(1, turnSeconds * 1000 - Math.max(0, endsAtRef.current - Date.now()));
    const { correct, total } = windowTotals();
    const acc = total > 0 ? (correct / total) * 100 : 100;
    setLiveWpm(calculateWPM(total, elapsedMs, acc));
    setLiveAcc(calculateAccuracy(keysCorrectRef.current, keysTotalRef.current));
  }, [turnSeconds, windowTotals]);

  const openWindow = useCallback(
    (wid, endsAt, seedVal) => {
      const text = seededPassage(seedVal ?? seedRef.current, wid, 100);
      passageRef.current = text;
      boundsRef.current = wordBounds(text);
      bankedRef.current = 0;
      recordRef.current = [];
      sentRef.current = 0;
      setPassage(text);
      setTyped('');
      setWordsDone(0);
      setLiveWpm(0);
      setWindowId(wid);
      setLocked(false);
      endsAtRef.current = endsAt;
      setTimeLeft(Math.max(0, (endsAt - Date.now()) / 1000));
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!aliveRef.current) return;
        const remain = endsAtRef.current - Date.now();
        setTimeLeft(Math.max(0, remain / 1000));
        if (remain <= 0) {
          clearInterval(timerRef.current);
          endWindowRef.current?.();
        }
      }, 100);
    },
    [],
  );

  const sendTurn = useCallback(() => {
    const { correct, total } = windowTotals();
    const acc = total > 0 ? (correct / total) * 100 : 0;
    const wpm = calculateWPM(total, turnSeconds * 1000, acc);
    const words = bankedRef.current;
    // score gain mirrors training bonus (server sums it, doesn't trust damage)
    const bonus = calculateWindowBonus({ accuracy: acc, words, damage: 0 });
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    wpmSumRef.current += wpm;
    const payload = {
      t: 'turn',
      roomId: roomIdRef.current,
      windowId,
      correct,
      total,
      wpm: Math.round(wpm * 10) / 10,
      words,
      scoreGain: bonus,
    };
    if (wsRef.current) sendJson(wsRef.current, payload);
    return { correct, total, wpm, acc, words, bonus };
  }, [turnSeconds, windowId, windowTotals]);

  const endWindowRef = useRef(null);
  const finishMockRef = useRef(null);

  const finishMock = useCallback(() => {
    const won = hpOppRef.current <= 0 && hpMeRef.current > 0;
    const draw = hpOppRef.current <= 0 && hpMeRef.current <= 0;
    const pixi = pixiRef.current;
    if (draw) {
      setStatusBoth('announce');
    } else if (won) {
      pixi?.win?.(0) ?? pixi?.victory?.();
      audio.playVictory();
      setStatusBoth('announce');
    } else {
      pixi?.win?.(1) ?? pixi?.defeat?.();
      audio.playDefeat();
      setStatusBoth('announce');
    }
    audio.stopMusic();
    const avgWpm = turnsRef.current > 0 ? wpmSumRef.current / turnsRef.current : 0;
    setResults({
      won,
      draw,
      score: scoreRef.current,
      avgWpm,
      accuracy: calculateAccuracy(keysCorrectRef.current, keysTotalRef.current),
      totalDamage: totalDamageRef.current,
      turns: turnsRef.current + 1,
      words: matchWordsRef.current,
      mode: modeKey,
    });
  }, [modeKey, pixiRef, setStatusBoth]);

  const endWindow = useCallback(() => {
    if (statusRef.current !== 'playing' || sentRef.current) return;
    sentRef.current = 1;
    setLocked(true);
    showFeedback('info', 'TIME!');
    const mine = sendTurn();
    if (mock) {
      // offline mock: resolve locally after a beat
      const bot = mockBotTurn(turnSeconds);
      const myDmg = mine.total === 0 ? 0 : Math.min(24, Math.max(2, Math.round(mine.wpm / 3.5)));
      const botDmg = Math.min(24, Math.max(2, Math.round(bot.wpm / 3.5)));
      setOppWpm(bot.wpm);
      const t = setTimeout(() => {
        if (!aliveRef.current) return;
        hpOppRef.current = Math.max(0, hpOppRef.current - myDmg);
        hpMeRef.current = Math.max(0, hpMeRef.current - botDmg);
        totalDamageRef.current += Math.min(myDmg, hpOppRef.current + myDmg);
        setHpOpp(hpOppRef.current);
        setHpMe(hpMeRef.current);
        const { label } = tierForWpm(mine.wpm);
        showFeedback('attack', `${label} -${myDmg}  FOE -${botDmg}`);
        audio.playAttack();
        const pixi = pixiRef.current;
        const seq = async () => {
          try {
            if (myDmg > 0) await pixi?.leftAttack?.({ damage: myDmg });
            if (hpOppRef.current <= 0 || hpMeRef.current <= 0) return;
            if (botDmg > 0) await pixi?.rightAttack?.({ damage: botDmg });
          } catch {
            /* arena unavailable */
          }
          audio.playHit();
          if (hpOppRef.current <= 0 || hpMeRef.current <= 0) {
            finishMockRef.current?.();
            return;
          }
          turnsRef.current += 1;
          openWindow(windowId + 1, Date.now() + turnSeconds * 1000, seedRef.current);
        };
        seq();
      }, 700);
      mockTimers.current.push(t);
    }
  }, [mock, openWindow, pixiRef, sendTurn, showFeedback, turnSeconds, windowId]);

  // Keep timer callbacks on the latest window logic (same pattern as training).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    endWindowRef.current = endWindow;
    finishMockRef.current = finishMock;
  });

  const acknowledgeEnd = useCallback(() => {
    if (statusRef.current !== 'announce') return;
    if (!results) return;
    if (results.draw) setStatusBoth('draw');
    else setStatusBoth(results.won ? 'won' : 'lost');
  }, [results, setStatusBoth]);

  // --- typing input (same caret semantics as training) ---
  const typeText = useCallback(
    (value) => {
      if (statusRef.current !== 'playing' || sentRef.current) return;
      const target = passageRef.current;
      const old = typed;
      let next = value;
      if (next.length > old.length) {
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
            showFeedback('miss', 'MISS');
          }
          applied += ch;
          pos += 1;
        }
        next = applied;
        if (target.length - pos < 30) {
          const extra = seededPassage((seedRef.current ?? 1) + pos, windowId * 7 + pos, 30);
          const grown = `${target} ${extra}`;
          passageRef.current = grown;
          boundsRef.current = wordBounds(grown);
          setPassage(grown);
        }
      } else if (next.length < old.length) {
        recordRef.current.length = next.length;
      } else {
        const rec = recordRef.current;
        for (let i = 0; i < next.length && i < target.length; i++) rec[i] = next[i] === target[i];
      }
      setTyped(next);
      const pos = next.length;
      const bounds = boundsRef.current;
      let banked = bankedRef.current;
      let gained = 0;
      while (banked < bounds.length && pos > bounds[banked].end) {
        const { start, end } = bounds[banked];
        let correct = 0;
        for (let i = start; i < end; i++) if (recordRef.current[i]) correct += 1;
        gained += calculateCharScore(correct);
        banked += 1;
        matchWordsRef.current += 1;
      }
      if (gained > 0) {
        // live score ticks; authoritative total still sums window bonus at send
        scoreRef.current += 0;
        setScore(scoreRef.current);
      }
      if (banked !== bankedRef.current) {
        bankedRef.current = banked;
        setWordsDone(banked);
      }
      refreshLive();
    },
    [refreshLive, showFeedback, typed, windowId],
  );

  // --- connection lifecycle ---
  useEffect(() => {
    aliveRef.current = true;
    audio.startMusic();
    let ws = null;
    let closed = false;
    const pendingTimers = mockTimers.current;

    const goMock = (reason) => {
      // offline demo room: same seeded passage, bot opponent
      const s = Math.floor(Math.random() * 2 ** 31);
      seedRef.current = s;
      setSeed(s);
      setYou(0);
      youRef.current = 0;
      setOpponent({ name: 'SPAR BOT', heroId: 'hero-2' });
      setRoomCode('MOCK');
      setStatusBoth('countdown');
      setTimeout(() => {
        if (!aliveRef.current || closed) return;
        setStatusBoth('playing');
        turnsRef.current += 1;
        openWindow(1, Date.now() + turnSeconds * 1000, s);
      }, 1800);
      if (reason) setError(reason);
    };

    const onMessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.t === 'room-created') {
        roomIdRef.current = msg.roomId;
        setRoomCode(msg.code);
        setStatusBoth('waiting');
      } else if (msg.t === 'queued') {
        setStatusBoth('waiting');
      } else if (msg.t === 'matched') {
        roomIdRef.current = msg.roomId;
        seedRef.current = msg.seed;
        setSeed(msg.seed);
        setYou(msg.you);
        youRef.current = msg.you;
        setOpponent(msg.opponent);
        setRoomCode(msg.code);
        setHpMe(MAX_HP);
        setHpOpp(MAX_HP);
        hpMeRef.current = MAX_HP;
        hpOppRef.current = MAX_HP;
        setStatusBoth('countdown');
      } else if (msg.t === 'window') {
        if (statusRef.current === 'countdown') setStatusBoth('playing');
        turnsRef.current += 1;
        openWindow(msg.windowId, msg.endsAt, seedRef.current);
      } else if (msg.t === 'hp') {
        const me = youRef.current === 0 ? msg.hp[0] : msg.hp[1];
        const opp = youRef.current === 0 ? msg.hp[1] : msg.hp[0];
        const myDmg = youRef.current === 0 ? msg.dmg[0] : msg.dmg[1];
        const foeDmg = youRef.current === 0 ? msg.dmg[1] : msg.dmg[0];
        hpMeRef.current = me;
        hpOppRef.current = opp;
        setHpMe(me);
        setHpOpp(opp);
        const mine = msg.summary?.[youRef.current];
        if (mine) {
          setOppWpm(msg.summary?.[1 - youRef.current]?.wpm ?? 0);
          totalDamageRef.current += myDmg;
          wpmSumRef.current += mine.wpm ?? 0;
          const { label } = tierForWpm(mine.wpm ?? 0);
          showFeedback('attack', `${label} -${myDmg}  FOE -${foeDmg}`);
        }
        audio.playAttack();
        const pixi = pixiRef.current;
        (async () => {
          try {
            // my strike is left if I'm player 0, else right — map to sides
            if (youRef.current === 0) {
              if (myDmg > 0) await pixi?.leftAttack?.({ damage: myDmg });
              if (foeDmg > 0) await pixi?.rightAttack?.({ damage: foeDmg });
            } else {
              if (foeDmg > 0) await pixi?.rightAttack?.({ damage: foeDmg });
              if (myDmg > 0) await pixi?.leftAttack?.({ damage: myDmg });
            }
          } catch {
            /* arena unavailable */
          }
          audio.playHit();
        })();
      } else if (msg.t === 'end') {
        const winner = msg.winner;
        const won = winner === youRef.current;
        const draw = winner === -1;
        const pixi = pixiRef.current;
        if (draw) setStatusBoth('announce');
        else if (won) {
          pixi?.win?.(youRef.current) ?? pixi?.victory?.();
          audio.playVictory();
          setStatusBoth('announce');
        } else {
          pixi?.win?.(winner) ?? pixi?.defeat?.();
          audio.playDefeat();
          setStatusBoth('announce');
        }
        audio.stopMusic();
        setResults({
          won,
          draw,
          score: scoreRef.current,
          avgWpm: turnsRef.current > 0 ? wpmSumRef.current / turnsRef.current : 0,
          accuracy: calculateAccuracy(keysCorrectRef.current, keysTotalRef.current),
          totalDamage: totalDamageRef.current,
          turns: turnsRef.current,
          words: matchWordsRef.current,
          mode: modeKey,
          opponent: opponent?.name,
        });
      } else if (msg.t === 'peer-left') {
        setStatusBoth('peer-left');
        audio.stopMusic();
      } else if (msg.t === 'error') {
        setError(msg.message);
      }
    };

    (async () => {
      if (mock) {
        goMock(null);
        return;
      }
      try {
        ws = await connectArena();
        if (!aliveRef.current || closed) {
          ws.close();
          return;
        }
        wsRef.current = ws;
        ws.addEventListener('message', onMessage);
        sendJson(ws, { t: 'hello', name, heroId, modeId: modeKey });
        if (action === 'create') sendJson(ws, { t: 'create', name, heroId, modeId: modeKey });
        else if (action === 'join') sendJson(ws, { t: 'join', code, name, heroId });
        else sendJson(ws, { t: 'queue', name, heroId, modeId: modeKey });
        setStatusBoth('waiting');
      } catch {
        goMock('arena-offline-mock');
      }
    })();

    return () => {
      closed = true;
      aliveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      for (const t of pendingTimers) clearTimeout(t);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      audio.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = useCallback(() => {
    try {
      wsRef.current?.close();
    } catch {
      /* ignore */
    }
  }, []);

  return useMemo(
    () => ({
      status,
      roomCode,
      you,
      opponent,
      seed,
      windowId,
      hpMe,
      hpOpp,
      maxHp: MAX_HP,
      score,
      challenge: passage,
      typed,
      timeLeft,
      turnTotal: turnSeconds,
      wordsDone,
      locked: locked || status !== 'playing',
      feedback,
      results,
      wpm: liveWpm,
      accuracy: liveAcc,
      oppWpm,
      error,
      modeLabel: modeKey,
      typeText,
      acknowledgeEnd,
      leave,
    }),
    [
      status,
      roomCode,
      you,
      opponent,
      seed,
      windowId,
      hpMe,
      hpOpp,
      score,
      passage,
      typed,
      timeLeft,
      turnSeconds,
      wordsDone,
      locked,
      feedback,
      results,
      liveWpm,
      liveAcc,
      oppWpm,
      error,
      modeKey,
      typeText,
      acknowledgeEnd,
      leave,
    ],
  );
}
