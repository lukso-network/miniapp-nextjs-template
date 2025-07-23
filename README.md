# LUKSO Game Registry Template

A blockchain-based gaming platform built on LUKSO that features daily challenges with deterministic gameplay and on-chain leaderboards.

## Features

- 🎮 **Daily Gaming Challenges**: New games every day with deterministic seeds from blockchain
- 🏆 **On-chain Leaderboards**: Global competition with scores stored on LUKSO
- 🎲 **Fair Gameplay**: Same game experience for all players using blockchain-based seeds
- 💰 **Gas Efficient**: Only submit scores when beating personal best
- 🔐 **Universal Profile Integration**: Connect with LUKSO's Universal Profiles

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: LUKSO Network, Universal Profiles (UP)
- **Smart Contracts**: Solidity, Hardhat
- **Styling**: Tailwind CSS, LUKSO Web Components

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager
- Universal Profile Browser Extension

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lukso-game-registry
```

2. Install dependencies:
```bash
yarn install
```

3. Set up smart contracts:
```bash
cd contracts-hardhat
npm install
cp .env.example .env
# Add your private key to .env
```

### Development

1. Start the development server:
```bash
yarn dev
```

2. Open [http://localhost:3000](http://localhost:3000)

## Smart Contract Deployment

The GameRegistry contract is already deployed on LUKSO testnet at:
`0x83E0c99bF5BE14f8b9c4917c687ad5BC4Db625f3`

To deploy your own:

```bash
cd contracts-hardhat
npm run deploy:testnet
```

## Game Architecture

### Smart Contract

The `GameRegistry` contract provides:
- Game registration system
- Deterministic seed generation
- Score submission and validation
- Leaderboard management

### Frontend Components

- **FlappyBird**: Canvas-based game with deterministic pipe generation
- **GameContainer**: Manages game state and blockchain interactions
- **Leaderboard**: Displays top players
- **useGameRegistry**: Hook for contract interactions

## Adding New Games

1. Create a new game component in `/components/games/`
2. Use the seed from `useGameRegistry` for deterministic generation
3. Call `onGameOver` prop with the final score
4. Register the game type in the smart contract

## Environment Variables

Create a `.env` file in the `contracts-hardhat` directory:

```env
PRIVATE_KEY=your_private_key_here
LUKSO_RPC_URL=https://rpc.lukso.network
LUKSO_TESTNET_RPC_URL=https://rpc.testnet.lukso.network
```

## Scripts

### Frontend
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server

### Smart Contracts
- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:testnet` - Deploy to LUKSO testnet
- `npm run deploy:mainnet` - Deploy to LUKSO mainnet

## License

MIT