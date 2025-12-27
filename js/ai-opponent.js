// NEXUS WARS - AI Opponent
// AI logic for opponent behavior with strategic decision-making

// Difficulty constants
const AI_DIFFICULTY = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD'
};

let currentDifficulty = AI_DIFFICULTY.MEDIUM;

// ========================================
// PUBLIC API
// ========================================

function setAIDifficulty(difficulty) {
    currentDifficulty = difficulty;
    console.log(`AI difficulty set to: ${difficulty}`);
}

function decideDraft(gameState, difficultyLevel = currentDifficulty) {
    const availableDice = gameState.diceState.availableDice;

    if (availableDice.length === 0) {
        return 0;
    }

    switch (difficultyLevel) {
        case AI_DIFFICULTY.EASY:
            return decideRandomDraft(availableDice);
        case AI_DIFFICULTY.MEDIUM:
            return decideSmartDraft(gameState, availableDice);
        case AI_DIFFICULTY.HARD:
            return decideOptimalDraft(gameState, availableDice);
        default:
            return decideSmartDraft(gameState, availableDice);
    }
}

function decideMove(gameState, difficultyLevel = currentDifficulty) {
    switch (difficultyLevel) {
        case AI_DIFFICULTY.EASY:
            return decideRandomMove(gameState);
        case AI_DIFFICULTY.MEDIUM:
            return decideSmartMove(gameState);
        case AI_DIFFICULTY.HARD:
            return decideOptimalMove(gameState);
        default:
            return decideSmartMove(gameState);
    }
}

// ========================================
// DRAFT DECISION FUNCTIONS
// ========================================

function decideRandomDraft(availableDice) {
    // Random selection
    return Math.floor(Math.random() * availableDice.length);
}

function decideSmartDraft(gameState, availableDice) {
    const aiPlayer = getPlayer(gameState, 'AI');
    const champion = aiPlayer.pieces.find(p => p.type === 'CHAMPION');
    const opponentHome = aiPlayer.opponentHomeBaseIndex;

    // Calculate distance to opponent home
    let distanceToWin = opponentHome - champion.position;
    if (distanceToWin < 0) distanceToWin += 20;

    // Prefer higher dice values
    const diceWithIndices = availableDice.map((value, index) => ({ value, index }));

    // Sort by value, prefer high dice
    diceWithIndices.sort((a, b) => {
        // If we're close to winning, prefer exact die
        if (distanceToWin <= 6) {
            const aMatch = a.value === distanceToWin ? 100 : 0;
            const bMatch = b.value === distanceToWin ? 100 : 0;
            if (aMatch !== bMatch) return bMatch - aMatch;
        }
        // Otherwise prefer high values
        return b.value - a.value;
    });

    return diceWithIndices[0].index;
}

function decideOptimalDraft(gameState, availableDice) {
    const aiPlayer = getPlayer(gameState, 'AI');
    const humanPlayer = getPlayer(gameState, 'PLAYER');
    const champion = aiPlayer.pieces.find(p => p.type === 'CHAMPION');

    // Calculate strategic value for each die
    const diceWithScores = availableDice.map((value, index) => {
        let score = value * 2; // Base: higher is better

        // Check if die lands champion on opponent home
        const distanceToWin = calculateDistance(champion.position, aiPlayer.opponentHomeBaseIndex);
        if (value === distanceToWin) {
            score += 50; // Huge bonus for winning move
        }

        // Check if die captures Nexus
        const nexusOpportunities = countNexusOpportunities(gameState, aiPlayer, value);
        score += nexusOpportunities * 15;

        // Check if die bumps opponent
        const bumpOpportunities = countBumpOpportunities(gameState, aiPlayer, value);
        score += bumpOpportunities * 10;

        // Avoid leaving low dice for opponent
        if (availableDice.length > 1 && value <= 2) {
            score -= 5;
        }

        return { value, index, score };
    });

    diceWithScores.sort((a, b) => b.score - a.score);
    return diceWithScores[0].index;
}

// ========================================
// MOVE DECISION FUNCTIONS
// ========================================

