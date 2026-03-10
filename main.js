const STORAGE_KEY = "minigry_save_v1";
const ACHIEVEMENT_TOTAL = 50;
const DEFAULT_PACMAN_SETTINGS = {
  powerTimingMode: "arcade",
  customPowerDurationSec: 6,
  pelletRespawnEnabled: false,
  pelletRespawnSec: 20,
  startingLives: 3,
  restoreLifeEachLevel: false,
  maxLives: 5,
  ghostStartDelaySec: 3,
  blinkyReleaseSec: 0,
  pinkyReleaseSec: 1.5,
  inkyReleaseSec: 6,
  clydeReleaseSec: 9
};

const GAME_CATALOG = {
  tetris: {
    id: "tetris",
    title: "Tetris",
    subtitle: "10x20 поле, тетрамино, уровни и очистка линий.",
    classRef: TetrisGame,
    music: "game-tetris"
  },
  minesweeper: {
    id: "minesweeper",
    title: "Minesweeper",
    subtitle: "16x16 поле, 40 мин, флаги, таймер и проверка победы.",
    classRef: MinesweeperGame,
    music: "game-minesweeper"
  },
  snake: {
    id: "snake",
    title: "Snake",
    subtitle: "Рост змейки, яблоки, ускорение и выживание.",
    classRef: SnakeGame,
    music: "game-snake"
  },
  flappybird: {
    id: "flappybird",
    title: "Flappy Bird",
    subtitle: "Гравитация, прыжки и прохождение труб.",
    classRef: FlappyBirdGame,
    music: "game-flappybird"
  },
  pacman: {
    id: "pacman",
    title: "Pac-Man",
    subtitle: "Лабиринт, точки, power pellet и призраки.",
    classRef: PacmanGame,
    music: "game-pacman"
  }
};

const DEFAULT_SAVE = {
  version: 1,
  theme: "dark",
  audio: {
    master: 70,
    music: 55,
    sfx: 70,
    musicEnabled: true,
    sfxEnabled: true
  },
  achievements: {},
  stats: {},
  bestScores: {
    tetris: 0,
    minesweeper: 0,
    snake: 0,
    flappybird: 0,
    pacman: 0
  },
  flags: {
    allUnlockedRewardShown: false
  },
  pacmanSettings: { ...DEFAULT_PACMAN_SETTINGS },
  updatedAt: null
};

const RARITY_POINTS = {
  common: 10,
  rare: 50,
  legendary: 100
};

const GAME_NAME = {
  tetris: "Tetris",
  minesweeper: "Minesweeper",
  snake: "Snake",
  flappybird: "Flappy Bird",
  pacman: "Pac-Man"
};

