// NEXUS WARS - Particle System
// Handles visual effects and animations

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 4;
        this.vy = options.vy || (Math.random() - 0.5) * 4;
        this.life = options.life || 1.0;
        this.decay = options.decay || 0.02;
        this.color = options.color || '#ffd700';
        this.size = options.size || 5;
        this.gravity = options.gravity !== undefined ? options.gravity : 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.animations = [];
    }

    update() {
        // Update particles
        this.particles = this.particles.filter(p => p.update());

        // Update animations
        this.animations = this.animations.filter(anim => {
            anim.progress += anim.speed;
            return anim.progress < 1.0;
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    // Create explosion effect at position
    createExplosion(x, y, color = '#ffd700', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 3;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 3 + Math.random() * 3,
                decay: 0.015,
                gravity: 0.05
            }));
        }
    }

    // Create sparkle effect
    createSparkle(x, y, color = '#ffd700', count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: color,
                size: 2 + Math.random() * 2,
                decay: 0.03,
                gravity: 0
            }));
        }
    }

    // Create trail effect
    createTrail(fromX, fromY, toX, toY, color = '#4a9eff', count = 15) {
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            setTimeout(() => {
                this.particles.push(new Particle(x, y, {
                    vx: (Math.random() - 0.5) * 1,
                    vy: (Math.random() - 0.5) * 1,
                    color: color,
                    size: 3,
                    decay: 0.025,
                    gravity: 0
                }));
            }, i * 20);
        }
    }

    // Create glow pulse animation around a point
    createGlowPulse(x, y, color = '#ffd700', duration = 1.0) {
        this.animations.push({
            type: 'glow',
            x: x,
            y: y,
            color: color,
            progress: 0,
            speed: 1 / (duration * 60),
            draw: (ctx, anim) => {
                const alpha = Math.sin(anim.progress * Math.PI);
                const radius = 30 + Math.sin(anim.progress * Math.PI) * 10;

                ctx.save();
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = anim.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(anim.x, anim.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // Animate piece movement
    animatePieceMove(piece, fromPos, toPos, boardCenterX, boardCenterY, boardRadius, callback) {
        const spaceCount = 20;
        const duration = 30; // frames

        const animation = {
            type: 'move',
            piece: piece,
            fromPos: fromPos,
            toPos: toPos,
            progress: 0,
            speed: 1 / duration,
            boardCenterX: boardCenterX,
            boardCenterY: boardCenterY,
            boardRadius: boardRadius,
            callback: callback,
            draw: (ctx, anim) => {
                // Animated piece position calculation
                const t = easeInOutQuad(anim.progress);

                // Calculate from and to angles
                const fromAngle = ((anim.fromPos - 1) / spaceCount) * Math.PI * 2 - Math.PI / 2;
                const toAngle = ((anim.toPos - 1) / spaceCount) * Math.PI * 2 - Math.PI / 2;

                // Interpolate angle
                let angle = fromAngle + (toAngle - fromAngle) * t;

                // Calculate position
                const x = anim.boardCenterX + Math.cos(angle) * anim.boardRadius;
                const y = anim.boardCenterY + Math.sin(angle) * anim.boardRadius;

                // Draw moving piece with glow
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = anim.piece.playerId === 'PLAYER' ? '#4a9eff' : '#ff4a4a';

                const isChampion = anim.piece.type === 'CHAMPION';
                const pieceSize = isChampion ? 18 : 12;
                const color = anim.piece.playerId === 'PLAYER' ? '#4a9eff' : '#ff4a4a';

                ctx.fillStyle = color;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;

                if (isChampion) {
                    ctx.beginPath();
                    ctx.arc(x, y, pieceSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('♔', x, y);
                } else {
                    ctx.fillRect(x - pieceSize, y - pieceSize, pieceSize * 2, pieceSize * 2);
                    ctx.strokeRect(x - pieceSize, y - pieceSize, pieceSize * 2, pieceSize * 2);
                }

                ctx.restore();

                // Trigger callback when animation completes
                if (anim.progress >= 1.0 && anim.callback) {
                    anim.callback();
                    anim.callback = null; // Prevent multiple calls
                }
            }
        };

        this.animations.push(animation);
    }

    drawAnimations(ctx) {
        this.animations.forEach(anim => {
            if (anim.draw) {
                anim.draw(ctx, anim);
            }
        });
    }

    clear() {
        this.particles = [];
        this.animations = [];
    }
}

// Easing function for smooth animations
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Create global particle system
const particleSystem = new ParticleSystem();
