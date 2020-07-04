(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBuilder = exports.bufferSamplerName = void 0;
const expr_1 = require("./expressions/expr");
const webglprogramloop_1 = require("./webglprogramloop");
const FRAG_SET = `  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);\n`;
const SCENE_SET = `uniform sampler2D uSceneSampler;\n`;
const TIME_SET = `uniform mediump float uTime;\n`;
const MOUSE_SET = `uniform mediump vec2 uMouse;\n`;
const BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump vec2 uResolution;\n`;
function bufferSamplerName(buf) {
    // texture 2 sampler has number 0 (0 and 1 are used for back buffer and scene)
    return `uBufferSampler${buf}`;
}
exports.bufferSamplerName = bufferSamplerName;
function bufferSamplerDeclaration(buf) {
    return `uniform sampler2D ${bufferSamplerName(buf)};`;
}
class CodeBuilder {
    constructor(effectLoop) {
        this.calls = [];
        this.externalFuncs = new Set();
        this.uniformDeclarations = new Set();
        this.counter = 0;
        this.baseLoop = effectLoop;
        const buildInfo = {
            uniformTypes: {},
            externalFuncs: new Set(),
            exprs: [],
            needs: {
                centerSample: false,
                neighborSample: false,
                sceneBuffer: false,
                timeUniform: false,
                mouseUniform: false,
                extraBuffers: new Set(),
            },
        };
        this.addEffectLoop(effectLoop, 1, buildInfo);
        // add all the types to uniform declarations from the `BuildInfo` instance
        for (const name in buildInfo.uniformTypes) {
            const typeName = buildInfo.uniformTypes[name];
            this.uniformDeclarations.add(`uniform mediump ${typeName} ${name};`);
        }
        //this.uniformNames = Object.keys(buildInfo.uniformTypes);
        // add all external functions from the `BuildInfo` instance
        buildInfo.externalFuncs.forEach((func) => this.externalFuncs.add(func));
        this.totalNeeds = buildInfo.needs;
        this.exprs = buildInfo.exprs;
    }
    addEffectLoop(effectLoop, indentLevel, buildInfo, topLevel = true) {
        const needsLoop = !topLevel && effectLoop.repeat.num > 1;
        if (needsLoop) {
            const iName = "i" + this.counter;
            indentLevel++;
            const forStart = "  ".repeat(indentLevel - 1) +
                `for (int ${iName} = 0; ${iName} < ${effectLoop.repeat.num}; ${iName}++) {`;
            this.calls.push(forStart);
        }
        for (const e of effectLoop.effects) {
            if (e instanceof expr_1.Expr) {
                e.parse(buildInfo);
                this.calls.push("  ".repeat(indentLevel) + "gl_FragColor = " + e.sourceCode + ";");
                this.counter++;
            }
            else {
                this.addEffectLoop(e, indentLevel, buildInfo, false);
            }
        }
        if (needsLoop) {
            this.calls.push("  ".repeat(indentLevel - 1) + "}");
        }
    }
    compileProgram(gl, vShader, uniformLocs) {
        // set up the fragment shader
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (fShader === null) {
            throw new Error("problem creating fragment shader");
        }
        const fullCode = BOILERPLATE +
            (this.totalNeeds.sceneBuffer ? SCENE_SET : "") +
            (this.totalNeeds.timeUniform ? TIME_SET : "") +
            (this.totalNeeds.mouseUniform ? MOUSE_SET : "") +
            Array.from(this.totalNeeds.extraBuffers)
                .map((n) => bufferSamplerDeclaration(n))
                .join("\n") +
            "\n" +
            [...this.uniformDeclarations].join("\n") +
            "\n" +
            [...this.externalFuncs].join("\n") +
            "\n" +
            "void main() {\n" +
            (this.totalNeeds.centerSample ? FRAG_SET : "") +
            this.calls.join("\n") +
            "\n}";
        gl.shaderSource(fShader, fullCode);
        gl.compileShader(fShader);
        // set up the program
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("problem creating program");
        }
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        const shaderLog = (name, shader) => {
            const output = gl.getShaderInfoLog(shader);
            if (output)
                console.log(`${name} shader info log\n${output}`);
        };
        shaderLog("vertex", vShader);
        shaderLog("fragment", fShader);
        gl.linkProgram(program);
        // we need to use the program here so we can get uniform locations
        gl.useProgram(program);
        console.log(fullCode);
        // find all uniform locations and add them to the dictionary
        for (const expr of this.exprs) {
            for (const name in expr.uniformValChangeMap) {
                const location = gl.getUniformLocation(program, name);
                if (location === null) {
                    throw new Error("couldn't find uniform " + name);
                }
                // TODO enforce unique names in the same program
                if (uniformLocs[name] === undefined) {
                    uniformLocs[name] = { locs: [], counter: 0 };
                }
                // assign the name to the location
                uniformLocs[name].locs.push(location);
            }
        }
        // set the uniform resolution (every program has this uniform)
        const uResolution = gl.getUniformLocation(program, "uResolution");
        gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        if (this.totalNeeds.sceneBuffer) {
            // TODO allow for texture options for scene texture
            const location = gl.getUniformLocation(program, "uSceneSampler");
            // put the scene buffer in texture 1 (0 is used for the backbuffer)
            gl.uniform1i(location, 1);
        }
        // set all sampler uniforms
        for (const b of this.totalNeeds.extraBuffers) {
            const location = gl.getUniformLocation(program, bufferSamplerName(b));
            // offset the texture location by 2 (0 and 1 are used for scene and original)
            gl.uniform1i(location, b + 2);
        }
        // get attribute
        const position = gl.getAttribLocation(program, "aPosition");
        // enable the attribute
        gl.enableVertexAttribArray(position);
        // points to the vertices in the last bound array buffer
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        return new webglprogramloop_1.WebGLProgramLoop(program, this.baseLoop.repeat, gl, this.totalNeeds, this.exprs);
    }
}
exports.CodeBuilder = CodeBuilder;

},{"./expressions/expr":13,"./webglprogramloop":39}],2:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dat = __importStar(require("dat.gui"));
const MP = __importStar(require("./index"));
const glCanvas = document.getElementById("gl");
const gl = glCanvas.getContext("webgl2");
const mousePos = { x: 0, y: 0 };
if (gl === null) {
    throw new Error("problem getting the gl context");
}
const sourceCanvas = document.getElementById("source");
const source = sourceCanvas.getContext("2d");
if (source === null) {
    throw new Error("problem getting the source context");
}
function getVariable(variable) {
    let query = window.location.search.substring(1);
    let vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        let pair = vars[i].split("=");
        if (pair[0] == variable)
            return pair[1];
    }
}
// dwitter sim
const C = Math.cos;
const S = Math.sin;
const T = Math.tan;
let x;
let c;
let R = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const demos = {
    edgeblur: () => {
        const lenExpr = MP.op(MP.len(MP.ncfcoord()), "*", 3);
        const merger = new MP.Merger([MP.blur2d(lenExpr, lenExpr, 3)], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    bluramount: () => {
        const fl = MP.float(MP.mut(1));
        const merger = new MP.Merger([MP.blur2d(fl, fl)], sourceCanvas, gl);
        class BlurControls {
            constructor() {
                this.blur = 1;
            }
        }
        const controls = new BlurControls();
        const gui = new dat.GUI();
        gui.add(controls, "blur", 0, 1, 0.01);
        return {
            merger: merger,
            change: () => {
                fl.setVal(controls.blur);
            },
        };
    },
    bluramountnamed: () => {
        const fl = MP.float(MP.mut(1, "uCustomName"));
        const merger = new MP.Merger([MP.blur2d(fl, fl)], sourceCanvas, gl);
        class BlurControls {
            constructor() {
                this.blur = 1;
            }
        }
        const controls = new BlurControls();
        const gui = new dat.GUI();
        gui.add(controls, "blur", 0, 1, 0.01);
        return {
            merger: merger,
            change: () => {
                fl.setUniform("uCustomName", controls.blur);
            },
        };
    },
    vectordisplay: () => {
        const merger = new MP.Merger([
            MP.loop([
                MP.gauss(MP.vec2(1, 0)),
                MP.gauss(MP.vec2(0, 1)),
                MP.brightness(0.15),
                MP.contrast(1.2),
            ], 5),
            MP.brightness(-0.5),
            MP.setcolor(MP.op(MP.fcolor(), "+", MP.input())),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    singlepassgrain: () => {
        let vec;
        let m;
        const merger = new MP.Merger([
            MP.gauss(MP.vec2(0, 1), 13),
            MP.grain((m = MP.op(MP.len(MP.op(MP.ncfcoord(), "+", (vec = MP.vec2(MP.mut(0), 0)))), "*", MP.mut(0.3)))),
        ], sourceCanvas, gl);
        class GrainControls {
            constructor() {
                this.location = 0;
                this.strength = 0.3;
            }
        }
        const controls = new GrainControls();
        const gui = new dat.GUI();
        gui.add(controls, "location", -0.5, 0.5, 0.01);
        gui.add(controls, "strength", 0, 0.5, 0.01);
        return {
            merger: merger,
            change: (merger, time, frame) => {
                vec.setComp(0, -controls.location);
                m.setRight(controls.strength);
            },
        };
    },
    redonly: () => {
        const merger = new MP.Merger([MP.setcolor(MP.changecomp(MP.fcolor(), MP.vec2(0, 0), "gb"))], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    redzero: () => {
        const merger = new MP.Merger([MP.setcolor(MP.changecomp(MP.fcolor(), 0, "r"))], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    redgreenswap: () => {
        const merger = new MP.Merger([
            MP.setcolor(MP.changecomp(MP.fcolor(), MP.get2comp(MP.fcolor(), "gr"), "rg")),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    huerotate: () => {
        let c;
        const merger = new MP.Merger([
            MP.hsv2rgb((c = MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.mut(0.5), "r", "+"))),
        ], sourceCanvas, gl);
        class HueControls {
            constructor() {
                this.hueRotation = 0.3;
            }
        }
        const controls = new HueControls();
        const gui = new dat.GUI();
        gui.add(controls, "hueRotation", 0, 1.0, 0.01);
        return {
            merger: merger,
            change: () => {
                c.setNew(controls.hueRotation);
            },
        };
    },
    timehuerotate: () => {
        const merger = new MP.Merger([MP.hsv2rgb(MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.time(), "r", "+"))], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    scanlines: () => {
        const merger = new MP.Merger([
            MP.brightness(MP.op(MP.op(-1, "*", MP.a2("pow", MP.a1("cos", MP.op(MP.getcomp(MP.nfcoord(), "y"), "*", (260 / 2) * Math.PI)), 6)), "-", MP.op(1, "*", MP.op(MP.a2("pow", MP.getcomp(MP.op(MP.ncfcoord(), "*", 2), "x"), 4), "+", MP.a2("pow", MP.getcomp(MP.op(MP.ncfcoord(), "*", 2), "y"), 4))))),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    fxaa: () => {
        const merger = new MP.Merger([MP.fxaa()], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    channelblur: (channels = []) => {
        // TODO get rid of this
        const a = MP.a1("sin", 1);
        const merger = new MP.Merger([
            MP.hsv2rgb(MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.getcomp(MP.gauss(MP.vec2(8, 0), 13, 0), "r"), "z")),
        ], sourceCanvas, gl, {
            channels: channels,
        });
        return {
            merger: merger,
            change: () => { },
        };
    },
    channeleyesore: (channels = []) => {
        const merger = new MP.Merger([
            MP.hsv2rgb(MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.vec2(MP.getcomp(MP.channel(0), "x"), MP.getcomp(MP.channel(1), "x")), "xy", "+")),
            MP.fxaa(),
        ], sourceCanvas, gl, {
            channels: channels,
        });
        return {
            merger: merger,
            change: () => { },
        };
    },
    basicdof: (channels = []) => {
        //const dof = MP.dof(MP.mut(0.3), MP.mut(0.01));
        const dof = MP.dof();
        const merger = new MP.Merger([dof], sourceCanvas, gl, {
            channels: channels,
        });
        class FocusControls {
            constructor() {
                this.focus = 0.3;
                this.radius = 0.01;
            }
        }
        const controls = new FocusControls();
        const gui = new dat.GUI();
        gui.add(controls, "focus", 0, 1.0, 0.01);
        gui.add(controls, "radius", 0.01, 0.1, 0.01);
        return {
            merger: merger,
            change: () => {
                dof.setDepth(controls.focus);
                dof.setRadius(controls.radius);
            },
        };
    },
    lineardof: (channels = []) => {
        const dof = MP.dof(
        // transform a linear depth buffer to hyperbolic where 12 is max depth
        MP.mut(0.3), MP.mut(0.01), MP.op(1, "/", MP.op(1, "+", MP.op(12, "*", MP.op(1, "-", MP.getcomp(MP.channel(0), "r"))))));
        const merger = new MP.Merger([dof], sourceCanvas, gl, {
            channels: channels,
        });
        class FocusControls {
            constructor() {
                this.focus = 0;
                this.radius = 0.01;
            }
        }
        const controls = new FocusControls();
        const gui = new dat.GUI();
        gui.add(controls, "focus", 0, 1.0, 0.01);
        gui.add(controls, "radius", 0.01, 0.1, 0.01);
        return {
            merger: merger,
            change: () => {
                dof.setDepth(controls.focus);
                dof.setRadius(controls.radius);
            },
        };
    },
    lightbands: (channels = []) => {
        const merger = new MP.Merger([
            MP.brightness(MP.a1("cos", MP.op(MP.time(), "+", MP.truedepth(MP.getcomp(MP.channel(0), "r"))))),
        ], sourceCanvas, gl, {
            channels: channels,
        });
        return {
            merger: merger,
            change: () => { },
        };
    },
    depthgodrays: (channels = []) => {
        let godrays;
        const merger = new MP.Merger([
            (godrays = MP.godrays({
                convertDepth: {
                    threshold: 0.1,
                    newColor: MP.hsv2rgb(MP.vec4(MP.op(MP.time(), "/", 4), 0.5, 0.5, 1)),
                },
            })),
        ], sourceCanvas, gl, {
            channels: channels,
        });
        class LocationControls {
            constructor() {
                this.location = 0;
                this.exposure = 1.0;
                this.decay = 1.0;
                this.density = 1.0;
                this.weight = 0.01;
            }
        }
        const controls = new LocationControls();
        const gui = new dat.GUI();
        gui.add(controls, "location", -1, 1, 0.01);
        gui.add(controls, "exposure", 0, 1, 0.01);
        gui.add(controls, "decay", 0.9, 1, 0.001);
        gui.add(controls, "density", 0, 1, 0.01);
        gui.add(controls, "weight", 0, 0.02, 0.001);
        return {
            merger: merger,
            change: () => {
                godrays.setLightPos(MP.pvec2(0.5 + -controls.location / 5, 0.5));
                godrays.setExposure(controls.exposure);
                godrays.setDecay(controls.decay);
                godrays.setDensity(controls.density);
                godrays.setWeight(controls.weight);
            },
        };
    },
    mousegodrays: (channels = []) => {
        const merger = new MP.Merger([MP.godrays({ lightPos: MP.op(MP.mouse(), "/", MP.resolution()) })], sourceCanvas, gl, {
            channels: channels,
        });
        return {
            merger: merger,
            change: () => { },
        };
    },
    mitosis: () => {
        // prettier-ignore
        const merger = new MP.Merger([MP.input(MP.changecomp(MP.nfcoord(), MP.op(MP.op(MP.op(0.5, "+", MP.op(0.5, "*", MP.a1("cos", MP.time()))), "*", 0.3), "*", MP.a1("cos", MP.op(MP.getcomp(MP.nfcoord(), "x"), "*", 3 * Math.PI))), "x", "+")), MP.fxaa()], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
};
// canvas drawing loops
const stripes = (t, frames) => {
    if (frames === 0) {
        x.fillStyle = "black";
        x.fillRect(0, 0, 960, 540);
        x.font = "99px monospace";
        x.fillStyle = "white";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText("hello world", 960 / 2, 540 / 4);
    }
    const i = ~~(frames / 9);
    const j = ~~(i / 44);
    const k = i % 44;
    x.fillStyle = `hsl(${(k & j) * i},40%,${50 + C(i) * 10}%`;
    x.fillRect(k * 24, 0, 24, k + 2);
    x.drawImage(c, 0, k + 2);
};
const redSpiral = (t, frames) => {
    x.fillStyle = "white";
    x.fillRect(0, 0, 960, 540);
    let d;
    for (let i = 50; (i -= 0.5);) {
        x.beginPath();
        d = 2 * C((2 + S(t / 99)) * 2 * i);
        x.arc(480 + d * 10 * C(i) * i, 270 + d * 9 * S(i) * i, i, 0, 44 / 7);
        x.fillStyle = R(i * 5);
        x.fill();
    }
};
const fabric = (t, frames) => {
    let h = 20 + C(frames / 30) * 9;
    let b = ~~(h / 8);
    for (let i = 240; i--;) {
        x.fillStyle = `hsl(${(i ^ ~~(t * 60)) % 99},90%,${h}%)`;
        x.fillRect(4 * i, 0, 4, b);
    }
    x.drawImage(c, 1, b);
};
const shaderLike = (fillFunc) => {
    return (t, frames) => {
        for (let i = 960; i--;) {
            x.fillStyle = fillFunc(i, frames);
            x.fillRect(i, 0, 1, 1);
        }
        x.drawImage(c, 0, 1);
    };
};
const higherOrderWaves = (color) => shaderLike(color
    ? (x, y) => `hsl(${~~((x + y) / 20) * 100},50%,90%)`
    : (x, y) => R((256 / 4) * Math.round(2 + S(x / 20) + C(y / 30))));
const uncommonCheckerboard = shaderLike((x, y) => {
    y /= 60;
    return `hsl(${x / 9 + y * 9},40%,${9 + 60 * ~~((1 + C(y) + 4 * C(x / (99 + 20 * C(y / 5))) * S(y / 2)) % 2)}%)`;
});
const bitwiseGrid = () => shaderLike((x, y) => R((x & y) * 20));
const higherOrderGoo = (color) => {
    const colFunc = (i, ti) => 20 * ~~(1 + S(i / 20) + T(ti + S(ti + i / 99)));
    const fillFunc = color
        ? (i, ti) => `hsl(${i / 9 + 99 * C(ti)},90%,${colFunc(i, ti)}%`
        : (i, ti) => R(colFunc(i, ti));
    const goo = (t, frames) => {
        let ti = frames / 60;
        for (let i = 960; i--;) {
            x.fillStyle = fillFunc(i, ti);
            x.fillRect(i, 0, 1, 1);
        }
        x.drawImage(c, 0, 1);
    };
    return goo;
};
const vectorSpiral = (t, frames) => {
    x.fillStyle = "black";
    x.fillRect(0, 0, 960, 540);
    let d;
    x.lineWidth = 2;
    for (let i = 50; (i -= 0.5);) {
        x.beginPath();
        x.strokeStyle = `hsl(${i * 9},50%,50%)`;
        d = 2 * C((2 + S(t / 99)) * 2 * i);
        x.arc(480 + d * 10 * C(i) * i, 270 + d * 9 * S(i) * i, i, 0, 44 / 7);
        x.stroke();
    }
};
const pinkishHelix = (t, frames) => {
    x.fillStyle = "white";
    x.fillRect(0, 0, 960, 540);
    let i, j;
    for (i = 0; i < 960; i += 32) {
        x.fillStyle = R(((1 + C(i)) / 2) * 255, 0, 155);
        for (j = 0; j < 3; j++)
            x.fillRect(i + j, 266 + C(i + j + t) * 50, 32, 8);
    }
};
const movingGrid = (t, frames) => {
    let i, j, s;
    c.width |= 0;
    for (i = 940; (i -= 20);)
        for (j = 520; (j -= 20);)
            (x.fillStyle = R(6 *
                (s =
                    6 *
                        (4 + C(t * 6) + C((C(t) * i) / 99 + t) + S((S(t) * j) / 99 + t))), 0, s + i / 9)),
                x.fillRect(i, j, s, s);
};
const higherOrderPerspective = (color, normalized = true) => {
    const layerNum = 12;
    const fillFunc = color
        ? (i) => `hsl(${i * 99},50%,50%)`
        : (i) => R(255 * (normalized ? 1 / (1 + i) : i / layerNum));
    return (t, frames) => {
        x.fillStyle = !normalized ? R(255) : R(1, color, color);
        x.fillRect(0, 0, 960, 540);
        const d = (xp, yp, zp, w, h) => {
            x.fillRect(Math.round(480 + (xp - w / 2) / zp), Math.round(270 + (yp - h / 2) / zp), Math.round(w / zp), Math.round(h / zp));
            x.fill();
        };
        const offset = 200;
        const size = 64;
        const amplitude = 32;
        for (let i = layerNum; i > 0; i -= 0.5) {
            x.fillStyle = fillFunc(i);
            const span = 14;
            const spacing = 64;
            const f = (off) => {
                for (let j = 0; j < span; j++) {
                    d((j - span / 2) * spacing + spacing / 2, offset * off + amplitude * C(j + frames / 60), i, size * ((span - j) / span), size * ((j + 1) / span));
                }
            };
            f(-1);
            f(C(frames / 60));
            f(1);
        }
    };
};
const higherOrderDonuts = (color = true) => {
    const rFunc = (i, j) => 255 * ~~((1 + 3 * C(i / (99 + 20 * C(j / 5))) * S(j / 2)) % 2);
    const fillFunc = !color
        ? (i, j) => {
            let r = 255 - rFunc(i, j);
            return R(r, r, r);
        }
        : (i, j) => {
            let r = rFunc(i, j);
            return r > 0 ? R(r / 4) : R(0, 0, 99 * C(i / 10) * S(j / 2) + 30);
        };
    return (t, frames) => {
        if (!frames) {
            x.fillStyle = "black";
            x.fillRect(0, 0, 960, 540);
        }
        let j = frames / 60;
        for (let i = 960; i--; x.fillStyle = fillFunc(i, j))
            x.fillRect(i, 0, 1, 1);
        x.drawImage(c, 0, 1);
    };
};
const draws = {
    edgeblur: [redSpiral],
    bluramount: [movingGrid],
    bluramountnamed: [movingGrid],
    vectordisplay: [vectorSpiral],
    singlepassgrain: [pinkishHelix],
    redonly: [stripes],
    redzero: [stripes],
    redgreenswap: [movingGrid],
    huerotate: [fabric],
    timehuerotate: [uncommonCheckerboard],
    scanlines: [pinkishHelix],
    fxaa: [higherOrderGoo(true)],
    channelblur: [higherOrderGoo(true), higherOrderGoo(false)],
    channeleyesore: [
        higherOrderWaves(true),
        higherOrderWaves(false),
        bitwiseGrid(),
    ],
    basicdof: [higherOrderPerspective(true), higherOrderPerspective(false)],
    lineardof: [
        higherOrderPerspective(true),
        higherOrderPerspective(false, false),
    ],
    lightbands: [higherOrderPerspective(true), higherOrderPerspective(false)],
    depthgodrays: [higherOrderPerspective(true), higherOrderPerspective(false)],
    mousegodrays: [higherOrderDonuts(true), higherOrderDonuts(false)],
    mitosis: [uncommonCheckerboard],
};
const notes = {
    edgeblur: "the blur radius is a function of distance from the center coordinate." +
        "this makes the image appear more in focus only around the center",
    basicdof: "the blue rectangles should be most in focus. you can adjust with the controls " +
        "in the corner",
    lineardof: "by default, <code>dof</code> assumes that the image with your depth buffer info is " +
        "stored in channel 0, and that the red channel is normalized so that 1 is right " +
        "on top of the camera lense, and 0 is all the way at infinity. this example " +
        "shows how you might transform a depth buffer that stores the absolute depth " +
        "into the form that <code>dof</code> interprets",
    channeleyesore: "despite this demo offering very little in the way of aesthetic value, it " +
        "demonstrates how you can optionally pass a list of images (which can " +
        "be canvases or videos) into the merger constructor and sample from them",
    fxaa: "fxaa stands for fast approximate anti-aliasing. amazingly, it only needs " +
        "the scene buffer info. it's not perfect, but it does the job in many cases. you " +
        "can see how it eliminates jaggies by looking at the unprocessed image",
    scanlines: "you can use trigonometric functions and exponents to create masks " +
        "with interesting shapes",
    huerotate: "you can use <code>rgb2hsv</code> and <code>hsv2rgb</code> and " +
        "<code>changecomp</code> to change the hue, saturation or value of a color",
    timehuerotate: "<code>time</code> will insert the time uniform into the generated code." +
        "update time by passing in the current time to <code>merger.draw</code> in " +
        "your draw loop",
    redgreenswap: "you change only a few components of a vector in line with " +
        "<code>get2comp</code>. using this in conjunction with <code>change2comp</code> " +
        'you can sort of <a href="https://en.wikipedia.org/wiki/Swizzling_(computer_graphics)">swizzle</a>',
    singlepassgrain: "even though a vertical blur is used, only one pass is needed here." +
        "because of this, only one shader pass is generated (check the console) since " +
        "since the additional grain effect can run directly afterwards in the same shader",
    bluramount: "even though the blur effect is split up among multiple shaders, you update " +
        "a uniform in both shaders by changing only a single mutable. " +
        "the float expression <code>fl</code> gets passed in as both the " +
        "horizontal and vertical radii of <code>blur2dloop</code>. <code>fl</code> " +
        "contains a mutable primitive float which we can change with <code>fl.setVal</code>. " +
        "(also, because the same expression can appear in the effect tree multiple " +
        "times, and expressions can contain expressions, you can make reference loops, " +
        "so don't do that)",
    bluramountnamed: "instead of using member functions on an expression to change a mutable value, you can " +
        'give a mutable in an expression a custom name with <code>fl = MP.float(MP.mut(1, "uCustomName"))</code> ' +
        'and do <code>fl.setUniform("uCustomName", 1.0)</code> ' +
        "instead of <code>fl.setVal(1.0)</code>. honestly, the latter is easier but you have " +
        "the option! and, giving a mutable a custom name does not prevent you from using " +
        "<code>setVal</code>",
    vectordisplay: "this glowing vector effect is created by repeatedly bluring and increasing the " +
        "contrast of the original scene. then the fragment color of the original " +
        "scene (accessed with <code>input</code>) is added on top of the blurred " +
        "image",
    channelblur: "you can use <code>gauss</code> on an extra channel instead of " +
        "the scene channel by passing in an optional argument",
    lightbands: "even though the value in the depth buffer is actually 1 / (1 + depth), we can " +
        "calculate the true depth value with <code>truedepth</code>. with this, we can colorize" +
        "bands of depth in our scene all the way out to infinity",
    depthgodrays: "<code>godrays</code> can also be made to read depth buffer info " +
        "instead of an occlusion buffer. as the final argument, you must specify an " +
        "object that has a <code>threshold</code> " +
        "(all depth values lower than this are not occluded) and a <code>newColor</code> " +
        "which denotes what color the shining light should be",
    mousegodrays: "the <code>godrays</code> effect requires an occlusion buffer. black pixels denote the silhouette " +
        "of the geometry and the white (or any color) pixels denote the light shining behind. " +
        "move the mouse around to change the light position of the light source! you can get the mouse " +
        "position with <code>MP.mouse()</code> and the resolution with <code>MP.resolution()</code>. " +
        "if you are using mouse input, pass the x and y position (in pixels) of the mouse in as the " +
        "second and third arguments like this: <code>merger.draw(time, mouseX, mouseY)</code>.",
    mitosis: "if you sample the original scene at some offset of the pixel coordinate, you can distort " +
        "the original scene. (fxaa is used here just because we can)",
};
const canvases = [sourceCanvas];
const contexts = [source];
window.addEventListener("load", () => {
    var _a, _b;
    let mstr = getVariable("m");
    let dstr = getVariable("d");
    if (mstr === undefined || demos[mstr] === undefined)
        mstr = "edgeblur"; // default demo
    if (dstr === undefined || draws[dstr] === undefined)
        dstr = mstr; // pair with merger
    const draw = draws[dstr];
    if (draw === undefined)
        throw new Error("draw not found");
    const note = notes[mstr];
    if (note !== undefined) {
        const div = document.getElementById("note");
        const title = document.createElement("h2");
        const p = document.createElement("p");
        title.innerText = "note";
        p.innerHTML = note;
        if (div === null)
            throw new Error("notes div was undefined");
        div.appendChild(title);
        div.appendChild(p);
    }
    // minus 1 because we already included the source canvas and context
    for (let i = 0; i < draw.length - 1; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = 960;
        canvas.height = 540;
        const context = canvas.getContext("2d");
        if (context === null) {
            throw new Error("couldn't get the context of the canvas");
        }
        canvases.push(canvas);
        contexts.push(context);
        const header = document.createElement("h3");
        header.innerText = "channel " + i;
        (_a = document.getElementById("buffers")) === null || _a === void 0 ? void 0 : _a.appendChild(header);
        (_b = document.getElementById("buffers")) === null || _b === void 0 ? void 0 : _b.appendChild(canvas);
    }
    const demo = demos[mstr](canvases.slice(1));
    if (demo === undefined)
        throw new Error("merger not found");
    document.getElementById("title").innerText =
        "merge-pass demo: " + mstr;
    // unindent code string
    let codeStr = (" ".repeat(4) + demos[mstr])
        .split("\n")
        .map((l) => l.substr(4))
        .join("\n")
        .replace(/ /g, "&nbsp;");
    const codeElem = document.getElementById("mergercode");
    const reg = /Merger\(\[[\s\S]+\]/g;
    const matches = codeStr.match(reg);
    if (matches === null)
        throw new Error("matches was null");
    codeElem.innerHTML = codeStr.replace(reg, "<em>" + matches[0] + "</em>");
    // add links
    const demoNames = Object.keys(demos);
    const urls = demoNames.map((d) => window.location.href.split("?")[0] + "?m=" + d);
    document.getElementById("link").href =
        urls[Math.floor(Math.random() * urls.length)];
    const p = document.getElementById("demos");
    let counter = 0;
    for (const u of urls) {
        const demoLink = document.createElement("a");
        demoLink.href = u;
        demoLink.innerText = demoNames[counter];
        p.appendChild(demoLink);
        p.innerHTML += " ";
        counter++;
    }
    let frame = 0;
    const step = (t = 0) => {
        let counter = 0;
        for (const d of draw) {
            c = canvases[counter];
            x = contexts[counter];
            d(t / 1000, frame);
            counter++;
        }
        demo.change(demo.merger, t, frame);
        demo.merger.draw(t / 1000, mousePos.x, mousePos.y);
        requestAnimationFrame(step);
        frame++;
    };
    step(0);
});
glCanvas.addEventListener("click", () => glCanvas.requestFullscreen());
glCanvas.addEventListener("mousemove", (e) => {
    const rect = glCanvas.getBoundingClientRect();
    mousePos.x = (960 * (e.clientX - rect.left)) / rect.width;
    mousePos.y = (540 * (rect.height - (e.clientY - rect.top))) / rect.height;
});
sourceCanvas.addEventListener("click", () => sourceCanvas.requestFullscreen());

},{"./index":37,"dat.gui":40}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a1 = exports.Arity1HomogenousExpr = void 0;
const expr_1 = require("./expr");
function genArity1SourceList(name, val) {
    return {
        sections: [name + "(", ")"],
        values: [val],
    };
}
class Arity1HomogenousExpr extends expr_1.Operator {
    constructor(val, operation) {
        super(val, genArity1SourceList(operation, val), ["uVal"]);
        this.val = val;
    }
    setVal(val) {
        this.setUniform("uVal" + this.id, val);
        // TODO way to get rid of this cast?
        this.val = expr_1.wrapInValue(val);
    }
}
exports.Arity1HomogenousExpr = Arity1HomogenousExpr;
function a1(name, val) {
    return new Arity1HomogenousExpr(expr_1.wrapInValue(val), name);
}
exports.a1 = a1;

},{"./expr":13}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a2 = exports.Arity2HomogenousExpr = void 0;
const expr_1 = require("./expr");
function genArity1SourceList(name, val1, val2) {
    return {
        sections: [name + "(", ",", ")"],
        values: [val1, val2],
    };
}
class Arity2HomogenousExpr extends expr_1.Operator {
    constructor(name, val1, val2) {
        super(val1, genArity1SourceList(name, val1, val2), ["uVal1", "uVal2"]);
        this.val1 = val1;
        this.val2 = val2;
    }
    setFirstVal(val1) {
        this.setUniform("uVal1" + this.id, val1);
        // TODO get rid of this cast
        this.val1 = expr_1.wrapInValue(val1);
    }
    setSecondVal(val2) {
        this.setUniform("uVal2" + this.id, val2);
        // TODO get rid of this cast
        this.val2 = expr_1.wrapInValue(val2);
    }
}
exports.Arity2HomogenousExpr = Arity2HomogenousExpr;
// implementation
function a2(name, val1, val2) {
    return new Arity2HomogenousExpr(name, expr_1.wrapInValue(val1), expr_1.wrapInValue(val2));
}
exports.a2 = a2;

},{"./expr":13}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur2d = exports.Blur2dLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
class Blur2dLoop extends mergepass_1.EffectLoop {
    constructor(horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), reps = 2, taps) {
        const side = blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps);
        super([side, up], { num: reps });
        this.horizontal = horizontal;
        this.vertical = vertical;
    }
    setHorizontal(float) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(float);
    }
    setVertical(float) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(float);
    }
}
exports.Blur2dLoop = Blur2dLoop;
function blur2d(horizontalExpr, verticalExpr, reps, taps) {
    return new Blur2dLoop(expr_1.n2e(horizontalExpr), expr_1.n2e(verticalExpr), reps, taps);
}
exports.blur2d = blur2d;

},{"../mergepass":38,"./blurexpr":6,"./expr":13,"./vecexprs":34}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gauss = exports.BlurExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
function genBlurSource(direction, taps, buffer) {
    return {
        sections: [`gauss${taps}${buffer === undefined ? "" : "_" + buffer}(`, ")"],
        values: [direction],
    };
}
function tapsToFuncSource(taps) {
    switch (taps) {
        case 5:
            return glslfunctions_1.glslFuncs.gauss5;
        case 9:
            return glslfunctions_1.glslFuncs.gauss9;
        case 13:
            return glslfunctions_1.glslFuncs.gauss13;
    }
}
class BlurExpr extends expr_1.ExprVec4 {
    constructor(direction, taps = 5, samplerNum) {
        // this is already guaranteed by typescript, but creates helpful error for
        // use in gibber
        if (![5, 9, 13].includes(taps)) {
            throw new Error("taps for gauss blur can only be 5, 9 or 13");
        }
        super(genBlurSource(direction, taps, samplerNum), ["uDirection"]);
        this.direction = direction;
        if (samplerNum === undefined) {
            this.needs.neighborSample = true;
            this.externalFuncs = [tapsToFuncSource(taps)];
        }
        else {
            this.needs.extraBuffers = new Set([samplerNum]);
            console.log("taps", taps);
            console.log("samplerNum", samplerNum);
            this.externalFuncs = [
                glslfunctions_1.replaceSampler(tapsToFuncSource(taps), /vec4\sgauss[0-9]+/g, samplerNum),
            ];
        }
    }
    setDirection(direction) {
        this.setUniform("uDirection" + this.id, direction);
        this.direction = direction;
    }
}
exports.BlurExpr = BlurExpr;
function gauss(direction, taps = 5, samplerNum) {
    return new BlurExpr(direction, taps, samplerNum);
}
exports.gauss = gauss;

},{"../glslfunctions":36,"./expr":13}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brightness = exports.Brightness = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
class Brightness extends expr_1.ExprVec4 {
    constructor(brightness, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `(brightness(${brightness}, ${col}))`, ["uBrightness", "uColor"]);
        this.brightness = brightness;
        this.externalFuncs = [glslfunctions_1.glslFuncs.brightness];
    }
    setBrightness(brightness) {
        this.setUniform("uBrightness" + this.id, brightness);
        this.brightness = expr_1.n2e(brightness);
    }
}
exports.Brightness = Brightness;
function brightness(val, col) {
    return new Brightness(expr_1.n2e(val), col);
}
exports.brightness = brightness;

},{"../glslfunctions":36,"./expr":13,"./fragcolorexpr":14}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channel = exports.BufferSampleExpr = void 0;
const codebuilder_1 = require("../codebuilder");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
function genBufferSamplerSource(buf, coord) {
    return {
        sections: [`texture2D(${codebuilder_1.bufferSamplerName(buf)}, `, `)`],
        values: [coord],
    };
}
class BufferSampleExpr extends expr_1.ExprVec4 {
    constructor(buf, coord = normfragcoordexpr_1.nfcoord()) {
        super(genBufferSamplerSource(buf, coord), ["uVec"]);
        this.coord = coord;
        this.needs.extraBuffers = new Set([buf]);
    }
    setCoord(coord) {
        this.setUniform("uVec", coord);
        this.coord = coord;
    }
}
exports.BufferSampleExpr = BufferSampleExpr;
function channel(channel, vec) {
    return new BufferSampleExpr(channel, vec);
}
exports.channel = channel;

},{"../codebuilder":1,"./expr":13,"./normfragcoordexpr":24}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changecomp = exports.ChangeCompExpr = void 0;
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
function getChangeFunc(typ, id, setter, comps, op = "") {
    return `${typ} changecomp_${id}(${typ} col, ${setter.typeString()} setter) {
  col.${comps} ${op}= setter;
  return col;
}`;
}
function checkGetComponents(comps, setter, vec) {
    // setter has different length than components
    if (comps.length !== getcompexpr_1.typeStringToLength(setter.typeString())) {
        throw new Error("components length must be equal to the target float/vec");
    }
    // duplicate components
    if (duplicateComponents(comps)) {
        throw new Error("duplicate components not allowed on left side");
    }
    // legal components
    getcompexpr_1.checkLegalComponents(comps, vec);
}
function duplicateComponents(comps) {
    return new Set(comps.split("")).size !== comps.length;
}
class ChangeCompExpr extends expr_1.Operator {
    constructor(vec, setter, comps, op) {
        checkGetComponents(comps, setter, vec);
        // part of name of custom function
        const suffix = `${vec.typeString()}_${setter.typeString()}_${comps}`;
        super(vec, { sections: [`changecomp_${suffix}(`, ", ", ")"], values: [vec, setter] }, ["uOriginal", "uNew"]);
        this.originalVec = vec;
        this.newVal = setter;
        this.externalFuncs = [
            getChangeFunc(vec.typeString(), suffix, setter, comps, op),
        ];
    }
    setOriginal(originalVec) {
        this.setUniform("uOriginal" + this.id, originalVec);
        this.originalVec = originalVec;
    }
    setNew(newVal) {
        this.setUniform("uNew" + this.id, newVal);
        // TODO way to get rid of this cast?
        this.newVal = expr_1.wrapInValue(newVal);
    }
}
exports.ChangeCompExpr = ChangeCompExpr;
function changecomp(vec, setter, comps, op) {
    return new ChangeCompExpr(vec, expr_1.wrapInValue(setter), comps, op);
}
exports.changecomp = changecomp;

},{"./expr":13,"./getcompexpr":17}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contrast = exports.Contrast = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
class Contrast extends expr_1.ExprVec4 {
    constructor(contrast, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `contrast(${contrast}, ${col})`, ["uVal", "uCol"]);
        this.contrast = contrast;
        this.externalFuncs = [glslfunctions_1.glslFuncs.contrast];
    }
    setContrast(contrast) {
        this.setUniform("uContrast" + this.id, contrast);
        this.contrast = contrast;
    }
}
exports.Contrast = Contrast;
function contrast(val, col) {
    return new Contrast(expr_1.n2e(val), col);
}
exports.contrast = contrast;

},{"../glslfunctions":36,"./expr":13,"./fragcolorexpr":14}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depth2occlusion = exports.DepthToOcclusionExpr = void 0;
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
const buffersampleexpr_1 = require("./buffersampleexpr");
// TODO reconsider whether we need this
class DepthToOcclusionExpr extends expr_1.ExprVec4 {
    constructor(depthCol = buffersampleexpr_1.channel(0), newCol = vecexprs_1.vec4(1, 1, 1, 1), threshold = expr_1.float(0.01)) {
        super(expr_1.tag `depth2occlusion(${depthCol}, ${newCol}, ${threshold})`, [
            "uDepth",
            "uNewCol",
            "uThreshold",
        ]);
    }
}
exports.DepthToOcclusionExpr = DepthToOcclusionExpr;
function depth2occlusion(depthCol, newCol, threshold) {
    return new DepthToOcclusionExpr(depthCol, newCol, expr_1.n2e(threshold));
}
exports.depth2occlusion = depth2occlusion;

},{"./buffersampleexpr":8,"./expr":13,"./vecexprs":34}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dof = exports.DoFLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const buffersampleexpr_1 = require("./buffersampleexpr");
const expr_1 = require("./expr");
const gaussianexpr_1 = require("./gaussianexpr");
const getcompexpr_1 = require("./getcompexpr");
const opexpr_1 = require("./opexpr");
const arity2_1 = require("./arity2");
const vecexprs_1 = require("./vecexprs");
class DoFLoop extends mergepass_1.EffectLoop {
    constructor(focus = expr_1.mut(expr_1.pfloat(0.3)), rad = expr_1.mut(expr_1.pfloat(0.01)), depth = getcompexpr_1.getcomp(buffersampleexpr_1.channel(0), "r"), reps = 2) {
        let guassianExpr = gaussianexpr_1.gaussian(depth, focus, rad);
        // TODO optional taps number
        const side = blurexpr_1.gauss(vecexprs_1.vec2(arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4), 0), 13);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4)), 13);
        super([side, up], { num: reps });
        this.gaussian = guassianExpr;
    }
    setDepth(depth) {
        // this translates the gaussian curve to the side
        this.gaussian.setA(depth);
    }
    setRadius(radius) {
        // this scales the gaussian curve to focus on a larger band of depth
        this.gaussian.setB(radius);
    }
}
exports.DoFLoop = DoFLoop;
function dof(focus, rad, depth, reps) {
    return new DoFLoop(expr_1.n2e(focus), expr_1.n2e(rad), expr_1.n2e(depth), reps);
}
exports.dof = dof;

},{"../mergepass":38,"./arity2":4,"./blurexpr":6,"./buffersampleexpr":8,"./expr":13,"./gaussianexpr":16,"./getcompexpr":17,"./opexpr":25,"./vecexprs":34}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tag = exports.wrapInValue = exports.pfloat = exports.n2p = exports.n2e = exports.Operator = exports.ExprVec4 = exports.ExprVec3 = exports.ExprVec2 = exports.float = exports.ExprFloat = exports.BasicFloat = exports.ExprVec = exports.BasicVec4 = exports.BasicVec3 = exports.BasicVec2 = exports.BasicVec = exports.PrimitiveVec4 = exports.PrimitiveVec3 = exports.PrimitiveVec2 = exports.PrimitiveVec = exports.PrimitiveFloat = exports.Primitive = exports.mut = exports.Mutable = exports.Expr = void 0;
const mergepass_1 = require("../mergepass");
const webglprogramloop_1 = require("../webglprogramloop");
function toGLSLFloatString(num) {
    let str = "" + num;
    if (!str.includes("."))
        str += ".";
    return str;
}
class Expr {
    constructor(sourceLists, defaultNames) {
        this.needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            extraBuffers: new Set(),
        };
        this.uniformValChangeMap = {};
        this.defaultNameMap = {};
        this.externalFuncs = [];
        this.sourceCode = "";
        this.id = "_id_" + Expr.count;
        Expr.count++;
        if (sourceLists.sections.length - sourceLists.values.length !== 1) {
            // this cannot happen if you use `tag` to destructure a template string
            throw new Error("wrong lengths for source and values");
        }
        if (sourceLists.values.length !== defaultNames.length) {
            throw new Error("default names list length doesn't match values list length");
        }
        this.sourceLists = sourceLists;
        this.defaultNames = defaultNames;
    }
    applyUniforms(gl, uniformLocs) {
        for (const name in this.uniformValChangeMap) {
            const loc = uniformLocs[name];
            if (this.uniformValChangeMap[name].changed) {
                //this.uniformValChangeMap[name].changed = false;
                this.uniformValChangeMap[name].val.applyUniform(gl, loc.locs[loc.counter]);
            }
            // increment and reset the counter to wrap back around to first location
            loc.counter++;
            loc.counter %= loc.locs.length;
            // once we have wrapped then we know all uniforms have been changed
            if (loc.counter === 0) {
                this.uniformValChangeMap[name].changed = false;
            }
        }
    }
    getSampleNum(mult = 1) {
        return this.needs.neighborSample ? mult : 0;
    }
    setUniform(name, newVal) {
        var _a, _b;
        newVal = wrapInValue(newVal);
        const originalName = name;
        if (typeof newVal === "number") {
            newVal = n2p(newVal);
        }
        if (!(newVal instanceof Primitive)) {
            throw new Error("cannot set a non-primitive");
        }
        // if name does not exist, try mapping default name to new name
        if (((_a = this.uniformValChangeMap[name]) === null || _a === void 0 ? void 0 : _a.val) === undefined) {
            name = this.defaultNameMap[name];
        }
        const oldVal = (_b = this.uniformValChangeMap[name]) === null || _b === void 0 ? void 0 : _b.val;
        if (oldVal === undefined) {
            throw new Error("tried to set uniform " +
                name +
                " which doesn't exist. original name: " +
                originalName);
        }
        if (oldVal.typeString() !== newVal.typeString()) {
            throw new Error("tried to set uniform " + name + " to a new type");
        }
        this.uniformValChangeMap[name].val = newVal;
        this.uniformValChangeMap[name].changed = true;
    }
    /** parses this expression into a string, adding info as it recurses */
    parse(buildInfo) {
        this.sourceCode = "";
        buildInfo.exprs.push(this);
        buildInfo.needs = webglprogramloop_1.updateNeeds(buildInfo.needs, this.needs);
        // add each of the external funcs to the builder
        this.externalFuncs.forEach((func) => buildInfo.externalFuncs.add(func));
        // put all of the values between all of the source sections
        for (let i = 0; i < this.sourceLists.values.length; i++) {
            this.sourceCode +=
                this.sourceLists.sections[i] +
                    this.sourceLists.values[i].parse(buildInfo, this.defaultNames[i], this);
        }
        // TODO does sourceCode have to be a member?
        this.sourceCode += this.sourceLists.sections[this.sourceLists.sections.length - 1];
        return this.sourceCode;
    }
}
exports.Expr = Expr;
Expr.count = 0;
class Mutable {
    constructor(primitive, name) {
        this.primitive = primitive;
        this.name = name;
    }
    parse(buildInfo, defaultName, enc) {
        if (enc === undefined) {
            throw new Error("tried to put a mutable expression at the top level");
        }
        // accept the default name if given no name
        if (this.name === undefined)
            this.name = defaultName + enc.id;
        // set to true so they are set to their default values on first draw
        buildInfo.uniformTypes[this.name] = this.primitive.typeString();
        // add the name mapping
        enc.uniformValChangeMap[this.name] = {
            val: this.primitive,
            changed: true,
        };
        // add the new type to the map
        enc.defaultNameMap[defaultName + enc.id] = this.name;
        return this.name;
    }
    applyUniform(gl, loc) {
        this.primitive.applyUniform(gl, loc);
    }
    typeString() {
        return this.primitive.typeString();
    }
}
exports.Mutable = Mutable;
function mut(val, name) {
    const primitive = typeof val === "number" ? n2p(val) : val;
    return new Mutable(primitive, name);
}
exports.mut = mut;
class Primitive {
    parse(buildInfo, defaultName, enc) {
        return this.toString();
    }
}
exports.Primitive = Primitive;
class PrimitiveFloat extends Primitive {
    constructor(num) {
        if (!isFinite(num))
            throw new Error("number not finite");
        super();
        this.value = num;
    }
    toString() {
        let str = "" + this.value;
        if (!str.includes("."))
            str += ".";
        return str;
    }
    typeString() {
        return "float";
    }
    applyUniform(gl, loc) {
        gl.uniform1f(loc, this.value);
    }
}
exports.PrimitiveFloat = PrimitiveFloat;
class PrimitiveVec extends Primitive {
    constructor(comps) {
        super();
        this.values = comps;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    toString() {
        return `${this.typeString}(${this.values
            .map((n) => toGLSLFloatString(n))
            .join(", ")})`;
    }
}
exports.PrimitiveVec = PrimitiveVec;
class PrimitiveVec2 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform2f(loc, this.values[0], this.values[1]);
    }
}
exports.PrimitiveVec2 = PrimitiveVec2;
class PrimitiveVec3 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform3f(loc, this.values[0], this.values[1], this.values[2]);
    }
}
exports.PrimitiveVec3 = PrimitiveVec3;
class PrimitiveVec4 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform4f(loc, this.values[0], this.values[1], this.values[2], this.values[3]);
    }
}
exports.PrimitiveVec4 = PrimitiveVec4;
class BasicVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        // this cast is fine as long as you only instantiate these with the
        // shorthand version
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    setComp(index, primitive) {
        if (index < 0 || index >= this.values.length) {
            throw new Error("out of bounds of setting component");
        }
        this.setUniform(this.defaultNames[index] + this.id, n2p(primitive));
    }
}
exports.BasicVec = BasicVec;
class BasicVec2 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec2 = undefined; // brand for nominal typing
    }
}
exports.BasicVec2 = BasicVec2;
class BasicVec3 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec3 = undefined; // brand for nominal typing
    }
}
exports.BasicVec3 = BasicVec3;
class BasicVec4 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec4 = undefined; // brand for nominal typing
    }
}
exports.BasicVec4 = BasicVec4;
class ExprVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
}
exports.ExprVec = ExprVec;
class BasicFloat extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.float = undefined; // brand for nominal typing
    }
    setVal(primitive) {
        this.setUniform("uFloat" + this.id, n2p(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.BasicFloat = BasicFloat;
class ExprFloat extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.float = undefined; // brand for nominal typing
    }
    setVal(primitive) {
        this.setUniform("uFloat" + this.id, n2p(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.ExprFloat = ExprFloat;
function float(value) {
    if (typeof value === "number")
        value = n2p(value);
    return new BasicFloat({ sections: ["", ""], values: [value] }, ["uFloat"]);
}
exports.float = float;
class ExprVec2 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec2 = undefined; // brand for nominal typing
    }
    typeString() {
        return "vec2";
    }
}
exports.ExprVec2 = ExprVec2;
class ExprVec3 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec3 = undefined; // brand for nominal typing
    }
    typeString() {
        return "vec3";
    }
}
exports.ExprVec3 = ExprVec3;
class ExprVec4 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec4 = undefined; // brand for nominal typing
    }
    repeat(num) {
        return new mergepass_1.EffectLoop([this], { num: num });
    }
    genPrograms(gl, vShader, uniformLocs) {
        return new mergepass_1.EffectLoop([this], { num: 1 }).genPrograms(gl, vShader, uniformLocs);
    }
    typeString() {
        return "vec4";
    }
}
exports.ExprVec4 = ExprVec4;
class Operator extends Expr {
    constructor(ret, sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.ret = ret;
    }
    typeString() {
        return this.ret.typeString();
    }
}
exports.Operator = Operator;
function n2e(num) {
    if (num === undefined)
        return undefined;
    if (num instanceof PrimitiveFloat ||
        num instanceof ExprFloat ||
        num instanceof Operator ||
        num instanceof Mutable ||
        num instanceof BasicFloat)
        return num;
    return new PrimitiveFloat(num);
}
exports.n2e = n2e;
/** number to primitive float */
function n2p(num) {
    if (num instanceof PrimitiveFloat)
        return num;
    return new PrimitiveFloat(num);
}
exports.n2p = n2p;
function pfloat(num) {
    return new PrimitiveFloat(num);
}
exports.pfloat = pfloat;
function wrapInValue(num) {
    if (typeof num === "number")
        return pfloat(num);
    return num;
}
exports.wrapInValue = wrapInValue;
function tag(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.tag = tag;

},{"../mergepass":38,"../webglprogramloop":39}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fcolor = exports.FragColorExpr = void 0;
const expr_1 = require("./expr");
class FragColorExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `gl_FragColor`, []);
        this.needs.centerSample = true;
    }
}
exports.FragColorExpr = FragColorExpr;
function fcolor() {
    return new FragColorExpr();
}
exports.fcolor = fcolor;

},{"./expr":13}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fxaa = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
class FXAAExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `fxaa()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.fxaa];
        this.needs.neighborSample = true;
    }
}
function fxaa() {
    return new FXAAExpr();
}
exports.fxaa = fxaa;

},{"../glslfunctions":36,"./expr":13}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaussian = exports.GaussianExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
class GaussianExpr extends expr_1.ExprFloat {
    constructor(x, a, b) {
        super(expr_1.tag `gaussian(${x}, ${a}, ${b})`, ["uFloatX", "uFloatA", "uFloatB"]);
        this.x = x;
        this.a = a;
        this.b = b;
        this.externalFuncs = [glslfunctions_1.glslFuncs.gaussian];
    }
    setX(x) {
        this.setUniform("uFloatX" + this.id, x);
        this.x = expr_1.n2e(x);
    }
    setA(a) {
        this.setUniform("uFloatA" + this.id, a);
        this.a = expr_1.n2e(a);
    }
    setB(b) {
        this.setUniform("uFloatB" + this.id, b);
        this.b = expr_1.n2e(b);
    }
}
exports.GaussianExpr = GaussianExpr;
function gaussian(x, a = 0, b = 1) {
    return new GaussianExpr(expr_1.n2e(x), expr_1.n2e(a), expr_1.n2e(b));
}
exports.gaussian = gaussian;

},{"../glslfunctions":36,"./expr":13}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get4comp = exports.get3comp = exports.get2comp = exports.getcomp = exports.Get4CompExpr = exports.Get3CompExpr = exports.Get2CompExpr = exports.GetCompExpr = exports.checkLegalComponents = exports.typeStringToLength = void 0;
const expr_1 = require("./expr");
// TODO this should probably be somewhere else
function typeStringToLength(str) {
    switch (str) {
        case "float":
            return 1;
        case "vec2":
            return 2;
        case "vec3":
            return 3;
        case "vec4":
            return 4;
    }
}
exports.typeStringToLength = typeStringToLength;
function genCompSource(vec, components) {
    return {
        sections: ["", "." + components],
        values: [vec],
    };
}
function checkLegalComponents(comps, vec) {
    const check = (range, domain) => {
        let inside = 0;
        let outside = 0;
        for (const c of range) {
            domain.includes(c) ? inside++ : outside++;
        }
        return inside === inside && !outside;
    };
    const inLen = typeStringToLength(vec.typeString());
    const rgbaCheck = check(comps, "rgba".substr(0, inLen));
    const xyzwCheck = check(comps, "xyzw".substr(0, inLen));
    const stpqCheck = check(comps, "stpq".substr(0, inLen));
    if (!(rgbaCheck || xyzwCheck || stpqCheck)) {
        throw new Error("component sets are mixed or incorrect entirely");
    }
}
exports.checkLegalComponents = checkLegalComponents;
function checkGetComponents(comps, outLen, vec) {
    if (comps.length > outLen)
        throw new Error("too many components");
    checkLegalComponents(comps, vec);
}
class GetCompExpr extends expr_1.ExprFloat {
    constructor(vec, comps) {
        checkGetComponents(comps, 1, vec);
        super(genCompSource(vec, comps), ["uVec1Min"]);
        this.vec1Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec1Min", vec);
        this.vec1Min = vec;
    }
}
exports.GetCompExpr = GetCompExpr;
class Get2CompExpr extends expr_1.ExprVec2 {
    constructor(vec, comps) {
        checkGetComponents(comps, 2, vec);
        super(genCompSource(vec, comps), ["uVec2Min"]);
        this.vec2Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec2Min", vec);
        this.vec2Min = vec;
    }
}
exports.Get2CompExpr = Get2CompExpr;
class Get3CompExpr extends expr_1.ExprVec3 {
    constructor(vec, comps) {
        checkGetComponents(comps, 3, vec);
        super(genCompSource(vec, comps), ["uVec3Min"]);
        this.vec3Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec3Min", vec);
        this.vec3Min = vec;
    }
}
exports.Get3CompExpr = Get3CompExpr;
class Get4CompExpr extends expr_1.ExprVec4 {
    constructor(vec, comps) {
        checkGetComponents(comps, 4, vec);
        super(genCompSource(vec, comps), ["uVec4Min"]);
        this.vec4Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec4Min", vec);
        this.vec4Min = vec;
    }
}
exports.Get4CompExpr = Get4CompExpr;
function getcomp(vec, comps) {
    return new GetCompExpr(vec, comps);
}
exports.getcomp = getcomp;
function get2comp(vec, comps) {
    return new Get2CompExpr(vec, comps);
}
exports.get2comp = get2comp;
function get3comp(vec, comps) {
    return new Get3CompExpr(vec, comps);
}
exports.get3comp = get3comp;
function get4comp(vec, comps) {
    return new Get4CompExpr(vec, comps);
}
exports.get4comp = get4comp;

},{"./expr":13}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.godrays = exports.GodRaysExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const vecexprs_1 = require("./vecexprs");
class GodRaysExpr extends expr_1.ExprVec4 {
    constructor(col = fragcolorexpr_1.fcolor(), exposure = expr_1.mut(1.0), decay = expr_1.mut(1.0), density = expr_1.mut(1.0), weight = expr_1.mut(0.01), lightPos = expr_1.mut(vecexprs_1.pvec2(0.5, 0.5)), samplerNum = 0, convertDepth) {
        // TODO the metaprogramming here is not so good!
        // leaving off the function call section for now
        const sourceLists = expr_1.tag `${col}, ${exposure}, ${decay}, ${density}, ${weight}, ${lightPos}, ${convertDepth !== undefined ? convertDepth.threshold : expr_1.float(0)}, ${convertDepth !== undefined ? convertDepth.newColor : vecexprs_1.vec4(0, 0, 0, 0)})`;
        // append the _<num> onto the function name
        // also add _depth if this is a version of the function that uses depth buffer
        sourceLists.sections[0] += `godrays_${samplerNum}${convertDepth !== undefined ? "_depth" : ""}(`;
        super(sourceLists, [
            "uCol",
            "uExposure",
            "uDecay",
            "uDensity",
            "uWeight",
            "uLightPos",
            "uThreshold",
            "uNewColor",
        ]);
        this.col = col;
        this.exposure = exposure;
        this.decay = decay;
        this.density = density;
        this.weight = weight;
        this.lightPos = lightPos;
        this.threshold = convertDepth === null || convertDepth === void 0 ? void 0 : convertDepth.threshold;
        this.newColor = convertDepth === null || convertDepth === void 0 ? void 0 : convertDepth.newColor;
        let customGodRayFunc = glslfunctions_1.replaceSampler(glslfunctions_1.glslFuncs.godrays, /vec4\sgodrays/g, samplerNum, convertDepth === undefined ? undefined : "_depth");
        if (convertDepth !== undefined) {
            // uncomment the line that does the conversion
            customGodRayFunc = customGodRayFunc.replace(/\/\/uncomment\s/g, "");
            this.externalFuncs.push(glslfunctions_1.glslFuncs.depth2occlusion);
        }
        this.externalFuncs.push(customGodRayFunc);
        this.needs.extraBuffers = new Set([0]);
    }
    setColor(color) {
        this.setUniform("uCol" + this.id, color);
        this.col = color;
    }
    setExposure(exposure) {
        this.setUniform("uExposure" + this.id, exposure);
        this.exposure = expr_1.n2e(exposure);
    }
    setDecay(decay) {
        this.setUniform("uDecay" + this.id, decay);
        this.decay = expr_1.n2e(decay);
    }
    setDensity(density) {
        this.setUniform("uDensity" + this.id, density);
        this.density = expr_1.n2e(density);
    }
    setWeight(weight) {
        this.setUniform("uWeight" + this.id, weight);
        this.weight = expr_1.n2e(weight);
    }
    setLightPos(lightPos) {
        this.setUniform("uLightPos" + this.id, lightPos);
        this.lightPos = lightPos;
    }
    // these only matter when you're using a depth buffer and not an occlusion
    // buffer (although right now, you'll still be able to set them)
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.n2e(threshold);
    }
    setNewcolor(newColor) {
        this.setUniform("uNewColor" + this.id, newColor);
        this.newColor = newColor;
    }
}
exports.GodRaysExpr = GodRaysExpr;
// sane godray defaults from https://github.com/Erkaman/glsl-godrays/blob/master/example/index.js
function godrays(options = {}) {
    return new GodRaysExpr(options.color, expr_1.n2e(options.exposure), expr_1.n2e(options.decay), expr_1.n2e(options.density), expr_1.n2e(options.weight), options.lightPos, options.samplerNum, options.convertDepth === undefined
        ? undefined
        : {
            threshold: expr_1.n2e(options.convertDepth.threshold),
            newColor: options.convertDepth.newColor,
        });
}
exports.godrays = godrays;

},{"../glslfunctions":36,"./expr":13,"./fragcolorexpr":14,"./vecexprs":34}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grain = exports.GrainExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
class GrainExpr extends expr_1.ExprVec4 {
    constructor(grain) {
        // TODO compose with other expressions rather than write full glsl?
        super(expr_1.tag `vec4((1.0 - ${grain} * random(gl_FragCoord.xy)) * gl_FragColor.rgb, gl_FragColor.a);`, ["uGrain"]);
        this.grain = grain;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
        // TODO get rid of this if we choose to use fcolor instead later
        this.needs.centerSample = true;
    }
    setGrain(grain) {
        this.setUniform("uGrain" + this.id, grain);
        this.grain = expr_1.n2e(grain);
    }
}
exports.GrainExpr = GrainExpr;
function grain(val) {
    return new GrainExpr(expr_1.n2e(val));
}
exports.grain = grain;

},{"../glslfunctions":36,"./expr":13}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hsv2rgb = exports.HSVToRGBExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
class HSVToRGBExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `hsv2rgb(${color})`, ["uHSVCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb];
    }
    setColor(color) {
        this.setUniform("uHSVCol", color);
        this.color = color;
    }
}
exports.HSVToRGBExpr = HSVToRGBExpr;
function hsv2rgb(col) {
    return new HSVToRGBExpr(col);
}
exports.hsv2rgb = hsv2rgb;

},{"../glslfunctions":36,"./expr":13}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.len = exports.LenExpr = void 0;
const expr_1 = require("./expr");
class LenExpr extends expr_1.ExprFloat {
    constructor(vec) {
        super(expr_1.tag `(length(${vec}))`, ["uVec"]);
        this.vec = vec;
    }
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.LenExpr = LenExpr;
function len(vec) {
    return new LenExpr(vec);
}
exports.len = len;

},{"./expr":13}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mouse = exports.MouseExpr = void 0;
const expr_1 = require("./expr");
class MouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uMouse`, []);
        this.needs.mouseUniform = true;
    }
}
exports.MouseExpr = MouseExpr;
function mouse() {
    return new MouseExpr();
}
exports.mouse = mouse;

},{"./expr":13}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ncfcoord = exports.NormCenterFragCoordExpr = void 0;
const expr_1 = require("./expr");
class NormCenterFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(gl_FragCoord.xy / uResolution - 0.5)`, []);
    }
}
exports.NormCenterFragCoordExpr = NormCenterFragCoordExpr;
function ncfcoord() {
    return new NormCenterFragCoordExpr();
}
exports.ncfcoord = ncfcoord;

},{"./expr":13}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nfcoord = exports.NormFragCoordExpr = void 0;
const expr_1 = require("./expr");
class NormFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(gl_FragCoord.xy / uResolution)`, []);
    }
}
exports.NormFragCoordExpr = NormFragCoordExpr;
function nfcoord() {
    return new NormFragCoordExpr();
}
exports.nfcoord = nfcoord;

},{"./expr":13}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.op = exports.OpExpr = void 0;
const expr_1 = require("./expr");
function genOpSourceList(left, op, right) {
    return {
        sections: ["(", ` ${op} `, ")"],
        values: [left, right],
    };
}
class OpExpr extends expr_1.Operator {
    constructor(left, op, right) {
        super(left, genOpSourceList(left, op, right), ["uLeft", "uRight"]);
        this.left = left;
        this.right = right;
    }
    setLeft(left) {
        this.setUniform("uLeft" + this.id, left);
        // TODO way to get rid of this cast?
        this.left = expr_1.wrapInValue(left);
    }
    setRight(right) {
        this.setUniform("uRight" + this.id, right);
        // TODO way to get rid of this cast?
        this.right = expr_1.wrapInValue(right);
    }
}
exports.OpExpr = OpExpr;
// implementation
function op(left, op, right) {
    return new OpExpr(expr_1.wrapInValue(left), op, expr_1.wrapInValue(right));
}
exports.op = op;

},{"./expr":13}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pblur = exports.PowerBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const vecexprs_1 = require("./vecexprs");
const expr_1 = require("./expr");
const baseLog = (x, y) => Math.log(y) / Math.log(x);
class PowerBlurLoop extends mergepass_1.EffectLoop {
    constructor(size) {
        const side = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(size, 0)));
        const up = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(0, size)));
        const reps = Math.ceil(baseLog(2, size));
        super([side, up], {
            num: reps + 1,
        });
        this.size = size;
        this.repeat.func = (i) => {
            const distance = this.size / Math.pow(2, i);
            up.setDirection(vecexprs_1.pvec2(0, distance));
            side.setDirection(vecexprs_1.pvec2(distance, 0));
        };
    }
    setSize(size) {
        this.size = size;
        this.repeat.num = Math.ceil(baseLog(2, size));
    }
}
exports.PowerBlurLoop = PowerBlurLoop;
/**
 * fast approximate blur for large blur radius that might look good in some cases
 */
function pblur(size) {
    return new PowerBlurLoop(size);
}
exports.pblur = pblur;

},{"../mergepass":38,"./blurexpr":6,"./expr":13,"./vecexprs":34}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
class RandomExpr extends expr_1.ExprVec4 {
    constructor(seed = normfragcoordexpr_1.nfcoord()) {
        super(expr_1.tag `random(${seed})`, ["uSeed"]);
        this.seed = seed;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
    }
    setSeed(seed) {
        this.setUniform("uSeed", seed);
        this.seed = seed;
    }
}
exports.RandomExpr = RandomExpr;

},{"../glslfunctions":36,"./expr":13,"./normfragcoordexpr":24}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolution = exports.ResolutionExpr = void 0;
const expr_1 = require("./expr");
class ResolutionExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uResolution`, []);
    }
}
exports.ResolutionExpr = ResolutionExpr;
function resolution() {
    return new ResolutionExpr();
}
exports.resolution = resolution;

},{"./expr":13}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rgb2hsv = exports.RGBToHSVExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
class RGBToHSVExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `rgb2hsv(${color})`, ["uRGBCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setColor(color) {
        this.setUniform("uRGBCol", color);
        this.color = color;
    }
}
exports.RGBToHSVExpr = RGBToHSVExpr;
function rgb2hsv(col) {
    return new RGBToHSVExpr(col);
}
exports.rgb2hsv = rgb2hsv;

},{"../glslfunctions":36,"./expr":13}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.input = exports.SceneSampleExpr = void 0;
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
class SceneSampleExpr extends expr_1.ExprVec4 {
    constructor(coord = normfragcoordexpr_1.nfcoord()) {
        super(expr_1.tag `texture2D(uSceneSampler, ${coord})`, ["uCoord"]);
        this.coord = coord;
        this.needs.sceneBuffer = true;
    }
    setCoord(coord) {
        this.setUniform("uCoord", coord);
        this.coord = coord;
    }
}
exports.SceneSampleExpr = SceneSampleExpr;
function input(vec) {
    return new SceneSampleExpr(vec);
}
exports.input = input;

},{"./expr":13,"./normfragcoordexpr":24}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setcolor = exports.SetColorExpr = void 0;
const expr_1 = require("./expr");
// TODO the only reason this class exists is because `Operator<ExprVec4>` is not
// actually a subclass of ExprVec4, so it doesn't have `genPrograms`
class SetColorExpr extends expr_1.ExprVec4 {
    constructor(vec) {
        super(expr_1.tag `(${vec})`, ["uVal"]);
        this.vec = vec;
    }
    setVal(vec) {
        this.setUniform("uVal", vec);
        this.vec = vec;
    }
}
exports.SetColorExpr = SetColorExpr;
function setcolor(val) {
    return new SetColorExpr(val);
}
exports.setcolor = setcolor;

},{"./expr":13}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.time = exports.TimeExpr = void 0;
const expr_1 = require("./expr");
class TimeExpr extends expr_1.ExprFloat {
    constructor() {
        super(expr_1.tag `uTime`, []);
        this.needs.timeUniform = true;
    }
}
exports.TimeExpr = TimeExpr;
function time() {
    return new TimeExpr();
}
exports.time = time;

},{"./expr":13}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truedepth = exports.TrueDepthExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
class TrueDepthExpr extends expr_1.ExprFloat {
    constructor(depth) {
        super(expr_1.tag `truedepth(${depth})`, ["uDist"]);
        this.depth = depth;
        this.externalFuncs = [glslfunctions_1.glslFuncs.truedepth];
    }
    setDist(depth) {
        this.setUniform("uDist", depth);
        this.depth = expr_1.n2e(depth);
    }
}
exports.TrueDepthExpr = TrueDepthExpr;
function truedepth(depth) {
    return new TrueDepthExpr(expr_1.n2e(depth));
}
exports.truedepth = truedepth;

},{"../glslfunctions":36,"./expr":13}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pvec4 = exports.pvec3 = exports.pvec2 = exports.vec4 = exports.vec3 = exports.vec2 = void 0;
const expr_1 = require("./expr");
function vecSourceList(...components) {
    const sections = ["vec" + components.length + "("];
    for (let i = 0; i < components.length - 1; i++) {
        sections.push(", ");
    }
    const defaultNames = [];
    for (let i = 0; i < components.length; i++) {
        defaultNames.push("uComp" + i);
    }
    sections.push(")");
    return [{ sections: sections, values: components }, defaultNames];
}
// expression vector shorthands
function vec2(comp1, comp2) {
    return new expr_1.BasicVec2(...vecSourceList(...[comp1, comp2].map((c) => expr_1.n2e(c))));
}
exports.vec2 = vec2;
function vec3(comp1, comp2, comp3) {
    return new expr_1.BasicVec3(...vecSourceList(...[comp1, comp2, comp3].map((c) => expr_1.n2e(c))));
}
exports.vec3 = vec3;
function vec4(comp1, comp2, comp3, comp4) {
    return new expr_1.BasicVec4(...vecSourceList(...[comp1, comp2, comp3, comp4].map((c) => expr_1.n2e(c))));
}
exports.vec4 = vec4;
// primitive vector shorthands
function pvec2(comp1, comp2) {
    return new expr_1.PrimitiveVec2([comp1, comp2]);
}
exports.pvec2 = pvec2;
function pvec3(comp1, comp2, comp3) {
    return new expr_1.PrimitiveVec2([comp1, comp2, comp3]);
}
exports.pvec3 = pvec3;
function pvec4(comp1, comp2, comp3, comp4) {
    return new expr_1.PrimitiveVec2([comp1, comp2, comp3, comp4]);
}
exports.pvec4 = pvec4;

},{"./expr":13}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceSampler = exports.captureAndAppend = exports.glslFuncs = void 0;
// adapted from The Book of Shaders
exports.glslFuncs = {
    // TODO replace with a better one
    random: `float random(vec2 st) {
  return fract(sin(dot(st.xy / 99., vec2(12.9898, 78.233))) * 43758.5453123);
}`,
    //  rotate2d: `mat2 rotate2d(float angle) {
    //  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    //}`,
    //  scale: `mat2 scale(vec2 scale) {
    //  return mat2(scale.x, 0.0, 0.0, scale.y);
    //}`,
    hsv2rgb: `vec4 hsv2rgb(vec4 co){
  vec3 c = co.xyz;
  vec3 rgb = clamp(abs(mod(
    c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  vec3 hsv = c.z * mix(vec3(1.0), rgb, c.y);
  return vec4(hsv.x, hsv.y, hsv.z, co.a);
}`,
    rgb2hsv: `vec4 rgb2hsv(vec4 co){
  vec3 c = co.rgb;
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz),
               vec4(c.gb, K.xy),
               step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r),
               vec4(c.r, p.yzx),
               step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
              d / (q.x + e),
              q.x, co.a);
}`,
    // TODO code-gen gaussian blur of arbitrary taps by calculating the curve?
    // adapted from https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
    gauss5: `vec4 gauss5(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3333333333333333) * dir;
  col += texture2D(uSampler, uv) * 0.29411764705882354;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.35294117647058826;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.35294117647058826;
  return col;
}`,
    gauss9: `vec4 gauss9(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3846153846) * dir;
  vec2 off2 = vec2(3.2307692308) * dir;
  col += texture2D(uSampler, uv) * 0.2270270270;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.3162162162;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.3162162162;
  col += texture2D(uSampler, uv + (off2 / uResolution)) * 0.0702702703;
  col += texture2D(uSampler, uv - (off2 / uResolution)) * 0.0702702703;
  return col;
}`,
    gauss13: `vec4 gauss13(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * dir;
  vec2 off2 = vec2(3.2941176470588234) * dir;
  vec2 off3 = vec2(5.176470588235294) * dir;
  col += texture2D(uSampler, uv) * 0.1964825501511404;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.2969069646728344;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.2969069646728344;
  col += texture2D(uSampler, uv + (off2 / uResolution)) * 0.09447039785044732;
  col += texture2D(uSampler, uv - (off2 / uResolution)) * 0.09447039785044732;
  col += texture2D(uSampler, uv + (off3 / uResolution)) * 0.010381362401148057;
  col += texture2D(uSampler, uv - (off3 / uResolution)) * 0.010381362401148057;
  return col;
}`,
    contrast: `vec4 contrast(float val, vec4 col) {
  col.rgb /= col.a;
  col.rgb = ((col.rgb - 0.5) * val) + 0.5;
  col.rgb *= col.a;
  return col;
}`,
    brightness: `vec4 brightness(float val, vec4 col) {
  col.rgb /= col.a;
  col.rgb += val;
  col.rgb *= col.a;
  return col;
}`,
    // adapted from https://www.shadertoy.com/view/ls3GWS which was adapted from
    // http://www.geeks3d.com/20110405/fxaa-fast-approximate-anti-aliasing-demo-glsl-opengl-test-radeon-geforce/3/
    // pass in normalized coordinates to rcpFrame
    fxaa: `vec4 fxaa() {
  float FXAA_SPAN_MAX = 8.0;
  float FXAA_REDUCE_MUL = 1.0 / FXAA_SPAN_MAX;
  float FXAA_REDUCE_MIN = 1.0 / 128.0;
  float FXAA_SUBPIX_SHIFT = 1.0 / 4.0;

  vec2 rcpFrame = 1. / uResolution.xy;
  vec2 t_uv = gl_FragCoord.xy / uResolution.xy; 
  vec4 uv = vec4(t_uv, t_uv - (rcpFrame * (0.5 + FXAA_SUBPIX_SHIFT)));

  vec3 rgbNW = texture2D(uSampler, uv.zw).xyz;
  vec3 rgbNE = texture2D(uSampler, uv.zw + vec2(1,0) * rcpFrame.xy).xyz;
  vec3 rgbSW = texture2D(uSampler, uv.zw + vec2(0,1) * rcpFrame.xy).xyz;
  vec3 rgbSE = texture2D(uSampler, uv.zw + vec2(1,1) * rcpFrame.xy).xyz;
  vec4 rgbMfull = texture2D(uSampler, uv.xy);
  vec3 rgbM = rgbMfull.xyz;
  float alpha = rgbMfull.a;

  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = dot(rgbNW, luma);
  float lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma);
  float lumaSE = dot(rgbSE, luma);
  float lumaM = dot(rgbM,  luma);

  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max(
    (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
  float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);

  dir = min(vec2(FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
    max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
    dir * rcpDirMin)) * rcpFrame.xy;

  vec3 rgbA = (1.0 / 2.0) * (
    texture2D(uSampler, uv.xy + dir * (1.0 / 3.0 - 0.5)).xyz +
    texture2D(uSampler, uv.xy + dir * (2.0 / 3.0 - 0.5)).xyz);
  vec3 rgbB = rgbA * (1.0 / 2.0) + (1.0 / 4.0) * (
    texture2D(uSampler, uv.xy + dir * (0.0 / 3.0 - 0.5)).xyz +
    texture2D(uSampler, uv.xy + dir * (3.0 / 3.0 - 0.5)).xyz);

  float lumaB = dot(rgbB, luma);

  if(lumaB < lumaMin || lumaB > lumaMax) {
    return vec4(rgbA.r, rgbA.g, rgbA.b, alpha);
  }

  return vec4(rgbB.r, rgbB.g, rgbB.b, alpha);
}`,
    // normal curve is a = 0 and b = 1
    gaussian: `float gaussian(float x, float a, float b) {
  float e = 2.71828;
  return pow(e, -pow(x - a, 2.) / b);
}`,
    // for calculating the true distance from 0 to 1 depth buffer
    truedepth: `float truedepth(float i) {
  i = max(i, 0.00000001);
  return (1. - i) / i;
}`,
    // based off of https://fabiensanglard.net/lightScattering/index.php
    godrays: `vec4 godrays(
  vec4 col,
  float exposure,
  float decay,
  float density,
  float weight,
  vec2 lightPos,
  float threshold,
  vec4 newColor
) {
  vec2 texCoord = gl_FragCoord.xy / uResolution;
  vec2 deltaTexCoord = texCoord - lightPos;

  const int NUM_SAMPLES = 100;
  deltaTexCoord *= 1. / float(NUM_SAMPLES) * density;
  float illuminationDecay = 1.0;

  for (int i=0; i < NUM_SAMPLES; i++) {
    texCoord -= deltaTexCoord;
    vec4 sample = texture2D(uSampler, texCoord);
    //uncomment sample = depth2occlusion(sample, newColor, threshold);
    sample *= illuminationDecay * weight;
    col += sample;
    illuminationDecay *= decay;
  }
  return col * exposure;
}`,
    depth2occlusion: `vec4 depth2occlusion(vec4 depthCol, vec4 newCol, float threshold) {
  float red = 1. - ceil(depthCol.r - threshold);
  return vec4(newCol.rgb * red, 1.0);
}`,
};
function captureAndAppend(str, reg, suffix) {
    const matches = str.match(reg);
    if (matches === null)
        throw new Error("no match in the given string");
    return str.replace(reg, matches[0] + suffix);
}
exports.captureAndAppend = captureAndAppend;
function replaceSampler(fullString, funcRegExp, samplerNum, extra) {
    return captureAndAppend(fullString.replace(/uSampler/g, "uBufferSampler" + samplerNum), funcRegExp, "_" + samplerNum + (extra === undefined ? "" : extra));
}
exports.replaceSampler = replaceSampler;

},{}],37:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./mergepass"), exports);
__exportStar(require("./exprtypes"), exports);
__exportStar(require("./glslfunctions"), exports);
__exportStar(require("./expressions/blurexpr"), exports);
__exportStar(require("./expressions/randomexpr"), exports);
__exportStar(require("./expressions/fragcolorexpr"), exports);
__exportStar(require("./expressions/vecexprs"), exports);
__exportStar(require("./expressions/opexpr"), exports);
__exportStar(require("./expressions/powerblur"), exports);
__exportStar(require("./expressions/blur2dloop"), exports);
__exportStar(require("./expressions/lenexpr"), exports);
__exportStar(require("./expressions/normfragcoordexpr"), exports);
__exportStar(require("./expressions/normcenterfragcoordexpr"), exports);
__exportStar(require("./expressions/scenesampleexpr"), exports);
__exportStar(require("./expressions/brightnessexpr"), exports);
__exportStar(require("./expressions/setcolorexpr"), exports);
__exportStar(require("./expressions/contrastexpr"), exports);
__exportStar(require("./expressions/grainexpr"), exports);
__exportStar(require("./expressions/getcompexpr"), exports);
__exportStar(require("./expressions/changecompexpr"), exports);
__exportStar(require("./expressions/rgbtohsvexpr"), exports);
__exportStar(require("./expressions/hsvtorgbexpr"), exports);
__exportStar(require("./expressions/timeexpr"), exports);
__exportStar(require("./expressions/arity1"), exports);
__exportStar(require("./expressions/arity2"), exports);
__exportStar(require("./expressions/fxaaexpr"), exports);
__exportStar(require("./expressions/buffersampleexpr"), exports);
__exportStar(require("./expressions/dofloop"), exports);
__exportStar(require("./expressions/truedepthexpr"), exports);
__exportStar(require("./expressions/godraysexpr"), exports);
__exportStar(require("./expressions/depthtoocclusionexpr"), exports);
__exportStar(require("./expressions/resolutionexpr"), exports);
__exportStar(require("./expressions/mouseexpr"), exports);
__exportStar(require("./expressions/expr"), exports);

},{"./expressions/arity1":3,"./expressions/arity2":4,"./expressions/blur2dloop":5,"./expressions/blurexpr":6,"./expressions/brightnessexpr":7,"./expressions/buffersampleexpr":8,"./expressions/changecompexpr":9,"./expressions/contrastexpr":10,"./expressions/depthtoocclusionexpr":11,"./expressions/dofloop":12,"./expressions/expr":13,"./expressions/fragcolorexpr":14,"./expressions/fxaaexpr":15,"./expressions/getcompexpr":17,"./expressions/godraysexpr":18,"./expressions/grainexpr":19,"./expressions/hsvtorgbexpr":20,"./expressions/lenexpr":21,"./expressions/mouseexpr":22,"./expressions/normcenterfragcoordexpr":23,"./expressions/normfragcoordexpr":24,"./expressions/opexpr":25,"./expressions/powerblur":26,"./expressions/randomexpr":27,"./expressions/resolutionexpr":28,"./expressions/rgbtohsvexpr":29,"./expressions/scenesampleexpr":30,"./expressions/setcolorexpr":31,"./expressions/timeexpr":32,"./expressions/truedepthexpr":33,"./expressions/vecexprs":34,"./exprtypes":35,"./glslfunctions":36,"./mergepass":38}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTexture = exports.makeTexture = exports.Merger = exports.loop = exports.EffectLoop = void 0;
const codebuilder_1 = require("./codebuilder");
const webglprogramloop_1 = require("./webglprogramloop");
class EffectLoop {
    constructor(effects, repeat) {
        this.effects = effects;
        this.repeat = repeat;
    }
    getSampleNum(mult = 1, sliceStart = 0, sliceEnd = this.effects.length) {
        mult *= this.repeat.num;
        let acc = 0;
        const sliced = this.effects.slice(sliceStart, sliceEnd);
        for (const e of sliced) {
            acc += e.getSampleNum(mult);
        }
        return acc;
    }
    /** places effects into loops broken up by sampling effects */
    regroup() {
        let sampleCount = 0;
        /** number of samples in all previous */
        let prevSampleCount = 0;
        let prevEffects = [];
        const regroupedEffects = [];
        const breakOff = () => {
            if (prevEffects.length > 0) {
                // break off all previous effects into their own loop
                if (prevEffects.length === 1) {
                    // this is to prevent wrapping in another effect loop
                    regroupedEffects.push(prevEffects[0]);
                }
                else {
                    regroupedEffects.push(new EffectLoop(prevEffects, { num: 1 }));
                }
                sampleCount -= prevSampleCount;
                prevEffects = [];
            }
        };
        for (const e of this.effects) {
            const sampleNum = e.getSampleNum();
            prevSampleCount = sampleCount;
            sampleCount += sampleNum;
            if (sampleCount > 0)
                breakOff();
            prevEffects.push(e);
        }
        // push on all the straggling effects after the grouping is done
        breakOff();
        return regroupedEffects;
    }
    /** recursive descent parser for turning effects into programs */
    genPrograms(gl, vShader, uniformLocs) {
        // validate
        const fullSampleNum = this.getSampleNum() / this.repeat.num;
        const firstSampleNum = this.getSampleNum(undefined, 0, 1) / this.repeat.num;
        const restSampleNum = this.getSampleNum(undefined, 1) / this.repeat.num;
        if (fullSampleNum === 0 || (firstSampleNum === 1 && restSampleNum === 0)) {
            const codeBuilder = new codebuilder_1.CodeBuilder(this);
            const program = codeBuilder.compileProgram(gl, vShader, uniformLocs);
            return program;
        }
        // otherwise, regroup and try again on regrouped loops
        this.effects = this.regroup();
        // okay to have undefined needs here
        return new webglprogramloop_1.WebGLProgramLoop(this.effects.map((e) => e.genPrograms(gl, vShader, uniformLocs)), this.repeat, gl);
    }
}
exports.EffectLoop = EffectLoop;
function loop(effects, rep) {
    return new EffectLoop(effects, { num: rep });
}
exports.loop = loop;
const V_SOURCE = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}\n`;
class Merger {
    constructor(effects, source, gl, options) {
        var _a;
        this.uniformLocs = {};
        /** additional channels */
        this.channels = [];
        // set channels if provided with channels
        if ((options === null || options === void 0 ? void 0 : options.channels) !== undefined)
            this.channels = options === null || options === void 0 ? void 0 : options.channels;
        // wrap the given list of effects as a loop if need be
        if (!(effects instanceof EffectLoop)) {
            this.effectLoop = new EffectLoop(effects, { num: 1 });
        }
        else {
            this.effectLoop = effects;
        }
        if (this.effectLoop.effects.length === 0) {
            throw new Error("list of effects was empty");
        }
        this.source = source;
        this.gl = gl;
        this.options = options;
        // set the viewport
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        // set up the vertex buffer
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        const vertexArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
        const triangles = new Float32Array(vertexArray);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangles, this.gl.STATIC_DRAW);
        // compile the simple vertex shader (2 big triangles)
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (vShader === null) {
            throw new Error("problem creating the vertex shader");
        }
        this.gl.shaderSource(vShader, V_SOURCE);
        this.gl.compileShader(vShader);
        // make textures
        this.tex = {
            // make the front texture the source if we're given a texture instead of
            // an image
            back: source instanceof WebGLTexture
                ? source
                : makeTexture(this.gl, this.options),
            front: makeTexture(this.gl, this.options),
            scene: undefined,
            bufTextures: [],
        };
        // create the framebuffer
        const framebuffer = gl.createFramebuffer();
        if (framebuffer === null) {
            throw new Error("problem creating the framebuffer");
        }
        this.framebuffer = framebuffer;
        // generate the fragment shaders and programs
        this.programLoop = this.effectLoop.genPrograms(this.gl, vShader, this.uniformLocs);
        // find the final program
        let atBottom = false;
        let currProgramLoop = this.programLoop;
        while (!atBottom) {
            if (currProgramLoop.programElement instanceof WebGLProgram) {
                // we traveled right and hit a program, so it must be the last
                currProgramLoop.last = true;
                atBottom = true;
            }
            else {
                // set the current program loop to the last in the list
                currProgramLoop =
                    currProgramLoop.programElement[currProgramLoop.programElement.length - 1];
            }
        }
        if (this.programLoop.getTotalNeeds().sceneBuffer) {
            this.tex.scene = makeTexture(this.gl, this.options);
        }
        console.log(this.programLoop);
        // create x amount of empty textures based on buffers needed
        let channelsNeeded = 0;
        if (((_a = this.programLoop.totalNeeds) === null || _a === void 0 ? void 0 : _a.extraBuffers) !== undefined) {
            channelsNeeded =
                Math.max(...this.programLoop.totalNeeds.extraBuffers) + 1;
        }
        let channelsSupplied = this.channels.length;
        if (channelsNeeded > channelsSupplied) {
            throw new Error("not enough channels supplied for this effect");
        }
        for (let i = 0; i < this.channels.length; i++) {
            const texOrImage = this.channels[i];
            if (!(texOrImage instanceof WebGLTexture)) {
                // create a new texture; we will update this with the image source every draw
                const texture = makeTexture(this.gl, this.options);
                this.tex.bufTextures.push(texture);
            }
            else {
                // this is already a texture; the user will handle updating this
                this.tex.bufTextures.push(texOrImage);
            }
        }
    }
    draw(time = 0, mouseX = 0, mouseY = 0) {
        // TODO double check if this is neccessary
        const originalFront = this.tex.front;
        const originalBack = this.tex.back;
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.back);
        sendTexture(this.gl, this.source);
        // bind the scene buffer
        if (this.programLoop.getTotalNeeds().sceneBuffer &&
            this.tex.scene !== undefined) {
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.scene);
            sendTexture(this.gl, this.source);
        }
        // bind the additional buffers
        let counter = 0;
        for (const b of this.channels) {
            // TODO what's the limit on amount of textures?
            this.gl.activeTexture(this.gl.TEXTURE2 + counter);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.bufTextures[counter]);
            sendTexture(this.gl, b);
            counter++;
        }
        // swap textures before beginning draw
        this.programLoop.draw(this.gl, this.tex, this.framebuffer, this.uniformLocs, this.programLoop.last, { time: time, mouseX: mouseX, mouseY: mouseY });
        // make sure front and back are in same order
        this.tex.front = originalFront;
        this.tex.back = originalBack;
    }
}
exports.Merger = Merger;
function makeTexture(gl, options) {
    const texture = gl.createTexture();
    if (texture === null) {
        throw new Error("problem creating texture");
    }
    // flip the order of the pixels, or else it displays upside down
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // bind the texture after creating it
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const filterMode = (f) => f === undefined || f === "linear" ? gl.LINEAR : gl.NEAREST;
    // how to map texture element
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode(options === null || options === void 0 ? void 0 : options.minFilterMode));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode(options === null || options === void 0 ? void 0 : options.maxFilterMode));
    if ((options === null || options === void 0 ? void 0 : options.edgeMode) !== "wrap") {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return texture;
}
exports.makeTexture = makeTexture;
function sendTexture(gl, src) {
    // if you are using textures instead of images, the user is responsible for
    // doing `texImage2D` and updating it with new info, so just return
    if (src instanceof WebGLTexture)
        return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}
exports.sendTexture = sendTexture;

},{"./codebuilder":1,"./webglprogramloop":39}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLProgramLoop = exports.updateNeeds = void 0;
// update me on change to needs
exports.updateNeeds = (acc, curr) => {
    return {
        neighborSample: acc.neighborSample || curr.neighborSample,
        centerSample: acc.centerSample || curr.centerSample,
        sceneBuffer: acc.sceneBuffer || curr.sceneBuffer,
        timeUniform: acc.timeUniform || curr.timeUniform,
        mouseUniform: acc.mouseUniform || curr.mouseUniform,
        extraBuffers: new Set([...acc.extraBuffers, ...curr.extraBuffers]),
    };
};
class WebGLProgramLoop {
    constructor(programElement, repeat, gl, totalNeeds, // only defined when leaf
    effects = [] // only populated when leaf
    ) {
        var _a, _b;
        this.last = false;
        this.programElement = programElement;
        this.repeat = repeat;
        this.totalNeeds = totalNeeds;
        this.effects = effects;
        if (programElement instanceof WebGLProgram) {
            if (gl === undefined) {
                throw new Error("program element is a program but context is undefined");
            }
            // get the time uniform location
            if ((_a = this.totalNeeds) === null || _a === void 0 ? void 0 : _a.timeUniform) {
                gl.useProgram(programElement);
                const timeLoc = gl.getUniformLocation(programElement, "uTime");
                if (timeLoc === null) {
                    throw new Error("could not get the time uniform location");
                }
                this.timeLoc = timeLoc;
            }
            // get the mouse uniform location
            if ((_b = this.totalNeeds) === null || _b === void 0 ? void 0 : _b.mouseUniform) {
                gl.useProgram(programElement);
                const mouseLoc = gl.getUniformLocation(programElement, "uMouse");
                if (mouseLoc === null) {
                    throw new Error("could not get the mouse uniform location");
                }
                this.mouseLoc = mouseLoc;
            }
        }
    }
    getTotalNeeds() {
        // go through needs of program loop
        if (!(this.programElement instanceof WebGLProgram)) {
            const allNeeds = [];
            for (const p of this.programElement) {
                allNeeds.push(p.getTotalNeeds());
            }
            // update me on change to needs
            return allNeeds.reduce(exports.updateNeeds);
        }
        if (this.totalNeeds === undefined) {
            throw new Error("total needs of webgl program was somehow undefined");
        }
        return this.totalNeeds;
    }
    draw(gl, tex, framebuffer, uniformLocs, last, defaultUniforms) {
        var _a, _b, _c;
        for (let i = 0; i < this.repeat.num; i++) {
            const newLast = i === this.repeat.num - 1;
            if (this.programElement instanceof WebGLProgram) {
                // effects list is populated
                if (i === 0) {
                    gl.useProgram(this.programElement);
                    if ((_a = this.totalNeeds) === null || _a === void 0 ? void 0 : _a.sceneBuffer) {
                        if (tex.scene === undefined) {
                            throw new Error("needs scene buffer, but scene texture is somehow undefined");
                        }
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, tex.scene);
                    }
                    for (const effect of this.effects) {
                        effect.applyUniforms(gl, uniformLocs);
                    }
                    // set time uniform if needed
                    if ((_b = this.totalNeeds) === null || _b === void 0 ? void 0 : _b.timeUniform) {
                        if (this.timeLoc === undefined ||
                            defaultUniforms.time === undefined) {
                            throw new Error("time or location is undefined");
                        }
                        gl.uniform1f(this.timeLoc, defaultUniforms.time);
                    }
                    // set mouse uniforms if needed
                    if ((_c = this.totalNeeds) === null || _c === void 0 ? void 0 : _c.mouseUniform) {
                        if (this.mouseLoc === undefined ||
                            defaultUniforms.mouseX === undefined ||
                            defaultUniforms.mouseY === undefined) {
                            throw new Error("mouse uniform or location is undefined");
                        }
                        gl.uniform2f(this.mouseLoc, defaultUniforms.mouseX, defaultUniforms.mouseY);
                    }
                }
                if (newLast && last && this.last) {
                    // we are on the final pass of the final loop, so draw screen by
                    // setting to the default framebuffer
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
                else {
                    // we have to bounce between two textures
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                    // use the framebuffer to write to front texture
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.front, 0);
                }
                // allows us to read from `texBack`
                // default sampler is 0, so `uSampler` uniform will always sample from texture 0
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, tex.back);
                [tex.back, tex.front] = [tex.front, tex.back];
                // use our last program as the draw program
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            else {
                if (this.repeat.func !== undefined) {
                    this.repeat.func(i);
                }
                for (const p of this.programElement) {
                    p.draw(gl, tex, framebuffer, uniformLocs, newLast, defaultUniforms);
                }
            }
        }
    }
}
exports.WebGLProgramLoop = WebGLProgramLoop;

},{}],40:[function(require,module,exports){
/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.dat = {})));
}(this, (function (exports) { 'use strict';

function ___$insertStyle(css) {
  if (!css) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }

  var style = document.createElement('style');

  style.setAttribute('type', 'text/css');
  style.innerHTML = css;
  document.head.appendChild(style);

  return css;
}

function colorToString (color, forceCSSHex) {
  var colorFormat = color.__state.conversionName.toString();
  var r = Math.round(color.r);
  var g = Math.round(color.g);
  var b = Math.round(color.b);
  var a = color.a;
  var h = Math.round(color.h);
  var s = color.s.toFixed(1);
  var v = color.v.toFixed(1);
  if (forceCSSHex || colorFormat === 'THREE_CHAR_HEX' || colorFormat === 'SIX_CHAR_HEX') {
    var str = color.hex.toString(16);
    while (str.length < 6) {
      str = '0' + str;
    }
    return '#' + str;
  } else if (colorFormat === 'CSS_RGB') {
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } else if (colorFormat === 'CSS_RGBA') {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  } else if (colorFormat === 'HEX') {
    return '0x' + color.hex.toString(16);
  } else if (colorFormat === 'RGB_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ']';
  } else if (colorFormat === 'RGBA_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ',' + a + ']';
  } else if (colorFormat === 'RGB_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + '}';
  } else if (colorFormat === 'RGBA_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + ',a:' + a + '}';
  } else if (colorFormat === 'HSV_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + '}';
  } else if (colorFormat === 'HSVA_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + ',a:' + a + '}';
  }
  return 'unknown format';
}

var ARR_EACH = Array.prototype.forEach;
var ARR_SLICE = Array.prototype.slice;
var Common = {
  BREAK: {},
  extend: function extend(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (!this.isUndefined(obj[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  defaults: function defaults(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (this.isUndefined(target[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  compose: function compose() {
    var toCall = ARR_SLICE.call(arguments);
    return function () {
      var args = ARR_SLICE.call(arguments);
      for (var i = toCall.length - 1; i >= 0; i--) {
        args = [toCall[i].apply(this, args)];
      }
      return args[0];
    };
  },
  each: function each(obj, itr, scope) {
    if (!obj) {
      return;
    }
    if (ARR_EACH && obj.forEach && obj.forEach === ARR_EACH) {
      obj.forEach(itr, scope);
    } else if (obj.length === obj.length + 0) {
      var key = void 0;
      var l = void 0;
      for (key = 0, l = obj.length; key < l; key++) {
        if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) {
          return;
        }
      }
    } else {
      for (var _key in obj) {
        if (itr.call(scope, obj[_key], _key) === this.BREAK) {
          return;
        }
      }
    }
  },
  defer: function defer(fnc) {
    setTimeout(fnc, 0);
  },
  debounce: function debounce(func, threshold, callImmediately) {
    var timeout = void 0;
    return function () {
      var obj = this;
      var args = arguments;
      function delayed() {
        timeout = null;
        if (!callImmediately) func.apply(obj, args);
      }
      var callNow = callImmediately || !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(delayed, threshold);
      if (callNow) {
        func.apply(obj, args);
      }
    };
  },
  toArray: function toArray(obj) {
    if (obj.toArray) return obj.toArray();
    return ARR_SLICE.call(obj);
  },
  isUndefined: function isUndefined(obj) {
    return obj === undefined;
  },
  isNull: function isNull(obj) {
    return obj === null;
  },
  isNaN: function (_isNaN) {
    function isNaN(_x) {
      return _isNaN.apply(this, arguments);
    }
    isNaN.toString = function () {
      return _isNaN.toString();
    };
    return isNaN;
  }(function (obj) {
    return isNaN(obj);
  }),
  isArray: Array.isArray || function (obj) {
    return obj.constructor === Array;
  },
  isObject: function isObject(obj) {
    return obj === Object(obj);
  },
  isNumber: function isNumber(obj) {
    return obj === obj + 0;
  },
  isString: function isString(obj) {
    return obj === obj + '';
  },
  isBoolean: function isBoolean(obj) {
    return obj === false || obj === true;
  },
  isFunction: function isFunction(obj) {
    return obj instanceof Function;
  }
};

var INTERPRETATIONS = [
{
  litmus: Common.isString,
  conversions: {
    THREE_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString() + test[1].toString() + test[2].toString() + test[2].toString() + test[3].toString() + test[3].toString(), 0)
        };
      },
      write: colorToString
    },
    SIX_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9]{6})$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString(), 0)
        };
      },
      write: colorToString
    },
    CSS_RGB: {
      read: function read(original) {
        var test = original.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3])
        };
      },
      write: colorToString
    },
    CSS_RGBA: {
      read: function read(original) {
        var test = original.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3]),
          a: parseFloat(test[4])
        };
      },
      write: colorToString
    }
  }
},
{
  litmus: Common.isNumber,
  conversions: {
    HEX: {
      read: function read(original) {
        return {
          space: 'HEX',
          hex: original,
          conversionName: 'HEX'
        };
      },
      write: function write(color) {
        return color.hex;
      }
    }
  }
},
{
  litmus: Common.isArray,
  conversions: {
    RGB_ARRAY: {
      read: function read(original) {
        if (original.length !== 3) {
          return false;
        }
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b];
      }
    },
    RGBA_ARRAY: {
      read: function read(original) {
        if (original.length !== 4) return false;
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2],
          a: original[3]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b, color.a];
      }
    }
  }
},
{
  litmus: Common.isObject,
  conversions: {
    RGBA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b) && Common.isNumber(original.a)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b,
          a: color.a
        };
      }
    },
    RGB_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b
        };
      }
    },
    HSVA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v) && Common.isNumber(original.a)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v,
          a: color.a
        };
      }
    },
    HSV_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v
        };
      }
    }
  }
}];
var result = void 0;
var toReturn = void 0;
var interpret = function interpret() {
  toReturn = false;
  var original = arguments.length > 1 ? Common.toArray(arguments) : arguments[0];
  Common.each(INTERPRETATIONS, function (family) {
    if (family.litmus(original)) {
      Common.each(family.conversions, function (conversion, conversionName) {
        result = conversion.read(original);
        if (toReturn === false && result !== false) {
          toReturn = result;
          result.conversionName = conversionName;
          result.conversion = conversion;
          return Common.BREAK;
        }
      });
      return Common.BREAK;
    }
  });
  return toReturn;
};

var tmpComponent = void 0;
var ColorMath = {
  hsv_to_rgb: function hsv_to_rgb(h, s, v) {
    var hi = Math.floor(h / 60) % 6;
    var f = h / 60 - Math.floor(h / 60);
    var p = v * (1.0 - s);
    var q = v * (1.0 - f * s);
    var t = v * (1.0 - (1.0 - f) * s);
    var c = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][hi];
    return {
      r: c[0] * 255,
      g: c[1] * 255,
      b: c[2] * 255
    };
  },
  rgb_to_hsv: function rgb_to_hsv(r, g, b) {
    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var delta = max - min;
    var h = void 0;
    var s = void 0;
    if (max !== 0) {
      s = delta / max;
    } else {
      return {
        h: NaN,
        s: 0,
        v: 0
      };
    }
    if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else {
      h = 4 + (r - g) / delta;
    }
    h /= 6;
    if (h < 0) {
      h += 1;
    }
    return {
      h: h * 360,
      s: s,
      v: max / 255
    };
  },
  rgb_to_hex: function rgb_to_hex(r, g, b) {
    var hex = this.hex_with_component(0, 2, r);
    hex = this.hex_with_component(hex, 1, g);
    hex = this.hex_with_component(hex, 0, b);
    return hex;
  },
  component_from_hex: function component_from_hex(hex, componentIndex) {
    return hex >> componentIndex * 8 & 0xFF;
  },
  hex_with_component: function hex_with_component(hex, componentIndex, value) {
    return value << (tmpComponent = componentIndex * 8) | hex & ~(0xFF << tmpComponent);
  }
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Color = function () {
  function Color() {
    classCallCheck(this, Color);
    this.__state = interpret.apply(this, arguments);
    if (this.__state === false) {
      throw new Error('Failed to interpret color arguments');
    }
    this.__state.a = this.__state.a || 1;
  }
  createClass(Color, [{
    key: 'toString',
    value: function toString() {
      return colorToString(this);
    }
  }, {
    key: 'toHexString',
    value: function toHexString() {
      return colorToString(this, true);
    }
  }, {
    key: 'toOriginal',
    value: function toOriginal() {
      return this.__state.conversion.write(this);
    }
  }]);
  return Color;
}();
function defineRGBComponent(target, component, componentHexIndex) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'RGB') {
        return this.__state[component];
      }
      Color.recalculateRGB(this, component, componentHexIndex);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'RGB') {
        Color.recalculateRGB(this, component, componentHexIndex);
        this.__state.space = 'RGB';
      }
      this.__state[component] = v;
    }
  });
}
function defineHSVComponent(target, component) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'HSV') {
        return this.__state[component];
      }
      Color.recalculateHSV(this);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'HSV') {
        Color.recalculateHSV(this);
        this.__state.space = 'HSV';
      }
      this.__state[component] = v;
    }
  });
}
Color.recalculateRGB = function (color, component, componentHexIndex) {
  if (color.__state.space === 'HEX') {
    color.__state[component] = ColorMath.component_from_hex(color.__state.hex, componentHexIndex);
  } else if (color.__state.space === 'HSV') {
    Common.extend(color.__state, ColorMath.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));
  } else {
    throw new Error('Corrupted color state');
  }
};
Color.recalculateHSV = function (color) {
  var result = ColorMath.rgb_to_hsv(color.r, color.g, color.b);
  Common.extend(color.__state, {
    s: result.s,
    v: result.v
  });
  if (!Common.isNaN(result.h)) {
    color.__state.h = result.h;
  } else if (Common.isUndefined(color.__state.h)) {
    color.__state.h = 0;
  }
};
Color.COMPONENTS = ['r', 'g', 'b', 'h', 's', 'v', 'hex', 'a'];
defineRGBComponent(Color.prototype, 'r', 2);
defineRGBComponent(Color.prototype, 'g', 1);
defineRGBComponent(Color.prototype, 'b', 0);
defineHSVComponent(Color.prototype, 'h');
defineHSVComponent(Color.prototype, 's');
defineHSVComponent(Color.prototype, 'v');
Object.defineProperty(Color.prototype, 'a', {
  get: function get$$1() {
    return this.__state.a;
  },
  set: function set$$1(v) {
    this.__state.a = v;
  }
});
Object.defineProperty(Color.prototype, 'hex', {
  get: function get$$1() {
    if (this.__state.space !== 'HEX') {
      this.__state.hex = ColorMath.rgb_to_hex(this.r, this.g, this.b);
      this.__state.space = 'HEX';
    }
    return this.__state.hex;
  },
  set: function set$$1(v) {
    this.__state.space = 'HEX';
    this.__state.hex = v;
  }
});

var Controller = function () {
  function Controller(object, property) {
    classCallCheck(this, Controller);
    this.initialValue = object[property];
    this.domElement = document.createElement('div');
    this.object = object;
    this.property = property;
    this.__onChange = undefined;
    this.__onFinishChange = undefined;
  }
  createClass(Controller, [{
    key: 'onChange',
    value: function onChange(fnc) {
      this.__onChange = fnc;
      return this;
    }
  }, {
    key: 'onFinishChange',
    value: function onFinishChange(fnc) {
      this.__onFinishChange = fnc;
      return this;
    }
  }, {
    key: 'setValue',
    value: function setValue(newValue) {
      this.object[this.property] = newValue;
      if (this.__onChange) {
        this.__onChange.call(this, newValue);
      }
      this.updateDisplay();
      return this;
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.object[this.property];
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      return this;
    }
  }, {
    key: 'isModified',
    value: function isModified() {
      return this.initialValue !== this.getValue();
    }
  }]);
  return Controller;
}();

var EVENT_MAP = {
  HTMLEvents: ['change'],
  MouseEvents: ['click', 'mousemove', 'mousedown', 'mouseup', 'mouseover'],
  KeyboardEvents: ['keydown']
};
var EVENT_MAP_INV = {};
Common.each(EVENT_MAP, function (v, k) {
  Common.each(v, function (e) {
    EVENT_MAP_INV[e] = k;
  });
});
var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;
function cssValueToPixels(val) {
  if (val === '0' || Common.isUndefined(val)) {
    return 0;
  }
  var match = val.match(CSS_VALUE_PIXELS);
  if (!Common.isNull(match)) {
    return parseFloat(match[1]);
  }
  return 0;
}
var dom = {
  makeSelectable: function makeSelectable(elem, selectable) {
    if (elem === undefined || elem.style === undefined) return;
    elem.onselectstart = selectable ? function () {
      return false;
    } : function () {};
    elem.style.MozUserSelect = selectable ? 'auto' : 'none';
    elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
    elem.unselectable = selectable ? 'on' : 'off';
  },
  makeFullscreen: function makeFullscreen(elem, hor, vert) {
    var vertical = vert;
    var horizontal = hor;
    if (Common.isUndefined(horizontal)) {
      horizontal = true;
    }
    if (Common.isUndefined(vertical)) {
      vertical = true;
    }
    elem.style.position = 'absolute';
    if (horizontal) {
      elem.style.left = 0;
      elem.style.right = 0;
    }
    if (vertical) {
      elem.style.top = 0;
      elem.style.bottom = 0;
    }
  },
  fakeEvent: function fakeEvent(elem, eventType, pars, aux) {
    var params = pars || {};
    var className = EVENT_MAP_INV[eventType];
    if (!className) {
      throw new Error('Event type ' + eventType + ' not supported.');
    }
    var evt = document.createEvent(className);
    switch (className) {
      case 'MouseEvents':
        {
          var clientX = params.x || params.clientX || 0;
          var clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false, params.cancelable || true, window, params.clickCount || 1, 0,
          0,
          clientX,
          clientY,
          false, false, false, false, 0, null);
          break;
        }
      case 'KeyboardEvents':
        {
          var init = evt.initKeyboardEvent || evt.initKeyEvent;
          Common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false, params.cancelable, window, params.ctrlKey, params.altKey, params.shiftKey, params.metaKey, params.keyCode, params.charCode);
          break;
        }
      default:
        {
          evt.initEvent(eventType, params.bubbles || false, params.cancelable || true);
          break;
        }
    }
    Common.defaults(evt, aux);
    elem.dispatchEvent(evt);
  },
  bind: function bind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.addEventListener) {
      elem.addEventListener(event, func, bool);
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, func);
    }
    return dom;
  },
  unbind: function unbind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.removeEventListener) {
      elem.removeEventListener(event, func, bool);
    } else if (elem.detachEvent) {
      elem.detachEvent('on' + event, func);
    }
    return dom;
  },
  addClass: function addClass(elem, className) {
    if (elem.className === undefined) {
      elem.className = className;
    } else if (elem.className !== className) {
      var classes = elem.className.split(/ +/);
      if (classes.indexOf(className) === -1) {
        classes.push(className);
        elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
      }
    }
    return dom;
  },
  removeClass: function removeClass(elem, className) {
    if (className) {
      if (elem.className === className) {
        elem.removeAttribute('class');
      } else {
        var classes = elem.className.split(/ +/);
        var index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          elem.className = classes.join(' ');
        }
      }
    } else {
      elem.className = undefined;
    }
    return dom;
  },
  hasClass: function hasClass(elem, className) {
    return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
  },
  getWidth: function getWidth(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-left-width']) + cssValueToPixels(style['border-right-width']) + cssValueToPixels(style['padding-left']) + cssValueToPixels(style['padding-right']) + cssValueToPixels(style.width);
  },
  getHeight: function getHeight(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-top-width']) + cssValueToPixels(style['border-bottom-width']) + cssValueToPixels(style['padding-top']) + cssValueToPixels(style['padding-bottom']) + cssValueToPixels(style.height);
  },
  getOffset: function getOffset(el) {
    var elem = el;
    var offset = { left: 0, top: 0 };
    if (elem.offsetParent) {
      do {
        offset.left += elem.offsetLeft;
        offset.top += elem.offsetTop;
        elem = elem.offsetParent;
      } while (elem);
    }
    return offset;
  },
  isActive: function isActive(elem) {
    return elem === document.activeElement && (elem.type || elem.href);
  }
};

var BooleanController = function (_Controller) {
  inherits(BooleanController, _Controller);
  function BooleanController(object, property) {
    classCallCheck(this, BooleanController);
    var _this2 = possibleConstructorReturn(this, (BooleanController.__proto__ || Object.getPrototypeOf(BooleanController)).call(this, object, property));
    var _this = _this2;
    _this2.__prev = _this2.getValue();
    _this2.__checkbox = document.createElement('input');
    _this2.__checkbox.setAttribute('type', 'checkbox');
    function onChange() {
      _this.setValue(!_this.__prev);
    }
    dom.bind(_this2.__checkbox, 'change', onChange, false);
    _this2.domElement.appendChild(_this2.__checkbox);
    _this2.updateDisplay();
    return _this2;
  }
  createClass(BooleanController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      this.__prev = this.getValue();
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (this.getValue() === true) {
        this.__checkbox.setAttribute('checked', 'checked');
        this.__checkbox.checked = true;
        this.__prev = true;
      } else {
        this.__checkbox.checked = false;
        this.__prev = false;
      }
      return get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return BooleanController;
}(Controller);

var OptionController = function (_Controller) {
  inherits(OptionController, _Controller);
  function OptionController(object, property, opts) {
    classCallCheck(this, OptionController);
    var _this2 = possibleConstructorReturn(this, (OptionController.__proto__ || Object.getPrototypeOf(OptionController)).call(this, object, property));
    var options = opts;
    var _this = _this2;
    _this2.__select = document.createElement('select');
    if (Common.isArray(options)) {
      var map = {};
      Common.each(options, function (element) {
        map[element] = element;
      });
      options = map;
    }
    Common.each(options, function (value, key) {
      var opt = document.createElement('option');
      opt.innerHTML = key;
      opt.setAttribute('value', value);
      _this.__select.appendChild(opt);
    });
    _this2.updateDisplay();
    dom.bind(_this2.__select, 'change', function () {
      var desiredValue = this.options[this.selectedIndex].value;
      _this.setValue(desiredValue);
    });
    _this2.domElement.appendChild(_this2.__select);
    return _this2;
  }
  createClass(OptionController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (dom.isActive(this.__select)) return this;
      this.__select.value = this.getValue();
      return get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return OptionController;
}(Controller);

var StringController = function (_Controller) {
  inherits(StringController, _Controller);
  function StringController(object, property) {
    classCallCheck(this, StringController);
    var _this2 = possibleConstructorReturn(this, (StringController.__proto__ || Object.getPrototypeOf(StringController)).call(this, object, property));
    var _this = _this2;
    function onChange() {
      _this.setValue(_this.__input.value);
    }
    function onBlur() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'keyup', onChange);
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        this.blur();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(StringController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (!dom.isActive(this.__input)) {
        this.__input.value = this.getValue();
      }
      return get(StringController.prototype.__proto__ || Object.getPrototypeOf(StringController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return StringController;
}(Controller);

function numDecimals(x) {
  var _x = x.toString();
  if (_x.indexOf('.') > -1) {
    return _x.length - _x.indexOf('.') - 1;
  }
  return 0;
}
var NumberController = function (_Controller) {
  inherits(NumberController, _Controller);
  function NumberController(object, property, params) {
    classCallCheck(this, NumberController);
    var _this = possibleConstructorReturn(this, (NumberController.__proto__ || Object.getPrototypeOf(NumberController)).call(this, object, property));
    var _params = params || {};
    _this.__min = _params.min;
    _this.__max = _params.max;
    _this.__step = _params.step;
    if (Common.isUndefined(_this.__step)) {
      if (_this.initialValue === 0) {
        _this.__impliedStep = 1;
      } else {
        _this.__impliedStep = Math.pow(10, Math.floor(Math.log(Math.abs(_this.initialValue)) / Math.LN10)) / 10;
      }
    } else {
      _this.__impliedStep = _this.__step;
    }
    _this.__precision = numDecimals(_this.__impliedStep);
    return _this;
  }
  createClass(NumberController, [{
    key: 'setValue',
    value: function setValue(v) {
      var _v = v;
      if (this.__min !== undefined && _v < this.__min) {
        _v = this.__min;
      } else if (this.__max !== undefined && _v > this.__max) {
        _v = this.__max;
      }
      if (this.__step !== undefined && _v % this.__step !== 0) {
        _v = Math.round(_v / this.__step) * this.__step;
      }
      return get(NumberController.prototype.__proto__ || Object.getPrototypeOf(NumberController.prototype), 'setValue', this).call(this, _v);
    }
  }, {
    key: 'min',
    value: function min(minValue) {
      this.__min = minValue;
      return this;
    }
  }, {
    key: 'max',
    value: function max(maxValue) {
      this.__max = maxValue;
      return this;
    }
  }, {
    key: 'step',
    value: function step(stepValue) {
      this.__step = stepValue;
      this.__impliedStep = stepValue;
      this.__precision = numDecimals(stepValue);
      return this;
    }
  }]);
  return NumberController;
}(Controller);

function roundToDecimal(value, decimals) {
  var tenTo = Math.pow(10, decimals);
  return Math.round(value * tenTo) / tenTo;
}
var NumberControllerBox = function (_NumberController) {
  inherits(NumberControllerBox, _NumberController);
  function NumberControllerBox(object, property, params) {
    classCallCheck(this, NumberControllerBox);
    var _this2 = possibleConstructorReturn(this, (NumberControllerBox.__proto__ || Object.getPrototypeOf(NumberControllerBox)).call(this, object, property, params));
    _this2.__truncationSuspended = false;
    var _this = _this2;
    var prevY = void 0;
    function onChange() {
      var attempted = parseFloat(_this.__input.value);
      if (!Common.isNaN(attempted)) {
        _this.setValue(attempted);
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onBlur() {
      onFinish();
    }
    function onMouseDrag(e) {
      var diff = prevY - e.clientY;
      _this.setValue(_this.getValue() + diff * _this.__impliedStep);
      prevY = e.clientY;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      onFinish();
    }
    function onMouseDown(e) {
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      prevY = e.clientY;
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'mousedown', onMouseDown);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        _this.__truncationSuspended = true;
        this.blur();
        _this.__truncationSuspended = false;
        onFinish();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(NumberControllerBox, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      this.__input.value = this.__truncationSuspended ? this.getValue() : roundToDecimal(this.getValue(), this.__precision);
      return get(NumberControllerBox.prototype.__proto__ || Object.getPrototypeOf(NumberControllerBox.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerBox;
}(NumberController);

function map(v, i1, i2, o1, o2) {
  return o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
}
var NumberControllerSlider = function (_NumberController) {
  inherits(NumberControllerSlider, _NumberController);
  function NumberControllerSlider(object, property, min, max, step) {
    classCallCheck(this, NumberControllerSlider);
    var _this2 = possibleConstructorReturn(this, (NumberControllerSlider.__proto__ || Object.getPrototypeOf(NumberControllerSlider)).call(this, object, property, { min: min, max: max, step: step }));
    var _this = _this2;
    _this2.__background = document.createElement('div');
    _this2.__foreground = document.createElement('div');
    dom.bind(_this2.__background, 'mousedown', onMouseDown);
    dom.bind(_this2.__background, 'touchstart', onTouchStart);
    dom.addClass(_this2.__background, 'slider');
    dom.addClass(_this2.__foreground, 'slider-fg');
    function onMouseDown(e) {
      document.activeElement.blur();
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      onMouseDrag(e);
    }
    function onMouseDrag(e) {
      e.preventDefault();
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(e.clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
      return false;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onTouchStart(e) {
      if (e.touches.length !== 1) {
        return;
      }
      dom.bind(window, 'touchmove', onTouchMove);
      dom.bind(window, 'touchend', onTouchEnd);
      onTouchMove(e);
    }
    function onTouchMove(e) {
      var clientX = e.touches[0].clientX;
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
    }
    function onTouchEnd() {
      dom.unbind(window, 'touchmove', onTouchMove);
      dom.unbind(window, 'touchend', onTouchEnd);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.updateDisplay();
    _this2.__background.appendChild(_this2.__foreground);
    _this2.domElement.appendChild(_this2.__background);
    return _this2;
  }
  createClass(NumberControllerSlider, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var pct = (this.getValue() - this.__min) / (this.__max - this.__min);
      this.__foreground.style.width = pct * 100 + '%';
      return get(NumberControllerSlider.prototype.__proto__ || Object.getPrototypeOf(NumberControllerSlider.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerSlider;
}(NumberController);

var FunctionController = function (_Controller) {
  inherits(FunctionController, _Controller);
  function FunctionController(object, property, text) {
    classCallCheck(this, FunctionController);
    var _this2 = possibleConstructorReturn(this, (FunctionController.__proto__ || Object.getPrototypeOf(FunctionController)).call(this, object, property));
    var _this = _this2;
    _this2.__button = document.createElement('div');
    _this2.__button.innerHTML = text === undefined ? 'Fire' : text;
    dom.bind(_this2.__button, 'click', function (e) {
      e.preventDefault();
      _this.fire();
      return false;
    });
    dom.addClass(_this2.__button, 'button');
    _this2.domElement.appendChild(_this2.__button);
    return _this2;
  }
  createClass(FunctionController, [{
    key: 'fire',
    value: function fire() {
      if (this.__onChange) {
        this.__onChange.call(this);
      }
      this.getValue().call(this.object);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
    }
  }]);
  return FunctionController;
}(Controller);

var ColorController = function (_Controller) {
  inherits(ColorController, _Controller);
  function ColorController(object, property) {
    classCallCheck(this, ColorController);
    var _this2 = possibleConstructorReturn(this, (ColorController.__proto__ || Object.getPrototypeOf(ColorController)).call(this, object, property));
    _this2.__color = new Color(_this2.getValue());
    _this2.__temp = new Color(0);
    var _this = _this2;
    _this2.domElement = document.createElement('div');
    dom.makeSelectable(_this2.domElement, false);
    _this2.__selector = document.createElement('div');
    _this2.__selector.className = 'selector';
    _this2.__saturation_field = document.createElement('div');
    _this2.__saturation_field.className = 'saturation-field';
    _this2.__field_knob = document.createElement('div');
    _this2.__field_knob.className = 'field-knob';
    _this2.__field_knob_border = '2px solid ';
    _this2.__hue_knob = document.createElement('div');
    _this2.__hue_knob.className = 'hue-knob';
    _this2.__hue_field = document.createElement('div');
    _this2.__hue_field.className = 'hue-field';
    _this2.__input = document.createElement('input');
    _this2.__input.type = 'text';
    _this2.__input_textShadow = '0 1px 1px ';
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        onBlur.call(this);
      }
    });
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__selector, 'mousedown', function ()        {
      dom.addClass(this, 'drag').bind(window, 'mouseup', function ()        {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    dom.bind(_this2.__selector, 'touchstart', function ()        {
      dom.addClass(this, 'drag').bind(window, 'touchend', function ()        {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    var valueField = document.createElement('div');
    Common.extend(_this2.__selector.style, {
      width: '122px',
      height: '102px',
      padding: '3px',
      backgroundColor: '#222',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.3)'
    });
    Common.extend(_this2.__field_knob.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      border: _this2.__field_knob_border + (_this2.__color.v < 0.5 ? '#fff' : '#000'),
      boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      borderRadius: '12px',
      zIndex: 1
    });
    Common.extend(_this2.__hue_knob.style, {
      position: 'absolute',
      width: '15px',
      height: '2px',
      borderRight: '4px solid #fff',
      zIndex: 1
    });
    Common.extend(_this2.__saturation_field.style, {
      width: '100px',
      height: '100px',
      border: '1px solid #555',
      marginRight: '3px',
      display: 'inline-block',
      cursor: 'pointer'
    });
    Common.extend(valueField.style, {
      width: '100%',
      height: '100%',
      background: 'none'
    });
    linearGradient(valueField, 'top', 'rgba(0,0,0,0)', '#000');
    Common.extend(_this2.__hue_field.style, {
      width: '15px',
      height: '100px',
      border: '1px solid #555',
      cursor: 'ns-resize',
      position: 'absolute',
      top: '3px',
      right: '3px'
    });
    hueGradient(_this2.__hue_field);
    Common.extend(_this2.__input.style, {
      outline: 'none',
      textAlign: 'center',
      color: '#fff',
      border: 0,
      fontWeight: 'bold',
      textShadow: _this2.__input_textShadow + 'rgba(0,0,0,0.7)'
    });
    dom.bind(_this2.__saturation_field, 'mousedown', fieldDown);
    dom.bind(_this2.__saturation_field, 'touchstart', fieldDown);
    dom.bind(_this2.__field_knob, 'mousedown', fieldDown);
    dom.bind(_this2.__field_knob, 'touchstart', fieldDown);
    dom.bind(_this2.__hue_field, 'mousedown', fieldDownH);
    dom.bind(_this2.__hue_field, 'touchstart', fieldDownH);
    function fieldDown(e) {
      setSV(e);
      dom.bind(window, 'mousemove', setSV);
      dom.bind(window, 'touchmove', setSV);
      dom.bind(window, 'mouseup', fieldUpSV);
      dom.bind(window, 'touchend', fieldUpSV);
    }
    function fieldDownH(e) {
      setH(e);
      dom.bind(window, 'mousemove', setH);
      dom.bind(window, 'touchmove', setH);
      dom.bind(window, 'mouseup', fieldUpH);
      dom.bind(window, 'touchend', fieldUpH);
    }
    function fieldUpSV() {
      dom.unbind(window, 'mousemove', setSV);
      dom.unbind(window, 'touchmove', setSV);
      dom.unbind(window, 'mouseup', fieldUpSV);
      dom.unbind(window, 'touchend', fieldUpSV);
      onFinish();
    }
    function fieldUpH() {
      dom.unbind(window, 'mousemove', setH);
      dom.unbind(window, 'touchmove', setH);
      dom.unbind(window, 'mouseup', fieldUpH);
      dom.unbind(window, 'touchend', fieldUpH);
      onFinish();
    }
    function onBlur() {
      var i = interpret(this.value);
      if (i !== false) {
        _this.__color.__state = i;
        _this.setValue(_this.__color.toOriginal());
      } else {
        this.value = _this.__color.toString();
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.__color.toOriginal());
      }
    }
    _this2.__saturation_field.appendChild(valueField);
    _this2.__selector.appendChild(_this2.__field_knob);
    _this2.__selector.appendChild(_this2.__saturation_field);
    _this2.__selector.appendChild(_this2.__hue_field);
    _this2.__hue_field.appendChild(_this2.__hue_knob);
    _this2.domElement.appendChild(_this2.__input);
    _this2.domElement.appendChild(_this2.__selector);
    _this2.updateDisplay();
    function setSV(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__saturation_field.getBoundingClientRect();
      var _ref = e.touches && e.touches[0] || e,
          clientX = _ref.clientX,
          clientY = _ref.clientY;
      var s = (clientX - fieldRect.left) / (fieldRect.right - fieldRect.left);
      var v = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (v > 1) {
        v = 1;
      } else if (v < 0) {
        v = 0;
      }
      if (s > 1) {
        s = 1;
      } else if (s < 0) {
        s = 0;
      }
      _this.__color.v = v;
      _this.__color.s = s;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    function setH(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__hue_field.getBoundingClientRect();
      var _ref2 = e.touches && e.touches[0] || e,
          clientY = _ref2.clientY;
      var h = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (h > 1) {
        h = 1;
      } else if (h < 0) {
        h = 0;
      }
      _this.__color.h = h * 360;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    return _this2;
  }
  createClass(ColorController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var i = interpret(this.getValue());
      if (i !== false) {
        var mismatch = false;
        Common.each(Color.COMPONENTS, function (component) {
          if (!Common.isUndefined(i[component]) && !Common.isUndefined(this.__color.__state[component]) && i[component] !== this.__color.__state[component]) {
            mismatch = true;
            return {};
          }
        }, this);
        if (mismatch) {
          Common.extend(this.__color.__state, i);
        }
      }
      Common.extend(this.__temp.__state, this.__color.__state);
      this.__temp.a = 1;
      var flip = this.__color.v < 0.5 || this.__color.s > 0.5 ? 255 : 0;
      var _flip = 255 - flip;
      Common.extend(this.__field_knob.style, {
        marginLeft: 100 * this.__color.s - 7 + 'px',
        marginTop: 100 * (1 - this.__color.v) - 7 + 'px',
        backgroundColor: this.__temp.toHexString(),
        border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip + ')'
      });
      this.__hue_knob.style.marginTop = (1 - this.__color.h / 360) * 100 + 'px';
      this.__temp.s = 1;
      this.__temp.v = 1;
      linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toHexString());
      this.__input.value = this.__color.toString();
      Common.extend(this.__input.style, {
        backgroundColor: this.__color.toHexString(),
        color: 'rgb(' + flip + ',' + flip + ',' + flip + ')',
        textShadow: this.__input_textShadow + 'rgba(' + _flip + ',' + _flip + ',' + _flip + ',.7)'
      });
    }
  }]);
  return ColorController;
}(Controller);
var vendors = ['-moz-', '-o-', '-webkit-', '-ms-', ''];
function linearGradient(elem, x, a, b) {
  elem.style.background = '';
  Common.each(vendors, function (vendor) {
    elem.style.cssText += 'background: ' + vendor + 'linear-gradient(' + x + ', ' + a + ' 0%, ' + b + ' 100%); ';
  });
}
function hueGradient(elem) {
  elem.style.background = '';
  elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);';
  elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
}

var css = {
  load: function load(url, indoc) {
    var doc = indoc || document;
    var link = doc.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    doc.getElementsByTagName('head')[0].appendChild(link);
  },
  inject: function inject(cssContent, indoc) {
    var doc = indoc || document;
    var injected = document.createElement('style');
    injected.type = 'text/css';
    injected.innerHTML = cssContent;
    var head = doc.getElementsByTagName('head')[0];
    try {
      head.appendChild(injected);
    } catch (e) {
    }
  }
};

var saveDialogContents = "<div id=\"dg-save\" class=\"dg dialogue\">\n\n  Here's the new load parameter for your <code>GUI</code>'s constructor:\n\n  <textarea id=\"dg-new-constructor\"></textarea>\n\n  <div id=\"dg-save-locally\">\n\n    <input id=\"dg-local-storage\" type=\"checkbox\"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id=\"dg-local-explain\">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n\n    </div>\n\n  </div>\n\n</div>";

var ControllerFactory = function ControllerFactory(object, property) {
  var initialValue = object[property];
  if (Common.isArray(arguments[2]) || Common.isObject(arguments[2])) {
    return new OptionController(object, property, arguments[2]);
  }
  if (Common.isNumber(initialValue)) {
    if (Common.isNumber(arguments[2]) && Common.isNumber(arguments[3])) {
      if (Common.isNumber(arguments[4])) {
        return new NumberControllerSlider(object, property, arguments[2], arguments[3], arguments[4]);
      }
      return new NumberControllerSlider(object, property, arguments[2], arguments[3]);
    }
    if (Common.isNumber(arguments[4])) {
      return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3], step: arguments[4] });
    }
    return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3] });
  }
  if (Common.isString(initialValue)) {
    return new StringController(object, property);
  }
  if (Common.isFunction(initialValue)) {
    return new FunctionController(object, property, '');
  }
  if (Common.isBoolean(initialValue)) {
    return new BooleanController(object, property);
  }
  return null;
};

function requestAnimationFrame(callback) {
  setTimeout(callback, 1000 / 60);
}
var requestAnimationFrame$1 = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || requestAnimationFrame;

var CenteredDiv = function () {
  function CenteredDiv() {
    classCallCheck(this, CenteredDiv);
    this.backgroundElement = document.createElement('div');
    Common.extend(this.backgroundElement.style, {
      backgroundColor: 'rgba(0,0,0,0.8)',
      top: 0,
      left: 0,
      display: 'none',
      zIndex: '1000',
      opacity: 0,
      WebkitTransition: 'opacity 0.2s linear',
      transition: 'opacity 0.2s linear'
    });
    dom.makeFullscreen(this.backgroundElement);
    this.backgroundElement.style.position = 'fixed';
    this.domElement = document.createElement('div');
    Common.extend(this.domElement.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1001',
      opacity: 0,
      WebkitTransition: '-webkit-transform 0.2s ease-out, opacity 0.2s linear',
      transition: 'transform 0.2s ease-out, opacity 0.2s linear'
    });
    document.body.appendChild(this.backgroundElement);
    document.body.appendChild(this.domElement);
    var _this = this;
    dom.bind(this.backgroundElement, 'click', function () {
      _this.hide();
    });
  }
  createClass(CenteredDiv, [{
    key: 'show',
    value: function show() {
      var _this = this;
      this.backgroundElement.style.display = 'block';
      this.domElement.style.display = 'block';
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
      this.layout();
      Common.defer(function () {
        _this.backgroundElement.style.opacity = 1;
        _this.domElement.style.opacity = 1;
        _this.domElement.style.webkitTransform = 'scale(1)';
      });
    }
  }, {
    key: 'hide',
    value: function hide() {
      var _this = this;
      var hide = function hide() {
        _this.domElement.style.display = 'none';
        _this.backgroundElement.style.display = 'none';
        dom.unbind(_this.domElement, 'webkitTransitionEnd', hide);
        dom.unbind(_this.domElement, 'transitionend', hide);
        dom.unbind(_this.domElement, 'oTransitionEnd', hide);
      };
      dom.bind(this.domElement, 'webkitTransitionEnd', hide);
      dom.bind(this.domElement, 'transitionend', hide);
      dom.bind(this.domElement, 'oTransitionEnd', hide);
      this.backgroundElement.style.opacity = 0;
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
    }
  }, {
    key: 'layout',
    value: function layout() {
      this.domElement.style.left = window.innerWidth / 2 - dom.getWidth(this.domElement) / 2 + 'px';
      this.domElement.style.top = window.innerHeight / 2 - dom.getHeight(this.domElement) / 2 + 'px';
    }
  }]);
  return CenteredDiv;
}();

var styleSheet = ___$insertStyle(".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n");

css.inject(styleSheet);
var CSS_NAMESPACE = 'dg';
var HIDE_KEY_CODE = 72;
var CLOSE_BUTTON_HEIGHT = 20;
var DEFAULT_DEFAULT_PRESET_NAME = 'Default';
var SUPPORTS_LOCAL_STORAGE = function () {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
}();
var SAVE_DIALOGUE = void 0;
var autoPlaceVirgin = true;
var autoPlaceContainer = void 0;
var hide = false;
var hideableGuis = [];
var GUI = function GUI(pars) {
  var _this = this;
  var params = pars || {};
  this.domElement = document.createElement('div');
  this.__ul = document.createElement('ul');
  this.domElement.appendChild(this.__ul);
  dom.addClass(this.domElement, CSS_NAMESPACE);
  this.__folders = {};
  this.__controllers = [];
  this.__rememberedObjects = [];
  this.__rememberedObjectIndecesToControllers = [];
  this.__listening = [];
  params = Common.defaults(params, {
    closeOnTop: false,
    autoPlace: true,
    width: GUI.DEFAULT_WIDTH
  });
  params = Common.defaults(params, {
    resizable: params.autoPlace,
    hideable: params.autoPlace
  });
  if (!Common.isUndefined(params.load)) {
    if (params.preset) {
      params.load.preset = params.preset;
    }
  } else {
    params.load = { preset: DEFAULT_DEFAULT_PRESET_NAME };
  }
  if (Common.isUndefined(params.parent) && params.hideable) {
    hideableGuis.push(this);
  }
  params.resizable = Common.isUndefined(params.parent) && params.resizable;
  if (params.autoPlace && Common.isUndefined(params.scrollable)) {
    params.scrollable = true;
  }
  var useLocalStorage = SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(this, 'isLocal')) === 'true';
  var saveToLocalStorage = void 0;
  var titleRow = void 0;
  Object.defineProperties(this,
  {
    parent: {
      get: function get$$1() {
        return params.parent;
      }
    },
    scrollable: {
      get: function get$$1() {
        return params.scrollable;
      }
    },
    autoPlace: {
      get: function get$$1() {
        return params.autoPlace;
      }
    },
    closeOnTop: {
      get: function get$$1() {
        return params.closeOnTop;
      }
    },
    preset: {
      get: function get$$1() {
        if (_this.parent) {
          return _this.getRoot().preset;
        }
        return params.load.preset;
      },
      set: function set$$1(v) {
        if (_this.parent) {
          _this.getRoot().preset = v;
        } else {
          params.load.preset = v;
        }
        setPresetSelectIndex(this);
        _this.revert();
      }
    },
    width: {
      get: function get$$1() {
        return params.width;
      },
      set: function set$$1(v) {
        params.width = v;
        setWidth(_this, v);
      }
    },
    name: {
      get: function get$$1() {
        return params.name;
      },
      set: function set$$1(v) {
        params.name = v;
        if (titleRow) {
          titleRow.innerHTML = params.name;
        }
      }
    },
    closed: {
      get: function get$$1() {
        return params.closed;
      },
      set: function set$$1(v) {
        params.closed = v;
        if (params.closed) {
          dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
        } else {
          dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
        }
        this.onResize();
        if (_this.__closeButton) {
          _this.__closeButton.innerHTML = v ? GUI.TEXT_OPEN : GUI.TEXT_CLOSED;
        }
      }
    },
    load: {
      get: function get$$1() {
        return params.load;
      }
    },
    useLocalStorage: {
      get: function get$$1() {
        return useLocalStorage;
      },
      set: function set$$1(bool) {
        if (SUPPORTS_LOCAL_STORAGE) {
          useLocalStorage = bool;
          if (bool) {
            dom.bind(window, 'unload', saveToLocalStorage);
          } else {
            dom.unbind(window, 'unload', saveToLocalStorage);
          }
          localStorage.setItem(getLocalStorageHash(_this, 'isLocal'), bool);
        }
      }
    }
  });
  if (Common.isUndefined(params.parent)) {
    this.closed = params.closed || false;
    dom.addClass(this.domElement, GUI.CLASS_MAIN);
    dom.makeSelectable(this.domElement, false);
    if (SUPPORTS_LOCAL_STORAGE) {
      if (useLocalStorage) {
        _this.useLocalStorage = true;
        var savedGui = localStorage.getItem(getLocalStorageHash(this, 'gui'));
        if (savedGui) {
          params.load = JSON.parse(savedGui);
        }
      }
    }
    this.__closeButton = document.createElement('div');
    this.__closeButton.innerHTML = GUI.TEXT_CLOSED;
    dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BUTTON);
    if (params.closeOnTop) {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_TOP);
      this.domElement.insertBefore(this.__closeButton, this.domElement.childNodes[0]);
    } else {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BOTTOM);
      this.domElement.appendChild(this.__closeButton);
    }
    dom.bind(this.__closeButton, 'click', function () {
      _this.closed = !_this.closed;
    });
  } else {
    if (params.closed === undefined) {
      params.closed = true;
    }
    var titleRowName = document.createTextNode(params.name);
    dom.addClass(titleRowName, 'controller-name');
    titleRow = addRow(_this, titleRowName);
    var onClickTitle = function onClickTitle(e) {
      e.preventDefault();
      _this.closed = !_this.closed;
      return false;
    };
    dom.addClass(this.__ul, GUI.CLASS_CLOSED);
    dom.addClass(titleRow, 'title');
    dom.bind(titleRow, 'click', onClickTitle);
    if (!params.closed) {
      this.closed = false;
    }
  }
  if (params.autoPlace) {
    if (Common.isUndefined(params.parent)) {
      if (autoPlaceVirgin) {
        autoPlaceContainer = document.createElement('div');
        dom.addClass(autoPlaceContainer, CSS_NAMESPACE);
        dom.addClass(autoPlaceContainer, GUI.CLASS_AUTO_PLACE_CONTAINER);
        document.body.appendChild(autoPlaceContainer);
        autoPlaceVirgin = false;
      }
      autoPlaceContainer.appendChild(this.domElement);
      dom.addClass(this.domElement, GUI.CLASS_AUTO_PLACE);
    }
    if (!this.parent) {
      setWidth(_this, params.width);
    }
  }
  this.__resizeHandler = function () {
    _this.onResizeDebounced();
  };
  dom.bind(window, 'resize', this.__resizeHandler);
  dom.bind(this.__ul, 'webkitTransitionEnd', this.__resizeHandler);
  dom.bind(this.__ul, 'transitionend', this.__resizeHandler);
  dom.bind(this.__ul, 'oTransitionEnd', this.__resizeHandler);
  this.onResize();
  if (params.resizable) {
    addResizeHandle(this);
  }
  saveToLocalStorage = function saveToLocalStorage() {
    if (SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(_this, 'isLocal')) === 'true') {
      localStorage.setItem(getLocalStorageHash(_this, 'gui'), JSON.stringify(_this.getSaveObject()));
    }
  };
  this.saveToLocalStorageIfPossible = saveToLocalStorage;
  function resetWidth() {
    var root = _this.getRoot();
    root.width += 1;
    Common.defer(function () {
      root.width -= 1;
    });
  }
  if (!params.parent) {
    resetWidth();
  }
};
GUI.toggleHide = function () {
  hide = !hide;
  Common.each(hideableGuis, function (gui) {
    gui.domElement.style.display = hide ? 'none' : '';
  });
};
GUI.CLASS_AUTO_PLACE = 'a';
GUI.CLASS_AUTO_PLACE_CONTAINER = 'ac';
GUI.CLASS_MAIN = 'main';
GUI.CLASS_CONTROLLER_ROW = 'cr';
GUI.CLASS_TOO_TALL = 'taller-than-window';
GUI.CLASS_CLOSED = 'closed';
GUI.CLASS_CLOSE_BUTTON = 'close-button';
GUI.CLASS_CLOSE_TOP = 'close-top';
GUI.CLASS_CLOSE_BOTTOM = 'close-bottom';
GUI.CLASS_DRAG = 'drag';
GUI.DEFAULT_WIDTH = 245;
GUI.TEXT_CLOSED = 'Close Controls';
GUI.TEXT_OPEN = 'Open Controls';
GUI._keydownHandler = function (e) {
  if (document.activeElement.type !== 'text' && (e.which === HIDE_KEY_CODE || e.keyCode === HIDE_KEY_CODE)) {
    GUI.toggleHide();
  }
};
dom.bind(window, 'keydown', GUI._keydownHandler, false);
Common.extend(GUI.prototype,
{
  add: function add(object, property) {
    return _add(this, object, property, {
      factoryArgs: Array.prototype.slice.call(arguments, 2)
    });
  },
  addColor: function addColor(object, property) {
    return _add(this, object, property, {
      color: true
    });
  },
  remove: function remove(controller) {
    this.__ul.removeChild(controller.__li);
    this.__controllers.splice(this.__controllers.indexOf(controller), 1);
    var _this = this;
    Common.defer(function () {
      _this.onResize();
    });
  },
  destroy: function destroy() {
    if (this.parent) {
      throw new Error('Only the root GUI should be removed with .destroy(). ' + 'For subfolders, use gui.removeFolder(folder) instead.');
    }
    if (this.autoPlace) {
      autoPlaceContainer.removeChild(this.domElement);
    }
    var _this = this;
    Common.each(this.__folders, function (subfolder) {
      _this.removeFolder(subfolder);
    });
    dom.unbind(window, 'keydown', GUI._keydownHandler, false);
    removeListeners(this);
  },
  addFolder: function addFolder(name) {
    if (this.__folders[name] !== undefined) {
      throw new Error('You already have a folder in this GUI by the' + ' name "' + name + '"');
    }
    var newGuiParams = { name: name, parent: this };
    newGuiParams.autoPlace = this.autoPlace;
    if (this.load &&
    this.load.folders &&
    this.load.folders[name]) {
      newGuiParams.closed = this.load.folders[name].closed;
      newGuiParams.load = this.load.folders[name];
    }
    var gui = new GUI(newGuiParams);
    this.__folders[name] = gui;
    var li = addRow(this, gui.domElement);
    dom.addClass(li, 'folder');
    return gui;
  },
  removeFolder: function removeFolder(folder) {
    this.__ul.removeChild(folder.domElement.parentElement);
    delete this.__folders[folder.name];
    if (this.load &&
    this.load.folders &&
    this.load.folders[folder.name]) {
      delete this.load.folders[folder.name];
    }
    removeListeners(folder);
    var _this = this;
    Common.each(folder.__folders, function (subfolder) {
      folder.removeFolder(subfolder);
    });
    Common.defer(function () {
      _this.onResize();
    });
  },
  open: function open() {
    this.closed = false;
  },
  close: function close() {
    this.closed = true;
  },
  hide: function hide() {
    this.domElement.style.display = 'none';
  },
  show: function show() {
    this.domElement.style.display = '';
  },
  onResize: function onResize() {
    var root = this.getRoot();
    if (root.scrollable) {
      var top = dom.getOffset(root.__ul).top;
      var h = 0;
      Common.each(root.__ul.childNodes, function (node) {
        if (!(root.autoPlace && node === root.__save_row)) {
          h += dom.getHeight(node);
        }
      });
      if (window.innerHeight - top - CLOSE_BUTTON_HEIGHT < h) {
        dom.addClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = window.innerHeight - top - CLOSE_BUTTON_HEIGHT + 'px';
      } else {
        dom.removeClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = 'auto';
      }
    }
    if (root.__resize_handle) {
      Common.defer(function () {
        root.__resize_handle.style.height = root.__ul.offsetHeight + 'px';
      });
    }
    if (root.__closeButton) {
      root.__closeButton.style.width = root.width + 'px';
    }
  },
  onResizeDebounced: Common.debounce(function () {
    this.onResize();
  }, 50),
  remember: function remember() {
    if (Common.isUndefined(SAVE_DIALOGUE)) {
      SAVE_DIALOGUE = new CenteredDiv();
      SAVE_DIALOGUE.domElement.innerHTML = saveDialogContents;
    }
    if (this.parent) {
      throw new Error('You can only call remember on a top level GUI.');
    }
    var _this = this;
    Common.each(Array.prototype.slice.call(arguments), function (object) {
      if (_this.__rememberedObjects.length === 0) {
        addSaveMenu(_this);
      }
      if (_this.__rememberedObjects.indexOf(object) === -1) {
        _this.__rememberedObjects.push(object);
      }
    });
    if (this.autoPlace) {
      setWidth(this, this.width);
    }
  },
  getRoot: function getRoot() {
    var gui = this;
    while (gui.parent) {
      gui = gui.parent;
    }
    return gui;
  },
  getSaveObject: function getSaveObject() {
    var toReturn = this.load;
    toReturn.closed = this.closed;
    if (this.__rememberedObjects.length > 0) {
      toReturn.preset = this.preset;
      if (!toReturn.remembered) {
        toReturn.remembered = {};
      }
      toReturn.remembered[this.preset] = getCurrentPreset(this);
    }
    toReturn.folders = {};
    Common.each(this.__folders, function (element, key) {
      toReturn.folders[key] = element.getSaveObject();
    });
    return toReturn;
  },
  save: function save() {
    if (!this.load.remembered) {
      this.load.remembered = {};
    }
    this.load.remembered[this.preset] = getCurrentPreset(this);
    markPresetModified(this, false);
    this.saveToLocalStorageIfPossible();
  },
  saveAs: function saveAs(presetName) {
    if (!this.load.remembered) {
      this.load.remembered = {};
      this.load.remembered[DEFAULT_DEFAULT_PRESET_NAME] = getCurrentPreset(this, true);
    }
    this.load.remembered[presetName] = getCurrentPreset(this);
    this.preset = presetName;
    addPresetOption(this, presetName, true);
    this.saveToLocalStorageIfPossible();
  },
  revert: function revert(gui) {
    Common.each(this.__controllers, function (controller) {
      if (!this.getRoot().load.remembered) {
        controller.setValue(controller.initialValue);
      } else {
        recallSavedValue(gui || this.getRoot(), controller);
      }
      if (controller.__onFinishChange) {
        controller.__onFinishChange.call(controller, controller.getValue());
      }
    }, this);
    Common.each(this.__folders, function (folder) {
      folder.revert(folder);
    });
    if (!gui) {
      markPresetModified(this.getRoot(), false);
    }
  },
  listen: function listen(controller) {
    var init = this.__listening.length === 0;
    this.__listening.push(controller);
    if (init) {
      updateDisplays(this.__listening);
    }
  },
  updateDisplay: function updateDisplay() {
    Common.each(this.__controllers, function (controller) {
      controller.updateDisplay();
    });
    Common.each(this.__folders, function (folder) {
      folder.updateDisplay();
    });
  }
});
function addRow(gui, newDom, liBefore) {
  var li = document.createElement('li');
  if (newDom) {
    li.appendChild(newDom);
  }
  if (liBefore) {
    gui.__ul.insertBefore(li, liBefore);
  } else {
    gui.__ul.appendChild(li);
  }
  gui.onResize();
  return li;
}
function removeListeners(gui) {
  dom.unbind(window, 'resize', gui.__resizeHandler);
  if (gui.saveToLocalStorageIfPossible) {
    dom.unbind(window, 'unload', gui.saveToLocalStorageIfPossible);
  }
}
function markPresetModified(gui, modified) {
  var opt = gui.__preset_select[gui.__preset_select.selectedIndex];
  if (modified) {
    opt.innerHTML = opt.value + '*';
  } else {
    opt.innerHTML = opt.value;
  }
}
function augmentController(gui, li, controller) {
  controller.__li = li;
  controller.__gui = gui;
  Common.extend(controller,                                   {
    options: function options(_options) {
      if (arguments.length > 1) {
        var nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: nextSibling,
          factoryArgs: [Common.toArray(arguments)]
        });
      }
      if (Common.isArray(_options) || Common.isObject(_options)) {
        var _nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: _nextSibling,
          factoryArgs: [_options]
        });
      }
    },
    name: function name(_name) {
      controller.__li.firstElementChild.firstElementChild.innerHTML = _name;
      return controller;
    },
    listen: function listen() {
      controller.__gui.listen(controller);
      return controller;
    },
    remove: function remove() {
      controller.__gui.remove(controller);
      return controller;
    }
  });
  if (controller instanceof NumberControllerSlider) {
    var box = new NumberControllerBox(controller.object, controller.property, { min: controller.__min, max: controller.__max, step: controller.__step });
    Common.each(['updateDisplay', 'onChange', 'onFinishChange', 'step', 'min', 'max'], function (method) {
      var pc = controller[method];
      var pb = box[method];
      controller[method] = box[method] = function () {
        var args = Array.prototype.slice.call(arguments);
        pb.apply(box, args);
        return pc.apply(controller, args);
      };
    });
    dom.addClass(li, 'has-slider');
    controller.domElement.insertBefore(box.domElement, controller.domElement.firstElementChild);
  } else if (controller instanceof NumberControllerBox) {
    var r = function r(returned) {
      if (Common.isNumber(controller.__min) && Common.isNumber(controller.__max)) {
        var oldName = controller.__li.firstElementChild.firstElementChild.innerHTML;
        var wasListening = controller.__gui.__listening.indexOf(controller) > -1;
        controller.remove();
        var newController = _add(gui, controller.object, controller.property, {
          before: controller.__li.nextElementSibling,
          factoryArgs: [controller.__min, controller.__max, controller.__step]
        });
        newController.name(oldName);
        if (wasListening) newController.listen();
        return newController;
      }
      return returned;
    };
    controller.min = Common.compose(r, controller.min);
    controller.max = Common.compose(r, controller.max);
  } else if (controller instanceof BooleanController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__checkbox, 'click');
    });
    dom.bind(controller.__checkbox, 'click', function (e) {
      e.stopPropagation();
    });
  } else if (controller instanceof FunctionController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__button, 'click');
    });
    dom.bind(li, 'mouseover', function () {
      dom.addClass(controller.__button, 'hover');
    });
    dom.bind(li, 'mouseout', function () {
      dom.removeClass(controller.__button, 'hover');
    });
  } else if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
    controller.updateDisplay = Common.compose(function (val) {
      li.style.borderLeftColor = controller.__color.toString();
      return val;
    }, controller.updateDisplay);
    controller.updateDisplay();
  }
  controller.setValue = Common.compose(function (val) {
    if (gui.getRoot().__preset_select && controller.isModified()) {
      markPresetModified(gui.getRoot(), true);
    }
    return val;
  }, controller.setValue);
}
function recallSavedValue(gui, controller) {
  var root = gui.getRoot();
  var matchedIndex = root.__rememberedObjects.indexOf(controller.object);
  if (matchedIndex !== -1) {
    var controllerMap = root.__rememberedObjectIndecesToControllers[matchedIndex];
    if (controllerMap === undefined) {
      controllerMap = {};
      root.__rememberedObjectIndecesToControllers[matchedIndex] = controllerMap;
    }
    controllerMap[controller.property] = controller;
    if (root.load && root.load.remembered) {
      var presetMap = root.load.remembered;
      var preset = void 0;
      if (presetMap[gui.preset]) {
        preset = presetMap[gui.preset];
      } else if (presetMap[DEFAULT_DEFAULT_PRESET_NAME]) {
        preset = presetMap[DEFAULT_DEFAULT_PRESET_NAME];
      } else {
        return;
      }
      if (preset[matchedIndex] && preset[matchedIndex][controller.property] !== undefined) {
        var value = preset[matchedIndex][controller.property];
        controller.initialValue = value;
        controller.setValue(value);
      }
    }
  }
}
function _add(gui, object, property, params) {
  if (object[property] === undefined) {
    throw new Error('Object "' + object + '" has no property "' + property + '"');
  }
  var controller = void 0;
  if (params.color) {
    controller = new ColorController(object, property);
  } else {
    var factoryArgs = [object, property].concat(params.factoryArgs);
    controller = ControllerFactory.apply(gui, factoryArgs);
  }
  if (params.before instanceof Controller) {
    params.before = params.before.__li;
  }
  recallSavedValue(gui, controller);
  dom.addClass(controller.domElement, 'c');
  var name = document.createElement('span');
  dom.addClass(name, 'property-name');
  name.innerHTML = controller.property;
  var container = document.createElement('div');
  container.appendChild(name);
  container.appendChild(controller.domElement);
  var li = addRow(gui, container, params.before);
  dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
  if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
  } else {
    dom.addClass(li, _typeof(controller.getValue()));
  }
  augmentController(gui, li, controller);
  gui.__controllers.push(controller);
  return controller;
}
function getLocalStorageHash(gui, key) {
  return document.location.href + '.' + key;
}
function addPresetOption(gui, name, setSelected) {
  var opt = document.createElement('option');
  opt.innerHTML = name;
  opt.value = name;
  gui.__preset_select.appendChild(opt);
  if (setSelected) {
    gui.__preset_select.selectedIndex = gui.__preset_select.length - 1;
  }
}
function showHideExplain(gui, explain) {
  explain.style.display = gui.useLocalStorage ? 'block' : 'none';
}
function addSaveMenu(gui) {
  var div = gui.__save_row = document.createElement('li');
  dom.addClass(gui.domElement, 'has-save');
  gui.__ul.insertBefore(div, gui.__ul.firstChild);
  dom.addClass(div, 'save-row');
  var gears = document.createElement('span');
  gears.innerHTML = '&nbsp;';
  dom.addClass(gears, 'button gears');
  var button = document.createElement('span');
  button.innerHTML = 'Save';
  dom.addClass(button, 'button');
  dom.addClass(button, 'save');
  var button2 = document.createElement('span');
  button2.innerHTML = 'New';
  dom.addClass(button2, 'button');
  dom.addClass(button2, 'save-as');
  var button3 = document.createElement('span');
  button3.innerHTML = 'Revert';
  dom.addClass(button3, 'button');
  dom.addClass(button3, 'revert');
  var select = gui.__preset_select = document.createElement('select');
  if (gui.load && gui.load.remembered) {
    Common.each(gui.load.remembered, function (value, key) {
      addPresetOption(gui, key, key === gui.preset);
    });
  } else {
    addPresetOption(gui, DEFAULT_DEFAULT_PRESET_NAME, false);
  }
  dom.bind(select, 'change', function () {
    for (var index = 0; index < gui.__preset_select.length; index++) {
      gui.__preset_select[index].innerHTML = gui.__preset_select[index].value;
    }
    gui.preset = this.value;
  });
  div.appendChild(select);
  div.appendChild(gears);
  div.appendChild(button);
  div.appendChild(button2);
  div.appendChild(button3);
  if (SUPPORTS_LOCAL_STORAGE) {
    var explain = document.getElementById('dg-local-explain');
    var localStorageCheckBox = document.getElementById('dg-local-storage');
    var saveLocally = document.getElementById('dg-save-locally');
    saveLocally.style.display = 'block';
    if (localStorage.getItem(getLocalStorageHash(gui, 'isLocal')) === 'true') {
      localStorageCheckBox.setAttribute('checked', 'checked');
    }
    showHideExplain(gui, explain);
    dom.bind(localStorageCheckBox, 'change', function () {
      gui.useLocalStorage = !gui.useLocalStorage;
      showHideExplain(gui, explain);
    });
  }
  var newConstructorTextArea = document.getElementById('dg-new-constructor');
  dom.bind(newConstructorTextArea, 'keydown', function (e) {
    if (e.metaKey && (e.which === 67 || e.keyCode === 67)) {
      SAVE_DIALOGUE.hide();
    }
  });
  dom.bind(gears, 'click', function () {
    newConstructorTextArea.innerHTML = JSON.stringify(gui.getSaveObject(), undefined, 2);
    SAVE_DIALOGUE.show();
    newConstructorTextArea.focus();
    newConstructorTextArea.select();
  });
  dom.bind(button, 'click', function () {
    gui.save();
  });
  dom.bind(button2, 'click', function () {
    var presetName = prompt('Enter a new preset name.');
    if (presetName) {
      gui.saveAs(presetName);
    }
  });
  dom.bind(button3, 'click', function () {
    gui.revert();
  });
}
function addResizeHandle(gui) {
  var pmouseX = void 0;
  gui.__resize_handle = document.createElement('div');
  Common.extend(gui.__resize_handle.style, {
    width: '6px',
    marginLeft: '-3px',
    height: '200px',
    cursor: 'ew-resize',
    position: 'absolute'
  });
  function drag(e) {
    e.preventDefault();
    gui.width += pmouseX - e.clientX;
    gui.onResize();
    pmouseX = e.clientX;
    return false;
  }
  function dragStop() {
    dom.removeClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.unbind(window, 'mousemove', drag);
    dom.unbind(window, 'mouseup', dragStop);
  }
  function dragStart(e) {
    e.preventDefault();
    pmouseX = e.clientX;
    dom.addClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.bind(window, 'mousemove', drag);
    dom.bind(window, 'mouseup', dragStop);
    return false;
  }
  dom.bind(gui.__resize_handle, 'mousedown', dragStart);
  dom.bind(gui.__closeButton, 'mousedown', dragStart);
  gui.domElement.insertBefore(gui.__resize_handle, gui.domElement.firstElementChild);
}
function setWidth(gui, w) {
  gui.domElement.style.width = w + 'px';
  if (gui.__save_row && gui.autoPlace) {
    gui.__save_row.style.width = w + 'px';
  }
  if (gui.__closeButton) {
    gui.__closeButton.style.width = w + 'px';
  }
}
function getCurrentPreset(gui, useInitialValues) {
  var toReturn = {};
  Common.each(gui.__rememberedObjects, function (val, index) {
    var savedValues = {};
    var controllerMap = gui.__rememberedObjectIndecesToControllers[index];
    Common.each(controllerMap, function (controller, property) {
      savedValues[property] = useInitialValues ? controller.initialValue : controller.getValue();
    });
    toReturn[index] = savedValues;
  });
  return toReturn;
}
function setPresetSelectIndex(gui) {
  for (var index = 0; index < gui.__preset_select.length; index++) {
    if (gui.__preset_select[index].value === gui.preset) {
      gui.__preset_select.selectedIndex = index;
    }
  }
}
function updateDisplays(controllerArray) {
  if (controllerArray.length !== 0) {
    requestAnimationFrame$1.call(window, function () {
      updateDisplays(controllerArray);
    });
  }
  Common.each(controllerArray, function (c) {
    c.updateDisplay();
  });
}

var color = {
  Color: Color,
  math: ColorMath,
  interpret: interpret
};
var controllers = {
  Controller: Controller,
  BooleanController: BooleanController,
  OptionController: OptionController,
  StringController: StringController,
  NumberController: NumberController,
  NumberControllerBox: NumberControllerBox,
  NumberControllerSlider: NumberControllerSlider,
  FunctionController: FunctionController,
  ColorController: ColorController
};
var dom$1 = { dom: dom };
var gui = { GUI: GUI };
var GUI$1 = GUI;
var index = {
  color: color,
  controllers: controllers,
  dom: dom$1,
  gui: gui,
  GUI: GUI$1
};

exports.color = color;
exports.controllers = controllers;
exports.dom = dom$1;
exports.gui = gui;
exports.GUI = GUI$1;
exports['default'] = index;

Object.defineProperty(exports, '__esModule', { value: true });

})));


},{}]},{},[2]);
