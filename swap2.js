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
var colors = [outlines, "#FF402C", "#1FBCFF", "#821CE8", "#FFF437", "#90FF2C", "#FF8800"];

var currentColorAmount = 3;
var addBlocksCounterMax = 5;
var addBlocksCounter = addBlocksCounterMax;
var turnCounter = 0;

var fallAcc = 0.005;
var fallSpeed = 0;

var amountErased = 0;
var gameOver = false;
var gameStarted = false;
var animating = false;
var score = 0;

var pgrid = [];
var agrid = [];
var tgrid = [];
var sgrid = [];
var blockRow = [];
var bottom = 0;

var prevTime = 0;
//var currTime;
var deltaTime;
var deltaScalar = 1/16;
var sDeltaTime;

var lastErasedColorNum;

var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];


function drawRect(i, j, offset, size) {
  context.fillRect(i * cellWidth + borderWidth + 0.5 * (cellWidth - cellWidth * size),
                   (j - bottom) * cellWidth + borderHeight + offset + 0.5 * (cellHeight - cellHeight * size),
                   cellWidth * size - borderWidth * 2, cellHeight * size - borderHeight * 2);
}

function generateNum() {
  return Math.floor(Math.random() * currentColorAmount) + 1;
}

function createBlock(i, j) {
  var num;
  if (j > 4) {
    num = generateNum();
  } else {
    num = 0;
  }
  pgrid[i][j] = num;
}

function fillRow() {
  blockRow = [];
  for (var i = 0; i < width; i++) {
    blockRow.push(generateNum());
  }
}

function drawBoard() {
  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  var doneAnimating = true;
  var targetBottom = addBlocksCounter == 0 ? 1 : 0;
  if (targetBottom == 1 && blockRow.length == 0) fillRow();
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (sgrid[i][j] > 0) {
        doneAnimating = false;
        context.fillStyle = colors[lastErasedColorNum];
        drawRect(i, j, 0, sgrid[i][j]);
        // TODO maybe a way to get rid of this duplicate code
        sgrid[i][j] -= 0.15 * sDeltaTime;
        if (sgrid[i][j] < 0) sgrid[i][j] = 0;
      } else {
        num = pgrid[i][j];
        if (num != 0) {
          context.fillStyle = colors[num];
          drawRect(i, j, cellHeight * (agrid[i][j] - tgrid[i][j]), 1);
        }
        if (tgrid[i][j] > 0) {
          doneAnimating = false;
          fallSpeed += fallAcc;
          tgrid[i][j] -= fallSpeed * sDeltaTime;
          if (tgrid[i][j] < 0) tgrid[i][j] = 0;
        }
      }
    }
  }
  if (targetBottom == 1) {
    for (var i = 0; i < width; i++) {
      context.fillStyle = colors[blockRow[i]];
      drawRect(i, height, 0, 1);
    }
  }
  // TODO maybe find better way to do this
  if (targetBottom == 1) {
    bottom += 0.1 * sDeltaTime;
  }
  if (bottom >= targetBottom) {
    bottom = targetBottom;
  } else {
    doneAnimating = false;
  }
  return doneAnimating;
}

function levelUp() {
  addBlocksCounter--;
  turnCounter++;
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
}


function stepRules() {
  fallSpeed = 0;
  collapseBlocks();
  if (addBlocksCounter == 0) {
    addBlocks();
    addBlocksCounter = addBlocksCounterMax;
    drawBoard();
  }
  addToScore();
  counterLabel.innerHTML = "new row in " + addBlocksCounter + " moves";
  scoreLabel.innerHTML = score;
  gameOverLabel();
  animating = false;
}

function animBoard() {
  var doneAnimating = drawBoard();
  if (doneAnimating && gameStarted) {
    stepRules();
  }
}

function ttoa() {
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      tgrid[i][j] = agrid[i][j];
    }
  }
}

