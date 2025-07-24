"use client";

import { useState, useEffect } from 'react';
import { useUpProvider } from '@/components/upProvider';
import { parseAbi, createPublicClient, http } from 'viem';
import { luksoTestnet } from 'viem/chains';

// Minimal ABI for GameRegistry contract
const GAME_REGISTRY_ABI = parseAbi([
  'function registerGame(string gameId, string name, string gameType, string metadata) external',
  'function getSeed(string gameId) external view returns (bytes32)',
  'function submitScore(string gameId, uint256 score) external',
  'function getLeaderboard(string gameId) external view returns (address[] players, uint256[] scores)',
  'function getPlayerScore(string gameId, address player) external view returns (uint256 score, uint256 timestamp)',
  'function getGameInfo(string gameId) external view returns (address creator, string name, string gameType, string metadata, uint256 created, bool active)',
  'event GameRegistered(string indexed gameId, address indexed creator, string gameType)',
  'event ScoreSubmitted(string indexed gameId, address indexed player, uint256 score)'
]);

// Contract address on LUKSO testnet
const GAME_REGISTRY_ADDRESS = '0x83E0c99bF5BE14f8b9c4917c687ad5BC4Db625f3' as const;

export interface GameInfo {
  creator: string;
  name: string;
  gameType: string;
  metadata: string;
  created: bigint;
  active: boolean;
}

export interface LeaderboardEntry {
  address: string;
  score: number;
  rank: number;
}

// Create a fallback public client for read operations
const fallbackClient = createPublicClient({
  chain: luksoTestnet,
  transport: http('https://rpc.testnet.lukso.network'),
});

