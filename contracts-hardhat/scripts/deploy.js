const hre = require("hardhat");

async function main() {
  console.log("Deploying GameRegistry...");

  const GameRegistry = await hre.ethers.getContractFactory("GameRegistry");
  const gameRegistry = await GameRegistry.deploy();

  await gameRegistry.waitForDeployment();

  const address = await gameRegistry.getAddress();
  console.log("GameRegistry deployed to:", address);

  // Register initial daily games for testing
  if (hre.network.name !== "lukso" && hre.network.name !== "luksoTestnet") {
    console.log("\nRegistering initial games for testing...");
    
    const today = new Date().toISOString().split('T')[0];
    const games = [
      { id: `daily-wordle-${today}`, name: "Daily Wordle", type: "wordle" },
      { id: `daily-2048-${today}`, name: "Daily 2048", type: "2048" },
      { id: `daily-memory-${today}`, name: "Daily Memory", type: "memory" }
    ];

    for (const game of games) {
      await gameRegistry.registerGame(
        game.id,
        game.name,
        game.type,
        JSON.stringify({ 
          description: `Daily ${game.type} challenge`,
          rules: "Standard rules apply",
          scoringSystem: "Higher is better"
        })
      );
      console.log(`Registered: ${game.name} (${game.id})`);
    }
  }

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });