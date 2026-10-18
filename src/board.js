export const BOARD_SIZE = 8;

export const SHAPE_CATALOG = [
  { name: "נקודה", cells: [[0, 0]] },
  { name: "דומינו", cells: [[0, 0], [0, 1]] },
  { name: "שלישייה", cells: [[0, 0], [0, 1], [0, 2]] },
  { name: "פינה", cells: [[0, 0], [1, 0], [1, 1]] },
  { name: "ריבוע", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { name: "קו ארוך", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { name: "קו עומד", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: "זיגזג", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { name: "טי", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { name: "אלכסון", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { name: "מדרגה", cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },
  { name: "צלב קטן", cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { name: "מלבן", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { name: "מגדל", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { name: "קשת", cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
];

export function createBoard(size = BOARD_SIZE) {
  const dimension = Number.isInteger(size) && size > 0 ? size : BOARD_SIZE;
  return Array.from({ length: dimension }, () => Array(dimension).fill(null));
}

export function canPlace(board, shape, row, col) {
  if (!Array.isArray(board) || board.length === 0 || !Array.isArray(shape?.cells)) {
    return false;
  }
  const size = board.length;
  if (!board.every((line) => Array.isArray(line) && line.length === size)) return false;
  if (!Number.isInteger(row) || !Number.isInteger(col) || shape.cells.length === 0) return false;

  return shape.cells.every(([cellRow, cellCol]) => {
    const targetRow = row + cellRow;
    const targetCol = col + cellCol;
    return (
      Number.isInteger(cellRow) &&
      Number.isInteger(cellCol) &&
      targetRow >= 0 &&
      targetCol >= 0 &&
      targetRow < size &&
      targetCol < size &&
      board[targetRow][targetCol] === null
    );
  });
}

export function placeShape(board, shape, row, col, color = "#48e5c2") {
  if (!canPlace(board, shape, row, col)) return board;
  const nextBoard = board.map((line) => line.slice());
  for (const [cellRow, cellCol] of shape.cells) {
    nextBoard[row + cellRow][col + cellCol] = { color };
  }
  return nextBoard;
}

export function clearFullLines(board) {
  if (!Array.isArray(board) || board.length === 0) {
    return { board, clearedLines: 0 };
  }
  const size = board.length;
  const fullRows = new Set();
  const fullCols = new Set();

  for (let row = 0; row < size; row += 1) {
    if (board[row].every((cell) => cell !== null)) fullRows.add(row);
  }
  for (let col = 0; col < size; col += 1) {
    if (board.every((line) => line[col] !== null)) fullCols.add(col);
  }

  const clearedLines = fullRows.size + fullCols.size;
  if (clearedLines === 0) return { board, clearedLines: 0 };

  const nextBoard = board.map((line) => line.slice());
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (fullRows.has(row) || fullCols.has(col)) nextBoard[row][col] = null;
    }
  }
  return { board: nextBoard, clearedLines };
}

export function hasAnyMove(board, shapes) {
  if (!Array.isArray(shapes) || shapes.length === 0) return false;
  return shapes.some((shape) => {
    if (!shape) return false;
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board.length; col += 1) {
        if (canPlace(board, shape, row, col)) return true;
      }
    }
    return false;
  });
}

