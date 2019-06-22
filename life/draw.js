"use strict"
var startColor = {r: 0, g: 0, b: 255};
var endColor = {r: 255, g: 0, b: 0};

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
      //context.fillStyle = blendColor(age);
      drawSizedRect(i, j, size, sizeScalar);

      if (gridToggle.isOn) {
        context.strokeStyle = "#bbbbbb"; // TODO move this
        drawHollowRect(i, j);
      }
    }

    if (moving) { // draw grid if box is being dragged
      context.fillStyle = "white";
      for (let i = 0; i < moveBox.x2 - moveBox.x1 + 1; i++) {
        for (let j = 0; j < moveBox.y2 - moveBox.y1 + 1; j++) {
          const pos = {x: i + selectBox.x1, y: j + selectBox.y1};
          if (posInbounds(pos.x, pos.y)) {
            drawSizedRect(pos.x, pos.y, size, sizeScalar,
                          moveBox.x1 - selectBox.x1, moveBox.y1 - selectBox.y1);
          }
        }
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

  if (shiftCorner.x2 !== undefined) // TODO check this
    drawSelection(selectBox);
  if (moving)
    drawSelection(moveBox);
}

function drawSizedRect(i, j, size, sizeScalar, offsetX = 0, offsetY = 0) {
  const pos = {x: i + offsetX, y: j + offsetY};
  if (board[i][j]) {
    // TODO move this to function
    if (!prevBoard[i][j]) {
      drawRect(pos.x, pos.y, size * sizeScalar);
    } else {
      drawRect(pos.x, pos.y, sizeScalar);
    }
  } else {
    if (prevBoard[i][j]) {
      drawRect(pos.x, pos.y, (1 - size) * sizeScalar);
    }
  }
}

function drawRect(i, j, size = 1) {
  const x1 = cellWidth * (i + (1 - size) / 2);
  const y1 = cellHeight * (j + (1 - size) / 2);
  context.fillRect(x1, y1, cellWidth * size, cellHeight * size);
}

function drawSelection(box) {
  context.save();
  context.setLineDash([10, 10]);
  context.lineWidth = 3;
  context.strokeStyle = "white";

  // TODO this should probably go somewhere else
  const rWidth = box.x2 - box.x1 + 1;
  const rHeight = box.y2 - box.y1 + 1;
  context.strokeRect(box.x1 * cellWidth, box.y1 * cellHeight,
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

function convertHexColor(str) {
  str = str.substr(1, 6);
  let list = str.match(/.{1,2}/g);
  return {r: parseInt(list[0], 16), g: parseInt(list[1], 16), b: parseInt(list[2], 16)};
}

function colorHeatmap(age) {
  return hsl(age * 1.5);
}

function blendColor(age) {
  let m = (c1, c2) => age / 100 * c1 + (1 - age / 100) * c2;
  return rgba(m(startColor.r, endColor.r), m(startColor.g, endColor.g),
              m(startColor.b, endColor.b));
}

function colorRedBlue(age) {
  return rgba((1 - age / 200)* 255, 0, age / 200 * 255);
}
