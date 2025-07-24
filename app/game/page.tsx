"use client";

import { UpProvider } from "@/components/upProvider";
import { GameContainer } from "@/components/GameContainer";
import { Leaderboard } from "@/components/Leaderboard";
import { useState, useEffect } from "react";

function GameContent() {
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setGameId(`daily-flappy-${today}`);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <GameContainer />
          </div>
          
          <div className="lg:col-span-1">
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