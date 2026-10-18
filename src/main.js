import {
  BOARD_SIZE,
  SHAPE_CATALOG,
  canPlace,
  clearFullLines,
  createBoard,
  hasAnyMove,
  placeShape,
} from "./board.js";
import { createAudioController } from "./audio.js";

const COLORS = ["#53e6d0", "#a78bfa", "#ff83c8", "#ffc66e", "#6db8ff", "#ff8589"];
const SETTINGS_KEY = "echoBlocksSettings";
const HIGH_SCORE_KEY = "echoBlocksHighScore";
const DEFAULT_SETTINGS = { volume: 0.38, muted: false, showCombo: true };

const boardElement = document.querySelector("#board");
const trayElement = document.querySelector("#shape-tray");
const scoreElement = document.querySelector("#current-score");
const bestElement = document.querySelector("#best-score");
const comboElement = document.querySelector("#combo-banner");
const hintElement = document.querySelector("#game-hint");
const gameOverElement = document.querySelector("#game-over");
const finalScoreElement = document.querySelector("#final-score");
const toastElement = document.querySelector("#toast");
const settingsDialog = document.querySelector("#settings-dialog");
const volumeInput = document.querySelector("#music-volume");
const volumeValue = document.querySelector("#volume-value");
const muteInput = document.querySelector("#mute-music");
const comboInput = document.querySelector("#show-combo");
const audio = createAudioController();

const state = {
  board: createBoard(BOARD_SIZE),
  pieces: [],
  score: 0,
  best: loadBestScore(),
  combo: 0,
  selected: null,
  settings: loadSettings(),
  isOver: false,
  drag: null,
};

let toastTimer;
let comboTimer;
let suppressTrayClick = false;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_SETTINGS };
    const volume = Number(saved.volume);
    return {
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_SETTINGS.volume,
      muted: Boolean(saved.muted),
      showCombo: saved.showCombo !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadBestScore() {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    showToast("אי אפשר לשמור הגדרות בדפדפן הזה");
  }
}

function saveBestScore() {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(state.best));
  } catch {
    showToast("אי אפשר לשמור את השיא בדפדפן הזה");
  }
}

function randomPiece() {
  const template = SHAPE_CATALOG[Math.floor(Math.random() * SHAPE_CATALOG.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    name: template.name,
    cells: template.cells.map(([row, col]) => [row, col]),
    color,
  };
}

function drawPieces() {
  return Array.from({ length: 3 }, randomPiece);
}

function renderBoard() {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const tile = state.board[row][col];
      const colorStyle = tile ? ` style="--tile-color:${tile.color}"` : "";
      const filledClass = tile ? " filled" : "";
      const label = tile ? "תא תפוס" : "תא פנוי";
      cells.push(
        `<button class="board-cell${filledClass}" type="button" role="gridcell" data-row="${row}" data-col="${col}" aria-label="שורה ${row + 1}, עמודה ${col + 1}, ${label}"${colorStyle}></button>`,
      );
    }
  }
  boardElement.innerHTML = cells.join("");
}

