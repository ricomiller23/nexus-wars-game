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
            renderBoard(ctx, state);
            renderSidebar(ctx, state);
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
    const lineHeight = 30;

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NEXUS WARS', sidebarX + 20, yOffset);
    yOffset += lineHeight * 2;

    // Current Phase
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Current Phase:', sidebarX + 20, yOffset);
    yOffset += lineHeight;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(state.phase, sidebarX + 30, yOffset);
    yOffset += lineHeight * 1.5;

    // Current Player
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Current Player:', sidebarX + 20, yOffset);
    yOffset += lineHeight;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = state.currentPlayerId === 'PLAYER' ? '#4a9eff' : '#ff4a4a';
    ctx.fillText(state.currentPlayerId, sidebarX + 30, yOffset);
    yOffset += lineHeight * 1.5;

    // Dice Pool Placeholder
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Dice Pool:', sidebarX + 20, yOffset);
    yOffset += lineHeight;
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '14px sans-serif';
    ctx.fillText('(No dice rolled yet)', sidebarX + 30, yOffset);
    yOffset += lineHeight * 1.5;

    // Controlled Nexus Count
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Nexus Control:', sidebarX + 20, yOffset);
    yOffset += lineHeight;

    const playerNexusCount = countControlledNexus(state, 'PLAYER');
    const aiNexusCount = countControlledNexus(state, 'AI');

    ctx.fillStyle = '#4a9eff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Player: ${playerNexusCount}`, sidebarX + 30, yOffset);
    yOffset += lineHeight;
    ctx.fillStyle = '#ff4a4a';
    ctx.fillText(`AI: ${aiNexusCount}`, sidebarX + 30, yOffset);
    yOffset += lineHeight * 1.5;

    // Faction Abilities Reference (Placeholder)
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Faction Abilities:', sidebarX + 20, yOffset);
    yOffset += lineHeight;
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '14px sans-serif';
    ctx.fillText('(Not yet selected)', sidebarX + 30, yOffset);
}

function countControlledNexus(state, playerId) {
    return state.boardSpaces.filter(space =>
        space.type === 'NEXUS_POINT' && space.controllerPlayerId === playerId
    ).length;
}
