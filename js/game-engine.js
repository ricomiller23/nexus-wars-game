// NEXUS WARS - Core Game Engine
// Main orchestration and game state management

let gameState = null;
let renderer = null;

// Initialize game on window load
window.onload = initGame;

function initGame() {
    console.log('Initializing Nexus Wars...');

    // Initialize game state
    gameState = createInitialGameState();

    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Initialize renderer
    renderer = initBoardRenderer(canvas, gameState);

    // Start render loop
    gameLoop();

    console.log('Nexus Wars initialized successfully');
}

function createInitialGameState() {
    return {
        round: 1,
        phase: 'DRAFT', // 'DRAFT', 'MOVEMENT', 'NEXUS_CHECK'
        currentPlayerId: 'PLAYER',
        firstPlayerThisRound: 'PLAYER', // Alternates each round
        players: [
            {
                id: 'PLAYER',
                name: 'Player',
                homeBaseIndex: 1,
                opponentHomeBaseIndex: 11,
                pieces: createPlayerPieces('PLAYER', 1),
                factionId: null,
                factionState: {},
                controlledNexusCount: 0
            },
            {
                id: 'AI',
                name: 'AI Opponent',
                homeBaseIndex: 11,
                opponentHomeBaseIndex: 1,
                pieces: createPlayerPieces('AI', 11),
                factionId: null,
                factionState: {},
                controlledNexusCount: 0
            }
        ],
        boardSpaces: createBoardSpaces(),
        diceState: {
            rolledDice: [], // All 5 rolled dice
            availableDice: [], // Dice available for drafting
            draftedDice: {
                PLAYER: [],
                AI: []
            },
            draftingPlayerId: null, // Whose turn to draft
            draftPhaseComplete: false
        },
        movementState: {
            currentMovingPlayerId: null,
            selectedDie: null,
            selectedPiece: null,
            usedDiceIndices: { PLAYER: [], AI: [] },
            movementPhaseComplete: false
        },
        nexusPowers: createNexusPowers(),
        roundCount: 1,
        maxRounds: 10,
        winner: null,
        gameLog: []
    };
}

function createPlayerPieces(playerId, homeBaseIndex) {
    const pieces = [];

    // Create 1 Champion
    pieces.push({
        id: `${playerId}_CHAMPION`,
        type: 'CHAMPION',
        playerId: playerId,
        position: homeBaseIndex,
        spacesTraveled: 0
    });

    // Create 6 Warriors
    for (let i = 0; i < 6; i++) {
        pieces.push({
            id: `${playerId}_WARRIOR_${i}`,
            type: 'WARRIOR',
            playerId: playerId,
            position: homeBaseIndex,
            spacesTraveled: 0
        });
    }

    return pieces;
}

function createBoardSpaces() {
    const spaces = [];
    const nexusPositions = [3, 6, 9, 12, 15, 18, 20];
    const nexusPowerNames = ['Speed', 'Vision', 'Strength', 'Recall', 'Shifting', 'Barriers', 'Momentum'];

    for (let i = 1; i <= 20; i++) {
        let type = 'NORMAL';
        let nexusPower = null;

        if (i === 1) {
            type = 'HOME_BASE_PLAYER';
        } else if (i === 11) {
            type = 'HOME_BASE_AI';
        } else if (nexusPositions.includes(i)) {
            type = 'NEXUS_POINT';
            const nexusIndex = nexusPositions.indexOf(i);
            nexusPower = nexusPowerNames[nexusIndex];
        }

        spaces.push({
            index: i,
            type: type,
            nexusPower: nexusPower,
            controllerPlayerId: null,
            pieces: [],
            barrierToken: null // For Nexus of Barriers
        });
    }

    return spaces;
}

function createNexusPowers() {
    return {
        Speed: { name: 'Nexus of Speed', description: 'Draw +1 extra die during draft (once per round)' },
        Vision: { name: 'Nexus of Vision', description: "See opponent's remaining dice" },
        Strength: { name: 'Nexus of Strength', description: 'Your Warriors cannot be bumped' },
        Recall: { name: 'Nexus of Recall', description: 'Once per turn, return one used die to your pool' },
        Shifting: { name: 'Nexus of Shifting', description: 'Split movement across two pieces' },
        Barriers: { name: 'Nexus of Barriers', description: 'Place a temporary block token' },
        Momentum: { name: 'Nexus of Momentum', description: '+2 spaces when passing through' }
    };
}