function decideRandomMove(gameState) {
    const aiPlayer = getPlayer(gameState, 'AI');
    const availableDice = getAvailableDiceForMovement(gameState, 'AI');

    if (availableDice.length === 0) {
        return null;
    }

    // Pick random die
    const randomDie = availableDice[Math.floor(Math.random() * availableDice.length)];

    // Pick random piece that can move
    const movablePieces = aiPlayer.pieces.filter(piece => {
        const validMoves = getValidMoves(gameState, 'AI', piece, randomDie);
        return validMoves.length > 0;
    });

    if (movablePieces.length === 0) {
        return null;
    }

    const randomPiece = movablePieces[Math.floor(Math.random() * movablePieces.length)];
    const validMoves = getValidMoves(gameState, 'AI', randomPiece, randomDie);

    return {
        pieceId: randomPiece.id,
        dieValue: randomDie,
        targetPosition: validMoves[0]
    };
}

function decideSmartMove(gameState) {
    const aiPlayer = getPlayer(gameState, 'AI');
    const availableDice = getAvailableDiceForMovement(gameState, 'AI');

    if (availableDice.length === 0) {
        return null;
    }

    let bestMove = null;
    let bestScore = -Infinity;

    // Evaluate all possible moves
    for (const die of availableDice) {
        for (const piece of aiPlayer.pieces) {
            const validMoves = getValidMoves(gameState, 'AI', piece, die);

            for (const targetPos of validMoves) {
                const score = evaluateMoveScore(gameState, piece, targetPos, die);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = {
                        pieceId: piece.id,
                        dieValue: die,
                        targetPosition: targetPos
                    };
                }
            }
        }
    }

    return bestMove;
}

function decideOptimalMove(gameState) {
    const aiPlayer = getPlayer(gameState, 'AI');
    const availableDice = getAvailableDiceForMovement(gameState, 'AI');

    if (availableDice.length === 0) {
        return null;
    }

    let bestMove = null;
    let bestScore = -Infinity;

    // Advanced evaluation of all possible moves
    for (const die of availableDice) {
        for (const piece of aiPlayer.pieces) {
            const validMoves = getValidMoves(gameState, 'AI', piece, die);

            for (const targetPos of validMoves) {
                const score = evaluateMoveAdvanced(gameState, piece, targetPos, die);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = {
                        pieceId: piece.id,
                        dieValue: die,
                        targetPosition: targetPos
                    };
                }
            }
        }
    }

    return bestMove;
}

// ========================================
// EVALUATION FUNCTIONS
// ========================================

function evaluateMoveScore(gameState, piece, targetPosition, dieValue) {
    let score = 0;
    const aiPlayer = getPlayer(gameState, 'AI');
    const targetSpace = gameState.boardSpaces[targetPosition - 1];

    // Champion reaching opponent home = instant win
    if (piece.type === 'CHAMPION' && targetPosition === aiPlayer.opponentHomeBaseIndex) {
        return 1000;
    }

    // Capturing Nexus points
    if (targetSpace.type === 'NEXUS_POINT' && piece.type === 'WARRIOR') {
        if (targetSpace.controllerPlayerId !== 'AI') {
            score += 40; // High priority

            // Extra bonus if it gets us to 5 Nexus (win condition)
            if (aiPlayer.controlledNexusCount === 4) {
                score += 60;
            }
        }
    }

    // Bumping opponent pieces
    const enemyPieces = targetSpace.pieces.filter(p => p.playerId === 'PLAYER');
    if (enemyPieces.length === 1) {
        score += 25;
        if (enemyPieces[0].type === 'CHAMPION') {
            score += 15; // Extra for bumping champion
        }
    }

    // Forward progress for champion
    if (piece.type === 'CHAMPION') {
        score += dieValue * 2;
    } else {
        score += dieValue;
    }

    return score;
}

