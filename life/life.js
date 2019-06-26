"use strict"
var canvas = document.getElementById("lifecanvas");
var context = canvas.getContext("2d");

var board = [];
var ageBoard = [];
var trailBoard = [];

var shift = false;
var dragging = false;
var moving = false;

const WRAP = 0;
const DEAD = 1;
const ALIVE = 2;

var edge = WRAP;

const DIE = 0;
const STAY = 1;
const BOTH = 2;
const BIRTH = 3;

const ruleStrings = ['Die', 'Stay', 'Both', 'Birth'];

const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const speeds = [1000, 400, 150, 40];

// cave rules
//var rules = [DIE, DIE, DIE, STAY, STAY, BOTH, BOTH, BOTH, BOTH];
var rules = [DIE, DIE, STAY, BOTH, DIE, DIE, DIE, DIE, DIE]

var prevTime = 0;

var isClicked = true;

var delay = 400;
var animTime = 0;

var prevBoard = [];

var selectBox = {};
var moveBox = {};

var movePos = {};

const boardWidth = 52;
const boardHeight = 32;

const cellWidth = canvas.width / boardWidth;
const cellHeight = canvas.height / boardHeight;

const ruleColors = ["#FC1817", "#3B6CFF", "#36EB41", "#FFDD3D"];

var gamePaused = false;

var clicked = false;

const buttonColor = rgba(255, 112, 1);
const backgroundColor = "#000000";

var ruleButtons = [];
// TODO could these be const?
const speedWheel = new ButtonWheel(1, "slowbutton", "mediumbutton", "fastbutton", "veryfastbutton");
const edgeWheel = new ButtonWheel(0, "wrapbutton", "deadbutton", "alivebutton");

var pauseButton = document.getElementById("pausebutton");
var randomizeButton = document.getElementById("randomizebutton");
var shareTextArea = document.getElementById("sharetextarea");

var corner = {};
var shiftCorner = {};

var paintVal;

function ButtonWheel(onIndex, ...rest) {
  this.buttons = [];
  this.onIndex = onIndex;

  for (let i = 0; i < rest.length; i++) {
    let button = document.getElementById(rest[i]);
    button.classList.add('lifeselected');
    if (i != onIndex) { // leave currently set button selected
      button.classList.toggle('lifeselected');
    }
    this.buttons.push(button);
  }
}

ButtonWheel.prototype.adjust = function(index) {
  this.buttons[this.onIndex].classList.toggle('lifeselected');
  this.buttons[index].classList.toggle('lifeselected');
  this.onIndex = index;
};

function ButtonToggle(isOn, name) {
  this.isOn = isOn;
  this.button = document.getElementById(name);
  this.button.classList.add('lifeselected');
  if (!isOn) {
    this.button.classList.toggle('lifeselected');
  }
  this.button.onclick = () => { this.adjust(); }
  this.setName();
}

ButtonToggle.prototype.setName = function() {
  let inner = this.button.innerHTML.split(':')[0];
  let str = this.isOn ? 'ON' : 'OFF';
  this.button.innerHTML = inner + ": " + str;
}

ButtonToggle.prototype.adjust = function() {
  this.isOn = !this.isOn;
  this.button.classList.toggle('lifeselected');
  this.setName();
}

var borderToggle = new ButtonToggle(true, "borderbutton");
var trailToggle = new ButtonToggle(true, "trailbutton");
var gridToggle = new ButtonToggle(false, "gridbutton");

Array.prototype.createNumberGrid = function(width, height, number) {
  for (let i = 0; i < width; i++) {
    this.push([]);
    for (let j = 0; j < height; j++) {
      this[i].push(number);
    }
  }
};

Number.prototype.mod = function(n) {
  return ((this + n) % n);
};

prevBoard.createNumberGrid(boardWidth, boardHeight, 0);

function getRuleButtons() {
  for (let i = 0; i < 9; i++) {
    ruleButtons.push(document.getElementById("button" + i));
  }
}