function gameLoop() {
    if (renderer && gameState) {
        renderer.render(gameState);
    }
    requestAnimationFrame(gameLoop);
}

// ========================================
// GAME FLOW FUNCTIONS
// ========================================

function startNewGame() {
    gameState = createInitialGameState();
    addToGameLog('New game started!');
    startNewRound(gameState);
}

function startNewRound(state) {
    console.log(`Starting round ${state.roundCount}...`);
    state.round = state.roundCount;
    state.phase = 'DRAFT';

    // Reset round-specific state
    state.diceState.draftPhaseComplete = false;
    state.movementState.movementPhaseComplete = false;
    state.movementState.usedDiceIndices = { PLAYER: [], AI: [] };

    addToGameLog(`Round ${state.roundCount} begins!`);

    startDiceDraftPhase(state);
}

function startDiceDraftPhase(state) {
    console.log('Starting dice draft phase...');
    state.phase = 'DRAFT';

    // Current player rolls 5 dice (or 6 if they have Nexus of Speed)
    let diceCount = 5;
    const currentPlayer = getPlayer(state, state.firstPlayerThisRound);
    if (hasNexusPower(state, state.firstPlayerThisRound, 'Speed')) {
        diceCount = 6;
        addToGameLog(`${currentPlayer.name} has Nexus of Speed - rolling 6 dice!`);
    }

    const rolledDice = rollDice(diceCount);
    state.diceState.rolledDice = rolledDice;
    state.diceState.availableDice = [...rolledDice];
    state.diceState.draftedDice = { PLAYER: [], AI: [] };
    state.diceState.draftingPlayerId = state.firstPlayerThisRound;

    addToGameLog(`${currentPlayer.name} rolled: [${rolledDice.join(', ')}]`);

    // For human vs human, wait for manual drafting
    // For now, auto-start drafting process
}

function draftNextDie(state, playerId, dieIndex) {
    if (state.phase !== 'DRAFT') {
        console.error('Not in draft phase!');
        return false;
    }

    if (state.diceState.draftingPlayerId !== playerId) {
        console.error(`Not ${playerId}'s turn to draft!`);
        return false;
    }

    if (dieIndex < 0 || dieIndex >= state.diceState.availableDice.length) {
        console.error('Invalid die index!');
        return false;
    }

    // Draft the die
    const dieValue = state.diceState.availableDice[dieIndex];
    state.diceState.draftedDice[playerId].push(dieValue);
    state.diceState.availableDice.splice(dieIndex, 1);

    addToGameLog(`${getPlayer(state, playerId).name} drafted a ${dieValue}`);

    // Check if draft is complete
    const currentPlayerDiceCount = state.diceState.draftedDice[state.firstPlayerThisRound].length;
    const opponentId = state.firstPlayerThisRound === 'PLAYER' ? 'AI' : 'PLAYER';
    const opponentDiceCount = state.diceState.draftedDice[opponentId].length;

    // Current player gets 3 dice, opponent gets 2
    if (currentPlayerDiceCount === 3 && opponentDiceCount === 2) {
        state.diceState.draftPhaseComplete = true;
        startMovementPhase(state);
        return true;
    }

    // Alternate drafting turn
    state.diceState.draftingPlayerId = (playerId === 'PLAYER') ? 'AI' : 'PLAYER';
    return true;
}

function startMovementPhase(state) {
    console.log('Starting movement phase...');
    state.phase = 'MOVEMENT';
    state.movementState.currentMovingPlayerId = state.firstPlayerThisRound;
    state.movementState.movementPhaseComplete = false;

    addToGameLog('Movement phase begins!');
}

function selectDieForMovement(state, playerId, dieIndex) {
    if (state.movementState.currentMovingPlayerId !== playerId) {
        console.error(`Not ${playerId}'s turn!`);
        return false;
    }

    const availableDice = getAvailableDiceForMovement(state, playerId);
    if (dieIndex < 0 || dieIndex >= availableDice.length) {
        console.error('Invalid die index!');
        return false;
    }

    state.movementState.selectedDie = availableDice[dieIndex];
    return true;
}

