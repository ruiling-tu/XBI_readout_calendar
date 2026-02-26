const BOARD_SIZE = 15;
const WIN_CONDITION = 5;
const players = [
  {
    id: 1,
    codename: "Aurora",
    accent: "var(--accent)",
    description: "Photon Vanguard",
  },
  {
    id: -1,
    codename: "Nebula",
    accent: "var(--danger)",
    description: "Quantum Tide",
  },
];

const app = document.getElementById("app");

const state = {
  board: [],
  currentPlayerIndex: 0,
  moveHistory: [],
  gameOver: false,
  scores: {
    1: 0,
    "-1": 0,
  },
};

const elements = {};

function createBoardMatrix() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
}

function setupLayout() {
  app.innerHTML = `
    <main class="neon-grid">
      <section class="board-pane">
        <div class="board-wrapper">
          <div class="board-grid" id="boardGrid" role="grid" aria-label="Gomoku board"></div>
          <div class="board-overlay" aria-hidden="true"></div>
        </div>
      </section>
      <aside class="control-hub">
        <div class="hud-card primary">
          <header>
            <h1>Neon Nexus Gomoku</h1>
            <p class="subtitle">Deploy five quantum nodes in an unbroken vector.</p>
          </header>
          <div class="status-block">
            <p id="statusLine">Initializing grid…</p>
            <div class="turn-indicator" id="turnIndicator">
              <span class="label">Current Transmission:</span>
              <span class="value"></span>
            </div>
          </div>
          <div class="button-row">
            <button id="resetButton" class="pill">Reinitialize Grid</button>
            <button id="undoButton" class="pill ghost">Undo Pulse</button>
          </div>
        </div>

        <div class="hud-card metrics">
          <h2>Energy Streams</h2>
          <ul class="player-legend" id="playerLegend"></ul>
          <div class="score-panel">
            <div>
              <span class="label">Aurora Wins</span>
              <span class="value" id="scoreAurora">0</span>
            </div>
            <div>
              <span class="label">Nebula Wins</span>
              <span class="value" id="scoreNebula">0</span>
            </div>
          </div>
        </div>

        <div class="hud-card feed">
          <h2>Recent Deployments</h2>
          <ol class="move-feed" id="moveFeed" aria-live="polite"></ol>
        </div>
      </aside>
    </main>
  `;

  elements.boardGrid = document.getElementById("boardGrid");
  elements.statusLine = document.getElementById("statusLine");
  elements.turnIndicator = document.getElementById("turnIndicator");
  elements.moveFeed = document.getElementById("moveFeed");
  elements.resetButton = document.getElementById("resetButton");
  elements.undoButton = document.getElementById("undoButton");
  elements.scoreAurora = document.getElementById("scoreAurora");
  elements.scoreNebula = document.getElementById("scoreNebula");
  elements.playerLegend = document.getElementById("playerLegend");

  elements.resetButton.addEventListener("click", () => resetGame());
  elements.undoButton.addEventListener("click", undoMove);
}

function populateLegend() {
  elements.playerLegend.innerHTML = players
    .map(
      (player) => `
        <li data-player="${player.id}">
          <span class="chip" style="--chip-color: ${player.accent};"></span>
          <div>
            <span class="codename">${player.codename}</span>
            <span class="role">${player.description}</span>
          </div>
        </li>
      `,
    )
    .join("");
}

function buildBoard() {
  elements.boardGrid.style.setProperty("--grid-size", BOARD_SIZE);
  elements.boardGrid.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "grid-cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${row + 1}, Column ${col + 1}`);
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener("click", handleCellClick);

      elements.boardGrid.appendChild(cell);
    }
  }
}

function resetGame(preserveTurn = false) {
  state.board = createBoardMatrix();
  state.moveHistory = [];
  state.gameOver = false;

  if (!preserveTurn) {
    state.currentPlayerIndex = Math.random() > 0.5 ? 0 : 1;
  }

  elements.boardGrid.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.dataset.player = "";
    cell.classList.remove("last-move", "winning-path");
    cell.removeAttribute("data-order");
    cell.disabled = false;
  });

  updateStatus();
  updateTurnIndicator();
  refreshMoveFeed();
  updateScoreboard();
}

function handleCellClick(event) {
  if (state.gameOver) return;

  const cell = event.currentTarget;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  if (state.board[row][col] !== 0) return;

  const currentPlayer = players[state.currentPlayerIndex];
  state.board[row][col] = currentPlayer.id;

  cell.dataset.player = currentPlayer.id;
  markLastMove(cell);

  const moveDescriptor = {
    player: currentPlayer,
    row,
    col,
    order: state.moveHistory.length + 1,
  };

  state.moveHistory.push(moveDescriptor);
  cell.dataset.order = moveDescriptor.order;

  const victoryPath = evaluateVictory(row, col, currentPlayer.id);

  if (victoryPath) {
    concludeMatch(currentPlayer, victoryPath);
    return;
  }

  if (state.moveHistory.length === BOARD_SIZE * BOARD_SIZE) {
    concludeDraw();
    return;
  }

  advanceTurn();
  refreshMoveFeed();
}

