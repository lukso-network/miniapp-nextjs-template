"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generatePipeSequence } from '@/lib/games/seedUtils';

interface FlappyBirdProps {
  gameId: string;
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

const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const BIRD_SIZE = 30;
const BIRD_X = 100;

export function FlappyBird({ gameId, seed, onGameOver }: FlappyBirdProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game state refs for animation loop
  const birdRef = useRef<Bird>({ y: 250, velocity: 0 });
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

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`flappy-highscore-${gameId}`);
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, [gameId]);

  const resetGame = useCallback(() => {
    birdRef.current = { y: 250, velocity: 0 };
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

  const checkCollision = useCallback((bird: Bird, pipe: Pipe): boolean => {
    const birdLeft = BIRD_X - BIRD_SIZE / 2;
    const birdRight = BIRD_X + BIRD_SIZE / 2;
    const birdTop = bird.y - BIRD_SIZE / 2;
    const birdBottom = bird.y + BIRD_SIZE / 2;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;
    const pipeTopHeight = (pipe.height / 100) * 500;
    const pipeBottomStart = pipeTopHeight + PIPE_GAP;

    // Check if bird is within pipe x-range
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      // Check collision with top pipe or bottom pipe
      if (birdTop < pipeTopHeight || birdBottom > pipeBottomStart) {
        return true;
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
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, 800, 500);

    if (gameState === 'playing') {
      // Update bird physics
      birdRef.current.velocity += GRAVITY;
      birdRef.current.y += birdRef.current.velocity;

      // Check boundaries
      if (birdRef.current.y < 0 || birdRef.current.y > 500) {
        setGameState('gameOver');
        onGameOver(score);
        return;
      }

      // Update pipes
      pipesRef.current = pipesRef.current.filter(pipe => pipe.x > -PIPE_WIDTH);
      
      // Add new pipes
      if (pipesRef.current.length === 0 || pipesRef.current[pipesRef.current.length - 1].x < 500) {
        pipesRef.current.push({
          x: 800,
          height: pipeSequenceRef.current[pipeIndexRef.current % pipeSequenceRef.current.length],
          passed: false
        });
        pipeIndexRef.current++;
      }

      // Move pipes and check collisions
      pipesRef.current.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        // Check if bird passed the pipe
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          setScore(s => s + 1);
        }

        // Check collision
        if (checkCollision(birdRef.current, pipe)) {
          setGameState('gameOver');
          const finalScore = score;
          if (finalScore > highScore) {
            setHighScore(finalScore);
            localStorage.setItem(`flappy-highscore-${gameId}`, finalScore.toString());
          }
          onGameOver(finalScore);
        }
      });
    }

    // Draw pipes
    ctx.fillStyle = '#228B22'; // Green
    pipesRef.current.forEach(pipe => {
      const topHeight = (pipe.height / 100) * 500;
      const bottomStart = topHeight + PIPE_GAP;
      
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, bottomStart, PIPE_WIDTH, 500 - bottomStart);
    });

    // Draw bird
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.beginPath();
    ctx.arc(BIRD_X, birdRef.current.y, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);

    // Draw game state messages
    if (gameState === 'ready') {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click to Start', 400, 250);
      ctx.font = '20px Arial';
      ctx.fillText(`High Score: ${highScore}`, 400, 290);
      ctx.textAlign = 'start';
    } else if (gameState === 'gameOver') {
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('Game Over!', 400, 200);
      ctx.fillText('Game Over!', 400, 200);
      ctx.font = 'bold 24px Arial';
      ctx.strokeText(`Final Score: ${score}`, 400, 250);
      ctx.fillText(`Final Score: ${score}`, 400, 250);
      ctx.strokeText(`High Score: ${highScore}`, 400, 290);
      ctx.fillText(`High Score: ${highScore}`, 400, 290);
      ctx.strokeText('Click to Play Again', 400, 340);
      ctx.fillText('Click to Play Again', 400, 340);
      ctx.textAlign = 'start';
    }

    animationIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore, checkCollision, onGameOver, gameId]);

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
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={jump}
        className="border border-gray-300 rounded-lg cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}