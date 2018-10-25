var canvas = document.getElementById("minecanvas");
var minesLabel = document.getElementById("mineslabel");
var context = canvas.getContext("2d");

var width = 10;
var height = 10;

var amount = 10;

var cellWidth = 32;
var cellHeight = 32;
var borderWidth = 1;
var borderHeight = 1;

var numDiscovered;

var clickX;
var clickY;
var boardX;
var boardY;

var disabled = false;

var dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
var colors = ["blue", "green", "red", "darkblue", "darkred", "cyan", "black"];

grid = [];

function createGrid(width, height) {
  context.fillStyle = "gray";
  for (var i = 0; i < width; i++) {
    grid.push([]);
    for (var j = 0; j < height; j++) {
      grid[i].push({flag: false, mine: false, visited: false}); 
      drawRect(i, j);
    }
  }
}

function drawRect(i, j) {
  context.fillRect(i * cellWidth + borderWidth, j * cellWidth + borderHeight,
                   cellWidth - borderWidth * 2, cellHeight - borderHeight * 2);
}

function generateMines(amount) {
  for (var i = 0; i < amount; i++) {
    var randX = Math.floor(Math.random() * width);
    var randY = Math.floor(Math.random() * height);
    if (!grid[randX][randY].mine) {
      grid[randX][randY].mine = true;
    } else {
      i--;
    }
  }
}

function onBoard(xn, yn) {
  return xn >= 0 && xn < width && yn >= 0 && yn < height;
}

function countNeighbors(x, y) {
  var count = 0;
  for (var i = 0; i < 8; i++) {
    var xn = dirs[i][0] + x;
    var yn = dirs[i][1] + y;
    if (onBoard(xn, yn)) {
      if (grid[xn][yn].mine) {
        count++;
      }
    }
  }
  return count;
}

function paintMines() {
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (grid[i][j].mine) {
        context.fillStyle= "black";
        drawRect(i, j);
      }
    }
  }
}

function floodMines(x, y) {
  context.fillStyle = "lightgray";
  drawRect(x, y);

  grid[x][y].visited = true;
  grid[x][y].flag = false;
  var neighbors = countNeighbors(x, y);

  if (neighbors != 0) {
    context.textAlign = "center";
    context.font = "30px Helvetica";
    context.fillStyle = colors[neighbors - 1];
    context.textBaseline = "middle";
    context.fillText(String(neighbors),
                     x * cellWidth + cellWidth / 2, y * cellHeight + cellHeight / 2);
    return;
  }

  for (var i = 0; i < 8; i += 2) {
    var xn = dirs[i][0] + x;
    var yn = dirs[i][1] + y;
    if (onBoard(xn, yn) && !grid[xn][yn].visited) {
      floodMines(xn, yn);
    }
  }
  return;
}

function checkWin() {
  numDiscovered = 0;
  var numFlags = 0;
  var numVisited = 0;
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (grid[i][j].visited) {
        numVisited++;
      }
      if (grid[i][j].flag) {
        numFlags++;
        if (grid[i][j].mine) {
          numDiscovered++;
        }
      }
    }
  }
  if (!disabled) {
    minesLabel.innerHTML = numFlags + "/" + amount;
  }
  if (numDiscovered == amount && numVisited == width * height - amount) {
    disabled = true;
    minesLabel.innerHTML = "you won!"
  }
}


function click(e) {
  var rect = canvas.getBoundingClientRect();
  clickX = e.clientX - rect.left;
  clickY = e.clientY - rect.top;
  boardX = Math.floor(clickX / cellWidth);
  boardY = Math.floor(clickY / cellHeight);
  if (boardX > width - 1) boardX = width - 1;
  if (boardY > height - 1) boardY = height - 1;
  console.log(e.button);
}
  

canvas.oncontextmenu = function() {return false;};

canvas.addEventListener('click', function(e) {
  if (!disabled) {
    click(e);
    if (grid[boardX][boardY].mine) {
      paintMines();
      disabled = true;
      minesLabel.innerHTML = "you lost..."
    }
    else {
      countNeighbors(boardX, boardY);
      floodMines(boardX, boardY);
    }
    checkWin();
  }
});

canvas.addEventListener('contextmenu', function(e) {
  if (!disabled) {
    click(e);
    e.preventDefault();
    if (!grid[boardX][boardY].visited) {
      if (!grid[boardX][boardY].flag) {
        context.fillStyle = "red";
      } else {
        context.fillStyle = "gray";
      }
      grid[boardX][boardY].flag = !grid[boardX][boardY].flag;
      drawRect(boardX, boardY);
    }
    checkWin();
    console.log("discovered " + numDiscovered);
  }
});
  

createGrid(width, height);
generateMines(amount);
checkWin();