function buildAchievements() {
  const tetris = [
    { id: "tetris_line_1", game: "tetris", title: "Первая линия", description: "Очистите 1 линию в Tetris.", icon: "🧱", rarity: "common", points: RARITY_POINTS.common, metric: "tetris.linesCleared", target: 1, comparator: "gte" },
    { id: "tetris_line_10", game: "tetris", title: "Разминка", description: "Очистите 10 линий в сумме.", icon: "📏", rarity: "common", points: RARITY_POINTS.common, metric: "tetris.linesCleared", target: 10, comparator: "gte" },
    { id: "tetris_line_50", game: "tetris", title: "Стабильный темп", description: "Очистите 50 линий.", icon: "🚧", rarity: "rare", points: RARITY_POINTS.rare, metric: "tetris.linesCleared", target: 50, comparator: "gte" },
    { id: "tetris_line_100", game: "tetris", title: "Мастер поля", description: "Очистите 100 линий.", icon: "🏆", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "tetris.linesCleared", target: 100, comparator: "gte" },
    { id: "tetris_score_1000", game: "tetris", title: "1000 очков", description: "Наберите 1000 очков.", icon: "💯", rarity: "common", points: RARITY_POINTS.common, metric: "tetris.score", target: 1000, comparator: "gte" },
    { id: "tetris_score_5000", game: "tetris", title: "5000 очков", description: "Наберите 5000 очков.", icon: "🔥", rarity: "rare", points: RARITY_POINTS.rare, metric: "tetris.score", target: 5000, comparator: "gte" },
    { id: "tetris_level_3", game: "tetris", title: "Темп растет", description: "Достигните 3 уровня.", icon: "⚡", rarity: "common", points: RARITY_POINTS.common, metric: "tetris.level", target: 3, comparator: "gte" },
    { id: "tetris_level_5", game: "tetris", title: "Высокая скорость", description: "Достигните 5 уровня.", icon: "🚀", rarity: "rare", points: RARITY_POINTS.rare, metric: "tetris.level", target: 5, comparator: "gte" },
    { id: "tetris_tetris_1", game: "tetris", title: "Настоящий Tetris", description: "Очистите 4 линии одним ходом.", icon: "4️⃣", rarity: "rare", points: RARITY_POINTS.rare, metric: "tetris.tetrises", target: 1, comparator: "gte" },
    { id: "tetris_tetris_10", game: "tetris", title: "Серия тетрисов", description: "Сделайте 10 тетрисов.", icon: "🌟", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "tetris.tetrises", target: 10, comparator: "gte" }
  ];

  const minesweeper = [
    { id: "minesweeper_reveal_1", game: "minesweeper", title: "Первый шаг", description: "Откройте первую безопасную клетку.", icon: "🧭", rarity: "common", points: RARITY_POINTS.common, metric: "minesweeper.cellsRevealed", target: 1, comparator: "gte" },
    { id: "minesweeper_reveal_200", game: "minesweeper", title: "РСЃСЃР»РµРґРѕРІР°С‚РµР»СЊ", description: "Откройте 200 клеток суммарно.", icon: "🗺️", rarity: "common", points: RARITY_POINTS.common, metric: "minesweeper.cellsRevealed", target: 200, comparator: "gte" },
    { id: "minesweeper_flags_10", game: "minesweeper", title: "Разметка", description: "Поставьте 10 флагов.", icon: "🚩", rarity: "common", points: RARITY_POINTS.common, metric: "minesweeper.flagsPlaced", target: 10, comparator: "gte" },
    { id: "minesweeper_win_1", game: "minesweeper", title: "Первая победа", description: "Выиграйте 1 игру в Minesweeper.", icon: "✅", rarity: "common", points: RARITY_POINTS.common, metric: "minesweeper.gamesWon", target: 1, comparator: "gte" },
    { id: "minesweeper_win_5", game: "minesweeper", title: "Сапер-ветеран", description: "Выиграйте 5 игр.", icon: "🛡️", rarity: "rare", points: RARITY_POINTS.rare, metric: "minesweeper.gamesWon", target: 5, comparator: "gte" },
    { id: "minesweeper_play_10", game: "minesweeper", title: "Практика", description: "Сыграйте 10 партий.", icon: "🎯", rarity: "common", points: RARITY_POINTS.common, metric: "minesweeper.gamesPlayed", target: 10, comparator: "gte" },
    { id: "minesweeper_score_500", game: "minesweeper", title: "500 очков", description: "Наберите 500 очков в партии.", icon: "💥", rarity: "rare", points: RARITY_POINTS.rare, metric: "minesweeper.score", target: 500, comparator: "gte" },
    { id: "minesweeper_score_1500", game: "minesweeper", title: "Гроссмейстер сапера", description: "Наберите 1500 очков.", icon: "🥇", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "minesweeper.score", target: 1500, comparator: "gte" },
    { id: "minesweeper_time_180", game: "minesweeper", title: "Быстрая зачистка", description: "Выиграйте быстрее чем за 180 секунд.", icon: "⏱️", rarity: "rare", points: RARITY_POINTS.rare, metric: "minesweeper.bestTime", target: 180, comparator: "lte" },
    { id: "minesweeper_time_120", game: "minesweeper", title: "Молниеносный сапер", description: "Выиграйте быстрее чем за 120 секунд.", icon: "⚜️", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "minesweeper.bestTime", target: 120, comparator: "lte" }
  ];

  const snake = [
    { id: "snake_apple_1", game: "snake", title: "Первое яблоко", description: "Съешьте 1 яблоко.", icon: "🍎", rarity: "common", points: RARITY_POINTS.common, metric: "snake.applesEaten", target: 1, comparator: "gte" },
    { id: "snake_apple_5", game: "snake", title: "Разогрев змейки", description: "Съешьте 5 яблок.", icon: "🍏", rarity: "common", points: RARITY_POINTS.common, metric: "snake.applesEaten", target: 5, comparator: "gte" },
    { id: "snake_apple_20", game: "snake", title: "Аппетит", description: "Съешьте 20 яблок.", icon: "🍇", rarity: "rare", points: RARITY_POINTS.rare, metric: "snake.applesEaten", target: 20, comparator: "gte" },
    { id: "snake_length_10", game: "snake", title: "Длинная змея", description: "Достигните длины 10.", icon: "📈", rarity: "common", points: RARITY_POINTS.common, metric: "snake.maxLength", target: 10, comparator: "gte" },
    { id: "snake_length_20", game: "snake", title: "Гигант", description: "Достигните длины 20.", icon: "🐍", rarity: "rare", points: RARITY_POINTS.rare, metric: "snake.maxLength", target: 20, comparator: "gte" },
    { id: "snake_score_100", game: "snake", title: "Сотня", description: "Наберите 100 очков.", icon: "💯", rarity: "common", points: RARITY_POINTS.common, metric: "snake.score", target: 100, comparator: "gte" },
    { id: "snake_score_300", game: "snake", title: "Точный контроль", description: "Наберите 300 очков.", icon: "🎖️", rarity: "rare", points: RARITY_POINTS.rare, metric: "snake.score", target: 300, comparator: "gte" },
    { id: "snake_survival_60", game: "snake", title: "Выживание", description: "Продержитесь 60 секунд.", icon: "⌛", rarity: "rare", points: RARITY_POINTS.rare, metric: "snake.maxSurvival", target: 60, comparator: "gte" },
    { id: "snake_speed_5", game: "snake", title: "На пределе", description: "Достигните 5 уровня скорости.", icon: "⚙️", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "snake.speedLevel", target: 5, comparator: "gte" },
    { id: "snake_play_10", game: "snake", title: "Постоянная тренировка", description: "Сыграйте 10 партий.", icon: "🎮", rarity: "common", points: RARITY_POINTS.common, metric: "snake.gamesPlayed", target: 10, comparator: "gte" }
  ];

  const flappy = [
    { id: "flappy_score_1", game: "flappybird", title: "Первый пролет", description: "Наберите 1 очко.", icon: "🐣", rarity: "common", points: RARITY_POINTS.common, metric: "flappybird.score", target: 1, comparator: "gte" },
    { id: "flappy_score_5", game: "flappybird", title: "Уверенный полет", description: "Наберите 5 очков.", icon: "🪽", rarity: "common", points: RARITY_POINTS.common, metric: "flappybird.score", target: 5, comparator: "gte" },
    { id: "flappy_score_10", game: "flappybird", title: "Десятка", description: "Наберите 10 очков.", icon: "🎯", rarity: "rare", points: RARITY_POINTS.rare, metric: "flappybird.score", target: 10, comparator: "gte" },
    { id: "flappy_score_25", game: "flappybird", title: "Высший пилотаж", description: "Наберите 25 очков.", icon: "🛩️", rarity: "rare", points: RARITY_POINTS.rare, metric: "flappybird.score", target: 25, comparator: "gte" },
    { id: "flappy_score_40", game: "flappybird", title: "Легенда неба", description: "Наберите 40 очков.", icon: "🌠", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "flappybird.score", target: 40, comparator: "gte" },
    { id: "flappy_pipes_50", game: "flappybird", title: "50 труб", description: "Пройдите суммарно 50 труб.", icon: "🧱", rarity: "rare", points: RARITY_POINTS.rare, metric: "flappybird.pipesPassed", target: 50, comparator: "gte" },
    { id: "flappy_flaps_200", game: "flappybird", title: "200 взмахов", description: "Сделайте 200 взмахов.", icon: "🪽", rarity: "common", points: RARITY_POINTS.common, metric: "flappybird.flaps", target: 200, comparator: "gte" },
    { id: "flappy_survival_90", game: "flappybird", title: "Долгий полет", description: "Продержитесь в полете 90 секунд.", icon: "⏳", rarity: "rare", points: RARITY_POINTS.rare, metric: "flappybird.maxSurvival", target: 90, comparator: "gte" },
    { id: "flappy_play_10", game: "flappybird", title: "Птичья рутина", description: "Сыграйте 10 партий.", icon: "рџ“", rarity: "common", points: RARITY_POINTS.common, metric: "flappybird.gamesPlayed", target: 10, comparator: "gte" },
    { id: "flappy_level_6", game: "flappybird", title: "Гиперскорость", description: "Достигните 6 уровня скорости.", icon: "⚡", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "flappybird.level", target: 6, comparator: "gte" }
  ];

  const pacman = [
    { id: "pacman_dot_1", game: "pacman", title: "Первая точка", description: "Съешьте 1 точку.", icon: "🔸", rarity: "common", points: RARITY_POINTS.common, metric: "pacman.dotsEaten", target: 1, comparator: "gte" },
    { id: "pacman_dot_100", game: "pacman", title: "Сборщик точек", description: "Съешьте 100 точек.", icon: "🔹", rarity: "common", points: RARITY_POINTS.common, metric: "pacman.dotsEaten", target: 100, comparator: "gte" },
    { id: "pacman_dot_500", game: "pacman", title: "Маршрутный мастер", description: "Съешьте 500 точек.", icon: "💠", rarity: "rare", points: RARITY_POINTS.rare, metric: "pacman.dotsEaten", target: 500, comparator: "gte" },
    { id: "pacman_ghost_1", game: "pacman", title: "Охотник", description: "Съешьте первого призрака.", icon: "👻", rarity: "rare", points: RARITY_POINTS.rare, metric: "pacman.ghostsEaten", target: 1, comparator: "gte" },
    { id: "pacman_ghost_10", game: "pacman", title: "Гроза призраков", description: "Съешьте 10 призраков.", icon: "в пёЏ", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "pacman.ghostsEaten", target: 10, comparator: "gte" },
    { id: "pacman_level_1", game: "pacman", title: "Завершение лабиринта", description: "Пройдите 1 уровень полностью.", icon: "🌀", rarity: "common", points: RARITY_POINTS.common, metric: "pacman.levelsCompleted", target: 1, comparator: "gte" },
    { id: "pacman_level_5", game: "pacman", title: "Покоритель лабиринтов", description: "Пройдите 5 уровней.", icon: "🏅", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "pacman.levelsCompleted", target: 5, comparator: "gte" },
    { id: "pacman_score_1000", game: "pacman", title: "1000 очков", description: "Наберите 1000 очков в Pac-Man.", icon: "💰", rarity: "common", points: RARITY_POINTS.common, metric: "pacman.score", target: 1000, comparator: "gte" },
    { id: "pacman_score_5000", game: "pacman", title: "Рекордный счет", description: "Наберите 5000 очков.", icon: "🏆", rarity: "rare", points: RARITY_POINTS.rare, metric: "pacman.score", target: 5000, comparator: "gte" },
    { id: "pacman_max_level_3", game: "pacman", title: "Глубокий забег", description: "Достигните 3 уровня.", icon: "🌌", rarity: "legendary", points: RARITY_POINTS.legendary, metric: "pacman.maxLevel", target: 3, comparator: "gte" }
  ];

  return [...tetris, ...minesweeper, ...snake, ...flappy, ...pacman];
}

