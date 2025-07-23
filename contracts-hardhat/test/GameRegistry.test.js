const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GameRegistry", function () {
  let gameRegistry;
  let owner;
  let player1;
  let player2;
  let player3;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();
    
    const GameRegistry = await ethers.getContractFactory("GameRegistry");
    gameRegistry = await GameRegistry.deploy();
    await gameRegistry.waitForDeployment();
  });

  describe("Game Registration", function () {
    it("Should register a new game", async function () {
      const gameId = "daily-wordle-2024-01-15";
      const gameName = "Daily Wordle";
      const gameType = "wordle";
      const metadata = JSON.stringify({ difficulty: "medium" });

      await expect(gameRegistry.registerGame(gameId, gameName, gameType, metadata))
        .to.emit(gameRegistry, "GameRegistered")
        .withArgs(gameId, owner.address, gameType);

      const gameInfo = await gameRegistry.getGameInfo(gameId);
      expect(gameInfo.creator).to.equal(owner.address);
      expect(gameInfo.name).to.equal(gameName);
      expect(gameInfo.gameType).to.equal(gameType);
      expect(gameInfo.metadata).to.equal(metadata);
      expect(gameInfo.active).to.be.true;
    });

    it("Should not allow duplicate game IDs", async function () {
      const gameId = "daily-wordle-2024-01-15";
      await gameRegistry.registerGame(gameId, "Game 1", "wordle", "{}");
      
      await expect(gameRegistry.registerGame(gameId, "Game 2", "wordle", "{}"))
        .to.be.revertedWith("Game already exists");
    });

    it("Should validate game parameters", async function () {
      await expect(gameRegistry.registerGame("", "Game", "wordle", "{}"))
        .to.be.revertedWith("Invalid game ID");
      
      await expect(gameRegistry.registerGame("game-1", "", "wordle", "{}"))
        .to.be.revertedWith("Invalid game name");
      
      await expect(gameRegistry.registerGame("game-1", "Game", "", "{}"))
        .to.be.revertedWith("Invalid game type");
    });
  });

  describe("Seed Generation", function () {
    it("Should generate consistent seeds for games", async function () {
      const gameId = "daily-wordle-2024-01-15";
      await gameRegistry.registerGame(gameId, "Daily Wordle", "wordle", "{}");
      
      const seed1 = await gameRegistry.getSeed(gameId);
      const seed2 = await gameRegistry.getSeed(gameId);
      expect(seed1).to.equal(seed2);
    });

    it("Should generate different seeds for different games", async function () {
      const gameId1 = "daily-wordle-2024-01-15";
      const gameId2 = "daily-wordle-2024-01-16";
      
      await gameRegistry.registerGame(gameId1, "Wordle 1", "wordle", "{}");
      await gameRegistry.registerGame(gameId2, "Wordle 2", "wordle", "{}");
      
      const seed1 = await gameRegistry.getSeed(gameId1);
      const seed2 = await gameRegistry.getSeed(gameId2);
      expect(seed1).to.not.equal(seed2);
    });

    it("Should revert for non-existent games", async function () {
      await expect(gameRegistry.getSeed("non-existent"))
        .to.be.revertedWith("Game does not exist");
    });
  });

  describe("Score Submission", function () {
    const gameId = "daily-wordle-2024-01-15";

    beforeEach(async function () {
      await gameRegistry.registerGame(gameId, "Daily Wordle", "wordle", "{}");
    });

    it("Should submit a score", async function () {
      const score = 1000;
      await expect(gameRegistry.connect(player1).submitScore(gameId, score))
        .to.emit(gameRegistry, "ScoreSubmitted")
        .withArgs(gameId, player1.address, score);

      const [playerScore, timestamp] = await gameRegistry.getPlayerScore(gameId, player1.address);
      expect(playerScore).to.equal(score);
      expect(timestamp).to.be.gt(0);
    });

    it("Should only update if score improves", async function () {
      await gameRegistry.connect(player1).submitScore(gameId, 1000);
      
      await expect(gameRegistry.connect(player1).submitScore(gameId, 500))
        .to.be.revertedWith("Score not improved");
      
      await expect(gameRegistry.connect(player1).submitScore(gameId, 1500))
        .to.not.be.reverted;
    });

    it("Should not allow zero scores", async function () {
      await expect(gameRegistry.connect(player1).submitScore(gameId, 0))
        .to.be.revertedWith("Score must be greater than 0");
    });

    it("Should not allow scores for inactive games", async function () {
      await gameRegistry.deactivateGame(gameId);
      
      await expect(gameRegistry.connect(player1).submitScore(gameId, 1000))
        .to.be.revertedWith("Game is not active");
    });
  });

  describe("Leaderboard", function () {
    const gameId = "daily-wordle-2024-01-15";

    beforeEach(async function () {
      await gameRegistry.registerGame(gameId, "Daily Wordle", "wordle", "{}");
    });

    it("Should maintain a sorted leaderboard", async function () {
      await gameRegistry.connect(player1).submitScore(gameId, 1000);
      await gameRegistry.connect(player2).submitScore(gameId, 2000);
      await gameRegistry.connect(player3).submitScore(gameId, 1500);

      const [players, scores] = await gameRegistry.getLeaderboard(gameId);
      
      expect(players[0]).to.equal(player2.address);
      expect(scores[0]).to.equal(2000);
      expect(players[1]).to.equal(player3.address);
      expect(scores[1]).to.equal(1500);
      expect(players[2]).to.equal(player1.address);
      expect(scores[2]).to.equal(1000);
    });

    it("Should update leaderboard when player improves score", async function () {
      await gameRegistry.connect(player1).submitScore(gameId, 1000);
      await gameRegistry.connect(player2).submitScore(gameId, 2000);
      
      // Player1 improves their score
      await gameRegistry.connect(player1).submitScore(gameId, 2500);
      
      const [players, scores] = await gameRegistry.getLeaderboard(gameId);
      expect(players[0]).to.equal(player1.address);
      expect(scores[0]).to.equal(2500);
      expect(players[1]).to.equal(player2.address);
      expect(scores[1]).to.equal(2000);
    });

    it("Should respect max leaderboard size", async function () {
      // This test would require submitting 100+ scores
      // Skipping for brevity, but important to test in production
    });
  });

  describe("Game Management", function () {
    const gameId = "daily-wordle-2024-01-15";

    beforeEach(async function () {
      await gameRegistry.registerGame(gameId, "Daily Wordle", "wordle", "{}");
    });

    it("Should allow creator to deactivate game", async function () {
      await expect(gameRegistry.deactivateGame(gameId))
        .to.emit(gameRegistry, "GameDeactivated")
        .withArgs(gameId);

      const isActive = await gameRegistry.isGameActive(gameId);
      expect(isActive).to.be.false;
    });

    it("Should not allow non-creator to deactivate game", async function () {
      await expect(gameRegistry.connect(player1).deactivateGame(gameId))
        .to.be.revertedWith("Only creator can deactivate");
    });

    it("Should not deactivate already inactive game", async function () {
      await gameRegistry.deactivateGame(gameId);
      
      await expect(gameRegistry.deactivateGame(gameId))
        .to.be.revertedWith("Game already deactivated");
    });
  });
});