function executeMove(state, playerId, pieceId, targetPosition) {
    if (state.phase !== 'MOVEMENT') {
        console.error('Not in movement phase!');
        return false;
    }

    if (state.movementState.currentMovingPlayerId !== playerId) {
        console.error(`Not ${playerId}'s turn!`);
        return false;
    }

    const player = getPlayer(state, playerId);
    const piece = player.pieces.find(p => p.id === pieceId);

    if (!piece) {
        console.error('Piece not found!');
        return false;
    }

    const dieValue = state.movementState.selectedDie;
    if (!dieValue) {
        console.error('No die selected!');
        return false;
    }

    // Validate move
    const validMoves = getValidMoves(state, playerId, piece, dieValue);
    if (!validMoves.includes(targetPosition)) {
        console.error('Invalid move!');
        return false;
    }

    // Apply move
    applyMove(state, { playerId, piece, targetPosition, dieValue });

    // Mark die as used
    const dieIndexInDrafted = state.diceState.draftedDice[playerId].indexOf(dieValue);
    state.movementState.usedDiceIndices[playerId].push(dieIndexInDrafted);
    state.movementState.selectedDie = null;

    // Check if all dice are used
    if (allDiceUsed(state)) {
        startNexusCheckPhase(state);
    } else {
        // Switch to other player
        state.movementState.currentMovingPlayerId = (playerId === 'PLAYER') ? 'AI' : 'PLAYER';
    }

    return true;
}

function allDiceUsed(state) {
    const playerDice = state.diceState.draftedDice.PLAYER.length;
    const aiDice = state.diceState.draftedDice.AI.length;
    const playerUsed = state.movementState.usedDiceIndices.PLAYER.length;
    const aiUsed = state.movementState.usedDiceIndices.AI.length;

    return (playerUsed >= playerDice && aiUsed >= aiDice);
}

function getValidMoves(state, playerId, piece, dieValue) {
    const validTargets = [];
    const currentPosition = piece.position;

    // Calculate target position (clockwise only for now)
    let targetPosition = currentPosition + dieValue;
    if (targetPosition > 20) {
        targetPosition = targetPosition - 20;
    }

    // Check if move is valid
    const targetSpace = state.boardSpaces[targetPosition - 1];

    // Check blocking
    const enemyPieces = targetSpace.pieces.filter(p => p.playerId !== playerId);
    if (enemyPieces.length > 0) {
        // Check if blocked (must have exact die value to land)
        if (enemyPieces.length !== dieValue) {
            // Cannot land here
            return validTargets;
        }
    }

    // Champion exact landing check for opponent home
    const player = getPlayer(state, playerId);
    if (piece.type === 'CHAMPION' && targetPosition === player.opponentHomeBaseIndex) {
        // Can only land exactly
        if (targetPosition === currentPosition + dieValue ||
            (currentPosition + dieValue > 20 && targetPosition === (currentPosition + dieValue - 20))) {
            validTargets.push(targetPosition);
        }
    } else {
        validTargets.push(targetPosition);
    }

    return validTargets;
}

function applyMove(state, move) {
    const { playerId, piece, targetPosition, dieValue } = move;
    const sourceSpace = state.boardSpaces[piece.position - 1];
    const targetSpace = state.boardSpaces[targetPosition - 1];

    // Remove piece from source
    sourceSpace.pieces = sourceSpace.pieces.filter(p => p.id !== piece.id);

    // Handle bumping
    const enemyPieces = targetSpace.pieces.filter(p => p.playerId !== playerId);
    if (enemyPieces.length === 1) {
        // Bump enemy back to home
        const enemyPiece = enemyPieces[0];
        const enemyPlayer = getPlayer(state, enemyPiece.playerId);

        // Check Nexus of Strength
        if (!hasNexusPower(state, enemyPiece.playerId, 'Strength') || enemyPiece.type !== 'WARRIOR') {
            targetSpace.pieces = targetSpace.pieces.filter(p => p.id !== enemyPiece.id);
            enemyPiece.position = enemyPlayer.homeBaseIndex;
            enemyPiece.spacesTraveled = 0;

            const enemyHomeSpace = state.boardSpaces[enemyPlayer.homeBaseIndex - 1];
            enemyHomeSpace.pieces.push(enemyPiece);

            addToGameLog(`${getPlayer(state, playerId).name} bumped ${enemyPiece.type} back to home!`);
        }
    }

    // Move piece to target
    piece.position = targetPosition;
    piece.spacesTraveled += dieValue;
    targetSpace.pieces.push(piece);

    // Handle Nexus capture
    if (targetSpace.type === 'NEXUS_POINT' && piece.type === 'WARRIOR') {
        if (targetSpace.controllerPlayerId !== playerId) {
            const previousController = targetSpace.controllerPlayerId;
            targetSpace.controllerPlayerId = playerId;

            // Update counts
            updateNexusControl(state);

            addToGameLog(`${getPlayer(state, playerId).name} captured ${targetSpace.nexusPower} Nexus!`);
        }
    }

    addToGameLog(`${getPlayer(state, playerId).name} moved ${piece.type} to space ${targetPosition}`);
}

