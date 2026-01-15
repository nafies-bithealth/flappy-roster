import React, { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  GRAVITY,
  JUMP_STRENGTH,
  PIPE_SPEED,
  PIPE_WIDTH,
  PIPE_GAP,
  PIPE_SPAWN_RATE,
  BIRD_WIDTH,
  BIRD_HEIGHT,
  GROUND_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT
} from '../game/constants';
import { Bird, Pipe } from '../game/types';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const pipeSpawnTimerRef = useRef<number>(0);

  // Game State Refs (for physics loop)
  const birdRef = useRef<Bird>({
    position: { x: 50, y: GAME_HEIGHT / 2 },
    velocity: 0,
    rotation: 0
  });
  const pipesRef = useRef<Pipe[]>([]);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const groundImageRef = useRef<HTMLImageElement | null>(null);
  const bgXRef = useRef<number>(0);
  const groundXRef = useRef<number>(0);

  const { status, setStatus, incrementScore, resetGame, score, bestScore } = useGameStore();

  const spawnPipe = () => {
    const minHeight = 50;
    const maxHeight = GAME_HEIGHT - GROUND_HEIGHT - PIPE_GAP - minHeight;
    const height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipesRef.current.push({
      id: Date.now().toString(),
      x: GAME_WIDTH,
      topHeight: height,
      passed: false
    });
  };

  const jump = useCallback(() => {
    if (status === 'playing') {
      birdRef.current.velocity = JUMP_STRENGTH;
    } else if (status === 'ready') {
      setStatus('playing');
      birdRef.current.velocity = JUMP_STRENGTH;
    } else if (status === 'gameover') {
      // Handled by UI overlay usually, but clicking canvas can also restart if we want
    }
  }, [status, setStatus]);

  const gameOver = () => {
    setStatus('gameover');
  };

  const update = (deltaTime: number) => {
    if (status !== 'playing') return;

    // Update Bird
    birdRef.current.velocity += GRAVITY;
    birdRef.current.position.y += birdRef.current.velocity;
    birdRef.current.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdRef.current.velocity * 0.1)));

    // Ground collision
    if (birdRef.current.position.y + BIRD_HEIGHT >= GAME_HEIGHT - GROUND_HEIGHT) {
      birdRef.current.position.y = GAME_HEIGHT - GROUND_HEIGHT - BIRD_HEIGHT;
      gameOver();
    }
    // Ceiling collision
    if (birdRef.current.position.y < 0) {
      birdRef.current.position.y = 0;
      birdRef.current.velocity = 0;
    }

    // Update Pipes
    pipeSpawnTimerRef.current += deltaTime;
    if (pipeSpawnTimerRef.current > PIPE_SPAWN_RATE) {
      spawnPipe();
      pipeSpawnTimerRef.current = 0;
    }

    pipesRef.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
    });

    // Remove off-screen pipes
    pipesRef.current = pipesRef.current.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // Collision Detection
    const bird = birdRef.current;
    pipesRef.current.forEach(pipe => {
      // Check collision
      if (
        bird.position.x + BIRD_WIDTH > pipe.x &&
        bird.position.x < pipe.x + PIPE_WIDTH &&
        (bird.position.y < pipe.topHeight || bird.position.y + BIRD_HEIGHT > pipe.topHeight + PIPE_GAP)
      ) {
        gameOver();
      }

      // Update Score
      if (!pipe.passed && bird.position.x > pipe.x + PIPE_WIDTH) {
        pipe.passed = true;
        incrementScore();
      }
    });

    // Update Ground
    groundXRef.current -= PIPE_SPEED;
    if (groundXRef.current <= -GAME_WIDTH) {
      groundXRef.current = 0;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear Canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw Background
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
      ctx.fillStyle = '#70c5ce'; // Sky blue fallback
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Draw Pipes
    pipesRef.current.forEach(pipe => {
      // Pipe Gradient
      const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      gradient.addColorStop(0, '#558022');
      gradient.addColorStop(0.1, '#7bbf32');
      gradient.addColorStop(0.4, '#7bbf32');
      gradient.addColorStop(1, '#558022');
      
      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#2a4011';
      ctx.lineWidth = 2;

      // Top Pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x, -2, PIPE_WIDTH, pipe.topHeight + 2); // Body
      
      // Top Pipe Cap
      ctx.fillRect(pipe.x - 2, pipe.topHeight - 24, PIPE_WIDTH + 4, 24);
      ctx.strokeRect(pipe.x - 2, pipe.topHeight - 24, PIPE_WIDTH + 4, 24);

      // Bottom Pipe
      const bottomPipeY = pipe.topHeight + PIPE_GAP;
      const bottomPipeHeight = GAME_HEIGHT - GROUND_HEIGHT - bottomPipeY;
      ctx.fillRect(pipe.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);
      ctx.strokeRect(pipe.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight); // Body

      // Bottom Pipe Cap
      ctx.fillRect(pipe.x - 2, bottomPipeY, PIPE_WIDTH + 4, 24);
      ctx.strokeRect(pipe.x - 2, bottomPipeY, PIPE_WIDTH + 4, 24);
    });

    // Draw Ground
    if (groundImageRef.current) {
      // Scale ground to match height
      // Just tile it horizontally
      const groundH = GROUND_HEIGHT;
      // We want to maintain aspect ratio of ground texture or just stretch it?
      // Let's stretch height to fit, tile width.
      const ratio = groundImageRef.current.width / groundImageRef.current.height;
      const tileWidth = groundH * ratio;
      
      let x = groundXRef.current % tileWidth;
      // Ensure we cover the whole width, x starts negative
      if (x > 0) x -= tileWidth;

      while (x < GAME_WIDTH) {
        ctx.drawImage(groundImageRef.current, x, GAME_HEIGHT - GROUND_HEIGHT, tileWidth, groundH);
        x += tileWidth;
      }
      
      // Top border of ground
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, 4);
    } else {
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, 12);
    }

    // Draw Bird
    ctx.save();
    ctx.translate(birdRef.current.position.x + BIRD_WIDTH / 2, birdRef.current.position.y + BIRD_HEIGHT / 2);
    ctx.rotate(birdRef.current.rotation);
    
    // Bird Body
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_WIDTH / 2, BIRD_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(6, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(-6, 2, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Beak
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(16, 6);
    ctx.lineTo(8, 10);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  const loop = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    update(deltaTime);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Handle scaling for high DPI or responsive sizing if needed
        // For now assume fixed logical size, scaled via CSS
        ctx.resetTransform();
        const scaleX = canvas.width / GAME_WIDTH;
        const scaleY = canvas.height / GAME_HEIGHT;
        ctx.scale(scaleX, scaleY);
        
        draw(ctx);
      }
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [status]); // Re-bind loop if status changes? Actually loop should always run to draw "Ready" state

  // Reset local state when store resets
  useEffect(() => {
    if (status === 'ready') {
      birdRef.current = {
        position: { x: 50, y: GAME_HEIGHT / 2 },
        velocity: 0,
        rotation: 0
      };
      pipesRef.current = [];
      pipeSpawnTimerRef.current = 0;
      groundXRef.current = 0;
    }
  }, [status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        jump();
      }
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      jump();
    };
    const handleClick = (e: MouseEvent) => {
       // Prevent double firing if touch event is also present (simple check)
       jump();
    }

    window.addEventListener('keydown', handleKeyDown);
    // canvasRef.current?.addEventListener('touchstart', handleTouch, { passive: false });
    // canvasRef.current?.addEventListener('mousedown', handleClick);
    
    // Better: Add listeners to window or document for global input
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('mousedown', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [jump]);

  return (
    <div className="relative w-full h-full max-w-[480px] max-h-[640px] mx-auto overflow-hidden">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="w-full h-full block"
      />
      
      {/* UI Overlays */}
      {status === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 text-white px-6 py-4 rounded-xl">
            <h2 className="text-2xl font-bold">Tap to Start</h2>
          </div>
        </div>
      )}

      {status === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center border-4 border-orange-400">
            <h2 className="text-3xl font-bold text-orange-500 mb-4">Game Over</h2>
            <div className="flex gap-8 mb-6">
              <div className="text-center">
                <p className="text-gray-500 text-sm uppercase font-bold">Score</p>
                <p className="text-4xl font-bold text-gray-800">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-sm uppercase font-bold">Best</p>
                <p className="text-4xl font-bold text-gray-800">{bestScore}</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                resetGame();
              }}
              className="bg-sky-400 hover:bg-sky-500 text-white font-bold py-3 px-8 rounded-full shadow-md transition-transform active:scale-95"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-10 left-0 right-0 text-center pointer-events-none">
        <span className="text-6xl font-bold text-white drop-shadow-md stroke-black">{score}</span>
      </div>
    </div>
  );
};

export default GameCanvas;