function createGrid() {
  context.fillStyle = outlines;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < width; i++) {
    pgrid.push([]);
    agrid.push([]);
    tgrid.push([]);
    sgrid.push([]);
    for (var j = 0; j < height; j++) {
      pgrid[i].push(0); 
      agrid[i].push(0);
      tgrid[i].push(0);
      sgrid[i].push(0);
      createBlock(i, j);
    }
  }
  ttoa();
}

function onBoard(xn, yn) {
  return xn >= 0 && xn < width && yn >= 0 && yn < height;
}

function floodBlocks(x, y) {
  amountErased++;
  context.fillStyle = outlines;
  var num = pgrid[x][y];
  pgrid[x][y] = 0;
  sgrid[x][y] = 1;
  for (var j = y - 1; j >= 0; j--) {
    if (pgrid[x][j] != 0) {
      agrid[x][j]++;
    }
  }
  for (var i = 0; i < 4; i++) {
    var xn = dirs[i][0] + x;
    var yn = dirs[i][1] + y;
    if (onBoard(xn, yn) && pgrid[xn][yn] == num) {
      floodBlocks(xn, yn);
    }
  }
}

function addBlocks() {
  bottom = 0;
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (j != 0) {
        pgrid[i][j - 1] = pgrid[i][j];
        context.fillStyle = colors[pgrid[i][j - 1]];
      } else if (pgrid[i][j] != 0) {
        gameOver = true;
      }
    }
  }
  for (var i = 0; i < width; i++) {
    pgrid[i][height - 1] = blockRow[i];
    //createBlock(i, height - 1);
  }
  blockRow = [];
}

function addToScore() {
  var moveScore = 0;
  for (var i = 0; i < amountErased; i++) {
    moveScore += (i + 1) * 10;
  }
  score += moveScore;
  var rating = "ok!"
  if (amountErased > 63) {
    rating = "petitti special!";
  } else if (amountErased > 40) {
    rating = "unbelievable!"
  } else if (amountErased > 25) {
    rating = "astounding!"
  } else if (amountErased > 15) {
    rating = "amazing!";
  } else if (amountErased > 10) {
    rating = "great!";
  } else if (amountErased > 5) {
    rating = "good!";
  }
  if (moveScore != 0) {
    moveLabel.innerHTML = rating + " cleared " + amountErased + " for " + moveScore + " points";
  }
}

function gameOverLabel() {
  if (gameOver) {
    counterLabel.innerHTML = "game over!";
    moveLabel.innerHTML = "you lasted " + turnCounter + " turns";
  }
}

function rushBlocks() {
  if (!animating && !gameOver) {
    animating = true;
    gameStarted = true;
    amountErased = 0;
    addBlocksCounter = 0;
  }
}

function collapseBlocks() {
  for (var i = width - 1; i >= 0; i--) {
    for (var j = height - 1; j >= 0; j--) {
      if (agrid[i][j] != 0) {
        pgrid[i][j + agrid[i][j]] = pgrid[i][j];
        pgrid[i][j] = 0;
        agrid[i][j] = 0;
        sgrid[i][j] = 0;
      }
    }
  }
}

canvas.addEventListener('click', function(e) {
  var rect = canvas.getBoundingClientRect();
  var clickX = e.clientX - rect.left;
  var clickY = e.clientY - rect.top;
  var boardX = Math.floor(clickX / cellWidth);
  var boardY = Math.floor(clickY / cellHeight);
  if (boardX > width - 1) boardX = width - 1;
  if (boardY > height - 1) boardY = height - 1;
  if (!animating && !gameOver && pgrid[boardX][boardY] != 0) {
    levelUp();
    lastErasedColorNum = pgrid[boardX][boardY];
    gameStarted = true;
    animating = true;
    amountErased = 0;
    floodBlocks(boardX, boardY);
    ttoa();
  }
});

function update(currTime) {
  deltaTime = currTime - prevTime;
  sDeltaTime = deltaTime * deltaScalar;

  if (animating) {
    animBoard();
  }
  prevTime = currTime;
  requestAnimationFrame(update);
}

createGrid();
animBoard();
scoreLabel.innerHTML = score;
update(0);