const ACHIEVEMENTS = buildAchievements();

function cloneDefaultSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizePacmanSettings(rawSettings) {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const powerTimingMode = source.powerTimingMode === "custom" ? "custom" : "arcade";
  const customPowerDurationSec = clamp(Number(source.customPowerDurationSec ?? DEFAULT_PACMAN_SETTINGS.customPowerDurationSec), 0, 30);
  const pelletRespawnEnabled = Boolean(source.pelletRespawnEnabled);
  const pelletRespawnSec = clamp(Math.round(Number(source.pelletRespawnSec ?? DEFAULT_PACMAN_SETTINGS.pelletRespawnSec)), 1, 120);
  const restoreLifeEachLevel = Boolean(source.restoreLifeEachLevel);
  const startingLives = clamp(Math.round(Number(source.startingLives ?? DEFAULT_PACMAN_SETTINGS.startingLives)), 1, 9);
  const rawMaxLives = clamp(Math.round(Number(source.maxLives ?? DEFAULT_PACMAN_SETTINGS.maxLives)), 1, 12);
  const maxLives = Math.max(startingLives, rawMaxLives);
  const ghostStartDelaySec = clamp(Number(source.ghostStartDelaySec ?? DEFAULT_PACMAN_SETTINGS.ghostStartDelaySec), 0, 8);
  const blinkyReleaseSec = clamp(Number(source.blinkyReleaseSec ?? DEFAULT_PACMAN_SETTINGS.blinkyReleaseSec), 0, 20);
  const pinkyReleaseSec = clamp(Number(source.pinkyReleaseSec ?? DEFAULT_PACMAN_SETTINGS.pinkyReleaseSec), 0, 20);
  const inkyReleaseSec = clamp(Number(source.inkyReleaseSec ?? DEFAULT_PACMAN_SETTINGS.inkyReleaseSec), 0, 20);
  const clydeReleaseSec = clamp(Number(source.clydeReleaseSec ?? DEFAULT_PACMAN_SETTINGS.clydeReleaseSec), 0, 20);

  return {
    powerTimingMode,
    customPowerDurationSec,
    pelletRespawnEnabled,
    pelletRespawnSec,
    startingLives,
    restoreLifeEachLevel,
    maxLives,
    ghostStartDelaySec,
    blinkyReleaseSec,
    pinkyReleaseSec,
    inkyReleaseSec,
    clydeReleaseSec
  };
}

function getNested(target, path) {
  const keys = path.split(".");
  let cursor = target;
  for (let i = 0; i < keys.length; i += 1) {
    if (cursor == null || typeof cursor !== "object" || !(keys[i] in cursor)) {
      return undefined;
    }
    cursor = cursor[keys[i]];
  }
  return cursor;
}

function setNested(target, path, value) {
  const keys = path.split(".");
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

function loadSave() {
  const base = cloneDefaultSave();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return base;
    return {
      ...base,
      ...parsed,
      theme: parsed.theme === "light" ? "light" : "dark",
      audio: { ...base.audio, ...(parsed.audio || {}) },
      achievements: typeof parsed.achievements === "object" && parsed.achievements ? parsed.achievements : {},
      stats: typeof parsed.stats === "object" && parsed.stats ? parsed.stats : {},
      bestScores: { ...base.bestScores, ...(parsed.bestScores || {}) },
      flags: { ...base.flags, ...(parsed.flags || {}) },
      pacmanSettings: normalizePacmanSettings(parsed.pacmanSettings)
    };
  } catch (error) {
    console.error("Не удалось загрузить сохранение:", error);
    return base;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString()
      })
    );
  } catch (error) {
    console.error("Не удалось сохранить данные:", error);
  }
}

