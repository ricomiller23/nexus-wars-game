// NEXUS WARS - Board Renderer
// All canvas rendering for board, pieces, dice, and sidebar

const INTERNAL_WIDTH = 1280;
const INTERNAL_HEIGHT = 720;

function initBoardRenderer(canvasElement, gameState) {
    const ctx = canvasElement.getContext('2d');

    // Set internal resolution
    canvasElement.width = INTERNAL_WIDTH;
    canvasElement.height = INTERNAL_HEIGHT;

    // Scale to window while maintaining aspect ratio
    resizeCanvas(canvasElement);
    window.addEventListener('resize', () => resizeCanvas(canvasElement));

    return {
        canvas: canvasElement,
        ctx: ctx,
        render: (state) => {
            // Update particle system
            if (typeof particleSystem !== 'undefined') {
                particleSystem.update();
            }

            renderBoard(ctx, state);
            renderSidebar(ctx, state);

            // Render particles and animations
            if (typeof particleSystem !== 'undefined') {
                particleSystem.draw(ctx);
                particleSystem.drawAnimations(ctx);
            }

            // Render UI highlights if available
            if (typeof renderSelectedPiece === 'function') {
                renderSelectedPiece(ctx, state);
            }
            if (typeof renderMoveHighlights === 'function') {
                renderMoveHighlights(ctx, state);
            }
        }
    };
}

function resizeCanvas(canvas) {
    const windowRatio = window.innerWidth / window.innerHeight;
    const canvasRatio = INTERNAL_WIDTH / INTERNAL_HEIGHT;

    if (windowRatio > canvasRatio) {
        // Window is wider - fit to height
        canvas.style.height = '100vh';
        canvas.style.width = `${100 * canvasRatio / windowRatio}vh`;
    } else {
        // Window is taller - fit to width
        canvas.style.width = '100vw';
        canvas.style.height = `${100 / canvasRatio * windowRatio}vw`;
    }
}

function renderBoard(ctx, state) {
    // Clear canvas
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    // Board area is left 70% of canvas
    const boardCenterX = INTERNAL_WIDTH * 0.35;
    const boardCenterY = INTERNAL_HEIGHT * 0.5;
    const boardRadius = Math.min(INTERNAL_WIDTH * 0.28, INTERNAL_HEIGHT * 0.42);

    // Draw circular board
    drawCircularBoard(ctx, boardCenterX, boardCenterY, boardRadius, state);
}

function drawCircularBoard(ctx, centerX, centerY, radius, state) {
    const spaceCount = 20;
    const spaceRadius = 30;

    // Draw connection lines first (behind spaces)
    ctx.strokeStyle = 'rgba(90, 90, 110, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw directional arrows on the circle
    drawDirectionalArrows(ctx, centerX, centerY, radius);

    // Draw each space
    for (let i = 0; i < spaceCount; i++) {
        const angle = (i / spaceCount) * Math.PI * 2 - Math.PI / 2; // Start at top
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const space = state.boardSpaces[i];
        drawSpace(ctx, x, y, spaceRadius, space);
    }

    // Draw pieces on spaces
    drawPieces(ctx, centerX, centerY, radius, spaceRadius, state);
}

function drawDirectionalArrows(ctx, centerX, centerY, radius) {
    const arrowCount = 8;
    ctx.fillStyle = 'rgba(74, 158, 255, 0.3)';

    for (let i = 0; i < arrowCount; i++) {
        const angle = (i / arrowCount) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // Draw small arrow showing clockwise direction
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 8);
        ctx.fill();
        ctx.restore();
    }
}

