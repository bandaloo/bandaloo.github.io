"use strict";

const size = 512;
const dirs = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("gl"));
const context = canvas.getContext("2d");

const grid0 = [];
const grid1 = [];
const grids = [grid0, grid1];

let steps = 0;

for (let i = 0; i < size; i++) {
  grid0.push([...new Array(size)].map(() => 0));
  grid1.push([...new Array(size)].map(() => 0));
}

console.log(grid0);
console.log(grid1);

const mod = (m, n) => (m + n) % n;

const draw = (grid) => {
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      context.fillStyle = grid[i][j] ? "black" : "white";
      context.fillRect(i, j, 1, 1);
    }
  }
};

const countNeighbors = (i, j, grid) => {
  let count = 0;
  for (let k = 0; k < 8; k++) {
    count += grid[mod(i + dirs[k][0], size)][mod(j + dirs[k][1], size)];
  }
  return count;
};

const getBinary = (n) => n.toString(2).padStart(9, "0");

const update = () => {
  const prev = grids[steps % 2];
  const curr = grids[(steps + 1) % 2];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const rules = getBinary(prev[i][j] ? i : j);
      const neighbors = countNeighbors(i, j, prev);
      curr[i][j] = parseInt(rules[neighbors]);
    }
  }

  steps++;
  draw(curr);

  requestAnimationFrame(update);
};

requestAnimationFrame(update);
