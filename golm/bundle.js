(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clamp = clamp;
exports.hexColorToVector = hexColorToVector;

/**
 * helper function for clamping a number
 * @param {number} n
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(n, lo));
}
/**
 * converts string given by color input to array of four (normalized)
 * @param {string} str
 */


function hexColorToVector(str) {
  str = str.slice(1) + "ff"; // get rid of first char

  var vals = str.match(/..?/g); // split into groups of two

  var vec = vals.map(function (n) {
    return parseInt(n, 16) / 255;
  });
  return vec;
}

},{}],2:[function(require,module,exports){
"use strict";

var _rulescontrols = require("./rulescontrols.js");

var glslify = require("glslify");
/** @type {WebGLRenderingContext} */


var gl;
/** @type {WebGLFramebuffer} */

var framebuffer; // the programs used to simulate and render

/** @type {WebGLProgram} */

var simulationProgram;
/** @type {WebGLProgram} */

var drawProgram; // the uniforms in the simulation shader

/** @type {WebGLUniformLocation} */

var uTime;
/** @type {WebGLUniformLocation} */

var uSimulationState;
/** @type {WebGLUniformLocation} */

var uRules;
/** @type {WebGLUniformLocation} */

var uSeed;
/** @type {WebGLUniformLocation} */

var uPaused; // the uniforms in the render shader

/** @type {WebGLUniformLocation} */

var uYoungColor;
/** @type {WebGLUniformLocation} */

var uOldColor;
/** @type {WebGLUniformLocation} */

var uTrailColor;
/** @type {WebGLUniformLocation} */

var uDeadColor;
/** @type {WebGLTexture} */

var textureBack;
/** @type {WebGLTexture} */

var textureFront;
/** @type {{width: number, height: number}} */

var dimensions = {
  width: null,
  height: null
}; // state kept for controls

var paused = false;
var justPaused = false;
var delayCount = 0;

window.onload = function () {
  var canvas =
  /** @type {HTMLCanvasElement} */
  document.getElementById("gl");
  canvas.style.imageRendering = "pixelated"; // keeps from blurring

  gl =
  /** @type {WebGLRenderingContext} */
  canvas.getContext("webgl2");
  canvas.width = dimensions.width = 1920;
  canvas.height = dimensions.height = 1080; // game of life gui stuff

  (0, _rulescontrols.addChecks)(_rulescontrols.rules.conway);
  (0, _rulescontrols.addNumberChangeListeners)(canvas); // define drawing area of webgl canvas. bottom corner, width / height

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  makeBuffer();
  makeShaders(); // seed the random number generator before render is called

  gl.uniform1f(uSeed, Math.random()); // start the game unpaused

  gl.uniform1i(uPaused, 0);
  makeTextures(); // TODO move render out of makeTextures
  // stuff for color controls

  (0, _rulescontrols.addColorChangeListeners)(gl, uYoungColor, uOldColor, uTrailColor, uDeadColor);
  window.addEventListener("keypress", function (e) {
    console.log(e.key);

    switch (e.key) {
      case "r":
        time = 0; // TODO make puase and play functions

        paused = false;
        justPaused = true;
        break;

      case "p":
        paused = !paused;
        justPaused = true;

      default:
        break;
    }
  });
};
/**
 * create an alive cell at position
 * @param {number} x
 * @param {number} y
 * @param {number} value
 * @param {WebGLTexture} texture
 */


function poke(x, y, value, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture); // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D

  gl.texSubImage2D(gl.TEXTURE_2D, 0, // x offset, y offset, width, height
  x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, // is supposed to be a typed array
  new Uint8Array([value, 0, 0, 255]));
}

function makeBuffer() {
  // create a buffer object to store vertices
  var buffer = gl.createBuffer(); // point buffer at graphic context's ARRAY_BUFFER

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  var points = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  var triangles = new Float32Array(points); // initialize memory for buffer and populate it. Give open gl hint contents
  // will not change dynamically

  gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
}

function makeShaders() {
  // create vertex shader
  var vertexSource = glslify(["#define GLSLIFY 1\n// simplest possible vertex shader\n\nattribute vec2 a_position;\n\nvoid main() {\n  gl_Position = vec4(a_position, 0, 1);\n}"]);
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader); // create fragment shader

  var fragmentSource = glslify(["// transforms the colors in the simulation into better ones\n\n#ifdef GL_ES\nprecision mediump float;\n#define GLSLIFY 1\n#endif\n\nuniform sampler2D uSampler;\nuniform vec2 resolution;\n\nuniform vec4 youngColor;\nuniform vec4 oldColor;\nuniform vec4 trailColor;\nuniform vec4 deadColor;\n\nvoid main() {\n  vec4 originalColor = vec4(texture2D(uSampler, gl_FragCoord.xy / resolution).rgb, 1.0);\n  vec4 newColor = mix(youngColor, oldColor, originalColor.b) * originalColor.r\n                  + mix(deadColor, trailColor, originalColor.g) * (1.0 - originalColor.r);\n  gl_FragColor = newColor;\n}\n"]);
  drawProgram = createAndCompileFrag(fragmentSource, vertexShader);
  setPositionAndRes(drawProgram);
  var simulationSource = glslify(["#ifdef GL_ES\nprecision mediump float;\n#define GLSLIFY 1\n#endif\n\nuniform float time;\nuniform vec2 resolution;\n\n// simulation texture state, swapped each frame\nuniform sampler2D state;\n\n// defines the rules of the board\nuniform int rules[9];\n\n// to seed the psuedorandom number generator\nuniform float seed;\n\n// whether to step the simulation\nuniform int paused;\n\n// constants for rules\nconst int die = 0;\nconst int stay = 1;\nconst int birth = 2;\nconst int both = 3;\n\n// random function from book of shaders\nfloat random(vec2 st) {\n  return fract(sin(dot(st.xy / 123.45, vec2(12.9898, 78.233))) * 43758.5453123 * (9.0 + seed));\n}\n\n// returns 1.0 or 0.0 based on chance\nfloat randomChance(vec2 st, float chance) {\n  return step(chance, random(st));\n}\n\n// get a pixel value\nvec4 getPixel(int x, int y) {\n  return texture2D(state, (mod(gl_FragCoord.xy + vec2(x, y), resolution)) / resolution);\n}\n\n// look up individual cell values\nint get(int x, int y) {\n  return int(getPixel(x, y).r);\n}\n\n// get stepped color of alive cell\nvec4 getAliveColor(vec4 color) {\n  return vec4(1.0, 0.0, 0.01 + color.b, 1.0);\n}\n\n// get stepped color of dead cell\nvec4 getDeadColor(vec4 color) {\n  return vec4( 0.0, color.r * 1.0 + color.g * 0.95, 0.0, 1.0 );\n}\n\nvoid main() {\n  // randomize on the GPU at the beginning\n  if (time == 0.0) {\n    gl_FragColor = vec4(vec3(randomChance(gl_FragCoord.xy, 0.5)), 1.0);\n    return;\n  }\n\n  // get sum of all surrounding nine neighbors\n  int sum = get(-1, -1) + get(-1, 0) + get(-1, 1) + get(0, -1) + get(0, 1) + get(1, -1) + get(1, 0) + get(1, 1);\n\n  // index rules array based on neighbor #\n  int result;\n\n  // can't index by a non-constant, so we have to loop through\n  for (int i = 0; i < 9; i++) {\n    if (i == sum) {\n      result = rules[i];\n      break;\n    }\n  }\n\n  vec4 color = getPixel(0, 0);\n\n  if (paused == 1) {\n    gl_FragColor = color;\n    return;\n  }\n\n  // TODO don't call get here (used color)\n  float current = float(get(0, 0));\n\n  if (result == stay) {\n    // maintain current state\n    gl_FragColor = vec4(color.r, color.g * 0.95, color.r * (0.01 + color.b), 1.0);\n  } else if (result == both) {\n    // ideal # of neighbors... if cell is living, stay alive, if it is dead, come to life!\n    gl_FragColor = getAliveColor(color);\n  } else if (result == birth) {\n    // semi-ideal # of neighbors... if cell is living, die, but if dead, come to life\n    if (current == 0.0) {\n      gl_FragColor = getAliveColor(color);\n    } else {\n      gl_FragColor = getDeadColor(color);\n    }\n  } else if (result == die) {\n    // over-population or loneliness... cell dies\n    gl_FragColor = getDeadColor(color);\n  }\n}\n"]);
  simulationProgram = createAndCompileFrag(simulationSource, vertexShader);
  setPositionAndRes(simulationProgram); // find a pointer to the uniform "time" in our fragment shader

  uTime = gl.getUniformLocation(simulationProgram, "time");
  uSimulationState = gl.getUniformLocation(simulationProgram, "state");
  uRules = gl.getUniformLocation(simulationProgram, "rules"); // get all the color uniforms for the render shader

  uYoungColor = gl.getUniformLocation(drawProgram, "youngColor");
  uOldColor = gl.getUniformLocation(drawProgram, "oldColor");
  uTrailColor = gl.getUniformLocation(drawProgram, "trailColor");
  uDeadColor = gl.getUniformLocation(drawProgram, "deadColor"); // get random seed uniform location

  uSeed = gl.getUniformLocation(simulationProgram, "seed"); // get the pause uniform location

  uPaused = gl.getUniformLocation(simulationProgram, "paused");
}
/**
 * set uniforms for resolution and set vertices to render to
 * @param {WebGLProgram} program
 */


