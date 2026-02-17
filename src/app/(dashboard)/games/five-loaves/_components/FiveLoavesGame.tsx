'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, GameStatus, FishQuiz, Disciple, DiscipleId, FoodType } from '../_lib/types';
import { STAGES } from '../_lib/stages';
import { getRandomQuiz } from '../_lib/quizData';
import {
  createInitialState, advanceStage, updateFrame,
  findClickedCrowd, serveCrowd, buyUpgrade,
  CANVAS_WIDTH, CANVAS_HEIGHT,
} from '../_lib/gameEngine';
import { drawGame, drawReadyScreen, drawPausedOverlay, getButtonHitAreas } from '../_lib/renderer';
import { soundEngine } from '../../_shared/soundEngine';
import MuteButton from '../../_shared/MuteButton';
import QuizModal from './QuizModal';
import StageClearModal from './StageClearModal';
import GameOverModal from './GameOverModal';

interface Props {
  studentId?: string;
}

export default function FiveLoavesGame({ studentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(1));
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const usedQuizIdsRef = useRef<number[]>([]);

  const [status, setStatus] = useState<GameStatus>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<FishQuiz | null>(null);
  const [stageResult, setStageResult] = useState<{
    stage: number; verse: string; verseRef: string; score: number;
    servedCount: number; disciples: Disciple[]; upgradePoints: number;
  } | null>(null);
  const [gameResult, setGameResult] = useState<{
    score: number; stageCleared: number; quizCorrect: number;
    quizTotal: number; totalBread: number; totalFish: number; isAllClear: boolean;
  } | null>(null);

  const getCurrentStageConfig = useCallback(() => {
    return STAGES[stateRef.current.stage - 1];
  }, []);

  // Selected food type for button mode
  const selectedFoodRef = useRef<FoodType | null>(null);

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

      if (state.status === 'playing') {
        updateFrame(state, deltaTime, config);

        // Sound events
        for (const ev of state.pendingEvents) {
          switch (ev.type) {
            case 'serve-success':
              soundEngine.playServeSuccess(ev.isChild);
              break;
            case 'crowd-timeout':
              soundEngine.playCrowdTimeout();
              break;
            case 'miracle-activate':
              soundEngine.playMiracleActivate();
              break;
            case 'miracle-deactivate':
              soundEngine.playMiracleDeactivate();
              break;
            case 'basket-multiply':
              soundEngine.playBasketMultiply();
              break;
            case 'upgrade-buy':
              soundEngine.playUpgradeBuy();
              break;
            case 'combo':
              soundEngine.playCombo(ev.count);
              break;
          }
        }
        state.pendingEvents = [];

        // Status change detection
        if (state.status !== 'playing') {
          handleStatusChange(state);
        }
      }

      // Render
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
          totalBread: state.totalBread,
          totalFish: state.totalFish,
          isAllClear: true,
        });
        setStatus('all-clear');
      } else {
        soundEngine.playStageClear();
        // Add upgrade reward
        state.upgradePoints += config.upgradeReward;
        setStageResult({
          stage: state.stage,
          verse: config.verse,
          verseRef: config.verseRef,
          score: state.score,
          servedCount: state.servedCount,
          disciples: state.disciples.map(d => ({ ...d, cost: [...d.cost] })),
          upgradePoints: state.upgradePoints,
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
        totalBread: state.totalBread,
        totalFish: state.totalFish,
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
      state.miracleGauge.value = Math.min(100, state.miracleGauge.value + 15);
      state.upgradePoints += 1;
      soundEngine.playQuizCorrect();
    } else {
      soundEngine.playQuizIncorrect();
    }
    setCurrentQuiz(null);

    const config = getCurrentStageConfig();
    if (state.stage >= 5) {
      soundEngine.playAllClear();
      state.upgradePoints += config.upgradeReward;
      setGameResult({
        score: state.score,
        stageCleared: state.stage,
        quizCorrect: state.quizCorrect,
        quizTotal: state.quizTotal,
        totalBread: state.totalBread,
        totalFish: state.totalFish,
        isAllClear: true,
      });
      state.status = 'all-clear';
      setStatus('all-clear');
    } else {
      soundEngine.playStageClear();
      state.upgradePoints += config.upgradeReward;
      setStageResult({
        stage: state.stage,
        verse: config.verse,
        verseRef: config.verseRef,
        score: state.score,
        servedCount: state.servedCount,
        disciples: state.disciples.map(d => ({ ...d, cost: [...d.cost] })),
        upgradePoints: state.upgradePoints,
      });
      state.status = 'stage-clear';
      setStatus('stage-clear');
    }
  }

  function handleUpgrade(discipleId: DiscipleId) {
    const state = stateRef.current;
    const success = buyUpgrade(state, discipleId);
    if (success) {
      // Update stageResult to reflect new state
      setStageResult(prev => prev ? {
        ...prev,
        disciples: state.disciples.map(d => ({ ...d, cost: [...d.cost] })),
        upgradePoints: state.upgradePoints,
      } : null);
    }
  }

  function handleNextStage() {
    const state = stateRef.current;
    const nextConfig = STAGES[state.stage]; // stage is 1-indexed
    advanceStage(state, nextConfig);
    setStageResult(null);
    setStatus('playing');
  }

  function handleRestart() {
    stateRef.current = createInitialState(1);
    usedQuizIdsRef.current = [];
    setGameResult(null);
    setStageResult(null);
    setCurrentQuiz(null);
    setStatus('ready');
    lastTimeRef.current = 0;
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

    if (state.status !== 'playing') return;

    const pos = getCanvasPos(e);

    // Check if bread/fish button was pressed
    const buttons = getButtonHitAreas(state);
    if (pos.x >= buttons.bread.x && pos.x <= buttons.bread.x + buttons.bread.w &&
        pos.y >= buttons.bread.y && pos.y <= buttons.bread.y + buttons.bread.h) {
      // Bread button: serve the most urgent crowd wanting bread
      serveByFood(state, 'bread');
      return;
    }
    if (pos.x >= buttons.fish.x && pos.x <= buttons.fish.x + buttons.fish.w &&
        pos.y >= buttons.fish.y && pos.y <= buttons.fish.y + buttons.fish.h) {
      serveByFood(state, 'fish');
      return;
    }

    // Click on crowd directly
    const crowd = findClickedCrowd(state, pos.x, pos.y);
    if (crowd) {
      serveCrowd(state, crowd);
    }
  }

  function serveByFood(state: GameState, food: FoodType) {
    // Find the most urgent unserved crowd wanting this food
    const target = state.crowds
      .filter(c => !c.served && !c.leaving && c.wantFood === food)
      .sort((a, b) => a.patience - b.patience)[0];

    if (target) {
      serveCrowd(state, target);
    } else {
      // Try any unserved crowd
      const anyTarget = state.crowds
        .filter(c => !c.served && !c.leaving)
        .sort((a, b) => a.patience - b.patience)[0];
      if (anyTarget) {
        serveCrowd(state, anyTarget);
      }
    }
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
        if (state.status === 'playing') {
          state.status = 'paused';
          setStatus('paused');
        } else if (state.status === 'paused') {
          state.status = 'playing';
          setStatus('playing');
        }
      }

      // 1 or b = bread, 2 or f = fish
      if (state.status === 'playing') {
        if (e.key === '1' || e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          serveByFood(state, 'bread');
        } else if (e.key === '2' || e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          serveByFood(state, 'fish');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        onTouchStart={handlePointerDown}
      />

      {/* Mute button */}
      <div className="absolute top-2 right-2 z-10">
        <MuteButton />
      </div>

      {/* Controls hint */}
      {status === 'playing' && (
        <p className="text-center text-xs text-slate-400 mt-1">
          {'\u{1F35E}'} 버튼 또는 군중 터치로 서빙 | 1: 빵 | 2: 물고기 | P: 일시정지
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
          servedCount={stageResult.servedCount}
          disciples={stageResult.disciples}
          upgradePoints={stageResult.upgradePoints}
          onUpgrade={handleUpgrade}
          onNext={handleNextStage}
        />
      )}
      {(status === 'game-over' || status === 'all-clear') && gameResult && (
        <GameOverModal {...gameResult} studentId={studentId} onRestart={handleRestart} />
      )}
    </div>
  );
}
