"use strict"
function drawBoard(i, j) {
  clearScreen();
  let size = animTime * 2 / delay;
  if (size > 1)
    size = 1;
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      let age = ageGrid[i][j] * 5;
      if (age > 100)
        age = 100;
      context.fillStyle = colorHeatmap(age);
      if (board[i][j]) {
        if (!prevBoard[i][j]) {
          drawRect(i, j, size);
        } else {
          drawRect(i, j);
        }
      } else {
        if (prevBoard[i][j]) {
          drawRect(i, j, 1 - size);
        }
      }
    }
  }
}

function drawRect(i, j, size = 1) {
  const x1 = cellWidth * (i + (1 - size) / 2)
  const y1 = cellHeight * (j + (1 - size) / 2)
  context.fillRect(x1, y1, cellWidth * size, cellHeight * size);
}

function rgba(r, g = 0, b = 0, a = 1) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hsl(h, s = 100, l = 50) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function colorHeatmap(age) {
  return hsl(age * 1.5);
}
