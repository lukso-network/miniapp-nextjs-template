# LUKSO Game Registry Implementation Plan

## Overview

A generic game registry system for LUKSO that allows any Universal Profile to host mini-game applications. Games are registered once on-chain, then anyone can play them from any profile. Scores are stored on-chain with minimal transactions (only when players want to claim leaderboard positions).

## Architecture

### Smart Contract: GameRegistry

```solidity
contract GameRegistry {
    struct Game {
        address creator;        // Who registered the game
        string name;           // Display name
        string gameType;       // Game category (wordle, puzzle, etc.)
        string metadata;       // JSON metadata
        uint256 created;       // Timestamp
        bool active;          // Can be deactivated
    }
    
    struct Score {
        uint256 score;        // Player's best score
        uint256 timestamp;    // When achieved
    }
    
    // Storage
    mapping(string => Game) public games;                          // gameId -> Game
    mapping(string => mapping(address => Score)) public scores;    // gameId -> player -> Score
    mapping(string => address[]) public leaderboards;             // gameId -> top N players
    
    // Events
    event GameRegistered(string indexed gameId, address creator, string gameType);
    event ScoreSubmitted(string indexed gameId, address player, uint256 score);
    
    // Core Functions
    function registerGame(string gameId, string name, string gameType, string metadata) external;
    function getSeed(string gameId) public view returns (bytes32);
    function submitScore(string gameId, uint256 score) external;
    function getLeaderboard(string gameId) external view returns (address[], uint256[]);
    function deactivateGame(string gameId) external; // Only creator or admin
}
```

### Game ID Conventions

```javascript
// Daily challenges
`daily-${gameType}-${YYYY-MM-DD}`
// Examples:
// "daily-wordle-2024-01-15"
// "daily-2048-2024-01-15"

// Weekly/Monthly challenges  
`${period}-${gameType}-${year}-week${number}`
// "weekly-sudoku-2024-week3"
// "monthly-puzzle-2024-01"

// Community games
`community-${gameType}-${uniqueId}`
// "community-chess-puzzle-42"
// "community-memory-alice-1"

// Special events
`event-${eventName}-${gameType}`
// "event-halloween-wordle"
// "event-newyear-2048"
```

### Frontend Architecture

```
/miniapp-game-template
├── contracts/
│   └── GameRegistry.sol
├── components/
│   ├── GameBrowser.tsx       // Browse all registered games
│   ├── GamePlayer.tsx        // Generic game player wrapper
│   ├── Leaderboard.tsx       // Display scores
│   ├── GameRegistration.tsx  // Register new games
│   └── ProfileIntegration.tsx // UP context handling
├── games/
│   ├── wordle/
│   │   ├── WordleGame.tsx    // Game implementation
│   │   ├── wordleGenerator.ts // Seed-based generation
│   │   └── wordleScoring.ts  // Score calculation
│   ├── puzzle2048/
│   │   ├── Puzzle2048.tsx
│   │   ├── generator2048.ts
│   │   └── scoring2048.ts
│   └── gameRegistry.ts       // Game type registry
├── lib/
│   ├── gameContract.ts       // Contract interactions
│   ├── seedUtils.ts          // Deterministic generation
│   └── scoreValidation.ts    // Anti-cheat measures
└── hooks/
    ├── useGameRegistry.ts    // Contract hook
    ├── useGameSession.ts     // Local game state
    └── useLeaderboard.ts     // Score fetching
```

## Implementation Details

### 1. Game Registration Process

```typescript
interface GameMetadata {
    description: string;
    rules: string;
    scoringSystem: string;
    imageUrl?: string;
    category?: string;
    tags?: string[];
}

async function registerNewGame(
    gameId: string,
    name: string,
    gameType: string,
    metadata: GameMetadata
) {
    const metadataJson = JSON.stringify(metadata);
    const tx = await gameRegistry.registerGame(
        gameId,
        name,
        gameType,
        metadataJson
    );
    await tx.wait();
}
```

### 2. Deterministic Game Generation

```typescript
// Core seed generation from contract
async function getGameSeed(gameId: string): Promise<string> {
    const seed = await gameRegistry.getSeed(gameId);
    return seed;
}

// Game-specific generators
function generateWordleFromSeed(seed: string): WordleGame {
    const wordList = WORDLE_WORDS;
    const index = seedToNumber(seed) % wordList.length;
    const targetWord = wordList[index];
    
    return {
        targetWord,
        maxAttempts: 6,
        wordLength: 5
    };
}

function generate2048FromSeed(seed: string): Puzzle2048Game {
    const rng = createSeededRNG(seed);
    
    return {
        initialTiles: generateInitialTiles(rng),
        tileSequence: generateTileSequence(rng, 1000), // Pre-generate 1000 tiles
        gridSize: 4
    };
}
```

### 3. Score Submission Logic

