const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const carSound = document.getElementById("carSound");
const crashSound = document.getElementById("crashSound");

let player = { x: canvas.width/2, y: canvas.height-120, w: 50, h: 100, color: "red" };
let enemies = [];
let score = 0;
let ranking = [];
let difficulty = 1;
let gameRunning = false;
let roadLines = [];

document.getElementById("startBtn").onclick = startGame;
document.getElementById("rankingBtn").onclick = showRanking;

function startGame() {
  document.getElementById("menu").style.display = "none";
  canvas.style.display = "block";
  score = 0;
  enemies = [];
  difficulty = 1;
  gameRunning = true;
  carSound.play();
  update();
}

function showRanking() {
  let saved = localStorage.getItem("ranking");
  if(saved) ranking = JSON.parse(saved);
  document.getElementById("rankingList").innerHTML = "<h2>Ranking</h2>" + ranking.map((r,i)=> `<p>${i+1}º - ${r} pontos</p>`).join("");
}

document.addEventListener("keydown", e => {
  if(e.key === "ArrowLeft") player.x -= 20;
  if(e.key === "ArrowRight") player.x += 20;
});

function spawnEnemy() {
  let colors = ["blue","green","yellow","purple"];
  let enemy = {
    x: Math.random() * (canvas.width-50),
    y: -100,
    w: 50,
    h: 100,
    color: colors[Math.floor(Math.random()*colors.length)]
  };
  enemies.push(enemy);
}

function spawnRoadLines() {
  for(let i=0;i<canvas.height;i+=40){
    roadLines.push({x: canvas.width/2-5, y: i, w:10, h:20});
  }
}

function update() {
  if(!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Fundo animado (linhas da estrada)
  ctx.fillStyle = "white";
  roadLines.forEach(line=>{
    line.y += 10;
    if(line.y > canvas.height) line.y = -20;
    ctx.fillRect(line.x, line.y, line.w, line.h);
  });

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Enemies
  enemies.forEach((enemy, i) => {
    enemy.y += 5 * difficulty;
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);

    // Colisão
    if(player.x < enemy.x+enemy.w &&
       player.x+player.w > enemy.x &&
       player.y < enemy.y+enemy.h &&
       player.y+player.h > enemy.y) {
         crashSound.play();
         gameOver();
       }

    if(enemy.y > canvas.height) {
      enemies.splice(i,1);
      score++;
      if(score % 10 === 0) difficulty++; // aumenta dificuldade
    }
  });

  // Pontuação
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Pontuação: " + score, 20, 30);
  ctx.fillText("Dificuldade: " + difficulty, 20, 60);

  requestAnimationFrame(update);
}

function gameOver() {
  gameRunning = false;
  carSound.pause();
  ranking.push(score);
  ranking.sort((a,b)=>b-a);
  localStorage.setItem("ranking", JSON.stringify(ranking));
  alert("Game Over! Pontuação: " + score);
  document.getElementById("menu").style.display = "flex";
  canvas.style.display = "none";
}

setInterval(spawnEnemy, 2000);
spawnRoadLines();
