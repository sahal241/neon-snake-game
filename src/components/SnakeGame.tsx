import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

let audioCtx: AudioContext | null = null;

const playSound = (type: 'move' | 'eat' | 'eat_gold' | 'gameover' | 'click', isMuted: boolean) => {
  if (isMuted) return;
  if (!audioCtx && typeof window !== 'undefined') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (!audioCtx) return;
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const t = audioCtx.currentTime;

  if (type === 'move') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);
    gainNode.gain.setValueAtTime(0.05, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);
  } else if (type === 'eat') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    gainNode.gain.setValueAtTime(0.05, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.1);
  } else if (type === 'eat_gold') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    gainNode.gain.setValueAtTime(0.08, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);
  } else if (type === 'gameover') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    gainNode.gain.setValueAtTime(0.1, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.5);
  } else if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);
    gainNode.gain.setValueAtTime(0.1, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);
  }
};

type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string };

const CANVAS_SIZE = 600;
const GRID_SIZE = 20;
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE;

const COLOR_BG = '#0a0a0a';
const COLOR_GRID = '#1a1a1a';
const COLOR_FOOD = '#ec4899';
const COLOR_GOLDEN_APPLE = '#eab308'; // Golden apple color

const REGULAR_FOOD_COLORS = ['#ec4899', '#4ade80', '#3b82f6', '#ef4444'];
const COLOR_VIOLET_FOOD = '#a855f7';

const SNAKE_COLORS = {
  green: { head: '#4ade80', body: '#22c55e', name: 'Neon Green' },
  red: { head: '#f87171', body: '#ef4444', name: 'Neon Red' },
  blue: { head: '#60a5fa', body: '#3b82f6', name: 'Neon Blue' },
};

const DEMO_COLORS = ['#4ade80', '#ef4444', '#3b82f6']; // Neon green, red, blue

