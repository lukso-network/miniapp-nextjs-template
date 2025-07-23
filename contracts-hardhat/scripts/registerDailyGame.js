const hre = require("hardhat");

async function main() {
  const contractAddress = "0x83E0c99bF5BE14f8b9c4917c687ad5BC4Db625f3";
  
  const GameRegistry = await hre.ethers.getContractFactory("GameRegistry");
  const gameRegistry = GameRegistry.attach(contractAddress);

  const today = new Date().toISOString().split('T')[0];
  const gameId = `daily-flappy-${today}`;
  
  console.log(`Registering game: ${gameId}`);

  try {
    const tx = await gameRegistry.registerGame(
      gameId,
      `Daily Flappy ${today}`,
      "flappy",
      JSON.stringify({
        description: "Daily Flappy Bird challenge",
        rules: "Pass as many pipes as possible",
        scoringSystem: "1 point per pipe passed"
      })
    );

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Game registered successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("Error registering game:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });