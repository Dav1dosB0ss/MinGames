function createCell() {
  return {
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0
  };
}

function inBounds(size, row, col) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

class MinesweeperGame {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.size = 16;
    this.mineCount = 40;
    this.totalSafe = this.size * this.size - this.mineCount;

    this.board = [];
    this.container = null;
    this.boardEl = null;

    this.started = false;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.roundCounted = false;
    this.firstReveal = true;
    this.touchMode = "reveal";
    this.isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;

    this.elapsed = 0;
    this.timerHandle = null;
    this.flags = 0;
    this.revealedSafe = 0;
    this.score = 0;

    this.boundClick = this.onBoardClick.bind(this);
    this.boundContext = this.onBoardContext.bind(this);
    this.boundTouchModeToggle = this.toggleTouchMode.bind(this);
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="game-wrapper">
        <div class="game-inline-panel">
          <div class="col">
            <span class="label">Таймер</span>
            <span class="value" data-m-time>0 с</span>
          </div>
          <div class="col">
            <span class="label">Мины</span>
            <span class="value" data-m-mines>${this.mineCount}</span>
          </div>
          <div class="col">
            <span class="label">Флаги</span>
            <span class="value" data-m-flags>0</span>
          </div>
          <div class="col">
            <span class="label">Открыто</span>
            <span class="value" data-m-opened>0</span>
          </div>
        </div>
        <div class="minesweeper-board" role="grid" aria-label="Поле Minesweeper"></div>
        <div class="touch-mode-bar">
          <button class="btn small secondary" data-m-toggle-mode type="button">Режим: Открытие</button>
          <p class="hint"><strong>Смартфон:</strong> переключите режим на «Флаг», чтобы отмечать мины.</p>
        </div>
        <p class="hint"><strong>Управление:</strong> ЛКМ - открыть, ПКМ - флаг. Победа при открытии всех безопасных клеток.</p>
      </div>
    `;

    this.boardEl = container.querySelector(".minesweeper-board");
    this.timeNode = container.querySelector("[data-m-time]");
    this.minesNode = container.querySelector("[data-m-mines]");
    this.flagsNode = container.querySelector("[data-m-flags]");
    this.openedNode = container.querySelector("[data-m-opened]");
    this.touchModeButton = container.querySelector("[data-m-toggle-mode]");

    this.boardEl.addEventListener("click", this.boundClick);
    this.boardEl.addEventListener("contextmenu", this.boundContext);
    this.touchModeButton?.addEventListener("click", this.boundTouchModeToggle);

    this.resetState();
  }

  destroy() {
    this.stopTimer();
    if (this.boardEl) {
      this.boardEl.removeEventListener("click", this.boundClick);
      this.boardEl.removeEventListener("contextmenu", this.boundContext);
    }
    this.touchModeButton?.removeEventListener("click", this.boundTouchModeToggle);
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
      this.callbacks.onMetric?.("minesweeper.gamesPlayed", 1, "add");
    }
    this.started = true;
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.callbacks.onStatus?.("Идет игра");
    this.callbacks.onScore?.(this.score);
    this.callbacks.onLevel?.(1);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.paused = true;
    this.stopTimer();
    this.callbacks.onStatus?.("Пауза");
  }

  resume() {
    if (!this.started || !this.paused || this.ended) return;
    this.running = true;
    this.paused = false;
    if (!this.firstReveal) {
      this.startTimer();
    }
    this.callbacks.onStatus?.("Идет игра");
  }

  restart() {
    this.stopTimer();
    this.resetState();
    this.start();
  }

  resetState() {
    this.board = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => createCell())
    );
    this.flags = 0;
    this.revealedSafe = 0;
    this.elapsed = 0;
    this.score = 0;
    this.firstReveal = true;
    this.touchMode = "reveal";
    this.ended = false;
    this.paused = false;
    this.running = false;
    this.started = false;
    this.roundCounted = false;
    this.stopTimer();
    this.callbacks.onScore?.(this.score);
    this.callbacks.onLevel?.(1);
    this.callbacks.onStatus?.("Готов");
    this.renderBoard(true);
    this.updateHud();
    if (this.touchModeButton) {
      this.touchModeButton.textContent = "Режим: Открытие";
      this.touchModeButton.classList.add("secondary");
      this.touchModeButton.classList.remove("primary");
    }
  }

  plantMines(safeRow, safeCol) {
    let planted = 0;
    while (planted < this.mineCount) {
      const row = Math.floor(Math.random() * this.size);
      const col = Math.floor(Math.random() * this.size);
      const cell = this.board[row][col];
      if (cell.mine) continue;
      if (row === safeRow && col === safeCol) continue;
      cell.mine = true;
      planted += 1;
    }
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        if (this.board[row][col].mine) continue;
        this.board[row][col].adjacent = this.countAdjacentMines(row, col);
      }
    }
  }

  countAdjacentMines(row, col) {
    let count = 0;
    for (let dRow = -1; dRow <= 1; dRow += 1) {
      for (let dCol = -1; dCol <= 1; dCol += 1) {
        if (dRow === 0 && dCol === 0) continue;
        const nRow = row + dRow;
        const nCol = col + dCol;
        if (inBounds(this.size, nRow, nCol) && this.board[nRow][nCol].mine) {
          count += 1;
        }
      }
    }
    return count;
  }

  onBoardClick(event) {
    if (!this.running || this.paused || this.ended) return;
    const target = event.target.closest(".mine-cell");
    if (!target) return;

    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    const cell = this.board[row][col];
    if (cell.revealed || cell.flagged) return;

    if (this.isCoarsePointer && this.touchMode === "flag") {
      this.toggleFlag(row, col);
      return;
    }

    if (this.firstReveal) {
      this.firstReveal = false;
      this.plantMines(row, col);
      this.startTimer();
    }

    if (cell.mine) {
      cell.revealed = true;
      this.revealAllMines();
      this.endGame(false, "Попадание на мину");
      return;
    }

    const revealed = this.revealFlood(row, col);
    if (revealed > 0) {
      this.revealedSafe += revealed;
      this.score += revealed * 10;
      this.callbacks.onMetric?.("minesweeper.cellsRevealed", revealed, "add");
      this.callbacks.onMetric?.("minesweeper.score", this.score, "max");
      this.callbacks.onScore?.(this.score);
      this.callbacks.onSfx?.("point");
    }

    if (this.revealedSafe >= this.totalSafe) {
      this.endGame(true, "Поле полностью очищено");
      return;
    }

    this.updateHud();
    this.renderBoard(false);
  }

  onBoardContext(event) {
    event.preventDefault();
    if (!this.running || this.paused || this.ended) return;
    const target = event.target.closest(".mine-cell");
    if (!target) return;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    this.toggleFlag(row, col);
  }

  toggleFlag(row, col) {
    const cell = this.board[row][col];
    if (!cell || cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.flags += cell.flagged ? 1 : -1;
    if (cell.flagged) {
      this.callbacks.onMetric?.("minesweeper.flagsPlaced", 1, "add");
    }
    this.updateHud();
    const cellEl = this.boardEl?.querySelector(`.mine-cell[data-row="${row}"][data-col="${col}"]`);
    if (cellEl) {
      this.renderCell(cellEl, row, col);
    }
    this.callbacks.onSfx?.("move");
  }

  toggleTouchMode() {
    this.touchMode = this.touchMode === "reveal" ? "flag" : "reveal";
    const text = this.touchMode === "reveal" ? "Режим: Открытие" : "Режим: Флаг";
    if (this.touchModeButton) {
      this.touchModeButton.textContent = text;
      this.touchModeButton.classList.toggle("primary", this.touchMode === "flag");
      this.touchModeButton.classList.toggle("secondary", this.touchMode !== "flag");
    }
  }

  revealFlood(startRow, startCol) {
    let revealed = 0;
    const queue = [[startRow, startCol]];
    while (queue.length > 0) {
      const [row, col] = queue.shift();
      if (!inBounds(this.size, row, col)) continue;
      const cell = this.board[row][col];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      if (cell.mine) continue;
      revealed += 1;

      if (cell.adjacent === 0) {
        for (let dRow = -1; dRow <= 1; dRow += 1) {
          for (let dCol = -1; dCol <= 1; dCol += 1) {
            if (dRow === 0 && dCol === 0) continue;
            queue.push([row + dRow, col + dCol]);
          }
        }
      }
    }
    return revealed;
  }

  revealAllMines() {
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        if (this.board[row][col].mine) {
          this.board[row][col].revealed = true;
        }
      }
    }
    this.renderBoard(false);
  }

  endGame(won, reason) {
    this.running = false;
    this.paused = false;
    this.ended = true;
    this.stopTimer();

    if (won) {
      const bonus = Math.max(100, 1400 - this.elapsed * 6);
      this.score += bonus;
      this.callbacks.onMetric?.("minesweeper.gamesWon", 1, "add");
      this.callbacks.onMetric?.("minesweeper.bestTime", this.elapsed, "min");
      this.callbacks.onMetric?.("minesweeper.score", this.score, "max");
      this.callbacks.onScore?.(this.score);
      this.callbacks.onStatus?.("Победа");
      this.callbacks.onSfx?.("achievement");
      this.callbacks.onGameOver?.({
        won: true,
        score: this.score,
        time: this.elapsed,
        reason
      });
    } else {
      this.callbacks.onStatus?.("Поражение");
      this.callbacks.onSfx?.("gameover");
      this.callbacks.onGameOver?.({
        won: false,
        score: this.score,
        time: this.elapsed,
        reason
      });
    }
    this.renderBoard(false);
    this.updateHud();
  }

  startTimer() {
    this.stopTimer();
    this.timerHandle = window.setInterval(() => {
      if (!this.running || this.paused || this.ended) return;
      this.elapsed += 1;
      this.callbacks.onMetric?.("minesweeper.maxSurvival", this.elapsed, "max");
      this.updateHud();
    }, 1000);
  }

  stopTimer() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  updateHud() {
    if (this.timeNode) this.timeNode.textContent = `${this.elapsed} с`;
    if (this.minesNode) this.minesNode.textContent = String(this.mineCount);
    if (this.flagsNode) this.flagsNode.textContent = String(this.flags);
    if (this.openedNode) this.openedNode.textContent = String(this.revealedSafe);
  }

  renderBoard(rebuild) {
    if (!this.boardEl) return;
    if (rebuild) {
      this.boardEl.innerHTML = "";
      const fragment = document.createDocumentFragment();
      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mine-cell";
          button.dataset.row = String(row);
          button.dataset.col = String(col);
          button.setAttribute("aria-label", `Клетка ${row + 1}-${col + 1}`);
          fragment.appendChild(button);
        }
      }
      this.boardEl.appendChild(fragment);
    }

    const cells = this.boardEl.querySelectorAll(".mine-cell");
    cells.forEach((cellEl) => {
      const row = Number(cellEl.dataset.row);
      const col = Number(cellEl.dataset.col);
      this.renderCell(cellEl, row, col);
    });
  }

  renderCell(cellEl, row, col) {
    const cell = this.board[row][col];
    cellEl.className = "mine-cell";
    cellEl.textContent = "";
    for (let i = 1; i <= 8; i += 1) {
      cellEl.classList.remove(`num-${i}`);
    }

    if (cell.flagged && !cell.revealed) {
      cellEl.classList.add("flagged");
      return;
    }

    if (!cell.revealed) {
      return;
    }

    cellEl.classList.add("revealed");
    if (cell.mine) {
      cellEl.classList.add("mine");
      cellEl.textContent = "✹";
      return;
    }
    if (cell.adjacent > 0) {
      cellEl.textContent = String(cell.adjacent);
      cellEl.classList.add(`num-${cell.adjacent}`);
    }
  }
}

window.MinesweeperGame = MinesweeperGame;
