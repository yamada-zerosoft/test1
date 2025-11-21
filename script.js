const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

const healthBars = {
  p1: document.getElementById("p1-health"),
  p2: document.getElementById("p2-health"),
};

const staminaBars = {
  p1: document.getElementById("p1-stamina"),
  p2: document.getElementById("p2-stamina"),
};

const roundText = document.getElementById("round-text");
const resetButton = document.getElementById("reset");

const gravity = 0.65;
const groundY = height - 70;
const colors = ["#6cf7b4", "#6aa8ff"];

const keyMap = {
  p1: { left: "a", right: "d", jump: "w", attack: "j", block: "k" },
  p2: { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", attack: "1", block: "2" },
};

class Fighter {
  constructor(x, color, facing) {
    this.spawnX = x;
    this.x = x;
    this.y = groundY;
    this.width = 48;
    this.height = 72;
    this.color = color;
    this.facing = facing;
    this.velX = 0;
    this.velY = 0;
    this.speed = 4.2;
    this.jumpPower = -13;
    this.onGround = true;
    this.health = 100;
    this.stamina = 100;
    this.cooldown = 0;
    this.blocking = false;
    this.attacking = false;
    this.downed = false;
  }

  reset() {
    this.x = this.spawnX;
    this.y = groundY;
    this.velX = 0;
    this.velY = 0;
    this.health = 100;
    this.stamina = 100;
    this.cooldown = 0;
    this.blocking = false;
    this.attacking = false;
    this.downed = false;
    this.onGround = true;
  }

  update(opponent, input) {
    if (this.downed) return;

    const { left, right, jump, attack, block } = input;
    this.blocking = block;

    if (left && !right) {
      this.velX = -this.speed;
      this.facing = -1;
    } else if (right && !left) {
      this.velX = this.speed;
      this.facing = 1;
    } else {
      this.velX *= 0.8;
      if (Math.abs(this.velX) < 0.1) this.velX = 0;
    }

    if (jump && this.onGround) {
      this.velY = this.jumpPower;
      this.onGround = false;
    }

    if (attack && this.cooldown <= 0 && this.stamina >= 10) {
      this.attacking = true;
      this.cooldown = 28;
      this.stamina = Math.max(0, this.stamina - 10);
      const attackReach = 50;
      const attackRange = {
        x: this.x + (this.facing === 1 ? this.width : -attackReach),
        y: this.y - this.height / 2,
        width: attackReach,
        height: this.height,
      };

      if (rectsIntersect(attackRange, opponent.asRect())) {
        const blocked = opponent.blocking && opponent.facing === -this.facing;
        const baseDamage = blocked ? 6 : 16;
        const staminaFactor = this.stamina < 15 ? 0.5 : 1;
        opponent.health = Math.max(0, opponent.health - baseDamage * staminaFactor);
        opponent.velX += this.facing * 3;
        opponent.velY = -4;
        opponent.onGround = false;
      }
    }

    // movement and physics
    this.x += this.velX;
    this.velY += gravity;
    this.y += this.velY;

    if (this.y > groundY) {
      this.y = groundY;
      this.velY = 0;
      this.onGround = true;
    }

    this.x = Math.max(30, Math.min(width - this.width - 30, this.x));

    if (this.cooldown > 0) {
      this.cooldown -= 1;
    } else {
      this.attacking = false;
    }

    if (!this.attacking && !this.blocking) {
      this.stamina = Math.min(100, this.stamina + 0.45);
    }

    if (this.health <= 0) {
      this.downed = true;
      this.velX = 0;
      this.attacking = false;
    }
  }

  asRect() {
    return { x: this.x, y: this.y - this.height, width: this.width, height: this.height };
  }

  draw(opponent) {
    const body = this.asRect();
    ctx.save();
    ctx.translate(body.x + body.width / 2, body.y + body.height / 2);
    ctx.scale(this.facing, 1);
    ctx.translate(-body.width / 2, -body.height / 2);

    ctx.fillStyle = this.downed ? "#6b738c" : this.color;
    ctx.fillRect(0, 0, body.width, body.height);

    // eyes
    ctx.fillStyle = "#0b0f17";
    ctx.fillRect(10, 16, 6, 8);
    ctx.fillRect(body.width - 16, 16, 6, 8);

    // hands / attack arc
    const handY = body.height / 2 + (this.attacking ? -6 : 0);
    ctx.fillStyle = "#f9e39a";
    ctx.fillRect(-6, handY, 12, 12);
    ctx.fillRect(body.width - 6, handY, 12, 12);

    if (this.attacking) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(body.width / 2 + this.facing * 24, handY, 28, -0.3, 0.3);
      ctx.stroke();
    }

    if (this.blocking) {
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 4;
      ctx.strokeRect(-6, -6, body.width + 12, body.height + 12);
    }

    ctx.restore();

    // shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, groundY + 4, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const p1 = new Fighter(180, colors[0], 1);
const p2 = new Fighter(width - 230, colors[1], -1);

const inputs = {
  p1: { left: false, right: false, jump: false, attack: false, block: false },
  p2: { left: false, right: false, jump: false, attack: false, block: false },
};

function rectsIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function drawBackground() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f1320";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(120, 180, 255, 0.12)";
  for (let i = 0; i < 16; i += 1) {
    ctx.fillRect(i * 60, height - 180 + (i % 2) * 6, 40, 180);
  }

  ctx.fillStyle = "#0c1a33";
  ctx.fillRect(0, groundY + 12, width, 24);
  ctx.fillStyle = "#15274a";
  ctx.fillRect(0, groundY + 36, width, 36);
}

function updateBars() {
  healthBars.p1.style.width = `${p1.health}%`;
  healthBars.p2.style.width = `${p2.health}%`;
  staminaBars.p1.style.width = `${p1.stamina}%`;
  staminaBars.p2.style.width = `${p2.stamina}%`;
}

let round = 1;
let roundOver = false;

function checkRound() {
  if (!roundOver && (p1.health <= 0 || p2.health <= 0)) {
    roundOver = true;
    roundText.textContent = p1.health <= 0 ? "Player 2 Win!" : "Player 1 Win!";
  }
}

function resetRound() {
  p1.reset();
  p2.reset();
  roundOver = false;
  round += 1;
  roundText.textContent = `Round ${round}`;
}

function gameLoop() {
  drawBackground();
  p1.update(p2, inputs.p1);
  p2.update(p1, inputs.p2);
  p1.draw(p2);
  p2.draw(p1);
  updateBars();
  checkRound();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  const key = e.key;
  Object.entries(keyMap).forEach(([player, map]) => {
    if (key === map.left) inputs[player].left = true;
    if (key === map.right) inputs[player].right = true;
    if (key === map.jump) inputs[player].jump = true;
    if (key === map.attack) inputs[player].attack = true;
    if (key === map.block) inputs[player].block = true;
  });
});

window.addEventListener("keyup", (e) => {
  const key = e.key;
  Object.entries(keyMap).forEach(([player, map]) => {
    if (key === map.left) inputs[player].left = false;
    if (key === map.right) inputs[player].right = false;
    if (key === map.jump) inputs[player].jump = false;
    if (key === map.attack) inputs[player].attack = false;
    if (key === map.block) inputs[player].block = false;
  });
});

resetButton.addEventListener("click", resetRound);

drawBackground();
p1.draw(p2);
p2.draw(p1);
updateBars();
roundText.textContent = `Round ${round}`;
requestAnimationFrame(gameLoop);
