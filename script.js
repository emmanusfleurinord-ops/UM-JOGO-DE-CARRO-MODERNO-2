// ===============================
// JOGO DE CARRO MODERNO - VERSÃO FINAL COMPLETA
// Com partículas na batida, power-ups, tela de Game Over bonita e buzina
// ===============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const carSound = document.getElementById("carSound");
const crashSound = document.getElementById("crashSound");

// Configurações
let settings = {
  playerColor: "red",
  difficultyMode: "normal",
  soundEnabled: true
};

function loadSettings() {
  const saved = localStorage.getItem("gameSettings");
  if (saved) settings = { ...settings, ...JSON.parse(saved) };
}
loadSettings();

function saveSettings() {
  localStorage.setItem("gameSettings", JSON.stringify(settings));
}

// Variáveis do jogo
let player = { x: 0, y: 0, w: 50, h: 100, color: settings.playerColor };
let enemies = [];
let powerUps = [];
let particles = [];
let score = 0;
let ranking = [];
let difficulty = 1;
let gameRunning = false;
let currentLane = 1;
let roadOffset = 0;
let lastSpawnTime = 0;
let speedMultiplier = 1;

// Efeitos de power-up
let shieldActive = false;
let shieldEndTime = 0;
let slowActive = false;
let slowEndTime = 0;

// Configuração da estrada e 3 pistas
const NUM_LANES = 3;
let roadLeft = 40;
let roadWidth = 0;
let laneWidth = 0;

function initRoad() {
  roadWidth = canvas.width - 80;
  laneWidth = roadWidth / NUM_LANES;
  roadLeft = 40;
}

function getLaneX(lane) {
  return roadLeft + lane * laneWidth + (laneWidth - player.w) / 2;
}

initRoad();
player.x = getLaneX(1);
player.y = canvas.height - 130;

// Botões do menu
const startBtn = document.getElementById("startBtn");
const rankingBtn = document.getElementById("rankingBtn");
const settingsBtn = document.getElementById("settingsBtn");

if (startBtn) startBtn.onclick = startGame;
if (rankingBtn) rankingBtn.onclick = showRanking;
if (settingsBtn) settingsBtn.onclick = showSettings;

// Controles de teclado
document.addEventListener("keydown", e => {
  if (!gameRunning) return;
  if (e.key === "ArrowLeft") currentLane = Math.max(0, currentLane - 1);
  if (e.key === "ArrowRight") currentLane = Math.min(NUM_LANES - 1, currentLane + 1);
  if (e.key.toLowerCase() === "p") {
    gameRunning = !gameRunning;
    if (gameRunning) update();
  }
  if (e.key.toLowerCase() === "h") playHorn();
});

// Suporte celular (toque)
canvas.addEventListener("touchstart", e => {
  if (!gameRunning) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  currentLane = (touchX < canvas.width / 2) 
    ? Math.max(0, currentLane - 1) 
    : Math.min(NUM_LANES - 1, currentLane + 1);
}, { passive: false });

// === PARTÍCULAS (batida e efeitos) ===
function createParticles(x, y, count, color = "#ff9800") {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 30 + Math.random() * 25,
      color: color,
      size: 2.5 + Math.random() * 4
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18; // gravidade
    p.life--;
    p.size *= 0.95;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.shadowBlur = 6;
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0.1, p.life / 45);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// === BUZINA (som gerado sem arquivo) ===
function playHorn() {
  if (!settings.soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.value = 90;
    filter.type = "lowpass";
    filter.frequency.value = 350;
    gain.gain.value = 0.4;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    setTimeout(() => {
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      setTimeout(() => osc.stop(), 800);
    }, 300);
  } catch (e) {}
}

// Desenha carro realista
function drawCar(ctx, car, isPlayer = false) {
  const { x, y, w, h, color } = car;
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x + 5, y + h - 10, w - 10, 14);

  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 8, w - 4, h - 16);

  ctx.fillStyle = "#1a1a1a";
  const cabinW = w * 0.62;
  const cabinH = h * 0.32;
  const cabinX = x + (w - cabinW) / 2;

  if (isPlayer) {
    ctx.fillRect(cabinX, y + 12, cabinW, cabinH);
  } else {
    ctx.fillRect(cabinX, y + h - 12 - cabinH, cabinW, cabinH);
  }

  ctx.fillStyle = "#111111";
  const wheelW = 11, wheelH = 16;
  ctx.fillRect(x - 1, y + 6, wheelW, wheelH);
  ctx.fillRect(x + w - wheelW + 1, y + 6, wheelW, wheelH);
  ctx.fillRect(x - 1, y + h - wheelH - 6, wheelW, wheelH);
  ctx.fillRect(x + w - wheelW + 1, y + h - wheelH - 6, wheelW, wheelH);

  if (isPlayer) {
    ctx.fillStyle = "#ffeb3b";
    ctx.fillRect(x + 7, y + 3, 7, 5);
    ctx.fillRect(x + w - 14, y + 3, 7, 5);
  } else {
    ctx.fillStyle = "#ff1744";
    ctx.fillRect(x + 7, y + h - 8, 7, 5);
    ctx.fillRect(x + w - 14, y + h - 8, 7, 5);
  }

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 8, w - 4, h - 16);
  ctx.restore();
}

