"use client";

import { useState, useEffect } from 'react';
import { useGameRegistry, LeaderboardEntry } from '@/hooks/useGameRegistry';
import { useUpProvider } from './upProvider';

interface LeaderboardProps {
  gameId: string;
}

export function Leaderboard({ gameId }: LeaderboardProps) {
  const { getLeaderboard } = useGameRegistry();
  const { accounts, chainId } = useUpProvider();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Add immediate fetch on mount for debugging
  useEffect(() => {
    if (!gameId) return;
    
    console.log('Immediate fetch attempt for gameId:', gameId);
    
    async function immediateCheck() {
      try {
        const data = await getLeaderboard(gameId);
        console.log('Immediate fetch result:', data);
        if (data && data.length > 0) {
          setEntries(data);
        }
      } catch (err) {
        console.error('Immediate fetch error:', err);
      }
    }
    
    immediateCheck();
  }, [gameId, getLeaderboard]);

  useEffect(() => {
    console.log('Leaderboard useEffect triggered:', { gameId, hasInitialized, chainId });
    
    // Only fetch if we have a gameId and are on the correct chain
    if (!gameId || !hasInitialized) {
      console.log('Skipping fetch - missing gameId or not initialized');
      return;
    }
    
    async function fetchLeaderboard() {
      // Skip if not on testnet
      if (chainId !== 4201 && chainId !== 0) {
        console.log('Wrong chain:', chainId);
        setError('Please switch to LUKSO Testnet');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching leaderboard for gameId:', gameId);
        const leaderboardData = await getLeaderboard(gameId);
        console.log('Leaderboard data received:', leaderboardData);
        setEntries(leaderboardData || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        // Just show empty leaderboard on any error
        setEntries([]);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    }

    // Delay initial load to prevent race conditions
    const timer = setTimeout(() => {
      setHasInitialized(true);
      fetchLeaderboard();
    }, 500);

    return () => clearTimeout(timer);
  }, [gameId, getLeaderboard, chainId, hasInitialized]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isCurrentPlayer = (address: string) => {
    return accounts[0]?.toLowerCase() === address.toLowerCase();
  };

  // Don't show initial loading state, just show empty leaderboard
  // This prevents the flashing loading state on mount

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-20">🎮</div>
            <p className="text-sm text-gray-600 font-medium">
              No scores yet!
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Be the first to submit
            </p>
          </div>
        </div>
      </div>
    );
  }

  const refreshLeaderboard = async () => {
    if (chainId !== 4201) {
      setError('Please switch to LUKSO Testnet');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('Manual refresh - fetching leaderboard for:', gameId);
      const leaderboardData = await getLeaderboard(gameId);
      console.log('Manual refresh - data received:', leaderboardData);
      setEntries(leaderboardData || []);
    } catch (err) {
      console.error('Manual refresh - error:', err);
      setEntries([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end p-2">
        <button
          onClick={refreshLeaderboard}
          disabled={isLoading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <span className={`inline-block ${isLoading ? 'animate-spin' : ''}`}>
            {isLoading ? '⟳' : '↻'}
          </span>
          <span>Refresh</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.address}
              className={`flex items-center justify-between p-2 rounded-lg transition-all text-sm ${
                isCurrentPlayer(entry.address)
                  ? 'bg-blue-50 border border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    entry.rank === 1
                      ? 'bg-yellow-400 text-white'
                      : entry.rank === 2
                      ? 'bg-gray-300 text-white'
                      : entry.rank === 3
                      ? 'bg-orange-400 text-white'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  {entry.rank === 1 ? '👑' : entry.rank}
                </div>
                <div>
                  <p className={`font-medium ${isCurrentPlayer(entry.address) ? 'text-blue-800' : 'text-gray-800'}`}>
                    {isCurrentPlayer(entry.address) ? 'You' : formatAddress(entry.address)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${
                  entry.rank === 1 ? 'text-yellow-600' : 'text-gray-800'
                }`}>
                  {entry.score}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {entries.length > 10 && (
          <p className="text-xs text-gray-500 text-center mt-4">
            Top 10 of {entries.length}
          </p>
        )}
      </div>
    </div>
  );
}