'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { GameState, QuizData, QuizAnswer } from '../_lib/types';
import { STAGES, generateBricks } from '../_lib/stages';
import {
  createBall, createPaddle, movePaddleLeft, movePaddleRight, setPaddleX,
  updateBall, allBricksDestroyed,
  drawGame, drawReadyScreen, drawPausedOverlay,
} from '../_lib/gameEngine';
import QuizModal from './QuizModal';
import GameOverModal from './GameOverModal';

interface Props {
  quizzes: QuizData[];
  answers: QuizAnswer[];
  studentId?: string;
}

const CANVAS_MAX_WIDTH = 480;
const CANVAS_RATIO = 4 / 3;

export default function BrickBreakerGame({ quizzes, answers, studentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_MAX_WIDTH, height: CANVAS_MAX_WIDTH * CANVAS_RATIO });
  const [quizModal, setQuizModal] = useState<{ quiz: QuizData; answer: number } | null>(null);
  const [gameOverData, setGameOverData] = useState<{ score: number; stage: number; quizCorrect: number; quizTotal: number } | null>(null);
  const [versePopup, setVersePopup] = useState<string | null>(null);

  // 캔버스 리사이즈
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const w = Math.min(containerRef.current.clientWidth, CANVAS_MAX_WIDTH);
      setCanvasSize({ width: w, height: w * CANVAS_RATIO });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 게임 초기화
  const initStage = useCallback((stageNum: number, prevScore = 0, prevLives = 3, prevQuizCorrect = 0, prevQuizTotal = 0) => {
    const config = STAGES[stageNum - 1];
    if (!config) return;

    const { width, height } = canvasSize;
    const bricks = generateBricks(config, width, 40);
    const ball = createBall(width, height, config.ballSpeed);
    const paddle = createPaddle(width, height);

    stateRef.current = {
      stage: stageNum,
      score: prevScore,
      lives: prevLives,
      bricks,
      ball,
      paddle,
      status: 'ready',
      quizCorrect: prevQuizCorrect,
      quizTotal: prevQuizTotal,
    };

    // ready 화면 그리기
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawReadyScreen(ctx, width, height, stageNum);
  }, [canvasSize]);

  // 게임 시작
  const startGame = useCallback(() => {
    setGameOverData(null);
    setQuizModal(null);
    setVersePopup(null);
    initStage(1);
  }, [initStage]);

  // 처음 마운트 시 게임 초기화
  useEffect(() => {
    startGame();
  }, [startGame]);

  // 게임 루프
  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;

    if (state.status === 'ready') {
      drawReadyScreen(ctx, width, height, state.stage);
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (state.status === 'paused') {
      drawGame(ctx, state, width, height);
      drawPausedOverlay(ctx, width, height);
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (state.status !== 'playing') {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // 키보드 입력 처리
    if (keysRef.current.has('ArrowLeft')) movePaddleLeft(state.paddle);
    if (keysRef.current.has('ArrowRight')) movePaddleRight(state.paddle, width);

    // 물리 업데이트
    const result = updateBall(state, width, height);

    if (result.lost) {
      state.lives--;
      if (state.lives <= 0) {
        state.status = 'game-over';
        setGameOverData({ score: state.score, stage: state.stage, quizCorrect: state.quizCorrect, quizTotal: state.quizTotal });
      } else {
        // 공/패들 리셋
        const config = STAGES[state.stage - 1];
        const newBall = createBall(width, height, config.ballSpeed);
        state.ball = newBall;
        state.paddle = createPaddle(width, height);
        state.status = 'ready';
      }
    }

    // 퀴즈 트리거
    if (result.quizTriggered !== null) {
      const qIdx = result.quizTriggered;
      if (qIdx < quizzes.length) {
        state.status = 'quiz';
        state.quizTotal++;
        setQuizModal({ quiz: quizzes[qIdx], answer: answers[qIdx]?.answer || 1 });
      }
    }

    // 성경구절 팝업
    if (result.verseTriggered) {
      setVersePopup(result.verseTriggered);
      setTimeout(() => setVersePopup(null), 1500);
    }

    // 스테이지 클리어 체크
    if (allBricksDestroyed(state.bricks)) {
      if (state.stage >= 5) {
        state.status = 'all-clear';
        setGameOverData({ score: state.score, stage: state.stage, quizCorrect: state.quizCorrect, quizTotal: state.quizTotal });
      } else {
        state.status = 'stage-clear';
        setTimeout(() => {
          initStage(state.stage + 1, state.score, state.lives, state.quizCorrect, state.quizTotal);
        }, 500);
      }
    }

    drawGame(ctx, state, width, height);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [canvasSize, quizzes, answers, initStage]);

  // 게임 루프 시작/정지
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameLoop]);

  // 키보드 이벤트
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      keysRef.current.add(e.key);
      if (e.key === 'Escape' || e.key === ' ') {
        const state = stateRef.current;
        if (!state) return;
        if (state.status === 'playing') state.status = 'paused';
        else if (state.status === 'paused') state.status = 'playing';
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  // 캔버스 클릭/터치 이벤트
  function handleCanvasClick() {
    const state = stateRef.current;
    if (!state) return;
    if (state.status === 'ready') state.status = 'playing';
    else if (state.status === 'paused') state.status = 'playing';
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const state = stateRef.current;
    if (!state || state.status !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPaddleX(state.paddle, e.clientX - rect.left, canvasSize.width);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const state = stateRef.current;
    if (!state || state.status !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setPaddleX(state.paddle, touch.clientX - rect.left, canvasSize.width);
  }

  // 퀴즈 정답 처리
  function handleQuizAnswer(correct: boolean) {
    const state = stateRef.current;
    if (!state) return;
    if (correct) {
      state.score += 100;
      state.quizCorrect++;
    }
    setQuizModal(null);
    state.status = 'playing';
  }

  // 일시정지 버튼
  function handlePause() {
    const state = stateRef.current;
    if (!state) return;
    if (state.status === 'playing') state.status = 'paused';
    else if (state.status === 'paused') state.status = 'playing';
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: CANVAS_MAX_WIDTH }}>
        <button
          onClick={() => window.history.back()}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← 뒤로
        </button>
        <button
          onClick={handlePause}
          className="px-3 py-1 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600"
        >
          ⏸ 일시정지
        </button>
      </div>

      {/* 캔버스 */}
      <div ref={containerRef} className="w-full" style={{ maxWidth: CANVAS_MAX_WIDTH }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="rounded-xl border-2 border-slate-700 cursor-pointer touch-none"
          style={{ width: '100%', height: 'auto' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onTouchStart={(e) => e.preventDefault()}
        />
      </div>

      {/* 성경구절 팝업 */}
      {versePopup && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 bg-sky-500/90 text-white px-6 py-3 rounded-xl text-lg font-bold shadow-lg animate-bounce z-50">
          📖 {versePopup}
        </div>
      )}

      {/* 퀴즈 모달 */}
      {quizModal && (
        <QuizModal
          quiz={quizModal.quiz}
          correctAnswer={quizModal.answer}
          onAnswer={handleQuizAnswer}
        />
      )}

      {/* 게임 오버 모달 */}
      {gameOverData && (
        <GameOverModal
          score={gameOverData.score}
          stageCleared={gameOverData.stage}
          quizCorrect={gameOverData.quizCorrect}
          quizTotal={gameOverData.quizTotal}
          isAllClear={stateRef.current?.status === 'all-clear'}
          studentId={studentId}
          onRestart={startGame}
        />
      )}
    </div>
  );
}