export function useGameRegistry() {
  const { client, readClient, accounts } = useUpProvider();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always use fallback client for reads to avoid wallet provider issues
  const publicClient = fallbackClient;

  const registerGame = async (
    gameId: string,
    name: string,
    gameType: string,
    metadata: object
  ) => {
    if (!client || !accounts[0]) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Registering game with params:', {
        gameId,
        name,
        gameType,
        metadata: JSON.stringify(metadata),
        account: accounts[0],
        contractAddress: GAME_REGISTRY_ADDRESS
      });

      const hash = await client.writeContract({
        address: GAME_REGISTRY_ADDRESS,
        abi: GAME_REGISTRY_ABI,
        functionName: 'registerGame',
        args: [gameId, name, gameType, JSON.stringify(metadata)],
        account: accounts[0],
      } as any);

      console.log('Game registration transaction hash:', hash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Game registration receipt:', receipt);
      
      return hash;
    } catch (err: any) {
      console.error('Game registration error:', err);
      console.error('Error details:', {
        message: err.message,
        cause: err.cause,
        details: err.details,
        shortMessage: err.shortMessage
      });
      setError(err instanceof Error ? err.message : 'Failed to register game');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getSeed = async (gameId: string): Promise<string> => {
    try {
      const seed = await publicClient.readContract({
        address: GAME_REGISTRY_ADDRESS,
        abi: GAME_REGISTRY_ABI,
        functionName: 'getSeed',
        args: [gameId]
      });
      return seed as string;
    } catch (err) {
      // If game doesn't exist, return a default seed based on gameId
      if (err instanceof Error && err.message.includes('Game does not exist')) {
        // Generate a deterministic seed from the gameId
        const encoder = new TextEncoder();
        const data = encoder.encode(gameId);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
      }
      setError(err instanceof Error ? err.message : 'Failed to get seed');
      throw err;
    }
  };

  const submitScore = async (gameId: string, score: number) => {
    if (!client || !accounts[0]) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting score:', {
        gameId,
        score,
        account: accounts[0],
        contractAddress: GAME_REGISTRY_ADDRESS,
      });

      // Skip simulation and go directly to transaction
      // The contract will handle validation and revert with proper error messages if needed

      console.log('Attempting to write contract with:', {
        address: GAME_REGISTRY_ADDRESS,
        functionName: 'submitScore',
        args: [gameId, BigInt(score)],
        account: accounts[0],
      });

      const hash = await client.writeContract({
        address: GAME_REGISTRY_ADDRESS,
        abi: GAME_REGISTRY_ABI,
        functionName: 'submitScore',
        args: [gameId, BigInt(score)],
        account: accounts[0],
      } as any);

      console.log('Transaction hash:', hash);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction receipt:', receipt);
      console.log('Transaction status:', receipt.status);
      
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted');
      }
      
      return hash;
    } catch (err) {
      console.error('Submit score error:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        cause: (err as any)?.cause,
        details: (err as any)?.details,
      });
      setError(err instanceof Error ? err.message : 'Failed to submit score');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getLeaderboard = async (gameId: string): Promise<LeaderboardEntry[]> => {
    try {
      console.log('getLeaderboard called with gameId:', gameId);
      const result = await publicClient.readContract({
        address: GAME_REGISTRY_ADDRESS,
        abi: GAME_REGISTRY_ABI,
        functionName: 'getLeaderboard',
        args: [gameId]
      });

      console.log('getLeaderboard raw result:', result);

      // Handle empty leaderboard case
      if (!result || !Array.isArray(result) || result.length !== 2) {
        console.log('Invalid result format, returning empty array');
        return [];
      }

      const [players, scores] = result as [string[], bigint[]];
      console.log('Players:', players);
      console.log('Scores:', scores);

      // If players array is empty, return empty leaderboard
      if (!players || players.length === 0) {
        console.log('No players in leaderboard');
        return [];
      }

      const entries = players.map((address, index) => ({
        address,
        score: Number(scores[index]),
        rank: index + 1
      }));
      
      console.log('Returning leaderboard entries:', entries);
      return entries;
    } catch (err) {
      // If the error is due to empty data, return empty array
      if (err instanceof Error && err.message.includes('DataView')) {
        return [];
      }
      setError(err instanceof Error ? err.message : 'Failed to get leaderboard');
      throw err;
    }
  };

  const getPlayerScore = async (gameId: string, player: string): Promise<{ score: number; timestamp: number }> => {
    try {
      const [score, timestamp] = await publicClient.readContract({
        address: GAME_REGISTRY_ADDRESS,
        abi: GAME_REGISTRY_ABI,
        functionName: 'getPlayerScore',
        args: [gameId, player as `0x${string}`]
      }) as [bigint, bigint];

      return {
        score: Number(score),
        timestamp: Number(timestamp)
      };
    } catch (err: any) {
      // If game doesn't exist or player has no score yet, return 0
      // Common errors: "Game does not exist", DataView errors, execution reverted
      const errorMessage = err?.message || err?.cause?.reason || '';
      if (errorMessage.includes('Game does not exist') || 
          errorMessage.includes('DataView') ||
          errorMessage.includes('execution reverted')) {
        return { score: 0, timestamp: 0 };
      }
      setError(err instanceof Error ? err.message : 'Failed to get player score');
      throw err;
    }
  };

  const getGameInfo = async (gameId: string): Promise<GameInfo> => {
    try {
      const info = await publicClient.readContract({
        address: GAME_REGISTRY_ADDRESS,
        abi: GAME_REGISTRY_ABI,
        functionName: 'getGameInfo',
        args: [gameId]
      }) as [string, string, string, string, bigint, boolean];

      return {
        creator: info[0],
        name: info[1],
        gameType: info[2],
        metadata: info[3],
        created: info[4],
        active: info[5]
      };
    } catch (err: any) {
      // If game doesn't exist, throw with a clear message
      const errorMessage = err?.message || err?.cause?.reason || '';
      if (errorMessage.includes('Game does not exist') || 
          errorMessage.includes('execution reverted')) {
        throw new Error('Game does not exist');
      }
      setError(err instanceof Error ? err.message : 'Failed to get game info');
      throw err;
    }
  };

  return {
    registerGame,
    getSeed,
    submitScore,
    getLeaderboard,
    getPlayerScore,
    getGameInfo,
    isLoading,
    error,
    contractAddress: GAME_REGISTRY_ADDRESS
  };
}