function advanceTurn() {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
  updateTurnIndicator();
  updateStatus();
}

function concludeMatch(winner, path) {
  state.gameOver = true;
  state.scores[winner.id] += 1;

  path.forEach(({ row, col }) => {
    const selector = `.grid-cell[data-row="${row}"][data-col="${col}"]`;
    const cell = elements.boardGrid.querySelector(selector);
    if (cell) {
      cell.classList.add("winning-path");
    }
  });

  elements.statusLine.textContent = `${winner.codename} establishes quantum dominance!`;
  updateTurnIndicator(true, winner);
  updateScoreboard();
  refreshMoveFeed();
  disableBoard();
}

function concludeDraw() {
  state.gameOver = true;
  elements.statusLine.textContent =
    "The grid reaches equilibrium. No dominant stream detected.";
  updateTurnIndicator(true);
  refreshMoveFeed();
  disableBoard();
}

function disableBoard() {
  elements.boardGrid.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.disabled = true;
  });
}

function undoMove() {
  if (state.moveHistory.length === 0 || state.gameOver) return;

  const lastMove = state.moveHistory.pop();
  state.board[lastMove.row][lastMove.col] = 0;

  const cell = elements.boardGrid.querySelector(
    `.grid-cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`,
  );

  if (cell) {
    cell.dataset.player = "";
    cell.removeAttribute("data-order");
    cell.classList.remove("last-move");
    cell.disabled = false;
  }

  if (!state.gameOver) {
    state.currentPlayerIndex =
      players.findIndex((player) => player.id === lastMove.player.id);
  } else {
    state.gameOver = false;
  }

  elements.boardGrid
    .querySelectorAll(".grid-cell")
    .forEach((gridCell) => gridCell.classList.remove("winning-path"));

  updateStatus();
  updateTurnIndicator();
  refreshMoveFeed();
}

function markLastMove(cell) {
  elements.boardGrid
    .querySelectorAll(".grid-cell.last-move")
    .forEach((item) => item.classList.remove("last-move"));
  cell.classList.add("last-move");
}

function updateStatus() {
  if (state.gameOver) return;
  const currentPlayer = players[state.currentPlayerIndex];
  elements.statusLine.textContent = `${currentPlayer.codename} deploys next node.`;
}

function updateTurnIndicator(finalized = false, winner = null) {
  const indicatorValue = elements.turnIndicator.querySelector(".value");

  if (finalized) {
    indicatorValue.textContent = winner
      ? `${winner.codename}`
      : "Equilibrium Achieved";
    elements.turnIndicator.dataset.state = winner ? "victory" : "draw";
    return;
  }

  const currentPlayer = players[state.currentPlayerIndex];
  indicatorValue.textContent = `${currentPlayer.codename} — ${currentPlayer.description}`;
  elements.turnIndicator.dataset.state = currentPlayer.id;
}

function refreshMoveFeed() {
  if (!elements.moveFeed) return;
  const latestMoves = [...state.moveHistory].slice(-6).reverse();
  elements.moveFeed.innerHTML = latestMoves
    .map((move) => {
      const humanRow = move.row + 1;
      const humanCol = move.col + 1;
      return `
        <li data-player="${move.player.id}">
          <span class="index">#${move.order}</span>
          <span class="codename">${move.player.codename}</span>
          <span class="coords">(${humanRow}, ${humanCol})</span>
        </li>
      `;
    })
    .join("");
}

function updateScoreboard() {
  elements.scoreAurora.textContent = state.scores[1];
  elements.scoreNebula.textContent = state.scores["-1"];
}

function evaluateVictory(row, col, playerId) {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const { dr, dc } of directions) {
    const path = [{ row, col }];
    let count = 1;

    count += countInDirection(row, col, dr, dc, playerId, path);
    count += countInDirection(row, col, -dr, -dc, playerId, path);

    if (count >= WIN_CONDITION) {
      return path;
    }
  }

  return null;
}

function countInDirection(row, col, dr, dc, playerId, path) {
  let r = row + dr;
  let c = col + dc;
  let count = 0;

  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE) {
    if (state.board[r][c] !== playerId) break;
    path.push({ row: r, col: c });
    count += 1;
    r += dr;
    c += dc;
  }

  return count;
}

function init() {
  setupLayout();
  populateLegend();
  buildBoard();
  resetGame();
  updateScoreboard();
}

init();
