class FlappyBirdGame {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.width = 420;
    this.height = 640;

    this.container = null;
    this.canvas = null;
    this.ctx = null;

    this.bird = { x: 96, y: 280, r: 14, vy: 0 };
    this.gravity = 0.38;
    this.jumpPower = -6.8;
    this.horizontalSpeed = 2.7;
    this.pipes = [];
    this.pipeWidth = 66;
    this.pipeGap = 170;
    this.spawnMs = 1450;
    this.spawnAccumulator = 0;

    this.score = 0;
    this.level = 1;
    this.elapsed = 0;
    this.startedAt = 0;
    this.lastSurvivalReported = -1;

    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.roundCounted = false;

    this.loopHandle = null;
    this.lastTs = 0;

    this.keyHandler = this.onKeyDown.bind(this);
    this.clickHandler = this.onFlap.bind(this);
    this.touchButtonHandler = this.onFlap.bind(this);
    this.loop = this.loop.bind(this);
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="flappy-wrapper">
        <div class="game-inline-panel">
          <div class="col">
            <span class="label">Трубы пройдены</span>
            <span class="value" data-f-score>0</span>
          </div>
          <div class="col">
            <span class="label">Скорость</span>
            <span class="value" data-f-level>1</span>
          </div>
          <div class="col">
            <span class="label">Время</span>
            <span class="value" data-f-time>0 с</span>
          </div>
          <div class="col">
            <span class="label">Текущий поток</span>
            <span class="value" data-f-flow>Нормальный</span>
          </div>
        </div>
        <canvas class="game-canvas" width="${this.width}" height="${this.height}" aria-label="Игровое поле Flappy Bird"></canvas>
        <p class="hint"><strong>Управление:</strong> пробел, стрелка вверх, W или клик/тап по экрану для прыжка.</p>
        <div class="game-touch-controls flappy-touch">
          <button class="touch-btn touch-btn-wide" data-action="flap" type="button">Взмах</button>
        </div>
      </div>
    `;
    this.canvas = container.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.scoreNode = container.querySelector("[data-f-score]");
    this.levelNode = container.querySelector("[data-f-level]");
    this.timeNode = container.querySelector("[data-f-time]");
    this.flowNode = container.querySelector("[data-f-flow]");

    window.addEventListener("keydown", this.keyHandler);
    this.canvas.addEventListener("mousedown", this.clickHandler);
    this.canvas.addEventListener("touchstart", this.clickHandler, { passive: false });
    this.touchButton = container.querySelector("[data-action='flap']");
    this.touchButton?.addEventListener("click", this.touchButtonHandler);

    this.resetState();
  }

  destroy() {
    this.stopLoop();
    window.removeEventListener("keydown", this.keyHandler);
    if (this.canvas) {
      this.canvas.removeEventListener("mousedown", this.clickHandler);
      this.canvas.removeEventListener("touchstart", this.clickHandler);
    }
    this.touchButton?.removeEventListener("click", this.touchButtonHandler);
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
      this.callbacks.onMetric?.("flappybird.gamesPlayed", 1, "add");
    }
    this.started = true;
    this.running = true;
    this.paused = false;
    this.ended = false;
    if (!this.startedAt) this.startedAt = Date.now();
    this.lastTs = performance.now();
    this.callbacks.onStatus?.("Идет игра");
    this.callbacks.onScore?.(this.score);
    this.callbacks.onLevel?.(this.level);
    this.stopLoop();
    this.loopHandle = requestAnimationFrame(this.loop);
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
    this.lastTs = performance.now();
    this.callbacks.onStatus?.("Идет игра");
    this.stopLoop();
    this.loopHandle = requestAnimationFrame(this.loop);
  }

  restart() {
    this.stopLoop();
    this.resetState();
    this.start();
  }

  resetState() {
    this.bird = { x: 96, y: 280, r: 14, vy: 0 };
    this.horizontalSpeed = 2.7;
    this.pipeGap = 170;
    this.spawnMs = 1450;
    this.spawnAccumulator = 0;
    this.pipes = [];
    this.score = 0;
    this.level = 1;
    this.elapsed = 0;
    this.startedAt = 0;
    this.lastSurvivalReported = -1;
    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.roundCounted = false;
    this.callbacks.onScore?.(this.score);
    this.callbacks.onLevel?.(this.level);
    this.callbacks.onStatus?.("Готов");
    this.updateHud();
    this.render();
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key !== " " && key !== "arrowup" && key !== "w") return;
    event.preventDefault();
    this.onFlap();
  }

  onFlap(event) {
    if (event?.cancelable) event.preventDefault();
    if (!this.running || this.paused || this.ended) return;
    this.bird.vy = this.jumpPower;
    this.callbacks.onMetric?.("flappybird.flaps", 1, "add");
    this.callbacks.onSfx?.("move");
  }

  addPipe() {
    const margin = 88;
    const gapY = margin + Math.random() * (this.height - margin * 2 - this.pipeGap);
    this.pipes.push({
      x: this.width + 20,
      width: this.pipeWidth,
      gapY,
      gapH: this.pipeGap,
      passed: false
    });
  }

  loop(ts) {
    if (!this.running) return;
    const delta = Math.min(34, ts - this.lastTs);
    this.lastTs = ts;
    const speedScale = delta / 16.67;
    this.spawnAccumulator += delta;

    if (this.spawnAccumulator >= this.spawnMs) {
      this.spawnAccumulator -= this.spawnMs;
      this.addPipe();
    }

    this.bird.vy += this.gravity * speedScale;
    this.bird.y += this.bird.vy * speedScale;

    for (let i = this.pipes.length - 1; i >= 0; i -= 1) {
      const pipe = this.pipes[i];
      pipe.x -= this.horizontalSpeed * speedScale;
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
        pipe.passed = true;
        this.score += 1;
        this.level = Math.floor(this.score / 5) + 1;
        this.horizontalSpeed = 2.7 + (this.level - 1) * 0.28;
        this.pipeGap = Math.max(128, 170 - (this.level - 1) * 4);
        this.spawnMs = Math.max(980, 1450 - (this.level - 1) * 18);
        this.callbacks.onMetric?.("flappybird.pipesPassed", 1, "add");
        this.callbacks.onMetric?.("flappybird.score", this.score, "max");
        this.callbacks.onMetric?.("flappybird.level", this.level, "max");
        this.callbacks.onScore?.(this.score);
        this.callbacks.onLevel?.(this.level);
        this.callbacks.onSfx?.("point");
      }
      if (pipe.x + pipe.width < -40) {
        this.pipes.splice(i, 1);
      }
    }

    if (this.startedAt) {
      this.elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      if (this.elapsed !== this.lastSurvivalReported) {
        this.lastSurvivalReported = this.elapsed;
        this.callbacks.onMetric?.("flappybird.maxSurvival", this.elapsed, "max");
      }
    }

    if (this.collides()) {
      this.endGame("Столкновение с трубой");
      return;
    }

    if (this.bird.y + this.bird.r > this.height - 28 || this.bird.y - this.bird.r < 0) {
      this.endGame("Выход за границы");
      return;
    }

    this.updateHud();
    this.render();
    this.loopHandle = requestAnimationFrame(this.loop);
  }

  collides() {
    const bx = this.bird.x;
    const by = this.bird.y;
    const br = this.bird.r;
    return this.pipes.some((pipe) => {
      const hitX = bx + br > pipe.x && bx - br < pipe.x + pipe.width;
      const gapTop = pipe.gapY;
      const gapBottom = pipe.gapY + pipe.gapH;
      const hitY = by - br < gapTop || by + br > gapBottom;
      return hitX && hitY;
    });
  }

  endGame(reason) {
    this.running = false;
    this.paused = false;
    this.ended = true;
    this.stopLoop();
    this.callbacks.onStatus?.("Поражение");
    this.callbacks.onSfx?.("gameover");
    this.callbacks.onMetric?.("flappybird.score", this.score, "max");
    this.callbacks.onMetric?.("flappybird.level", this.level, "max");
    this.callbacks.onGameOver?.({
      score: this.score,
      level: this.level,
      elapsed: this.elapsed,
      reason
    });
    this.render();
  }

  updateHud() {
    if (this.scoreNode) this.scoreNode.textContent = String(this.score);
    if (this.levelNode) this.levelNode.textContent = String(this.level);
    if (this.timeNode) this.timeNode.textContent = `${this.elapsed} с`;
    if (this.flowNode) {
      if (this.level < 3) this.flowNode.textContent = "Нормальный";
      else if (this.level < 6) this.flowNode.textContent = "Быстрый";
      else this.flowNode.textContent = "Экстрим";
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#6cbcff");
    sky.addColorStop(0.62, "#3f8fe8");
    sky.addColorStop(1, "#1f3e7a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    for (let i = 0; i < 5; i += 1) {
      const waveY = this.height - 30 + Math.sin((performance.now() * 0.002 + i) * 1.6) * 6;
      ctx.fillRect(i * 90 - 20, waveY, 64, 26);
    }

    this.pipes.forEach((pipe) => {
      const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
      grad.addColorStop(0, "#4ade96");
      grad.addColorStop(1, "#2ba169");
      ctx.fillStyle = grad;
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
      ctx.fillRect(pipe.x, pipe.gapY + pipe.gapH, pipe.width, this.height - pipe.gapY - pipe.gapH);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(pipe.x + 4, 0, 4, pipe.gapY);
      ctx.fillRect(pipe.x + 4, pipe.gapY + pipe.gapH, 4, this.height - pipe.gapY - pipe.gapH);
    });

    const wingY = this.bird.y + Math.sin(performance.now() * 0.018) * 3;
    const birdGrad = ctx.createRadialGradient(this.bird.x - 4, this.bird.y - 8, 3, this.bird.x, this.bird.y, 22);
    birdGrad.addColorStop(0, "#fff39f");
    birdGrad.addColorStop(1, "#ffce4a");
    ctx.fillStyle = birdGrad;
    ctx.beginPath();
    ctx.arc(this.bird.x, this.bird.y, this.bird.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f39f1d";
    ctx.beginPath();
    ctx.moveTo(this.bird.x + 9, this.bird.y + 1);
    ctx.lineTo(this.bird.x + 20, this.bird.y + 6);
    ctx.lineTo(this.bird.x + 9, this.bird.y + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(this.bird.x - 2, wingY + 3, 7, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1f2a4f";
    ctx.beginPath();
    ctx.arc(this.bird.x + 3, this.bird.y - 4, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = '700 34px "Manrope", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(String(this.score), this.width / 2, 56);
  }

  stopLoop() {
    if (this.loopHandle) {
      cancelAnimationFrame(this.loopHandle);
      this.loopHandle = null;
    }
  }
}

window.FlappyBirdGame = FlappyBirdGame;