```typescript
interface GameSession {
    gameId: string;
    startTime: number;
    moves: any[];
    currentScore: number;
    isComplete: boolean;
}

async function submitScore(session: GameSession) {
    // Only submit if better than previous
    const currentBest = await gameRegistry.scores(session.gameId, playerAddress);
    
    if (session.currentScore > currentBest.score) {
        const tx = await gameRegistry.submitScore(
            session.gameId,
            session.currentScore
        );
        await tx.wait();
        return true;
    }
    return false;
}
```

### 4. Leaderboard Implementation

```typescript
interface LeaderboardEntry {
    address: string;
    score: number;
    rank: number;
}

async function getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
    const [addresses, scores] = await gameRegistry.getLeaderboard(gameId);
    
    return addresses.map((addr, index) => ({
        address: addr,
        score: scores[index],
        rank: index + 1
    }));
}
```

### 5. Anti-Cheat Considerations

```typescript
// Option 1: Replay data (stored off-chain)
interface ScoreProof {
    gameId: string;
    moves: string[];      // Encrypted move sequence
    timestamps: number[]; // Move timestamps
    finalScore: number;
    checksum: string;     // Hash of moves + score
}

// Option 2: Time-based validation
function validateScore(gameType: string, score: number, timeElapsed: number): boolean {
    const minTime = MIN_TIME_PER_GAME[gameType];
    const maxScore = MAX_SCORE_PER_GAME[gameType];
    
    return timeElapsed >= minTime && score <= maxScore;
}

// Option 3: Statistical analysis (off-chain)
function detectAnomalousScores(scores: number[]): number[] {
    // Flag scores that are statistical outliers
    const mean = calculateMean(scores);
    const stdDev = calculateStdDev(scores);
    const threshold = mean + (stdDev * 3);
    
    return scores.filter(score => score > threshold);
}
```

## Game Types to Implement

### 1. Flappy Bird
- **Scoring**: Points for each pipe passed
- **Seed Usage**: Deterministic pipe height generation
- **Validation**: Score must be achievable based on pipe sequence

### 2. 2048
- **Scoring**: Sum of all tile values + merge bonus
- **Seed Usage**: Initial tile placement and spawn sequence
- **Validation**: Valid moves only, no impossible scores

### 3. Sudoku
- **Scoring**: Base score - (time penalty) - (hint penalty)
- **Seed Usage**: Generate valid puzzle with unique solution
- **Validation**: Solution correctness

### 4. Memory Match
- **Scoring**: Matches found + time bonus - mismatch penalty
- **Seed Usage**: Card placement and symbols
- **Validation**: Move sequence validity

## User Flows

### Playing a Daily Challenge

1. User visits any profile with the mini-app
2. App checks for today's registered games
3. User selects "Daily Wordle"
4. App fetches seed from contract
5. Game generates puzzle from seed
6. User plays locally (no blockchain interaction)
7. Upon completion, if score beats personal best:
   - Show "Submit Score" button
   - User approves transaction
   - Score submitted to contract
8. Leaderboard updates automatically

### Registering a Community Game

1. User clicks "Create Challenge"
2. Fills out game details:
   - Game type (from available templates)
   - Name and description
   - Custom parameters (if applicable)
3. App generates unique game ID
4. User approves registration transaction
5. Game appears in community games list
6. Other users can now play this challenge

### Profile Integration

```typescript
// Detect which profile is hosting
const hostProfile = contextAccounts[0];
const playerProfile = accounts[0];

// Show different UI based on context
if (hostProfile === playerProfile) {
    // Show "My Games" with management options
} else {
    // Show "Play on [profile name]"
}

// Track which profile introduced player to game
const referrer = hostProfile;
```

## Deployment Steps

1. **Smart Contract**
   - Deploy GameRegistry to LUKSO testnet
   - Verify contract
   - Register initial daily games

2. **Frontend Development**
   - Set up Next.js with UP Provider
   - Implement game engines
   - Create UI components
   - Integrate contract calls

3. **Testing**
   - Unit tests for game generators
   - Integration tests for contract
   - E2E tests for full flow
   - Gas optimization

4. **Launch**
   - Deploy to mainnet
   - Set up automated daily game registration
   - Create documentation
   - Launch with 2-3 game types

## Future Enhancements

1. **Tournament System**
   - Multi-round competitions
   - Bracket systems
   - Time-limited events

2. **Social Features**
   - Friend challenges
   - Share scores
   - Profile achievements

3. **Rewards** (Optional)
   - NFT badges
   - Leaderboard seasons
   - Special event prizes

4. **Advanced Games**
   - Multiplayer puzzles
   - Collaborative challenges
   - User-generated content

## Security Considerations

1. **Contract Security**
   - Reentrancy protection
   - Input validation
   - Access control for game deactivation

2. **Game Integrity**
   - Deterministic generation
   - Score validation
   - Anti-cheat measures

3. **Privacy**
   - No personal data stored
   - Anonymous leaderboards (only addresses)
   - Optional profile integration

This plan provides a complete blueprint for implementing a social gaming platform on LUKSO that leverages Universal Profiles while maintaining simplicity and good user experience.