function formatDateTime(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU");
}

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.unlocked = false;
    this.musicTimer = null;
    this.currentTrack = null;
    this.pendingTrack = "menu";
    this.musicIndex = 0;
    this.settings = {
      master: 70,
      music: 55,
      sfx: 70,
      musicEnabled: true,
      sfxEnabled: true
    };

    this.patterns = {
      menu: {
        wave: "triangle",
        gain: 0.35,
        step: 0.26,
        notes: [220, null, 262, null, 330, null, 294, null, 262, null, 196, null]
      },
      achievements: {
        wave: "sine",
        gain: 0.4,
        step: 0.22,
        notes: [392, 494, 587, 784, null, 784, 587, 494, 392, null]
      },
      "game-tetris": {
        wave: "square",
        gain: 0.28,
        step: 0.16,
        notes: [330, 247, 262, 294, 262, 247, 220, 220, 262, 330, 294, 262, 247, 262, 294, 330]
      },
      "game-minesweeper": {
        wave: "triangle",
        gain: 0.26,
        step: 0.28,
        notes: [220, null, 247, null, 262, null, 247, null, 220, null, 196, null]
      },
      "game-snake": {
        wave: "sawtooth",
        gain: 0.24,
        step: 0.14,
        notes: [294, null, 330, 392, 330, null, 294, 262, 294, null, 330, 349]
      },
      "game-flappybird": {
        wave: "triangle",
        gain: 0.27,
        step: 0.18,
        notes: [392, null, 523, null, 659, 587, 523, null, 440, null]
      },
      "game-pacman": {
        wave: "square",
        gain: 0.25,
        step: 0.15,
        notes: [523, 659, 784, 659, 523, 392, 523, 659, 784, 659, 523, 440]
      }
    };
  }

  applySettings(nextSettings) {
    this.settings = {
      ...this.settings,
      ...nextSettings
    };
    if (this.masterGain && this.ctx) {
      const vol = clamp((this.settings.master || 0) / 100, 0, 1);
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    if (this.unlocked) {
      if (!this.settings.musicEnabled) {
        this.stopMusic();
      } else if (this.pendingTrack) {
        this.playMusic(this.pendingTrack);
      }
    }
  }

  async unlock() {
    if (this.unlocked) return;
    this.ensureContext();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      this.unlocked = true;
      if (this.settings.musicEnabled) {
        this.playMusic(this.pendingTrack || "menu");
      }
    } catch (error) {
      console.warn("AudioContext resume failed:", error);
    }
  }

  ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = clamp((this.settings.master || 0) / 100, 0, 1);
    this.masterGain.connect(this.ctx.destination);
  }

  playTone({
    frequency,
    duration = 0.12,
    wave = "sine",
    gain = 0.25,
    channel = "sfx",
    when = 0
  }) {
    if (!this.unlocked || !this.ctx || !this.masterGain) return;
    if (!frequency) return;
    if (channel === "music" && !this.settings.musicEnabled) return;
    if (channel === "sfx" && !this.settings.sfxEnabled) return;

    const channelVolume = channel === "music" ? this.settings.music : this.settings.sfx;
    const actualGain = clamp(((channelVolume || 0) / 100) * gain, 0, 1);
    if (actualGain <= 0) return;

    const start = this.ctx.currentTime + when;
    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(actualGain, start + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  playSfx(name) {
    if (!this.unlocked || !this.settings.sfxEnabled) return;
    const sequences = {
      click: [
        [540, 0.05, "triangle", 0],
        [700, 0.06, "triangle", 0.04]
      ],
      move: [
        [420, 0.05, "square", 0],
        [500, 0.04, "square", 0.03]
      ],
      drop: [
        [340, 0.08, "square", 0],
        [200, 0.1, "triangle", 0.04]
      ],
      point: [
        [760, 0.08, "triangle", 0],
        [920, 0.11, "triangle", 0.06]
      ],
      power: [
        [300, 0.08, "sine", 0],
        [400, 0.08, "sine", 0.08],
        [520, 0.1, "sine", 0.16]
      ],
      gameover: [
        [500, 0.12, "sawtooth", 0],
        [300, 0.14, "sawtooth", 0.1],
        [200, 0.16, "triangle", 0.22]
      ],
      achievement: [
        [523, 0.1, "triangle", 0],
        [659, 0.1, "triangle", 0.08],
        [784, 0.18, "triangle", 0.16]
      ]
    };
    const sequence = sequences[name] || sequences.click;
    sequence.forEach(([frequency, duration, wave, offset]) => {
      this.playTone({
        frequency,
        duration,
        wave,
        gain: 0.28,
        channel: "sfx",
        when: offset
      });
    });
  }

  playMusic(trackName) {
    this.pendingTrack = trackName;
    if (!this.unlocked) return;
    if (!this.settings.musicEnabled) return;
    const pattern = this.patterns[trackName] || this.patterns.menu;
    if (this.currentTrack === trackName && this.musicTimer) return;

    this.stopMusic();
    this.currentTrack = trackName;
    this.musicIndex = 0;

    const runStep = () => {
      const note = pattern.notes[this.musicIndex % pattern.notes.length];
      if (Array.isArray(note)) {
        note.forEach((freq, idx) => {
          this.playTone({
            frequency: freq,
            duration: pattern.step * 0.95,
            wave: pattern.wave,
            gain: pattern.gain,
            channel: "music",
            when: idx * 0.01
          });
        });
      } else {
        this.playTone({
          frequency: note,
          duration: pattern.step * 0.95,
          wave: pattern.wave,
          gain: pattern.gain,
          channel: "music"
        });
      }
      this.musicIndex += 1;
    };

    runStep();
    this.musicTimer = window.setInterval(runStep, pattern.step * 1000);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = null;
  }
}

class MiniGamesApp {
  constructor() {
    this.save = loadSave();
    this.sound = new SoundManager();
    this.achievements = ACHIEVEMENTS;
    this.achievementMap = new Map(this.achievements.map((a) => [a.id, a]));
    this.currentRoute = "home";
    this.currentFilter = "all";
    this.selectedGameId = "tetris";
    this.activeGame = null;
    this.gameState = "idle";
    this.liveScore = 0;
    this.liveLevel = 1;
    this.liveStatus = "Ожидание";
    this.persistTimer = null;

    this.cacheElements();
    this.bindEvents();
    this.applyTheme(this.save.theme);
    this.sound.applySettings(this.save.audio);
    this.syncSettingsUI();
    this.selectGame("tetris");
    this.updatePacmanSettingsVisibility();
    this.setRoute("home");
    this.renderAll();
    this.syncAmbientMusic();
  }

  cacheElements() {
    this.routeSections = {
      home: document.getElementById("route-home"),
      games: document.getElementById("route-games"),
      achievements: document.getElementById("route-achievements"),
      settings: document.getElementById("route-settings")
    };
    this.navButtons = [...document.querySelectorAll(".nav-btn")];
    this.routeJumpButtons = [...document.querySelectorAll("[data-route-jump]")];

    this.totalPointsNode = document.getElementById("totalPoints");
    this.homeUnlockedNode = document.getElementById("homeUnlockedCount");
    this.homeProgressNode = document.getElementById("homeProgressPercent");
    this.homePointsNode = document.getElementById("homePoints");
    this.globalProgressFill = document.getElementById("globalProgressFill");
    this.globalProgressPercent = document.getElementById("globalProgressPercent");
    this.globalProgressText = document.getElementById("globalProgressText");

    this.gameCards = [...document.querySelectorAll(".game-card")];
    this.launchButtons = [...document.querySelectorAll(".launch-game-btn")];
    this.activeGameTitle = document.getElementById("activeGameTitle");
    this.activeGameSubtitle = document.getElementById("activeGameSubtitle");
    this.liveScoreNode = document.getElementById("liveScore");
    this.liveLevelNode = document.getElementById("liveLevel");
    this.liveStatusNode = document.getElementById("liveStatus");
    this.startBtn = document.getElementById("startGameBtn");
    this.pauseBtn = document.getElementById("pauseGameBtn");
    this.resumeBtn = document.getElementById("resumeGameBtn");
    this.restartBtn = document.getElementById("restartGameBtn");
    this.pacmanSettingsBtn = document.getElementById("pacmanSettingsBtn");
    this.pacmanSettingsModal = document.getElementById("pacmanSettingsModal");
    this.pacmanSettingsCloseTriggers = [...document.querySelectorAll("[data-close-pacman-settings]")];
    this.closePacmanSettingsBtn = document.getElementById("closePacmanSettingsBtn");
    this.pmPowerTimingMode = document.getElementById("pmPowerTimingMode");
    this.pmPowerDurationRow = document.getElementById("pmPowerDurationRow");
    this.pmPowerDurationSec = document.getElementById("pmPowerDurationSec");
    this.pmPelletRespawnEnabled = document.getElementById("pmPelletRespawnEnabled");
    this.pmPelletRespawnRow = document.getElementById("pmPelletRespawnRow");
    this.pmPelletRespawnSec = document.getElementById("pmPelletRespawnSec");
    this.pmStartingLives = document.getElementById("pmStartingLives");
    this.pmRestoreLifeEachLevel = document.getElementById("pmRestoreLifeEachLevel");
    this.pmMaxLivesRow = document.getElementById("pmMaxLivesRow");
    this.pmMaxLives = document.getElementById("pmMaxLives");
    this.pmGhostStartDelaySec = document.getElementById("pmGhostStartDelaySec");
    this.pmBlinkyReleaseSec = document.getElementById("pmBlinkyReleaseSec");
    this.pmPinkyReleaseSec = document.getElementById("pmPinkyReleaseSec");
    this.pmInkyReleaseSec = document.getElementById("pmInkyReleaseSec");
    this.pmClydeReleaseSec = document.getElementById("pmClydeReleaseSec");
    this.applyPacmanSettingsBtn = document.getElementById("applyPacmanSettingsBtn");
    this.gameStage = document.getElementById("gameStage");
    this.gameOverlay = document.getElementById("gameOverlay");
    this.overlayLabel = document.getElementById("overlayLabel");
    this.overlayTitle = document.getElementById("overlayTitle");
    this.overlayText = document.getElementById("overlayText");

    this.achievementList = document.getElementById("achievementList");
    this.achievementTemplate = document.getElementById("achievementCardTemplate");
    this.filterButtons = [...document.querySelectorAll("[data-achievement-filter]")];
    this.achievementUnlockedCount = document.getElementById("achievementUnlockedCount");
    this.achievementTotalPoints = document.getElementById("achievementTotalPoints");
    this.achievementRareLegendary = document.getElementById("achievementRareLegendary");
    this.achievementProgressPercent = document.getElementById("achievementProgressPercent");
    this.achievementProgressFill = document.getElementById("achievementProgressFill");
    this.achievementProgressCaption = document.getElementById("achievementProgressCaption");
    this.specialRewardPanel = document.getElementById("specialRewardPanel");
    this.playRewardAnimationBtn = document.getElementById("playRewardAnimationBtn");

    this.quickThemeToggle = document.getElementById("quickThemeToggle");
    this.themeSelect = document.getElementById("themeSelect");
    this.toggleThemeBtn = document.getElementById("toggleThemeBtn");
    this.masterVolume = document.getElementById("masterVolume");
    this.musicVolume = document.getElementById("musicVolume");
    this.sfxVolume = document.getElementById("sfxVolume");
    this.musicEnabled = document.getElementById("musicEnabled");
    this.sfxEnabled = document.getElementById("sfxEnabled");
    this.testSfxBtn = document.getElementById("testSfxBtn");
    this.testMusicBtn = document.getElementById("testMusicBtn");
    this.exportSaveBtn = document.getElementById("exportSaveBtn");
    this.importSaveBtn = document.getElementById("importSaveBtn");
    this.resetProgressBtn = document.getElementById("resetProgressBtn");
    this.saveDataField = document.getElementById("saveDataField");

    this.toastContainer = document.getElementById("toastContainer");
    this.confettiLayer = document.getElementById("confettiLayer");
  }

  bindEvents() {
    this.navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.dataset.route;
        this.setRoute(route);
      });
    });

    this.routeJumpButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.dataset.routeJump;
        this.setRoute(route);
      });
    });

    this.gameCards.forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".launch-game-btn")) return;
        const gameId = card.dataset.gameId;
        this.selectGame(gameId);
      });
    });

    this.launchButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const gameId = button.dataset.gameId;
        this.selectGame(gameId);
        this.startGame();
      });
    });

    this.startBtn.addEventListener("click", () => this.startGame());
    this.pauseBtn.addEventListener("click", () => this.pauseGame());
    this.resumeBtn.addEventListener("click", () => this.resumeGame());
    this.restartBtn.addEventListener("click", () => this.restartGame());

    this.pacmanSettingsBtn?.addEventListener("click", () => this.openPacmanSettings());
    this.closePacmanSettingsBtn?.addEventListener("click", () => this.closePacmanSettings());
    this.pacmanSettingsCloseTriggers.forEach((node) => {
      node.addEventListener("click", () => this.closePacmanSettings());
    });
    this.pmPowerTimingMode?.addEventListener("change", () => this.syncPacmanSettingsFormVisibility());
    this.pmPelletRespawnEnabled?.addEventListener("change", () => this.syncPacmanSettingsFormVisibility());
    this.pmRestoreLifeEachLevel?.addEventListener("change", () => this.syncPacmanSettingsFormVisibility());
    this.applyPacmanSettingsBtn?.addEventListener("click", () => this.applyPacmanSettingsFromUI());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closePacmanSettings();
      }
    });

    this.filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.currentFilter = button.dataset.achievementFilter || "all";
        this.renderAchievements();
      });
    });

    this.quickThemeToggle.addEventListener("click", () => this.toggleTheme());
    this.toggleThemeBtn.addEventListener("click", () => this.toggleTheme());
    this.themeSelect.addEventListener("change", () => this.setTheme(this.themeSelect.value));

    this.masterVolume.addEventListener("input", () => this.setAudioOption("master", Number(this.masterVolume.value)));
    this.musicVolume.addEventListener("input", () => this.setAudioOption("music", Number(this.musicVolume.value)));
    this.sfxVolume.addEventListener("input", () => this.setAudioOption("sfx", Number(this.sfxVolume.value)));
    this.musicEnabled.addEventListener("change", () => this.setAudioOption("musicEnabled", this.musicEnabled.checked));
    this.sfxEnabled.addEventListener("change", () => this.setAudioOption("sfxEnabled", this.sfxEnabled.checked));

    this.testSfxBtn.addEventListener("click", () => {
      this.sound.playSfx("point");
      this.toast("Тест SFX", "Эффект воспроизведен", "info", 1700);
    });

    this.testMusicBtn.addEventListener("click", () => {
      this.sound.playMusic("menu");
      this.toast("Тест музыки", "Запущен трек меню", "info", 1700);
    });

    this.exportSaveBtn.addEventListener("click", () => this.exportSave());
    this.importSaveBtn.addEventListener("click", () => this.importSave());
    this.resetProgressBtn.addEventListener("click", () => this.resetProgress());
    this.playRewardAnimationBtn.addEventListener("click", () => this.spawnConfetti(180));

    document.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      const clickable = target.matches(".btn, .nav-btn, .chip-btn, .icon-btn, .launch-game-btn");
      if (clickable) {
        this.sound.playSfx("click");
      }
    });

    const unlockAudio = () => {
      this.sound.unlock().then(() => this.syncAmbientMusic());
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
  }

  persist() {
    saveState(this.save);
  }

  persistSoon() {
    if (this.persistTimer) return;
    this.persistTimer = window.setTimeout(() => {
      this.persist();
      this.persistTimer = null;
    }, 180);
  }

  setRoute(route) {
    if (!this.routeSections[route]) return;
    if (route !== "games" && this.gameState === "running" && this.activeGame) {
      this.activeGame.pause();
      this.gameState = "paused";
      this.showOverlay({
        label: "Пауза",
        title: "РРіСЂР° поставлена на паузу",
        text: "Откройте раздел В«РРіСЂС‹В» и нажмите «Продолжить»."
      });
      this.updateLiveStatus("Пауза");
    }
    if (route !== "games") {
      this.closePacmanSettings();
    }
    this.currentRoute = route;
    this.navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.route === route);
    });
    Object.entries(this.routeSections).forEach(([key, section]) => {
      section.classList.toggle("active", key === route);
    });
    this.syncAmbientMusic();
  }

  setTheme(theme) {
    const nextTheme = theme === "light" ? "light" : "dark";
    this.save.theme = nextTheme;
    this.applyTheme(nextTheme);
    this.persist();
  }

  toggleTheme() {
    this.setTheme(this.save.theme === "dark" ? "light" : "dark");
  }

  applyTheme(theme) {
    document.body.dataset.theme = theme;
    this.themeSelect.value = theme;
  }

  setAudioOption(key, value) {
    if (!(key in this.save.audio)) return;
    this.save.audio[key] = value;
    this.sound.applySettings(this.save.audio);
    this.persist();
    this.syncAmbientMusic();
  }

  syncSettingsUI() {
    this.themeSelect.value = this.save.theme;
    this.masterVolume.value = String(this.save.audio.master);
    this.musicVolume.value = String(this.save.audio.music);
    this.sfxVolume.value = String(this.save.audio.sfx);
    this.musicEnabled.checked = Boolean(this.save.audio.musicEnabled);
    this.sfxEnabled.checked = Boolean(this.save.audio.sfxEnabled);
    this.syncPacmanSettingsUI();
  }

  syncPacmanSettingsUI() {
    if (!this.pmPowerTimingMode) return;
    const settings = normalizePacmanSettings(this.save.pacmanSettings);
    this.save.pacmanSettings = settings;

    this.pmPowerTimingMode.value = settings.powerTimingMode;
    this.pmPowerDurationSec.value = String(settings.customPowerDurationSec);
    this.pmPelletRespawnEnabled.checked = settings.pelletRespawnEnabled;
    this.pmPelletRespawnSec.value = String(settings.pelletRespawnSec);
    this.pmStartingLives.value = String(settings.startingLives);
    this.pmRestoreLifeEachLevel.checked = settings.restoreLifeEachLevel;
    this.pmMaxLives.value = String(settings.maxLives);
    this.pmGhostStartDelaySec.value = String(settings.ghostStartDelaySec);
    this.pmBlinkyReleaseSec.value = String(settings.blinkyReleaseSec);
    this.pmPinkyReleaseSec.value = String(settings.pinkyReleaseSec);
    this.pmInkyReleaseSec.value = String(settings.inkyReleaseSec);
    this.pmClydeReleaseSec.value = String(settings.clydeReleaseSec);
    this.syncPacmanSettingsFormVisibility();
  }

  syncPacmanSettingsFormVisibility() {
    if (!this.pmPowerTimingMode) return;
    const customPower = this.pmPowerTimingMode.value === "custom";
    const pelletRespawn = this.pmPelletRespawnEnabled.checked;
    const restoreLife = this.pmRestoreLifeEachLevel.checked;

    this.pmPowerDurationRow?.classList.toggle("is-hidden", !customPower);
    this.pmPelletRespawnRow?.classList.toggle("is-hidden", !pelletRespawn);
    this.pmMaxLivesRow?.classList.toggle("is-hidden", !restoreLife);
  }

  updatePacmanSettingsVisibility() {
    const shouldShow = this.selectedGameId === "pacman";
    this.pacmanSettingsBtn?.classList.toggle("is-hidden", !shouldShow);
    if (!shouldShow) {
      this.closePacmanSettings();
    }
  }

  openPacmanSettings() {
    if (this.selectedGameId !== "pacman" || !this.pacmanSettingsModal) return;
    this.syncPacmanSettingsUI();
    this.pacmanSettingsModal.classList.remove("hidden");
    this.pacmanSettingsModal.setAttribute("aria-hidden", "false");
  }

  closePacmanSettings() {
    if (!this.pacmanSettingsModal) return;
    this.pacmanSettingsModal.classList.add("hidden");
    this.pacmanSettingsModal.setAttribute("aria-hidden", "true");
  }

  applyPacmanSettingsFromUI() {
    if (!this.pmPowerTimingMode) return;

    const nextSettings = normalizePacmanSettings({
      ...this.save.pacmanSettings,
      powerTimingMode: this.pmPowerTimingMode.value,
      customPowerDurationSec: Number(this.pmPowerDurationSec.value),
      pelletRespawnEnabled: this.pmPelletRespawnEnabled.checked,
      pelletRespawnSec: Number(this.pmPelletRespawnSec.value),
      startingLives: Number(this.pmStartingLives.value),
      restoreLifeEachLevel: this.pmRestoreLifeEachLevel.checked,
      maxLives: Number(this.pmMaxLives.value),
      ghostStartDelaySec: Number(this.pmGhostStartDelaySec.value),
      blinkyReleaseSec: Number(this.pmBlinkyReleaseSec.value),
      pinkyReleaseSec: Number(this.pmPinkyReleaseSec.value),
      inkyReleaseSec: Number(this.pmInkyReleaseSec.value),
      clydeReleaseSec: Number(this.pmClydeReleaseSec.value)
    });

    this.save.pacmanSettings = nextSettings;
    this.syncPacmanSettingsUI();
    this.persist();
    this.applyPacmanSettingsToActiveGame();
    this.toast("Pac-Man", "Настройки применены.", "info", 1800);
  }

  applyPacmanSettingsToActiveGame() {
    if (!this.activeGame || this.selectedGameId !== "pacman") return;
    if (typeof this.activeGame.applySettings === "function") {
      this.activeGame.applySettings(this.save.pacmanSettings);
    }
  }

  syncAmbientMusic() {
    const hasRunningGame = this.gameState === "running" && this.selectedGameId;
    if (hasRunningGame) {
      const track = GAME_CATALOG[this.selectedGameId]?.music || "menu";
      this.sound.playMusic(track);
      return;
    }
    if (this.currentRoute === "achievements") {
      this.sound.playMusic("achievements");
      return;
    }
    this.sound.playMusic("menu");
  }

  mountGameInstance(gameId) {
    const meta = GAME_CATALOG[gameId];
    if (!meta) return;

    if (this.activeGame && typeof this.activeGame.destroy === "function") {
      this.activeGame.destroy();
    }

    const callbacks = {
      onScore: (score) => this.updateLiveScore(score),
      onLevel: (level) => this.updateLiveLevel(level),
      onStatus: (status) => this.updateLiveStatus(status),
      onGameOver: (payload) => this.handleGameOver(payload),
      onMetric: (path, value, mode) => this.updateMetric(path, value, mode),
      onSfx: (name) => this.sound.playSfx(name)
    };

    const GameClass = meta.classRef;
    this.activeGame = new GameClass(callbacks);
    this.activeGame.mount(this.gameStage);
    this.applyPacmanSettingsToActiveGame();
    this.gameState = "idle";
    this.liveScore = 0;
    this.liveLevel = 1;
    this.liveStatus = "Ожидание";
    this.updateLivePanel();

    this.showOverlay({
      label: "Готовы начать?",
      title: `Запуск: ${meta.title}`,
      text: "Нажмите «Старт». Пауза, продолжение и перезапуск доступны в любой момент."
    });
  }

  selectGame(gameId) {
    if (!GAME_CATALOG[gameId]) return;
    this.selectedGameId = gameId;
    this.gameCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.gameId === gameId);
    });
    this.activeGameTitle.textContent = GAME_CATALOG[gameId].title;
    this.activeGameSubtitle.textContent = GAME_CATALOG[gameId].subtitle;
    this.mountGameInstance(gameId);
    this.updatePacmanSettingsVisibility();
    this.syncAmbientMusic();
  }

  startGame() {
    if (!this.activeGame) {
      this.mountGameInstance(this.selectedGameId);
    }
    this.activeGame.start();
    this.gameState = "running";
    this.hideOverlay();
    this.updateLiveStatus("РРґРµС‚ игра");
    this.syncAmbientMusic();
  }

  pauseGame() {
    if (!this.activeGame || this.gameState !== "running") return;
    this.activeGame.pause();
    this.gameState = "paused";
    this.showOverlay({
      label: "Пауза",
      title: "РРіСЂР° приостановлена",
      text: "Нажмите «Продолжить», чтобы вернуться."
    });
    this.syncAmbientMusic();
  }

  resumeGame() {
    if (!this.activeGame || this.gameState !== "paused") return;
    this.activeGame.resume();
    this.gameState = "running";
    this.hideOverlay();
    this.updateLiveStatus("РРґРµС‚ игра");
    this.syncAmbientMusic();
  }

  restartGame() {
    if (!this.activeGame) return;
    this.activeGame.restart();
    this.gameState = "running";
    this.hideOverlay();
    this.updateLiveStatus("РРґРµС‚ игра");
    this.syncAmbientMusic();
  }

  handleGameOver(payload = {}) {
    this.gameState = "over";
    const score = Number(payload.score || 0);
    const won = Boolean(payload.won);
    this.updateBestScore(this.selectedGameId, score);
    this.showOverlay({
      label: won ? "Победа!" : "Игра окончена",
      title: `${GAME_CATALOG[this.selectedGameId].title}: ${score} очков`,
      text: payload.reason || (won
        ? "Вы съели все точки на поле."
        : "Нажмите «Перезапуск», чтобы сыграть снова.")
    });
    if (won) {
      this.sound.playSfx("achievement");
      this.spawnConfetti(120);
    } else {
      this.sound.playSfx("gameover");
    }
    this.syncAmbientMusic();
  }

  updateLiveScore(score) {
    this.liveScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    this.liveScoreNode.textContent = String(this.liveScore);
  }

  updateLiveLevel(level) {
    this.liveLevel = Number.isFinite(Number(level)) ? Number(level) : 1;
    this.liveLevelNode.textContent = String(this.liveLevel);
  }

  updateLiveStatus(status) {
    this.liveStatus = status || "Ожидание";
    this.liveStatusNode.textContent = this.liveStatus;
  }

  updateLivePanel() {
    this.updateLiveScore(this.liveScore);
    this.updateLiveLevel(this.liveLevel);
    this.updateLiveStatus(this.liveStatus);
  }

  showOverlay({ label, title, text }) {
    this.overlayLabel.textContent = label || "";
    this.overlayTitle.textContent = title || "";
    this.overlayText.textContent = text || "";
    this.gameOverlay.classList.remove("hidden");
  }

  hideOverlay() {
    this.gameOverlay.classList.add("hidden");
  }

  updateBestScore(gameId, score) {
    if (!(gameId in this.save.bestScores)) return;
    const prev = Number(this.save.bestScores[gameId] || 0);
    if (score > prev) {
      this.save.bestScores[gameId] = score;
      this.persist();
      this.renderBestScores();
    }
  }

  getStat(path) {
    return getNested(this.save.stats, path);
  }

  updateMetric(path, rawValue = 0, mode = "add") {
    const value = Number(rawValue);
    if (!path || !Number.isFinite(value)) return;
    const prev = this.getStat(path);
    let next;

    if (mode === "add") {
      next = (Number(prev) || 0) + value;
    } else if (mode === "max") {
      next = prev == null ? value : Math.max(Number(prev) || 0, value);
    } else if (mode === "min") {
      if (prev == null || prev === 0) {
        next = value;
      } else {
        next = Math.min(Number(prev), value);
      }
    } else {
      next = value;
    }

    setNested(this.save.stats, path, next);
    this.persistSoon();
    const unlockedThisPass = this.evaluateAchievements();
    if (unlockedThisPass > 0) {
      this.renderAll();
      this.checkGlobalReward();
    } else if (this.currentRoute === "achievements") {
      this.renderAchievements();
    }
  }

  achievementProgress(definition) {
    const currentRaw = this.getStat(definition.metric);
    const target = Number(definition.target || 0);

    if (definition.comparator === "lte") {
      if (currentRaw == null || currentRaw === 0) {
        return { current: null, target, progress: 0, completed: false };
      }
      const current = Number(currentRaw);
      const completed = current <= target;
      const ratio = completed ? 1 : clamp(target / current, 0, 1);
      return { current, target, progress: ratio, completed };
    }

    const current = Number(currentRaw || 0);
    const completed = current >= target;
    const ratio = target <= 0 ? 1 : clamp(current / target, 0, 1);
    return { current, target, progress: ratio, completed };
  }

  isUnlocked(achievementId) {
    return Boolean(this.save.achievements[achievementId]);
  }

  unlockAchievement(definition) {
    this.save.achievements[definition.id] = {
      unlockedAt: new Date().toISOString()
    };
    this.persist();
    this.sound.playSfx("achievement");
    this.toast("Достижение открыто", `${definition.title} (+${definition.points})`, "achievement", 3200);
  }

  evaluateAchievements() {
    let unlockedThisPass = 0;
    this.achievements.forEach((definition) => {
      if (this.isUnlocked(definition.id)) return;
      const progress = this.achievementProgress(definition);
      if (progress.completed) {
        unlockedThisPass += 1;
        this.unlockAchievement(definition);
      }
    });
    return unlockedThisPass;
  }

  getAchievementStats() {
    const unlockedCount = this.achievements.filter((a) => this.isUnlocked(a.id)).length;
    const totalPoints = this.achievements.reduce((acc, a) => {
      if (!this.isUnlocked(a.id)) return acc;
      return acc + Number(a.points || 0);
    }, 0);
    const rareLegendary = this.achievements.filter((a) => {
      if (!this.isUnlocked(a.id)) return false;
      return a.rarity === "rare" || a.rarity === "legendary";
    }).length;
    const progressPercent = Math.round((unlockedCount / this.achievements.length) * 100);
    return { unlockedCount, totalPoints, rareLegendary, progressPercent };
  }

  checkGlobalReward() {
    const { unlockedCount } = this.getAchievementStats();
    if (unlockedCount < this.achievements.length) return;
    if (!this.save.flags.allUnlockedRewardShown) {
      this.save.flags.allUnlockedRewardShown = true;
      this.persist();
      this.toast("Глобальная награда", "Открыты все достижения: Золотой бейдж!", "achievement", 4600);
      this.spawnConfetti(220);
    }
  }

  renderBestScores() {
    const scoreNodes = [...document.querySelectorAll("[data-best-score]")];
    scoreNodes.forEach((node) => {
      const gameId = node.dataset.bestScore;
      const value = Number(this.save.bestScores[gameId] || 0);
      node.textContent = String(value);
    });
  }

  renderProgressWidgets() {
    const summary = this.getAchievementStats();
    const fillPercent = `${summary.progressPercent}%`;

    this.totalPointsNode.textContent = String(summary.totalPoints);
    this.homeUnlockedNode.textContent = String(summary.unlockedCount);
    this.homeProgressNode.textContent = fillPercent;
    this.homePointsNode.textContent = String(summary.totalPoints);
    this.globalProgressFill.style.width = fillPercent;
    this.globalProgressPercent.textContent = fillPercent;
    this.globalProgressText.textContent = `${summary.unlockedCount} из ${ACHIEVEMENT_TOTAL} достижений`;

    this.achievementUnlockedCount.textContent = `${summary.unlockedCount} / ${ACHIEVEMENT_TOTAL}`;
    this.achievementTotalPoints.textContent = String(summary.totalPoints);
    this.achievementRareLegendary.textContent = String(summary.rareLegendary);
    this.achievementProgressPercent.textContent = fillPercent;
    this.achievementProgressFill.style.width = fillPercent;
    this.achievementProgressCaption.textContent = `Выполнено ${summary.unlockedCount} из ${ACHIEVEMENT_TOTAL} достижений`;

    const unlockedAll = summary.unlockedCount === this.achievements.length;
    this.specialRewardPanel.classList.toggle("hidden", !unlockedAll);
  }

  renderAchievements() {
    this.filterButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.achievementFilter === this.currentFilter);
    });

    let source = this.achievements.slice();
    if (this.currentFilter === "unlocked") {
      source = source.filter((achievement) => this.isUnlocked(achievement.id));
    } else if (this.currentFilter === "locked") {
      source = source.filter((achievement) => !this.isUnlocked(achievement.id));
    } else if (this.currentFilter !== "all") {
      source = source.filter((achievement) => achievement.game === this.currentFilter);
    }

    this.achievementList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    source.forEach((achievement) => {
      const card = this.achievementTemplate.content.firstElementChild.cloneNode(true);
      const unlocked = this.isUnlocked(achievement.id);
      const progress = this.achievementProgress(achievement);
      const unlockedAt = unlocked ? this.save.achievements[achievement.id]?.unlockedAt : null;

      card.classList.add(unlocked ? "unlocked" : "locked");
      card.querySelector(".achievement-icon").textContent = unlocked ? achievement.icon : "🔒";
      card.querySelector(".achievement-title").textContent = achievement.title;
      card.querySelector(".achievement-description").textContent = achievement.description;
      const rarityNode = card.querySelector(".achievement-rarity");
      rarityNode.textContent = achievement.rarity;
      rarityNode.classList.add(achievement.rarity);
      card.querySelector(".achievement-points").textContent = `+${achievement.points} очков`;
      card.querySelector(".achievement-game").textContent = GAME_NAME[achievement.game];
      card.querySelector(".achievement-progress-fill").style.width = `${Math.round(progress.progress * 100)}%`;

      let progressText = "";
      if (achievement.comparator === "lte") {
        progressText = progress.current == null
          ? `Лучшее время: нет данных, цель <= ${progress.target}с`
          : `Лучшее время: ${progress.current}с, цель <= ${progress.target}с`;
      } else {
        progressText = `${progress.current} / ${progress.target}`;
      }
      if (unlocked && unlockedAt) {
        progressText = `Открыто: ${formatDateTime(unlockedAt)}`;
      }
      card.querySelector(".achievement-progress-text").textContent = progressText;

      fragment.appendChild(card);
    });

    this.achievementList.appendChild(fragment);
  }

  toast(title, text, type = "info", duration = 2800) {
    const node = document.createElement("article");
    node.className = `toast ${type}`;
    node.innerHTML = `<h4>${title}</h4><p>${text}</p>`;
    this.toastContainer.appendChild(node);
    window.setTimeout(() => {
      node.remove();
    }, duration);
  }

  spawnConfetti(count = 120) {
    const colors = ["#5ec2ff", "#4ef4b3", "#ffcf68", "#ff7f96", "#e4f0ff"];
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      const x = Math.random() * 100;
      const dx = (Math.random() - 0.5) * 140;
      const rot = (Math.random() * 760 - 380).toFixed(0);
      const delay = Math.random() * 0.9;
      piece.style.left = `${x}vw`;
      piece.style.top = "-20px";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.setProperty("--dx", `${dx}px`);
      piece.style.setProperty("--rot", `${rot}deg`);
      piece.style.animationDelay = `${delay}s`;
      this.confettiLayer.appendChild(piece);
      window.setTimeout(() => piece.remove(), 2600);
    }
  }

  exportSave() {
    this.saveDataField.value = JSON.stringify(this.save, null, 2);
    this.saveDataField.focus();
    this.saveDataField.select();
    this.toast("Экспорт", "JSON сохранения выведен в поле ниже.", "info", 2300);
  }

  importSave() {
    const raw = this.saveDataField.value.trim();
    if (!raw) {
      this.toast("РРјРїРѕСЂС‚", "Поле пустое. Вставьте JSON.", "error", 2600);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const merged = {
        ...cloneDefaultSave(),
        ...parsed,
        theme: parsed.theme === "light" ? "light" : "dark",
        audio: { ...DEFAULT_SAVE.audio, ...(parsed.audio || {}) },
        achievements: typeof parsed.achievements === "object" && parsed.achievements ? parsed.achievements : {},
        stats: typeof parsed.stats === "object" && parsed.stats ? parsed.stats : {},
        bestScores: { ...DEFAULT_SAVE.bestScores, ...(parsed.bestScores || {}) },
        flags: { ...DEFAULT_SAVE.flags, ...(parsed.flags || {}) },
        pacmanSettings: normalizePacmanSettings(parsed.pacmanSettings)
      };
      this.save = merged;
      this.applyTheme(this.save.theme);
      this.sound.applySettings(this.save.audio);
      this.syncSettingsUI();
      this.applyPacmanSettingsToActiveGame();
      this.persist();
      this.renderAll();
      this.toast("РРјРїРѕСЂС‚", "Сохранение загружено успешно.", "achievement", 2600);
    } catch (error) {
      console.error(error);
      this.toast("Ошибка импорта", "Невалидный JSON.", "error", 2800);
    }
  }

  resetProgress() {
    const confirmed = window.confirm("Сбросить весь прогресс, достижения и статистику?");
    if (!confirmed) return;
    this.save = cloneDefaultSave();
    this.applyTheme(this.save.theme);
    this.sound.applySettings(this.save.audio);
    this.syncSettingsUI();
    this.applyPacmanSettingsToActiveGame();
    this.persist();
    this.renderAll();
    this.selectGame(this.selectedGameId);
    this.toast("Сброс", "Прогресс очищен.", "info", 2200);
  }

  renderAll() {
    this.renderBestScores();
    this.renderAchievements();
    this.renderProgressWidgets();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const required = [
    "TetrisGame",
    "MinesweeperGame",
    "SnakeGame",
    "FlappyBirdGame",
    "PacmanGame"
  ];
  const missing = required.filter((name) => typeof window[name] !== "function");
  if (missing.length > 0) {
    console.error("Не загружены игровые скрипты:", missing.join(", "));
    alert(`Ошибка загрузки скриптов: ${missing.join(", ")}`);
    return;
  }
  new MiniGamesApp();
});