// exclude golden apple too
const generateFood = (exclude: Point[]): Point => {
  let newFood: Point;
  let isOccupied = true;
  while (isOccupied) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    isOccupied = exclude.some((segment) => segment.x === newFood.x && segment.y === newFood.y);
  }
  return newFood!;
};

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'INSTRUCTIONS'>('START');
  const [snakeColor, setSnakeColor] = useState<keyof typeof SNAKE_COLORS>('green');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [score, setScore] = useState(0);
  const [multiplierActive, setMultiplierActive] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('neonSnakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [swipeFlash, setSwipeFlash] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const state = useRef({
    snake: [{ x: 10, y: 10 }] as Point[],
    dir: { x: 0, y: -1 } as Point,
    nextDir: { x: 0, y: -1 } as Point,
    food: { x: 5, y: 5 } as Point,
    foodColor: '#ec4899',
    violetFood: { x: 15, y: 15 } as Point | null,
    lastVioletFoodSpawnTime: 0,
    goldenApple: null as Point | null,
    lastGoldenAppleScore: 0,
    multiplierActiveUntil: 0,
    particles: [] as Particle[],
    shakeUntil: 0,
    lastMoveTime: 0,
    lastFoodSpawnTime: 0,
    baseSpeed: 150,

    // Background Demo Snakes
    demoSnakes: [
      {
        segments: [{ x: 2, y: 12 }, { x: 2, y: 13 }, { x: 2, y: 14 }, { x: 2, y: 15 }, { x: 2, y: 16 }],
        dir: { x: 0, y: -1 },
        lastMoveTime: 0,
        color: '#ef4444',
        respawn: { x: 2, y: 12 }
      },
      {
        segments: [{ x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 17, y: 2 }, { x: 18, y: 2 }],
        dir: { x: -1, y: 0 },
        lastMoveTime: 0,
        color: '#3b82f6',
        respawn: { x: 14, y: 2 }
      },
      {
        segments: [{ x: 17, y: 12 }, { x: 17, y: 13 }, { x: 17, y: 14 }, { x: 17, y: 15 }, { x: 17, y: 16 }],
        dir: { x: 0, y: -1 },
        lastMoveTime: 0,
        color: '#4ade80',
        respawn: { x: 17, y: 12 }
      }
    ] as { segments: Point[], dir: Point, lastMoveTime: number, color: string, respawn: Point }[],
  });

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const startGame = useCallback(() => {
    playSound('click', isMutedRef.current);
    state.current = {
      ...state.current,
      snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
      dir: { x: 0, y: -1 },
      nextDir: { x: 0, y: -1 },
      food: generateFood([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]),
      foodColor: REGULAR_FOOD_COLORS[Math.floor(Math.random() * REGULAR_FOOD_COLORS.length)],
      violetFood: generateFood([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]),
      lastVioletFoodSpawnTime: performance.now(),
      goldenApple: null,
      lastGoldenAppleScore: 0,
      multiplierActiveUntil: 0,
      particles: [],
      shakeUntil: 0,
      lastMoveTime: performance.now(),
      lastFoodSpawnTime: performance.now(),
      baseSpeed: 150,
    };
    setScore(0);
    setMultiplierActive(false);
    setGameState('PLAYING');
  }, []);

  const triggerParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        newParticles.push({
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: Math.random() * 30 + 20,
            color,
        });
    }
    state.current.particles.push(...newParticles);
  };

  const handleGameOver = useCallback(() => {
    playSound('gameover', isMutedRef.current);
    setGameState('GAME_OVER');
    state.current.shakeUntil = performance.now() + 800; // Screen shake on game over
    setHighScore((prev) => {
      const newHigh = Math.max(prev, score);
      localStorage.setItem('neonSnakeHighScore', newHigh.toString());
      return newHigh;
    });
  }, [score]);

  const updateDemoSnake = useCallback((time: number) => {
    const s = state.current;
    s.demoSnakes.forEach(snake => {
      if (time - snake.lastMoveTime > 200) {
        const head = snake.segments[0];
        const possibleDirs = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ].filter(d => (d.x !== -snake.dir.x || d.y !== -snake.dir.y)); 
        
        const isSafe = (d: Point) => {
            const nx = head.x + d.x, ny = head.y + d.y;
            if (nx < 1 || nx >= GRID_SIZE - 1 || ny < 1 || ny >= GRID_SIZE - 1) return false;
            if (snake.segments.some(seg => seg.x === nx && seg.y === ny)) return false;
            return true;
        };

        let nextDir = snake.dir;
        if (!isSafe(snake.dir) || Math.random() < 0.1) {
            const safeDirs = possibleDirs.filter(isSafe);
            if (safeDirs.length > 0) {
                nextDir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
            } else if (possibleDirs.length > 0) {
                nextDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
            }
        }
        snake.dir = nextDir;
        
        const newHead = { x: head.x + snake.dir.x, y: head.y + snake.dir.y };
        
        // Simple wrap out of bounds or respawn
        if (newHead.x >= 0 && newHead.x < GRID_SIZE && newHead.y >= 0 && newHead.y < GRID_SIZE) {
            snake.segments.unshift(newHead);
            snake.segments.pop();
        } else {
            snake.segments = [
              {x: snake.respawn.x, y: snake.respawn.y},
              {x: snake.respawn.x, y: snake.respawn.y + 1},
              {x: snake.respawn.x, y: snake.respawn.y + 2},
              {x: snake.respawn.x, y: snake.respawn.y + 3},
              {x: snake.respawn.x, y: snake.respawn.y + 4}
            ];
        }
        snake.lastMoveTime = time;
      }
    });
  }, []);

  const update = useCallback((time: number) => {
    const s = state.current;
    
    const currentSpeed = Math.max(50, s.baseSpeed - Math.floor(score / 5) * 10);

    if (s.multiplierActiveUntil > 0 && time > s.multiplierActiveUntil) {
      s.multiplierActiveUntil = 0;
      setMultiplierActive(false);
    }

    if (time - s.lastMoveTime > currentSpeed) {
      s.dir = s.nextDir;
      const head = s.snake[0];
      const newHead = {
        x: head.x + s.dir.x,
        y: head.y + s.dir.y,
      };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver();
        return;
      }

      // Self collision
      if (s.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return;
      }

      s.snake.unshift(newHead);

      let ateFood = false;

      // Golden Apple collision
      if (s.goldenApple && newHead.x === s.goldenApple.x && newHead.y === s.goldenApple.y) {
        playSound('eat_gold', isMutedRef.current);
        s.multiplierActiveUntil = time + 6000;
        setMultiplierActive(true);
        s.goldenApple = null;
        triggerParticles(newHead.x, newHead.y, COLOR_GOLDEN_APPLE);
        s.shakeUntil = time + 200;
        ateFood = true;
      }
      // Violet Food collision
      else if (score >= 2 && s.violetFood && newHead.x === s.violetFood.x && newHead.y === s.violetFood.y) {
        playSound('gameover', isMutedRef.current);
        setScore((prev) => Math.max(0, prev - 2));
        triggerParticles(newHead.x, newHead.y, COLOR_VIOLET_FOOD);
        s.violetFood = generateFood([...s.snake, s.food, ...(s.goldenApple ? [s.goldenApple] : [])]);
        s.lastVioletFoodSpawnTime = time;
        s.shakeUntil = time + 300;
        
        // Penalty pops (up to 2 segments), ensuring final size won't drop below 3.
        // Note: s.snake current length includes the pre-popped newHead, 
        // and one more pop will happen below because ateFood is false.
        if (s.snake.length > 4) s.snake.pop();
        if (s.snake.length > 4) s.snake.pop();
      }
      // Regular Food collision
      else if (newHead.x === s.food.x && newHead.y === s.food.y) {
        playSound('eat', isMutedRef.current);
        const pointsToAdd = time < s.multiplierActiveUntil ? 2 : 1;
        setScore((prev) => {
          const newScore = prev + pointsToAdd;
          // Spawn Golden Apple if we cross a multiple of 5
          if (newScore > 0 && Math.floor(newScore / 5) > Math.floor(prev / 5) && !s.goldenApple) {
             s.goldenApple = generateFood([...s.snake, s.food, ...(s.violetFood ? [s.violetFood] : [])]);
             s.lastGoldenAppleScore = newScore;
          }
          return newScore;
        });
        
        s.food = generateFood([...s.snake, ...(s.goldenApple ? [s.goldenApple] : []), ...(s.violetFood ? [s.violetFood] : [])]);
        s.foodColor = REGULAR_FOOD_COLORS[Math.floor(Math.random() * REGULAR_FOOD_COLORS.length)];
        s.lastFoodSpawnTime = time;
        triggerParticles(newHead.x, newHead.y, s.foodColor);
        s.shakeUntil = time + 200; 
        ateFood = true;
      }

      if (!ateFood) {
        s.snake.pop();
      }

      s.lastMoveTime = time;
    }

    // Food relocation every 5 seconds (only regular food)
    if (time - s.lastFoodSpawnTime > 5000) {
      s.food = generateFood([...s.snake, ...(s.goldenApple ? [s.goldenApple] : []), ...(s.violetFood ? [s.violetFood] : [])]);
      s.foodColor = REGULAR_FOOD_COLORS[Math.floor(Math.random() * REGULAR_FOOD_COLORS.length)];
      s.lastFoodSpawnTime = time;
    }

    // Violet Food relocation every 7 seconds (only when score >= 2)
    if (score >= 2 && time - s.lastVioletFoodSpawnTime > 7000) {
      s.violetFood = Math.random() > 0.3 ? generateFood([...s.snake, s.food, ...(s.goldenApple ? [s.goldenApple] : [])]) : null;
      s.lastVioletFoodSpawnTime = time;
    }

    // Update particles
    s.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
    });
    s.particles = s.particles.filter((p) => p.life < p.maxLife);
  }, [score, handleGameOver]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const s = state.current;
    
    ctx.save();
    
    // Clear and background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Screen shake
    if (time < s.shakeUntil) {
      const timeRemaining = s.shakeUntil - time;
      // Increase intensity based on remaining time (up to 15px max for Game Over shake of 800ms)
      const intensity = Math.min(15, (timeRemaining / 100) * 2 + 5);
      const dx = (Math.random() - 0.5) * intensity;
      const dy = (Math.random() - 0.5) * intensity;
      ctx.translate(dx, dy);
    }

    // Draw Grid
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw Wall Boundary
    ctx.strokeStyle = '#06b6d4'; 
    ctx.lineWidth = 6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    ctx.strokeRect(3, 3, CANVAS_SIZE - 6, CANVAS_SIZE - 6);
    ctx.shadowBlur = 0;

    // Draw Demo Snakes (if not playing)
    if (gameState === 'START' || gameState === 'INSTRUCTIONS') {
      s.demoSnakes.forEach(snake => {
        snake.segments.forEach((segment) => {
          ctx.fillStyle = snake.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = snake.color;
          const padding = 2;
          ctx.fillRect(
            segment.x * TILE_SIZE + padding,
            segment.y * TILE_SIZE + padding,
            TILE_SIZE - padding * 2,
            TILE_SIZE - padding * 2
          );
        });
      });
      ctx.shadowBlur = 0;
    }

    // Draw Food
    if (gameState === 'PLAYING') {
      const pulse = Math.sin(time / 150) * 2;
      ctx.fillStyle = s.foodColor;
      ctx.shadowBlur = 20 + pulse * 2;
      ctx.shadowColor = s.foodColor;
      ctx.beginPath();
      ctx.arc(
        s.food.x * TILE_SIZE + TILE_SIZE / 2,
        s.food.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 3 + pulse,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Violet Food
      if (score >= 2 && s.violetFood) {
        const violetPulse = Math.sin(time / 130) * 2;
        ctx.fillStyle = COLOR_VIOLET_FOOD;
        ctx.shadowBlur = 15 + violetPulse * 2;
        ctx.shadowColor = COLOR_VIOLET_FOOD;
        ctx.beginPath();
        ctx.arc(
          s.violetFood.x * TILE_SIZE + TILE_SIZE / 2,
          s.violetFood.y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE / 3 + violetPulse,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Golden Apple
      if (s.goldenApple) {
        const goldPulse = Math.sin(time / 100) * 3;
        ctx.fillStyle = COLOR_GOLDEN_APPLE;
        ctx.shadowBlur = 25 + goldPulse * 2;
        ctx.shadowColor = COLOR_GOLDEN_APPLE;
        ctx.beginPath();
        ctx.arc(
          s.goldenApple.x * TILE_SIZE + TILE_SIZE / 2,
          s.goldenApple.y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE / 2.5 + goldPulse,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw Particles
    s.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Snake
    if (gameState === 'PLAYING' || gameState === 'GAME_OVER') {
      const isMultiplier = gameState === 'PLAYING' && time < s.multiplierActiveUntil;
      s.snake.forEach((segment, index) => {
        const isHead = index === 0;
        let color = isHead ? SNAKE_COLORS[snakeColor].head : SNAKE_COLORS[snakeColor].body;
        
        // Flash gold when multiplier is active
        if (isMultiplier && isHead) {
          color = COLOR_GOLDEN_APPLE;
        }

        ctx.fillStyle = color;
        ctx.shadowBlur = isHead ? 15 : 10;
        ctx.shadowColor = isMultiplier ? COLOR_GOLDEN_APPLE : SNAKE_COLORS[snakeColor].body;
        
        const padding = 2;
        ctx.fillRect(
          segment.x * TILE_SIZE + padding,
          segment.y * TILE_SIZE + padding,
          TILE_SIZE - padding * 2,
          TILE_SIZE - padding * 2
        );
      });
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }, [gameState, snakeColor, score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (gameState === 'START' || gameState === 'INSTRUCTIONS' || gameState === 'GAME_OVER') {
         if (e.key === ' ' || e.key === 'Enter') {
             startGame();
         }
         return;
      }

      if (gameState !== 'PLAYING') return;

      const s = state.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (s.dir.y === 0) { s.nextDir = { x: 0, y: -1 }; playSound('move', isMutedRef.current); }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (s.dir.y === 0) { s.nextDir = { x: 0, y: 1 }; playSound('move', isMutedRef.current); }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (s.dir.x === 0) { s.nextDir = { x: -1, y: 0 }; playSound('move', isMutedRef.current); }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (s.dir.x === 0) { s.nextDir = { x: 1, y: 0 }; playSound('move', isMutedRef.current); }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame]);

  const triggerSwipeFlash = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setSwipeFlash(dir);
    setTimeout(() => setSwipeFlash(null), 150);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, [gameState]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gameState !== 'PLAYING' || !touchStartRef.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    const s = state.current;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        if (dx > 0 && s.dir.x === 0) {
          s.nextDir = { x: 1, y: 0 };
          playSound('move', isMutedRef.current);
          triggerSwipeFlash('right');
        } else if (dx < 0 && s.dir.x === 0) {
          s.nextDir = { x: -1, y: 0 };
          playSound('move', isMutedRef.current);
          triggerSwipeFlash('left');
        }
      }
    } else {
      if (Math.abs(dy) > 30) {
        if (dy > 0 && s.dir.y === 0) {
          s.nextDir = { x: 0, y: 1 };
          playSound('move', isMutedRef.current);
          triggerSwipeFlash('down');
        } else if (dy < 0 && s.dir.y === 0) {
          s.nextDir = { x: 0, y: -1 };
          playSound('move', isMutedRef.current);
          triggerSwipeFlash('up');
        }
      }
    }
    touchStartRef.current = null;
  }, [gameState, triggerSwipeFlash]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const renderLoop = (time: number) => {
      if (gameState === 'PLAYING') {
        update(time);
      } else if (gameState === 'START' || gameState === 'INSTRUCTIONS') {
        updateDemoSnake(time);
      }
      draw(ctx, time);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, update, updateDemoSnake, draw]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-full px-2 sm:px-4">
      
      {/* Game Stage */}
      <div 
        className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#0a0a0a] border-2 border-zinc-800 ring-4 ring-black shadow-[0_0_50px_rgba(0,0,0,0.5)] touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Swipe Visual Feedback */}
        {swipeFlash && (
          <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-150">
            {swipeFlash === 'up' && <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-green-500/20 to-transparent" />}
            {swipeFlash === 'down' && <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-green-500/20 to-transparent" />}
            {swipeFlash === 'left' && <div className="absolute left-0 inset-y-0 w-16 bg-gradient-to-r from-green-500/20 to-transparent" />}
            {swipeFlash === 'right' && <div className="absolute right-0 inset-y-0 w-16 bg-gradient-to-l from-green-500/20 to-transparent" />}
          </div>
        )}
        
        {/* Neon Lights at Top */}
        <div className="absolute top-0 inset-x-0 h-2 flex justify-center pointer-events-none z-20">
          <div className="w-full h-[2px] bg-cyan-400/50 shadow-[0_0_15px_4px_rgba(6,182,212,0.8)]" />
          <div className="absolute top-0 w-2/3 h-[1px] bg-pink-500/50 shadow-[0_0_20px_6px_rgba(236,72,153,0.8)]" />
        </div>

        {/* Mute Toggle */}
        {gameState === 'START' && (
          <button
            onClick={() => {
              setIsMuted(m => {
                const newMuted = !m;
                playSound('click', newMuted);
                return newMuted;
              });
            }}
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 flex items-center justify-center rounded-full border border-zinc-800 text-zinc-400 hover:text-white transition-all backdrop-blur-md"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}

        {/* Score Overlay (Playing) */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-4 left-6 right-6 flex items-start justify-between pointer-events-none z-10 transition-all duration-300">
             <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider drop-shadow-md">Score</span>
                  {multiplierActive && <span className="text-[10px] sm:text-xs font-bold text-yellow-500 animate-pulse drop-shadow-md">2X!</span>}
                </div>
                <span className={`${multiplierActive ? 'text-yellow-400 shadow-yellow-500' : 'text-green-400 shadow-green-500'} text-xl sm:text-3xl font-bold font-mono tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>{score}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">High Score</span>
                <span className="text-pink-400 text-xl sm:text-3xl font-bold font-mono tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{highScore}</span>
              </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full block"
        />

        {/* Start Overlay */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-in fade-in duration-300 z-30">
            <div className="bg-black/60 py-5 px-6 sm:py-6 sm:px-10 rounded-2xl sm:rounded-3xl border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-sm flex flex-col items-center w-[85%] sm:w-full max-w-[280px] sm:max-w-[320px]">
              <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-green-600 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)] mb-4 leading-none">NEON<br/>SNAKE</h1>
              
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={startGame}
                  className="w-full py-2.5 sm:py-3 bg-green-500 hover:bg-green-400 text-black font-bold text-base sm:text-lg rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(74,222,128,0.4)]"
                >
                  PLAY NOW
                </button>
                <button 
                  onClick={() => { playSound('click', isMutedRef.current); setGameState('INSTRUCTIONS'); }}
                  className="w-full py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-base sm:text-lg rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-zinc-700"
                >
                  INSTRUCTIONS
                </button>
              </div>

              <div className="mt-5 sm:mt-8 flex flex-col items-center gap-2">
                <span className="text-zinc-400 text-[10px] tracking-widest uppercase font-bold">Snake Color</span>
                <div className="flex gap-4">
                  {(Object.keys(SNAKE_COLORS) as Array<keyof typeof SNAKE_COLORS>).map((color) => (
                    <button
                      key={color}
                      onClick={() => setSnakeColor(color)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-all hover:scale-110 active:scale-95 ${
                        snakeColor === color 
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-black/80' 
                          : 'opacity-50 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: SNAKE_COLORS[color].body,
                        boxShadow: snakeColor === color ? `0 0 15px ${SNAKE_COLORS[color].body}` : 'none',
                      }}
                      title={SNAKE_COLORS[color].name}
                    />
                  ))}
                </div>
              </div>
              
              <p className="mt-4 sm:mt-8 text-[10px] sm:text-xs tracking-widest uppercase text-zinc-500 font-bold">Press Space to start</p>
            </div>
          </div>
        )}

        {/* Instructions Overlay */}
        {gameState === 'INSTRUCTIONS' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-4 text-center animate-in fade-in zoom-in-95 duration-200 z-30">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">HOW TO PLAY</h2>
            <div className="text-zinc-300 space-y-2 sm:space-y-3 w-full max-w-[320px] mb-4 sm:mb-6 text-left text-xs sm:text-sm bg-black/60 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-zinc-800 overflow-y-auto backdrop-blur-md">
              <p className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">❖</span>
                <span>Use <strong>Arrow Keys</strong> or <strong>WASD</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">❖</span>
                <span>Eat <span className="text-pink-500 font-bold">colourful pixels</span> to score.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">❖</span>
                <span><span className="text-yellow-500 font-bold">Golden Apple</span> (every 5 pts) = 2x Multiplier.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">❖</span>
                <span>Avoid <span className="text-violet-500 font-bold">Violet Food</span>! Costs 2 points.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">❖</span>
                <span>Don't hit walls or yourself!</span>
              </p>
            </div>
            <button 
              onClick={() => { playSound('click', isMutedRef.current); setGameState('START'); }}
              className="px-8 sm:px-10 py-2.5 sm:py-3 bg-blue-300 hover:bg-blue-200 text-black font-bold text-base sm:text-lg rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(147,197,253,0.4)]"
            >
              BACK
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-300 z-30">
            <h2 className="text-3xl sm:text-4xl font-bold text-pink-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.6)] mb-2">GAME OVER</h2>
            <div className="mb-6 sm:mb-8">
              <p className="text-zinc-300 text-sm sm:text-lg uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-4xl sm:text-5xl font-mono font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{score}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-none justify-center">
              <button 
                onClick={() => { playSound('click', isMutedRef.current); setGameState('START'); }}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-base sm:text-lg rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-zinc-700"
              >
                HOME
              </button>
              <button 
                onClick={startGame}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-white hover:bg-zinc-200 text-black font-bold text-base sm:text-lg rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                REBOOT
              </button>
            </div>
            <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs tracking-widest uppercase text-zinc-500 font-bold">Press Space to try again</p>
          </div>
        )}
      </div>
    </div>
  );
}