function setPositionAndRes(program) {
  // set the resolution for the draw program to dimensions of draw buffer
  var uRes = gl.getUniformLocation(program, "resolution");
  gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
  var position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position); // this will point to the vertices in the last bound array buffer. We only use
  // one array buffer, where we're storing our vertices

  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}
/**
 * create, compile, link and use a fragment shader
 * @param {string} source
 * @param {WebGLShader} vertexShader
 */


function createAndCompileFrag(source, vertexShader) {
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, source);
  gl.compileShader(fragmentShader);
  console.log(gl.getShaderInfoLog(fragmentShader));
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);
  return program;
}

function makeTextures() {
  textureBack = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureBack); // these two lines are needed for non-power-of-2 textures
  // TODO see if above comment still is true with webgl 2

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // how to map when texture element is less than one pixel
  // use `gl.NEAREST` to avoid linear interpolation

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // how to map when texture element is more than one pixel

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // specify texture format, see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dimensions.width, dimensions.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  textureFront = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureFront);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dimensions.width, dimensions.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); // Create a framebuffer and attach the texture.

  framebuffer = gl.createFramebuffer(); // textures loaded, now ready to render

  render();
} // keep track of time via incremental frame counter


var time = 0;

function render() {
  // schedules render to be called the next time the video card requests
  // a frame of video
  window.requestAnimationFrame(render);
  delayCount++;
  delayCount %= (0, _rulescontrols.getDelay)();
  if (delayCount) return; // use our simulation shader

  gl.useProgram(simulationProgram);

  if (!(0, _rulescontrols.getRulesUpToDate)()) {
    gl.uniform1iv(uRules, new Int32Array(_rulescontrols.currentRules));
    (0, _rulescontrols.setRulesUpToDate)(true);
  }

  gl.uniform1f(uTime, time); // randomize the seed if simulation has just been reset

  if (time === 0) gl.uniform1f(uSeed, Math.random()); // update the pause uniform if it has just changed

  if (justPaused) {
    justPaused = false;
    gl.uniform1i(uPaused, ~~paused);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); // use the framebuffer to write to our texFront texture

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureFront, 0); // set viewport to be the size of our state (game of life simulation)
  // here, this represents the size that will be drawn onto our texture

  gl.viewport(0, 0, dimensions.width, dimensions.height); // in our shaders, read from texBack, which is where we poked to

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureBack);
  gl.uniform1i(uSimulationState, 0); // run shader

  gl.drawArrays(gl.TRIANGLES, 0, 6); // swap our front and back textures

  var tmp = textureFront;
  textureFront = textureBack;
  textureBack = tmp; // use the default framebuffer object by passing null

  gl.bindFramebuffer(gl.FRAMEBUFFER, null); // set our viewport to be the size of our canvas
  // so that it will fill it entirely

  gl.viewport(0, 0, dimensions.width, dimensions.height); // select the texture we would like to draw to the screen.
  // note that webgl does not allow you to write to / read from the
  // same texture in a single render pass. Because of the swap, we're
  // displaying the state of our simulation ****before**** this render pass (frame)

  gl.bindTexture(gl.TEXTURE_2D, textureFront); // use our drawing (copy) shader

  gl.useProgram(drawProgram); // put simulation on screen

  gl.drawArrays(gl.TRIANGLES, 0, 6); // update time on CPU and GPU

  time++;
}

},{"./rulescontrols.js":4,"glslify":3}],3:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addChecks = addChecks;
exports.getRulesUpToDate = getRulesUpToDate;
exports.setRulesUpToDate = setRulesUpToDate;
exports.addColorChangeListeners = addColorChangeListeners;
exports.addNumberChangeListeners = addNumberChangeListeners;
exports.getScale = getScale;
exports.getDelay = getDelay;
exports.currentRules = exports.rules = void 0;

