var canvas = document.getElementById("swapcanvas");
var scoreLabel = document.getElementById("scorelabel");
var counterLabel = document.getElementById("counterlabel");
var moveLabel = document.getElementById("movelabel");
var context = canvas.getContext("2d");

var width = 10;
var height = 10;

var cellWidth = canvas.width / 10;
var cellHeight = canvas.height / 10;
var borderWidth = 1;
var borderHeight = 1;

var outlines = "gray";
var colors = [outlines, "#FF402C", "#1FBCFF", "#821CE8", "#FFF437", "#90FF2C", "#E8AE28"];

var currentColorAmount = 3;
var addBlocksCounterMax = 5;
var addBlocksCounter = addBlocksCounterMax;
var turnCounter = 0;

var amountErased = 0;
var gameOver = false;
var score = 0;

var grid = [];


var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];


function drawRect(i, j) {
  context.fillRect(i * cellWidth + borderWidth, j * cellWidth + borderHeight,
                   cellWidth - borderWidth * 2, cellHeight - borderHeight * 2);
}

function createBlock(i, j) {
  var num;
  if (j > 4) {
    num = Math.floor(Math.random() * currentColorAmount) + 1;
  } else {
    num = 0;
  }
  grid[i][j] = num;
  context.fillStyle = colors[num];
  drawRect(i, j);
}


function createGrid() {
  context.fillStyle = outlines;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < width; i++) {
    grid.push([]);
    for (var j = 0; j < height; j++) {
      grid[i].push(0); 
      createBlock(i, j);
    }
  }
}

function onBoard(xn, yn) {
  return xn >= 0 && xn < width && yn >= 0 && yn < height;
}

function floodBlocks(x, y) {
  amountErased++;
  context.fillStyle = outlines;
  drawRect(x, y);
  var num = grid[x][y];
  grid[x][y] = 0;
  for (var i = 0; i < 4; i++) {
    var xn = dirs[i][0] + x;
    var yn = dirs[i][1] + y;
    if (onBoard(xn, yn) && grid[xn][yn] == num) {
      floodBlocks(xn, yn);
    }
  }
}

function collapseBlocks() {
  var blocksMoved = true;
  while (blocksMoved) {
    blocksMoved = false;
    for (var i = width - 1; i >= 0; i--) {
      for (var j = height - 1; j >= 0; j--) {
        if (onBoard(i, j + 1) && grid[i][j] != 0 && grid[i][j + 1] == 0) {
          grid[i][j + 1] = grid[i][j];
          grid[i][j] = 0;
          context.fillStyle = colors[grid[i][j]];
          drawRect(i, j);
          context.fillStyle = colors[grid[i][j + 1]];
          drawRect(i, j + 1);
          blocksMoved = true;
        }
      }
    }
  }
}

function addBlocks() {
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (j != 0) {
        grid[i][j - 1] = grid[i][j];
        context.fillStyle = colors[grid[i][j - 1]];
        drawRect(i, j - 1);
      } else if (grid[i][j] != 0) {
        gameOver = true;
      }
    }
  }
  for (var i = 0; i < width; i++) {
    createBlock(i, height - 1);
  }
}

function addToScore() {
  var moveScore = 0;
  for (var i = 0; i < amountErased; i++) {
    moveScore += (i + 1) * 10;
  }
  score += moveScore;
  var rating = "ok!"
  if (amountErased > 15) {
    rating = "amazing!";
  } else if (amountErased > 10) {
    rating = "great!";
  } else if (amountErased > 5) {
    rating = "good!";
  }
  moveLabel.innerHTML = rating + " cleared " + amountErased + " for " + moveScore + " points";
}

canvas.addEventListener('click', function(e) {
  var rect = canvas.getBoundingClientRect();
  var clickX = e.clientX - rect.left;
  var clickY = e.clientY - rect.top;
  var boardX = Math.floor(clickX / cellWidth);
  var boardY = Math.floor(clickY / cellHeight);
  if (!gameOver && grid[boardX][boardY] != 0) {
    amountErased = 0;
    floodBlocks(boardX, boardY);
    collapseBlocks();
    addBlocksCounter--;
    turnCounter++;
    console.log(turnCounter);
    if (addBlocksCounter == 0) {
      addBlocks();
      addBlocksCounter = addBlocksCounterMax;
    }
    if (turnCounter == 20) {
      addBlocksCounterMax = 4;
    } else if (turnCounter == 40) {
      currentColorAmount = 4;
    } else if (turnCounter == 60) {
      addBlocksCounterMax = 3;
    } else if (turnCounter == 80) {
      currentColorAmount = 5;
    } else if (turnCounter == 100) {
      addBlocksCounterMax = 2;
      currentColorAmount = 6;
    }
    addToScore();
    counterLabel.innerHTML = "new row in " + addBlocksCounter + " moves";
    scoreLabel.innerHTML = score;
    if (gameOver) {
      counterLabel.innerHTML = "game over!";
      moveLabel.innerHTML = "you lasted " + turnCounter + " turns";
    }
  }
});

createGrid();
scoreLabel.innerHTML = score;
