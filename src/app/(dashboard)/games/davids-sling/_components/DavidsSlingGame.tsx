'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, GameStatus, DavidQuiz } from '../_lib/types';
import { STAGES } from '../_lib/stages';
import { getRandomQuiz } from '../_lib/quizData';
import {
  createInitialState, advanceStage, moveDavid, fireSling, updateFrame,
  calculateSlingVector,
  CANVAS_WIDTH, CANVAS_HEIGHT, DAVID_Y, DAVID_HEIGHT, SLOW_MOTION_FACTOR,
} from '../_lib/gameEngine';
import { drawGame, drawReadyScreen, drawPausedOverlay } from '../_lib/renderer';
import { soundEngine } from '../../_shared/soundEngine';
import MuteButton from '../../_shared/MuteButton';
import QuizModal from './QuizModal';
import StageClearModal from './StageClearModal';
import GameOverModal from './GameOverModal';

interface Props {
  studentId?: string;
}

export default function DavidsSlingGame({ studentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(1, STAGES[0]));
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const usedQuizIdsRef = useRef<number[]>([]);

  const [status, setStatus] = useState<GameStatus>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<DavidQuiz | null>(null);
  const [stageResult, setStageResult] = useState<{
    stage: number; verse: string; verseRef: string; score: number;
  } | null>(null);
  const [gameResult, setGameResult] = useState<{
    score: number; stageCleared: number; quizCorrect: number;
    quizTotal: number; isAllClear: boolean;
  } | null>(null);

  const getCurrentStageConfig = useCallback(() => {
    return STAGES[stateRef.current.stage - 1];
  }, []);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (timestamp: number) => {
      const rawDelta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;
      const deltaTime = Math.min(rawDelta, 50); // 프레임 드롭 보정

      const state = stateRef.current;
      const config = getCurrentStageConfig();

      // 키보드 입력 처리
      if (state.status === 'playing') {
        let dir = 0;
        if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) dir -= 1;
        if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) dir += 1;
        if (dir !== 0) moveDavid(state.david, dir);

        const effectiveDelta = state.slowMotion ? deltaTime * SLOW_MOTION_FACTOR : deltaTime;
        updateFrame(state, effectiveDelta, config);

        // 사운드 이벤트 처리
        for (const ev of state.pendingEvents) {
          switch (ev.type) {
            case 'weakpoint-hit': soundEngine.playWeakPointHit(ev.subtype); break;
            case 'body-bounce': soundEngine.playBodyBounce(); break;
            case 'david-damage': soundEngine.playDavidDamage(); break;
            case 'goliath-attack': soundEngine.playGoliathAttack(); break;
            case 'prayer-pickup': soundEngine.playPrayerPickup(); break;
            case 'faith-activate': soundEngine.playFaithActivate(); break;
            case 'faith-deactivate': soundEngine.playFaithDeactivate(); break;
          }
        }
        state.pendingEvents = [];

        // 상태 변경 감지
        if (state.status !== 'playing') {
          handleStatusChange(state);
        }
      }

      // 렌더
      drawGame(ctx, state, config);
      if (state.status === 'ready') {
        drawReadyScreen(ctx, state.stage);
      } else if (state.status === 'paused') {
        drawPausedOverlay(ctx);
      }

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
        // 퀴즈 먼저 표시
        const quiz = getRandomQuiz(usedQuizIdsRef.current);
        usedQuizIdsRef.current.push(quiz.id);
        state.quizTotal++;
        state.status = 'quiz';
        setCurrentQuiz(quiz);
        setStatus('quiz');
        // 퀴즈 후에 stage-clear 또는 all-clear 처리
        return;
      }

      if (state.status === 'all-clear') {
        soundEngine.playAllClear();
        setGameResult({
          score: state.score,
          stageCleared: state.stage,
          quizCorrect: state.quizCorrect,
          quizTotal: state.quizTotal,
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
        isAllClear: false,
      });
      setStatus('game-over');
    }
  }

  function handleQuizAnswer(correct: boolean) {
    const state = stateRef.current;
    if (correct) {
      state.quizCorrect++;
      state.david.hp = Math.min(state.david.maxHp, state.david.hp + 1);
      state.score += 300;
      soundEngine.playQuizCorrect();
    } else {
      soundEngine.playQuizIncorrect();
    }
    setCurrentQuiz(null);

    // 퀴즈 후 스테이지 클리어 or 올클리어 처리
    const config = getCurrentStageConfig();
    if (state.stage >= 5) {
      setGameResult({
        score: state.score,
        stageCleared: state.stage,
        quizCorrect: state.quizCorrect,
        quizTotal: state.quizTotal,
        isAllClear: true,
      });
      state.status = 'all-clear';
      setStatus('all-clear');
    } else {
      setStageResult({
        stage: state.stage,
        verse: config.verse,
        verseRef: config.verseRef,
        score: state.score,
      });
      state.status = 'stage-clear';
      setStatus('stage-clear');
    }
  }

  function handleNextStage() {
    const state = stateRef.current;
    const nextConfig = STAGES[state.stage]; // stage is 1-indexed, array is 0-indexed
    advanceStage(state, nextConfig);
    setStageResult(null);
    setStatus('playing');
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

  // Pointer events (드래그 발사)
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

    if (state.status !== 'playing') return;

    const pos = getCanvasPos(e);

    // 다윗 근처에서 드래그 시작
    const distToDavid = Math.sqrt(
      (pos.x - state.david.x) ** 2 + (pos.y - state.david.y) ** 2
    );
    if (distToDavid < 80) {
      state.dragState = {
        isDragging: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      };
    }
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const state = stateRef.current;
    if (!state.dragState.isDragging) return;

    const pos = getCanvasPos(e);
    state.dragState.currentX = pos.x;
    state.dragState.currentY = pos.y;

    // 드래그 중 다윗 이동
    const dx = pos.x - state.david.x;
    if (Math.abs(dx) > 5) {
      moveDavid(state.david, dx > 0 ? 0.5 : -0.5);
    }
  }

  function handlePointerUp(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const state = stateRef.current;
    if (!state.dragState.isDragging) return;

    const { power } = calculateSlingVector(state.dragState);
    const sling = fireSling(state);
    if (sling) soundEngine.playSlingFire(power);
    state.dragState.isDragging = false;
  }

  // 키보드 이벤트
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      keysRef.current.add(e.key);

      const state = stateRef.current;

      if (state.status === 'ready') {
        state.status = 'playing';
        setStatus('playing');
        soundEngine.playGameStart();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        if (state.status === 'playing') {
          state.status = 'paused';
          setStatus('paused');
        } else if (state.status === 'paused') {
          state.status = 'playing';
          setStatus('playing');
        }
      }

      // 스페이스바로 발사 (드래그 없이 위로 쏘기)
      if (e.key === ' ' && state.status === 'playing') {
        e.preventDefault();
        state.dragState = {
          isDragging: false,
          startX: state.david.x,
          startY: state.david.y,
          currentX: state.david.x,
          currentY: state.david.y + 80,
        };
        const sling = fireSling(state);
        if (sling) soundEngine.playSlingFire(0.5);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* 음소거 버튼 */}
      <div className="absolute top-2 right-2 z-10">
        <MuteButton />
      </div>

      {/* 조작 안내 */}
      {status === 'playing' && (
        <p className="text-center text-xs text-slate-400 mt-1">
          좌/우 키로 이동 | 드래그로 발사 | 스페이스: 위로 발사 | P: 일시정지
        </p>
      )}

      {/* 모달 */}
      {status === 'quiz' && currentQuiz && (
        <QuizModal quiz={currentQuiz} onAnswer={handleQuizAnswer} />
      )}
      {status === 'stage-clear' && stageResult && (
        <StageClearModal {...stageResult} onNext={handleNextStage} />
      )}
      {(status === 'game-over' || status === 'all-clear') && gameResult && (
        <GameOverModal {...gameResult} studentId={studentId} onRestart={handleRestart} />
      )}
    </div>
  );
}
