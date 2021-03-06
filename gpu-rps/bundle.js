(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const glslify = require("glslify");

/** @type {WebGLRenderingContext} */
let gl;

/** @type {WebGLFramebuffer} */
let framebuffer;

/** @type {WebGLProgram} */
let simulationProgram;

/** @type {WebGLProgram} */
let drawProgram;

/** @type {WebGLUniformLocation} */
let uTime;

/** @type {WebGLUniformLocation} */
let uSimulationState;

/** @type {WebGLTexture} */
let textureBack;

/** @type {WebGLTexture} */
let textureFront;

/** @type {{width: number, height: number}} */
let dimensions = { width: null, height: null };

let pressed = false;
let erase = false;

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
 * helper function to clamp coordinates to dimensions
 * @param {number} x
 * @param {number} y
 */
function clampToDimensions(x, y) {
  x = clamp(x, 0, dimensions.width - 1);
  y = clamp(y, 0, dimensions.height - 1);
  return { x: x, y: y };
}

window.onload = function() {
  const hideButton = /** @type {HTMLButtonElement} */ (document.getElementById(
    "hidebutton"
  ));

  hideButton.addEventListener("mousedown", e => {
    e.stopImmediatePropagation();
    document.getElementById("messagebox").style.display = "none";
    return false;
  });

  const dot = document.getElementById("dot");

  document.addEventListener("mousemove", e => {
    console.log("moved");
    dot.style.left = e.pageX - 10 + "px";
    dot.style.top = e.pageY - 10 + "px";
  });

  document.addEventListener("mousedown", e => {
    pressed = true;
    paint(e.clientX, dimensions.height - e.clientY);
  });

  document.addEventListener("mouseup", e => {
    pressed = false;
  });

  document.addEventListener("mousemove", e => {
    if (pressed) paint(e.clientX, dimensions.height - e.clientY);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "r") {
      drawColor = [255, 0, 0];
      erase = false;
      dot.style.border = "2px solid #ff0000aa";
    } else if (e.key === "g") {
      drawColor = [0, 255, 0];
      erase = false;
      dot.style.border = "2px solid #00ff00aa";
    } else if (e.key === "b") {
      drawColor = [0, 0, 255];
      erase = false;
      dot.style.border = "2px solid #0000ffaa";
    } else if (e.key === "e") {
      erase = true;
      dot.style.border = "2px solid #ffffffaa";
    } else if (e.key === "c") {
      clearSection(0, 0, dimensions.width, dimensions.height, textureBack);
    }
  });

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
    "gl"
  ));

  gl = /** @type {WebGLRenderingContext} */ (canvas.getContext("webgl"));
  canvas.width = dimensions.width = window.innerWidth;
  canvas.height = dimensions.height = window.innerHeight;

  // define drawing area of webgl canvas. bottom corner, width / height
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  makeBuffer();
  makeShaders();
  makeTextures();
};

/**
 * draw color on the board or erase
 * @param {number} x
 * @param {number} y
 */
function paint(x, y) {
  if (!erase) {
    poke(x, y, drawColor, textureBack);
  } else {
    clearSection(x - 32, y - 32, 64, 64, textureBack);
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number[]} color
 * @param {WebGLTexture} texture
 */
function poke(x, y, color, texture) {
  // this prevents the webgl warnings
  ({ x, y } = clampToDimensions(x, y));

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    // x offset, y offset, width, height
    x,
    y,
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    // is supposed to be a typed array
    new Uint8Array([...color, 255])
  );
}

/**
 * clears a rectangle
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {WebGLTexture} texture
 */
function clearSection(x, y, width, height, texture) {
  // this prevents the webgl warnings
  ({ x, y } = clampToDimensions(x, y));

  if (x + width > dimensions.width) width = dimensions.width - x;
  if (y + height > dimensions.height) x = dimensions.height - y;

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    x,
    y,
    width,
    height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    // empty array of all zero of appropriate size
    new Uint8Array(width * height * 4)
  );
}

let drawColor = [255, 0, 0];

function makeBuffer() {
  // create a buffer object to store vertices
  const buffer = gl.createBuffer();

  // point buffer at graphic context's ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const points = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  const triangles = new Float32Array(points);

  // initialize memory for buffer and populate it. Give
  // open gl hint contents will not change dynamically.
  gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
}

