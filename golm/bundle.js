(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clamp = clamp;
exports.hexColorToVector = hexColorToVector;
exports.getVariable = getVariable;

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
/**
 * gets the string value of variable from query string
 * @param {string} variable
 */


function getVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");

  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");

    if (pair[0] == variable) {
      return pair[1];
    }
  }

  return undefined;
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

var uPaused;
/** @type {WebGLUniformLocation} */

var uProb; // the uniforms in the render shader

/** @type {WebGLUniformLocation} */

var uYoungColor;
/** @type {WebGLUniformLocation} */

var uOldColor;
/** @type {WebGLUniformLocation} */

var uTrailColor;
/** @type {WebGLUniformLocation} */

var uDeadColor;
/** @type {WebGLUniformLocation} */

var uAliveMix;
/** @type {WebGLUniformLocation} */

var uDeadMix;
/** @type {WebGLTexture} */

var textureBack;
/** @type {WebGLTexture} */

var textureFront;
/** @type {{width: number, height: number}} */

var dimensions = {
  width: null,
  height: null
}; // state kept for controls

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

  (0, _rulescontrols.addChecks)(_rulescontrols.rules.conway); // define drawing area of webgl canvas. bottom corner, width / height

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  makeBuffer();
  makeShaders(); // seed the random number generator before render is called

  gl.uniform1f(uSeed, Math.random()); // start the game unpaused

  gl.uniform1i(uPaused, 0);
  makeTextures(); // TODO move render out of makeTextures
  // stuff for color controls

  (0, _rulescontrols.addNumberChangeListeners)(canvas);
  (0, _rulescontrols.addColorChangeListeners)(gl, uYoungColor, uOldColor, uTrailColor, uDeadColor);
  (0, _rulescontrols.generateShareUrl)();
  window.addEventListener("keypress", function (e) {
    switch (e.key) {
      case "r":
        time = 0;
        (0, _rulescontrols.setPaused)(false);
        break;

      case "p":
        (0, _rulescontrols.playOrPause)();
        break;

      case "h":
        toggleDiv("guiholder");
        break;

      default:
        break;
    }
  });
  document.getElementById("randombutton").addEventListener("click", function () {
    time = 0;
    (0, _rulescontrols.setPaused)(false);
  }); // help toggle

  var helpButton = document.getElementById("helpbutton");
  helpButton.addEventListener("click", function () {
    var result = toggleDiv("instructions");
    helpButton.innerText = result ? "show help" : "hide help";
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

  var fragmentSource = glslify(["// transforms the colors in the simulation into better ones\n\n#ifdef GL_ES\nprecision mediump float;\n#define GLSLIFY 1\n#endif\n\nuniform sampler2D uSampler;\nuniform vec2 resolution;\n\nuniform vec4 youngColor;\nuniform vec4 oldColor;\nuniform vec4 trailColor;\nuniform vec4 deadColor;\n\nvoid main() {\n  vec4 originalColor = vec4(texture2D(uSampler, gl_FragCoord.xy / resolution).rgb, 1.0);\n  vec4 newColor = mix(oldColor, youngColor, originalColor.b) * originalColor.r\n                  + mix(deadColor, trailColor, originalColor.g) * (1.0 - originalColor.r);\n  gl_FragColor = newColor;\n}\n"]);
  drawProgram = createAndCompileFrag(fragmentSource, vertexShader);
  setPositionAndRes(drawProgram);
  var simulationSource = glslify(["#ifdef GL_ES\nprecision mediump float;\n#define GLSLIFY 1\n#endif\n\nuniform float time;\nuniform vec2 resolution;\n\n// simulation texture state, swapped each frame\nuniform sampler2D state;\n\n// defines the rules of the board\nuniform int rules[9];\n\n// to seed the psuedorandom number generator\nuniform float seed;\n\n// whether to step the simulation\nuniform int paused;\n\n// chance for initial starting condition\nuniform float prob;\n\n// uniforms for color drop rate\nuniform float aliveMix;\nuniform float deadMix;\n\n// constants for rules\nconst int die = 0;\nconst int stay = 1;\nconst int birth = 2;\nconst int both = 3;\n\n// random function from book of shaders\nfloat random(vec2 st) {\n  return fract(sin(dot(st.xy / 123.45, vec2(12.9898, 78.233))) * 43758.5453123 * (9.0 + seed));\n}\n\n// returns 1.0 or 0.0 based on chance\nfloat randomChance(vec2 st, float chance) {\n  return step(chance, random(st));\n}\n\n// get a pixel value\nvec4 getPixel(int x, int y) {\n  return texture2D(state, (mod(gl_FragCoord.xy + vec2(x, y), resolution)) / resolution);\n}\n\n// look up individual cell values\nint get(int x, int y) {\n  return int(getPixel(x, y).r);\n}\n\n// get stepped color of alive cell\nvec4 getAliveColor(vec4 color) {\n  return vec4(1.0, 0.0, (1.0 - color.r) * 1.0 + aliveMix * color.b, 1.0);\n}\n\n// get stepped color of dead cell\nvec4 getDeadColor(vec4 color) {\n  return vec4( 0.0, color.r * 1.0 + color.g * deadMix, 0.0, 1.0 );\n}\n\nvoid main() {\n  // randomize on the GPU at the beginning\n  if (time == 0.0) {\n    gl_FragColor = vec4(vec3(randomChance(gl_FragCoord.xy, prob)), 1.0);\n    return;\n  }\n\n  // get sum of all surrounding nine neighbors\n  int sum = get(-1, -1) + get(-1, 0) + get(-1, 1) + get(0, -1) + get(0, 1) + get(1, -1) + get(1, 0) + get(1, 1);\n\n  // index rules array based on neighbor #\n  int result;\n\n  // can't index by a non-constant, so we have to loop through\n  for (int i = 0; i < 9; i++) {\n    if (i == sum) {\n      result = rules[i];\n      break;\n    }\n  }\n\n  vec4 color = getPixel(0, 0);\n\n  if (paused == 1) {\n    gl_FragColor = color;\n    return;\n  }\n\n  // TODO don't call get here (used color)\n  float current = float(get(0, 0));\n\n  if (result == stay) {\n    // maintain current state\n    gl_FragColor = vec4(color.r, color.g * deadMix, color.r * (aliveMix * color.b), 1.0);\n  } else if (result == both) {\n    // ideal # of neighbors... if cell is living, stay alive, if it is dead, come to life!\n    gl_FragColor = getAliveColor(color);\n  } else if (result == birth) {\n    // semi-ideal # of neighbors... if cell is living, die, but if dead, come to life\n    if (current == 0.0) {\n      gl_FragColor = getAliveColor(color);\n    } else {\n      gl_FragColor = getDeadColor(color);\n    }\n  } else if (result == die) {\n    // over-population or loneliness... cell dies\n    gl_FragColor = getDeadColor(color);\n  }\n}\n"]);
  simulationProgram = createAndCompileFrag(simulationSource, vertexShader);
  setPositionAndRes(simulationProgram); // TODO move the getting of uniforms to its own function
  // find a pointer to the uniform "time" in our fragment shader

  uTime = gl.getUniformLocation(simulationProgram, "time");
  uSimulationState = gl.getUniformLocation(simulationProgram, "state");
  uRules = gl.getUniformLocation(simulationProgram, "rules"); // get all the color uniforms for the render shader

  uYoungColor = gl.getUniformLocation(drawProgram, "youngColor");
  uOldColor = gl.getUniformLocation(drawProgram, "oldColor");
  uTrailColor = gl.getUniformLocation(drawProgram, "trailColor");
  uDeadColor = gl.getUniformLocation(drawProgram, "deadColor"); // get random seed uniform location

  uSeed = gl.getUniformLocation(simulationProgram, "seed"); // get the pause uniform location

  uPaused = gl.getUniformLocation(simulationProgram, "paused"); // initial starting condition chance

  uProb = gl.getUniformLocation(simulationProgram, "prob"); // get uniforms for mixing

  uAliveMix = gl.getUniformLocation(simulationProgram, "aliveMix");
  uDeadMix = gl.getUniformLocation(simulationProgram, "deadMix");
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

  if (time === 0) {
    gl.uniform1f(uProb, (0, _rulescontrols.getFillProb)());
    gl.uniform1f(uSeed, Math.random());
  } // update the pause uniform if it has just changed


  if ((0, _rulescontrols.getJustPaused)()) {
    gl.uniform1i(uPaused, ~~(0, _rulescontrols.getPaused)());
    (0, _rulescontrols.pausedUpdated)();
  }

  if ((0, _rulescontrols.getMixesChanged)()) {
    gl.uniform1f(uAliveMix, (0, _rulescontrols.getMixes)().alive);
    gl.uniform1f(uDeadMix, (0, _rulescontrols.getMixes)().dead);
    (0, _rulescontrols.setMixesChanged)(true);
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
/**
 * show or hide a div
 * @param {string} id
 */


function toggleDiv(id) {
  var holder = document.getElementById(id);
  holder.style.display = holder.style.display === "none" ? "block" : "none";
  return holder.style.display === "none";
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
exports.makeRuleString = makeRuleString;
exports.parseRuleString = parseRuleString;
exports.addNumberChangeListeners = addNumberChangeListeners;
exports.generateShareUrl = generateShareUrl;
exports.getScale = getScale;
exports.getDelay = getDelay;
exports.getPaused = getPaused;
exports.setPaused = setPaused;
exports.getMixesChanged = getMixesChanged;
exports.setMixesChanged = setMixesChanged;
exports.getMixes = getMixes;
exports.getJustPaused = getJustPaused;
exports.pausedUpdated = pausedUpdated;
exports.playOrPause = playOrPause;
exports.getFillProb = getFillProb;
exports.currentRules = exports.rules = void 0;

var _helpers = require("./helpers.js");

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// constants for controls
var MIN_SCALE = 1;
var MAX_SCALE = 128;
var MIN_DELAY = 1;
var MAX_DELAY = 240;
var DEFAULT_SCALE = 4;
var DEFAULT_DELAY = 1;
var DEFAULT_FILL_PERCENT = 50;
var DEFAULT_ALIVE_MIX = 95;
var DEFAULT_DEAD_MIX = 95; // constants for game of life

var die = 0;
var stay = 1;
var birth = 2;
var both = 3;
var rulesUpToDate = false; // state kept for controls

var paused = false;
var justPaused = false;
var aliveMix;
var deadMix;
var mixesChanged = false; // we know DOM is already loaded since script tag is after body

var youngInput =
/** @type {HTMLInputElement} */
document.getElementById("youngcolor");
var oldInput =
/** @type {HTMLInputElement} */
document.getElementById("oldcolor");
var trailInput =
/** @type {HTMLInputElement} */
document.getElementById("trailcolor");
var deadInput =
/** @type {HTMLInputElement} */
document.getElementById("deadcolor");
var shareText =
/** @type {HTMLTextAreaElement} */
document.getElementById("sharetext");
var copyButton =
/** @type {HTMLButtonElement} */
document.getElementById("copybutton");
copyButton.addEventListener("click", function () {
  shareText.select();
  document.execCommand("copy");
});
var pauseButton =
/** @type {HTMLButtonElement} */
document.getElementById("pausebutton");
pauseButton.addEventListener("click", function () {
  playOrPause();
});
var scale = (0, _helpers.getVariable)("s") ? parseFloat((0, _helpers.getVariable)("s")) : DEFAULT_SCALE;
var delay = 1;
var fillPercent = (0, _helpers.getVariable)("f") ? parseFloat((0, _helpers.getVariable)("f")) : DEFAULT_FILL_PERCENT;
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

var CheckPair = /*#__PURE__*/function () {
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
        currentRules[_this.num] = _this.getRuleNum();
        rulesUpToDate = false;
        generateShareUrl();
      });
      return checkbox;
    };

    this.deadCheckbox = makeCheckbox();
    this.aliveCheckbox = makeCheckbox();
    numberCell.innerHTML = "" + num;
    deadCell.appendChild(this.deadCheckbox);
    aliveCell.appendChild(this.aliveCheckbox);
  } // hack to convert pairs of booleans to int from 0 to 3


  _createClass(CheckPair, [{
    key: "getRuleNum",
    value: function getRuleNum() {
      return 2 * ~~this.deadCheckbox.checked + ~~this.aliveCheckbox.checked;
    }
  }]);

  return CheckPair;
}();
/**
 * add all nine check rows to the table
 * @param {number[]} startRules
 */