function drawSpace(ctx, x, y, radius, space) {
    // Determine space color based on type
    let fillColor, strokeColor, glowIntensity;

    switch (space.type) {
        case 'NEXUS_POINT':
            fillColor = '#ffd700';
            strokeColor = '#ffed4e';
            glowIntensity = 12;
            break;
        case 'HOME_BASE_PLAYER':
            fillColor = '#4a9eff';
            strokeColor = '#6bb0ff';
            glowIntensity = 8;
            break;
        case 'HOME_BASE_AI':
            fillColor = '#ff4a4a';
            strokeColor = '#ff6b6b';
            glowIntensity = 8;
            break;
        default:
            fillColor = '#5a5a6e';
            strokeColor = '#7a7a8e';
            glowIntensity = 0;
    }

    // Draw glow for special spaces
    if (glowIntensity > 0) {
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = fillColor;
    }

    // Draw space circle
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw space index label
    ctx.fillStyle = space.type === 'NEXUS_POINT' ? '#000000' : '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(space.index.toString(), x, y);

    // Draw Nexus icon
    if (space.type === 'NEXUS_POINT') {
        drawNexusIcon(ctx, x, y - 15, 8);
    }

    // Draw controller indicator if controlled
    if (space.controllerPlayerId) {
        const indicatorColor = space.controllerPlayerId === 'PLAYER' ? '#4a9eff' : '#ff4a4a';
        ctx.fillStyle = indicatorColor;
        ctx.beginPath();
        ctx.arc(x, y + 18, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawNexusIcon(ctx, x, y, size) {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    // Draw a simple star shape
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const xPoint = x + Math.cos(angle) * size;
        const yPoint = y + Math.sin(angle) * size;
        if (i === 0) {
            ctx.moveTo(xPoint, yPoint);
        } else {
            ctx.lineTo(xPoint, yPoint);
        }
    }
    ctx.closePath();
    ctx.fill();
}

function drawPieces(ctx, centerX, centerY, boardRadius, spaceRadius, state) {
    const spaceCount = 20;

    // Group pieces by position
    const piecesByPosition = {};
    state.players.forEach(player => {
        player.pieces.forEach(piece => {
            if (!piecesByPosition[piece.position]) {
                piecesByPosition[piece.position] = [];
            }
            piecesByPosition[piece.position].push(piece);
        });
    });

    // Draw pieces at each position
    Object.keys(piecesByPosition).forEach(position => {
        const pos = parseInt(position);
        const pieces = piecesByPosition[pos];

        // Calculate space position
        const angle = ((pos - 1) / spaceCount) * Math.PI * 2 - Math.PI / 2;
        const spaceX = centerX + Math.cos(angle) * boardRadius;
        const spaceY = centerY + Math.sin(angle) * boardRadius;

        // Draw pieces in a stack or circle around the space
        pieces.forEach((piece, index) => {
            let offsetX = 0;
            let offsetY = 0;

            if (pieces.length > 1) {
                // Arrange multiple pieces in a small circle
                const pieceAngle = (index / pieces.length) * Math.PI * 2;
                offsetX = Math.cos(pieceAngle) * 15;
                offsetY = Math.sin(pieceAngle) * 15;
            }

            drawPiece(ctx, spaceX + offsetX, spaceY + offsetY, piece);
        });
    });
}

function drawPiece(ctx, x, y, piece) {
    const isChampion = piece.type === 'CHAMPION';
    const pieceSize = isChampion ? 18 : 12;
    const color = piece.playerId === 'PLAYER' ? '#4a9eff' : '#ff4a4a';

    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    if (isChampion) {
        // Champions are large circles
        ctx.beginPath();
        ctx.arc(x, y, pieceSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw crown symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♔', x, y);
    } else {
        // Warriors are small squares
        ctx.fillRect(x - pieceSize, y - pieceSize, pieceSize * 2, pieceSize * 2);
        ctx.strokeRect(x - pieceSize, y - pieceSize, pieceSize * 2, pieceSize * 2);
    }
}

function renderSidebar(ctx, state) {
    const sidebarX = INTERNAL_WIDTH * 0.7;
    const sidebarY = 20;
    const sidebarWidth = INTERNAL_WIDTH * 0.28;
    const sidebarHeight = INTERNAL_HEIGHT - 40;

    // Draw sidebar background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
    ctx.fillRect(sidebarX, sidebarY, sidebarWidth, sidebarHeight);

    // Draw border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(sidebarX, sidebarY, sidebarWidth, sidebarHeight);

    // Sidebar content
    let yOffset = sidebarY + 30;
    const lineHeight = 25;

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NEXUS WARS', sidebarX + 20, yOffset);
    yOffset += lineHeight * 1.5;

    // Round counter
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Round: ${state.roundCount}/${state.maxRounds}`, sidebarX + 20, yOffset);
    yOffset += lineHeight * 1.2;

    // Current Phase
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Phase:', sidebarX + 20, yOffset);
    yOffset += lineHeight;
    ctx.font = '14px sans-serif';
    const phaseColor = state.phase === 'DRAFT' ? '#4a9eff' : state.phase === 'MOVEMENT' ? '#ffd700' : '#ff6b6b';
    ctx.fillStyle = phaseColor;
    ctx.fillText(state.phase, sidebarX + 30, yOffset);
    yOffset += lineHeight * 1.5;

    // Current Player / Turn
    if (state.phase === 'DRAFT') {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Drafting:', sidebarX + 20, yOffset);
        yOffset += lineHeight;
        const draftingPlayer = state.diceState.draftingPlayerId;
        ctx.fillStyle = draftingPlayer === 'PLAYER' ? '#4a9eff' : '#ff4a4a';
        ctx.font = '14px sans-serif';
        ctx.fillText(draftingPlayer || 'None', sidebarX + 30, yOffset);
        yOffset += lineHeight * 1.5;
    } else if (state.phase === 'MOVEMENT') {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Moving:', sidebarX + 20, yOffset);
        yOffset += lineHeight;
        const movingPlayer = state.movementState.currentMovingPlayerId;
        ctx.fillStyle = movingPlayer === 'PLAYER' ? '#4a9eff' : '#ff4a4a';
        ctx.font = '14px sans-serif';
        ctx.fillText(movingPlayer || 'None', sidebarX + 30, yOffset);
        yOffset += lineHeight * 1.5;
    }

    // Dice Pool
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Dice:', sidebarX + 20, yOffset);
    yOffset += lineHeight + 5;

    if (state.phase === 'DRAFT' && state.diceState.availableDice.length > 0) {
        // Draw available dice for drafting
        drawDiceRow(ctx, sidebarX + 20, yOffset, state.diceState.availableDice, 'available');
        yOffset += 45;
    } else if (state.phase === 'MOVEMENT') {
        // Show drafted dice for both players
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#4a9eff';
        ctx.fillText('Player:', sidebarX + 30, yOffset);
        yOffset += 20;
        const playerDice = state.diceState.draftedDice.PLAYER;
        const playerUsed = state.movementState.usedDiceIndices.PLAYER;
        drawDiceRow(ctx, sidebarX + 30, yOffset, playerDice, 'player', playerUsed);
        yOffset += 45;

        ctx.fillStyle = '#ff4a4a';
        ctx.fillText('AI:', sidebarX + 30, yOffset);
        yOffset += 20;
        const aiDice = state.diceState.draftedDice.AI;
        const aiUsed = state.movementState.usedDiceIndices.AI;
        drawDiceRow(ctx, sidebarX + 30, yOffset, aiDice, 'ai', aiUsed);
        yOffset += 45;
    } else {
        ctx.fillStyle = '#a0a0b0';
        ctx.font = '12px sans-serif';
        ctx.fillText('No dice yet', sidebarX + 30, yOffset);
        yOffset += lineHeight;
    }

    // Nexus Control
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Nexus Control:', sidebarX + 20, yOffset);
    yOffset += lineHeight;

    const playerNexusCount = state.players.find(p => p.id === 'PLAYER').controlledNexusCount;
    const aiNexusCount = state.players.find(p => p.id === 'AI').controlledNexusCount;

    ctx.fillStyle = '#4a9eff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Player: ${playerNexusCount}/5`, sidebarX + 30, yOffset);
    yOffset += lineHeight;
    ctx.fillStyle = '#ff4a4a';
    ctx.fillText(`AI: ${aiNexusCount}/5`, sidebarX + 30, yOffset);
    yOffset += lineHeight * 1.5;

    // Game Log (last 5 messages)
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Game Log:', sidebarX + 20, yOffset);
    yOffset += lineHeight;

    const logMessages = state.gameLog.slice(-5);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#a0a0b0';
    logMessages.forEach(log => {
        const msg = log.message;
        // Wrap text if too long
        const maxWidth = sidebarWidth - 50;
        const words = msg.split(' ');
        let line = '';
        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, sidebarX + 30, yOffset);
                yOffset += 15;
                line = word + ' ';
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, sidebarX + 30, yOffset);
        yOffset += 16;
    });

    // Victory message if game over
    if (state.phase === 'GAME_OVER' && state.winner) {
        yOffset += 10;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px sans-serif';
        const winner = state.players.find(p => p.id === state.winner);
        ctx.fillText(`${winner.name} WINS!`, sidebarX + 20, yOffset);
    }
}

function drawDiceRow(ctx, x, y, dice, type, usedIndices = []) {
    const dieSize = 30;
    const spacing = 35;

    dice.forEach((value, index) => {
        const dieX = x + (index * spacing);
        const dieY = y;
        const isUsed = usedIndices && usedIndices.includes(index);

        // Draw die background
        if (isUsed) {
            ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
        } else if (type === 'available') {
            ctx.fillStyle = '#ffd700';
        } else if (type === 'player') {
            ctx.fillStyle = '#4a9eff';
        } else if (type === 'ai') {
            ctx.fillStyle = '#ff4a4a';
        } else {
            ctx.fillStyle = '#ffffff';
        }

        ctx.fillRect(dieX, dieY, dieSize, dieSize);

        // Draw border
        ctx.strokeStyle = isUsed ? '#505050' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(dieX, dieY, dieSize, dieSize);

        // Draw value
        ctx.fillStyle = isUsed ? '#606060' : '#000000';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toString(), dieX + dieSize / 2, dieY + dieSize / 2);
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

function countControlledNexus(state, playerId) {
    return state.boardSpaces.filter(space =>
        space.type === 'NEXUS_POINT' && space.controllerPlayerId === playerId
    ).length;
}