function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Spawn inimigo
function spawnEnemy() {
  const colors = ["#2196f3","#4caf50","#ff9800","#9c27b0","#f44336","#00bcd4"];
  const lane = Math.floor(Math.random() * NUM_LANES);
  enemies.push({
    x: roadLeft + lane * laneWidth + (laneWidth - 50)/2,
    y: -120, w: 50, h: 105,
    color: colors[Math.floor(Math.random()*colors.length)]
  });
}

// Spawn power-up
function spawnPowerUp() {
  const types = ["shield", "bonus", "slow"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * NUM_LANES);
  powerUps.push({
    x: roadLeft + lane * laneWidth + (laneWidth - 30)/2,
    y: -80, w: 30, h: 30,
    type: type
  });
}

function drawPowerUp(p) {
  ctx.save();
  const cx = p.x + p.w/2;
  const cy = p.y + p.h/2;

  if (p.type === "shield") {
    ctx.shadowColor = "#00b0ff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#00b0ff";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px Arial";
    ctx.fillText("🛡️", cx-8, cy+5);
  } else if (p.type === "bonus") {
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Arial";
    ctx.fillText("+", cx-6, cy+7);
  } else if (p.type === "slow") {
    ctx.shadowColor = "#9c27b0";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#9c27b0";
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.fillText("⏳", cx-8, cy+5);
  }
  ctx.restore();
}

// Inicia jogo
function startGame() {
  document.getElementById("menu").style.display = "none";
  canvas.style.display = "block";

  score = 0;
  enemies = [];
  powerUps = [];
  particles = [];
  difficulty = (settings.difficultyMode === "easy") ? 1 : (settings.difficultyMode === "hard") ? 2 : 1.5;
  speedMultiplier = (settings.difficultyMode === "easy") ? 0.85 : (settings.difficultyMode === "hard") ? 1.25 : 1;
  currentLane = 1;
  player.x = getLaneX(currentLane);
  player.color = settings.playerColor;
  shieldActive = false;
  slowActive = false;
  gameRunning = true;
  lastSpawnTime = Date.now();
  roadOffset = 0;

  if (settings.soundEnabled && carSound) {
    carSound.currentTime = 0;
    carSound.play().catch(() => {});
  }
  update();
}

// Ranking
function showRanking() {
  const saved = localStorage.getItem("ranking");
  if (saved) ranking = JSON.parse(saved);
  const list = document.getElementById("rankingList");
  list.innerHTML = `
    <h3 style="margin:10px 0;color:#ffd700;">🏆 Ranking Top 10</h3>
    ${ranking.length > 0 
      ? ranking.map((r,i) => `<p style="margin:5px 0;font-size:18px;">${i+1}º — <strong>${r}</strong> pontos</p>`).join("")
      : "<p style='color:#aaa'>Nenhum recorde ainda!</p>"}
  `;
}

