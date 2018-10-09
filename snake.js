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

function drawRect(i, j) {
  context.fillRect(i * cellWidth + borderWidth, j * cellWidth + borderHeight,
                   cellWidth - borderWidth * 2, cellHeight - borderHeight * 2);
}

function drawFood() {
  context.fillStyle = "green";
  drawRect(foodX, foodY);
}

function createGrid() {
  context.fillStyle = "gray";
  for (var i = 0; i < width; i++) {
    grid.push([]);
    for (var j = 0; j < height; j++) {
      grid[i].push({x: 0, y: 0}); 
      drawRect(i, j);
    }
  }
}

function drawInitialSnake() {
  context.fillStyle = "red";
  drawRect(headX, headY);
  drawRect(tailX, tailY);
}

function moveFood() {
  spots = [];
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (grid[i][j].x == 0 && grid[i][j].y == 0) {
        spots.push({x: i, y: j});
        console.log("pushed");
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
  }
});

function wrap(n, s) {
  if (n < 0) return n + s;
  if (n >= s) return n - s;
  return n;
}

function update() {
  if (!disabled && counter == gameSpeed) {
    counter = 0;
    if (newMoveX != -moveX && newMoveY != -moveY) {
      moveX = newMoveX;
      moveY = newMoveY;
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
      context.fillStyle = "gray";
      drawRect(prevTailX, prevTailY);
    }
    hesitate = false;
    context.fillStyle = "red";
    drawRect(headX, headY);
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

  /*
  switch () {
      case 'M': // Change lighting style
      if (shifted) {
          drawInit(faceNormals);
      }
      else {
          drawInit(normalsArray);
      }
      break;
      case 'P': // Change spotlight angle
      if (shifted) {
          phi -= 0.01
      }
      else {
          phi += 0.01
      }
      gl.uniform1f(gl.getUniformLocation(program, "phi"), phi);
      break;
      case 'R': // Randomize
      if (shifted) {
          randomizeRotations = true;
      }
      else {
          randomizeColor = true;
      }
      break;
      case 'S': // Change speed
      if (shifted) {
          speedScalar -= 0.1;
      }
      else {
          speedScalar += 0.1;
      }
      if (speedScalar < 0) {
          speedScalar = 0;
      }
      break;
      case 'A': // Toggle shadows
      drawShadows = !drawShadows;
      break;
  }
});
  */

