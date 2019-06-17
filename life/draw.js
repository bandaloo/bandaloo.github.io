"use strict"
function drawBoard(i, j) {
  clearScreen();
  let size = animTime * 2 / delay;
  let sizeScalar = borderToggle.isOn ? 0.9 : 1;
  if (size > 1)
    size = 1;
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      if (trailToggle.isOn && trailBoard[i][j]) {
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
          drawRect(i, j, size * sizeScalar);
        } else {
          drawRect(i, j, sizeScalar);
        }
      } else {
        if (prevBoard[i][j]) {
          drawRect(i, j, (1 - size) * sizeScalar);
        }
      }
      if (gridToggle.isOn) {
        context.strokeStyle = "#bbbbbb"; // TODO move this
        drawHollowRect(i, j);
      }
    }
  }
  if (gridToggle.isOn) {
    context.strokeStyle = "green";
    context.beginPath();
    context.moveTo(0, canvas.height / 2);
    context.lineTo(canvas.width, canvas.height / 2);
    context.stroke();

    context.strokeStyle = "blue";
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
  }

  if (shiftCorner.x2 !== undefined)
    drawSelection();
}

function drawRect(i, j, size = 1) {
  const x1 = cellWidth * (i + (1 - size) / 2);
  const y1 = cellHeight * (j + (1 - size) / 2);
  context.fillRect(x1, y1, cellWidth * size, cellHeight * size);
}

function drawSelection() {
  context.save();
  context.setLineDash([10, 10]);
  context.lineWidth = 3;
  context.strokeStyle = "white";

  if (shiftCorner.x2 < shiftCorner.x1)
    selectBox = {x1: shiftCorner.x2, x2: shiftCorner.x1};
  else
    selectBox = {x1: shiftCorner.x1, x2: shiftCorner.x2};

  if (shiftCorner.y2 < shiftCorner.y1)
    selectBox = Object.assign(selectBox, {y1: shiftCorner.y2, y2: shiftCorner.y1});
  else
    selectBox = Object.assign(selectBox, {y1: shiftCorner.y1, y2: shiftCorner.y2});

  const rWidth = selectBox.x2 - selectBox.x1 + 1;
  const rHeight = selectBox.y2 - selectBox.y1 + 1;
  context.strokeRect(selectBox.x1 * cellWidth, selectBox.y1 * cellHeight,
                     rWidth * cellWidth, rHeight * cellHeight);
  context.restore();
}

function drawHollowRect(i, j) {
  context.strokeRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
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