// Configurações
function showSettings() {
  let panel = document.getElementById("settingsPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "settingsPanel";
    panel.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:#1a1a2e;color:white;padding:25px 30px;border-radius:16px;z-index:9999;
      box-shadow:0 10px 30px rgba(0,0,0,0.7);min-width:300px;border:2px solid #4fc3f7;`;
    document.body.appendChild(panel);
  }
  panel.style.display = "block";
  panel.innerHTML = `
    <h2 style="text-align:center;color:#4fc3f7;">⚙️ Configurações</h2>
    <div style="margin:15px 0;">
      <p><strong>Cor do carro:</strong></p>
      <button onclick="changePlayerColor('red')" style="background:#e53935;color:white;border:none;padding:8px 14px;border-radius:8px;margin:3px;">Vermelho</button>
      <button onclick="changePlayerColor('#2196f3')" style="background:#2196f3;color:white;border:none;padding:8px 14px;border-radius:8px;margin:3px;">Azul</button>
      <button onclick="changePlayerColor('#4caf50')" style="background:#4caf50;color:white;border:none;padding:8px 14px;border-radius:8px;margin:3px;">Verde</button>
      <button onclick="changePlayerColor('#ff9800')" style="background:#ff9800;color:white;border:none;padding:8px 14px;border-radius:8px;margin:3px;">Laranja</button>
    </div>
    <div style="margin:15px 0;">
      <p><strong>Dificuldade:</strong></p>
      <button onclick="changeDifficultyMode('easy')" style="background:#4caf50;color:white;border:none;padding:8px 12px;border-radius:8px;margin:2px;">Fácil</button>
      <button onclick="changeDifficultyMode('normal')" style="background:#ff9800;color:white;border:none;padding:8px 12px;border-radius:8px;margin:2px;">Normal</button>
      <button onclick="changeDifficultyMode('hard')" style="background:#f44336;color:white;border:none;padding:8px 12px;border-radius:8px;margin:2px;">Difícil</button>
    </div>
    <label style="display:block;margin:15px 0;">
      <input type="checkbox" id="soundToggle" ${settings.soundEnabled ? "checked" : ""} style="accent-color:#4fc3f7;">
      Som habilitado
    </label>
    <button onclick="closeSettings()" style="background:#555;color:white;border:none;padding:10px 25px;border-radius:8px;cursor:pointer;">Fechar</button>
  `;
  setTimeout(() => {
    const t = document.getElementById("soundToggle");
    if (t) t.onchange = () => { settings.soundEnabled = t.checked; saveSettings(); if (!t.checked && carSound) carSound.pause(); };
  }, 50);
}

window.changePlayerColor = c => { settings.playerColor = c; if (player) player.color = c; saveSettings(); };
window.changeDifficultyMode = m => { settings.difficultyMode = m; saveSettings(); };
function closeSettings() { 
  const p = document.getElementById("settingsPanel"); 
  if (p) p.style.display = "none"; 
}

// === TELA DE GAME OVER BONITA ===
function showGameOverScreen(finalScore, isNewRecord) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999;`;

  overlay.innerHTML = `
    <div style="background:#1a1a2e;border:4px solid #ff1744;border-radius:22px;padding:45px 55px;text-align:center;color:white;max-width:440px;box-shadow:0 0 50px rgba(255,23,68,0.5);">
      <h1 style="font-size:58px;margin:0 0 15px;color:#ff1744;text-shadow:0 0 25px #ff1744;">GAME OVER</h1>
      <p style="font-size:30px;margin:20px 0;">Sua pontuação: <strong style="color:#ffd700;font-size:36px;">${finalScore}</strong></p>
      ${isNewRecord ? `<p style="color:#4caf50;font-size:24px;margin:12px 0 20px;">🏆 NOVO RECORDE PESSOAL!</p>` : ""}
      <div style="margin-top:25px;display:flex;flex-direction:column;gap:14px;">
        <button id="restartBtn" style="background:#4caf50;color:white;border:none;padding:16px 35px;border-radius:14px;font-size:19px;cursor:pointer;font-weight:bold;">🔄 JOGAR NOVAMENTE</button>
        <button id="rankingBtn2" style="background:#2196f3;color:white;border:none;padding:16px 35px;border-radius:14px;font-size:19px;cursor:pointer;">🏆 VER RANKING</button>
        <button id="menuBtn" style="background:#555;color:white;border:none;padding:16px 35px;border-radius:14px;font-size:19px;cursor:pointer;">🏠 VOLTAR AO MENU</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#restartBtn").onclick = () => { overlay.remove(); startGame(); };
  overlay.querySelector("#rankingBtn2").onclick = () => {
    overlay.remove();
    document.getElementById("menu").style.display = "flex";
    canvas.style.display = "none";
    showRanking();
  };
  overlay.querySelector("#menuBtn").onclick = () => {
    overlay.remove();
    document.getElementById("menu").style.display = "flex";
    canvas.style.display = "none";
  };
}