var _helpers = require("./helpers.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// constants for game of life
var die = 0;
var stay = 1;
var birth = 2;
var both = 3;
var rulesUpToDate = false; // constants for controls

var MIN_SCALE = 1;
var MAX_SCALE = 128;
var MIN_DELAY = 1;
var MAX_DELAY = 240;
var DEFAULT_SCALE = 4;
var DEFAULT_DELAY = 1; // state kept for controls

var scale = DEFAULT_SCALE;
var delay = 1;
/** @type {Object<string, number[]>} */

var rules = {
  conway: [die, die, stay, both, die, die, die, die, die],
  caves: [die, die, die, die, stay, both, both, both, both],
  highlife: [die, die, stay, both, die, die, birth, die, die]
};
/** @type {number[]} */

exports.rules = rules;
var currentRules;
/** @type {CheckPair[]} */

exports.currentRules = currentRules;
var checkList = [];

var CheckPair =
/**
 * adds a pair of checks to the rules table
 * @param {number} num
 */
function CheckPair(num) {
  var _this = this;

  _classCallCheck(this, CheckPair);

  this.num = num;
  var table =
  /** @type {HTMLTableElement} */
  document.getElementById("rulestable");
  var row = table.insertRow(num + 1);
  var numberCell = row.insertCell(0);
  var deadCell = row.insertCell(1);
  var aliveCell = row.insertCell(2);

  var makeCheckbox = function makeCheckbox() {
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("click", function () {
      // hack to convert pairs of booleans to int from 0 to 3
      currentRules[_this.num] = 2 * ~~_this.deadCheckbox.checked + ~~_this.aliveCheckbox.checked;
      rulesUpToDate = false;
      console.log(currentRules);
    });
    console.log(currentRules);
    return checkbox;
  };

  this.deadCheckbox = makeCheckbox();
  this.aliveCheckbox = makeCheckbox();
  numberCell.innerHTML = "" + num;
  deadCell.appendChild(this.deadCheckbox);
  aliveCell.appendChild(this.aliveCheckbox);
};
/**
 * add all nine check rows to the table
 * @param {number[]} startRules
 */


function addChecks(startRules) {
  exports.currentRules = currentRules = startRules;

  for (var i = 0; i < 9; i++) {
    var checkPair = new CheckPair(i); // TODO be able to set rules even outside construction

    checkList.push(checkPair);
    var booleanRules = startRules[i].toString(2).padStart(2, "0").split("").map(function (n) {
      return !!parseInt(n);
    });
    checkPair.deadCheckbox.checked = booleanRules[0];
    checkPair.aliveCheckbox.checked = booleanRules[1];
  }
}

function getRulesUpToDate() {
  return rulesUpToDate;
}

function setRulesUpToDate() {
  var val = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
  rulesUpToDate = val;
}
/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLUniformLocation} uYoungColor
 * @param {WebGLUniformLocation} uOldColor
 * @param {WebGLUniformLocation} uTrailColor
 * @param {WebGLUniformLocation} uDeadColor
 */