function changeSpeed(i) {
  animTime = speeds[i] * animTime / delay
  delay = speeds[i];
  speedWheel.adjust(i);
}

function changeEdges(edgeRule) {
  edge = edgeRule;
  setTextArea();
  edgeWheel.adjust(edgeRule);
}

function setRuleButton(i) {
  ruleButtons[i].innerHTML = "<strong>" + i + ":</strong> " + ruleStrings[rules[i]];
  ruleButtons[i].style.background = ruleColors[rules[i]];
}

function setRuleButtons() {
  for (let i = 0; i < ruleButtons.length; i++) {
    setRuleButton(i);
  }
}

function posInbounds(i, j) {
  return i >= 0 && i < boardWidth && j >= 0 && j < boardHeight;
}

function changeRules(i) {
  rules[i]++;
  rules[i] %= 4;
  setRuleButton(i);
  setTextArea();
}

function countNeighbors(iCurrent, jCurrent) {
  let count = 0;
  for (let k = 0; k < 8; k++) {
    let iNeighbor = iCurrent + dirs[k][0];
    let jNeighbor = jCurrent + dirs[k][1];
    if (edge == WRAP) {
      iNeighbor = iNeighbor.mod(boardWidth);
      jNeighbor = jNeighbor.mod(boardHeight);
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

function setTextArea() {
  setCorners();
  let boardChars = encodeBoard();
  let rulesStr = ""; // binary string of bits representing rules
  for (let i = 0; i < rules.length; i++) {
    rulesStr += rules[i].toString(2).padStart(2, '0');
  }
  let posChars = "";
  if (!(corner.x1 == 0 && corner.y1 == 0 && corner.x2 == boardWidth - 1 && corner.y2 == boardHeight - 1)) {
    posChars = encodeNum(corner.x1) + encodeNum(corner.y1) + encodeNum(corner.x2) + encodeNum(corner.y2) + ".";
  }
  let boardText = "?b=" + posChars + boardChars;
  let ruleText = "&r=" + binToB64(rulesStr);
  if (edge)
    ruleText += edge.toString();
  shareTextArea.innerHTML = window.location.href.split('?')[0] + boardText + ruleText;
}

function stepBoard() {
  let tempBoard = [];
  tempBoard.createNumberGrid(boardWidth, boardHeight, 0);
  prevBoard = board;
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      switch(rules[countNeighbors(i, j)]) {
      case STAY:
        tempBoard[i][j] = board[i][j]
        if (board[i][j])
          ageBoard[i][j]++;
        break;
      case BOTH:
        tempBoard[i][j] = 1;
        ageBoard[i][j]++;
        break;
      case BIRTH:
        if (board[i][j] == 0)
          tempBoard[i][j] = 1;
        break;
      case DIE:
        ageBoard[i][j] = 0;
      }
      if (prevBoard[i][j] && !tempBoard[i][j]) {
        trailBoard[i][j] = 15;
      }
      if (trailBoard[i][j] > 0) {
        trailBoard[i][j]--;
      }
    }
  }
  board = tempBoard;
  setTextArea();
}

function setCorners() {
  corner = {};

  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      if (board[i][j]) {
        if (corner.x1 === undefined || corner.x1 > i)
          corner.x1 = i;
        if (corner.y1 === undefined || corner.y1 > j)
          corner.y1 = j;
        if (corner.x2 === undefined || corner.x2 < i)
          corner.x2 = i;
        if (corner.y2 === undefined || corner.y2 < j)
          corner.y2 = j;
      }
    }
  }

  if (corner.x1 === undefined) // board was empty
    corner = {x1: 0, y1: 0, x2: 0, y2: 0};
}

function update(currTime) {
  let deltaTime = currTime - prevTime;
  prevTime = currTime;
  drawBoard();
  animTime += deltaTime;
  if (!gamePaused) {
    if (animTime >= delay) {
      stepBoard();
      animTime -= delay;
      if (animTime > delay)
        animTime = 0;
    }
  }
  requestAnimationFrame(update);
}

