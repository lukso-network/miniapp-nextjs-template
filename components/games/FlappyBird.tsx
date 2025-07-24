"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generatePipeSequence } from '@/lib/games/seedUtils';

interface FlappyBirdProps {
  seed: string;
  onGameOver: (score: number) => void;
}

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  height: number; // Height percentage (0-100)
  passed: boolean;
}

const GRAVITY = 0.4;
const JUMP_FORCE = -6;
const PIPE_WIDTH = 50;
const PIPE_GAP = 100;
const PIPE_SPEED = 2.5;
const BIRD_SIZE = 20;
const BIRD_X = 80;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export function FlappyBird({ seed, onGameOver }: FlappyBirdProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game state refs for animation loop
  const birdRef = useRef<Bird>({ y: 200, velocity: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const pipeSequenceRef = useRef<number[]>([]);
  const pipeIndexRef = useRef(0);
  const animationIdRef = useRef<number | undefined>(undefined);

  // Initialize pipe sequence from seed
  useEffect(() => {
    if (seed) {
      pipeSequenceRef.current = generatePipeSequence(seed, 1000);
    }
  }, [seed]);

  // Load high score
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const key = `flappy-highscore-daily-${today}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setHighScore(parseInt(stored, 10));
    }
  }, []);

  const resetGame = useCallback(() => {
    birdRef.current = { y: 200, velocity: 0 };
    pipesRef.current = [];
    pipeIndexRef.current = 0;
    setScore(0);
    setGameState('ready');
  }, []);

  const jump = useCallback(() => {
    if (gameState === 'ready') {
      setGameState('playing');
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameState === 'playing') {
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameState === 'gameOver') {
      resetGame();
    }
  }, [gameState, resetGame]);

  const checkCollision = useCallback(() => {
    const bird = birdRef.current;
    
    // Check boundaries
    if (bird.y + BIRD_SIZE / 2 > CANVAS_HEIGHT || bird.y - BIRD_SIZE / 2 < 0) {
      return true;
    }

    // Check pipe collisions
    for (const pipe of pipesRef.current) {
      if (
        BIRD_X + BIRD_SIZE / 2 > pipe.x &&
        BIRD_X - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH
      ) {
        const topPipeHeight = CANVAS_HEIGHT * (pipe.height / 100);
        const bottomPipeTop = topPipeHeight + PIPE_GAP;
        
        if (
          bird.y - BIRD_SIZE / 2 < topPipeHeight ||
          bird.y + BIRD_SIZE / 2 > bottomPipeTop
        ) {
          return true;
        }
      }
    }
    
    return false;
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#70c5ce'; // Sky blue
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState === 'playing') {
      // Update bird
      birdRef.current.velocity += GRAVITY;
      birdRef.current.y += birdRef.current.velocity;

      // Update pipes
      pipesRef.current = pipesRef.current.filter(pipe => pipe.x + PIPE_WIDTH > -PIPE_WIDTH);
      pipesRef.current.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
        
        // Score when passing pipe
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          setScore(prev => prev + 1);
        }
      });

      // Add new pipes
      if (pipesRef.current.length === 0 || pipesRef.current[pipesRef.current.length - 1].x < 400) {
        pipesRef.current.push({
          x: CANVAS_WIDTH,
          height: pipeSequenceRef.current[pipeIndexRef.current % pipeSequenceRef.current.length],
          passed: false
        });
        pipeIndexRef.current++;
      }

      // Check collisions
      if (checkCollision()) {
        setGameState('gameOver');
        const currentScore = score;
        
        // Update high score
        if (currentScore > highScore) {
          setHighScore(currentScore);
          const today = new Date().toISOString().split('T')[0];
          const key = `flappy-highscore-daily-${today}`;
          localStorage.setItem(key, currentScore.toString());
        }
        
        // Report game over
        onGameOver(currentScore);
      }
    }

    // Draw pipes
    ctx.fillStyle = '#228B22'; // Forest green
    pipesRef.current.forEach(pipe => {
      const topPipeHeight = CANVAS_HEIGHT * (pipe.height / 100);
      const bottomPipeTop = CANVAS_HEIGHT * (pipe.height / 100) + PIPE_GAP;
      
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topPipeHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, bottomPipeTop, PIPE_WIDTH, CANVAS_HEIGHT - bottomPipeTop);

      // Draw ground line
      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pipe.x, CANVAS_HEIGHT);
      ctx.lineTo(pipe.x + PIPE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    });

    // Draw bird
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.beginPath();
    ctx.arc(BIRD_X, birdRef.current.y, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Score: ${score}`, 10, 25);

    // Draw game state messages
    if (gameState === 'ready') {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '16px Arial';
      ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      ctx.textAlign = 'start';
    } else if (gameState === 'gameOver') {
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('Game Over!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.fillText('Game Over!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.font = 'bold 18px Arial';
      ctx.strokeText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      ctx.strokeText('Click to Play Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
      ctx.fillText('Click to Play Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
      ctx.textAlign = 'start';
    }

    animationIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore, checkCollision, onGameOver]);

  // Start game loop
  useEffect(() => {
    animationIdRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameLoop]);

  // Handle keyboard and mouse input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={jump}
        className="max-w-full max-h-full border border-gray-300 rounded-lg cursor-pointer"
        style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}