function shapeMarkup(piece) {
  const rows = Math.max(...piece.cells.map(([row]) => row)) + 1;
  const cols = Math.max(...piece.cells.map(([, col]) => col)) + 1;
  const occupied = new Set(piece.cells.map(([row, col]) => `${row},${col}`));
  const miniCells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const key = `${row},${col}`;
      miniCells.push(
        `<span class="mini-cell"${occupied.has(key) ? ` style="--tile-color:${piece.color}"` : " style="visibility:hidden"`}></span>`,
      );
    }
  }
  return `<span class="shape-preview" style="--shape-rows:${rows};--shape-cols:${cols};--tile-color:${piece.color}">${miniCells.join("")}</span>`;
}

function renderTray() {
  trayElement.innerHTML = state.pieces
    .map((piece, index) => {
      if (!piece) {
        return `<button class="shape-option used" type="button" aria-hidden="true" tabindex="-1"></button>`;
      }
      const selected = state.selected === index ? " selected" : "";
      return `<button class="shape-option${selected}" type="button" data-piece-index="${index}" aria-pressed="${state.selected === index}" aria-label="בחירת צורת ${piece.name}">${shapeMarkup(piece)}<span class="shape-name">${piece.name}</span></button>`;
    })
    .join("");
}

function render() {
  scoreElement.textContent = String(state.score);
  bestElement.textContent = String(state.best);
  gameOverElement.hidden = !state.isOver;
  finalScoreElement.textContent = String(state.score);
  hintElement.textContent = state.isOver
    ? "התחל משחק חדש כדי לנסות לשבור את השיא"
    : state.selected === null
      ? "בחר צורה ואז הקש על מקום פנוי בלוח"
      : "עכשיו הקש על תא פנוי בלוח כדי להניח את הצורה";
  renderBoard();
  renderTray();
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastElement.classList.remove("visible"), 1650);
}

function showCombo() {
  if (!state.settings.showCombo || state.combo === 0) {
    comboElement.textContent = "";
    comboElement.classList.remove("pop");
    return;
  }
  comboElement.textContent = `COMBO ${state.combo}x`;
  comboElement.classList.remove("pop");
  void comboElement.offsetWidth;
  comboElement.classList.add("pop");
  window.clearTimeout(comboTimer);
  comboTimer = window.setTimeout(() => comboElement.classList.remove("pop"), 540);
}

function updateScoreAfterMove(piece, clearedLines) {
  state.score += piece.cells.length;
  if (clearedLines > 0) {
    state.combo += 1;
    state.score += clearedLines * 10 * state.combo;
    audio.playClear(state.combo);
  } else {
    state.combo = 0;
  }
  showCombo();

  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore();
  }
}

function finishIfNoMoves() {
  const available = state.pieces.filter(Boolean);
  if (hasAnyMove(state.board, available)) return;
  state.isOver = true;
  state.selected = null;
  audio.playGameOver();
}

function placePiece(index, row, col) {
  if (state.isOver) return false;
  const piece = state.pieces[index];
  if (!piece) return false;
  if (!canPlace(state.board, piece, row, col)) {
    showToast("המקום הזה תפוס — נסה מקום אחר");
    return false;
  }

  audio.start();
  state.board = placeShape(state.board, piece, row, col, piece.color);
  const result = clearFullLines(state.board);
  state.board = result.board;
  updateScoreAfterMove(piece, result.clearedLines);
  state.pieces[index] = null;
  state.selected = null;

  if (state.pieces.every((candidate) => candidate === null)) {
    state.pieces = drawPieces();
  }
  finishIfNoMoves();
  render();
  return true;
}

function startNewGame() {
  state.board = createBoard(BOARD_SIZE);
  state.pieces = drawPieces();
  state.score = 0;
  state.combo = 0;
  state.selected = null;
  state.isOver = false;
  comboElement.textContent = "";
  render();
}

function clearPreview() {
  boardElement.querySelectorAll(".preview, .preview-invalid").forEach((cell) => {
    cell.classList.remove("preview", "preview-invalid");
    cell.style.removeProperty("--preview-color");
  });
}

function boardPositionAt(clientX, clientY, piece, offset) {
  const rect = boardElement.getBoundingClientRect();
  const gap = Number.parseFloat(getComputedStyle(boardElement).gap) || 0;
  const cellSize = (rect.width - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;
  const pitch = cellSize + gap;
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  if (localX < 0 || localY < 0 || localX >= rect.width || localY >= rect.height) return null;
  const pointerCol = Math.floor(localX / pitch);
  const pointerRow = Math.floor(localY / pitch);
  if (localX % pitch > cellSize || localY % pitch > cellSize) return null;
  return { row: pointerRow - offset.row, col: pointerCol - offset.col };
}

function previewAt(clientX, clientY) {
  clearPreview();
  if (!state.drag?.moved) return;
  const piece = state.pieces[state.drag.index];
  if (!piece) return;
  const origin = boardPositionAt(clientX, clientY, piece, state.drag.offset);
  if (!origin) return;
  const valid = canPlace(state.board, piece, origin.row, origin.col);
  for (const [row, col] of piece.cells) {
    const cell = boardElement.querySelector(`[data-row="${origin.row + row}"][data-col="${origin.col + col}"]`);
    if (cell) {
      cell.classList.add(valid ? "preview" : "preview-invalid");
      if (valid) cell.style.setProperty("--preview-color", piece.color);
    }
  }
}

function selectPiece(index) {
  if (state.isOver || !state.pieces[index]) return;
  state.selected = state.selected === index ? null : index;
  renderTray();
  hintElement.textContent = state.selected === null
    ? "בחר צורה ואז הקש על מקום פנוי בלוח"
    : "עכשיו הקש על תא פנוי בלוח כדי להניח את הצורה";
}

function suppressPointerClick() {
  suppressTrayClick = true;
  window.setTimeout(() => { suppressTrayClick = false; }, 0);
}

trayElement.addEventListener("click", (event) => {
  if (suppressTrayClick) {
    suppressTrayClick = false;
    return;
  }
  const button = event.target.closest("[data-piece-index]");
  if (button) selectPiece(Number(button.dataset.pieceIndex));
});

trayElement.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("[data-piece-index]");
  if (!button || event.button !== 0) return;
  const index = Number(button.dataset.pieceIndex);
  const piece = state.pieces[index];
  if (!piece) return;
  const rect = button.getBoundingClientRect();
  const shapeRows = Math.max(...piece.cells.map(([row]) => row)) + 1;
  const shapeCols = Math.max(...piece.cells.map(([, col]) => col)) + 1;
  state.drag = {
    index,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    offset: {
      row: Math.min(shapeRows - 1, Math.floor(((event.clientY - rect.top) / rect.height) * shapeRows)),
      col: Math.min(shapeCols - 1, Math.floor(((event.clientX - rect.left) / rect.width) * shapeCols)),
    },
  };
  button.setPointerCapture?.(event.pointerId);
});

document.addEventListener("pointermove", (event) => {
  if (!state.drag) return;
  const distance = Math.hypot(event.clientX - state.drag.startX, event.clientY - state.drag.startY);
  if (distance > 8) state.drag.moved = true;
  previewAt(event.clientX, event.clientY);
});

document.addEventListener("pointerup", (event) => {
  if (!state.drag) return;
  const drag = state.drag;
  state.drag = null;
  clearPreview();
  if (drag.moved) {
    suppressPointerClick();
    const piece = state.pieces[drag.index];
    const origin = piece && boardPositionAt(event.clientX, event.clientY, piece, drag.offset);
    if (origin) placePiece(drag.index, origin.row, origin.col);
    else selectPiece(drag.index);
  } else {
    suppressPointerClick();
    selectPiece(drag.index);
  }
});

boardElement.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-row][data-col]");
  if (!cell || state.selected === null) return;
  placePiece(state.selected, Number(cell.dataset.row), Number(cell.dataset.col));
});

document.querySelector("#open-settings").addEventListener("click", () => settingsDialog.showModal());
document.querySelector("#close-settings").addEventListener("click", () => settingsDialog.close());
settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) settingsDialog.close();
});

volumeInput.addEventListener("input", () => {
  state.settings.volume = Number(volumeInput.value);
  audio.setVolume(state.settings.volume);
  volumeValue.textContent = `${Math.round(state.settings.volume * 100)}%`;
  saveSettings();
});

muteInput.addEventListener("change", () => {
  state.settings.muted = muteInput.checked;
  audio.setMuted(state.settings.muted);
  saveSettings();
});

comboInput.addEventListener("change", () => {
  state.settings.showCombo = comboInput.checked;
  saveSettings();
  showCombo();
});

document.querySelector("#new-game").addEventListener("click", startNewGame);
document.querySelector("#play-again").addEventListener("click", startNewGame);

volumeInput.value = String(state.settings.volume);
volumeValue.textContent = `${Math.round(state.settings.volume * 100)}%`;
muteInput.checked = state.settings.muted;
comboInput.checked = state.settings.showCombo;
audio.setVolume(state.settings.volume);
audio.setMuted(state.settings.muted);
state.pieces = drawPieces();
render();

