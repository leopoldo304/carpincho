const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
const coinsElement = document.getElementById('coins');
const highScoreElement = document.getElementById('high-score');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const finalCoinsElement = document.getElementById('final-coins');
const finalTimeElement = document.getElementById('final-time');
const restartBtn = document.getElementById('restart-btn');
const modeToggle = document.getElementById('mode-toggle');
const biomeIndicator = document.getElementById('biome');
const leaderboardList = document.getElementById('leaderboard-list');
const playerImg = document.getElementById('player-img');

// Audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Cargar imágenes
let carpinchoImgSrc = '';
let caimanImgSrc = '';

function loadImages() {
    // Asignar rutas relativas directamente.
    // Asegúrate de que las imágenes estén en la misma carpeta que el archivo HTML.
    carpinchoImgSrc = 'personaje.png';
    caimanImgSrc = 'obstaculo.png';

    playerImg.src = carpinchoImgSrc;
    // El caimanImgSrc se usará al generar obstáculos.
}

loadImages();

// Funciones de sonido
function playJumpSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playCoinSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function playCollisionSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 100;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Variables del juego
let playerY;
let playerVelocityY;
const gravity = 0.5;
const jumpForce = -12;

let score = 0;
let coins = 0;
let gameIsOver = false;
let gameSpeed = 5;
let obstacles = [];
let powerups = [];
let animationFrameId;
let obstacleInterval;
let powerupInterval;
let startTime;
let hasShield = false;
let shieldTimeout;
let isNightMode = false;

let highScore = parseInt(localStorage.getItem('carpinchoHighScore')) || 0;
let leaderboard = JSON.parse(localStorage.getItem('carpinchoLeaderboard')) || [];
highScoreElement.textContent = highScore;

modeToggle.addEventListener('click', () => {
    isNightMode = !isNightMode;
    document.body.classList.toggle('night-mode');
    gameContainer.classList.toggle('night');
    
    if (isNightMode) {
        modeToggle.textContent = '☀️ Modo Día';
        biomeIndicator.textContent = '🌙 Noche - corrientes';
    } else {
        modeToggle.textContent = '🌙 Modo Noche';
        biomeIndicator.textContent = '🌅 Día - corrientes';
    }
});

function startGame() {
    score = 0;
    coins = 0;
    gameIsOver = false;
    gameSpeed = 5;
    hasShield = false;
    startTime = Date.now();
    
    scoreElement.textContent = '0';
    coinsElement.textContent = '0';
    gameOverScreen.style.display = 'none';
    
    playerY = 0;
    playerVelocityY = 0;
    player.style.bottom = '50px';
    player.classList.remove('shield-active');

    obstacles.forEach(obs => obs.element && obs.element.remove());
    obstacles = [];

    powerups.forEach(pwp => pwp.element && pwp.element.remove());
    powerups = [];

    if (obstacleInterval) clearInterval(obstacleInterval);
    if (powerupInterval) clearInterval(powerupInterval);
    if (shieldTimeout) clearTimeout(shieldTimeout);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    obstacleInterval = setInterval(generateObstacle, 1800);
    powerupInterval = setInterval(generatePowerup, 5000);
    
    gameLoop();
}

function jump() {
    if (!gameIsOver && playerY === 0) {
        playerVelocityY = jumpForce;
        player.classList.add('jumping');
        playJumpSound();
        createParticles(player.offsetLeft + 35, 50, 5);
        setTimeout(() => player.classList.remove('jumping'), 300);
    }
}

function gameLoop() {
    if (gameIsOver) return;

    playerVelocityY += gravity;
    playerY -= playerVelocityY;

    if (playerY < 0) {
        playerY = 0;
        playerVelocityY = 0;
    }

    const maxHeight = gameContainer.offsetHeight - player.offsetHeight - 50;
    if (playerY > maxHeight) {
        playerY = maxHeight;
        playerVelocityY = 0;
    }

    player.style.bottom = (50 + playerY) + 'px';

    moveObstacles();
    movePowerups();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function generateObstacle() {
    if (gameIsOver) return;

    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    
    if (caimanImgSrc) {
        obstacle.innerHTML = `<div class="cactus"><img src="${caimanImgSrc}" alt="Obstáculo"></div>`;
    } else {
        obstacle.innerHTML = '<div class="cactus" style="font-size: 45px; display: flex; align-items: center; justify-content: center;">🐊</div>';
    }
    
    obstacle.style.left = gameContainer.offsetWidth + 'px';
    gameContainer.appendChild(obstacle);
    
    obstacles.push({
        element: obstacle,
        passed: false
    });
}

function generatePowerup() {
    if (gameIsOver) return;

    const powerup = document.createElement('div');
    powerup.classList.add('powerup');
    
    const type = Math.random() > 0.5 ? 'shield' : 'coin';
    powerup.classList.add('powerup-' + type);
    powerup.dataset.type = type;
    
    powerup.style.left = gameContainer.offsetWidth + 'px';
    gameContainer.appendChild(powerup);
    
    powerups.push({
        element: powerup,
        type: type,
        collected: false
    });
}

function checkCollision(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    const margin = 10;

    return !(rect1.right - margin < rect2.left || 
            rect1.left + margin > rect2.right || 
            rect1.bottom - margin < rect2.top || 
            rect1.top + margin > rect2.bottom);
}

function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = x + 'px';
        particle.style.bottom = y + 'px';
        gameContainer.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        let px = x;
        let py = y;
        let opacity = 1;

        function animateParticle() {
            px += vx;
            py += vy;
            opacity -= 0.02;

            particle.style.left = px + 'px';
            particle.style.bottom = py + 'px';
            particle.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animateParticle);
            } else {
                particle.remove();
            }
        }
        animateParticle();
    }
}

function moveObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        const obstacle = obs.element;
        
        let obstacleLeft = parseFloat(obstacle.style.left);
        obstacleLeft -= gameSpeed;
        obstacle.style.left = obstacleLeft + 'px';

        if (checkCollision(player, obstacle)) {
            if (hasShield) {
                hasShield = false;
                player.classList.remove('shield-active');
                obstacle.remove();
                obstacles.splice(i, 1);
                createParticles(obstacleLeft, 50, 10);
                continue;
            } else {
                gameOver();
                return;
            }
        }

        const playerLeft = player.offsetLeft;
        if (!obs.passed && obstacleLeft + 65 < playerLeft) {
            obs.passed = true;
            score += 10;
            scoreElement.textContent = score;
            
            // Mostrar mensaje de éxito
            showSuccessMessage();
            
            // Aumentar velocidad cada 100 puntos
            if (score % 100 === 0 && gameSpeed < 12) {
                gameSpeed += 1;
            }
        }

        if (obstacleLeft < -65) {
            obstacle.remove();
            obstacles.splice(i, 1);
        }
    }
}

function movePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pwp = powerups[i];
        const powerup = pwp.element;
        
        let powerupLeft = parseFloat(powerup.style.left);
        powerupLeft -= gameSpeed;
        powerup.style.left = powerupLeft + 'px';

        if (!pwp.collected && checkCollision(player, powerup)) {
            pwp.collected = true;
            
            if (pwp.type === 'shield') {
                hasShield = true;
                player.classList.add('shield-active');
                if (shieldTimeout) clearTimeout(shieldTimeout);
                shieldTimeout = setTimeout(() => {
                    hasShield = false;
                    player.classList.remove('shield-active');
                }, 5000);
            } else if (pwp.type === 'coin') {
                coins += 5;
                coinsElement.textContent = coins;
                playCoinSound();
            }
            
            createParticles(powerupLeft, 150, 8);
            powerup.remove();
            powerups.splice(i, 1);
            continue;
        }

        if (powerupLeft < -35) {
            powerup.remove();
            powerups.splice(i, 1);
        }
    }
}

const humorMessages = [
    '🐾 "Capibara se escondió. Dice que no te conoce."',
    '🐾 "Tu capibara pidió vacaciones después de esto."',
    '🐾 "¡Hasta una tortuga con jetpack lo habría hecho mejor!"',
    '🐾 "Capibara está practicando yoga para superar el trauma."',
    '🐾 "El capibara se fue a llorar al río."',
    '🐾 "Capibara solicitó un cambio de equipo."',
    '🐾 "El capibara se está cuestionando sus decisiones de vida."',
    '🐾 "Capibara necesita terapia después de esto."'
];

function getRandomHumorMessage() {
    return humorMessages[Math.floor(Math.random() * humorMessages.length)];
}

function showSuccessMessage() {
    const messages = ['😄 ¡ESOOO!', '🎉 ¡GENIAL!', '👍 ¡MUY BIEN!', '🔥 ¡INCREÍBLE!', '⭐ ¡PERFECTO!'];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('success-message');
    messageElement.textContent = randomMessage;

    // Posicionar justo arriba del personaje usando offset
    const left = player.offsetLeft + (player.offsetWidth / 2) - 20;
    const top = player.getBoundingClientRect().top - gameContainer.getBoundingClientRect().top - 40; // relativo a container
    messageElement.style.left = left + 'px';
    messageElement.style.top = top + 'px';
    
    gameContainer.appendChild(messageElement);
    
    // Eliminar después de la animación (1s)
    setTimeout(() => {
        messageElement.remove();
    }, 1000);
}

function gameOver() {
    gameIsOver = true;
    cancelAnimationFrame(animationFrameId);
    clearInterval(obstacleInterval);
    clearInterval(powerupInterval);
    playCollisionSound();
    
    const playTime = Math.floor((Date.now() - startTime) / 1000);
    
    finalScoreElement.textContent = score;
    finalCoinsElement.textContent = coins;
    finalTimeElement.textContent = playTime + 's';
    
    // Mostrar mensaje de humor
    document.getElementById('humor-message').textContent = getRandomHumorMessage();
    
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('carpinchoHighScore', highScore);
    }
    
    const entry = {
        score: score,
        coins: coins,
        time: playTime,
        date: new Date().toLocaleDateString()
    };
    
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem('carpinchoLeaderboard', JSON.stringify(leaderboard));
    
    displayLeaderboard(score);
    
    obstacles.forEach(obs => obs.element && obs.element.remove());
    obstacles = [];
    
    powerups.forEach(pwp => pwp.element && pwp.element.remove());
    powerups = [];
    
    gameOverScreen.style.display = 'block';
}

function displayLeaderboard(currentScore) {
    leaderboardList.innerHTML = '';
    leaderboard.forEach((entry, index) => {
        const div = document.createElement('div');
        div.classList.add('leaderboard-entry');
        if (entry.score === currentScore && index === leaderboard.findIndex(e => e.score === currentScore)) {
            div.classList.add('highlight');
        }
        div.innerHTML = `
            <span>${index + 1}. ${entry.score} pts (${entry.coins} 🪙)</span>
            <span>${entry.date}</span>
        `;
        leaderboardList.appendChild(div);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});

restartBtn.addEventListener('click', startGame);

startGame();