# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a blockchain-based gaming platform built on LUKSO that features daily challenges with deterministic gameplay and on-chain leaderboards. It's designed to work as a mini-app within the Universal Everything (Grid) platform and demonstrates game state management, Universal Profile integration, and efficient blockchain interactions.

## Essential Commands

```bash
# Install dependencies (uses Yarn 4.6.0)
yarn install

# Run development server with Turbopack
yarn dev

# Build for production (includes pre-build step)
yarn build

# Run production server
yarn start

# Run linter
yarn lint
```

## High-Level Architecture

### Core Technology Stack
- **Next.js 15.2.3** with App Router and Turbopack
- **React 19** with TypeScript
- **LUKSO Tools**: @lukso/up-provider, @lukso/web-components, @erc725/erc725.js
- **viem** for blockchain interactions
- **Tailwind CSS** with LUKSO preset

### Key Architectural Patterns

1. **Context Provider Pattern**: The `UpProvider` component (components/upProvider.tsx) wraps the entire app and manages:
   - Wallet connection state
   - Account management (regular and context accounts)
   - Chain ID tracking and switching
   - Selected address state
   - Search functionality state

2. **Client-Side Architecture**: Heavy use of `"use client"` directives due to wallet integration requirements. No server-side rendering for wallet-connected components.

3. **Event-Driven Wallet Integration**: UP-Provider events are handled for:
   - Account changes
   - Chain ID changes
   - Connection/disconnection

### Critical Implementation Details

1. **Game Architecture**:
   - GameRegistry smart contract deployed at: 0x83E0c99bF5BE14f8b9c4917c687ad5BC4Db625f3 (testnet)
   - Deterministic game generation using blockchain seeds
   - Score submission only when beating personal best
   - Leaderboard limited to top 100 players

2. **Chain IDs**:
   - LUKSO Mainnet: 42
   - LUKSO Testnet: 4201

3. **Smart Contract Structure**:
   - contracts-hardhat/ directory contains all smart contract code
   - Separate from main Next.js app to avoid config conflicts
   - Uses Hardhat for development and testing

4. **Game Implementation Pattern**:
   - Games use deterministic seeds from blockchain
   - Local gameplay with optional score submission
   - Canvas-based rendering for smooth performance
   - Context-aware for Universal Profile integration

### Development Considerations

- Always check wallet connection state before blockchain operations
- Use the provided LUKSO web components for consistent UI
- Handle both regular accounts and context accounts from UP-Provider
- Ensure proper cleanup of event listeners in useEffect hooks
- Validate amounts and addresses before transactions
- The app is designed to work within the Grid platform iframe context