"use client";

import { useState, useEffect } from 'react';
import { useGameRegistry, LeaderboardEntry } from '@/hooks/useGameRegistry';
import { useUpProvider } from './upProvider';

interface LeaderboardProps {
  gameId: string;
}

export function Leaderboard({ gameId }: LeaderboardProps) {
  const { getLeaderboard } = useGameRegistry();
  const { accounts, chainId, walletConnected } = useUpProvider();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only fetch if we have a gameId and are on the correct chain
    if (!gameId || !hasInitialized) return;
    
    async function fetchLeaderboard() {
      // Skip if not on testnet
      if (chainId !== 4201 && chainId !== 0) {
        setError('Please switch to LUKSO Testnet');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const leaderboardData = await getLeaderboard(gameId);
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
    }, 1000);

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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
        <p className="text-gray-500 text-center py-8">
          No scores yet. Be the first to play!
        </p>
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
      const leaderboardData = await getLeaderboard(gameId);
      setEntries(leaderboardData || []);
    } catch (err) {
      setEntries([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Top Players</h3>
        <button
          onClick={refreshLeaderboard}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isLoading ? '⟳' : '↻ Refresh'}
        </button>
      </div>
      <div className="space-y-2">
        {entries.slice(0, 10).map((entry) => (
          <div
            key={entry.address}
            className={`flex items-center justify-between p-3 rounded-lg ${
              isCurrentPlayer(entry.address)
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  entry.rank === 1
                    ? 'bg-yellow-400 text-white'
                    : entry.rank === 2
                    ? 'bg-gray-300 text-white'
                    : entry.rank === 3
                    ? 'bg-orange-400 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {entry.rank}
              </div>
              <div>
                <p className="font-medium">
                  {isCurrentPlayer(entry.address) ? 'You' : formatAddress(entry.address)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{entry.score}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>
      
      {entries.length > 10 && (
        <p className="text-sm text-gray-500 text-center mt-4">
          Showing top 10 of {entries.length} players
        </p>
      )}
    </div>
  );
}