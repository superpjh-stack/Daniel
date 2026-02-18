'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, GameStatus, SheepQuiz, Direction } from '../_lib/types';
import { STAGES } from '../_lib/stages';
import { getRandomQuiz } from '../_lib/quizData';
import {
  createInitialState, updateFrame, tryMoveShepherd, useStaff,
  completeRescue, CANVAS_WIDTH, CANVAS_HEIGHT, getDPadAreas,
} from '../_lib/gameEngine';
import { drawGame } from '../_lib/renderer';
import { soundEngine } from '../../_shared/soundEngine';
import MuteButton from '../../_shared/MuteButton';
import QuizModal from './QuizModal';
import StageClearModal from './StageClearModal';
import GameOverModal from './GameOverModal';

interface Props {
  studentId?: string;
}

export default function LostSheepGame({ studentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(1, STAGES[0]));
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const usedQuizIdsRef = useRef<number[]>([]);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentDirRef = useRef<Direction | null>(null);

  const [status, setStatus] = useState<GameStatus>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<SheepQuiz | null>(null);
  const [stageResult, setStageResult] = useState<{
    stage: number; verse: string; verseRef: string; score: number;
    starsCollected: number; totalStars: number;
  } | null>(null);
  const [gameResult, setGameResult] = useState<{
    score: number; stageCleared: number; quizCorrect: number;
    quizTotal: number; starsCollected: number; isAllClear: boolean;
  } | null>(null);

  const getCurrentStageConfig = useCallback(() => {
    return STAGES[stateRef.current.stage - 1];
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (timestamp: number) => {
      const rawDelta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;
      const deltaTime = Math.min(rawDelta, 50);

      const state = stateRef.current;
      const config = getCurrentStageConfig();

      if (state.status === 'playing' || state.status === 'returning') {
        updateFrame(state, deltaTime, config);

        // Sound events
        for (const ev of state.pendingEvents) {
          switch (ev.type) {
            case 'step':
              // Light footstep only occasionally
              if (Math.random() < 0.3) soundEngine.playBlockMove();
              break;
            case 'star-collect':
              soundEngine.playPrayerPickup();
              break;
            case 'water-checkpoint':
              soundEngine.playServeSuccess(false);
              break;
            case 'wolf-chase':
              soundEngine.playGoliathAttack();
              break;
            case 'wolf-spotted':
              soundEngine.playDavidDamage();
              break;
            case 'wolf-hit':
              soundEngine.playSlingFire(0.8);
              break;
            case 'staff-use':
              soundEngine.playSlingFire(0.5);
              break;
            case 'sheep-found':
              soundEngine.playMiracleActivate();
              break;
            case 'return-start':
              soundEngine.playStageClear();
              break;
            case 'stage-complete':
              break; // Handled below
          }
        }
        state.pendingEvents = [];

        // Status change detection
        if (state.status !== 'playing' && state.status !== 'returning') {
          handleStatusChange(state);
        }
      }

      // Rescue animation
      if (state.status === 'rescue') {
        state.rescueTimer -= deltaTime;
        if (state.rescueTimer <= 0) {
          completeRescue(state);
          setStatus('returning');
        }
      }

      // Render
      drawGame(ctx, state, config);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [getCurrentStageConfig]);

  function handleStatusChange(state: GameState) {
    const config = getCurrentStageConfig();

    if (state.status === 'stage-clear' || state.status === 'all-clear') {
      const shouldQuiz = state.stage === 3 || state.stage === 5;
      if (shouldQuiz) {
        const quiz = getRandomQuiz(usedQuizIdsRef.current);
        usedQuizIdsRef.current.push(quiz.id);
        state.quizTotal++;
        state.status = 'quiz';
        setCurrentQuiz(quiz);
        setStatus('quiz');
        return;
      }

      if (state.status === 'all-clear') {
        soundEngine.playAllClear();
        setGameResult({
          score: state.score,
          stageCleared: state.stage,
          quizCorrect: state.quizCorrect,
          quizTotal: state.quizTotal,
          starsCollected: state.starsCollected,
          isAllClear: true,
        });
        setStatus('all-clear');
      } else {
        soundEngine.playStageClear();
        setStageResult({
          stage: state.stage,
          verse: config.verse,
          verseRef: config.verseRef,
          score: state.score,
          starsCollected: state.starsCollected,
          totalStars: state.totalStars,
        });
        setStatus('stage-clear');
      }
    } else if (state.status === 'game-over') {
      soundEngine.playGameOver();
      setGameResult({
        score: state.score,
        stageCleared: Math.max(0, state.stage - 1),
        quizCorrect: state.quizCorrect,
        quizTotal: state.quizTotal,
        starsCollected: state.starsCollected,
        isAllClear: false,
      });
      setStatus('game-over');
    }
  }

  function handleQuizAnswer(correct: boolean) {
    const state = stateRef.current;
    if (correct) {
      state.quizCorrect++;
      state.hp = Math.min(state.maxHp, state.hp + 1);
      state.score += 300;
      state.timeLeft = Math.min(state.maxTime, state.timeLeft + 15000);
      soundEngine.playQuizCorrect();
    } else {
      soundEngine.playQuizIncorrect();
    }
    setCurrentQuiz(null);

    const config = getCurrentStageConfig();
    if (state.stage >= 5) {
      soundEngine.playAllClear();
      setGameResult({
        score: state.score,
        stageCleared: state.stage,
        quizCorrect: state.quizCorrect,
        quizTotal: state.quizTotal,
        starsCollected: state.starsCollected,
        isAllClear: true,
      });
      state.status = 'all-clear';
      setStatus('all-clear');
    } else {
      soundEngine.playStageClear();
      setStageResult({
        stage: state.stage,
        verse: config.verse,
        verseRef: config.verseRef,
        score: state.score,
        starsCollected: state.starsCollected,
        totalStars: state.totalStars,
      });
      state.status = 'stage-clear';
      setStatus('stage-clear');
    }
  }

  function handleNextStage() {
    const state = stateRef.current;
    const nextStageNum = state.stage + 1;
    const nextConfig = STAGES[nextStageNum - 1];
    if (!nextConfig) return;

    // Preserve quiz state
    const qc = state.quizCorrect;
    const qt = state.quizTotal;
    const sc = state.score;
    const stars = state.starsCollected;

    const newState = createInitialState(nextStageNum, nextConfig);
    newState.quizCorrect = qc;
    newState.quizTotal = qt;
    newState.score = sc;
    newState.starsCollected = stars;
    stateRef.current = newState;

    setStageResult(null);
    setStatus('ready');
    lastTimeRef.current = 0;
  }

  function handleRestart() {
    stateRef.current = createInitialState(1, STAGES[0]);
    usedQuizIdsRef.current = [];
    setGameResult(null);
    setStageResult(null);
    setCurrentQuiz(null);
    setStatus('ready');
    lastTimeRef.current = 0;
  }

  function startMoving(dir: Direction) {
    const state = stateRef.current;
    if (state.status !== 'playing' && state.status !== 'returning') return;
    tryMoveShepherd(state, dir);
    currentDirRef.current = dir;

    // Continuous movement on hold
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.status !== 'playing' && s.status !== 'returning') return;
      if (currentDirRef.current) {
        tryMoveShepherd(s, currentDirRef.current);
      }
    }, 180);
  }

  function stopMoving() {
    currentDirRef.current = null;
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const state = stateRef.current;

    if (state.status === 'ready') {
      state.status = 'playing';
      setStatus('playing');
      soundEngine.playGameStart();
      return;
    }

    if (state.status === 'paused') {
      state.status = 'playing';
      setStatus('playing');
      return;
    }

    if (state.status !== 'playing' && state.status !== 'returning') return;

    const pos = getCanvasPos(e);
    const areas = getDPadAreas();

    // Check d-pad
    if (hitTest(pos, areas.up)) { startMoving('up'); return; }
    if (hitTest(pos, areas.down)) { startMoving('down'); return; }
    if (hitTest(pos, areas.left)) { startMoving('left'); return; }
    if (hitTest(pos, areas.right)) { startMoving('right'); return; }

    // Check staff button
    if (hitTest(pos, areas.staff)) {
      useStaff(state);
      return;
    }
  }

  function handlePointerUp(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    stopMoving();
  }

  function hitTest(pos: { x: number; y: number }, area: { x: number; y: number; w: number; h: number }): boolean {
    return pos.x >= area.x && pos.x <= area.x + area.w &&
           pos.y >= area.y && pos.y <= area.y + area.h;
  }

  // Keyboard events
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const state = stateRef.current;

      if (state.status === 'ready') {
        state.status = 'playing';
        setStatus('playing');
        soundEngine.playGameStart();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        if (state.status === 'playing' || state.status === 'returning') {
          state.status = 'paused';
          setStatus('paused');
        } else if (state.status === 'paused') {
          state.status = 'playing';
          setStatus('playing');
        }
        return;
      }

      if (state.status !== 'playing' && state.status !== 'returning') return;

      // Arrow keys / WASD
      const dirMap: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };

      const dir = dirMap[e.key];
      if (dir) {
        e.preventDefault();
        startMoving(dir);
        return;
      }

      // Space = staff
      if (e.key === ' ') {
        e.preventDefault();
        useStaff(state);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      const dirKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (dirKeys.includes(e.key)) {
        stopMoving();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative" style={{ maxWidth: 400 }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full border-2 border-slate-200 rounded-xl touch-none"
        style={{ maxWidth: 400 }}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
      />

      {/* Mute button */}
      <div className="absolute top-2 right-2 z-10">
        <MuteButton />
      </div>

      {/* Controls hint */}
      {(status === 'playing' || status === 'returning') && (
        <p className="text-center text-xs text-slate-400 mt-1">
          방향키/WASD: 이동 | Space: 지팡이 | P: 일시정지
        </p>
      )}

      {/* Modals */}
      {status === 'quiz' && currentQuiz && (
        <QuizModal quiz={currentQuiz} onAnswer={handleQuizAnswer} />
      )}
      {status === 'stage-clear' && stageResult && (
        <StageClearModal
          stage={stageResult.stage}
          verse={stageResult.verse}
          verseRef={stageResult.verseRef}
          score={stageResult.score}
          starsCollected={stageResult.starsCollected}
          totalStars={stageResult.totalStars}
          onNext={handleNextStage}
        />
      )}
      {(status === 'game-over' || status === 'all-clear') && gameResult && (
        <GameOverModal {...gameResult} studentId={studentId} onRestart={handleRestart} />
      )}
    </div>
  );
}
