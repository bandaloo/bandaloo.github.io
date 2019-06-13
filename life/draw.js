"use strict"
function drawBoard(i, j) {
  clearScreen();
  let size = animTime * 2 / delay;
  if (size > 1)
    size = 1;
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      if (!gamePaused && trailBoard[i][j]) {
        let d = trailBoard[i][j] * 4;
        context.fillStyle = rgba(d, d, d);
        drawRect(i, j);
      }
      let age = ageBoard[i][j] * 5;
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

function drawRect(i, j, size = 1, hollow = false) {
  const x1 = cellWidth * (i + (1 - size) / 2)
  const y1 = cellHeight * (j + (1 - size) / 2)
  if (!hollow) {
    context.fillRect(x1, y1, cellWidth * size, cellHeight * size);
  } else {
    context.rect(x1, y1, cellWidth * size, cellHeight * size);
    context.stroke();
  }
}

function drawHollowRect(i, j) {
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
