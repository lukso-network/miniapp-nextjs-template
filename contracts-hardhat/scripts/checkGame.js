const hre = require("hardhat");

async function main() {
  const contractAddress = "0x83E0c99bF5BE14f8b9c4917c687ad5BC4Db625f3";
  
  const GameRegistry = await hre.ethers.getContractFactory("GameRegistry");
  const gameRegistry = GameRegistry.attach(contractAddress);

  const today = new Date().toISOString().split('T')[0];
  const gameId = `daily-flappy-${today}`;
  
  console.log(`Checking game: ${gameId}`);

  try {
    const gameInfo = await gameRegistry.getGameInfo(gameId);
    console.log("\nGame found!");
    console.log("Creator:", gameInfo.creator);
    console.log("Name:", gameInfo.name);
    console.log("Type:", gameInfo.gameType);
    console.log("Active:", gameInfo.active);
    console.log("Created:", new Date(Number(gameInfo.created) * 1000).toISOString());
    
    // Check leaderboard
    const [players, scores] = await gameRegistry.getLeaderboard(gameId);
    console.log("\nLeaderboard:");
    if (players.length === 0) {
      console.log("No scores yet");
    } else {
      players.forEach((player, index) => {
        console.log(`${index + 1}. ${player}: ${scores[index]} points`);
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("Game does not exist")) {
      console.log("\nGame not registered yet. Run registerDailyGame.js to register it.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });