"use client";

import { useState, useEffect } from 'react';
import { FlappyBird } from './games/FlappyBird';
import { useGameRegistry } from '@/hooks/useGameRegistry';
import { useUpProvider } from './upProvider';

export function GameContainer() {
  const { walletConnected, accounts, chainId } = useUpProvider();
  const { submitScore, getPlayerScore, isLoading, error } = useGameRegistry();
  
  const [gameId, setGameId] = useState<string>('');
  const [gameSeed, setGameSeed] = useState<string>('');
  const [playerBestScore, setPlayerBestScore] = useState<number>(0);
  const [showSubmitScore, setShowSubmitScore] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string>('');

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
    console.log('Game Over - Score:', score, 'Personal Best:', playerBestScore);
    setLastScore(score);
    
    // Show submit button if score beats personal best
    if (score > playerBestScore) {
      console.log('New personal best! Showing submit popup');
      setShowSubmitScore(true);
    }
  };

  const handleSubmitScore = async () => {
    if (!walletConnected || !lastScore) return;
    
    // Check if we're on the correct network
    if (chainId !== 4201) {
      setSubmitStatus('Please switch to LUKSO Testnet (chainId: 4201)');
      setTimeout(() => setSubmitStatus(''), 5000);
      return;
    }

    setSubmitStatus('Processing...');
    try {
      console.log('handleSubmitScore called:', {
        walletConnected,
        lastScore,
        gameId,
        accounts,
        chainId,
        contractAddress: '0x83E0c99bF5BE14f8b9c4917c687ad5BC4Db625f3'
      });

      // Since we know the game exists from our earlier check, skip the existence check
      // and go straight to score submission
      setSubmitStatus('Preparing to submit score...');

      // Fetch current score again to ensure we have the latest
      setSubmitStatus('Verifying current score...');
      let currentBestScore = playerBestScore;
      try {
        const { score: latestScore } = await getPlayerScore(gameId, accounts[0]);
        currentBestScore = latestScore;
        console.log('Latest score from chain:', latestScore);
        setPlayerBestScore(latestScore); // Update the displayed best score
      } catch {
        console.log('Could not fetch latest score, using cached:', currentBestScore);
      }

      // Check if the new score is actually better
      if (lastScore <= currentBestScore) {
        throw new Error(`Score not improved. Current best: ${currentBestScore}, New score: ${lastScore}`);
      }

      setSubmitStatus('Submitting score...');
      await submitScore(gameId, lastScore);
      setPlayerBestScore(lastScore);
      setShowSubmitScore(false);
      setSubmitStatus('success');
      
      // Clear status after 5 seconds
      setTimeout(() => setSubmitStatus(''), 5000);
    } catch (err) {
      console.error('Failed to submit score:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Provide more specific error messages
      if (errorMessage.includes('Score not improved')) {
        setSubmitStatus('Your score must be higher than your previous best score to submit.');
      } else if (errorMessage.includes('Game does not exist')) {
        setSubmitStatus('Failed to register game. Please try again.');
      } else if (errorMessage.includes('User rejected')) {
        setSubmitStatus('Transaction cancelled.');
      } else {
        setSubmitStatus(`Failed: ${errorMessage}`);
      }
      
      // Clear error status after 5 seconds
      setTimeout(() => setSubmitStatus(''), 5000);
    }
  };

  if (!gameId || !gameSeed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Loading game...</p>
          {loadError && (
            <p className="text-red-500 text-xs mt-2">{loadError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Wallet Connection Overlay */}
      {!walletConnected && (
        <div className="absolute inset-0 bg-white/95 z-30 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-gray-600 mb-4">
              To submit scores and compete on the leaderboard, please connect your Universal Profile through the mini-app.
            </p>
            <div className="text-xs text-gray-500">
              You can still play without connecting!
            </div>
          </div>
        </div>
      )}

      {/* Network Warning Overlay */}
      {walletConnected && chainId !== 4201 && (
        <div className="absolute inset-0 bg-white/95 z-30 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Switch to LUKSO Testnet</h2>
            <p className="text-sm text-gray-600">
              Please switch to LUKSO Testnet (Chain ID: 4201) to play and submit scores.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Current chain: {chainId}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-2 bg-white border-b">
        <h2 className="text-base font-bold text-gray-800">Daily Flappy Challenge</h2>
        <p className="text-xs text-gray-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          {walletConnected && playerBestScore > 0 && (
            <span className="ml-2">
              • Best: <span className="font-bold">{playerBestScore}</span>
            </span>
          )}
        </p>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative bg-gray-50">
        <FlappyBird 
          seed={gameSeed} 
          onGameOver={handleGameOver}
        />
        
        {/* Score Submit Popup - Centered in viewport */}
        {showSubmitScore && lastScore > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20">
            <div className="bg-green-500 border-2 border-green-600 rounded-lg p-6 shadow-2xl mx-4 max-w-sm">
              <p className="text-lg font-bold text-white mb-4 text-center">
                🎉 New Personal Best! 🎉
              </p>
              <p className="text-2xl font-bold text-white mb-4 text-center">
                Score: {lastScore}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSubmitScore}
                  disabled={isLoading || !walletConnected || chainId !== 4201}
                  className="w-full bg-white text-green-700 px-4 py-3 text-sm font-bold rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
                >
                  {!walletConnected ? 'Connect Wallet to Submit' : chainId !== 4201 ? 'Switch to LUKSO Testnet' : isLoading ? 'Submitting...' : 'Submit to Blockchain'}
                </button>
                <button
                  onClick={() => setShowSubmitScore(false)}
                  className="w-full bg-green-700 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
                >
                  Play Again
                </button>
              </div>
              {submitStatus && (
                <p className="text-xs text-white mt-2 text-center">{submitStatus}</p>
              )}
            </div>
          </div>
        )}

        {/* Success/Error Messages - Inside game area */}
        {submitStatus && !showSubmitScore && (
          <div className={`absolute bottom-2 left-2 right-2 rounded-lg p-3 shadow-lg z-50 transition-all duration-300 ${
          submitStatus === 'success' 
            ? 'bg-green-50 border-2 border-green-400' 
            : submitStatus.includes('Failed') || submitStatus.includes('error')
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          {submitStatus === 'success' ? (
            <div className="text-center">
              <div className="text-2xl mb-1">🎉</div>
              <h3 className="text-sm font-bold text-green-800">Score Submitted!</h3>
              <p className="text-xs text-green-700">
                Score of <span className="font-bold">{lastScore}</span> recorded!
              </p>
              <p className="text-xs text-green-600 mt-1">Check the leaderboard →</p>
            </div>
          ) : (
            <p className={`text-xs ${
              submitStatus.includes('Failed') || submitStatus.includes('error') 
                ? 'text-red-600' 
                : 'text-blue-600'
            }`}>{submitStatus}</p>
          )}
          </div>
        )}

        {/* Error Messages - Inside game area */}
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-50 border border-red-200 rounded-lg p-2 z-50">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}