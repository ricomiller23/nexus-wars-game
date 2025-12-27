// NEXUS WARS - UI Controls
// Interactive click handlers and UI management

// Store UI state
let uiState = {
    selectedDieIndex: null,
    selectedPieceId: null,
    hoveredSpaceIndex: null,
    validTargetSpaces: []
};

// Initialize UI controls
function initUIControls(canvas, state) {
    canvas.addEventListener('click', (e) => handleCanvasClick(e, canvas, state));
    canvas.addEventListener('mousemove', (e) => handleCanvasHover(e, canvas, state));
}

function handleCanvasClick(e, canvas, state) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    console.log(`Click at: ${x}, ${y}, Phase: ${state.phase}`);

    if (state.phase === 'DRAFT') {
        handleDraftClick(x, y, state);
    } else if (state.phase === 'MOVEMENT') {
        handleMovementClick(x, y, state);
    } else if (state.phase === 'GAME_OVER') {
        // Restart game on click
        if (confirm('Game Over! Start a new game?')) {
            startNewGame();
        }
    }
}

function handleDraftClick(x, y, state) {
    // Check if click is in sidebar dice area
    const sidebarX = INTERNAL_WIDTH * 0.7;
    const diceY = 350; // Matches the actual Y position where dice are rendered in sidebar
    const dieSize = 30;
    const spacing = 35;

    if (x >= sidebarX + 20 && x <= sidebarX + 20 + (state.diceState.availableDice.length * spacing) &&
        y >= diceY && y <= diceY + dieSize) {
        // Calculate which die was clicked
        const relativeX = x - (sidebarX + 20);
        const dieIndex = Math.floor(relativeX / spacing);

        if (dieIndex >= 0 && dieIndex < state.diceState.availableDice.length) {
            // Draft this die
            const currentPlayer = state.diceState.draftingPlayerId;
            console.log(`${currentPlayer} drafting die ${dieIndex}: ${state.diceState.availableDice[dieIndex]}`);
            draftNextDie(state, currentPlayer, dieIndex);
        }
    }
}

function handleMovementClick(x, y, state) {
    const currentPlayer = state.movementState.currentMovingPlayerId;

    // Check if clicking on dice (to select  die)
    const sidebarX = INTERNAL_WIDTH * 0.7;
    let diceY = 380; // Player dice Y position (matches actual rendering position)

    if (currentPlayer === 'PLAYER') {
        const dieSize = 30;
        const spacing = 35;
        const playerDice = state.diceState.draftedDice.PLAYER;
        const usedIndices = state.movementState.usedDiceIndices.PLAYER;

        if (x >= sidebarX + 30 && x <= sidebarX + 30 + (playerDice.length * spacing) &&
            y >= diceY && y <= diceY + dieSize) {
            const relativeX = x - (sidebarX + 30);
            const dieIndex = Math.floor(relativeX / spacing);

            if (dieIndex >= 0 && dieIndex < playerDice.length && !usedIndices.includes(dieIndex)) {
                uiState.selectedDieIndex = dieIndex;
                state.movementState.selectedDie = playerDice[dieIndex];
                console.log(`Selected die: ${state.movementState.selectedDie}`);

                // Clear piece selection when selecting a new die
                uiState.selectedPieceId = null;
                uiState.validTargetSpaces = [];
            }
        }
    }

    // Check if clicking on a piece (to select piece)
    if (state.movementState.selectedDie && !uiState.selectedPieceId) {
        const clickedPieceId = getPieceAtPosition(x, y, state, currentPlayer);
        if (clickedPieceId) {
            uiState.selectedPieceId = clickedPieceId;
            const player = getPlayer(state, currentPlayer);
            const piece = player.pieces.find(p => p.id === clickedPieceId);

            // Calculate valid moves
            const dieValue = state.movementState.selectedDie;
            uiState.validTargetSpaces = getValidMoves(state, currentPlayer, piece, dieValue);
            console.log(`Selected piece: ${clickedPieceId}, Valid moves:`, uiState.validTargetSpaces);
        }
    }

    // Check if clicking on a space (to execute move)
    if (state.movementState.selectedDie && uiState.selectedPieceId) {
        const clickedSpaceIndex = getSpaceAtPosition(x, y);
        if (clickedSpaceIndex && uiState.validTargetSpaces.includes(clickedSpaceIndex)) {
            console.log(`Moving piece ${uiState.selectedPieceId} to space ${clickedSpaceIndex}`);
            executeMove(state, currentPlayer, uiState.selectedPieceId, clickedSpaceIndex);

            // Clear selections
            uiState.selectedDieIndex = null;
            uiState.selectedPieceId = null;
            uiState.validTargetSpaces = [];
        }
    }
}

