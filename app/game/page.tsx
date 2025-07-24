"use client";

import { UpProvider } from "@/components/upProvider";
import { GameContainer } from "@/components/GameContainer";
import { Leaderboard } from "@/components/Leaderboard";
import { useState, useEffect } from "react";

function GameContent() {
  const [gameId, setGameId] = useState<string>('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setGameId(`daily-flappy-${today}`);
  }, []);

  return (
    <div className="w-[600px] h-[400px] mx-auto bg-gray-50 relative overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <GameContainer />
        
        {/* Leaderboard toggle button */}
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="absolute top-2 right-2 z-10 px-3 py-1.5 bg-white/90 hover:bg-white text-sm font-medium text-gray-700 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
        </button>
      </div>

      {/* Sliding leaderboard panel */}
      <div
        className={`absolute inset-0 bg-white transform transition-transform duration-300 ${
          showLeaderboard ? 'translate-x-0' : 'translate-x-full'
        } z-20`}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Leaderboard</h2>
            <button
              onClick={() => setShowLeaderboard(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {gameId && <Leaderboard gameId={gameId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <UpProvider>
      <GameContent />
    </UpProvider>
  );
}