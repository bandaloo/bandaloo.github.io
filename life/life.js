"use strict"
var canvas = document.getElementById("lifecanvas");
var context = canvas.getContext("2d");

var board = [];

const DEAD = 0;
const ALIVE = 1;
const WRAP = 2;

var edge = WRAP;

const DIE = 0;
const STAY = 1;
const BIRTH = 2;

const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// cave rules
//var rules = [DIE, DIE, DIE, STAY, STAY, BIRTH, BIRTH, BIRTH, BIRTH];
var rules = [DIE, DIE, STAY, BIRTH, DIE, DIE, DIE, DIE, DIE]

var prevTime = 0;

var delay = 400;
var animTime = 0;

var prevBoard = [];

const boardWidth = 32;
const boardHeight = 32;

const cellWidth = canvas.width / boardWidth;
const cellHeight = canvas.width / boardHeight;

var gamePaused = false;

var cellColor = rgba(255, 112, 1);
var backgroundColor = rgba(0);

Array.prototype.createNumberGrid = function(width, height, number) {
  for (let i = 0; i < width; i++) {
    this.push([]);
    for (let j = 0; j < height; j++) {
      this[i].push(number);
    }
  }
}

Number.prototype.mod = function(n) {
  return ((this + n) % n);
}

prevBoard.createNumberGrid(boardWidth, boardHeight, 0);

function posInbounds(i, j) {
  return i >= 0 && i < boardWidth && j >= 0 && j < boardHeight;
}

function countNeighbors(iCurrent, jCurrent) {
  let count = 0;
  for (let k = 0; k < 8; k++) {
    let iNeighbor = iCurrent + dirs[k][0];
    let jNeighbor = jCurrent + dirs[k][1];
    if (edge == WRAP) {
      iNeighbor.mod(boardWidth);
      jNeighbor.mod(boardHeight);
    }
    if (posInbounds(iNeighbor, jNeighbor)) {
      if (board[iNeighbor][jNeighbor])
        count++;
    } else {
      if (edge == ALIVE)
        count++
    }
  }
  return count;
}

function stepBoard() {
  let tempBoard = [];
  tempBoard.createNumberGrid(boardWidth, boardHeight, 0);
  prevBoard = board;
  console.log(prevBoard.length);
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      switch(rules[countNeighbors(i, j)]) {
        case STAY:
          tempBoard[i][j] = board[i][j]
          break;
        case BIRTH:
          tempBoard[i][j] = 1;
          break;
      }
    }
  }
  board = tempBoard;
}

function update(currTime) {
  let deltaTime = currTime - prevTime;
  prevTime = currTime;

  //console.log(animTime);
  drawBoard();
  animTime += deltaTime;
  if (!gamePaused) {
    if (animTime >= delay) {
      stepBoard();
      animTime = 0;
    }
  }
  requestAnimationFrame(update);
}

function clearScreen() {
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

document.addEventListener('keydown', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);
  if (key == 'P' || code == 32) {
    gamePaused = !gamePaused;
  }
});

canvas.addEventListener('click', function(e) {
  let rect = canvas.getBoundingClientRect();
  let clickX = e.clientX - rect.left;
  let clickY = e.clientY - rect.top;
  let boardX = Math.floor(clickX / cellWidth);
  let boardY = Math.floor(clickY / cellHeight);
  if (boardX > canvas.width - 1) boardX = canvas.width - 1;
  if (boardY > canvas.height - 1) boardY = canvas.height - 1;
  if (gamePaused) {
    board[boardX][boardY] = 1;
  }
});


board.createNumberGrid(boardWidth, boardHeight, 0);

board[20][21] = 1;
board[20][22] = 1;
board[20][23] = 1;

update(0);

