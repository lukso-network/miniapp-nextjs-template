# GameRegistry Smart Contracts

This directory contains the smart contracts for the LUKSO Game Registry system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your private key:
   ```bash
   cp .env.example .env
   ```

## Commands

### Compile contracts
```bash
npx hardhat compile
```

### Run tests
```bash
npx hardhat test
```

### Run tests with gas reporting
```bash
REPORT_GAS=true npx hardhat test
```

### Deploy to local network
```bash
npx hardhat run scripts/deploy.js
```

### Deploy to LUKSO testnet
```bash
npx hardhat run scripts/deploy.js --network luksoTestnet
```

### Deploy to LUKSO mainnet
```bash
npx hardhat run scripts/deploy.js --network lukso
```

## Contract Overview

### GameRegistry.sol

The main contract that manages game registration and score tracking.

#### Key Functions:
- `registerGame()` - Register a new game (one-time action)
- `getSeed()` - Get deterministic seed for a game
- `submitScore()` - Submit a player's score
- `getLeaderboard()` - Get the top players for a game
- `deactivateGame()` - Deactivate a game (creator only)

#### Events:
- `GameRegistered` - Emitted when a new game is registered
- `ScoreSubmitted` - Emitted when a score is submitted
- `GameDeactivated` - Emitted when a game is deactivated

## Gas Costs (Approximate)

- Register Game: ~150,000 gas
- Submit Score (first time): ~120,000 gas
- Submit Score (update): ~80,000 gas
- Get Leaderboard: View function (no gas)

## Security Considerations

- Only game creators can deactivate their games
- Scores can only improve (no downgrading)
- Game IDs must be unique
- All games start active by default