const RAW_MAP = [
  "###################",
  "#o.......#.......o#",
  "#.###.##.#.##.###.#",
  "#.....#..#..#.....#",
  "#.###.#.###.#.###.#",
  "#.................#",
  "#.###.#.#####.#.###",
  "#.....#...#...#...#",
  "#####.###.#.###.###",
  "#...#.....P.....#.#",
  "###.#.###GGG###.#.#",
  "#...#...#####...#.#",
  "#.#####...#...###.#",
  "#.......#.#.#.....#",
  "###.###.#.#.#.###.#",
  "#o..#...#...#...o.#",
  "#.#.#.#######.#.#.#",
  "#.#...........#.#.#",
  "#.#####.#.#.#####.#",
  "#.......#.#.......#",
  "###################"
];

const DIRS = [
  { x: 0, y: -1, key: "up" },
  { x: 1, y: 0, key: "right" },
  { x: 0, y: 1, key: "down" },
  { x: -1, y: 0, key: "left" }
];

const STOP_DIR = { x: 0, y: 0, key: "stop" };
const TURN_PRIORITY = { up: 0, left: 1, down: 2, right: 3, stop: 4 };
const GHOST_MODE_SEQUENCE = [
  { mode: "SCATTER", duration: 7000 },
  { mode: "CHASE", duration: 20000 },
  { mode: "SCATTER", duration: 7000 },
  { mode: "CHASE", duration: 20000 },
  { mode: "SCATTER", duration: 5000 },
  { mode: "CHASE", duration: 20000 },
  { mode: "SCATTER", duration: 5000 },
  { mode: "CHASE", duration: Number.POSITIVE_INFINITY }
];
const PACMAN_RUNTIME_DEFAULTS = {
  powerTimingMode: "arcade",
  customPowerDurationSec: 6,
  pelletRespawnEnabled: false,
  pelletRespawnSec: 20,
  startingLives: 3,
  restoreLifeEachLevel: false,
  maxLives: 5,
  ghostStartDelaySec: 3
};