function makeShaders() {
  // create vertex shader
  const vertexSource = glslify(["#define GLSLIFY 1\n// simplest possible vertex shader\n\nattribute vec2 a_position;\n\nvoid main() {\n  gl_Position = vec4(a_position, 0, 1);\n}"]);
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);

  // create fragment shader
  const fragmentSource = glslify(["// simplest possible fragment shader\n\n#ifdef GL_ES\nprecision mediump float;\n#define GLSLIFY 1\n#endif\n\nuniform sampler2D uSampler;\nuniform vec2 resolution;\n\nvoid main() {\n  gl_FragColor = vec4(texture2D(uSampler, gl_FragCoord.xy / resolution).rgb, 1.0);\n}"]);
  const drawFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(drawFragmentShader, fragmentSource);
  gl.compileShader(drawFragmentShader);
  // reports problem if there was issue with compiling shader
  console.log(gl.getShaderInfoLog(drawFragmentShader));

  // create render program that draws to screen
  drawProgram = gl.createProgram();
  gl.attachShader(drawProgram, vertexShader);
  gl.attachShader(drawProgram, drawFragmentShader);

  gl.linkProgram(drawProgram);
  gl.useProgram(drawProgram);

  const uResDraw = gl.getUniformLocation(drawProgram, "resolution");
  gl.uniform2f(uResDraw, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // get position attribute location in shader
  let position = gl.getAttribLocation(drawProgram, "a_position");
  // enable the attribute
  gl.enableVertexAttribArray(position);

  // this will point to the vertices in the last bound array buffer. In this
  // example, we only use one array buffer, where we're storing our vertices
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const simulationSource = glslify(["#ifdef GL_ES\nprecision mediump float;\n#define GLSLIFY 1\n#endif\n\nuniform float time;\nuniform vec2 resolution;\n\n// simulation texture state, swapped each frame\nuniform sampler2D state;\n\n// from The Book of Shaders\nfloat random(vec2 st) {\n  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);\n}\n\n// look up individual cell values\nvec3 get(int x, int y) {\n  return texture2D(state, (mod(gl_FragCoord.xy + vec2(x, y), resolution)) / resolution).rgb;\n}\n\n// change color\nvec3 munch(vec3 center, int x, int y) {\n  vec3 neighbor = get(x, y);\n  const float minimum = 0.0625; // equivalent to 1/16\n  // if adjacent to a hostile neighbor or empty\n  if (\n    (neighbor.g > 0.0 && center.r > 0.0)\n    ||(neighbor.b > 0.0 && center.g > 0.0)\n    ||(neighbor.r > 0.0 && center.b > 0.0)\n  ) {\n    gl_FragColor = vec4(vec3(neighbor), 1.0);\n  }\n  else if (center.r < minimum && center.g < minimum && center.b < minimum) {\n    // reduction in fuel equivalent to -1/64\n    gl_FragColor = vec4(vec3(neighbor - sign(neighbor) * vec3(0.015625)), 1.0);\n  } else {\n    gl_FragColor = vec4(center, 1.0);\n  }\n  return neighbor;\n}\n\nvoid main() {\n  // the scalar for the coordinate is to increase randomness\n  // (we get some weird patterns otherwise)\n  float r = random(gl_FragCoord.xy * 1.234 + time);\n  float i = r * 8.0;\n  vec3 center = get(0, 0); // cache this so it so lookup doesn't happen every munch\n  \n  if (i < 1.0) { munch(center, - 1, - 1); }\n  else if (i < 2.0) { munch(center, - 1, 0); }\n  else if (i < 3.0) { munch(center, - 1, 1); }\n  else if (i < 4.0) { munch(center, 0, - 1); }\n  else if (i < 5.0) { munch(center, 0, 1); }\n  else if (i < 6.0) { munch(center, 1, - 1); }\n  else if (i < 7.0) { munch(center, 1, 0); }\n  else if (i < 8.0) { munch(center, 1, 1); }\n}\n"]);
  const simulationFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(simulationFragmentShader, simulationSource);
  gl.compileShader(simulationFragmentShader);
  // reports problem if there was issue with compiling shader
  console.log(gl.getShaderInfoLog(simulationFragmentShader));

  // create simulation program
  simulationProgram = gl.createProgram();
  gl.attachShader(simulationProgram, vertexShader);
  gl.attachShader(simulationProgram, simulationFragmentShader);

  gl.linkProgram(simulationProgram);
  gl.useProgram(simulationProgram);

  const uResSimulation = gl.getUniformLocation(simulationProgram, "resolution");
  gl.uniform2f(uResSimulation, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // find a pointer to the uniform "time" in our fragment shader
  uTime = gl.getUniformLocation(simulationProgram, "time");

  uSimulationState = gl.getUniformLocation(simulationProgram, "state");

  position = gl.getAttribLocation(simulationProgram, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}

function makeTextures() {
  textureBack = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureBack);

  // these two lines are needed for non-power-of-2 textures
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // how to map when texture element is less than one pixel
  // use gl.NEAREST to avoid linear interpolation
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  // how to map when texture element is more than one pixel
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // specify texture format, see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    dimensions.width,
    dimensions.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  textureFront = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureFront);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    dimensions.width,
    dimensions.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  // Create a framebuffer and attach the texture.
  framebuffer = gl.createFramebuffer();

  // textures loaded, now ready to render
  render();
}

// keep track of time via incremental frame counter
let time = 0;
function render() {
  // schedules render to be called the next time the video card requests
  // a frame of video
  window.requestAnimationFrame(render);

  // use our simulation shader
  gl.useProgram(simulationProgram);
  // update time on CPU and GPU
  time++;
  gl.uniform1f(uTime, time);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  // use the framebuffer to write to our texFront texture
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textureFront,
    0
  );
  // set viewport to be the size of our state (game of life simulation)
  // here, this represents the size that will be drawn onto our texture
  gl.viewport(0, 0, dimensions.width, dimensions.height);

  // in our shaders, read from texBack, which is where we poked to
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureBack);
  gl.uniform1i(uSimulationState, 0);
  // run shader
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // swap our front and back textures
  let tmp = textureFront;
  textureFront = textureBack;
  textureBack = tmp;

  // use the default framebuffer object by passing null
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // set our viewport to be the size of our canvas
  // so that it will fill it entirely
  gl.viewport(0, 0, dimensions.width, dimensions.height);
  // select the texture we would like to draw to the screen. note that webgl
  // does not allow you to write to read from the same texture in a single
  // render pass. Because of the swap, we're displaying the state of our
  // simulation ****before**** this render pass (frame)
  gl.bindTexture(gl.TEXTURE_2D, textureFront);
  // use our drawing (copy) shader
  gl.useProgram(drawProgram);
  // put simulation on screen
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

},{"glslify":2}],2:[function(require,module,exports){
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

},{}]},{},[1]);
