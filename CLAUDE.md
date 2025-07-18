# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LUKSO mini-app Next.js template designed for building applications that run within the LUKSO Grid (Universal Everything platform). The current implementation is an Apparel Size Manager that demonstrates storing custom metadata on Universal Profiles using the LUKSO blockchain.

## Development Commands

```bash
# Development
yarn dev          # Run Next.js development server with Turbopack
yarn prebuild     # Copy LUKSO web component assets to public folder (runs automatically before build)
yarn build        # Create production build
yarn start        # Start production server
yarn lint         # Run ESLint
```

## Architecture and Code Organization

### State Management Pattern
The application uses React Context for state management via the `UpProvider` component (src/app/up-provider.tsx). This provider:
- Manages wallet connection state
- Provides access to connected accounts
- Exposes blockchain client for transactions
- Handles network switching between mainnet and testnet

### Key Component Flow
1. **Page.tsx** - Entry point that conditionally renders based on wallet connection
2. **UpProvider** - Wraps the app with wallet/blockchain context
3. **ApparelSizeManager** - Main feature demonstrating metadata storage pattern
4. **ProfileSearch** - Uses Envio GraphQL for indexed blockchain data
5. **LuksoProfile** - Fetches and displays Universal Profile data

### Blockchain Integration Pattern
- Use `viem` for all blockchain transactions and interactions
- Use `@erc725/erc725.js` for reading/writing Universal Profile metadata
- Custom metadata keys are generated using keccak256 hashing (see ApparelSizeManager)
- Always validate addresses before transactions
- Handle loading states to prevent double submissions

### LUKSO-Specific Patterns
- Web components are loaded via CDN and require TypeScript declarations in types/globals.d.ts
- Profile images use IPFS URLs that need to be converted (utility in ApparelSizeManager)
- Network switching is handled via UpProvider's connectToNetwork method
- Universal Profile metadata follows ERC725Y standard with key-value pairs

## Important Technical Details

### Custom Metadata Storage
The template demonstrates storing custom data on Universal Profiles:
1. Generate unique keys using keccak256 hashing
2. Encode data as hex strings
3. Use setDataBatch for efficient multi-key updates
4. Retrieve data using ERC725.js's getData method

### GraphQL Integration
Profile searches use Envio's indexed data:
- Endpoint: https://indexer.bigbang.fyi/e1650d2/v1/graphql
- Includes pagination and search functionality
- Returns structured profile data with metadata

### Type Safety
- All LUKSO web components have TypeScript declarations
- Blockchain addresses use `0x${string}` type from viem
- Custom types for apparel data structures

## Common Development Tasks

When implementing new features that interact with Universal Profiles:
1. Check ApparelSizeManager for metadata storage patterns
2. Use UpProvider's context for wallet state
3. Follow the loading state pattern for async operations
4. Handle both mainnet and testnet configurations

When adding new blockchain interactions:
1. Import necessary ABIs from src/abi/
2. Use the publicClient from UpProvider for read operations
3. Use walletClient for write operations (transactions)
4. Always include proper error handling

## Testing Approach
The project currently doesn't have a test suite configured. When adding tests, consider:
- Testing blockchain interactions with mock providers
- Component testing for UI elements
- Integration tests for the full user flow