function addColorChangeListeners(gl, uYoungColor, uOldColor, uTrailColor, uDeadColor) {
  // TODO move all of this
  var youngInput =
  /** @type {HTMLInputElement} */
  document.getElementById("youngcolor");
  youngInput.addEventListener("change", makeInputFunc(gl, uYoungColor, youngInput, "#ffffff"));
  var oldInput =
  /** @type {HTMLInputElement} */
  document.getElementById("oldcolor");
  oldInput.addEventListener("change", makeInputFunc(gl, uOldColor, oldInput, "#ffffff"));
  var trailInput =
  /** @type {HTMLInputElement} */
  document.getElementById("trailcolor");
  trailInput.addEventListener("change", makeInputFunc(gl, uTrailColor, trailInput, "#777777"));
  var deadInput =
  /** @type {HTMLInputElement} */
  document.getElementById("deadcolor");
  deadInput.addEventListener("change", makeInputFunc(gl, uDeadColor, deadInput, "#000000"));
}
/**
 * makes the on change function for a color input
 * @param {WebGLUniformLocation} loc
 * @param {HTMLInputElement} input
 * @param {WebGLRenderingContext} gl
 * @param {string} color
 */


function makeInputFunc(gl, loc, input, color) {
  input.value = color; // set initial color

  var func = function func() {
    gl.uniform4fv(loc, (0, _helpers.hexColorToVector)(input.value));
  };

  func(); // fire the function to set the colors

  return func;
}
/**
 * add event listeners on the number fields
 * @param {HTMLCanvasElement} canvas
 */