function startNexusCheckPhase(state) {
    console.log('Starting Nexus check phase...');
    state.phase = 'NEXUS_CHECK';

    // Update Nexus control counts
    updateNexusControl(state);

    // Check victory conditions
    const victoryResult = checkVictory(state);

    if (victoryResult) {
        state.winner = victoryResult.winner;
        state.phase = 'GAME_OVER';
        addToGameLog(`GAME OVER! ${getPlayer(state, victoryResult.winner).name} wins by ${victoryResult.type}!`);
        console.log('Victory:', victoryResult);
    } else {
        // Check if max rounds reached
        if (state.roundCount >= state.maxRounds) {
            // Tiebreaker
            const winner = calculateTiebreaker(state);
            state.winner = winner;
            state.phase = 'GAME_OVER';
            addToGameLog(`GAME OVER after ${state.maxRounds} rounds! ${getPlayer(state, winner).name} wins by tiebreaker!`);
        } else {
            // Start next round
            state.roundCount++;
            // Alternate first player
            state.firstPlayerThisRound = (state.firstPlayerThisRound === 'PLAYER') ? 'AI' : 'PLAYER';
            startNewRound(state);
        }
    }
}

function checkVictory(state) {
    // Check Nexus control victory (5 or more)
    for (const player of state.players) {
        if (player.controlledNexusCount >= 5) {
            return { winner: player.id, type: 'NEXUS_CONTROL' };
        }
    }

    // Check Champion reaching opponent home
    for (const player of state.players) {
        const champion = player.pieces.find(p => p.type === 'CHAMPION');
        if (champion && champion.position === player.opponentHomeBaseIndex) {
            return { winner: player.id, type: 'CHAMPION_HOME' };
        }
    }

    return null;
}

function calculateTiebreaker(state) {
    const scores = state.players.map(player => {
        const champion = player.pieces.find(p => p.type === 'CHAMPION');
        const championProgress = champion ? champion.spacesTraveled : 0;
        const score = (player.controlledNexusCount * 2) + championProgress;
        return { playerId: player.id, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].playerId;
}

function updateNexusControl(state) {
    // Reset counts
    state.players.forEach(player => {
        player.controlledNexusCount = 0;
    });

    // Count controlled Nexus
    state.boardSpaces.forEach(space => {
        if (space.type === 'NEXUS_POINT' && space.controllerPlayerId) {
            const player = getPlayer(state, space.controllerPlayerId);
            player.controlledNexusCount++;
        }
    });
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getPlayer(state, playerId) {
    return state.players.find(p => p.id === playerId);
}

function getAvailableDiceForMovement(state, playerId) {
    const draftedDice = state.diceState.draftedDice[playerId];
    const usedIndices = state.movementState.usedDiceIndices[playerId];

    return draftedDice.filter((die, index) => !usedIndices.includes(index));
}

function hasNexusPower(state, playerId, powerName) {
    // Check if player controls a Nexus with this power
    return state.boardSpaces.some(space =>
        space.type === 'NEXUS_POINT' &&
        space.nexusPower === powerName &&
        space.controllerPlayerId === playerId
    );
}

function addToGameLog(message) {
    if (gameState) {
        gameState.gameLog.push({
            round: gameState.roundCount,
            phase: gameState.phase,
            message: message,
            timestamp: Date.now()
        });

        // Keep only last 20 messages
        if (gameState.gameLog.length > 20) {
            gameState.gameLog.shift();
        }
    }
    console.log(`[LOG] ${message}`);
}
