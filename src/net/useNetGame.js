// PVP simultaneous-window hook (Arena). Both players type the same seeded
// passage for turnSeconds; server resolves damage at window end.
// API mirrors useTypingGame where practical for BattleHUD/TypingChallenge reuse.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODES } from '../data/modes.js';
import { calculateWPM, calculateAccuracy } from '../utils/typingMetrics.js';
import { calculateCharScore, calculateWindowBonus } from '../utils/scoreCalculator.js';
import { audio } from '../utils/audioManager.js';
import { connectArena, sendJson } from './netClient.js';
import { seededPassage } from './seededWords.js';
import { getPlatform, normalizePlatform } from '../utils/platform.js';

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

export function useNetGame({ modeId, heroId, name, action, code, pixiRef }) {
  const modeKey = MODES[modeId] ? modeId : 'medium';
  const turnSeconds = MODES[modeKey].turnSeconds;
  // Strict pool: mobile-vs-mobile, desktop-vs-desktop. Computed once per
  // mount so a resize/rotation can't flip pools mid-queue.
  const platform = useMemo(() => normalizePlatform(getPlatform()), []);

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
  const [countdown, setCountdown] = useState('');
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
  const strikeSeqRef = useRef(0);
  const strikePromiseRef = useRef(null);
  const countdownTimers = useRef([]);

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

  const endWindow = useCallback(() => {
    if (statusRef.current !== 'playing' || sentRef.current) return;
    sentRef.current = 1;
    setLocked(true);
    showFeedback('info', 'TIME!');
    audio.playWarning();
    sendTurn();
  }, [sendTurn, showFeedback]);

  // Keep timer callbacks on the latest window logic (same pattern as training).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    endWindowRef.current = endWindow;
  });

  const acknowledgeEnd = useCallback(() => {
    if (statusRef.current !== 'announce') return;
    if (!results) return;
    if (results.draw) setStatusBoth('draw');
    else setStatusBoth(results.won ? 'won' : 'lost');
  }, [results, setStatusBoth]);

  // Forfeit: tell the server (rival gets the Victory `end`), then play
  // out our own defeat locally so quitting records a loss, not a menu exit.
  const forfeit = useCallback(() => {
    sendJson(wsRef.current, { t: 'forfeit', roomId: roomIdRef.current });
    if (statusRef.current !== 'playing' && statusRef.current !== 'countdown') return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLocked(true);
    const pixi = pixiRef.current;
    pixi?.win?.(1);
    audio.playDefeat();
    audio.startMusic('defeat');
    const avgWpm = turnsRef.current > 0 ? wpmSumRef.current / turnsRef.current : 0;
    setResults({
      won: false,
      draw: false,
      forfeited: true,
      score: scoreRef.current,
      avgWpm,
      accuracy: calculateAccuracy(keysCorrectRef.current, keysTotalRef.current),
      totalDamage: totalDamageRef.current,
      turns: turnsRef.current,
      words: matchWordsRef.current,
      mode: modeKey,
      opponent: opponent?.name,
    });
    setStatusBoth('announce');
  }, [modeKey, opponent, pixiRef, setStatusBoth]);

  // --- typing input (same caret semantics as training, mobile-hardened) ---
  const typeText = useCallback(
    (value) => {
      if (statusRef.current !== 'playing' || sentRef.current) return;
      const target = passageRef.current;
      const old = typed;
      const raw = value;
      let common = 0;
      const maxCommon = Math.min(old.length, raw.length);
      while (common < maxCommon && old[common] === raw[common]) common += 1;
      const suffix = raw.slice(common);
      let next;
      if (suffix.length === 0) {
        recordRef.current.length = Math.min(recordRef.current.length, raw.length);
        next = raw;
      } else {
        recordRef.current.length = Math.min(recordRef.current.length, common);
        let pos = common;
        let applied = raw.slice(0, common);
        for (const ch of suffix) {
          if (pos >= target.length) break;
          if (ch === ' ' && applied.endsWith(' ') && target[pos] !== ' ') {
            continue; // mobile auto double-space: swallow, stay aligned
          }
          const ok = ch === target[pos];
          recordRef.current[pos] = ok;
          if (pos >= old.length) {
            keysTotalRef.current += 1;
            if (ok) {
              keysCorrectRef.current += 1;
              audio.playKey();
            } else {
              audio.playError();
              showFeedback('miss', 'MISS');
            }
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

  // --- connection lifecycle (stays on "Waiting for Opponent..." until live) ---
  useEffect(() => {
    aliveRef.current = true;
    audio.startMusic('arena');
    let ws = null;
    let closed = false;
    let retryTimer = null;
    const cdTimers = countdownTimers.current;

    const handshake = (sock) => {
      sendJson(sock, { t: 'hello', name, heroId, modeId: modeKey, platform });
      if (action === 'create') sendJson(sock, { t: 'create', name, heroId, modeId: modeKey, platform });
      else if (action === 'join') sendJson(sock, { t: 'join', code, name, heroId, platform });
      else sendJson(sock, { t: 'queue', name, heroId, modeId: modeKey, platform });
    };

    const scheduleRetry = () => {
      if (closed || !aliveRef.current) return;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => connect(), 4000);
    };

    // Fixed local schedule: "Match Found!" holds a full beat, then
    // 3 · 2 · 1 · Type!. Deliberately NOT synced to the server clock —
    // clock skew between client and host was compressing the old
    // startsAt-based steps so early steps fired in the same millisecond
    // and never painted. Both clients receive `matched` within ~100ms of
    // each other, so fixed schedules stay in sync. The `window` message
    // flips to playing whenever it truly arrives (guarded below).
    const runMatchCountdown = () => {
      for (const t of countdownTimers.current) clearTimeout(t);
      countdownTimers.current.length = 0;
      const steps = [
        { value: 'Match Found!', at: 0, freq: 660 },
        { value: '3', at: 1200, freq: 440 },
        { value: '2', at: 1800, freq: 440 },
        { value: '1', at: 2400, freq: 440 },
        { value: 'Type!', at: 3000, freq: 880 },
      ];
      for (const s of steps) {
        countdownTimers.current.push(
          setTimeout(() => {
            if (!aliveRef.current || closed) return;
            if (statusRef.current !== 'countdown') return;
            setCountdown(s.value);
            audio.blip({ freq: s.freq, type: 'square', duration: 0.12, volume: 0.3 });
          }, s.at),
        );
      }
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
        runMatchCountdown();
        setStatusBoth('countdown');
      } else if (msg.t === 'window') {
        for (const t of countdownTimers.current) clearTimeout(t);
        if (statusRef.current === 'countdown') setStatusBoth('playing');
        turnsRef.current += 1;
        openWindow(msg.windowId, msg.endsAt, seedRef.current);
      } else if (msg.t === 'hp') {
        const me = youRef.current === 0 ? msg.hp[0] : msg.hp[1];
        const opp = youRef.current === 0 ? msg.hp[1] : msg.hp[0];
        const dmgBy = [msg.dmg?.[0] ?? 0, msg.dmg?.[1] ?? 0];
        const myDmg = dmgBy[youRef.current] ?? 0;
        const mine = msg.summary?.[youRef.current];
        if (mine) {
          setOppWpm(msg.summary?.[1 - youRef.current]?.wpm ?? 0);
          totalDamageRef.current += myDmg;
          wpmSumRef.current += mine.wpm ?? 0;
        }
        // Sequential strikes: higher damage lands first (ties: left/player 0).
        // Each strike applies its victim's HP + announce text, then animates —
        // so bars and text land one after the other, not simultaneously.
        const seq = (strikeSeqRef.current += 1);
        const strikes = [0, 1]
          .map((by) => ({ by, dmg: dmgBy[by] ?? 0 }))
          .filter((s) => s.dmg > 0)
          .sort((a, b) => b.dmg - a.dmg || a.by - b.by);
        // Sides that dealt no damage take none; sync HP now (no visual change).
        if ((dmgBy[youRef.current] ?? 0) <= 0) {
          hpMeRef.current = me;
          setHpMe(me);
        }
        if ((dmgBy[1 - youRef.current] ?? 0) <= 0) {
          hpOppRef.current = opp;
          setHpOpp(opp);
        }
        const pixi = pixiRef.current;
        // Tracked so a match-ending `end` can wait for the killing
        // strike(s) to finish before playing the win/lose poses.
        strikePromiseRef.current = (async () => {
          try {
            for (const s of strikes) {
              if (seq !== strikeSeqRef.current || !aliveRef.current) return;
              if (s.by === youRef.current) {
                hpOppRef.current = opp;
                setHpOpp(opp);
              } else {
                hpMeRef.current = me;
                setHpMe(me);
              }
              const foeStrike = s.by !== youRef.current;
              showFeedback(foeStrike ? 'cpu' : 'info', foeStrike ? `FOE -${s.dmg}` : `-${s.dmg}`);
              audio.playAttack(s.dmg >= 10);
              // Left fighter is always you on your screen: your strike is
              // leftAttack, the foe's is rightAttack.
              if (s.by === youRef.current) await pixi?.leftAttack?.({ damage: s.dmg });
              else await pixi?.rightAttack?.({ damage: s.dmg });
              audio.playHit(s.dmg >= 10);
            }
          } catch {
            /* arena unavailable */
          }
        })();
      } else if (msg.t === 'end') {
        // Ignore server ends once we already closed out locally
        // (e.g. our own forfeit echoing back).
        if (statusRef.current !== 'playing' && statusRef.current !== 'countdown') return;
        const winner = msg.winner;
        const won = winner === youRef.current;
        const draw = winner === -1;
        const pixi = pixiRef.current;
        const resultsPayload = {
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
        };
        if (msg.byForfeit && won) showFeedback('info', 'RIVAL FORFEITED');
        // The server sends `end` in the same tick as the final `hp`, while
        // the killing strike is still animating. Playing the win/lose pose
        // now would be trampled by the strike's attack/hit clips (only
        // defeat is protected via Fighter.defeated) — so wait for the
        // strikes to land first, with a cap so results can't hang.
        (async () => {
          try {
            await Promise.race([
              strikePromiseRef.current ?? Promise.resolve(),
              new Promise((resolve) => setTimeout(resolve, 4000)),
            ]);
          } catch {
            /* strike aborted — pose anyway */
          }
          if (!aliveRef.current) return;
          if (statusRef.current !== 'playing' && statusRef.current !== 'countdown') return;
          if (draw) {
            setStatusBoth('announce');
            audio.stopMusic();
          } else if (won) {
            if (pixi?.win) pixi.win(0);
            else pixi?.victory?.();
            audio.playVictory();
            audio.startMusic('victory');
            setStatusBoth('announce');
          } else {
            if (pixi?.win) pixi.win(1);
            else pixi?.defeat?.();
            audio.playDefeat();
            audio.startMusic('defeat');
            setStatusBoth('announce');
          }
          setResults(resultsPayload);
        })();
      } else if (msg.t === 'peer-left') {
        if (statusRef.current !== 'playing' && statusRef.current !== 'countdown') return;
        setStatusBoth('peer-left');
        audio.stopMusic();
      } else if (msg.t === 'error') {
        setError(msg.message);
        setStatusBoth('error');
      }
    };

    const onClose = () => {
      wsRef.current = null;
      if (closed || !aliveRef.current) return;
      // Drop before a match started: keep waiting and retry.
      // Drop mid-match: surface it; the player can go back and re-queue.
      if (statusRef.current === 'connecting' || statusRef.current === 'waiting' || statusRef.current === 'countdown') {
        setStatusBoth('waiting');
        scheduleRetry();
      } else if (statusRef.current === 'playing') {
        setError('connection-lost');
        setStatusBoth('error');
      }
    };

    const connect = async () => {
      if (closed || !aliveRef.current) return;
      setStatusBoth(statusRef.current === 'playing' ? statusRef.current : 'waiting');
      try {
        ws = await connectArena();
        if (!aliveRef.current || closed) {
          ws.close();
          return;
        }
        wsRef.current = ws;
        ws.addEventListener('message', onMessage);
        ws.addEventListener('close', onClose);
        handshake(ws);
        setStatusBoth('waiting');
      } catch {
        // Server asleep/unreachable (Render free tier): stay on the
        // waiting screen and retry until live.
        setStatusBoth('waiting');
        scheduleRetry();
      }
    };
    connect();

    return () => {
      closed = true;
      aliveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (retryTimer) clearTimeout(retryTimer);
      for (const t of cdTimers) clearTimeout(t);
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
      countdown,
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
      platform,
      typeText,
      acknowledgeEnd,
      forfeit,
      leave,
    }),
    [
      status,
      countdown,
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
      platform,
      typeText,
      acknowledgeEnd,
      forfeit,
      leave,
    ],
  );
}