function getPieceAtPosition(x, y, state, playerId) {
    const boardCenterX = INTERNAL_WIDTH * 0.35;
    const boardCenterY = INTERNAL_HEIGHT * 0.5;
    const boardRadius = Math.min(INTERNAL_WIDTH * 0.28, INTERNAL_HEIGHT * 0.42);
    const spaceCount = 20;
    const clickRadius = 35; // Click detection radius

    const player = getPlayer(state, playerId);

    for (const piece of player.pieces) {
        const spaceIndex = piece.position - 1;
        const angle = (spaceIndex / spaceCount) * Math.PI * 2 - Math.PI / 2;
        const spaceX = boardCenterX + Math.cos(angle) * boardRadius;
        const spaceY = boardCenterY + Math.sin(angle) * boardRadius;

        const distance = Math.sqrt((x - spaceX) ** 2 + (y - spaceY) ** 2);
        if (distance < clickRadius) {
            return piece.id;
        }
    }

    return null;
}

function getSpaceAtPosition(x, y) {
    const boardCenterX = INTERNAL_WIDTH * 0.35;
    const boardCenterY = INTERNAL_HEIGHT * 0.5;
    const boardRadius = Math.min(INTERNAL_WIDTH * 0.28, INTERNAL_HEIGHT * 0.42);
    const spaceCount = 20;
    const clickRadius = 35;

    for (let i = 0; i < spaceCount; i++) {
        const angle = (i / spaceCount) * Math.PI * 2 - Math.PI / 2;
        const spaceX = boardCenterX + Math.cos(angle) * boardRadius;
        const spaceY = boardCenterY + Math.sin(angle) * boardRadius;

        const distance = Math.sqrt((x - spaceX) ** 2 + (y - spaceY) ** 2);
        if (distance < clickRadius) {
            return i + 1; // Spaces are 1-indexed
        }
    }

    return null;
}

function handleCanvasHover(e, canvas, state) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hoveredSpace = getSpaceAtPosition(x, y);
    if (hoveredSpace !== uiState.hoveredSpaceIndex) {
        uiState.hoveredSpaceIndex = hoveredSpace;
    }
}

// Render valid move highlights
function renderMoveHighlights(ctx, state) {
    if (uiState.validTargetSpaces.length === 0) return;

    const boardCenterX = INTERNAL_WIDTH * 0.35;
    const boardCenterY = INTERNAL_HEIGHT * 0.5;
    const boardRadius = Math.min(INTERNAL_WIDTH * 0.28, INTERNAL_HEIGHT * 0.42);
    const spaceCount = 20;
    const spaceRadius = 30;

    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 4;

    uiState.validTargetSpaces.forEach(spaceIndex => {
        const angle = ((spaceIndex - 1) / spaceCount) * Math.PI * 2 - Math.PI / 2;
        const x = boardCenterX + Math.cos(angle) * boardRadius;
        const y = boardCenterY + Math.sin(angle) * boardRadius;

        ctx.beginPath();
        ctx.arc(x, y, spaceRadius + 5, 0, Math.PI * 2);
        ctx.stroke();
    });

    ctx.restore();
}

// Render selected piece highlight
function renderSelectedPiece(ctx, state) {
    if (!uiState.selectedPieceId) return;

    const boardCenterX = INTERNAL_WIDTH * 0.35;
    const boardCenterY = INTERNAL_HEIGHT * 0.5;
    const boardRadius = Math.min(INTERNAL_WIDTH * 0.28, INTERNAL_HEIGHT * 0.42);
    const spaceCount = 20;

    const currentPlayer = state.movementState.currentMovingPlayerId;
    const player = getPlayer(state, currentPlayer);
    const piece = player.pieces.find(p => p.id === uiState.selectedPieceId);

    if (piece) {
        const spaceIndex = piece.position - 1;
        const angle = (spaceIndex / spaceCount) * Math.PI * 2 - Math.PI / 2;
        const x = boardCenterX + Math.cos(angle) * boardRadius;
        const y = boardCenterY + Math.sin(angle) * boardRadius;

        ctx.save();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
