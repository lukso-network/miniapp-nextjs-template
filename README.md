# Mini-App next.js template

A template project demonstrating how to build mini-apps using the [up-provider package](https://github.com/lukso-network/tools-up-provider) and interacting with Universal Profiles on [Universal Everything](https://universaleverything.io), built with [next.js](https://nextjs.org).

## Overview

This template showcases:

- [UP-Provider](https://github.com/lukso-network/tools-up-provider) implementation and wallet connection on the Grid
- Profile search functionality using Envio integration for fast querying
- Integrates the [@lukso/web-components](https://www.npmjs.com/package/@lukso/web-components) library for ready-to-use branded components
- Uses the [erc725js](https://docs.lukso.tech/tools/dapps/erc725js/getting-started) library to fetch profile data from the blockchain

> **Cursor Tip:** You can rename this README.md file to `repo.cursorrules` for better AI development experience using Cursor.

## Key Features

### UP-Provider Integration

The template demonstrates how to:

- Connect to Universal Profile browser extension from the Grid
- Manage UP contexts on the Grid

### Envio Integration

Shows how to:

- Query the LUKSO Envio indexer
- Search for Universal Profiles
- Display profile information and images

### Web Components

Shows how to:

- Use the [@lukso/web-components](https://www.npmjs.com/package/@lukso/web-components) library to display profile card

### ERC-725.js

Shows how to:

- Use the [erc725js](https://docs.lukso.tech/tools/dapps/erc725js/getting-started) library to fetch profile data from the blockchain

## Getting Started

1. Install dependencies:

```bash
yarn install
```

2. Run the development server:

```bash
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

4. Testing your mini-app on the Grid:

Simply add your localhost url as a mini-app to your Grid!

> Alternatively, you can use free cloud deployment services like Vercel, Replit, etc. and use the url provided from those services.

## Project Structure

- `components/upProvider.tsx`: Core UP Provider implementation and wallet connection logic
- `components/ProfileSearch.tsx`: Example of Envio integration for profile search
- `components/Donate.tsx`: Example use-case of this template. Uses the client from the up-provider package to interact with the blockchain
- `components/LuksoProfile.tsx`: Example of using the [@lukso/web-components](https://www.npmjs.com/package/@lukso/web-components) library to display profile images that is fetched using the [erc725js](https://docs.lukso.tech/tools/dapps/erc725js/getting-started) library

## Learn More

- [LUKSO Documentation](https://docs.lukso.tech/) - Learn more about developing on LUKSO
- [UP Browser Extension](https://docs.lukso.tech/install-up-browser-extension) - Install the Universal Profile Browser Extension
- [erc725js](https://docs.lukso.tech/tools/dapps/erc725js/getting-started) - Learn more about the erc725js library
- [@lukso/web-components](https://www.npmjs.com/package/@lukso/web-components) - Learn more about the @lukso/web-components library

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.
