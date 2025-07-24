"use client";

import { useState, useEffect } from 'react';
import { FlappyBird } from './games/FlappyBird';
import { useGameRegistry } from '@/hooks/useGameRegistry';
import { useUpProvider } from './upProvider';

export function GameContainer() {
  const { walletConnected, accounts, chainId } = useUpProvider();
  const { submitScore, getPlayerScore, isLoading, error, getGameInfo, registerGame } = useGameRegistry();
  
  const [gameId, setGameId] = useState<string>('');
  const [gameSeed, setGameSeed] = useState<string>('');
  const [playerBestScore, setPlayerBestScore] = useState<number>(0);
  const [showSubmitScore, setShowSubmitScore] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Generate daily game ID
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const id = `daily-flappy-${today}`;
    setGameId(id);
  }, []);

  // Generate game seed locally
  useEffect(() => {
    async function generateSeed() {
      if (!gameId) return;

      try {
        // Always generate seed locally, no RPC calls needed
        const encoder = new TextEncoder();
        const data = encoder.encode(gameId);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setGameSeed(hashHex);
        setLoadError(null);
      } catch (err) {
        console.error('Failed to generate seed:', err);
        setLoadError('Failed to initialize game');
      }
    }

    generateSeed();
  }, [gameId]);

  // Fetch player score separately when wallet connects
  useEffect(() => {
    async function fetchPlayerScore() {
      if (!walletConnected || !accounts[0] || chainId !== 4201 || !gameId) {
        setPlayerBestScore(0);
        return;
      }

      try {
        const { score } = await getPlayerScore(gameId, accounts[0]);
        console.log('Fetched player score:', score, 'for gameId:', gameId);
        setPlayerBestScore(score);
      } catch (err) {
        console.log('Error fetching player score:', err);
        // Ignore errors, just set to 0
        setPlayerBestScore(0);
      }
    }

    // Delay to avoid race conditions
    const timer = setTimeout(fetchPlayerScore, 500);
    return () => clearTimeout(timer);
  }, [walletConnected, accounts, chainId, gameId, getPlayerScore]);

  const handleGameOver = (score: number) => {
    setLastScore(score);
    
    // Show submit button if score beats personal best and wallet is connected
    if (walletConnected && score > playerBestScore) {
      setShowSubmitScore(true);
    }
  };

  const handleSubmitScore = async () => {
    if (!walletConnected || !lastScore) return;

    try {
      console.log('handleSubmitScore called:', {
        walletConnected,
        lastScore,
        gameId,
        accounts
      });

      // Check if game exists first
      try {
        const gameInfo = await getGameInfo(gameId);
        console.log('Game info:', gameInfo);
        
        // If game doesn't exist or is not active, we need to register it
        if (!gameInfo.active && gameInfo.creator === '0x0000000000000000000000000000000000000000') {
          console.log('Game not registered, registering now...');
          const today = new Date().toISOString().split('T')[0];
          await registerGame(
            gameId,
            `Daily Flappy ${today}`,
            'flappy',
            {
              description: 'Daily Flappy Bird challenge',
              rules: 'Pass as many pipes as possible',
              scoringSystem: '1 point per pipe passed'
            }
          );
          console.log('Game registered successfully');
        }
      } catch (checkErr) {
        // If the game doesn't exist, register it
        if ((checkErr as Error).message.includes('Game does not exist')) {
          console.log('Game does not exist, registering...');
          const today = new Date().toISOString().split('T')[0];
          await registerGame(
            gameId,
            `Daily Flappy ${today}`,
            'flappy',
            {
              description: 'Daily Flappy Bird challenge',
              rules: 'Pass as many pipes as possible',
              scoringSystem: '1 point per pipe passed'
            }
          );
        }
      }

      // Fetch current score again to ensure we have the latest
      let currentBestScore = playerBestScore;
      try {
        const { score: latestScore } = await getPlayerScore(gameId, accounts[0]);
        currentBestScore = latestScore;
        console.log('Latest score from chain:', latestScore);
      } catch (err) {
        console.log('Could not fetch latest score, using cached:', currentBestScore);
      }

      // Check if the new score is actually better
      if (lastScore <= currentBestScore) {
        throw new Error(`Score not improved. Current best: ${currentBestScore}, New score: ${lastScore}`);
      }

      await submitScore(gameId, lastScore);
      setPlayerBestScore(lastScore);
      setShowSubmitScore(false);
      alert('Score submitted successfully!');
    } catch (err) {
      console.error('Failed to submit score:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Provide more specific error messages
      if (errorMessage.includes('Score not improved')) {
        alert('Your score must be higher than your previous best score to submit.');
      } else if (errorMessage.includes('Game does not exist')) {
        alert('Failed to register game. Please try again.');
      } else {
        alert(`Failed to submit score: ${errorMessage}`);
      }
    }
  };

  if (!gameId || !gameSeed) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <p className="text-gray-500">Loading game...</p>
          {loadError && (
            <p className="text-red-500 text-sm mt-2">{loadError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Daily Flappy Challenge</h2>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        {walletConnected && playerBestScore > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Your best score today: {playerBestScore}
          </p>
        )}
      </div>

      <FlappyBird 
        gameId={gameId}
        seed={gameSeed}
        onGameOver={handleGameOver}
      />

      {showSubmitScore && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
          <h3 className="font-semibold text-green-800 mb-2">New High Score!</h3>
          <p className="text-sm text-gray-600 mb-3">
            You scored {lastScore} points! Submit your score to the global leaderboard?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSubmitScore}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Score'}
            </button>
            <button
              onClick={() => setShowSubmitScore(false)}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!walletConnected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md text-center">
          <p className="text-sm text-gray-600">
            Connect your wallet to submit scores to the leaderboard!
          </p>
        </div>
      )}

      {walletConnected && chainId !== 4201 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md text-center">
          <p className="text-sm text-gray-600">
            Please switch to LUKSO Testnet (chainId: 4201) to play. Current chain: {chainId}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}