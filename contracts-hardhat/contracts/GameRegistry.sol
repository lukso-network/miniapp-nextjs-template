// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GameRegistry {
    struct Game {
        address creator;
        string name;
        string gameType;
        string metadata;
        uint256 created;
        bool active;
    }

    struct Score {
        uint256 score;
        uint256 timestamp;
    }

    mapping(string => Game) public games;
    mapping(string => mapping(address => Score)) public scores;
    mapping(string => address[]) public leaderboards;
    mapping(string => mapping(address => bool)) private inLeaderboard;

    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    event GameRegistered(string indexed gameId, address indexed creator, string gameType);
    event ScoreSubmitted(string indexed gameId, address indexed player, uint256 score);
    event GameDeactivated(string indexed gameId);

    modifier gameExists(string memory gameId) {
        require(games[gameId].creator != address(0), "Game does not exist");
        _;
    }

    modifier gameActive(string memory gameId) {
        require(games[gameId].active, "Game is not active");
        _;
    }

    function registerGame(
        string memory gameId,
        string memory name,
        string memory gameType,
        string memory metadata
    ) external {
        require(games[gameId].creator == address(0), "Game already exists");
        require(bytes(gameId).length > 0, "Invalid game ID");
        require(bytes(name).length > 0, "Invalid game name");
        require(bytes(gameType).length > 0, "Invalid game type");

        games[gameId] = Game({
            creator: msg.sender,
            name: name,
            gameType: gameType,
            metadata: metadata,
            created: block.timestamp,
            active: true
        });

        emit GameRegistered(gameId, msg.sender, gameType);
    }

    function getSeed(string memory gameId) public view gameExists(gameId) returns (bytes32) {
        return keccak256(abi.encodePacked(gameId));
    }

    function submitScore(string memory gameId, uint256 score) 
        external 
        gameExists(gameId) 
        gameActive(gameId) 
    {
        require(score > 0, "Score must be greater than 0");
        
        Score storage playerScore = scores[gameId][msg.sender];
        require(score > playerScore.score, "Score not improved");

        playerScore.score = score;
        playerScore.timestamp = block.timestamp;

        _updateLeaderboard(gameId, msg.sender, score);
        
        emit ScoreSubmitted(gameId, msg.sender, score);
    }

    function _updateLeaderboard(string memory gameId, address player, uint256 score) private {
        address[] storage board = leaderboards[gameId];
        
        // If player is already in leaderboard, remove them first
        if (inLeaderboard[gameId][player]) {
            _removeFromLeaderboard(gameId, player);
        }

        // Find position to insert
        uint256 insertPosition = board.length;
        for (uint256 i = 0; i < board.length; i++) {
            if (score > scores[gameId][board[i]].score) {
                insertPosition = i;
                break;
            }
        }

        // If board is full and score doesn't make it, return
        if (insertPosition >= MAX_LEADERBOARD_SIZE) {
            return;
        }

        // Shift elements if needed
        if (board.length < MAX_LEADERBOARD_SIZE) {
            board.push();
        }

        for (uint256 i = board.length - 1; i > insertPosition; i--) {
            if (i == board.length - 1 && board.length == MAX_LEADERBOARD_SIZE) {
                // Remove the last player from tracking
                inLeaderboard[gameId][board[i - 1]] = false;
            }
            board[i] = board[i - 1];
        }

        board[insertPosition] = player;
        inLeaderboard[gameId][player] = true;
    }

    function _removeFromLeaderboard(string memory gameId, address player) private {
        address[] storage board = leaderboards[gameId];
        
        for (uint256 i = 0; i < board.length; i++) {
            if (board[i] == player) {
                // Shift remaining elements
                for (uint256 j = i; j < board.length - 1; j++) {
                    board[j] = board[j + 1];
                }
                board.pop();
                inLeaderboard[gameId][player] = false;
                break;
            }
        }
    }

    function getLeaderboard(string memory gameId) 
        external 
        view 
        gameExists(gameId)
        returns (address[] memory players, uint256[] memory playerScores) 
    {
        address[] storage board = leaderboards[gameId];
        players = new address[](board.length);
        playerScores = new uint256[](board.length);

        for (uint256 i = 0; i < board.length; i++) {
            players[i] = board[i];
            playerScores[i] = scores[gameId][board[i]].score;
        }

        return (players, playerScores);
    }

    function deactivateGame(string memory gameId) 
        external 
        gameExists(gameId) 
    {
        require(msg.sender == games[gameId].creator, "Only creator can deactivate");
        require(games[gameId].active, "Game already deactivated");
        
        games[gameId].active = false;
        emit GameDeactivated(gameId);
    }

    function getPlayerScore(string memory gameId, address player) 
        external 
        view 
        gameExists(gameId)
        returns (uint256 score, uint256 timestamp) 
    {
        Score memory playerScore = scores[gameId][player];
        return (playerScore.score, playerScore.timestamp);
    }

    function isGameActive(string memory gameId) 
        external 
        view 
        gameExists(gameId)
        returns (bool) 
    {
        return games[gameId].active;
    }

    function getGameInfo(string memory gameId)
        external
        view
        gameExists(gameId)
        returns (
            address creator,
            string memory name,
            string memory gameType,
            string memory metadata,
            uint256 created,
            bool active
        )
    {
        Game memory game = games[gameId];
        return (
            game.creator,
            game.name,
            game.gameType,
            game.metadata,
            game.created,
            game.active
        );
    }
}