function evaluateMoveAdvanced(gameState, piece, targetPosition, dieValue) {
    let score = evaluateMoveScore(gameState, piece, targetPosition, dieValue);
    const aiPlayer = getPlayer(gameState, 'AI');
    const targetSpace = gameState.boardSpaces[targetPosition - 1];

    // Strategic positioning
    const distanceToOpponentHome = calculateDistance(targetPosition, aiPlayer.opponentHomeBaseIndex);

    // Champion positioning bonus (closer to win)
    if (piece.type === 'CHAMPION') {
        score += (20 - distanceToOpponentHome) * 1.5;
    }

    // Warrior spread bonus (control more of the board)
    if (piece.type === 'WARRIOR') {
        const nearbyPieces = countNearbyPieces(gameState, targetPosition, 'AI', 3);
        if (nearbyPieces === 0) {
            score += 10; // Bonus for spreading out
        }
    }

    // Avoid vulnerable positions (near enemy pieces)
    const nearbyEnemies = countNearbyPieces(gameState, targetPosition, 'PLAYER', 2);
    if (piece.type === 'CHAMPION' && nearbyEnemies > 0) {
        score -= 15; // Penalty for champion near enemies
    }

    // Nexus Power strategic value
    if (targetSpace.type === 'NEXUS_POINT' && targetSpace.controllerPlayerId !== 'AI') {
        const powerValue = evaluateNexusPowerValue(targetSpace.nexusPower, gameState);
        score += powerValue;
    }

    return score;
}

function evaluateNexusPowerValue(nexusPower, gameState) {
    const valueMap = {
        'Speed': 15,      // Extra die is very valuable
        'Vision': 8,      // Information is useful
        'Strength': 12,   // Protection is good
        'Recall': 10,     // Extra move flexibility
        'Shifting': 9,    // Tactical flexibility
        'Barriers': 7,    // Defensive utility
        'Momentum': 11    // Extra movement
    };

    return valueMap[nexusPower] || 5;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function calculateDistance(fromPos, toPos) {
    let distance = toPos - fromPos;
    if (distance < 0) distance += 20;
    return distance;
}

function countNexusOpportunities(gameState, player, dieValue) {
    let count = 0;
    for (const piece of player.pieces) {
        if (piece.type === 'WARRIOR') {
            let targetPos = piece.position + dieValue;
            if (targetPos > 20) targetPos -= 20;

            const targetSpace = gameState.boardSpaces[targetPos - 1];
            if (targetSpace.type === 'NEXUS_POINT' && targetSpace.controllerPlayerId !== player.id) {
                count++;
            }
        }
    }
    return count;
}

function countBumpOpportunities(gameState, player, dieValue) {
    let count = 0;
    for (const piece of player.pieces) {
        let targetPos = piece.position + dieValue;
        if (targetPos > 20) targetPos -= 20;

        const targetSpace = gameState.boardSpaces[targetPos - 1];
        const enemyPieces = targetSpace.pieces.filter(p => p.playerId !== player.id);
        if (enemyPieces.length === 1) {
            count++;
        }
    }
    return count;
}

function countNearbyPieces(gameState, position, playerId, range) {
    let count = 0;
    for (let i = 1; i <= range; i++) {
        let checkPos = position + i;
        if (checkPos > 20) checkPos -= 20;

        const space = gameState.boardSpaces[checkPos - 1];
        count += space.pieces.filter(p => p.playerId === playerId).length;
    }
    return count;
}

// AI Turn execution with delay for visual feedback
function executeAITurn(gameState) {
    if (gameState.phase === 'DRAFT' && gameState.diceState.draftingPlayerId === 'AI') {
        setTimeout(() => {
            const dieIndex = decideDraft(gameState);
            draftNextDie(gameState, 'AI', dieIndex);
        }, 800); // 800ms delay for AI thinking
    } else if (gameState.phase === 'MOVEMENT' && gameState.movementState.currentMovingPlayerId === 'AI') {
        setTimeout(() => {
            const move = decideMove(gameState);
            if (move) {
                // Select the die
                const dieIndex = gameState.diceState.draftedDice.AI.indexOf(move.dieValue);
                selectDieForMovement(gameState, 'AI', dieIndex);

                // Execute the move
                setTimeout(() => {
                    executeMove(gameState, 'AI', move.pieceId, move.targetPosition);
                }, 400);
            }
        }, 1000); // 1000ms delay for AI thinking
    }
}