function clearScreen() {
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function clearBoard() {
  board = [];
  board.createNumberGrid(boardWidth, boardHeight, 0);
  ageBoard.createNumberGrid(boardWidth, boardHeight, 0);
  setTextArea();
}

function pause() {
  gamePaused = !gamePaused;
  pauseButton.innerHTML = gamePaused ? "Play" : "Pause";
}

function randomize() {
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      board[i][j] = Math.floor(2 * Math.random());
      ageBoard[i][j] = 0;
    }
  }
  setTextArea();
}

document.addEventListener('keydown', function(e) {
  let code = e.keyCode;
  let key = String.fromCharCode(code);

  if ([37, 38, 39, 40, 32].includes(code)) {
    e.preventDefault();
  }

  if (key == 'P') {
    pause();
  } else if (key == 'R') {
    randomize();
  } else if (key == 'B') {
    borderToggle.adjust();
  } else if (key == 'T') {
    trailToggle.adjust();
  } else if (key == 'G') {
    gridToggle.adjust();
  } else if (key == 'C') {
    clearBoard();
  } else if (key == 'S') {
    changeSpeed(0);
  } else if (key == 'M') {
    changeSpeed(1);
  } else if (key == 'F') {
    changeSpeed(2);
  } else if (key == 'V') {
    changeSpeed(3);
  } else if (key == 'W') {
    changeEdges(WRAP);
  } else if (key == 'D') {
    changeEdges(DEAD);
  } else if (key == 'A') {
    changeEdges(ALIVE);
  } else if (code == 16) {
    shift = true;
  } else if (code == 27) {
    moving = 0;
    dragging = 0;
    shiftCorner = {};
  } else if (code == 8) { // backspace
    fillSelection(0);
  } else if (code == 32) { // space
    fillSelection(1);
  } else if (code >= 48 && code <= 56) { // number keys
    changeRules(code - 48);
  }
});

document.addEventListener('keyup', function(e) {
  let code = e.keyCode;
  if (code == 16)
    shift = false;
});

// TODO group clicks and board positions into objects
function clickToBoard(e) {
  let rect = canvas.getBoundingClientRect();
  let clickX = e.clientX - rect.left;
  let clickY = e.clientY - rect.top;
  let boardX = Math.floor(clickX / cellWidth);
  let boardY = Math.floor(clickY / cellHeight);
  if (boardX > canvas.width - 1) boardX = canvas.width - 1;
  if (boardY > canvas.height - 1) boardY = canvas.height - 1;
  return {x: boardX, y: boardY};
}

function fillSelection(num) {
  for (let i = selectBox.x1; i < selectBox.x2 + 1; i++) {
    for (let j = selectBox.y1; j < selectBox.y2 + 1; j++) {
      ageBoard[i][j] = 0;
      board[i][j] = num;
    }
  }
  setTextArea();
}

function placeCell({x: boardX, y: boardY}) {
  board[boardX][boardY] = paintVal;
  ageBoard[boardX][boardY] = 0;
  setTextArea();
}

function inSelection(pos) {
  // TODO see if I can move these parens
  return (pos.x >= selectBox.x1 && pos.x <= selectBox.x2 &&
          pos.y >= selectBox.y1 && pos.y <= selectBox.y2);
}

canvas.addEventListener('mousedown', function(e) {
  clicked = true;
  const pos = clickToBoard(e);
  if (shift) {
    shiftCorner = {x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y};
    dragging = true;
  } else {
    if (shiftCorner.x1 !== undefined && inSelection(pos)) {
      console.log("in selection");
      moving = true;
      // capture current state of selection
      // start drawing additional selection box
      movePos = Object.assign({}, pos); // TODO could I just directly assign?
      moveBox = Object.assign({}, selectBox);
    } else { 
      paintVal = !board[pos.x][pos.y] | 0;
      placeCell(clickToBoard(e));
    }
  }
});