function addNumberChangeListeners(canvas) {
  var scaleInput =
  /** @type {HTMLInputElement} */
  document.getElementById("scale");
  scaleInput.addEventListener("change", function () {
    scale = (0, _helpers.clamp)(parseInt(scaleInput.value), MIN_SCALE, MAX_SCALE);
    scaleInput.value = "" + scale;
    resizeCanvas(canvas);
  });
  scaleInput.min = "" + MIN_SCALE;
  scaleInput.max = "" + MAX_SCALE;
  scaleInput.value = "" + DEFAULT_SCALE;
  var delayInput =
  /** @type {HTMLInputElement} */
  document.getElementById("delay");
  delayInput.min = "" + MIN_DELAY;
  delayInput.max = "" + MAX_DELAY;
  delayInput.value = "" + DEFAULT_DELAY;
  delayInput.addEventListener("change", function () {
    delay = (0, _helpers.clamp)(parseInt(delayInput.value), MIN_DELAY, MAX_DELAY);
    delayInput.value = "" + delay;
  });
  resizeCanvas(canvas);
}
/**
 * change the canvas size
 * @param {HTMLCanvasElement} canvas
 */


function resizeCanvas(canvas) {
  canvas.style.width = canvas.width * getScale() + "px";
  canvas.style.height = canvas.height * getScale() + "px";
}

function getScale() {
  return scale;
}

function getDelay() {
  return delay;
}

},{"./helpers.js":1}]},{},[2]);