function opposite(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

class PacmanGame {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.tile = 26;
    this.width = RAW_MAP[0].length;
    this.height = RAW_MAP.length;
    this.canvasWidth = this.width * this.tile;
    this.canvasHeight = this.height * this.tile;

    this.container = null;
    this.canvas = null;
    this.ctx = null;

    this.baseGrid = [];
    this.grid = [];
    this.dotsLeft = 0;
    this.goalDotsTotal = 0;
    this.initialConsumableSet = new Set();
    this.eatenUnique = new Set();
    this.pelletSpawns = [];
    this.pelletRespawnTimers = new Map();
    this.boardEpoch = 0;
    this.ghostMode = "SCATTER";
    this.ghostModeStep = 0;
    this.ghostModeMsLeft = GHOST_MODE_SEQUENCE[0].duration;

    this.pacmanSpawn = { x: 1, y: 1 };
    this.ghostSpawns = [];
    this.pacman = {
      x: 1,
      y: 1,
      dir: { ...DIRS[3] },
      nextDir: { ...DIRS[3] }
    };
    this.ghosts = [];

    this.score = 0;
    this.level = 1;
    this.settings = { ...PACMAN_RUNTIME_DEFAULTS };
    this.lives = this.settings.startingLives;
    this.powerMsLeft = 0;
    this.powerTicks = 0;
    // Difficulty tuning knobs:
    this.frightenedGhostSpeedMultiplier = 0.86;
    this.stepMs = 260;
    this.pacmanSpeed = 1000 / this.stepMs;
    this.ghostSpeed = this.pacmanSpeed * 0.9;
    this.ghostFreezeMs = this.settings.ghostStartDelaySec * 1000;

    this.elapsed = 0;
    this.startedAt = 0;
    this.lastSurvivalReported = -1;

    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.roundCounted = false;

    this.loopHandle = null;
    this.lastFrameTime = 0;

    this.keyHandler = this.onKeyDown.bind(this);
    this.touchHandler = this.onTouchControl.bind(this);
    this.loop = this.loop.bind(this);
  }

  normalizeSettings(rawSettings) {
    const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
    const powerTimingMode = source.powerTimingMode === "custom" ? "custom" : "arcade";
    const customPowerDurationSec = Math.max(0, Math.min(30, Number(source.customPowerDurationSec ?? PACMAN_RUNTIME_DEFAULTS.customPowerDurationSec) || 0));
    const pelletRespawnEnabled = Boolean(source.pelletRespawnEnabled);
    const pelletRespawnSec = Math.max(1, Math.min(120, Math.round(Number(source.pelletRespawnSec ?? PACMAN_RUNTIME_DEFAULTS.pelletRespawnSec) || 1)));
    const startingLives = Math.max(1, Math.min(9, Math.round(Number(source.startingLives ?? PACMAN_RUNTIME_DEFAULTS.startingLives) || 1)));
    const restoreLifeEachLevel = Boolean(source.restoreLifeEachLevel);
    const maxLives = Math.max(
      startingLives,
      Math.max(1, Math.min(12, Math.round(Number(source.maxLives ?? PACMAN_RUNTIME_DEFAULTS.maxLives) || startingLives)))
    );
    const ghostStartDelaySec = Math.max(0, Math.min(8, Number(source.ghostStartDelaySec ?? PACMAN_RUNTIME_DEFAULTS.ghostStartDelaySec) || 0));

    return {
      powerTimingMode,
      customPowerDurationSec,
      pelletRespawnEnabled,
      pelletRespawnSec,
      startingLives,
      restoreLifeEachLevel,
      maxLives,
      ghostStartDelaySec
    };
  }

  applySettings(rawSettings) {
    const next = this.normalizeSettings(rawSettings);
    this.settings = { ...next };

    if (!this.started || this.ended) {
      this.lives = this.settings.startingLives;
    } else {
      this.lives = Math.min(this.lives, this.settings.maxLives);
    }

    if (this.ghostFreezeMs > 0) {
      this.ghostFreezeMs = this.settings.ghostStartDelaySec * 1000;
    }
    this.updateHud();
  }

  getStartFreezeMs() {
    return this.settings.ghostStartDelaySec * 1000;
  }

  getActivePowerDurationMs() {
    if (this.settings.powerTimingMode === "custom") {
      return Math.round(this.settings.customPowerDurationSec * 1000);
    }
    return this.getPowerDurationMsForLevel(this.level);
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="pacman-wrapper">
        <div class="game-inline-panel">
          <div class="col">
            <span class="label">Жизни</span>
            <span class="value" data-p-lives>3</span>
          </div>
          <div class="col">
            <span class="label">Точки</span>
            <span class="value" data-p-dots>0</span>
          </div>
          <div class="col">
            <span class="label">Power</span>
            <span class="value" data-p-power>0</span>
          </div>
          <div class="col">
            <span class="label">Время</span>
            <span class="value" data-p-time>0 с</span>
          </div>
        </div>
        <canvas class="game-canvas" width="${this.canvasWidth}" height="${this.canvasHeight}" aria-label="Игровое поле Pac-Man"></canvas>
        <div class="legend">
          <span class="legend-item"><span class="legend-dot pac"></span>Pac-Man</span>
          <span class="legend-item"><span class="legend-dot ghost"></span>Призраки</span>
          <span class="legend-item"><span class="legend-dot dot"></span>Точки</span>
          <span class="legend-item"><span class="legend-dot pellet"></span>Power pellet</span>
        </div>
        <p class="hint"><strong>Управление:</strong> стрелки/WASD. Ешьте точки, избегайте призраков, используйте power pellet.</p>
        <div class="game-touch-controls dpad-touch" aria-label="Сенсорное управление Pac-Man">
          <button class="touch-btn dpad-up" data-dir="up" type="button">▲</button>
          <button class="touch-btn dpad-left" data-dir="left" type="button">◀</button>
          <button class="touch-btn dpad-down" data-dir="down" type="button">▼</button>
          <button class="touch-btn dpad-right" data-dir="right" type="button">▶</button>
        </div>
      </div>
    `;

    this.canvas = container.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.livesNode = container.querySelector("[data-p-lives]");
    this.dotsNode = container.querySelector("[data-p-dots]");
    this.powerNode = container.querySelector("[data-p-power]");
    this.timeNode = container.querySelector("[data-p-time]");
    this.touchControls = container.querySelector(".game-touch-controls");

    window.addEventListener("keydown", this.keyHandler);
    this.touchControls?.addEventListener("click", this.touchHandler);

    this.parseMap();
    this.resetState();
  }

  destroy() {
    this.stopLoop();
    this.clearPelletRespawns();
    window.removeEventListener("keydown", this.keyHandler);
    this.touchControls?.removeEventListener("click", this.touchHandler);
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  parseMap() {
    this.baseGrid = [];
    this.pacmanSpawn = { x: 1, y: 1 };
    this.ghostSpawns = [];
    this.pelletSpawns = [];

    for (let y = 0; y < RAW_MAP.length; y += 1) {
      const row = [];
      const line = RAW_MAP[y];
      for (let x = 0; x < line.length; x += 1) {
        const char = line[x];
        if (char === "#") {
          row.push(1);
        } else if (char === ".") {
          row.push(2);
        } else if (char === "o") {
          row.push(3);
          this.pelletSpawns.push({ x, y });
        } else {
          row.push(0);
          if (char === "P") this.pacmanSpawn = { x, y };
          if (char === "G") this.ghostSpawns.push({ x, y });
        }
      }
      this.baseGrid.push(row);
    }

    if (this.ghostSpawns.length === 0) {
      this.ghostSpawns = [
        { x: this.pacmanSpawn.x - 1, y: this.pacmanSpawn.y - 2 },
        { x: this.pacmanSpawn.x, y: this.pacmanSpawn.y - 2 },
        { x: this.pacmanSpawn.x + 1, y: this.pacmanSpawn.y - 2 }
      ];
    }
  }

  resetGhostModeCycle() {
    this.ghostModeStep = 0;
    this.ghostMode = GHOST_MODE_SEQUENCE[0].mode;
    this.ghostModeMsLeft = GHOST_MODE_SEQUENCE[0].duration;
  }

  reverseDirection(dir) {
    const reversed = DIRS.find((candidate) => candidate.x === -dir.x && candidate.y === -dir.y);
    return reversed ? { ...reversed } : { ...STOP_DIR };
  }

  updateGhostMode(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    // Frightened state pauses mode timer, similar to arcade pacing.
    if (this.powerMsLeft > 0) return;
    if (!Number.isFinite(this.ghostModeMsLeft)) return;

    this.ghostModeMsLeft -= deltaMs;
    while (this.ghostModeMsLeft <= 0 && this.ghostModeStep < GHOST_MODE_SEQUENCE.length - 1) {
      this.ghostModeStep += 1;
      const next = GHOST_MODE_SEQUENCE[this.ghostModeStep];
      this.ghostMode = next.mode;
      this.ghostModeMsLeft += next.duration;

      // Original-style mode switch triggers a direction reversal.
      this.ghosts.forEach((ghost) => {
        ghost.dir = this.reverseDirection(ghost.dir);
        ghost.lastDecisionTile = null;
      });
    }
  }

  isBaseWall(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.baseGrid[y][x] === 1;
  }

  findNearestWalkableTile(startX, startY) {
    const x = Math.max(0, Math.min(this.width - 1, Math.round(startX)));
    const y = Math.max(0, Math.min(this.height - 1, Math.round(startY)));
    if (!this.isBaseWall(x, y)) return { x, y };

    const maxRadius = this.width + this.height;
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const span = radius - Math.abs(dy);
        const ys = y + dy;
        const xCandidates = [x - span, x + span];
        for (let i = 0; i < xCandidates.length; i += 1) {
          const xs = xCandidates[i];
          if (this.isBaseWall(xs, ys)) continue;
          return { x: xs, y: ys };
        }
      }
    }
    return { x: this.pacmanSpawn.x, y: this.pacmanSpawn.y };
  }

  getGhostSpawnSlots(count = 4) {
    const slots = this.ghostSpawns.map((spawn) => ({ x: spawn.x, y: spawn.y }));
    const anchor = slots[1] || slots[0] || { x: this.pacmanSpawn.x, y: this.pacmanSpawn.y - 1 };
    const extras = [
      { x: anchor.x, y: anchor.y - 1 },
      { x: anchor.x - 1, y: anchor.y },
      { x: anchor.x + 1, y: anchor.y },
      { x: anchor.x, y: anchor.y + 1 }
    ];

    extras.forEach((candidate) => {
      if (slots.length >= count) return;
      const slot = this.findNearestWalkableTile(candidate.x, candidate.y);
      const exists = slots.some((item) => item.x === slot.x && item.y === slot.y);
      if (!exists) {
        slots.push(slot);
      }
    });

    while (slots.length < count) {
      const fallback = this.findNearestWalkableTile(anchor.x + (slots.length - 1), anchor.y);
      const exists = slots.some((item) => item.x === fallback.x && item.y === fallback.y);
      if (!exists) {
        slots.push(fallback);
      } else {
        break;
      }
    }

    return slots.slice(0, count);
  }

  normalizeTargetTile(x, y) {
    return this.findNearestWalkableTile(x, y);
  }

  getPacmanHeading() {
    const heading = this.pacman.dir.key === "stop" ? this.pacman.nextDir : this.pacman.dir;
    if (heading && heading.key !== "stop") return heading;
    return DIRS[1];
  }

  getAheadTile(steps) {
    const heading = this.getPacmanHeading();
    const pacX = Math.round(this.pacman.x);
    const pacY = Math.round(this.pacman.y);
    return {
      x: pacX + heading.x * steps,
      y: pacY + heading.y * steps
    };
  }

  resetBoard() {
    this.clearPelletRespawns();
    this.boardEpoch += 1;
    this.grid = this.baseGrid.map((row) => [...row]);
    this.dotsLeft = 0;
    this.goalDotsTotal = 0;
    this.initialConsumableSet = new Set();
    this.eatenUnique = new Set();
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.grid[y][x] === 2 || this.grid[y][x] === 3) {
          this.dotsLeft += 1;
          this.goalDotsTotal += 1;
          this.initialConsumableSet.add(`${x},${y}`);
        }
      }
    }
  }

  resetActors() {
    this.pacman = {
      x: this.pacmanSpawn.x,
      y: this.pacmanSpawn.y,
      dir: { ...DIRS[3] },
      nextDir: { ...DIRS[3] }
    };
    const spawnSlots = this.getGhostSpawnSlots(4);
    const definitions = [
      {
        id: "blinky",
        name: "Blinky",
        nickname: "Shadow",
        color: "#ff4f5f",
        speedMul: 1.03,
        scatterTarget: { x: this.width - 2, y: 1 }
      },
      {
        id: "pinky",
        name: "Pinky",
        nickname: "Speedy",
        color: "#ff9de2",
        speedMul: 1.0,
        scatterTarget: { x: 1, y: 1 }
      },
      {
        id: "inky",
        name: "Inky",
        nickname: "Bashful",
        color: "#6deaff",
        speedMul: 0.99,
        scatterTarget: { x: this.width - 2, y: this.height - 2 }
      },
      {
        id: "clyde",
        name: "Clyde",
        nickname: "Pokey",
        color: "#ffa95f",
        speedMul: 0.97,
        scatterTarget: { x: 1, y: this.height - 2 }
      }
    ];

    this.ghosts = definitions.map((definition, idx) => {
      const spawn = spawnSlots[idx] || this.findNearestWalkableTile(this.pacmanSpawn.x + idx, this.pacmanSpawn.y);
      return {
        ...definition,
        x: spawn.x,
        y: spawn.y,
        prevX: spawn.x,
        prevY: spawn.y,
        homeX: spawn.x,
        homeY: spawn.y,
        dir: { ...DIRS[idx % DIRS.length] },
        eyePhase: Math.random() * Math.PI * 2,
        lastDecisionTile: null,
        stuckFrames: 0,
        target: { ...definition.scatterTarget },
        mode: this.ghostMode
      };
    });
    this.ghostFreezeMs = this.getStartFreezeMs();
  }

  clearPelletRespawns() {
    this.pelletRespawnTimers.forEach((timer) => clearTimeout(timer));
    this.pelletRespawnTimers.clear();
  }

  schedulePelletRespawn(x, y) {
    if (!this.settings.pelletRespawnEnabled) return;
    const key = `${x},${y}`;
    if (this.pelletRespawnTimers.has(key)) {
      clearTimeout(this.pelletRespawnTimers.get(key));
    }
    const epoch = this.boardEpoch;
    const delayMs = this.settings.pelletRespawnSec * 1000;
    const timer = setTimeout(() => {
      this.pelletRespawnTimers.delete(key);
      if (epoch !== this.boardEpoch) return;
      if (!this.grid[y] || this.grid[y][x] !== 0) return;
      this.grid[y][x] = 3;
      this.dotsLeft += 1;
      this.render();
      this.updateHud();
    }, delayMs);
    this.pelletRespawnTimers.set(key, timer);
  }

  updateSpeeds() {
    this.pacmanSpeed = 1000 / this.stepMs;
    this.ghostSpeed = this.pacmanSpeed * 0.9;
  }

  getPowerDurationMsForLevel(level) {
    const lv = Math.max(1, Math.floor(level || 1));
    if (lv === 1) return 6000;
    if (lv === 2) return 5000;
    if (lv === 3) return 4000;
    if (lv === 4) return 3000;
    if (lv === 5) return 2000;
    if (lv === 6) return 2800;
    if (lv === 7) return 2500;
    if (lv === 8) return 2200;
    if (lv >= 9 && lv <= 18) return 1000;
    // Level 19+ in arcade behavior: no frightened blue time.
    return 0;
  }

  isCentered(entity, epsilon = 0.01) {
    return Math.abs(entity.x - Math.round(entity.x)) <= epsilon &&
      Math.abs(entity.y - Math.round(entity.y)) <= epsilon;
  }

  snapToCenter(entity) {
    entity.x = Math.round(entity.x);
    entity.y = Math.round(entity.y);
  }

  tileIsWall(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.grid[y][x] === 1;
  }

  canMoveFromTile(tileX, tileY, dir) {
    return !this.tileIsWall(tileX + dir.x, tileY + dir.y);
  }

  moveEntityContinuous(entity, speedTilesPerSec, dtSec, desiredDir = null, onCenter = null) {
    if (!Number.isFinite(dtSec) || dtSec <= 0 || speedTilesPerSec <= 0) return;
    let remaining = speedTilesPerSec * dtSec;
    let guard = 0;

    while (remaining > 0.0001 && guard < 12) {
      guard += 1;

      if (this.isCentered(entity, 0.001)) {
        this.snapToCenter(entity);
        const tx = Math.round(entity.x);
        const ty = Math.round(entity.y);
        if (typeof onCenter === "function") {
          onCenter(entity, tx, ty);
        }
        if (desiredDir && this.canMoveFromTile(tx, ty, desiredDir)) {
          entity.dir = { ...desiredDir };
        }
        if (!this.canMoveFromTile(tx, ty, entity.dir)) {
          entity.dir = STOP_DIR;
          break;
        }
      }

      if (entity.dir.x === 0 && entity.dir.y === 0) {
        break;
      }

      const axis = entity.dir.x !== 0 ? "x" : "y";
      const value = entity[axis];
      const frac = value - Math.floor(value);
      let distToNextCenter;
      if (entity.dir[axis] > 0) {
        distToNextCenter = frac < 0.000001 ? 1 : 1 - frac;
      } else {
        distToNextCenter = frac < 0.000001 ? 1 : frac;
      }

      const step = Math.min(remaining, distToNextCenter);
      entity[axis] += entity.dir[axis] * step;
      remaining -= step;

      if (Math.abs(step - distToNextCenter) < 0.000001) {
        this.snapToCenter(entity);
      }
    }
  }

  resetState() {
    this.resetBoard();
    this.resetGhostModeCycle();
    this.resetActors();
    this.score = 0;
    this.level = 1;
    this.lives = this.settings.startingLives;
    this.powerMsLeft = 0;
    this.powerTicks = 0;
    this.stepMs = 260;
    this.updateSpeeds();
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

  start() {
    if (!this.container) return;
    if (!this.started || this.ended) {
      this.resetState();
    }
    if (!this.roundCounted) {
      this.roundCounted = true;
      this.callbacks.onMetric?.("pacman.gamesPlayed", 1, "add");
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
    this.lastFrameTime = 0;
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
    this.callbacks.onStatus?.("Идет игра");
    this.stopLoop();
    this.lastFrameTime = 0;
    this.loopHandle = requestAnimationFrame(this.loop);
  }

  restart() {
    this.stopLoop();
    this.resetState();
    this.start();
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    const map = {
      arrowup: DIRS[0],
      w: DIRS[0],
      arrowright: DIRS[1],
      d: DIRS[1],
      arrowdown: DIRS[2],
      s: DIRS[2],
      arrowleft: DIRS[3],
      a: DIRS[3]
    };
    const dir = map[key];
    if (!dir) return;
    event.preventDefault();
    this.applyDirection(dir);
  }

  onTouchControl(event) {
    const button = event.target.closest("[data-dir]");
    if (!button) return;
    const map = {
      up: DIRS[0],
      right: DIRS[1],
      down: DIRS[2],
      left: DIRS[3]
    };
    const dir = map[button.dataset.dir];
    if (!dir) return;
    this.applyDirection(dir);
  }

  applyDirection(dir) {
    if (!this.running || this.paused || this.ended) return;
    this.pacman.nextDir = { ...dir };
  }

  consumeTile() {
    if (!this.isCentered(this.pacman, 0.18)) return;
    const px = Math.round(this.pacman.x);
    const py = Math.round(this.pacman.y);
    if (!this.grid[py]) return;
    const cell = this.grid[py][px];

    if (cell === 2) {
      this.grid[py][px] = 0;
      this.dotsLeft -= 1;
      this.score += 10;
      this.callbacks.onMetric?.("pacman.dotsEaten", 1, "add");
      this.callbacks.onSfx?.("point");
    } else if (cell === 3) {
      this.grid[py][px] = 0;
      this.dotsLeft -= 1;
      this.score += 50;
      this.powerMsLeft = this.getActivePowerDurationMs();
      this.powerTicks = Math.ceil(this.powerMsLeft / 1000);
      this.schedulePelletRespawn(px, py);
      this.callbacks.onMetric?.("pacman.powerPellets", 1, "add");
      this.callbacks.onSfx?.("power");
    } else {
      return;
    }

    const key = `${px},${py}`;
    if (this.initialConsumableSet.has(key)) {
      this.eatenUnique.add(key);
    }

    this.callbacks.onMetric?.("pacman.score", this.score, "max");
    this.callbacks.onScore?.(this.score);
  }

  validGhostDirs(ghost) {
    const gx = Math.round(ghost.x);
    const gy = Math.round(ghost.y);
    return DIRS.filter((dir) => !this.tileIsWall(gx + dir.x, gy + dir.y));
  }

  buildDistanceMap(targetX, targetY) {
    if (this.tileIsWall(targetX, targetY)) return null;
    const distances = Array.from({ length: this.height }, () => Array(this.width).fill(Infinity));
    const queue = [{ x: targetX, y: targetY }];
    let head = 0;
    distances[targetY][targetX] = 0;

    while (head < queue.length) {
      const current = queue[head];
      head += 1;
      const base = distances[current.y][current.x];

      for (let i = 0; i < DIRS.length; i += 1) {
        const dir = DIRS[i];
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        if (this.tileIsWall(nx, ny)) continue;
        if (distances[ny][nx] <= base + 1) continue;
        distances[ny][nx] = base + 1;
        queue.push({ x: nx, y: ny });
      }
    }

    return distances;
  }

  manhattanDistance(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  getGhostChaseTarget(ghost) {
    const pacX = Math.round(this.pacman.x);
    const pacY = Math.round(this.pacman.y);

    if (ghost.id === "blinky") {
      return this.normalizeTargetTile(pacX, pacY);
    }

    if (ghost.id === "pinky") {
      const ahead = this.getAheadTile(4);
      return this.normalizeTargetTile(ahead.x, ahead.y);
    }

    if (ghost.id === "inky") {
      const ahead = this.getAheadTile(2);
      const blinky = this.ghosts.find((item) => item.id === "blinky") || ghost;
      const blinkyX = Math.round(blinky.x);
      const blinkyY = Math.round(blinky.y);
      const vectorX = ahead.x - blinkyX;
      const vectorY = ahead.y - blinkyY;
      const targetX = ahead.x + vectorX;
      const targetY = ahead.y + vectorY;
      return this.normalizeTargetTile(targetX, targetY);
    }

    if (ghost.id === "clyde") {
      const ghostX = Math.round(ghost.x);
      const ghostY = Math.round(ghost.y);
      const distance = this.manhattanDistance(ghostX, ghostY, pacX, pacY);
      if (distance > 8) {
        return this.normalizeTargetTile(pacX, pacY);
      }
      return this.normalizeTargetTile(ghost.scatterTarget.x, ghost.scatterTarget.y);
    }

    return this.normalizeTargetTile(pacX, pacY);
  }

  getGhostTargetByMode(ghost) {
    if (this.ghostMode === "SCATTER") {
      return this.normalizeTargetTile(ghost.scatterTarget.x, ghost.scatterTarget.y);
    }
    return this.getGhostChaseTarget(ghost);
  }

  chooseGhostDir(ghost) {
    const options = this.validGhostDirs(ghost);
    if (options.length === 0) return ghost.dir;
    const powerActive = this.powerMsLeft > 0;
    const ghostX = Math.round(ghost.x);
    const ghostY = Math.round(ghost.y);
    let filtered = options.filter((dir) => !opposite(dir, ghost.dir));
    if (filtered.length === 0) filtered = options;

    const target = powerActive
      ? this.normalizeTargetTile(Math.round(this.pacman.x), Math.round(this.pacman.y))
      : this.getGhostTargetByMode(ghost);
    ghost.target = { ...target };
    ghost.mode = powerActive ? "FRIGHTENED" : this.ghostMode;
    const targetX = target.x;
    const targetY = target.y;
    const distanceMap = this.buildDistanceMap(targetX, targetY);
    let best = filtered[0];
    let bestScore = powerActive ? -Infinity : Infinity;
    let bestPriority = TURN_PRIORITY[best.key] ?? 99;

    filtered.forEach((dir) => {
      const nx = ghostX + dir.x;
      const ny = ghostY + dir.y;
      let dist = this.manhattanDistance(nx, ny, targetX, targetY);
      if (distanceMap && Number.isFinite(distanceMap[ny]?.[nx])) {
        dist = distanceMap[ny][nx];
      }
      const priority = TURN_PRIORITY[dir.key] ?? 99;

      if (powerActive) {
        if (dist > bestScore || (dist === bestScore && priority < bestPriority)) {
          bestScore = dist;
          best = dir;
          bestPriority = priority;
        }
      } else if (dist < bestScore || (dist === bestScore && priority < bestPriority)) {
        bestScore = dist;
        best = dir;
        bestPriority = priority;
      }
    });

    return best || randomItem(filtered);
  }

  moveGhosts(dtSec) {
    this.ghosts.forEach((ghost) => {
      ghost.prevX = ghost.x;
      ghost.prevY = ghost.y;

      if (ghost.dir.x === 0 && ghost.dir.y === 0 && !this.isCentered(ghost, 0.2)) {
        this.snapToCenter(ghost);
      }

      let speed = this.ghostSpeed * (ghost.speedMul || 1);
      const dotsRatio = this.goalDotsTotal > 0 ? this.dotsLeft / this.goalDotsTotal : 1;
      if (ghost.id === "blinky" && this.powerMsLeft <= 0) {
        if (dotsRatio <= 0.35) speed *= 1.08;
        if (dotsRatio <= 0.18) speed *= 1.06;
      }
      if (this.powerMsLeft > 0) {
        speed *= this.frightenedGhostSpeedMultiplier;
      }
      this.moveEntityContinuous(ghost, speed, dtSec, null, (entity, tileX, tileY) => {
        const tileKey = `${tileX},${tileY}`;
        const dirBlocked = (entity.dir.x === 0 && entity.dir.y === 0) || !this.canMoveFromTile(tileX, tileY, entity.dir);
        if (entity.lastDecisionTile !== tileKey || dirBlocked) {
          entity.dir = { ...this.chooseGhostDir(entity) };
          entity.lastDecisionTile = tileKey;
        }
      });
      if (!this.isCentered(ghost, 0.001)) {
        ghost.lastDecisionTile = null;
      }
      ghost.eyePhase += dtSec * 7;

      const moved = Math.abs(ghost.x - ghost.prevX) + Math.abs(ghost.y - ghost.prevY);
      ghost.stuckFrames = moved < 0.0005 ? (ghost.stuckFrames || 0) + 1 : 0;
      if (ghost.stuckFrames >= 8) {
        if (!this.isCentered(ghost, 0.2)) {
          this.snapToCenter(ghost);
        }
        const fallbackDirs = this.validGhostDirs(ghost);
        if (fallbackDirs.length > 0) {
          ghost.dir = { ...randomItem(fallbackDirs) };
        } else {
          ghost.dir = { ...STOP_DIR };
        }
        ghost.lastDecisionTile = null;
        ghost.stuckFrames = 0;
      }
    });
  }

  handleCollisions() {
    for (let i = 0; i < this.ghosts.length; i += 1) {
      const ghost = this.ghosts[i];
      const dx = ghost.x - this.pacman.x;
      const dy = ghost.y - this.pacman.y;
      const hit = dx * dx + dy * dy <= 0.36;
      if (!hit) continue;

      if (this.powerMsLeft > 0) {
        this.score += 200;
        ghost.x = ghost.homeX;
        ghost.y = ghost.homeY;
        ghost.prevX = ghost.homeX;
        ghost.prevY = ghost.homeY;
        ghost.dir = { ...DIRS[Math.floor(Math.random() * DIRS.length)] };
        ghost.lastDecisionTile = null;
        ghost.stuckFrames = 0;
        this.callbacks.onMetric?.("pacman.ghostsEaten", 1, "add");
        this.callbacks.onMetric?.("pacman.score", this.score, "max");
        this.callbacks.onScore?.(this.score);
        this.callbacks.onSfx?.("achievement");
        continue;
      }

      if (this.ghostFreezeMs > 0) continue;

      this.lives -= 1;
      this.callbacks.onSfx?.("gameover");
      if (this.lives <= 0) {
        this.endGame("Все жизни потеряны");
        return true;
      }

      this.resetActors();
      this.resetGhostModeCycle();
      this.powerMsLeft = 0;
      this.powerTicks = 0;
      const freezeSec = this.settings.ghostStartDelaySec;
      if (freezeSec > 0) {
        this.callbacks.onStatus?.(`Новая жизнь: призраки стартуют через ${freezeSec}с`);
      } else {
        this.callbacks.onStatus?.("Новая жизнь");
      }
      return true;
    }
    return false;
  }

  nextLevel() {
    this.level += 1;
    this.stepMs = Math.max(160, 260 - (this.level - 1) * 4);
    this.updateSpeeds();
    this.powerMsLeft = 0;
    this.powerTicks = 0;
    if (this.settings.restoreLifeEachLevel) {
      this.lives = Math.min(this.settings.maxLives, this.lives + 1);
    } else {
      this.lives = Math.min(this.lives, this.settings.maxLives);
    }
    this.callbacks.onMetric?.("pacman.levelsCompleted", 1, "add");
    this.callbacks.onMetric?.("pacman.maxLevel", this.level, "max");
    this.callbacks.onLevel?.(this.level);
    this.callbacks.onStatus?.(`Уровень ${this.level}`);
    this.callbacks.onSfx?.("power");
    this.resetBoard();
    this.resetGhostModeCycle();
    this.resetActors();
  }

  updateGame(dtSec, deltaMs) {
    this.moveEntityContinuous(this.pacman, this.pacmanSpeed, dtSec, this.pacman.nextDir);
    this.consumeTile();
    this.updateGhostMode(deltaMs);

    this.ghostFreezeMs = Math.max(0, this.ghostFreezeMs - deltaMs);
    if (this.ghostFreezeMs <= 0) {
      this.moveGhosts(dtSec);
    }

    const interrupted = this.handleCollisions();
    if (interrupted) return;

    if (this.powerMsLeft > 0) {
      this.powerMsLeft = Math.max(0, this.powerMsLeft - deltaMs);
      this.powerTicks = Math.ceil(this.powerMsLeft / 1000);
    } else {
      this.powerTicks = 0;
    }

    if (this.dotsLeft <= 0) {
      this.nextLevel();
      return;
    }
  }

  loop(ts) {
    if (!this.running || this.paused || this.ended) return;
    if (!this.lastFrameTime) this.lastFrameTime = ts;
    const frameDelta = Math.max(0, ts - this.lastFrameTime);
    const deltaMs = Math.max(1, Math.min(40, frameDelta));
    this.lastFrameTime = ts;
    const dtSec = deltaMs / 1000;

    this.updateGame(dtSec, deltaMs);

    if (this.startedAt) {
      this.elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      if (this.elapsed !== this.lastSurvivalReported) {
        this.lastSurvivalReported = this.elapsed;
        this.callbacks.onMetric?.("pacman.maxSurvival", this.elapsed, "max");
      }
    }

    this.updateHud();
    this.render();
    this.loopHandle = requestAnimationFrame(this.loop);
  }

  endGame(reason, won = false) {
    this.running = false;
    this.paused = false;
    this.ended = true;
    this.stopLoop();
    this.clearPelletRespawns();
    this.callbacks.onStatus?.(won ? "Победа" : "Поражение");
    this.callbacks.onMetric?.("pacman.score", this.score, "max");
    this.callbacks.onMetric?.("pacman.maxLevel", this.level, "max");
    this.callbacks.onGameOver?.({
      score: this.score,
      level: this.level,
      lives: this.lives,
      reason,
      won
    });
    this.render();
  }

  updateHud() {
    if (this.livesNode) this.livesNode.textContent = String(this.lives);
    if (this.dotsNode) this.dotsNode.textContent = String(this.dotsLeft);
    if (this.powerNode) this.powerNode.textContent = String(this.powerTicks);
    if (this.timeNode) this.timeNode.textContent = `${this.elapsed} с`;
  }

  drawWalls() {
    const ctx = this.ctx;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.grid[y][x] !== 1) continue;
        const px = x * this.tile;
        const py = y * this.tile;
        const g = ctx.createLinearGradient(px, py, px + this.tile, py + this.tile);
        g.addColorStop(0, "#2f6ff5");
        g.addColorStop(1, "#2047a8");
        ctx.fillStyle = g;
        ctx.fillRect(px + 1, py + 1, this.tile - 2, this.tile - 2);
      }
    }
  }

  drawDots() {
    const ctx = this.ctx;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const cell = this.grid[y][x];
        if (cell !== 2 && cell !== 3) continue;
        const cx = x * this.tile + this.tile / 2;
        const cy = y * this.tile + this.tile / 2;
        if (cell === 2) {
          ctx.fillStyle = "#f4f8ff";
          ctx.beginPath();
          ctx.arc(cx, cy, 2.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const pulse = 4 + Math.sin(performance.now() * 0.01) * 1.2;
          ctx.fillStyle = "#83ffe2";
          ctx.beginPath();
          ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawPacman() {
    const ctx = this.ctx;
    const x = this.pacman.x * this.tile + this.tile / 2;
    const y = this.pacman.y * this.tile + this.tile / 2;
    const radius = this.tile * 0.44;
    const moving = this.pacman.dir.x !== 0 || this.pacman.dir.y !== 0;
    const wave = (Math.sin(performance.now() * 0.018) + 1) / 2;
    const mouth = moving ? 0.08 + wave * 0.45 : 0.13;

    const faceDir = this.pacman.dir.key === "stop" ? this.pacman.nextDir : this.pacman.dir;
    let angle = 0;
    if (faceDir.key === "right") angle = 0;
    if (faceDir.key === "left") angle = Math.PI;
    if (faceDir.key === "up") angle = -Math.PI / 2;
    if (faceDir.key === "down") angle = Math.PI / 2;

    ctx.fillStyle = "#ffe76e";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, angle + mouth, angle + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
  }

  drawGhosts() {
    const ctx = this.ctx;
    this.ghosts.forEach((ghost) => {
      const x = ghost.x * this.tile + this.tile / 2;
      const bob = Math.sin(performance.now() * 0.012 + ghost.eyePhase) * 1.2;
      const y = ghost.y * this.tile + this.tile / 2 + 2 + bob;
      const r = this.tile * 0.39;
      const frightened = this.powerMsLeft > 0;
      ctx.fillStyle = frightened ? "#1438c9" : ghost.color;
      ctx.beginPath();
      ctx.arc(x, y - 2, r, Math.PI, 0);
      ctx.lineTo(x + r, y + r);
      for (let i = 0; i < 4; i += 1) {
        const waveX = x + r - (i + 0.5) * (r / 2);
        const waveY = y + r + (i % 2 ? 0 : -4);
        ctx.lineTo(waveX, waveY);
      }
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
      ctx.fill();

      if (frightened) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x - 6, y - 1, 1.8, 0, Math.PI * 2);
        ctx.arc(x + 6, y - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 5);
        ctx.lineTo(x - 6, y + 2);
        ctx.lineTo(x - 3, y + 5);
        ctx.lineTo(x, y + 2);
        ctx.lineTo(x + 3, y + 5);
        ctx.lineTo(x + 6, y + 2);
        ctx.lineTo(x + 9, y + 5);
        ctx.stroke();
      } else {
        const blinkWave = Math.sin(performance.now() * 0.005 + ghost.eyePhase);
        const blinkAmount = Math.max(0, blinkWave);
        const eyeRadiusY = Math.max(1.3, 4 - blinkAmount * 3.0);
        const eyeRadiusX = 4;
        const driftX = Math.sin(performance.now() * 0.013 + ghost.eyePhase) * 0.4;
        const driftY = Math.cos(performance.now() * 0.011 + ghost.eyePhase) * 0.3;
        const pupilOffsetX = ghost.dir.x * 1.9 + driftX;
        const pupilOffsetY = ghost.dir.y * 1.9 + driftY;

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(x - 6, y - 2, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 6, y - 2, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1b2f53";
        ctx.beginPath();
        ctx.arc(x - 6 + pupilOffsetX, y - 1 + pupilOffsetY, 1.9, 0, Math.PI * 2);
        ctx.arc(x + 6 + pupilOffsetX, y - 1 + pupilOffsetY, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    const bg = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    bg.addColorStop(0, "#030916");
    bg.addColorStop(1, "#0b1430");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawWalls();
    this.drawDots();
    this.drawPacman();
    this.drawGhosts();

    ctx.fillStyle = "rgba(250, 252, 255, 0.9)";
    ctx.font = '700 22px "Manrope", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(`Score ${this.score}`, 8, 24);

    if (this.ghostFreezeMs > 0 && this.running && !this.paused) {
      const sec = Math.ceil(this.ghostFreezeMs / 1000);
      ctx.textAlign = "center";
      ctx.font = '700 20px "Manrope", sans-serif';
      ctx.fillStyle = "rgba(255, 238, 166, 0.95)";
      ctx.fillText(`Призраки стартуют через ${sec}`, this.canvasWidth / 2, 28);
    }
  }

  stopLoop() {
    if (this.loopHandle) {
      cancelAnimationFrame(this.loopHandle);
      this.loopHandle = null;
    }
  }
}

window.PacmanGame = PacmanGame;
