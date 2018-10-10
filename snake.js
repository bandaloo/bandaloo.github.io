var canvas = document.getElementById("minecanvas");
var scoreLabel = document.getElementById("scorelabel");
var context = canvas.getContext("2d");

var width = 10;
var height = 10;

var cellWidth = 32;
var cellHeight = 32;
var borderWidth = 1;
var borderHeight = 1;

var moveX = 1, moveY = 0;
var newMoveX = 1, newMoveY = 0;

var headX = 5;
var headY = 5;
var tailX = 4;
var tailY = 5;

var gameSpeed = 10;

var foodX = 7, foodY = 7;

var counter = 0;
var score = 0;
var nextLevel = 5;

var grid = [];
var spots = [];

var hesitate = false;
var disabled = false;

var eyePos = [[1, 1], [1, -1]];

var background = "#C0C840";
var foreground = "#786D21";
var outlines = "#AAB23A";

var moveQueue = [];

function drawRect(i, j) {
  context.fillRect(i * cellWidth + borderWidth, j * cellWidth + borderHeight,
                   cellWidth - borderWidth * 2, cellHeight - borderHeight * 2);
}

function drawFood() {
  context.fillStyle = foreground;
  context.strokeStyle = foreground;
  drawCircle(foodX, foodY, 0, 0, cellWidth / 2 - 6);
  //drawRect(foodX, foodY);
}

function drawCircle(i, j, offsetX, offsetY, radius) {
  context.beginPath();
  context.arc(cellWidth * (i + 0.5) + offsetX, cellHeight * (j + 0.5) + offsetY,
              radius, 0, 2 * Math.PI, false);
  context.fill();
  context.stroke();
}

function drawEyes() {
  context.fillStyle = background;
  var spacing = 7;
  var radius = 6;
  drawCircle(headX, headY, eyePos[0][0] * spacing, eyePos[0][1] * spacing, radius);
  drawCircle(headX, headY, eyePos[1][0] * spacing, eyePos[1][1] * spacing, radius);
}

function createGrid() {
  context.fillStyle = outlines;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  for (var i = 0; i < width; i++) {
    grid.push([]);
    for (var j = 0; j < height; j++) {
      grid[i].push({x: 0, y: 0}); 
      drawRect(i, j);
    }
  }
}

function drawInitialSnake() {
  context.fillStyle = foreground;
  drawEyes();
  drawRect(headX, headY);
  drawRect(tailX, tailY);
}

function moveFood() {
  spots = [];
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (grid[i][j].x == 0 && grid[i][j].y == 0 && !(i == headX && j == headY)) {
        spots.push({x: i, y: j});
      }
    }
  }
  if (spots.length == 0) {
    scoreLabel.innerHTML = "you win!";
    disabled = true;
    return;
  }
  pick = spots[Math.floor(Math.random() * spots.length)];
  foodX = pick.x;
  foodY = pick.y;
  drawFood();
  hesitate = true;
}


document.addEventListener('keydown', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);
  var doPush= true;
  // 37 40 38 39
  if (key == 'H' || code == 37) {
    newMoveX = -1;
    newMoveY = 0;
  } else if (key == 'J' || code == 40) {
    newMoveX = 0;
    newMoveY = 1;
  } else if (key == 'K' || code == 38) {
    newMoveX = 0;
    newMoveY = -1;
  } else if (key == 'L' || code == 39) {
    newMoveX = 1;
    newMoveY = 0;
  } else {
    doPush = false;
  }
  if (doPush) {
    moveQueue.unshift({x: newMoveX, y: newMoveY});
  }
  if (moveQueue.length > 2) {
    moveQueue.pop();
  }
});

function setEyePosition() {
  if (moveX == -1 && moveY == 0) {
    eyePos = [[-1, 1], [-1, -1]];
  } else if (moveX == 0 && moveY == 1) {
    eyePos = [[-1, 1], [1, 1]];
  } else if (moveX == 0 && moveY == -1) {
    eyePos = [[-1, -1], [1, -1]];
  } else if (moveX == 1 && moveY == 0) {
    eyePos = [[1, 1], [1, -1]];
  }
}

function wrap(n, s) {
  if (n < 0) return n + s;
  if (n >= s) return n - s;
  return n;
}

function update() {
  if (!disabled && counter == gameSpeed) {
    counter = 0;
    context.fillStyle = foreground;
    drawRect(headX, headY);
    if (moveQueue.length != 0) {
      newMove = moveQueue.pop();
    } else {
      newMove = {x: moveX, y: moveY};
    }
    if (newMove.x != -moveX && newMove.y != -moveY) {
      moveX = newMove.x;
      moveY = newMove.y;
    }
    var prevTailX = tailX;
    var prevTailY = tailY;
    // head places trail
    grid[headX][headY] = {x: moveX, y: moveY};
    // head and tail follow trail
    headX = wrap(headX + moveX, width);
    headY = wrap(headY + moveY, height);
    if (!hesitate) {
      tailX = wrap(tailX + grid[prevTailX][prevTailY].x, width);
      tailY = wrap(tailY + grid[prevTailX][prevTailY].y, height);
      grid[prevTailX][prevTailY] = {x: 0, y: 0};
      context.fillStyle = background;
      drawRect(prevTailX, prevTailY);
    }
    hesitate = false;
    context.fillStyle = foreground;
    drawRect(headX, headY);
    setEyePosition();
    drawEyes();
    if (headX == foodX && headY == foodY) {
      score++;
      if (score == nextLevel && gameSpeed > 3) {
        gameSpeed--;
        nextLevel += 5;
      }
      hesitate = true;
      moveFood();
    }
    if (grid[headX][headY].x != 0 || grid[headX][headY].y != 0) {
      disabled = true;
      scoreLabel.innerHTML = "you lost! final score: " + score;
    } else {
      scoreLabel.innerHTML = "score: " + score;
    }
  }
  counter++;
  requestAnimationFrame(update);
}

createGrid();
drawFood();
grid[headX][headY] = {x: 1, y: 0};
grid[tailX][tailY] = {x: 1, y: 0};
drawInitialSnake();
update();