function addChecks(startRules) {
  var queryRules = (0, _helpers.getVariable)("r");

  if (queryRules !== undefined) {
    exports.currentRules = currentRules = parseRuleString(queryRules);
  } else {
    exports.currentRules = currentRules = startRules;
  }

  for (var i = 0; i < 9; i++) {
    var checkPair = new CheckPair(i); // TODO be able to set rules even outside construction

    checkList.push(checkPair);
    var booleanRules = currentRules[i].toString(2).padStart(2, "0").split("").map(function (n) {
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
 * adds event listeners to the color input
 * @param {WebGLRenderingContext} gl
 * @param {WebGLUniformLocation} uYoungColor
 * @param {WebGLUniformLocation} uOldColor
 * @param {WebGLUniformLocation} uTrailColor
 * @param {WebGLUniformLocation} uDeadColor
 */


function addColorChangeListeners(gl, uYoungColor, uOldColor, uTrailColor, uDeadColor) {
  // get data from query string if any
  // example query string: `?y=ff0000&o=00ff00&t=0000ff&d=ffff00`
  var youngVar = (0, _helpers.getVariable)("y");
  var youngColor = youngVar !== undefined ? "#" + youngVar : "#ffffff";
  var oldVar = (0, _helpers.getVariable)("o");
  var oldColor = oldVar !== undefined ? "#" + oldVar : "#ffffff";
  var trailVar = (0, _helpers.getVariable)("t");
  var trailColor = trailVar !== undefined ? "#" + trailVar : "#777777";
  var deadVar = (0, _helpers.getVariable)("d");
  var deadColor = deadVar !== undefined ? "#" + deadVar : "#000000";
  youngInput.addEventListener("change", makeColorInputFunc(gl, uYoungColor, youngInput, youngColor));
  oldInput.addEventListener("change", makeColorInputFunc(gl, uOldColor, oldInput, oldColor));
  trailInput.addEventListener("change", makeColorInputFunc(gl, uTrailColor, trailInput, trailColor));
  deadInput.addEventListener("change", makeColorInputFunc(gl, uDeadColor, deadInput, deadColor));
}
/**
 * makes the on change function for a color input
 * @param {WebGLUniformLocation} loc
 * @param {HTMLInputElement} input
 * @param {WebGLRenderingContext} gl
 * @param {string} color
 */


function makeColorInputFunc(gl, loc, input, color) {
  input.value = color; // set initial color

  var func = function func() {
    gl.uniform4fv(loc, (0, _helpers.hexColorToVector)(input.value));
  };

  func(); // fire the function to set the colors

  return function () {
    func();
    generateShareUrl();
  };
}

function makeRuleString() {
  var str = "";

  var _iterator = _createForOfIteratorHelper(currentRules),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var rule = _step.value;
      str += rule;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return str;
}
/**
 * parse the base 4 rule string into an array
 * @param {string} str
 */


function parseRuleString(str) {
  return str.split("").map(function (s) {
    return parseInt(s);
  });
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
    generateShareUrl();
  });
  scaleInput.min = "" + MIN_SCALE;
  scaleInput.max = "" + MAX_SCALE;
  scaleInput.value = "" + scale;
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
  var fillInput =
  /** @type {HTMLInputElement} */
  document.getElementById("fillpercent");
  fillInput.value = "" + fillPercent;
  fillInput.addEventListener("change", function () {
    fillPercent = (0, _helpers.clamp)(Math.floor(parseFloat(fillInput.value) * 10) / 10, 0, 100);
    fillInput.value = "" + fillPercent;
    generateShareUrl();
  });
  /**
   * @param {HTMLInputElement} input
   * @param {number} val
   * @param {boolean} val
   */

  var setupMix = function setupMix(input, val, alive) {
    input.value = "" + val; // set initial value

    var func = function func() {
      if (input.value === "") input.value = "0";
      var mix = Math.round(10 * (0, _helpers.clamp)(parseFloat(input.value), 0, 100)) / 10;
      input.value = "" + mix;
      var normalMix = mix / 100;
      alive ? aliveMix = normalMix : deadMix = normalMix;
      mixesChanged = true;
    };

    func();
    input.addEventListener("change", function () {
      func();
      generateShareUrl();
    });
  };

  var aliveMixInput =
  /** @type {HTMLInputElement} */
  document.getElementById("alivemix");
  setupMix(aliveMixInput, (0, _helpers.getVariable)("a") ? parseFloat((0, _helpers.getVariable)("a")) : DEFAULT_ALIVE_MIX, true);
  var deadMixInput =
  /** @type {HTMLInputElement} */
  document.getElementById("deadmix");
  setupMix(deadMixInput, (0, _helpers.getVariable)("g") ? parseFloat((0, _helpers.getVariable)("g")) : DEFAULT_DEAD_MIX, false);
  resizeCanvas(canvas);
}
/**
 * gets the url color string from a color input
 * @param {HTMLInputElement} input
 */


function getColorString(input) {
  return input.value.slice(1);
}

function generateShareUrl() {
  var url = window.location.href.split("?")[0];
  var query = "?y=" + getColorString(youngInput) + "&o=" + getColorString(oldInput) + "&t=" + getColorString(trailInput) + "&d=" + getColorString(deadInput) + (aliveMix !== DEFAULT_ALIVE_MIX / 100 ? "&a=" + (aliveMix * 100).toFixed(2) : "") + (deadMix !== DEFAULT_DEAD_MIX / 100 ? "&g=" + (deadMix * 100).toFixed(2) : "") + "&r=" + makeRuleString() + "&f=" + fillPercent + (scale !== DEFAULT_SCALE ? "&s=" + scale : "");
  shareText.innerHTML = url + query; // TODO should it be innerText?
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

function getPaused() {
  return paused;
}
/**
 * @param {boolean} pauseState
 */


function setPaused(pauseState) {
  if (pauseState !== paused) {
    justPaused = true;
    paused = pauseState;
    updatePausedText();
  }
}

function getMixesChanged() {
  return mixesChanged;
}

function setMixesChanged() {
  var changed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  mixesChanged = changed;
}

function getMixes() {
  return {
    alive: aliveMix,
    dead: deadMix
  };
}

function getJustPaused() {
  return justPaused;
}

function pausedUpdated() {
  justPaused = false;
}

function playOrPause() {
  paused = !paused;
  justPaused = true;
  updatePausedText();
}

function getFillProb() {
  return fillPercent / 100;
}

function updatePausedText() {
  pauseButton.innerText = paused ? "play" : "pause";
}

},{"./helpers.js":1}]},{},[2]);