canvas.addEventListener('mousemove', function(e) {
  const pos = clickToBoard(e);
  if (clicked) {
    if (dragging) {
      assignLastCorner(pos);
    } else if (moving) {
      // TODO can I just assign movePos to pos if I change from const?
      console.log('test');
      moveBox = {
        x1: selectBox.x1 + pos.x - movePos.x,
        y1: selectBox.y1 + pos.y - movePos.y,
        x2: selectBox.x2 + pos.x - movePos.x,
        y2: selectBox.y2 + pos.y - movePos.y
      };
    } else if (!shift) {
      placeCell(pos);
    }
  }
});

canvas.addEventListener('mouseup', function(e) {
  clicked = false;
  if (dragging) { // shift click has already been started
    let pos = clickToBoard(e);
    assignLastCorner(pos);
    dragging = false;
  } if (moving) {
    // copy selection into temporary space (important for overlapping boxes)
    const sBoxWidth = selectBox.x2 - selectBox.x1 + 1;
    const sBoxHeight = selectBox.y2 - selectBox.y1 + 1;
    let tempBoard = [];
    tempBoard.createNumberGrid(sBoxWidth, sBoxHeight, 0);
    for (let i = 0; i < sBoxWidth; i++) {
      for (let j = 0; j < sBoxHeight; j++) {
        tempBoard[i][j] = board[i + selectBox.x1][j + selectBox.y1];
      }
    }
    // plonk down selection
    for (let i = 0; i < sBoxWidth; i++) {
      for (let j = 0; j < sBoxHeight; j++) {
        const x = i + moveBox.x1;
        const y = j + moveBox.y1;
        if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight && tempBoard[i][j]) {
          board[x][y] = tempBoard[i][j];
          ageBoard[x][y] = 0;
        }
      }
    }
    setTextArea();
    moving = false;
  }
});

function assignLastCorner(pos) { // for shiftCorner
  shiftCorner.x2 = pos.x;
  shiftCorner.y2 = pos.y;

  if (shiftCorner.x2 < shiftCorner.x1)
    selectBox = {x1: shiftCorner.x2, x2: shiftCorner.x1};
  else
    selectBox = {x1: shiftCorner.x1, x2: shiftCorner.x2};

  if (shiftCorner.y2 < shiftCorner.y1)
    selectBox = Object.assign(selectBox, {y1: shiftCorner.y2, y2: shiftCorner.y1});
  else
    selectBox = Object.assign(selectBox, {y1: shiftCorner.y1, y2: shiftCorner.y2});
}

board.createNumberGrid(boardWidth, boardHeight, 0);
ageBoard.createNumberGrid(boardWidth, boardHeight, 0);
trailBoard.createNumberGrid(boardWidth, boardHeight, 0);


{ // block so initialBoard and initialRules don't leak into global scope
  let initialBoard = getVariable('b');
  if (initialBoard) {
    let boardArgs = initialBoard.split('.');
    initialBoard = boardArgs[boardArgs.length - 1];
    if (boardArgs.length > 1) {
      let cornerStr = boardArgs[0];
      corner = {
        x1: decodeChar(cornerStr.charAt(0)), y1: decodeChar(cornerStr.charAt(1)),
        x2: decodeChar(cornerStr.charAt(2)), y2: decodeChar(cornerStr.charAt(3))
      }
    } else
      corner = { x1: 0, y1: 0, x2: boardWidth - 1, y2: boardHeight - 1 };
    decodeBoard(initialBoard);
    pause();
  } else {
    randomize();
  }

  let initialRules = getVariable('r');
  if (initialRules) {
    let boardRules = initialRules.substring(0, 3);
    if (initialRules.length > 3) {
      let edgeRule = initialRules.charAt(3);
      changeEdges(parseInt(edgeRule));
    }
    let boardRulesBin = b64ToBin(boardRules);
    for (let i = 0; i < 9; ++i) {
      rules[i] = parseInt(boardRulesBin.substring(i * 2, i * 2 + 2), 2);
    }
  }
}

getRuleButtons();
setRuleButtons();

setTextArea();

update(0);
