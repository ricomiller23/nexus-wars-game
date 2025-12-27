// NEXUS WARS - Dice System
// Dice rolling, display, and basic animation

function rollDice(count) {
    const dice = [];
    for (let i = 0; i < count; i++) {
        dice.push(Math.floor(Math.random() * 6) + 1);
    }
    return dice;
}

function startDraft(gameState) {
    // To be implemented in Prompt 2
    console.log('Starting dice draft...');
}

function draftDie(gameState, playerId, dieIndex) {
    // To be implemented in Prompt 2
    console.log(`Player ${playerId} drafting die at index ${dieIndex}`);
}

// Placeholder for dice animation
function animateDiceRoll(dice, callback) {
    // Simple animation - to be enhanced in Prompt 5
    console.log('Rolling dice:', dice);
    if (callback) callback();
}
