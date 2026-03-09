function randomInt(max) {
  return Math.floor(Math.random() * max);
}

class SnakeGame {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.grid = 22;
    this.cell = 24;
    this.canvasSize = this.grid * this.cell;

    this.container = null;
    this.canvas = null;
    this.ctx = null;

    this.snake = [];
    this.food = { x: 0, y: 0 };
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };

    this.score = 0;
    this.apples = 0;
    this.level = 1;
    this.speedMs = 160;
    this.elapsed = 0;
    this.startedAt = 0;
    this.lastSurvivalReported = -1;

    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.roundCounted = false;

    this.loopHandle = null;
    this.keyHandler = this.onKeyDown.bind(this);
    this.touchHandler = this.onTouchControl.bind(this);
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="snake-wrapper">
        <div class="game-inline-panel">
          <div class="col">
            <span class="label">Длина</span>
            <span class="value" data-s-length>3</span>
          </div>
          <div class="col">
            <span class="label">Яблоки</span>
            <span class="value" data-s-apples>0</span>
          </div>
          <div class="col">
            <span class="label">Скорость</span>
            <span class="value" data-s-speed>1</span>
          </div>
          <div class="col">
            <span class="label">Время</span>
            <span class="value" data-s-time>0 с</span>
          </div>
        </div>
        <canvas class="game-canvas" width="${this.canvasSize}" height="${this.canvasSize}" aria-label="Игровое поле Snake"></canvas>
        <p class="hint"><strong>Управление:</strong> стрелки/WASD. Избегайте стен и собственного хвоста.</p>
        <div class="game-touch-controls dpad-touch" aria-label="Сенсорное управление Snake">
          <button class="touch-btn dpad-up" data-dir="up" type="button">▲</button>
          <button class="touch-btn dpad-left" data-dir="left" type="button">◀</button>
          <button class="touch-btn dpad-down" data-dir="down" type="button">▼</button>
          <button class="touch-btn dpad-right" data-dir="right" type="button">▶</button>
        </div>
      </div>
    `;
    this.canvas = container.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.lengthNode = container.querySelector("[data-s-length]");
    this.applesNode = container.querySelector("[data-s-apples]");
    this.speedNode = container.querySelector("[data-s-speed]");
    this.timeNode = container.querySelector("[data-s-time]");

    window.addEventListener("keydown", this.keyHandler);
    this.touchControls = container.querySelector(".game-touch-controls");
    this.touchControls?.addEventListener("click", this.touchHandler);
    this.resetState();
  }

  destroy() {
    this.stopLoop();
    window.removeEventListener("keydown", this.keyHandler);
    this.touchControls?.removeEventListener("click", this.touchHandler);
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  start() {
    if (!this.container) return;
    if (!this.started || this.ended) {
      this.resetState();
    }
    if (!this.roundCounted) {
      this.roundCounted = true;
      this.callbacks.onMetric?.("snake.gamesPlayed", 1, "add");
    }
    this.started = true;
    this.running = true;
    this.paused = false;
    this.ended = false;
    if (!this.startedAt) this.startedAt = Date.now();
    this.callbacks.onStatus?.("Идет игра");
    this.callbacks.onLevel?.(this.level);
    this.callbacks.onScore?.(this.score);
    this.stopLoop();
    this.loopHandle = window.setInterval(() => this.tick(), this.speedMs);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.paused = true;
    this.stopLoop();
    this.callbacks.onStatus?.("Пауза");
  }

  resume() {
    if (!this.started || !this.paused || this.ended) return;
    this.running = true;
    this.paused = false;
    this.callbacks.onStatus?.("Идет игра");
    this.stopLoop();
    this.loopHandle = window.setInterval(() => this.tick(), this.speedMs);
  }

  restart() {
    this.stopLoop();
    this.resetState();
    this.start();
  }

  resetState() {
    this.snake = [
      { x: 4, y: 10 },
      { x: 3, y: 10 },
      { x: 2, y: 10 }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = this.spawnFood();
    this.score = 0;
    this.apples = 0;
    this.level = 1;
    this.speedMs = 160;
    this.elapsed = 0;
    this.startedAt = 0;
    this.lastSurvivalReported = -1;
    this.roundCounted = false;
    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.callbacks.onScore?.(this.score);
    this.callbacks.onLevel?.(this.level);
    this.callbacks.onStatus?.("Готов");
    this.updateHud();
    this.render();
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    const map = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 }
    };
    const next = map[key];
    if (!next) return;
    event.preventDefault();
    this.applyDirection(next);
  }

  onTouchControl(event) {
    const button = event.target.closest("[data-dir]");
    if (!button) return;
    const dirMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const next = dirMap[button.dataset.dir];
    if (!next) return;
    this.applyDirection(next);
  }

  applyDirection(next) {
    if (!this.running || this.paused || this.ended) return;
    if (next.x === -this.direction.x && next.y === -this.direction.y) return;
    this.nextDirection = next;
  }

  spawnFood() {
    let point = { x: randomInt(this.grid), y: randomInt(this.grid) };
    while (this.snake.some((part) => part.x === point.x && part.y === point.y)) {
      point = { x: randomInt(this.grid), y: randomInt(this.grid) };
    }
    return point;
  }

  tick() {
    if (!this.running || this.paused || this.ended) return;

    this.direction = { ...this.nextDirection };
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };

    if (
      newHead.x < 0 ||
      newHead.x >= this.grid ||
      newHead.y < 0 ||
      newHead.y >= this.grid ||
      this.snake.some((part) => part.x === newHead.x && part.y === newHead.y)
    ) {
      this.endGame("Столкновение");
      return;
    }

    this.snake.unshift(newHead);

    const ate = newHead.x === this.food.x && newHead.y === this.food.y;
    if (ate) {
      this.food = this.spawnFood();
      this.apples += 1;
      this.score += 10;
      this.level = Math.floor(this.apples / 4) + 1;
      this.speedMs = Math.max(70, 160 - (this.level - 1) * 8);
      this.callbacks.onMetric?.("snake.applesEaten", 1, "add");
      this.callbacks.onMetric?.("snake.maxLength", this.snake.length, "max");
      this.callbacks.onMetric?.("snake.score", this.score, "max");
      this.callbacks.onMetric?.("snake.speedLevel", this.level, "max");
      this.callbacks.onScore?.(this.score);
      this.callbacks.onLevel?.(this.level);
      this.callbacks.onSfx?.("point");

      this.stopLoop();
      this.loopHandle = window.setInterval(() => this.tick(), this.speedMs);
    } else {
      this.snake.pop();
    }

    if (this.startedAt) {
      this.elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      if (this.elapsed !== this.lastSurvivalReported) {
        this.lastSurvivalReported = this.elapsed;
        this.callbacks.onMetric?.("snake.maxSurvival", this.elapsed, "max");
      }
    }

    this.callbacks.onMetric?.("snake.maxLength", this.snake.length, "max");
    this.updateHud();
    this.render();
  }

  endGame(reason) {
    this.running = false;
    this.paused = false;
    this.ended = true;
    this.stopLoop();
    this.callbacks.onStatus?.("Поражение");
    this.callbacks.onSfx?.("gameover");
    this.callbacks.onMetric?.("snake.score", this.score, "max");
    this.callbacks.onMetric?.("snake.maxLength", this.snake.length, "max");
    this.callbacks.onGameOver?.({
      score: this.score,
      level: this.level,
      apples: this.apples,
      reason
    });
  }

  updateHud() {
    if (this.lengthNode) this.lengthNode.textContent = String(this.snake.length);
    if (this.applesNode) this.applesNode.textContent = String(this.apples);
    if (this.speedNode) this.speedNode.textContent = String(this.level);
    if (this.timeNode) this.timeNode.textContent = `${this.elapsed} с`;
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    const bg = ctx.createLinearGradient(0, 0, 0, this.canvasSize);
    bg.addColorStop(0, "#091a2d");
    bg.addColorStop(1, "#133458");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    ctx.strokeStyle = "rgba(188, 213, 255, 0.09)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.grid; i += 1) {
      const p = i * this.cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, this.canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(this.canvasSize, p);
      ctx.stroke();
    }

    const foodRadius = this.cell * 0.38;
    const foodX = this.food.x * this.cell + this.cell / 2;
    const foodY = this.food.y * this.cell + this.cell / 2;
    const glow = ctx.createRadialGradient(foodX, foodY, 2, foodX, foodY, foodRadius + 7);
    glow.addColorStop(0, "rgba(255, 112, 137, 0.95)");
    glow.addColorStop(1, "rgba(255, 112, 137, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(foodX - 24, foodY - 24, 48, 48);
    ctx.fillStyle = "#ff6f89";
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
    ctx.fill();

    this.snake.forEach((part, idx) => {
      const x = part.x * this.cell;
      const y = part.y * this.cell;
      const isHead = idx === 0;
      const gradient = ctx.createLinearGradient(x, y, x + this.cell, y + this.cell);
      gradient.addColorStop(0, isHead ? "#94ffe0" : "#5be1b0");
      gradient.addColorStop(1, isHead ? "#4cd4ff" : "#31b885");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 2, y + 2, this.cell - 4, this.cell - 4);
      if (isHead) {
        ctx.fillStyle = "rgba(8, 20, 31, 0.85)";
        const eye = this.cell / 6;
        ctx.beginPath();
        ctx.arc(x + this.cell * 0.32, y + this.cell * 0.35, eye, 0, Math.PI * 2);
        ctx.arc(x + this.cell * 0.68, y + this.cell * 0.35, eye, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  stopLoop() {
    if (this.loopHandle) {
      clearInterval(this.loopHandle);
      this.loopHandle = null;
    }
  }
}

window.SnakeGame = SnakeGame;