// Loop principal do jogo
function update() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ESTRADA
  const scrollSpeed = 7.5;
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, 0, roadLeft, canvas.height);
  ctx.fillRect(roadLeft + roadWidth, 0, canvas.width - (roadLeft + roadWidth), canvas.height);

  ctx.fillStyle = "#37474f";
  ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

  ctx.fillStyle = "#ffc107";
  ctx.fillRect(roadLeft - 5, 0, 7, canvas.height);
  ctx.fillRect(roadLeft + roadWidth - 2, 0, 7, canvas.height);

  roadOffset += scrollSpeed;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  for (let l = 1; l < NUM_LANES; l++) {
    const lx = roadLeft + l * laneWidth;
    ctx.beginPath();
    let yPos = -(roadOffset % 95);
    while (yPos < canvas.height + 50) {
      ctx.moveTo(lx, yPos);
      ctx.lineTo(lx, yPos + 50);
      yPos += 95;
    }
    ctx.stroke();
  }

  // Movimento do jogador
  const targetX = getLaneX(currentLane);
  player.x += (targetX - player.x) * 0.18;
  player.x = Math.max(roadLeft + 10, Math.min(roadLeft + roadWidth - player.w - 10, player.x));

  // Escudo visual ao redor do carro
  if (shieldActive) {
    ctx.shadowColor = "#00b0ff";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#00b0ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x + player.w/2, player.y + player.h/2, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawCar(ctx, player, true);

  // SPAWN
  const now = Date.now();
  const spawnInterval = 1550 / (difficulty * 0.6 + 0.4);

  if (now - lastSpawnTime > spawnInterval) {
    spawnEnemy();
    if (Math.random() < 0.17) spawnPowerUp();
    lastSpawnTime = now;
  }

  // INIMIGOS
  const currentEnemySpeed = (4.8 + difficulty * 1.7) * (slowActive ? 0.42 : 1) * speedMultiplier;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += currentEnemySpeed;

    drawCar(ctx, enemy, false);

    if (checkCollision(player, enemy)) {
      if (shieldActive) {
        createParticles(enemy.x + enemy.w/2, enemy.y + enemy.h/2, 16, "#00b0ff");
        enemies.splice(i, 1);
        score += 2;
        continue;
      } else {
        if (settings.soundEnabled && crashSound) {
          crashSound.currentTime = 0;
          crashSound.play().catch(() => {});
        }
        createParticles(player.x + player.w/2, player.y + 35, 32, "#ff9800");
        gameOver();
        return;
      }
    }

    if (enemy.y > canvas.height + 70) {
      enemies.splice(i, 1);
      score++;
      if (score % 8 === 0) difficulty = Math.min(9, difficulty + 0.7);
    }
  }

  // POWER-UPS
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += 4.8;
    drawPowerUp(p);

    if (checkCollision(player, p)) {
      if (p.type === "shield") {
        shieldActive = true;
        shieldEndTime = now + 6500;
        createParticles(p.x + 15, p.y + 15, 14, "#00b0ff");
      } else if (p.type === "bonus") {
        score += 15;
        createParticles(p.x + 15, p.y + 15, 12, "#ffd700");
      } else if (p.type === "slow") {
        slowActive = true;
        slowEndTime = now + 7500;
        createParticles(p.x + 15, p.y + 15, 14, "#9c27b0");
      }
      powerUps.splice(i, 1);
      continue;
    }
    if (p.y > canvas.height + 50) powerUps.splice(i, 1);
  }

  // Atualiza efeitos temporários
  if (shieldActive && now > shieldEndTime) shieldActive = false;
  if (slowActive && now > slowEndTime) slowActive = false;

  // Partículas
  updateParticles();
  drawParticles();

  // HUD
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px Arial";
  ctx.fillText("🏁 Pontuação: " + score, 25, 38);
  ctx.fillText("🔥 Dificuldade: " + Math.floor(difficulty), 25, 68);
  ctx.fillText("⚡ Velocidade: " + Math.floor(currentEnemySpeed * 13) + " km/h", 25, 98);
  if (shieldActive) ctx.fillText("🛡️ ESCUDO ATIVO", 25, 128);
  if (slowActive) ctx.fillText("⏳ INIMIGOS LENTOS", 25, 158);
  ctx.shadowBlur = 0;

  requestAnimationFrame(update);
}

// Fim de jogo com tela bonita
function gameOver() {
  gameRunning = false;
  if (carSound) carSound.pause();

  ranking.push(score);
  ranking.sort((a, b) => b - a);
  if (ranking.length > 10) ranking = ranking.slice(0, 10);
  localStorage.setItem("ranking", JSON.stringify(ranking));

  const isNewRecord = (ranking[0] === score);
  setTimeout(() => {
    showGameOverScreen(score, isNewRecord);
  }, 100);
}

console.log("%c[✅ JOGO FINAL] Partículas + Power-ups + Tela Game Over bonita + Buzina (tecla H) carregados com sucesso!", "color:#00e676");
