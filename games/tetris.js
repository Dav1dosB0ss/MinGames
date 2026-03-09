const TETROMINOES = [
  { name: "I", color: "#56cbff", matrix: [[1, 1, 1, 1]] },
  { name: "O", color: "#ffe47a", matrix: [[1, 1], [1, 1]] },
  { name: "T", color: "#bd8bff", matrix: [[0, 1, 0], [1, 1, 1]] },
  { name: "S", color: "#74f7b2", matrix: [[0, 1, 1], [1, 1, 0]] },
  { name: "Z", color: "#ff8a8a", matrix: [[1, 1, 0], [0, 1, 1]] },
  { name: "J", color: "#7ba7ff", matrix: [[1, 0, 0], [1, 1, 1]] },
  { name: "L", color: "#ffbe71", matrix: [[0, 0, 1], [1, 1, 1]] }
];

function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      rotated[x][rows - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

class TetrisGame {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.rows = 20;
    this.cols = 10;
    this.cellSize = 30;

    this.canvas = null;
    this.ctx = null;
    this.nextCanvas = null;
    this.nextCtx = null;
    this.container = null;

    this.board = createBoard(this.rows, this.cols);
    this.currentPiece = null;
    this.nextPiece = null;

    this.loopHandle = null;
    this.lastTs = 0;
    this.dropAccumulator = 0;

    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.roundCounted = false;

    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.tetrises = 0;
    this.dropMs = 800;

    this.keyHandler = this.onKeyDown.bind(this);
    this.touchHandler = this.onTouchControl.bind(this);
    this.loop = this.loop.bind(this);
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="game-wrapper">
        <div class="tetris-layout">
          <canvas class="game-canvas" width="${this.cols * this.cellSize}" height="${this.rows * this.cellSize}" aria-label="Поле Tetris"></canvas>
          <aside class="tetris-side">
            <div class="game-inline-panel">
              <div class="col">
                <span class="label">Линии</span>
                <span class="value" data-t-lines>0</span>
              </div>
              <div class="col">
                <span class="label">Тетрисы</span>
                <span class="value" data-t-tetrises>0</span>
              </div>
            </div>
            <div>
              <p class="label">Следующая фигура</p>
              <canvas class="tetris-next" width="160" height="160" aria-label="Следующая фигура"></canvas>
            </div>
            <p class="hint">
              <strong>Управление:</strong> стрелки - движение, вверх - поворот, пробел - жесткий сброс.
            </p>
          </aside>
        </div>
        <div class="game-touch-controls tetris-touch" aria-label="Сенсорное управление Tetris">
          <button class="touch-btn" data-action="left" type="button">◀</button>
          <button class="touch-btn" data-action="rotate" type="button">⟳</button>
          <button class="touch-btn" data-action="right" type="button">▶</button>
          <button class="touch-btn" data-action="down" type="button">▼</button>
          <button class="touch-btn touch-btn-wide" data-action="drop" type="button">Жесткий сброс</button>
        </div>
      </div>
    `;
    this.canvas = container.querySelector(".game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.nextCanvas = container.querySelector(".tetris-next");
    this.nextCtx = this.nextCanvas.getContext("2d");
    this.linesNode = container.querySelector("[data-t-lines]");
    this.tetrisesNode = container.querySelector("[data-t-tetrises]");

    window.addEventListener("keydown", this.keyHandler);
    this.touchControls = container.querySelector(".game-touch-controls");
    this.touchControls?.addEventListener("click", this.touchHandler);
    this.render();
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
      this.callbacks.onMetric?.("tetris.gamesPlayed", 1, "add");
    }
    this.running = true;
    this.paused = false;
    this.started = true;
    this.ended = false;
    this.lastTs = performance.now();
    this.dropAccumulator = 0;
    this.callbacks.onStatus?.("Идет игра");
    this.callbacks.onLevel?.(this.level);
    this.callbacks.onScore?.(this.score);
    this.stopLoop();
    this.loopHandle = requestAnimationFrame(this.loop);
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    this.running = false;
    this.stopLoop();
    this.callbacks.onStatus?.("Пауза");
  }

  resume() {
    if (!this.started || this.ended || !this.paused) return;
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
    this.board = createBoard(this.rows, this.cols);
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.tetrises = 0;
    this.dropMs = 800;
    this.roundCounted = false;
    this.currentPiece = this.randomPiece();
    this.nextPiece = this.randomPiece();
    this.placePieceAtSpawn(this.currentPiece);
    this.updateSideStats();
    this.callbacks.onScore?.(this.score);
    this.callbacks.onLevel?.(this.level);
    this.callbacks.onStatus?.("Готов");
    this.render();
  }

  randomPiece() {
    const proto = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    return {
      name: proto.name,
      color: proto.color,
      matrix: cloneMatrix(proto.matrix),
      x: 0,
      y: 0
    };
  }

  placePieceAtSpawn(piece) {
    piece.y = 0;
    piece.x = Math.floor((this.cols - piece.matrix[0].length) / 2);
  }

  onKeyDown(event) {
    if (!this.started || this.paused || !this.running) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      this.move(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveDown(true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.rotate();
    } else if (event.code === "Space") {
      event.preventDefault();
      this.hardDrop();
    }
  }

  onTouchControl(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (!this.started || this.paused || !this.running) return;
    if (action === "left") this.move(-1);
    if (action === "right") this.move(1);
    if (action === "down") this.moveDown(true);
    if (action === "rotate") this.rotate();
    if (action === "drop") this.hardDrop();
  }

  move(deltaX) {
    this.currentPiece.x += deltaX;
    if (this.collides(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
      this.currentPiece.x -= deltaX;
      return;
    }
    this.callbacks.onSfx?.("move");
    this.render();
  }

  rotate() {
    const rotated = rotateMatrix(this.currentPiece.matrix);
    const originalX = this.currentPiece.x;
    const kicks = [0, -1, 1, -2, 2];
    for (let i = 0; i < kicks.length; i += 1) {
      const kick = kicks[i];
      const tryX = originalX + kick;
      if (!this.collides(rotated, tryX, this.currentPiece.y)) {
        this.currentPiece.matrix = rotated;
        this.currentPiece.x = tryX;
        this.callbacks.onSfx?.("move");
        this.render();
        return;
      }
    }
  }

  hardDrop() {
    let droppedRows = 0;
    while (!this.collides(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y += 1;
      droppedRows += 1;
    }
    if (droppedRows > 0) {
      this.score += droppedRows * 2;
      this.callbacks.onScore?.(this.score);
      this.callbacks.onMetric?.("tetris.score", this.score, "max");
    }
    this.lockPiece();
    this.callbacks.onSfx?.("drop");
  }

  loop(ts) {
    if (!this.running) return;
    const delta = ts - this.lastTs;
    this.lastTs = ts;
    this.dropAccumulator += delta;

    if (this.dropAccumulator >= this.dropMs) {
      this.dropAccumulator = 0;
      this.moveDown(false);
    }

    this.render();
    this.loopHandle = requestAnimationFrame(this.loop);
  }

  moveDown(isSoftDrop) {
    this.currentPiece.y += 1;
    if (this.collides(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
      this.currentPiece.y -= 1;
      this.lockPiece();
      return;
    }
    if (isSoftDrop) {
      this.score += 1;
      this.callbacks.onScore?.(this.score);
      this.callbacks.onMetric?.("tetris.score", this.score, "max");
    }
  }

  lockPiece() {
    const { matrix, x, y, color } = this.currentPiece;
    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const boardY = y + row;
        const boardX = x + col;
        if (boardY >= 0 && boardY < this.rows && boardX >= 0 && boardX < this.cols) {
          this.board[boardY][boardX] = color;
        }
      }
    }

    this.callbacks.onMetric?.("tetris.piecesPlaced", 1, "add");
    const cleared = this.clearLines();
    if (cleared > 0) {
      this.callbacks.onMetric?.("tetris.linesCleared", cleared, "add");
      this.lines += cleared;
      const lineScoreMap = [0, 100, 300, 500, 800];
      this.score += lineScoreMap[cleared] * this.level;
      this.callbacks.onSfx?.("point");
      if (cleared === 4) {
        this.tetrises += 1;
        this.callbacks.onMetric?.("tetris.tetrises", 1, "add");
      }
      const computedLevel = Math.floor(this.lines / 10) + 1;
      if (computedLevel !== this.level) {
        this.level = computedLevel;
        this.dropMs = Math.max(95, 800 - (this.level - 1) * 65);
        this.callbacks.onLevel?.(this.level);
        this.callbacks.onSfx?.("power");
      }
      this.updateSideStats();
      this.callbacks.onScore?.(this.score);
      this.callbacks.onMetric?.("tetris.score", this.score, "max");
      this.callbacks.onMetric?.("tetris.level", this.level, "max");
    }

    this.currentPiece = this.nextPiece;
    this.nextPiece = this.randomPiece();
    this.placePieceAtSpawn(this.currentPiece);
    this.drawNextPreview();

    if (this.collides(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
      this.endGame();
    }
  }

  clearLines() {
    let clearCount = 0;
    for (let y = this.rows - 1; y >= 0; y -= 1) {
      if (this.board[y].every((cell) => cell !== null)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(this.cols).fill(null));
        clearCount += 1;
        y += 1;
      }
    }
    return clearCount;
  }

  collides(matrix, posX, posY) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const boardX = posX + x;
        const boardY = posY + y;

        if (boardX < 0 || boardX >= this.cols || boardY >= this.rows) {
          return true;
        }
        if (boardY >= 0 && this.board[boardY][boardX] !== null) {
          return true;
        }
      }
    }
    return false;
  }

  endGame() {
    this.running = false;
    this.paused = false;
    this.ended = true;
    this.stopLoop();
    this.callbacks.onStatus?.("Поражение");
    this.callbacks.onSfx?.("gameover");
    this.callbacks.onMetric?.("tetris.score", this.score, "max");
    this.callbacks.onMetric?.("tetris.level", this.level, "max");
    this.callbacks.onGameOver?.({
      score: this.score,
      level: this.level,
      lines: this.lines,
      reason: "Достигнут верх поля"
    });
  }

  updateSideStats() {
    if (this.linesNode) this.linesNode.textContent = String(this.lines);
    if (this.tetrisesNode) this.tetrisesNode.textContent = String(this.tetrises);
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(148, 180, 216, 0.12)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize + 0.5, 0);
      this.ctx.lineTo(x * this.cellSize + 0.5, this.rows * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize + 0.5);
      this.ctx.lineTo(this.cols * this.cellSize, y * this.cellSize + 0.5);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawCell(x, y, color) {
    const px = x * this.cellSize;
    const py = y * this.cellSize;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    this.ctx.fillRect(px + 2, py + 2, this.cellSize - 5, 3);
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.24)";
    this.ctx.strokeRect(px + 1.5, py + 1.5, this.cellSize - 3, this.cellSize - 3);
  }

  drawBoard() {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const cell = this.board[y][x];
        if (cell) {
          this.drawCell(x, y, cell);
        }
      }
    }
  }

  drawPiece(piece, alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) continue;
        this.drawCell(piece.x + x, piece.y + y, piece.color);
      }
    }
    this.ctx.restore();
  }

  drawGhost() {
    const ghostY = this.currentPiece.y;
    let targetY = ghostY;
    while (!this.collides(this.currentPiece.matrix, this.currentPiece.x, targetY + 1)) {
      targetY += 1;
    }
    if (targetY === this.currentPiece.y) return;
    this.drawPiece({ ...this.currentPiece, y: targetY }, 0.2);
  }

  drawNextPreview() {
    if (!this.nextCtx || !this.nextPiece) return;
    const ctx = this.nextCtx;
    const canvas = this.nextCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(8, 14, 28, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const matrix = this.nextPiece.matrix;
    const block = Math.floor(canvas.width / 6);
    const totalW = matrix[0].length * block;
    const totalH = matrix.length * block;
    const offsetX = Math.floor((canvas.width - totalW) / 2);
    const offsetY = Math.floor((canvas.height - totalH) / 2);

    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const px = offsetX + x * block;
        const py = offsetY + y * block;
        ctx.fillStyle = this.nextPiece.color;
        ctx.fillRect(px + 1, py + 1, block - 2, block - 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.fillRect(px + 2, py + 2, block - 4, 2);
      }
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#081427");
    gradient.addColorStop(1, "#0f1f3a");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawBoard();
    if (this.currentPiece) {
      this.drawGhost();
      this.drawPiece(this.currentPiece);
    }
    this.drawNextPreview();
  }

  stopLoop() {
    if (this.loopHandle) {
      cancelAnimationFrame(this.loopHandle);
      this.loopHandle = null;
    }
  }
}

window.TetrisGame = TetrisGame;
