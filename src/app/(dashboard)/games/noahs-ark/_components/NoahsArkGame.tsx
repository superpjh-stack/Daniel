'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { GameState, RainDrop, NoahQuiz } from '../_lib/types';
import { STAGES } from '../_lib/stages';
import { NOAH_QUIZZES } from '../_lib/quizData';
import {
  createInitialState,
  tryMove,
  tryRotate,
  hardDrop,
  processLanding,
  isTopReached,
  generateQuizSchedule,
} from '../_lib/gameEngine';
import { getBalanceStatus } from '../_lib/balance';
import {
  calculateLayout,
  drawGame,
  drawReadyScreen,
  drawPausedOverlay,
  updateRain,
  type Layout,
  type TouchAreas,
} from '../_lib/renderer';
import QuizModal from './QuizModal';
import StageClearModal from './StageClearModal';
import GameOverModal from './GameOverModal';

interface Props {
  studentId?: string;
}

export default function NoahsArkGame({ studentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(1));
  const rainRef = useRef<RainDrop[]>([]);
  const layoutRef = useRef<Layout | null>(null);
  const touchRef = useRef<TouchAreas | null>(null);
  const lastTimeRef = useRef(0);
  const dropAccRef = useRef(0); // 낙하 타이머 누적
  const animFrameRef = useRef(0);

  const [status, setStatus] = useState<GameState['status']>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<NoahQuiz | null>(null);
  const [stageClearData, setStageClearData] = useState<{
    stage: number;
    verse: string;
    verseRef: string;
    lines: number;
    score: number;
  } | null>(null);
  const [gameOverData, setGameOverData] = useState<{
    score: number;
    stageCleared: number;
    quizCorrect: number;
    quizTotal: number;
    isAllClear: boolean;
  } | null>(null);

  // 사용되지 않은 퀴즈 추적
  const usedQuizIds = useRef<Set<number>>(new Set());

  function getRandomQuiz(): NoahQuiz | null {
    const available = NOAH_QUIZZES.filter(q => !usedQuizIds.current.has(q.id));
    if (available.length === 0) {
      usedQuizIds.current.clear();
      return NOAH_QUIZZES[Math.floor(Math.random() * NOAH_QUIZZES.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  // 스테이지 시작
  const startStage = useCallback((stageNum: number) => {
    const state = createInitialState(stageNum);
    const stageConfig = STAGES[stageNum - 1];
    state.quizQueue = generateQuizSchedule(stageConfig.quizBlockCount, 80);
    state.status = 'playing';
    stateRef.current = state;
    dropAccRef.current = 0;
    setStatus('playing');
    setStageClearData(null);
    setGameOverData(null);
    setCurrentQuiz(null);
  }, []);

  // 게임 시작 (터치 or 키보드)
  const handleStart = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'ready') {
      startStage(s.stage);
    }
  }, [startStage]);

  // 일시정지 토글
  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'playing') {
      s.status = 'paused';
      setStatus('paused');
    } else if (s.status === 'paused') {
      s.status = 'playing';
      setStatus('playing');
    }
  }, []);

  // 입력 처리
  const handleAction = useCallback((action: 'left' | 'right' | 'rotate' | 'drop' | 'softdrop') => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.activeBlock) return;

    switch (action) {
      case 'left':
        tryMove(s.board, s.activeBlock, 0, -1);
        break;
      case 'right':
        tryMove(s.board, s.activeBlock, 0, 1);
        break;
      case 'rotate':
        tryRotate(s.board, s.activeBlock);
        break;
      case 'softdrop':
        if (tryMove(s.board, s.activeBlock, 1, 0)) {
          s.score += 1;
        }
        break;
      case 'drop': {
        const bonus = hardDrop(s.board, s.activeBlock);
        s.score += bonus;
        land();
        break;
      }
    }
  }, []);

  // 착지 처리
  const land = useCallback(() => {
    const s = stateRef.current;
    const stageConfig = STAGES[s.stage - 1];
    const result = processLanding(s);

    // 균형 체크 → 게임 오버
    const balanceStatus = getBalanceStatus(result.balanceTilt, stageConfig);
    if (balanceStatus === 'danger') {
      s.status = 'game-over';
      setStatus('game-over');
      setGameOverData({
        score: s.score,
        stageCleared: s.stage - 1,
        quizCorrect: s.quizCorrect,
        quizTotal: s.quizTotal,
        isAllClear: false,
      });
      return;
    }

    // 꼭대기 도달 → 게임 오버
    if (isTopReached(s.board)) {
      s.status = 'game-over';
      setStatus('game-over');
      setGameOverData({
        score: s.score,
        stageCleared: s.stage - 1,
        quizCorrect: s.quizCorrect,
        quizTotal: s.quizTotal,
        isAllClear: false,
      });
      return;
    }

    // 퀴즈 트리거
    if (result.quizTriggered) {
      const quiz = getRandomQuiz();
      if (quiz) {
        usedQuizIds.current.add(quiz.id);
        s.status = 'quiz';
        setStatus('quiz');
        setCurrentQuiz(quiz);
        s.quizTotal++;
        return;
      }
    }

    // 스테이지 클리어 체크
    if (s.linesCleared >= stageConfig.targetLines) {
      if (s.stage >= 5) {
        // 전체 클리어
        s.status = 'all-clear';
        setStatus('all-clear');
        setGameOverData({
          score: s.score,
          stageCleared: 5,
          quizCorrect: s.quizCorrect,
          quizTotal: s.quizTotal,
          isAllClear: true,
        });
      } else {
        s.status = 'stage-clear';
        setStatus('stage-clear');
        setStageClearData({
          stage: s.stage,
          verse: stageConfig.verse,
          verseRef: stageConfig.verseRef,
          lines: s.linesCleared,
          score: s.score,
        });
      }
    }

    dropAccRef.current = 0;
  }, []);

  // 퀴즈 답변 처리
  const handleQuizAnswer = useCallback((correct: boolean) => {
    const s = stateRef.current;
    if (correct) s.quizCorrect++;
    s.score += correct ? 200 : 50;
    s.status = 'playing';
    setStatus('playing');
    setCurrentQuiz(null);
  }, []);

  // 다음 스테이지
  const handleNextStage = useCallback(() => {
    const s = stateRef.current;
    startStage(s.stage + 1);
  }, [startStage]);

  // 다시하기
  const handleRestart = useCallback(() => {
    usedQuizIds.current.clear();
    stateRef.current = createInitialState(1);
    rainRef.current = [];
    dropAccRef.current = 0;
    setStatus('ready');
    setStageClearData(null);
    setGameOverData(null);
    setCurrentQuiz(null);
  }, []);

  // 키보드
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = stateRef.current;

      if (s.status === 'ready') {
        handleStart();
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }

      if (s.status !== 'playing') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleAction('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleAction('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleAction('softdrop');
          break;
        case 'ArrowUp':
        case 'z':
        case 'Z':
          e.preventDefault();
          handleAction('rotate');
          break;
        case ' ':
          e.preventDefault();
          handleAction('drop');
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStart, togglePause, handleAction]);

  // 터치 이벤트
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onTouch(e: TouchEvent) {
      e.preventDefault();
      const s = stateRef.current;
      const touch = e.touches[0];
      if (!touch || !touchRef.current || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const tx = (touch.clientX - rect.left) * scaleX;
      const ty = (touch.clientY - rect.top) * scaleY;

      if (s.status === 'ready') {
        handleStart();
        return;
      }
      if (s.status === 'paused') {
        togglePause();
        return;
      }
      if (s.status !== 'playing') return;

      const areas = touchRef.current;
      if (hitTest(tx, ty, areas.left)) handleAction('left');
      else if (hitTest(tx, ty, areas.rotate)) handleAction('rotate');
      else if (hitTest(tx, ty, areas.right)) handleAction('right');
      else if (hitTest(tx, ty, areas.drop)) handleAction('drop');
      else {
        // 보드 영역 탭 = 회전
        const layout = layoutRef.current;
        if (layout && tx >= layout.boardX && tx <= layout.boardX + layout.boardW &&
            ty >= layout.boardY && ty <= layout.boardY + layout.boardH) {
          handleAction('rotate');
        }
      }
    }

    canvas.addEventListener('touchstart', onTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', onTouch);
  }, [handleStart, togglePause, handleAction]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.min(parent.clientWidth, 420);
      const h = Math.min(window.innerHeight - 120, 700);
      canvas.width = w;
      canvas.height = h;
      layoutRef.current = calculateLayout(w, h);
    }

    resize();
    window.addEventListener('resize', resize);

    function loop(time: number) {
      if (!ctx || !canvas) return;
      const dt = lastTimeRef.current === 0 ? 16 : time - lastTimeRef.current;
      lastTimeRef.current = time;

      const s = stateRef.current;
      const layout = layoutRef.current;
      if (!layout) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const stageConfig = STAGES[s.stage - 1];

      // 비 업데이트
      updateRain(rainRef.current, stageConfig.rainIntensity, layout.canvasW, layout.canvasH);

      // 자동 낙하
      if (s.status === 'playing' && s.activeBlock) {
        dropAccRef.current += dt;
        if (dropAccRef.current >= stageConfig.dropInterval) {
          dropAccRef.current -= stageConfig.dropInterval;
          if (!tryMove(s.board, s.activeBlock, 1, 0)) {
            land();
          }
        }
      }

      // 렌더
      const areas = drawGame(ctx, s, layout, stageConfig, rainRef.current);
      touchRef.current = areas;

      if (s.status === 'ready') {
        drawReadyScreen(ctx, layout, s.stage);
      } else if (s.status === 'paused') {
        drawPausedOverlay(ctx, layout);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [land]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="block rounded-xl shadow-lg"
        style={{ touchAction: 'none', maxWidth: '100%' }}
      />

      {/* 퀴즈 모달 */}
      {status === 'quiz' && currentQuiz && (
        <QuizModal quiz={currentQuiz} onAnswer={handleQuizAnswer} />
      )}

      {/* 스테이지 클리어 모달 */}
      {status === 'stage-clear' && stageClearData && (
        <StageClearModal
          stage={stageClearData.stage}
          verse={stageClearData.verse}
          verseRef={stageClearData.verseRef}
          lines={stageClearData.lines}
          score={stageClearData.score}
          onNext={handleNextStage}
        />
      )}

      {/* 게임 오버 / 올클리어 모달 */}
      {(status === 'game-over' || status === 'all-clear') && gameOverData && (
        <GameOverModal
          score={gameOverData.score}
          stageCleared={gameOverData.stageCleared}
          quizCorrect={gameOverData.quizCorrect}
          quizTotal={gameOverData.quizTotal}
          isAllClear={gameOverData.isAllClear}
          studentId={studentId}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

function hitTest(
  x: number, y: number,
  area: { x: number; y: number; w: number; h: number },
): boolean {
  return x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
}
