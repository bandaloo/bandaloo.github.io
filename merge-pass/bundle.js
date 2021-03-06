(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBuilder = exports.channelSamplerName = void 0;
const expr_1 = require("./exprs/expr");
const webglprogramloop_1 = require("./webglprogramloop");
const settings_1 = require("./settings");
/** @ignore */
const FRAG_SET = `  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);\n`;
/** @ignore */
const SCENE_SET = `uniform sampler2D uSceneSampler;\n`;
/** @ignore */
const TIME_SET = `uniform mediump float uTime;\n`;
/** @ignore */
const MOUSE_SET = `uniform mediump vec2 uMouse;\n`;
/** @ignore */
const COUNT_SET = `uniform int uCount;\n`;
/** @ignore */
const BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump vec2 uResolution;\n`;
/**
 * returns the string name of the sampler uniform for code generation purposes
 * @param num channel number to sample from
 */
function channelSamplerName(num) {
    // texture 2 sampler has number 0 (0 and 1 are used for back buffer and scene)
    return `uBufferSampler${num}`;
}
exports.channelSamplerName = channelSamplerName;
/**
 * returns the string of the declaration of the sampler for code generation
 * purposes
 * @param num channel number to sample from
 */
function channelSamplerDeclaration(num) {
    return `uniform sampler2D ${channelSamplerName(num)};`;
}
/** class that manages generation and compilation of GLSL code */
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
            // update me on change to needs
            needs: {
                centerSample: false,
                neighborSample: false,
                sceneBuffer: false,
                timeUniform: false,
                mouseUniform: false,
                passCount: false,
                extraBuffers: new Set(),
            },
        };
        this.addEffectLoop(effectLoop, 1, buildInfo);
        // add all the types to uniform declarations from the `BuildInfo` instance
        for (const name in buildInfo.uniformTypes) {
            const typeName = buildInfo.uniformTypes[name];
            this.uniformDeclarations.add(`uniform mediump ${typeName} ${name};`);
        }
        // add all external functions from the `BuildInfo` instance
        buildInfo.externalFuncs.forEach((func) => this.externalFuncs.add(func));
        this.totalNeeds = buildInfo.needs;
        this.exprs = buildInfo.exprs;
    }
    addEffectLoop(effectLoop, indentLevel, buildInfo, topLevel = true) {
        const needsLoop = !topLevel && effectLoop.loopInfo.num > 1;
        if (needsLoop) {
            const iName = "i" + this.counter;
            indentLevel++;
            const forStart = "  ".repeat(indentLevel - 1) +
                `for (int ${iName} = 0; ${iName} < ${effectLoop.loopInfo.num}; ${iName}++) {`;
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
    /** generate the code and compile the program into a loop */
    compileProgram(gl, vShader, uniformLocs, shaders = []) {
        // set up the fragment shader
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (fShader === null) {
            throw new Error("problem creating fragment shader");
        }
        const fullCode = BOILERPLATE +
            (this.totalNeeds.sceneBuffer ? SCENE_SET : "") +
            (this.totalNeeds.timeUniform ? TIME_SET : "") +
            (this.totalNeeds.mouseUniform ? MOUSE_SET : "") +
            (this.totalNeeds.passCount ? COUNT_SET : "") +
            Array.from(this.totalNeeds.extraBuffers)
                .map((n) => channelSamplerDeclaration(n))
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
        if (settings_1.settings.verbosity > 0)
            console.log(fullCode);
        gl.shaderSource(fShader, fullCode);
        gl.compileShader(fShader);
        // set up the program
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("problem creating program");
        }
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        shaders.push(fShader);
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
            const location = gl.getUniformLocation(program, channelSamplerName(b));
            // offset the texture location by 2 (0 and 1 are used for scene and original)
            gl.uniform1i(location, b + 2);
        }
        // TODO do we need to do this every time?
        // get attribute
        const position = gl.getAttribLocation(program, "aPosition");
        // enable the attribute
        gl.enableVertexAttribArray(position);
        // points to the vertices in the last bound array buffer
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        return new webglprogramloop_1.WebGLProgramLoop(new webglprogramloop_1.WebGLProgramLeaf(program, this.totalNeeds, this.exprs), this.baseLoop.loopInfo, gl);
    }
}
exports.CodeBuilder = CodeBuilder;

},{"./exprs/expr":16,"./settings":55,"./webglprogramloop":57}],2:[function(require,module,exports){
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
/**
 * @packageDocumentation
 * @ignore
 */
const dat = __importStar(require("dat.gui"));
const MP = __importStar(require("./index"));
const slow = false;
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
        const lenExpr = MP.op(MP.len(MP.center()), "*", 3);
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
        // note: we're using two channels here even though we don't need to
        const merger = new MP.Merger([
            MP.loop([
                MP.input(),
                MP.loop([
                    MP.gauss(MP.vec2(1, 0)),
                    MP.gauss(MP.vec2(0, 1)),
                    MP.brightness(0.15),
                    MP.contrast(1.2),
                ], 4).target(0),
                MP.brightness(-0.3),
                MP.op(MP.fcolor(), "+", MP.input()),
            ]).target(0),
            MP.loop([MP.op(MP.op(MP.channel(0), "+", MP.fcolor()), "/", 2)]).target(1),
            MP.channel(1),
        ], sourceCanvas, gl, { channels: [null, null] });
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
            MP.grain((m = MP.op(MP.len(MP.op(MP.center(), "+", (vec = MP.vec2(MP.mut(0), 0)))), "*", MP.mut(0.3)))),
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
        const merger = new MP.Merger([MP.changecomp(MP.fcolor(), MP.vec2(0, 0), "gb")], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    redzero: () => {
        const merger = new MP.Merger([MP.changecomp(MP.fcolor(), 0, "r")], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    redgreenswap: () => {
        const merger = new MP.Merger([MP.changecomp(MP.fcolor(), MP.get2comp(MP.fcolor(), "gr"), "rg")], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    ternary: () => {
        const merger = new MP.Merger([
            MP.ternary([MP.a1("sin", MP.time()), MP.a1("cos", MP.time())], MP.changecomp(MP.fcolor(), MP.get2comp(MP.fcolor(), "gr"), "rg"), MP.changecomp(MP.fcolor(), MP.get2comp(MP.fcolor(), "gr"), "rb")),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    region: (channels = []) => {
        const offset = MP.op(MP.a1("sin", MP.time()), "/", 5);
        const merger = new MP.Merger([
            MP.region([MP.op(offset, "+", 0.2), 0.2, MP.op(offset, "+", 0.8), 0.8], MP.loop([
                MP.blur2d(),
                MP.edge("dark"),
                MP.brightness(MP.getcomp(MP.channel(0), "r")),
                MP.region([0.3, 0.3, 0.7, 0.7], MP.loop([MP.blur2d(), MP.brightness(-0.5)]), MP.fcolor()),
            ]), MP.brightness(-0.2)),
        ], sourceCanvas, gl, { channels: channels });
        return {
            merger: merger,
            change: () => { },
        };
    },
    channelregion: (channels = []) => {
        const merger = new MP.Merger([
            MP.region(MP.getcomp(MP.channel(0), "r"), MP.loop([MP.blur2d(), MP.brightness(0.1)]), MP.brightness(-0.3, MP.edge("dark"))),
            MP.fxaa(),
        ], sourceCanvas, gl, { channels: channels });
        return {
            merger: merger,
            change: () => { },
        };
    },
    loopregion: (channels = []) => {
        const merger = new MP.Merger([
            MP.region(MP.getcomp(MP.channel(0), "r"), MP.loop([MP.blur2d(), MP.brightness(0.3)]), MP.loop([MP.blur2d(3, 3), MP.brightness(-0.5), MP.edge("light")]), true),
        ], sourceCanvas, gl, { channels: channels });
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
            MP.brightness(MP.op(MP.op(-1, "*", MP.a2("pow", MP.a1("cos", MP.op(MP.getcomp(MP.pos(), "y"), "*", (260 / 2) * Math.PI)), 6)), "-", MP.op(1, "*", MP.op(MP.a2("pow", MP.getcomp(MP.op(MP.center(), "*", 2), "x"), 4), "+", MP.a2("pow", MP.getcomp(MP.op(MP.center(), "*", 2), "y"), 4))))),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    fxaa: () => {
        const merger = new MP.Merger([MP.loop([MP.fxaa()], 3)], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    channelblur: (channels = []) => {
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
        ], sourceCanvas, gl, { channels: channels });
        return {
            merger: merger,
            change: () => { },
        };
    },
    buffereyesore: (channels = []) => {
        const merger = new MP.Merger([
            MP.blur2d(1, 1).target(1),
            MP.blur2d(16, 16).target(0),
            MP.hsv2rgb(MP.changecomp(MP.rgb2hsv(MP.input()), MP.vec2(MP.getcomp(MP.channel(0), "x"), MP.getcomp(MP.channel(1), "x")), "xy", "+")),
        ], sourceCanvas, gl, { channels: channels });
        return {
            merger: merger,
            change: () => { },
        };
    },
    motionblur: (channels = []) => {
        const grainy = MP.brightness(MP.op(MP.random(MP.op(MP.pixel(), "+", MP.time())), "/", 4));
        class MotionControls {
            constructor() {
                this.persistence = 0.3;
            }
        }
        const controls = new MotionControls();
        const gui = new dat.GUI();
        gui.add(controls, "persistence", 0.1, 0.9, 0.01);
        let m;
        const merger = new MP.Merger([MP.blur2d(1, 1), (m = MP.motionblur(0)), grainy], sourceCanvas, gl, { channels: [null] });
        return {
            merger: merger,
            change: () => {
                m.setPersistence(controls.persistence);
            },
        };
    },
    basicdof: (channels = []) => {
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
        ], sourceCanvas, gl, { channels: channels });
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
                    newColor: MP.mut(MP.pvec4(1, 1, 1, 1)),
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
                this.red = 1;
                this.green = 1;
                this.blue = 1;
            }
        }
        const controls = new LocationControls();
        const gui = new dat.GUI();
        gui.add(controls, "location", -1, 1, 0.01);
        gui.add(controls, "exposure", 0, 1, 0.01);
        gui.add(controls, "decay", 0.9, 1, 0.001);
        gui.add(controls, "density", 0, 1, 0.01);
        gui.add(controls, "weight", 0, 0.02, 0.001);
        gui.add(controls, "red", 0, 1, 0.01);
        gui.add(controls, "green", 0, 1, 0.01);
        gui.add(controls, "blue", 0, 1, 0.01);
        return {
            merger: merger,
            change: () => {
                godrays.setLightPos(MP.pvec2(0.5 + -controls.location / 5, 0.5));
                godrays.setExposure(controls.exposure);
                godrays.setDecay(controls.decay);
                godrays.setDensity(controls.density);
                godrays.setWeight(controls.weight);
                godrays.setNewColor(MP.pvec4(controls.red, controls.green, controls.blue, 1));
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
        const merger = new MP.Merger([
            MP.input(MP.changecomp(MP.pos(), MP.op(MP.op(MP.op(0.5, "+", MP.op(0.5, "*", MP.a1("cos", MP.time()))), "*", 0.3), "*", MP.a1("cos", MP.op(MP.getcomp(MP.pos(), "x"), "*", 3 * Math.PI))), "x", "+")),
            MP.fxaa(),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    swirl: () => {
        const vec = MP.nmouse();
        const dist = MP.op(MP.len(MP.op(MP.pos(), "-", vec)), "*", 99);
        const angle = MP.op(MP.op(1, "/", MP.op(1, "+", dist)), "*", 20);
        const centered = MP.translate(MP.pos(), MP.op(vec, "*", -1));
        const rot = MP.rotate(centered, angle);
        const reverted = MP.translate(rot, vec);
        const merger = new MP.Merger([MP.input(reverted)], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    perlin: () => {
        const merger = new MP.Merger([
            MP.brightness(MP.perlin(MP.op(MP.op(MP.pos(), "+", MP.op(MP.time(), "/", 9)), "*", MP.op(MP.resolution(), "/", 99)))),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    fractalize: () => {
        const offset = MP.vec2(3, 3);
        const merger = new MP.Merger([
            MP.brightness(MP.op(MP.fractalize(MP.op(MP.op(offset, "+", MP.pos()), "*", 3), 6, MP.simplex), "/", 6)),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: () => { },
        };
    },
    dictionary: () => {
        const merger = new MP.Merger(new MP.EffectDictionary({
            default: [MP.brightness(0.3)],
            darken: [MP.brightness(-0.3)],
        }), sourceCanvas, gl);
        class ChangeControls {
            constructor() {
                this.brighten = () => {
                    merger.changeProgram("default");
                };
                this.darken = () => {
                    merger.changeProgram("darken");
                };
            }
        }
        const controls = new ChangeControls();
        const gui = new dat.GUI();
        gui.add(controls, "brighten");
        gui.add(controls, "darken");
        return {
            merger: merger,
            change: () => { },
        };
    },
    noisegodrays: (channels = []) => {
        const fog = MP.op(MP.op(MP.simplex(MP.op(MP.op(MP.pos(), "+", MP.op(MP.time(), "/", 100)), "*", MP.op(MP.resolution(), "/", 200))), "*", MP.simplex(MP.op(MP.op(MP.pos(), "+", MP.op(MP.time(), "/", -200)), "*", MP.op(MP.resolution(), "/", 400)))), "*", 0.5);
        const merger = new MP.Merger([
            MP.godrays({
                lightPos: MP.op(MP.mouse(), "/", MP.resolution()),
                weight: 0.009,
                density: MP.op(0.2, "+", MP.op(fog, "*", 0.5)),
            }),
        ], sourceCanvas, gl, {
            channels: channels,
        });
        return {
            merger: merger,
            change: () => { },
        };
    },
    custom: (channels = []) => {
        const c = MP.cfloat(MP.tag `${MP.mut(0.2, "uScalar")} * -(${MP.channel(1)}.r * ${MP.channel(0)}.r)`);
        const merger = new MP.Merger([MP.brightness(c)], sourceCanvas, gl, {
            channels: channels,
        });
        class ScalarControls {
            constructor() {
                this.scalar = 0.3;
            }
        }
        const controls = new ScalarControls();
        const gui = new dat.GUI();
        gui.add(controls, "scalar", 0, 1.0, 0.01);
        return {
            merger: merger,
            change: () => {
                c.setUniform("uScalar", controls.scalar);
            },
        };
    },
    bloom: (channels = []) => {
        const bloom = MP.bloom();
        const merger = new MP.Merger([MP.edgecolor(MP.vec4(0, 0, 0.4, 1)), bloom], sourceCanvas, gl, {
            channels: [null, null],
        });
        class BloomControls {
            constructor() {
                this.threshold = 0.4;
                this.boost = 1.3;
                this.horizontal = 1;
                this.vertical = 1;
            }
        }
        const controls = new BloomControls();
        const gui = new dat.GUI();
        gui.add(controls, "threshold", 0, 1.0, 0.01);
        gui.add(controls, "boost", 1.0, 2.0, 0.01);
        gui.add(controls, "horizontal", 0, 2, 0.01);
        gui.add(controls, "vertical", 0, 2, 0.01);
        return {
            merger: merger,
            change: () => {
                bloom.setThreshold(controls.threshold);
                bloom.setBoost(controls.boost);
                bloom.setHorizontal(controls.horizontal);
                bloom.setVertical(controls.vertical);
            },
        };
    },
    sobel: (channels = []) => {
        const merger = new MP.Merger([MP.sobel()], sourceCanvas, gl, {
            channels: [null],
        });
        return {
            merger: merger,
            change: () => { },
        };
    },
    /*
    MP.cvec4(
      // adapted from shadertoy default
      MP.tag`vec4(0.5 + 0.5 * cos(${MP.time()} + ${MP.pos()}.xyx + vec3(0,2,4)), 1.)`
    )
    */
    edgecolor: (channels = []) => {
        let a;
        const merger = new MP.Merger([(a = MP.edgecolor(MP.mut(MP.pvec4(1.0, 1.0, 1.0, 1.0))))], sourceCanvas, gl, { channels: [null] });
        class EdgeControls {
            constructor() {
                this.red = 1.0;
                this.green = 0.0;
                this.blue = 1.0;
            }
        }
        const controls = new EdgeControls();
        const gui = new dat.GUI();
        gui.add(controls, "red", 0.0, 1.0, 0.01);
        gui.add(controls, "green", 0.0, 1.0, 0.01);
        gui.add(controls, "blue", 0.0, 1.0, 0.01);
        return {
            merger: merger,
            change: () => {
                a.setColor(MP.pvec4(controls.red, controls.green, controls.blue, 1));
            },
        };
    },
    depthedge: (channels = []) => {
        const edge = MP.edge(MP.mut(1.0), 0);
        const merger = new MP.Merger([MP.blur2d(1, 1, 13), edge], sourceCanvas, gl, { channels: channels });
        class EdgeControls {
            constructor() {
                this.color = 1.0;
            }
        }
        const controls = new EdgeControls();
        const gui = new dat.GUI();
        gui.add(controls, "color", -1.0, 1.0, 0.01);
        return {
            merger: merger,
            change: () => {
                edge.setMult(controls.color);
            },
        };
    },
};
// canvas drawing loops
const stripes = (t, frames) => {
    if (frames === 0) {
        x.fillStyle = "black";
        x.fillRect(0, 0, 960, 540);
        x.font = "99px Helvetica, sans-serif";
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
const higherOrderSpiral = (dots, background, num = 50, size = 1, speed = 1) => (t, frames) => {
    x.fillStyle = R(...background);
    x.fillRect(0, 0, 960, 540);
    let d;
    for (let i = num; (i -= 0.5); i > 0) {
        x.beginPath();
        d = 2 * C((2 + S(t / 99)) * 2 * i * speed);
        x.arc(480 + d * 10 * C(i) * i, 270 + d * 9 * S(i) * i, i * size, 0, 44 / 7);
        const fade = i / num;
        x.fillStyle = R(dots[0] * fade, dots[1] * fade, dots[2] * fade);
        x.fill();
    }
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
const higherOrderDonuts = (color = true, extra = 0) => {
    const rFunc = (i, j) => 255 * ~~((1 + 3 * C(i / (99 + 20 * C(j / 5))) * S(j / 2)) % 2);
    const fillFunc = !color
        ? (i, j) => {
            let r = 255 - rFunc(i, j);
            return R(r, r, r);
        }
        : (i, j) => {
            let r = rFunc(i, j);
            return r > 0
                ? R(r / 4, extra)
                : R(extra, 0, 99 * C(i / 10) * S(j / 2) + 30);
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
const bloomTest = (t, frames) => {
    const hsize = 32;
    const spacing = 100;
    x.fillStyle = "black";
    x.fillRect(0, 0, 960, 540);
    const num = 8;
    for (let i = 0; i < num; i++) {
        const c = 254 / (i + 1) + 1;
        const position = spacing * i - (spacing * (num - 1)) / 2;
        x.fillStyle = R(c, c, c);
        x.fillRect(960 / 2 - hsize + position, 540 / 2 - hsize, hsize * 2, hsize * 2);
    }
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
    buffereyesore: [
        higherOrderWaves(true),
        higherOrderWaves(false),
        bitwiseGrid(),
    ],
    //motionblur: [higherOrderSpiral([101, 8, 252], [242, 128, 7], 25, 2, 3)],
    motionblur: [higherOrderSpiral([40, 40, 40], [0, 235, 145], 25, 2, 3)],
    basicdof: [higherOrderPerspective(true), higherOrderPerspective(false)],
    lineardof: [
        higherOrderPerspective(true),
        higherOrderPerspective(false, false),
    ],
    lightbands: [higherOrderPerspective(true), higherOrderPerspective(false)],
    depthgodrays: [higherOrderPerspective(true), higherOrderPerspective(false)],
    mousegodrays: [higherOrderDonuts(true), higherOrderDonuts(false)],
    mitosis: [uncommonCheckerboard],
    swirl: [stripes],
    perlin: [stripes],
    fractalize: [stripes],
    dictionary: [movingGrid],
    noisegodrays: [higherOrderDonuts(true, 150), higherOrderDonuts(false, 10)],
    custom: [higherOrderWaves(true), higherOrderWaves(false), bitwiseGrid()],
    bloom: [bloomTest],
    sobel: [redSpiral],
    edgecolor: [redSpiral],
    depthedge: [higherOrderPerspective(true), higherOrderPerspective(false)],
    ternary: [stripes],
    region: [stripes, vectorSpiral],
    channelregion: [stripes, higherOrderSpiral([255, 0, 0], [0, 0, 0])],
    loopregion: [stripes, higherOrderSpiral([255, 0, 0], [0, 0, 0])],
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
    buffereyesore: "you can use <code>target</code> to do effect loops on specific channels",
    motionblur: "if you want to use one of the channels as an acccumulation buffer you can <code>target</code>, " +
        "then make that element in the <code>channels</code> array <code>null</code>. " +
        "the <code>motionblur</code> effect will blend the current frame with the previous frames " +
        "to create a simple motion blur effect. effects placed after <code>motionblur</code> will " +
        "will not be copied over to the accumulation buffer",
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
    swirl: "this distortion is done with rotations and translations based on the distance " +
        "from the mouse position",
    perlin: "you can use <code>perlin</code> to create a variety of different effects. " +
        "<code>resolution</code> is used to scale the noise based on the aspect ratio " +
        "so it doesn't appear stretched",
    fractalize: "<code>fractalize</code> will take a function that takes a position and a float, " +
        "and will repeatedly sum calls to it with doubling frequency and halving amplitude. " +
        "it works well with <code>perlin</code> and <code>simplex</code>. adding an offset " +
        "prevents it from looking like the noise is scaling from the corner",
    dictionary: "you can pass in an <code>EffectDictionary</code> to create multiple compiled program loops " +
        'which you can switch between with <code>merger.changeProgram("effectName")</code>. ' +
        'you must have one with the name <code>"default"</code>, which will be the currently enabled ' +
        "program loop",
    depthedge: "you can sample from the depth buffer with <code>edge</code> by " +
        "passing in a different sampler number. you can create a pretty intereesting " +
        "effect by blurring the scene buffer and then tracing edges from the depth buffer. " +
        "with this method, the outlines naturally get thinner in the distance. " +
        "you can also shift from light edges to dark edges at runtime with <code>setMult</code>",
    ternary: "you can use <code>ternary</code> expressions. if all the floats you pass in as the first argument " +
        "are all greater than zero, then the expression evaluates to the second argument. else, " +
        "it evaluates to the third argument. this also works with a single float instead of a list of floats",
    region: "<code>region</code> allows you to restrict an effect to an area of the screen. " +
        "this can even be done with loops. regions can also contain nested regions, which " +
        "become obscured by the boundaries of the outer region.",
    loopregion: "a region can contain loops on one side or both",
    channelregion: "instead of a rectangular region, you can pass in any float expression. " +
        "if that expression evaluates to a number > 0, then it is inside, and outside otherwise. " +
        "you can invert the region by passing in <code>true</code> as the fourth and final argument. " +
        "this is also true for normal, rectangular regions. " +
        "unlike rectangular regions, texture lookups won't be clamped to inside the region.",
    bloom: "this effect requires a temporary texture. the default assumes it is in channel 1 " +
        "(since you might already have a depth texture in channel 0.) this can be changed with " +
        "the fifth parameter <code>samplerNum</code> (not used in this example)",
};
const canvases = [sourceCanvas];
const contexts = [source];
let demo;
let key;
window.addEventListener("load", () => {
    var _a, _b;
    MP.settings.verbosity = 1;
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
    key = mstr;
    demo = demos[key](canvases.slice(1));
    if (demo === undefined)
        throw new Error("merger not found");
    document.getElementById("title").innerText =
        "merge-pass demo: " + mstr;
    // unindent code string
    // only replace leading spaces with nbsp
    let codeStr = (" ".repeat(4) + demos[mstr])
        .split("\n")
        .map((l) => l.substr(4))
        .join("\n")
        .replace(/ /g, "&nbsp");
    const codeElem = document.getElementById("mergercode");
    const reg = /Merger([\s\S]*?);/g;
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
        !slow ? requestAnimationFrame(step) : setTimeout(step, 1000);
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
// used to test destruction and creation of merger
// uncomment to test destruction and creation of merger
/*
function destroyAndCreate(str: string) {
  demo.merger.delete();
  console.log("deleted old merger");
  demo = demos[str](canvases.slice(1));
  if (demo === undefined) throw new Error("merger not found");
  console.log("created another merger");
}

setTimeout(() => destroyAndCreate("redgreenswap"), 2000);
*/

},{"./index":53,"dat.gui":58}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a1 = exports.Arity1HomogenousExpr = void 0;
const expr_1 = require("./expr");
/** @ignore */
function genArity1SourceList(name, val) {
    return {
        sections: [name + "(", ")"],
        values: [val],
    };
}
/** arity 1 homogenous function expression */
class Arity1HomogenousExpr extends expr_1.Operator {
    constructor(val, operation) {
        super(val, genArity1SourceList(operation, val), ["uVal"]);
        this.val = val;
    }
    /** set the value being passed into the arity 1 homogenous function */
    setVal(val) {
        this.setUniform("uVal" + this.id, val);
        this.val = expr_1.wrapInValue(val);
    }
}
exports.Arity1HomogenousExpr = Arity1HomogenousExpr;
/**
 * built-in functions that take in one `genType x` and return a `genType x`
 * @param name function name (see [[Arity1HomogenousName]] for valid function names)
 * @param val the `genType x` argument
 */
function a1(name, val) {
    return new Arity1HomogenousExpr(expr_1.wrapInValue(val), name);
}
exports.a1 = a1;

},{"./expr":16}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a2 = exports.Arity2HomogenousExpr = void 0;
const expr_1 = require("./expr");
/** @ignore */
function genArity1SourceList(name, val1, val2) {
    return {
        sections: [name + "(", ",", ")"],
        values: [val1, val2],
    };
}
/** arity 2 homogenous function expression */
class Arity2HomogenousExpr extends expr_1.Operator {
    constructor(name, val1, val2) {
        super(val1, genArity1SourceList(name, val1, val2), ["uVal1", "uVal2"]);
        this.val1 = val1;
        this.val2 = val2;
    }
    /** set the first value being passed into the arity 2 homogenous function */
    setFirstVal(val1) {
        this.setUniform("uVal1" + this.id, val1);
        this.val1 = expr_1.wrapInValue(val1);
    }
    /** set the second value being passed into the arity 2 homogenous function */
    setSecondVal(val2) {
        this.setUniform("uVal2" + this.id, val2);
        this.val2 = expr_1.wrapInValue(val2);
    }
}
exports.Arity2HomogenousExpr = Arity2HomogenousExpr;
// implementation
/**
 * built-in functions that take in two `genType x` arguments and return a `genType x`
 * @param name function name (see [[Arity2HomogenousName]] for valid function names)
 * @param val1 the first `genType x` argument
 * @param val2 the second `genType x` argument
 */
function a2(name, val1, val2) {
    return new Arity2HomogenousExpr(name, expr_1.wrapInValue(val1), expr_1.wrapInValue(val2));
}
exports.a2 = a2;

},{"./expr":16}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloom = exports.BloomLoop = void 0;
const mergepass_1 = require("../mergepass");
const arity2_1 = require("./arity2");
const blurexpr_1 = require("./blurexpr");
const brightnessexpr_1 = require("./brightnessexpr");
const channelsampleexpr_1 = require("./channelsampleexpr");
const contrastexpr_1 = require("./contrastexpr");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const opexpr_1 = require("./opexpr");
const vecexprs_1 = require("./vecexprs");
// TODO bloom uses `input` so it has to be the first
// TODO maybe a way to update the scene buffer?
/** bloom loop */
class BloomLoop extends mergepass_1.EffectLoop {
    constructor(threshold = expr_1.float(expr_1.mut(0.4)), horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), boost = expr_1.float(expr_1.mut(1.3)), samplerNum = 1, taps = 9, reps = 3) {
        const bright = expr_1.cfloat(expr_1.tag `((${channelsampleexpr_1.channel(samplerNum)}.r + ${channelsampleexpr_1.channel(samplerNum)}.g + ${channelsampleexpr_1.channel(samplerNum)}.b) / 3.)`);
        const step = arity2_1.a2("step", bright, threshold);
        const col = expr_1.cvec4(expr_1.tag `vec4(${channelsampleexpr_1.channel(samplerNum)}.rgb * (1. - ${step}), 1.)`);
        const list = [
            mergepass_1.loop([col]).target(samplerNum),
            mergepass_1.loop([
                blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps),
                blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps),
                brightnessexpr_1.brightness(0.1),
                contrastexpr_1.contrast(boost),
            ], reps).target(samplerNum),
            opexpr_1.op(fragcolorexpr_1.fcolor(), "+", channelsampleexpr_1.channel(samplerNum)),
        ];
        super(list, { num: 1 });
        this.threshold = threshold;
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.boost = boost;
    }
    /**
     * set the horizontal stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setHorizontal(num) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(num);
    }
    /**
     * set the vertical stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setVertical(num) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(num);
    }
    /** set the treshold */
    setThreshold(num) {
        if (!(this.threshold instanceof expr_1.BasicFloat))
            throw new Error("threshold expression not basic float");
        this.threshold.setVal(num);
    }
    /** set the contrast boost */
    setBoost(num) {
        if (!(this.boost instanceof expr_1.BasicFloat))
            throw new Error("boost expression not basic float");
        this.boost.setVal(num);
    }
}
exports.BloomLoop = BloomLoop;
/**
 * creates a bloom loop
 * @param threshold values below this brightness don't get blurred (0.4 is
 * about reasonable, which is also the default)
 * @param horizontal how much to blur vertically (defaults to 1 pixel)
 * @param vertical how much to blur horizontally (defaults to 1 pixel)
 * @param taps how many taps for the blur (defaults to 9)
 * @param reps how many times to loop the blur (defaults to 3)
 */
function bloom(threshold, horizontal, vertical, boost, samplerNum, taps, reps) {
    return new BloomLoop(expr_1.wrapInValue(threshold), expr_1.wrapInValue(horizontal), expr_1.wrapInValue(vertical), expr_1.wrapInValue(boost), samplerNum, taps, reps);
}
exports.bloom = bloom;

},{"../mergepass":54,"./arity2":4,"./blurexpr":7,"./brightnessexpr":8,"./channelsampleexpr":10,"./contrastexpr":11,"./expr":16,"./fragcolorexpr":17,"./opexpr":34,"./vecexprs":50}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur2d = exports.Blur2dLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
/** 2D blur loop */
class Blur2dLoop extends mergepass_1.EffectLoop {
    constructor(horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), reps = 2, taps, samplerNum) {
        const side = blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps, samplerNum);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps, samplerNum);
        super([side, up], { num: reps });
        this.horizontal = horizontal;
        this.vertical = vertical;
    }
    /**
     * set the horizontal stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setHorizontal(num) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(num);
    }
    /**
     * set the vertical stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setVertical(num) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(num);
    }
}
exports.Blur2dLoop = Blur2dLoop;
/**
 * creates a loop that runs a horizontal, then vertical gaussian blur (anything
 * more than 1 pixel in the horizontal or vertical direction will create a
 * ghosting effect, which is usually not desirable)
 * @param horizontalExpr float for the horizontal blur (1 pixel default)
 * @param verticalExpr float for the vertical blur (1 pixel default)
 * @param reps how many passes (defaults to 2)
 * @param taps how many taps (defaults to 5)
 * @param samplerNum change if you want to sample from a different channel and
 * the outer loop has a different target
 */
function blur2d(horizontalExpr, verticalExpr, reps, taps, samplerNum) {
    return new Blur2dLoop(expr_1.wrapInValue(horizontalExpr), expr_1.wrapInValue(verticalExpr), reps, taps, samplerNum);
}
exports.blur2d = blur2d;

},{"../mergepass":54,"./blurexpr":7,"./expr":16,"./vecexprs":50}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gauss = exports.BlurExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** @ignore */
function genBlurSource(direction, taps) {
    return {
        sections: [`gauss${taps}(`, ")"],
        values: [direction],
    };
}
/** @ignore */
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
/** gaussian blur expression */
class BlurExpr extends expr_1.ExprVec4 {
    constructor(direction, taps = 5, samplerNum) {
        // this is already guaranteed by typescript, but creates helpful error for
        // use in gibber or anyone just using javascript
        if (![5, 9, 13].includes(taps)) {
            throw new Error("taps for gauss blur can only be 5, 9 or 13");
        }
        super(genBlurSource(direction, taps), ["uDirection"]);
        this.direction = direction;
        this.externalFuncs = [tapsToFuncSource(taps)];
        this.brandExprWithChannel(0, samplerNum);
    }
    /** set the blur direction (keep magnitude no greater than 1 for best effect) */
    setDirection(direction) {
        this.setUniform("uDirection" + this.id, direction);
        this.direction = direction;
    }
}
exports.BlurExpr = BlurExpr;
/**
 * creates expression that performs one pass of a gaussian blur
 * @param direction direction to blur (keep magnitude less than or equal to 1
 * for best effect)
 * @param taps number of taps (defaults to 5)
 * @param samplerNum which channel to sample from (default 0)
 */
function gauss(direction, taps = 5, samplerNum) {
    return new BlurExpr(direction, taps, samplerNum);
}
exports.gauss = gauss;

},{"../glslfunctions":52,"./expr":16}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brightness = exports.Brightness = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
/** brightness expression */
class Brightness extends expr_1.ExprVec4 {
    constructor(brightness, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `brightness(${brightness}, ${col})`, ["uBrightness", "uColor"]);
        this.brightness = brightness;
        this.externalFuncs = [glslfunctions_1.glslFuncs.brightness];
    }
    /** set the brightness (should probably be between -1 and 1) */
    setBrightness(brightness) {
        this.setUniform("uBrightness" + this.id, brightness);
        this.brightness = expr_1.wrapInValue(brightness);
    }
}
exports.Brightness = Brightness;
/**
 * changes the brightness of a color
 * @param val float for how much to change the brightness by (should probably be
 * between -1 and 1)
 * @param col the color to increase the brightness of (defaults to current
 * fragment color)
 */
function brightness(val, col) {
    return new Brightness(expr_1.wrapInValue(val), col);
}
exports.brightness = brightness;

},{"../glslfunctions":52,"./expr":16,"./fragcolorexpr":17}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changecomp = exports.ChangeCompExpr = void 0;
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
/** @ignore */
function getChangeFunc(typ, id, setter, comps, op = "") {
    return `${typ} changecomp_${id}(${typ} col, ${setter.typeString()} setter) {
  col.${comps} ${op}= setter;
  return col;
}`;
}
/**
 * throws a runtime error if component access is not valid, and disallows
 * duplicate components because duplicate components can not be in a left
 * expression. (for example `v.xyx = vec3(1., 2., 3.)` is illegal, but `v1.xyz
 * = v2.xyx` is legal.) also checks for type errors such as `v1.xy = vec3(1.,
 * 2., 3.)`; the right hand side can only be a `vec2` if only two components
 * are supplied
 * @param comps component string
 * @param setter how the components are being changed
 * @param vec the vector where components are being accessed
 */
function checkChangeComponents(comps, setter, vec) {
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
/** @ignore */
function duplicateComponents(comps) {
    return new Set(comps.split("")).size !== comps.length;
}
/** change component expression */
class ChangeCompExpr extends expr_1.Operator {
    constructor(vec, setter, comps, op) {
        checkChangeComponents(comps, setter, vec);
        // part of name of custom function
        const suffix = `${vec.typeString()}_${setter.typeString()}_${comps}`;
        super(vec, { sections: [`changecomp_${suffix}(`, ", ", ")"], values: [vec, setter] }, ["uOriginal", "uNew"]);
        this.originalVec = vec;
        this.newVal = setter;
        this.externalFuncs = [
            getChangeFunc(vec.typeString(), suffix, setter, comps, op),
        ];
    }
    /** set the original vector */
    setOriginal(originalVec) {
        this.setUniform("uOriginal" + this.id, originalVec);
        this.originalVec = originalVec;
    }
    /** set the neww vector */
    setNew(newVal) {
        this.setUniform("uNew" + this.id, newVal);
        this.newVal = expr_1.wrapInValue(newVal);
    }
}
exports.ChangeCompExpr = ChangeCompExpr;
/**
 * change the components of a vector
 * @param vec the vector to augment components of
 * @param setter the vector (or float, if only one component is changed) for
 * how to change the components
 * @param comps string representing the components to change (e.g. `"xy"` or
 * `"r"` or `"stpq"`.)
 * @param op optionally perform an operation on the original component
 * (defaults to no operation, just assigning that component to a new value)
 */
function changecomp(vec, setter, comps, op) {
    return new ChangeCompExpr(vec, expr_1.wrapInValue(setter), comps, op);
}
exports.changecomp = changecomp;

},{"./expr":16,"./getcompexpr":21}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channel = exports.ChannelSampleExpr = void 0;
const codebuilder_1 = require("../codebuilder");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
const glslfunctions_1 = require("../glslfunctions");
/** @ignore */
function genChannelSampleSource(buf, coord) {
    return {
        sections: ["channel(", `, ${codebuilder_1.channelSamplerName(buf)})`],
        values: [coord],
    };
}
// TODO create a way to sample but not clamp by region
/** channel sample expression */
class ChannelSampleExpr extends expr_1.ExprVec4 {
    constructor(buf, coord = normfragcoordexpr_1.pos()) {
        super(genChannelSampleSource(buf, coord), ["uVec"]);
        this.coord = coord;
        this.externalFuncs = [glslfunctions_1.glslFuncs.channel];
        this.needs.extraBuffers = new Set([buf]);
    }
    setCoord(coord) {
        this.setUniform("uVec", coord);
        this.coord = coord;
    }
}
exports.ChannelSampleExpr = ChannelSampleExpr;
/**
 * creates an expression that samples from one of the user-defined channels.
 * don't sample from the same channel that you are using [[target]] on in a
 * loop, just use [[fcolor]]
 * @param channel which channel to sample from
 * @param vec where to sample the channel texture (defaults to the normalized
 * frag coord)
 */
function channel(channel, vec) {
    return new ChannelSampleExpr(channel, vec);
}
exports.channel = channel;

},{"../codebuilder":1,"../glslfunctions":52,"./expr":16,"./normfragcoordexpr":32}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contrast = exports.ContrastExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
class ContrastExpr extends expr_1.ExprVec4 {
    constructor(contrast, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `contrast(${contrast}, ${col})`, ["uVal", "uCol"]);
        this.contrast = contrast;
        this.externalFuncs = [glslfunctions_1.glslFuncs.contrast];
    }
    /** sets the contrast */
    setContrast(contrast) {
        this.setUniform("uContrast" + this.id, contrast);
        this.contrast = expr_1.wrapInValue(contrast);
    }
}
exports.ContrastExpr = ContrastExpr;
/**
 * changes the contrast of a color
 * @param val float for how much to change the contrast by (should probably be
 * between -1 and 1)
 * @param col the color to increase the contrast of (defaults to current
 * fragment color)
 */
function contrast(val, col) {
    return new ContrastExpr(expr_1.wrapInValue(val), col);
}
exports.contrast = contrast;

},{"../glslfunctions":52,"./expr":16,"./fragcolorexpr":17}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depth2occlusion = exports.DepthToOcclusionExpr = void 0;
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
/** depth info to occlussion info expression */
class DepthToOcclusionExpr extends expr_1.ExprVec4 {
    constructor(depthCol = channelsampleexpr_1.channel(0), newCol = expr_1.mut(vecexprs_1.pvec4(1, 1, 1, 1)), threshold = expr_1.mut(expr_1.pfloat(0.01))) {
        super(expr_1.tag `depth2occlusion(${depthCol}, ${newCol}, ${threshold})`, [
            "uDepth",
            "uNewCol",
            "uThreshold",
        ]);
        this.depthCol = depthCol;
        this.newCol = newCol;
        this.threshold = threshold;
    }
    setDepthColor(depthCol) {
        this.setUniform("uDepth" + this.id, depthCol);
        this.depthCol = depthCol;
    }
    setNewColor(newCol) {
        this.setUniform("uNewCol" + this.id, newCol);
        this.newCol = newCol;
    }
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.wrapInValue(threshold);
    }
}
exports.DepthToOcclusionExpr = DepthToOcclusionExpr;
/**
 * converts a `1 / distance` depth texture to an occlusion texture, with all
 * occluded geometry being rendered as black
 * @param depthCol the color representing the inverse depth (defaults to
 * sampling from channel 0)
 * @param newCol the color to replace unoccluded areas by (defaults to white
 * and is mutable by default)
 * @param threshold values below this are not occluded (set to something low,
 * like 0.1 or lower; defaults to 0.01 and is mutable by default)
 */
function depth2occlusion(depthCol, newCol, threshold) {
    return new DepthToOcclusionExpr(depthCol, newCol, expr_1.wrapInValue(threshold));
}
exports.depth2occlusion = depth2occlusion;

},{"./channelsampleexpr":10,"./expr":16,"./vecexprs":50}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dof = exports.DoFLoop = void 0;
const mergepass_1 = require("../mergepass");
const arity2_1 = require("./arity2");
const blurexpr_1 = require("./blurexpr");
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const gaussianexpr_1 = require("./gaussianexpr");
const getcompexpr_1 = require("./getcompexpr");
const opexpr_1 = require("./opexpr");
const vecexprs_1 = require("./vecexprs");
class DoFLoop extends mergepass_1.EffectLoop {
    constructor(depth = expr_1.mut(expr_1.pfloat(0.3)), rad = expr_1.mut(expr_1.pfloat(0.01)), depthInfo = getcompexpr_1.getcomp(channelsampleexpr_1.channel(0), "r"), reps = 2, taps = 13) {
        let guassianExpr = gaussianexpr_1.gaussian(depthInfo, depth, rad);
        const side = blurexpr_1.gauss(vecexprs_1.vec2(arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4), 0), taps);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4)), taps);
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
/**
 * creates depth of field expression; all values are mutable by default
 * @param depth float for what inverse depth to focus on (1 on top of the
 * camera; 0 is infinity)
 * @param rad float for how deep the band of in-focus geometry is (a value
 * between 0.01 and 0.1 is reasonable)
 * @param depthInfo float the expression that represents the inverse depth
 * (defaults to sampling the red component from channel 0)
 * @param reps how many times to repeat the gaussian blur
 */
function dof(depth, rad, depthInfo, reps) {
    return new DoFLoop(expr_1.wrapInValue(depth), expr_1.wrapInValue(rad), expr_1.wrapInValue(depthInfo), reps);
}
exports.dof = dof;

},{"../mergepass":54,"./arity2":4,"./blurexpr":7,"./channelsampleexpr":10,"./expr":16,"./gaussianexpr":20,"./getcompexpr":21,"./opexpr":34,"./vecexprs":50}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgecolor = exports.EdgeColorExpr = void 0;
const arity2_1 = require("./arity2");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const monochromeexpr_1 = require("./monochromeexpr");
const sobelexpr_1 = require("./sobelexpr");
const vecexprs_1 = require("./vecexprs");
/** edge color expression */
class EdgeColorExpr extends expr_1.WrappedExpr {
    constructor(color, samplerNum, stepped = true) {
        const expr = stepped
            ? expr_1.cvec4(expr_1.tag `mix(${color}, ${fragcolorexpr_1.fcolor()}, ${monochromeexpr_1.monochrome(arity2_1.a2("step", vecexprs_1.vec4(0.5, 0.5, 0.5, 0.0), sobelexpr_1.sobel(samplerNum)))})`)
            : expr_1.cvec4(expr_1.tag `mix(${color}, ${fragcolorexpr_1.fcolor()}, ${monochromeexpr_1.monochrome(sobelexpr_1.sobel(samplerNum))})`);
        super(expr);
        this.color = color;
        this.expr = expr;
    }
    setColor(color) {
        this.expr.setUniform("uCustomName0" + this.expr.id, color);
        this.color = color;
    }
}
exports.EdgeColorExpr = EdgeColorExpr;
/**
 * creates a colored edge detection expression
 * @param color what color to make the edge
 * @param samplerNum where to sample from
 * @param stepped whether to round the result of sobel edge detection (defaults
 * to true)
 */
function edgecolor(color, samplerNum, stepped) {
    return new EdgeColorExpr(color, samplerNum, stepped);
}
exports.edgecolor = edgecolor;

},{"./arity2":4,"./expr":16,"./fragcolorexpr":17,"./monochromeexpr":27,"./sobelexpr":45,"./vecexprs":50}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edge = exports.EdgeExpr = void 0;
const brightnessexpr_1 = require("./brightnessexpr");
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
const invertexpr_1 = require("./invertexpr");
const monochromeexpr_1 = require("./monochromeexpr");
const opexpr_1 = require("./opexpr");
const sobelexpr_1 = require("./sobelexpr");
class EdgeExpr extends expr_1.WrappedExpr {
    constructor(mult = expr_1.mut(-1.0), samplerNum) {
        const operator = opexpr_1.op(getcompexpr_1.getcomp(invertexpr_1.invert(monochromeexpr_1.monochrome(sobelexpr_1.sobel(samplerNum))), "r"), "*", mult);
        super(brightnessexpr_1.brightness(operator));
        this.mult = mult;
        this.operator = operator;
    }
    setMult(mult) {
        this.operator.setRight(mult);
        this.mult = expr_1.wrapInValue(mult);
    }
}
exports.EdgeExpr = EdgeExpr;
/**
 * returns an expression highlights edges where they appear
 * @param style `"dark"` for dark edges and `"light"` for light edges, or a
 * custom number or expression (between -1 and 1) for a more gray style of edge
 * @param samplerNum where to sample from
 */
function edge(style, samplerNum) {
    const mult = style === "dark" ? -1 : style === "light" ? 1 : style;
    return new EdgeExpr(expr_1.wrapInValue(mult), samplerNum);
}
exports.edge = edge;

},{"./brightnessexpr":8,"./expr":16,"./getcompexpr":21,"./invertexpr":25,"./monochromeexpr":27,"./opexpr":34,"./sobelexpr":45}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tag = exports.wrapInValue = exports.pfloat = exports.Operator = exports.WrappedExpr = exports.ExprVec4 = exports.ExprVec3 = exports.ExprVec2 = exports.float = exports.ExprFloat = exports.BasicFloat = exports.ExprVec = exports.BasicVec4 = exports.BasicVec3 = exports.BasicVec2 = exports.BasicVec = exports.PrimitiveVec4 = exports.PrimitiveVec3 = exports.PrimitiveVec2 = exports.PrimitiveVec = exports.PrimitiveFloat = exports.Primitive = exports.mut = exports.Mutable = exports.cvec4 = exports.cvec3 = exports.cvec2 = exports.cfloat = exports.Expr = void 0;
const mergepass_1 = require("../mergepass");
const webglprogramloop_1 = require("../webglprogramloop");
const utils_1 = require("../utils");
/**
 * adds a `.` after a number if needed (e.g converts `1` to `"1."` but leaves
 * `1.2` as `"1.2"`)
 * @param num number to convert
 */
function toGLSLFloatString(num) {
    let str = "" + num;
    if (!str.includes("."))
        str += ".";
    return str;
}
class Expr {
    constructor(sourceLists, defaultNames) {
        // update me on change to needs
        this.needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            passCount: false,
            extraBuffers: new Set(),
        };
        this.uniformValChangeMap = {};
        this.defaultNameMap = {};
        this.externalFuncs = [];
        this.sourceCode = "";
        this.funcIndex = 0;
        this.regionBranded = false;
        this.id = "_id_" + Expr.count;
        Expr.count++;
        if (sourceLists.sections.length - sourceLists.values.length !== 1) {
            // this cannot happen if you use `tag` to destructure a template string
            throw new Error("wrong lengths for source and values");
        }
        if (sourceLists.values.length !== defaultNames.length) {
            console.log(sourceLists);
            console.log(defaultNames);
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
        return this.needs.neighborSample
            ? mult
            : this.sourceLists.values
                .map((v) => v.getSampleNum())
                .reduce((acc, curr) => acc + curr, 0);
    }
    /**
     * set a uniform by name directly
     * @param name uniform name in the source code
     * @param newVal value to set the uniform to
     */
    setUniform(name, newVal) {
        var _a, _b;
        newVal = wrapInValue(newVal);
        const originalName = name;
        if (typeof newVal === "number") {
            newVal = wrapInValue(newVal);
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
    /**
     * parses this expression into a string, adding info as it recurses into
     * nested expressions
     */
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
    addFuncs(funcs) {
        this.externalFuncs.push(...funcs);
        return this;
    }
    brandExprWithChannel(funcIndex, samplerNum) {
        utils_1.brandWithChannel(this.sourceLists, this.externalFuncs, this.needs, funcIndex, samplerNum);
        return this;
    }
    brandExprWithRegion(space) {
        utils_1.brandWithRegion(this, this.funcIndex, space);
        for (const v of this.sourceLists.values) {
            v.brandExprWithRegion(space);
        }
        return this;
    }
}
exports.Expr = Expr;
/**
 * increments for each expression created; used to uniquely id each expression
 */
Expr.count = 0;
function genCustomNames(sourceLists) {
    const names = [];
    for (let i = 0; i < sourceLists.values.length; i++) {
        names.push("uCustomName" + i);
    }
    return names;
}
/** create a custom float function (use with [[tag]]) */
function cfloat(sourceLists, externalFuncs = []) {
    return new ExprFloat(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cfloat = cfloat;
/** create a custom vec2 function (use with [[tag]]) */
function cvec2(sourceLists, externalFuncs = []) {
    return new ExprVec2(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec2 = cvec2;
/** create a custom vec3 function (use with [[tag]]) */
function cvec3(sourceLists, externalFuncs = []) {
    return new ExprVec3(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec3 = cvec3;
/** create a custom vec4 function (use with [[tag]]) */
function cvec4(sourceLists, externalFuncs = []) {
    return new ExprVec4(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec4 = cvec4;
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
    getSampleNum() {
        return 0;
    }
    brandExprWithRegion(space) {
        return this;
    }
}
exports.Mutable = Mutable;
/**
 * makes a primitive value mutable. wrapping a [[PrimitiveVec]] or
 * [[PrimitiveFloat]] in [[mut]] before passing it into an expression will
 * allow you to use the setters on that expression to change those values at
 * runtime
 * @param val the primitive float or primitive vec to make mutable
 * @param name the optional name for the uniform
 */
function mut(val, name) {
    const primitive = typeof val === "number" ? wrapInValue(val) : val;
    return new Mutable(primitive, name);
}
exports.mut = mut;
class Primitive {
    parse() {
        return this.toString();
    }
    getSampleNum() {
        return 0;
    }
    brandExprWithRegion(space) {
        return this;
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
        // shorthand version and not the constructor
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    /** sets a component of the vector */
    setComp(index, primitive) {
        if (index < 0 || index >= this.values.length) {
            throw new Error("out of bounds of setting component");
        }
        this.setUniform(this.defaultNames[index] + this.id, wrapInValue(primitive));
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
        this.setUniform("uFloat" + this.id, wrapInValue(primitive));
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
        this.setUniform("uFloat" + this.id, wrapInValue(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.ExprFloat = ExprFloat;
function float(value) {
    if (typeof value === "number")
        value = wrapInValue(value);
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
    genPrograms(gl, vShader, uniformLocs, shaders) {
        return new mergepass_1.EffectLoop([this], { num: 1 }).genPrograms(gl, vShader, uniformLocs, shaders);
    }
    typeString() {
        return "vec4";
    }
}
exports.ExprVec4 = ExprVec4;
class WrappedExpr {
    constructor(expr) {
        this.expr = expr;
    }
    typeString() {
        return this.expr.typeString();
    }
    parse(buildInfo, defaultName, enc) {
        return this.expr.parse(buildInfo, defaultName, enc);
    }
    getSampleNum() {
        return this.expr.getSampleNum();
    }
    brandExprWithRegion(space) {
        return this.expr.brandExprWithRegion(space);
    }
}
exports.WrappedExpr = WrappedExpr;
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
/** creates a primitive float */
function pfloat(num) {
    return new PrimitiveFloat(num);
}
exports.pfloat = pfloat;
function wrapInValue(num) {
    if (num === undefined)
        return undefined;
    if (typeof num === "number")
        return pfloat(num);
    return num;
}
exports.wrapInValue = wrapInValue;
/**
 * takes a template strings array and converts it to a source list; very useful
 * for [[cfloat]], [[cvec2]], [[cvec3]] and [[cvec4]]
 */
function tag(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.tag = tag;

},{"../mergepass":54,"../utils":56,"../webglprogramloop":57}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fcolor = exports.FragColorExpr = void 0;
const expr_1 = require("./expr");
/** fragment color expression */
class FragColorExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `gl_FragColor`, []);
        this.needs.centerSample = true;
    }
}
exports.FragColorExpr = FragColorExpr;
/** creates an expression that evaluates to the fragment color */
function fcolor() {
    return new FragColorExpr();
}
exports.fcolor = fcolor;

},{"./expr":16}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pixel = exports.FragCoordExpr = void 0;
const expr_1 = require("./expr");
/** frag coord expression (xy components only) */
class FragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `gl_FragCoord.xy`, []);
    }
}
exports.FragCoordExpr = FragCoordExpr;
/**
 * creates an expression that evaluates to the frag coord in pixels (samplers
 * take normalized coordinates, so you might want [[nfcoord]] instead)
 */
function pixel() {
    return new FragCoordExpr();
}
exports.pixel = pixel;

},{"./expr":16}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fxaa = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** FXAA expression */
class FXAAExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `fxaa()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.fxaa];
        this.needs.neighborSample = true;
    }
}
/** FXAA antaliasing expression */
function fxaa() {
    return new FXAAExpr();
}
exports.fxaa = fxaa;

},{"../glslfunctions":52,"./expr":16}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaussian = exports.GaussianExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** gaussian expression */
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
        this.x = expr_1.wrapInValue(x);
    }
    setA(a) {
        this.setUniform("uFloatA" + this.id, a);
        this.a = expr_1.wrapInValue(a);
    }
    setB(b) {
        this.setUniform("uFloatB" + this.id, b);
        this.b = expr_1.wrapInValue(b);
    }
}
exports.GaussianExpr = GaussianExpr;
/**
 * gaussian function that defaults to normal distribution
 * @param x x position in the curve
 * @param a horizontal position of peak (defaults to 0 for normal distribution)
 * @param b horizontal stretch of the curve (defaults to 1 for normal distribution)
 */
function gaussian(x, a = 0, b = 1) {
    return new GaussianExpr(expr_1.wrapInValue(x), expr_1.wrapInValue(a), expr_1.wrapInValue(b));
}
exports.gaussian = gaussian;

},{"../glslfunctions":52,"./expr":16}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get4comp = exports.get3comp = exports.get2comp = exports.getcomp = exports.Get4CompExpr = exports.Get3CompExpr = exports.Get2CompExpr = exports.GetCompExpr = exports.checkLegalComponents = exports.typeStringToLength = void 0;
const expr_1 = require("./expr");
// TODO this should probably be somewhere else
/** @ignore */
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
/** @ignore */
function genCompSource(vec, components) {
    return {
        sections: ["", "." + components],
        values: [vec],
    };
}
/**
 * checks if components accessing a vector are legal. components can be illegal
 * if they mix sets (e.g. `v.rgzw`) or contain characters outside of any set
 * (e.g. `v.lmno`)
 * @param comps components string
 * @param vec vector being accessed
 */
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
/**
 * performs all validity checks of [[checkLegalComponents]] and checks if the
 * number of accessed components does not exceed the size of the vector being
 * assigned to
 * @param comps components string
 * @param outLen length of the resultant vector
 * @param vec vector being accessed
 */
function checkGetComponents(comps, outLen, vec) {
    if (comps.length > outLen)
        throw new Error("too many components");
    checkLegalComponents(comps, vec);
}
/** get component expression */
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
/** get 2 components expression */
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
/** get 3 components expression */
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
/** get 3 components expression */
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
/**
 * creates an expression that gets 1 component from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function getcomp(vec, comps) {
    return new GetCompExpr(vec, comps);
}
exports.getcomp = getcomp;
/**
 * creates an expression that gets 2 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get2comp(vec, comps) {
    return new Get2CompExpr(vec, comps);
}
exports.get2comp = get2comp;
/**
 * creates an expression that gets 3 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get3comp(vec, comps) {
    return new Get3CompExpr(vec, comps);
}
exports.get3comp = get3comp;
/**
 * creates an expression that gets 4 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get4comp(vec, comps) {
    return new Get4CompExpr(vec, comps);
}
exports.get4comp = get4comp;

},{"./expr":16}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.godrays = exports.GodRaysExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const vecexprs_1 = require("./vecexprs");
/**
 * @ignore
 * the number of samples in the source code already
 */
const DEFAULT_SAMPLES = 100;
/** godrays expression */
class GodRaysExpr extends expr_1.ExprVec4 {
    // sane godray defaults from https://github.com/Erkaman/glsl-godrays/blob/master/example/index.js
    constructor(col = fragcolorexpr_1.fcolor(), exposure = expr_1.mut(1.0), decay = expr_1.mut(1.0), density = expr_1.mut(1.0), weight = expr_1.mut(0.01), lightPos = expr_1.mut(vecexprs_1.pvec2(0.5, 0.5)), samplerNum = 0, numSamples = DEFAULT_SAMPLES, convertDepth) {
        // TODO the metaprogramming here is not so good!
        // leaving off the function call section for now (we addd it back later)
        const sourceLists = expr_1.tag `${col}, ${exposure}, ${decay}, ${density}, ${weight}, ${lightPos}, ${convertDepth !== undefined ? convertDepth.threshold : expr_1.float(0)}, ${convertDepth !== undefined ? convertDepth.newColor : vecexprs_1.vec4(0, 0, 0, 0)})`;
        // TODO make this more generic
        // append the _<num> onto the function name
        // also add _depth if this is a version of the function that uses depth buffer
        const customName = `godrays${convertDepth !== undefined ? "_depth" : ""}${numSamples !== 100 ? "_s" + numSamples : ""}(`;
        sourceLists.sections[0] = customName;
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
        // will be 1 if needs to convert depth, and 0 otherwise
        this.funcIndex = ~~(convertDepth !== undefined);
        let customGodRayFunc = glslfunctions_1.glslFuncs.godrays
            .split("godrays(")
            .join(customName)
            .replace(`NUM_SAMPLES = ${DEFAULT_SAMPLES}`, "NUM_SAMPLES = " + numSamples);
        if (convertDepth !== undefined) {
            // with regex, uncomment the line in the source code that does the
            // conversion (if you think about it that's basically what a preprocessor
            // does...)
            customGodRayFunc = customGodRayFunc.replace(/\/\/uncomment\s/g, "");
            this.externalFuncs.push(glslfunctions_1.glslFuncs.depth2occlusion);
        }
        this.externalFuncs.push(customGodRayFunc);
        this.brandExprWithChannel(this.funcIndex, samplerNum);
    }
    /** sets the light color */
    setColor(color) {
        this.setUniform("uCol" + this.id, color);
        this.col = color;
    }
    /** sets the exposure */
    setExposure(exposure) {
        this.setUniform("uExposure" + this.id, exposure);
        this.exposure = expr_1.wrapInValue(exposure);
    }
    /** sets the decay */
    setDecay(decay) {
        this.setUniform("uDecay" + this.id, decay);
        this.decay = expr_1.wrapInValue(decay);
    }
    /** sets the density */
    setDensity(density) {
        this.setUniform("uDensity" + this.id, density);
        this.density = expr_1.wrapInValue(density);
    }
    /** sets the weight */
    setWeight(weight) {
        this.setUniform("uWeight" + this.id, weight);
        this.weight = expr_1.wrapInValue(weight);
    }
    /** sets the light position */
    setLightPos(lightPos) {
        this.setUniform("uLightPos" + this.id, lightPos);
        this.lightPos = lightPos;
    }
    // these only matter when you're using a depth buffer and not an occlusion
    // buffer (although right now, you'll still be able to set them)
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.wrapInValue(threshold);
    }
    setNewColor(newColor) {
        this.setUniform("uNewColor" + this.id, newColor);
        this.newColor = newColor;
    }
}
exports.GodRaysExpr = GodRaysExpr;
/**
 * create a godrays expression which requires an occlusion map; all values are
 * mutable by default
 * @param options object that defines godrays properties (has sane defaults)
 */
function godrays(options = {}) {
    return new GodRaysExpr(options.color, expr_1.wrapInValue(options.exposure), expr_1.wrapInValue(options.decay), expr_1.wrapInValue(options.density), expr_1.wrapInValue(options.weight), options.lightPos, options.numSamples, options.samplerNum, options.convertDepth === undefined
        ? undefined
        : {
            threshold: expr_1.wrapInValue(options.convertDepth.threshold),
            newColor: options.convertDepth.newColor,
        });
}
exports.godrays = godrays;

},{"../glslfunctions":52,"./expr":16,"./fragcolorexpr":17,"./vecexprs":50}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grain = exports.GrainExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
// TODO consider getting rid of this since it's easy to make your own with
// `random` and `brightness`
/** grain expression */
class GrainExpr extends expr_1.ExprVec4 {
    constructor(grain) {
        super(expr_1.tag `vec4((1.0 - ${grain} * random(gl_FragCoord.xy)) * gl_FragColor.rgb, gl_FragColor.a);`, ["uGrain"]);
        this.grain = grain;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
        this.needs.centerSample = true;
    }
    /** sets the grain level  */
    setGrain(grain) {
        this.setUniform("uGrain" + this.id, grain);
        this.grain = expr_1.wrapInValue(grain);
    }
}
exports.GrainExpr = GrainExpr;
/**
 * creates an expression that adds random grain
 * @param val how much the grain should impact the image (0 to 1 is reasonable)
 */
function grain(val) {
    return new GrainExpr(expr_1.wrapInValue(val));
}
exports.grain = grain;

},{"../glslfunctions":52,"./expr":16}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hsv2rgb = exports.HSVToRGBExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** HSV to RGB expression */
class HSVToRGBExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `hsv2rgb(${color})`, ["uHSVCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb];
    }
    /** sets the color to convert */
    setColor(color) {
        this.setUniform("uHSVCol", color);
        this.color = color;
    }
}
exports.HSVToRGBExpr = HSVToRGBExpr;
/**
 * converts a color (with an alpha compoment) from hsv to rgb
 * @param col the hsva color to convert to rgba
 */
function hsv2rgb(col) {
    return new HSVToRGBExpr(col);
}
exports.hsv2rgb = hsv2rgb;

},{"../glslfunctions":52,"./expr":16}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invert = exports.InvertExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** invert expression */
class InvertExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `invert(${color})`, ["uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.invert];
        this.color = color;
    }
    /** sets the color */
    setColor(color) {
        this.setUniform("uColor", color);
        this.color = color;
    }
}
exports.InvertExpr = InvertExpr;
/**
 * creates an expression that inverts the color, keeping the original alpha
 */
function invert(col) {
    return new InvertExpr(col);
}
exports.invert = invert;

},{"../glslfunctions":52,"./expr":16}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.len = exports.LenExpr = void 0;
const expr_1 = require("./expr");
/** length expression */
class LenExpr extends expr_1.ExprFloat {
    constructor(vec) {
        super(expr_1.tag `length(${vec})`, ["uVec"]);
        this.vec = vec;
    }
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.LenExpr = LenExpr;
/** creates an expreession that calculates the length of a vector */
function len(vec) {
    return new LenExpr(vec);
}
exports.len = len;

},{"./expr":16}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monochrome = exports.MonochromeExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** monochrome expression */
class MonochromeExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `monochrome(${color})`, ["uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.monochrome];
        this.color = color;
    }
    /** sets the color */
    setColor(color) {
        this.setUniform("uColor", color);
        this.color = color;
    }
}
exports.MonochromeExpr = MonochromeExpr;
/**
 * creates an expression that converts a color into grayscale, keeping the
 * original alpha
 */
function monochrome(col) {
    return new MonochromeExpr(col);
}
exports.monochrome = monochrome;

},{"../glslfunctions":52,"./expr":16}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motionblur = exports.MotionBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const opexpr_1 = require("./opexpr");
/** frame averaging motion blur loop */
class MotionBlurLoop extends mergepass_1.EffectLoop {
    constructor(target = 0, persistence = expr_1.float(expr_1.mut(0.3))) {
        const col1 = opexpr_1.op(channelsampleexpr_1.channel(target), "*", persistence);
        const col2 = opexpr_1.op(fragcolorexpr_1.fcolor(), "*", opexpr_1.op(1, "-", persistence));
        const effects = [
            mergepass_1.loop([opexpr_1.op(col1, "+", col2)]).target(target),
            channelsampleexpr_1.channel(target),
        ];
        super(effects, { num: 1 });
        this.persistence = persistence;
    }
    /** set the persistence (keep between 0 and 1) */
    setPersistence(float) {
        if (!(this.persistence instanceof expr_1.BasicFloat))
            throw new Error("persistence expression not basic float");
        this.persistence.setVal(float);
    }
}
exports.MotionBlurLoop = MotionBlurLoop;
/**
 * creates a frame averaging motion blur effect
 * @param target the channel where your accumulation buffer is (defaults to 0,
 * which you might be using for something like the depth texture, so be sure to
 * change this to suit your needs)
 * @param persistence close to 0 is more ghostly, and close to 1 is nearly no
 * motion blur at all (defaults to 0.3)
 */
function motionblur(target, persistence) {
    return new MotionBlurLoop(target, expr_1.wrapInValue(persistence));
}
exports.motionblur = motionblur;

},{"../mergepass":54,"./channelsampleexpr":10,"./expr":16,"./fragcolorexpr":17,"./opexpr":34}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mouse = exports.MouseExpr = void 0;
const expr_1 = require("./expr");
/** mouse position expression */
class MouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uMouse`, []);
        this.needs.mouseUniform = true;
    }
}
exports.MouseExpr = MouseExpr;
/**
 * creates an expression that evaluates to a vector representing the mouse
 * position in pixels
 */
function mouse() {
    return new MouseExpr();
}
exports.mouse = mouse;

},{"./expr":16}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.center = exports.NormCenterFragCoordExpr = void 0;
const expr_1 = require("./expr");
/** normalized centered frag coord expression */
class NormCenterFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(gl_FragCoord.xy / uResolution - 0.5)`, []);
    }
}
exports.NormCenterFragCoordExpr = NormCenterFragCoordExpr;
/**
 * creates an expression that calculates the normalized centered coord
 * (coordinates range from -0.5 to 0.5)
 */
function center() {
    return new NormCenterFragCoordExpr();
}
exports.center = center;

},{"./expr":16}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.norm = exports.NormExpr = void 0;
const expr_1 = require("./expr");
/** normalize expression */
class NormExpr extends expr_1.Operator {
    constructor(vec) {
        super(vec, expr_1.tag `normalize(${vec})`, ["uVec"]);
        this.vec = vec;
    }
    /** sets the vec to normalize */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.NormExpr = NormExpr;
/** creates an expression that normalizes a vector */
function norm(vec) {
    return new NormExpr(vec);
}
exports.norm = norm;

},{"./expr":16}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pos = exports.NormFragCoordExpr = void 0;
const expr_1 = require("./expr");
/** normalized frag coord expression */
class NormFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        // don't remove these parens! even if you think you are being clever about
        // order of operations
        super(expr_1.tag `(gl_FragCoord.xy / uResolution)`, []);
    }
}
exports.NormFragCoordExpr = NormFragCoordExpr;
/**
 * creates an expression that calculates the normalized frag coord (coordinates
 * range from 0 to 1)
 */
function pos() {
    return new NormFragCoordExpr();
}
exports.pos = pos;

},{"./expr":16}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nmouse = exports.NormMouseExpr = void 0;
const expr_1 = require("./expr");
/** normalized mouse position expression */
class NormMouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(uMouse / uResolution.xy)`, []);
        this.needs.mouseUniform = true;
    }
}
exports.NormMouseExpr = NormMouseExpr;
/**
 * creates an expression that calculates the normalized mouse position
 * (coordinates range from 0 to 1)
 */
function nmouse() {
    return new NormMouseExpr();
}
exports.nmouse = nmouse;

},{"./expr":16}],34:[function(require,module,exports){
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
        this.left = expr_1.wrapInValue(left);
    }
    setRight(right) {
        this.setUniform("uRight" + this.id, right);
        this.right = expr_1.wrapInValue(right);
    }
}
exports.OpExpr = OpExpr;
// implementation
/**
 * creates an arithmetic operator expression
 * @param left expression left of operator
 * @param op string representing arithmetic operator
 * @param right expression right of operator
 */
function op(left, op, right) {
    return new OpExpr(expr_1.wrapInValue(left), op, expr_1.wrapInValue(right));
}
exports.op = op;

},{"./expr":16}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fractalize = exports.perlin = exports.PerlinExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const opexpr_1 = require("./opexpr");
/** Perlin noise expression */
class PerlinExpr extends expr_1.ExprFloat {
    // TODO include a default
    constructor(pos) {
        super(expr_1.tag `gradientnoise(${pos})`, ["uPos"]);
        this.pos = pos;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random2, glslfunctions_1.glslFuncs.gradientnoise];
    }
    /** sets the position to calculate noise value of */
    setPos(pos) {
        this.setUniform("uPos", pos);
        this.pos = pos;
    }
}
exports.PerlinExpr = PerlinExpr;
/**
 * creates a perlin noise expression; values range from -1 to 1 but they tend
 * to be grayer than the [[simplex]] implementation
 * @param pos position
 */
function perlin(pos) {
    return new PerlinExpr(pos);
}
exports.perlin = perlin;
/**
 * take any function from a position to a float, and repeatedly sum calls to it
 * with doubling frequency and halving amplitude (works well with [[simplex]]
 * and [[perlin]])
 * @param pos position
 * @param octaves how many layers deep to make the fractal
 * @param func the function to fractalize
 */
function fractalize(pos, octaves, func) {
    if (octaves < 0)
        throw new Error("octaves can't be < 0");
    const recurse = (pos, size, level) => {
        if (level <= 0)
            return expr_1.pfloat(0);
        return opexpr_1.op(func(opexpr_1.op(pos, "/", size * 2)), "+", recurse(pos, size / 2, level - 1));
    };
    return recurse(pos, 0.5, octaves);
}
exports.fractalize = fractalize;

},{"../glslfunctions":52,"./expr":16,"./opexpr":34}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pblur = exports.PowerBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const vecexprs_1 = require("./vecexprs");
const expr_1 = require("./expr");
const baseLog = (x, y) => Math.log(y) / Math.log(x);
// TODO consider getting rid of this, as it pretty much never looks good
/** power blur loop */
class PowerBlurLoop extends mergepass_1.EffectLoop {
    constructor(size) {
        const side = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(size, 0)));
        const up = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(0, size)));
        const reps = Math.ceil(baseLog(2, size));
        super([side, up], {
            num: reps + 1,
        });
        this.size = size;
        this.loopInfo.func = (i) => {
            const distance = this.size / Math.pow(2, i);
            up.setDirection(vecexprs_1.pvec2(0, distance));
            side.setDirection(vecexprs_1.pvec2(distance, 0));
        };
    }
    /** sets the size of the radius */
    setSize(size) {
        this.size = size;
        this.loopInfo.num = Math.ceil(baseLog(2, size));
    }
}
exports.PowerBlurLoop = PowerBlurLoop;
/**
 * fast approximate blur for large blur radius that might look good in some cases
 * @param size the radius of the blur
 */
function pblur(size) {
    return new PowerBlurLoop(size);
}
exports.pblur = pblur;

},{"../mergepass":54,"./blurexpr":7,"./expr":16,"./vecexprs":50}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = exports.RandomExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
/** psuedorandom number expression */
class RandomExpr extends expr_1.ExprFloat {
    constructor(seed = normfragcoordexpr_1.pos()) {
        super(expr_1.tag `random(${seed})`, ["uSeed"]);
        this.seed = seed;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
    }
    /** sets the seed (vary this over time to get a moving effect) */
    setSeed(seed) {
        this.setUniform("uSeed", seed);
        this.seed = seed;
    }
}
exports.RandomExpr = RandomExpr;
/**
 * creates expression that evaluates to a pseudorandom number between 0 and 1
 * @param seed vec2 to to seed the random number (defaults to the normalized
 * frag coord)
 */
function random(seed) {
    return new RandomExpr(seed);
}
exports.random = random;

},{"../glslfunctions":52,"./expr":16,"./normfragcoordexpr":32}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.region = void 0;
const mergepass_1 = require("../mergepass");
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
const opexpr_1 = require("./opexpr");
const ternaryexpr_1 = require("./ternaryexpr");
const fragcolorexpr_1 = require("./fragcolorexpr");
// form: x1, y1, x2, y2
function createDifferenceFloats(floats) {
    const axes = "xy";
    const differences = [];
    if (floats.length !== 4) {
        throw new Error("incorrect amount of points specified for region");
    }
    for (let i = 0; i < 2; i++) {
        differences.push(opexpr_1.op(getcompexpr_1.getcomp(normfragcoordexpr_1.pos(), axes[i]), "-", floats[i]));
    }
    for (let i = 2; i < floats.length; i++) {
        differences.push(opexpr_1.op(floats[i], "-", getcompexpr_1.getcomp(normfragcoordexpr_1.pos(), axes[i - 2])));
    }
    return differences;
}
/**
 * restrict an effect to a region of the screen
 * @param space top left, top right, bottom left, bottom right corners of the
 * region, or just a number if you wish to sample from a channel as the region
 * @param success expression for being inside the region
 * @param failure expression for being outside the region
 * @param not whether to invert the region
 */
function region(space, success, failure, not = false) {
    const floats = Array.isArray(space)
        ? space.map((f) => expr_1.wrapInValue(f))
        : typeof space === "number"
            ? expr_1.wrapInValue(space)
            : space;
    if (failure instanceof mergepass_1.EffectLoop) {
        if (!(success instanceof mergepass_1.EffectLoop)) {
            [success, failure] = [failure, success]; // swap the order
            not = !not; // invert the region
        }
    }
    if (success instanceof mergepass_1.EffectLoop) {
        if (!(failure instanceof mergepass_1.EffectLoop)) {
            return success.regionWrap(floats, failure, true, not);
        }
        // double loop, so we have to do separately
        return mergepass_1.loop([
            success.regionWrap(floats, fragcolorexpr_1.fcolor(), false, not),
            failure.regionWrap(floats, fragcolorexpr_1.fcolor(), true, !not),
        ]);
    }
    return ternaryexpr_1.ternary(Array.isArray(floats) ? createDifferenceFloats(floats) : floats, success.brandExprWithRegion(floats), failure.brandExprWithRegion(floats), not);
}
exports.region = region;

},{"../mergepass":54,"./expr":16,"./fragcolorexpr":17,"./getcompexpr":21,"./normfragcoordexpr":32,"./opexpr":34,"./ternaryexpr":46}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolution = exports.ResolutionExpr = void 0;
const expr_1 = require("./expr");
/** resolution expression */
class ResolutionExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uResolution`, []);
    }
}
exports.ResolutionExpr = ResolutionExpr;
/** creates an expression that evaluates to a vector representing the resolution */
function resolution() {
    return new ResolutionExpr();
}
exports.resolution = resolution;

},{"./expr":16}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rgb2hsv = exports.RGBToHSVExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** RGB to HSV expression */
class RGBToHSVExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `rgb2hsv(${color})`, ["uRGBCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rgb2hsv];
    }
    /** sets the color to convert */
    setColor(color) {
        this.setUniform("uRGBCol", color);
        this.color = color;
    }
}
exports.RGBToHSVExpr = RGBToHSVExpr;
/**
 * creates an expression that converts a color (with an alpha component) from
 * rgb to hsv
 * @param col the rgba color to convert to hsva
 */
function rgb2hsv(col) {
    return new RGBToHSVExpr(col);
}
exports.rgb2hsv = rgb2hsv;

},{"../glslfunctions":52,"./expr":16}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotate = exports.RotateExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** rotate expression */
class RotateExpr extends expr_1.ExprVec2 {
    constructor(vec, angle) {
        super(expr_1.tag `rotate2d(${vec}, ${angle})`, ["uVec", "uAngle"]);
        this.vec = vec;
        this.angle = angle;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rotate2d];
    }
    /** set the vector to rotate */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
    /** set the angle to rotate by */
    setAngle(angle) {
        this.setUniform("uAngle" + this.id, angle);
        this.angle = expr_1.wrapInValue(angle);
    }
}
exports.RotateExpr = RotateExpr;
/**
 * creates an expression that rotates a vector by a given angle
 * @param vec the vector to rotate
 * @param angle radians to rotate vector by
 */
function rotate(vec, angle) {
    return new RotateExpr(vec, expr_1.wrapInValue(angle));
}
exports.rotate = rotate;

},{"../glslfunctions":52,"./expr":16}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.input = exports.SceneSampleExpr = void 0;
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
/** scene sample expression */
class SceneSampleExpr extends expr_1.ExprVec4 {
    constructor(coord = normfragcoordexpr_1.pos()) {
        super(expr_1.tag `texture2D(uSceneSampler, ${coord})`, ["uCoord"]);
        this.coord = coord;
        this.needs.sceneBuffer = true;
    }
    /** sets coordinate where scene is being sampled from */
    setCoord(coord) {
        this.setUniform("uCoord", coord);
        this.coord = coord;
    }
}
exports.SceneSampleExpr = SceneSampleExpr;
/**
 * creates an expression that samples the original scene
 * @param vec where to sample the original scene texture (defaults to the
 * normalized frag coord, but change this if you want to transform the
 * coordinate space of the original image)
 */
function input(vec) {
    return new SceneSampleExpr(vec);
}
exports.input = input;

},{"./expr":16,"./normfragcoordexpr":32}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetColorExpr = void 0;
const expr_1 = require("./expr");
/**
 * set fragment color expression (not needed for the user; used internally for
 * wrapping any kind of [[Vec4]] in an [[ExprVec4]])
 */
class SetColorExpr extends expr_1.ExprVec4 {
    constructor(vec) {
        super(expr_1.tag `(${vec})`, ["uVal"]);
        this.vec = vec;
    }
}
exports.SetColorExpr = SetColorExpr;

},{"./expr":16}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplex = exports.SimplexNoise = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** simplex noise expression */
class SimplexNoise extends expr_1.ExprFloat {
    constructor(pos) {
        super(expr_1.tag `simplexnoise(${pos})`, ["uPos"]);
        this.pos = pos;
        this.externalFuncs = [glslfunctions_1.glslFuncs.simplexhelpers, glslfunctions_1.glslFuncs.simplexnoise];
    }
    setPos(pos) {
        this.setUniform("uPos", pos);
        this.pos = pos;
    }
}
exports.SimplexNoise = SimplexNoise;
/**
 * creates a simplex noise expression; values range from -1 to 1
 * @param pos position
 */
function simplex(pos) {
    return new SimplexNoise(pos);
}
exports.simplex = simplex;

},{"../glslfunctions":52,"./expr":16}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sobel = exports.SobelExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** Sobel edge detection expression */
class SobelExpr extends expr_1.ExprVec4 {
    constructor(samplerNum) {
        super(expr_1.tag `sobel()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.sobel];
        this.brandExprWithChannel(0, samplerNum);
    }
}
exports.SobelExpr = SobelExpr;
/**
 * creates a Sobel edge detection expression that outputs the raw result; for
 * more highly processed edge detection expressions, see [[edgecolor]] or
 * [[edge]]
 * @param samplerNum where to sample from
 */
function sobel(samplerNum) {
    return new SobelExpr(samplerNum);
}
exports.sobel = sobel;

},{"../glslfunctions":52,"./expr":16}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ternary = exports.TernaryExpr = void 0;
const expr_1 = require("./expr");
function genTernarySourceList(floats, success, failure, not) {
    const sourceList = {
        sections: [`(${not ? "!" : ""}(`],
        values: [],
    };
    let counter = 0;
    // generate the boolean expression
    if (floats !== null) {
        for (const f of floats) {
            counter++;
            const last = counter === floats.length;
            sourceList.values.push(f);
            sourceList.sections.push(` > 0.${last ? ") ? " : " && "}`);
        }
    }
    else {
        sourceList.sections[0] += "uCount == 0) ? ";
    }
    // generate the success expression and colon
    sourceList.values.push(success);
    sourceList.sections.push(" : ");
    // generate the failure expression
    sourceList.values.push(failure);
    sourceList.sections.push(")");
    return sourceList;
}
class TernaryExpr extends expr_1.Operator {
    constructor(floats, success, failure, not) {
        super(success, genTernarySourceList(floats, success, failure, not), [
            ...(floats !== null
                ? Array.from(floats, (val, index) => "uFloat" + index)
                : []),
            "uSuccess",
            "uFailure",
        ]);
        this.success = success;
        this.failure = failure;
        this.needs.passCount = floats === null;
    }
}
exports.TernaryExpr = TernaryExpr;
/**
 * creates a ternary expression; the boolean expression is if all the floats
 * given are greater than 0
 * @param floats if all these floats (or the single float) are above 0, then
 * evaluates to success expression
 * @param success
 * @param failure
 * @param not whether to invert the ternary
 */
function ternary(floats, success, failure, not = false) {
    // wrap single float in array if need be
    if (!Array.isArray(floats) && floats !== null)
        floats = [floats].map((f) => expr_1.wrapInValue(f));
    // TODO get rid of this cast
    return new TernaryExpr(floats, success, failure, not);
}
exports.ternary = ternary;

},{"./expr":16}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.time = exports.TimeExpr = void 0;
const expr_1 = require("./expr");
/** time expression */
class TimeExpr extends expr_1.ExprFloat {
    constructor() {
        super(expr_1.tag `uTime`, []);
        this.needs.timeUniform = true;
    }
}
exports.TimeExpr = TimeExpr;
/** creates a time expression that evaluates to the current time */
function time() {
    return new TimeExpr();
}
exports.time = time;

},{"./expr":16}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = exports.TranslateExpr = void 0;
const expr_1 = require("./expr");
// really just adding two vecs together, but it might be confusing that there's
// rotate but no translate, so this is included. also it could make some
// operations more readable
/** sets the translate expression */
class TranslateExpr extends expr_1.ExprVec2 {
    constructor(vec, pos) {
        super(expr_1.tag `(${vec} + ${pos})`, ["uVec", "uPos"]);
        this.vec = vec;
        this.pos = pos;
    }
    /** sets the starting position */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
    /** sets how far the vector will be translated */
    setPos(pos) {
        this.setUniform("uPos" + this.id, pos);
        this.pos = pos;
    }
}
exports.TranslateExpr = TranslateExpr;
/** translates the position of a vector by another vector */
function translate(vec, pos) {
    return new TranslateExpr(vec, pos);
}
exports.translate = translate;

},{"./expr":16}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truedepth = exports.TrueDepthExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** true depth expression */
class TrueDepthExpr extends expr_1.ExprFloat {
    constructor(depth) {
        super(expr_1.tag `truedepth(${depth})`, ["uDist"]);
        this.depth = depth;
        this.externalFuncs = [glslfunctions_1.glslFuncs.truedepth];
    }
    /** sets the distance to convert to the true depth */
    setDist(depth) {
        this.setUniform("uDist", depth);
        this.depth = expr_1.wrapInValue(depth);
    }
}
exports.TrueDepthExpr = TrueDepthExpr;
/** calculates the linear depth from inverse depth value `1 / distance` */
function truedepth(depth) {
    return new TrueDepthExpr(expr_1.wrapInValue(depth));
}
exports.truedepth = truedepth;

},{"../glslfunctions":52,"./expr":16}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pvec4 = exports.pvec3 = exports.pvec2 = exports.vec4 = exports.vec3 = exports.vec2 = void 0;
const expr_1 = require("./expr");
/** @ignore */
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
/** creates a basic vec2 expression */
function vec2(comp1, comp2) {
    return new expr_1.BasicVec2(...vecSourceList(...[comp1, comp2].map((c) => expr_1.wrapInValue(c))));
}
exports.vec2 = vec2;
/** creates a basic vec3 expression */
function vec3(comp1, comp2, comp3) {
    return new expr_1.BasicVec3(...vecSourceList(...[comp1, comp2, comp3].map((c) => expr_1.wrapInValue(c))));
}
exports.vec3 = vec3;
/** creates a basic vec4 expression */
function vec4(comp1, comp2, comp3, comp4) {
    return new expr_1.BasicVec4(...vecSourceList(...[comp1, comp2, comp3, comp4].map((c) => expr_1.wrapInValue(c))));
}
exports.vec4 = vec4;
// primitive vector shorthands
/** creates a primitive vec2 expression */
function pvec2(comp1, comp2) {
    return new expr_1.PrimitiveVec2([comp1, comp2]);
}
exports.pvec2 = pvec2;
/** creates a primitive vec3 expression */
function pvec3(comp1, comp2, comp3) {
    return new expr_1.PrimitiveVec3([comp1, comp2, comp3]);
}
exports.pvec3 = pvec3;
/** creates a primitive vec4 expression */
function pvec4(comp1, comp2, comp3, comp4) {
    return new expr_1.PrimitiveVec4([comp1, comp2, comp3, comp4]);
}
exports.pvec4 = pvec4;

},{"./expr":16}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glslFuncs = void 0;
// adapted from The Book of Shaders
/** glsl source code for external functions */
exports.glslFuncs = {
    // TODO bad to calculate single pixel width every time; maybe it can be a need
    texture2D_region: `vec4 texture2D_region(
  float r_x_min,
  float r_y_min,
  float r_x_max,
  float r_y_max,
  sampler2D sampler,
  vec2 uv
) {
  vec2 d = vec2(1., 1.) / uResolution; // pixel width
  return texture2D(sampler, clamp(uv, vec2(r_x_min + d.x, r_y_min + d.x), vec2(r_x_max - d.y, r_y_max - d.y)));
}`,
    // TODO replace with a better one
    // adapted from The Book of Shaders
    random: `float random(vec2 st) {
  return fract(sin(dot(st.xy / 99., vec2(12.9898, 78.233))) * 43758.5453123);
}`,
    // adapted from The Book of Shaders
    random2: `vec2 random2(vec2 st) {
  st = vec2(dot(st,vec2(127.1,311.7)), dot(st,vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}`,
    rotate2d: `vec2 rotate2d(vec2 v, float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * v;
}`,
    // adapted from The Book of Shaders
    hsv2rgb: `vec4 hsv2rgb(vec4 co){
  vec3 c = co.xyz;
  vec3 rgb = clamp(abs(mod(
    c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  vec3 hsv = c.z * mix(vec3(1.0), rgb, c.y);
  return vec4(hsv.x, hsv.y, hsv.z, co.a);
}`,
    // adapted from The Book of Shaders
    rgb2hsv: `vec4 rgb2hsv(vec4 co){
  vec3 c = co.rgb;
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
              d / (q.x + e),
              q.x, co.a);
}`,
    // all gaussian blurs adapted from:
    // https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
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
    // original algorithm created by Timothy Lottes
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

  if (lumaB < lumaMin || lumaB > lumaMax) {
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
    // the small delta is to prevent division by zero, which is undefined behavior
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
    // adapted from The Book of Shaders, which was adapted from Inigo Quilez
    // from this example: https://www.shadertoy.com/view/XdXGW8
    gradientnoise: `float gradientnoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0, 0.0)),
                     dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0, 1.0)),
                 dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}`,
    // adapted from The Book of Shaders
    // https://thebookofshaders.com/edit.php#11/2d-snoise-clear.frag
    // this was adapted from this fast implementation
    // https://github.com/ashima/webgl-noise
    // simplex noise invented by Ken Perlin
    simplexnoise: `float simplexnoise(vec2 v) {
  // Precompute values for skewed triangular grid
  const vec4 C = vec4(0.211324865405187,
                      // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,
                      // 0.5*(sqrt(3.0)-1.0)
                      -0.577350269189626,
                      // -1.0 + 2.0 * C.x
                      0.024390243902439);
                      // 1.0 / 41.0

  // First corner (x0)
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  // Other two corners (x1, x2)
  vec2 i1 = vec2(0.0);
  i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
  vec2 x1 = x0.xy + C.xx - i1;
  vec2 x2 = x0.xy + C.zz;

  // Do some permutations to avoid
  // truncation effects in permutation
  i = mod289_2(i);
  vec3 p = permute(
          permute( i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(
                      dot(x0,x0),
                      dot(x1,x1),
                      dot(x2,x2)
                      ), 0.0);

  m = m*m ;
  m = m*m ;

  // Gradients:
  //  41 pts uniformly over a line, mapped onto a diamond
  //  The ring size 17*17 = 289 is close to a multiple
  //      of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt(a0*a0 + h*h);
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

  // Compute final noise value at P
  vec3 g = vec3(0.0);
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
  return 130.0 * dot(m, g);
}`,
    // only useful for simplex noise
    simplexhelpers: `vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289_3(((x*34.0)+1.0)*x); }`,
    // sobel adapted from https://gist.github.com/Hebali/6ebfc66106459aacee6a9fac029d0115
    sobel: `vec4 sobel() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 k[8];

  float w = 1. / uResolution.x;
  float h = 1. / uResolution.y;

  k[0] = texture2D(uSampler, uv + vec2(-w, -h));
  k[1] = texture2D(uSampler, uv + vec2(0., -h));
  k[2] = texture2D(uSampler, uv + vec2(w, -h));
  k[3] = texture2D(uSampler, uv + vec2(-w, 0.));

  k[4] = texture2D(uSampler, uv + vec2(w, 0.));
  k[5] = texture2D(uSampler, uv + vec2(-w, h));
  k[6] = texture2D(uSampler, uv + vec2(0., h));
  k[7] = texture2D(uSampler, uv + vec2(w, h));

  vec4 edge_h = k[2] + (2. * k[4]) + k[7] - (k[0] + (2. * k[3]) + k[5]);
  vec4 edge_v = k[0] + (2. * k[1]) + k[2] - (k[5] + (2. * k[6]) + k[7]);
  vec4 sob = sqrt(edge_h * edge_h + edge_v * edge_v);

  return vec4(1. - sob.rgb, 1.);
}`,
    // inlining a similar function will substitute in the full expression for
    // every component, so it's more efficient to have a function
    monochrome: `vec4 monochrome(vec4 col) {
  return vec4(vec3((col.r + col.g + col.b) / 3.), col.a);
}`,
    invert: `vec4 invert(vec4 col) {
  return vec4(vec3(1., 1., 1.) - col.rgb, col.a);
}`,
    channel: `vec4 channel(vec2 uv, sampler2D sampler) {
  return texture2D(sampler, uv);
}`,
};

},{}],53:[function(require,module,exports){
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
__exportStar(require("./settings"), exports);
__exportStar(require("./exprs/blurexpr"), exports);
__exportStar(require("./exprs/fragcolorexpr"), exports);
__exportStar(require("./exprs/vecexprs"), exports);
__exportStar(require("./exprs/opexpr"), exports);
__exportStar(require("./exprs/powerblur"), exports);
__exportStar(require("./exprs/blur2dloop"), exports);
__exportStar(require("./exprs/lenexpr"), exports);
__exportStar(require("./exprs/normexpr"), exports);
__exportStar(require("./exprs/fragcoordexpr"), exports);
__exportStar(require("./exprs/normfragcoordexpr"), exports);
__exportStar(require("./exprs/normcenterfragcoordexpr"), exports);
__exportStar(require("./exprs/scenesampleexpr"), exports);
__exportStar(require("./exprs/brightnessexpr"), exports);
__exportStar(require("./exprs/contrastexpr"), exports);
__exportStar(require("./exprs/grainexpr"), exports);
__exportStar(require("./exprs/getcompexpr"), exports);
__exportStar(require("./exprs/changecompexpr"), exports);
__exportStar(require("./exprs/rgbtohsvexpr"), exports);
__exportStar(require("./exprs/hsvtorgbexpr"), exports);
__exportStar(require("./exprs/timeexpr"), exports);
__exportStar(require("./exprs/arity1"), exports);
__exportStar(require("./exprs/arity2"), exports);
__exportStar(require("./exprs/fxaaexpr"), exports);
__exportStar(require("./exprs/channelsampleexpr"), exports);
__exportStar(require("./exprs/dofloop"), exports);
__exportStar(require("./exprs/truedepthexpr"), exports);
__exportStar(require("./exprs/godraysexpr"), exports);
__exportStar(require("./exprs/depthtoocclusionexpr"), exports);
__exportStar(require("./exprs/resolutionexpr"), exports);
__exportStar(require("./exprs/mouseexpr"), exports);
__exportStar(require("./exprs/rotateexpr"), exports);
__exportStar(require("./exprs/translateexpr"), exports);
__exportStar(require("./exprs/normmouseexpr"), exports);
__exportStar(require("./exprs/perlinexpr"), exports);
__exportStar(require("./exprs/simplexexpr"), exports);
__exportStar(require("./exprs/motionblurloop"), exports);
__exportStar(require("./exprs/randomexpr"), exports);
__exportStar(require("./exprs/sobelexpr"), exports);
__exportStar(require("./exprs/bloomloop"), exports);
__exportStar(require("./exprs/monochromeexpr"), exports);
__exportStar(require("./exprs/invertexpr"), exports);
__exportStar(require("./exprs/edgeexpr"), exports);
__exportStar(require("./exprs/edgecolorexpr"), exports);
__exportStar(require("./exprs/ternaryexpr"), exports);
__exportStar(require("./exprs/regiondecorator"), exports);
__exportStar(require("./exprs/expr"), exports);

},{"./exprs/arity1":3,"./exprs/arity2":4,"./exprs/bloomloop":5,"./exprs/blur2dloop":6,"./exprs/blurexpr":7,"./exprs/brightnessexpr":8,"./exprs/changecompexpr":9,"./exprs/channelsampleexpr":10,"./exprs/contrastexpr":11,"./exprs/depthtoocclusionexpr":12,"./exprs/dofloop":13,"./exprs/edgecolorexpr":14,"./exprs/edgeexpr":15,"./exprs/expr":16,"./exprs/fragcolorexpr":17,"./exprs/fragcoordexpr":18,"./exprs/fxaaexpr":19,"./exprs/getcompexpr":21,"./exprs/godraysexpr":22,"./exprs/grainexpr":23,"./exprs/hsvtorgbexpr":24,"./exprs/invertexpr":25,"./exprs/lenexpr":26,"./exprs/monochromeexpr":27,"./exprs/motionblurloop":28,"./exprs/mouseexpr":29,"./exprs/normcenterfragcoordexpr":30,"./exprs/normexpr":31,"./exprs/normfragcoordexpr":32,"./exprs/normmouseexpr":33,"./exprs/opexpr":34,"./exprs/perlinexpr":35,"./exprs/powerblur":36,"./exprs/randomexpr":37,"./exprs/regiondecorator":38,"./exprs/resolutionexpr":39,"./exprs/rgbtohsvexpr":40,"./exprs/rotateexpr":41,"./exprs/scenesampleexpr":42,"./exprs/simplexexpr":44,"./exprs/sobelexpr":45,"./exprs/ternaryexpr":46,"./exprs/timeexpr":47,"./exprs/translateexpr":48,"./exprs/truedepthexpr":49,"./exprs/vecexprs":50,"./exprtypes":51,"./glslfunctions":52,"./mergepass":54,"./settings":55}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTexture = exports.makeTexture = exports.Merger = exports.loop = exports.EffectLoop = exports.EffectDictionary = void 0;
const codebuilder_1 = require("./codebuilder");
const expr_1 = require("./exprs/expr");
const fragcolorexpr_1 = require("./exprs/fragcolorexpr");
const regiondecorator_1 = require("./exprs/regiondecorator");
const scenesampleexpr_1 = require("./exprs/scenesampleexpr");
const setcolorexpr_1 = require("./exprs/setcolorexpr");
const ternaryexpr_1 = require("./exprs/ternaryexpr");
const settings_1 = require("./settings");
const webglprogramloop_1 = require("./webglprogramloop");
function wrapInSetColors(effects) {
    return effects.map((e) => e instanceof expr_1.ExprVec4 || e instanceof EffectLoop ? e : new setcolorexpr_1.SetColorExpr(e));
}
// should be function of loop?
function processEffectMap(eMap) {
    const result = {};
    for (const name in eMap) {
        const val = eMap[name];
        result[name] = wrapInSetColors(val);
    }
    return result;
}
class EffectDictionary {
    constructor(effectMap) {
        this.effectMap = processEffectMap(effectMap);
    }
    toProgramMap(gl, vShader, uniformLocs, fShaders) {
        const programMap = {};
        let needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            passCount: false,
            extraBuffers: new Set(),
        };
        for (const name in this.effectMap) {
            const effects = this.effectMap[name];
            // wrap the given list of effects as a loop if need be
            const effectLoop = new EffectLoop(effects, { num: 1 });
            if (effectLoop.effects.length === 0) {
                throw new Error("list of effects was empty");
            }
            const programLoop = effectLoop.genPrograms(gl, vShader, uniformLocs, fShaders);
            // walk the tree to the final program
            let atBottom = false;
            let currProgramLoop = programLoop;
            while (!atBottom) {
                if (currProgramLoop.programElement instanceof webglprogramloop_1.WebGLProgramLeaf) {
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
            needs = webglprogramloop_1.updateNeeds(needs, programLoop.getTotalNeeds());
            programMap[name] = programLoop;
        }
        return { programMap, needs };
    }
}
exports.EffectDictionary = EffectDictionary;
/** effect loop, which can loop over other effects or effect loops */
class EffectLoop {
    constructor(effects, loopInfo) {
        this.effects = wrapInSetColors(effects);
        this.loopInfo = loopInfo;
    }
    /** @ignore */
    getSampleNum(mult = 1, sliceStart = 0, sliceEnd = this.effects.length) {
        mult *= this.loopInfo.num;
        let acc = 0;
        const sliced = this.effects.slice(sliceStart, sliceEnd);
        for (const e of sliced) {
            acc += e.getSampleNum(mult);
        }
        return acc;
    }
    /**
     * @ignore
     * places effects into loops broken up by sampling effects
     */
    regroup() {
        let sampleCount = 0;
        /** number of samples in all previous */
        let prevSampleCount = 0;
        let prevEffects = [];
        const regroupedEffects = [];
        let prevTarget;
        let currTarget;
        let mustBreakCounter = 0;
        const breakOff = () => {
            mustBreakCounter--;
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
            if (e instanceof EffectLoop) {
                currTarget = e.loopInfo.target;
                if (e.hasTargetSwitch()) {
                    mustBreakCounter = 2;
                }
            }
            else {
                // if it's not a loop it's assumed the target is that of outer loop
                currTarget = this.loopInfo.target;
            }
            if (sampleCount > 0 ||
                currTarget !== prevTarget ||
                mustBreakCounter > 0) {
                breakOff();
            }
            prevEffects.push(e);
            prevTarget = currTarget;
        }
        // push on all the straggling effects after the grouping is done
        breakOff();
        return regroupedEffects;
    }
    genPrograms(gl, vShader, uniformLocs, shaders) {
        // validate
        const fullSampleNum = this.getSampleNum() / this.loopInfo.num;
        const firstSampleNum = this.getSampleNum(undefined, 0, 1) / this.loopInfo.num;
        const restSampleNum = this.getSampleNum(undefined, 1) / this.loopInfo.num;
        if (!this.hasTargetSwitch() &&
            (fullSampleNum === 0 || (firstSampleNum === 1 && restSampleNum === 0))) {
            const codeBuilder = new codebuilder_1.CodeBuilder(this);
            const program = codeBuilder.compileProgram(gl, vShader, uniformLocs, shaders);
            return program;
        }
        // otherwise, regroup and try again on regrouped loops
        this.effects = this.regroup();
        return new webglprogramloop_1.WebGLProgramLoop(this.effects.map((e) => e.genPrograms(gl, vShader, uniformLocs, shaders)), this.loopInfo, gl);
    }
    /**
     * changes the render target of an effect loop (-1 targest the scene texture;
     * this is used internally)
     */
    target(num) {
        this.loopInfo.target = num;
        return this;
    }
    /** @ignore */
    hasTargetSwitch() {
        for (const e of this.effects) {
            if (e instanceof EffectLoop) {
                if (e.loopInfo.target !== this.loopInfo.target || e.hasTargetSwitch())
                    return true;
            }
        }
        return false;
    }
    /** @ignore */
    regionWrap(space, failure, finalPath = true, not) {
        this.effects = this.effects.map((e, index) => 
        // loops that aren't all the way to the right can't terminate the count ternery
        // don't wrap fcolors in a ternery (it's redundant)
        e instanceof EffectLoop
            ? e.regionWrap(space, failure, index === this.effects.length - 1, not)
            : new setcolorexpr_1.SetColorExpr(regiondecorator_1.region(space, e.brandExprWithRegion(space), index === this.effects.length - 1 && finalPath
                ? !(failure instanceof fragcolorexpr_1.FragColorExpr)
                    ? ternaryexpr_1.ternary(null, failure, fragcolorexpr_1.fcolor())
                    : failure
                : fragcolorexpr_1.fcolor(), not)));
        return this;
    }
}
exports.EffectLoop = EffectLoop;
/** creates an effect loop */
function loop(effects, rep = 1) {
    return new EffectLoop(effects, { num: rep });
}
exports.loop = loop;
/** @ignore */
const V_SOURCE = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}\n`;
/** class that can merge effects */
class Merger {
    /**
     * constructs the object that runs the effects
     * @param effects list of effects that define the final effect
     * @param source the source image or texture
     * @param gl the target rendering context
     * @param options additional options for the texture
     */
    constructor(effects, source, gl, options) {
        this.uniformLocs = {};
        /** additional channels */
        this.channels = [];
        this.fShaders = [];
        this.textureMode = source instanceof WebGLTexture;
        // set channels if provided with channels
        if ((options === null || options === void 0 ? void 0 : options.channels) !== undefined)
            this.channels = options === null || options === void 0 ? void 0 : options.channels;
        if (!(effects instanceof EffectDictionary)) {
            effects = new EffectDictionary({ default: effects });
        }
        // add the copy to scene texture if in texture mode
        if (this.textureMode) {
            if (settings_1.settings.verbosity > 1) {
                console.log("we are in texture mode!");
            }
            for (const name in effects.effectMap) {
                const list = effects.effectMap[name];
                list.unshift(loop([scenesampleexpr_1.input()]).target(-1));
            }
        }
        this.source = source;
        this.gl = gl;
        this.options = options;
        // set the viewport
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        // set up the vertex buffer
        const vertexBuffer = this.gl.createBuffer();
        if (vertexBuffer === null) {
            throw new Error("problem creating vertex buffer");
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        const vertexArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
        const triangles = new Float32Array(vertexArray);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangles, this.gl.STATIC_DRAW);
        // save the vertex buffer reference just so we can delete it later
        this.vertexBuffer = vertexBuffer;
        // compile the simple vertex shader (2 big triangles)
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (vShader === null) {
            throw new Error("problem creating the vertex shader");
        }
        // save the vertex shader reference just so we can delete it later
        this.vShader = vShader;
        this.gl.shaderSource(vShader, V_SOURCE);
        this.gl.compileShader(vShader);
        // make textures
        this.tex = {
            // make the front texture the source if we're given a texture instead of
            // an image
            back: {
                name: "orig_back",
                tex: source instanceof WebGLTexture
                    ? source
                    : makeTexture(this.gl, this.options),
            },
            front: { name: "orig_front", tex: makeTexture(this.gl, this.options) },
            scene: undefined,
            bufTextures: [],
        };
        // create the framebuffer
        const framebuffer = gl.createFramebuffer();
        if (framebuffer === null) {
            throw new Error("problem creating the framebuffer");
        }
        this.framebuffer = framebuffer;
        const { programMap, needs } = effects.toProgramMap(this.gl, this.vShader, this.uniformLocs, this.fShaders);
        this.programMap = programMap;
        if (needs.sceneBuffer || this.textureMode) {
            // we always create a scene texture if we're in texture mode
            this.tex.scene = {
                name: "scene",
                tex: makeTexture(this.gl, this.options),
            };
        }
        if (programMap["default"] === undefined) {
            throw new Error("no default program");
        }
        this.programLoop = programMap["default"];
        // create x amount of empty textures based on buffers needed
        const channelsNeeded = Math.max(...needs.extraBuffers) + 1;
        const channelsSupplied = this.channels.length;
        if (channelsNeeded > channelsSupplied) {
            throw new Error("not enough channels supplied for this effect");
        }
        for (let i = 0; i < this.channels.length; i++) {
            const texOrImage = this.channels[i];
            if (!(texOrImage instanceof WebGLTexture)) {
                // create a new texture; we will update this with the image source every draw
                const texture = makeTexture(this.gl, this.options);
                this.tex.bufTextures.push({ name: "tex_channel_" + i, tex: texture });
            }
            else {
                // this is already a texture; the user will handle updating this
                this.tex.bufTextures.push({
                    name: "img_channel_" + i,
                    tex: texOrImage,
                });
            }
        }
        if (settings_1.settings.verbosity > 0) {
            console.log(effects);
            console.log(this.programMap);
        }
    }
    /**
     * use the source and channels to draw effect to target context; mouse
     * position (as with all positions) are stored from the bottom left corner as
     * this is how texture data is stored
     * @param timeVal number to set the time uniform to (supply this if you plan to
     * use [[time]])
     * @param mouseX the x position of the mouse (supply this if you plan to use
     * [[mouse]] or [[nmouse]])
     * @param mouseY the y position of the mouse (supply this if you plan to use
     * [[mouse]] or [[nmouse]])
     */
    draw(timeVal = 0, mouseX = 0, mouseY = 0) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.back.tex);
        sendTexture(this.gl, this.source);
        // TODO only do unbinding and rebinding in texture mode
        // TODO see if we need to unbind
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        // bind the scene buffer
        if (this.programLoop.getTotalNeeds().sceneBuffer &&
            this.tex.scene !== undefined) {
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.scene.tex);
            sendTexture(this.gl, this.source);
            // TODO see if we need to unbind
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        // bind the additional buffers
        let counter = 0;
        for (const b of this.channels) {
            // TODO check for texture limit
            this.gl.activeTexture(this.gl.TEXTURE2 + counter);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.bufTextures[counter].tex);
            sendTexture(this.gl, b);
            // TODO see if we need to unbind (this gets rid of the error)
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            counter++;
        }
        this.programLoop.run(this.gl, this.tex, this.framebuffer, this.uniformLocs, this.programLoop.last, { timeVal: timeVal, mouseX: mouseX, mouseY: mouseY });
    }
    /**
     * delete all resources created by construction of this [[Merger]]; use right before
     * intentionally losing a reference to this merger object. this is useful if you want
     * to construct another [[Merger]] to use new effects
     */
    delete() {
        // TODO do we have to do something with VertexAttribArray?
        // call bind with null on all textures
        for (let i = 0; i < 2 + this.tex.bufTextures.length; i++) {
            // this gets rid of final texture, scene texture and channels
            this.gl.activeTexture(this.gl.TEXTURE0 + i);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        // call bind with null on all vertex buffers (just 1)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        // call bind with null on all frame buffers (just 1)
        // (this might be redundant because this happens at end of draw call)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // delete all programs
        this.programLoop.delete(this.gl);
        // delete all textures
        this.gl.deleteTexture(this.tex.front.tex);
        this.gl.deleteTexture(this.tex.back.tex);
        for (const c of this.tex.bufTextures) {
            this.gl.deleteTexture(c.tex);
        }
        // delete all vertex buffers (just 1)
        this.gl.deleteBuffer(this.vertexBuffer);
        // delete all frame buffers (just 1)
        this.gl.deleteFramebuffer(this.framebuffer);
        // delete all vertex shaders (just 1)
        this.gl.deleteShader(this.vShader);
        // delete all fragment shaders
        for (const f of this.fShaders) {
            this.gl.deleteShader(f);
        }
    }
    /**
     * changes the current program loop
     * @param str key in the program map
     */
    changeProgram(str) {
        if (this.programMap[str] === undefined) {
            throw new Error(`program "${str}" doesn't exist on this merger`);
        }
        this.programLoop = this.programMap[str];
    }
}
exports.Merger = Merger;
/** creates a texture given a context and options */
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
/** copies onto texture */
function sendTexture(gl, src) {
    // if you are using textures instead of images, the user is responsible for
    // updating that texture, so just return
    if (src instanceof WebGLTexture || src === null)
        return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}
exports.sendTexture = sendTexture;

},{"./codebuilder":1,"./exprs/expr":16,"./exprs/fragcolorexpr":17,"./exprs/regiondecorator":38,"./exprs/scenesampleexpr":42,"./exprs/setcolorexpr":43,"./exprs/ternaryexpr":46,"./settings":55,"./webglprogramloop":57}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
exports.settings = {
    /**
     * set to 1 if you want reasonable logging for debugging, such as the
     * generated GLSL code and program tree. set to 100 if you want texture debug
     * info (you probably don't want to do this, as it logs many lines every
     * frame!)
     */
    verbosity: 0,
};

},{}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandWithRegion = exports.brandWithChannel = exports.captureAndAppend = void 0;
const glslfunctions_1 = require("./glslfunctions");
/** @ignore */
function captureAndAppend(str, reg, suffix) {
    const matches = str.match(reg);
    if (matches === null)
        throw new Error("no match in the given string");
    return str.replace(reg, matches[0] + suffix);
}
exports.captureAndAppend = captureAndAppend;
/** @ignore */
function nameExtractor(sourceLists, extra) {
    const origFuncName = sourceLists.sections[0];
    const ending = origFuncName[origFuncName.length - 1] === ")" ? ")" : "";
    const newFuncName = origFuncName.substr(0, origFuncName.length - 1 - ~~(ending === ")")) +
        extra +
        "(" +
        ending;
    return { origFuncName, newFuncName, ending };
}
/** @ignore */
function brandWithChannel(sourceLists, funcs, needs, funcIndex, samplerNum) {
    samplerNum === undefined
        ? (needs.neighborSample = true)
        : (needs.extraBuffers = new Set([samplerNum]));
    if (samplerNum === undefined)
        return;
    const { origFuncName, newFuncName, ending } = nameExtractor(sourceLists, samplerNum !== undefined ? "_" + samplerNum : "");
    sourceLists.sections[0] = sourceLists.sections[0]
        .split(origFuncName)
        .join(newFuncName);
    funcs[funcIndex] = funcs[funcIndex]
        .split(origFuncName)
        .join(newFuncName)
        .split("uSampler")
        .join("uBufferSampler" + samplerNum);
}
exports.brandWithChannel = brandWithChannel;
/** @ignore */
function brandWithRegion(expr, funcIndex, space) {
    // if it's not a rectangle region we can't do anything so just return
    if (!Array.isArray(space))
        return;
    const sourceLists = expr.sourceLists;
    const funcs = expr.externalFuncs;
    const needs = expr.needs;
    if (expr.regionBranded ||
        (!needs.neighborSample && needs.extraBuffers.size === 0))
        return;
    const { origFuncName, newFuncName, ending } = nameExtractor(sourceLists, "_region");
    const openFuncName = newFuncName.substr(0, newFuncName.length - ~~(ending === ")"));
    const newFuncDeclaration = openFuncName +
        "float r_x_min, float r_y_min, float r_x_max, float r_y_max" +
        (ending === ")" ? ")" : ", ");
    const origTextureName = "texture2D(";
    const newTextureName = "texture2D_region(r_x_min, r_y_min, r_x_max, r_y_max, ";
    // replace name in the external function and `texture2D` and sampler
    // (assumes the sampling function is the first external function)
    funcs[funcIndex] = funcs[funcIndex]
        .split(origFuncName)
        .join(newFuncDeclaration)
        .split(origTextureName)
        .join(newTextureName);
    // shift the original name off the list
    sourceLists.sections.shift();
    // add the close paren if we're opening up a function with 0 args
    if (ending === ")")
        sourceLists.sections.unshift(")");
    // add commas (one less if it is a 0 arg function call)
    for (let i = 0; i < 4 - ~~(ending === ")"); i++) {
        sourceLists.sections.unshift(", ");
    }
    // add the new name to the beginning of the list
    sourceLists.sections.unshift(newFuncName.substr(0, newFuncName.length - ~~(ending === ")")));
    // add values from region data
    sourceLists.values.unshift(...space);
    // put the texture access wrapper at the beginning
    funcs.unshift(glslfunctions_1.glslFuncs.texture2D_region);
    expr.regionBranded = true;
}
exports.brandWithRegion = brandWithRegion;

},{"./glslfunctions":52}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLProgramLoop = exports.WebGLProgramLeaf = exports.updateNeeds = void 0;
const settings_1 = require("./settings");
// update me on change to needs
function updateNeeds(acc, curr) {
    return {
        neighborSample: acc.neighborSample || curr.neighborSample,
        centerSample: acc.centerSample || curr.centerSample,
        sceneBuffer: acc.sceneBuffer || curr.sceneBuffer,
        timeUniform: acc.timeUniform || curr.timeUniform,
        mouseUniform: acc.mouseUniform || curr.mouseUniform,
        passCount: acc.passCount || curr.passCount,
        extraBuffers: new Set([...acc.extraBuffers, ...curr.extraBuffers]),
    };
}
exports.updateNeeds = updateNeeds;
class WebGLProgramLeaf {
    constructor(program, totalNeeds, effects) {
        this.program = program;
        this.totalNeeds = totalNeeds;
        this.effects = effects;
    }
}
exports.WebGLProgramLeaf = WebGLProgramLeaf;
/** @ignore */
function getLoc(programElement, gl, name) {
    gl.useProgram(programElement.program);
    const loc = gl.getUniformLocation(programElement.program, name);
    if (loc === null) {
        throw new Error("could not get the " + name + " uniform location");
    }
    return loc;
}
/** recursive data structure of compiled programs */
class WebGLProgramLoop {
    constructor(programElement, loopInfo, gl) {
        //effects: Expr[];
        this.last = false;
        this.counter = 0;
        this.programElement = programElement;
        this.loopInfo = loopInfo;
        if (this.programElement instanceof WebGLProgramLeaf) {
            if (gl === undefined) {
                throw new Error("program element is a program but context is undefined");
            }
            if (this.programElement.totalNeeds.timeUniform) {
                this.timeLoc = getLoc(this.programElement, gl, "uTime");
            }
            if (this.programElement.totalNeeds.mouseUniform) {
                this.mouseLoc = getLoc(this.programElement, gl, "uMouse");
            }
            if (this.programElement.totalNeeds.passCount) {
                this.countLoc = getLoc(this.programElement, gl, "uCount");
            }
        }
    }
    /** get all needs from all programs */
    getTotalNeeds() {
        // go through needs of program loop
        if (!(this.programElement instanceof WebGLProgramLeaf)) {
            const allNeeds = [];
            for (const p of this.programElement) {
                allNeeds.push(p.getTotalNeeds());
            }
            return allNeeds.reduce(updateNeeds);
        }
        return this.programElement.totalNeeds;
    }
    /**
     * recursively uses all programs in the loop, binding the appropriate
     * textures and setting the appropriate uniforms; the user should only have
     * to call [[draw]] on [[Merger]] and never this function directly
     */
    run(gl, tex, framebuffer, uniformLocs, last, defaultUniforms, outerLoop) {
        let savedTexture;
        if (this.loopInfo.target !== undefined &&
            // if there is a target switch:
            (outerLoop === null || outerLoop === void 0 ? void 0 : outerLoop.loopInfo.target) !== this.loopInfo.target) {
            // swap out the back texture for the channel texture if this loop has
            // an alternate render target
            savedTexture = tex.back;
            if (this.loopInfo.target !== -1) {
                tex.back = tex.bufTextures[this.loopInfo.target];
            }
            else {
                if (tex.scene === undefined) {
                    throw new Error("tried to target -1 but scene texture was undefined");
                }
                tex.back = tex.scene;
            }
            tex.bufTextures[this.loopInfo.target] = savedTexture;
            // TODO get rid of this
            //console.log("saved texture", savedTexture);
            //console.log("buf textures", tex.bufTextures);
            //console.log("target buf texture", tex.bufTextures[this.loopInfo.target]);
            if (settings_1.settings.verbosity > 99)
                console.log("saved texture: " + savedTexture.name);
        }
        // setup for program leaf
        if (this.programElement instanceof WebGLProgramLeaf) {
            // bind the scene texture if needed
            if (this.programElement.totalNeeds.sceneBuffer) {
                if (tex.scene === undefined) {
                    throw new Error("needs scene buffer, but scene texture is somehow undefined");
                }
                gl.activeTexture(gl.TEXTURE1);
                if (this.loopInfo.target === -1) {
                    gl.bindTexture(gl.TEXTURE_2D, savedTexture.tex);
                }
                else {
                    gl.bindTexture(gl.TEXTURE_2D, tex.scene.tex);
                }
            }
            // bind all extra channel textures if needed
            for (const n of this.programElement.totalNeeds.extraBuffers) {
                gl.activeTexture(gl.TEXTURE2 + n);
                gl.bindTexture(gl.TEXTURE_2D, tex.bufTextures[n].tex);
            }
            // use the current program
            gl.useProgram(this.programElement.program);
            // apply all uniforms
            for (const effect of this.programElement.effects) {
                effect.applyUniforms(gl, uniformLocs);
            }
            // set time uniform if needed
            if (this.programElement.totalNeeds.timeUniform) {
                if (this.timeLoc === undefined ||
                    defaultUniforms.timeVal === undefined) {
                    throw new Error("time or location is undefined");
                }
                gl.uniform1f(this.timeLoc, defaultUniforms.timeVal);
            }
            // set mouse uniforms if needed
            if (this.programElement.totalNeeds.mouseUniform) {
                if (this.mouseLoc === undefined ||
                    defaultUniforms.mouseX === undefined ||
                    defaultUniforms.mouseY === undefined) {
                    throw new Error("mouse uniform or location is undefined");
                }
                gl.uniform2f(this.mouseLoc, defaultUniforms.mouseX, defaultUniforms.mouseY);
            }
            // set count uniform if needed
            if (this.programElement.totalNeeds.passCount && outerLoop !== undefined) {
                if (this.countLoc === undefined) {
                    throw new Error("count location is undefined");
                }
                if (outerLoop !== undefined) {
                    gl.uniform1i(this.countLoc, outerLoop.counter);
                }
                this.counter++;
                const mod = outerLoop === undefined ? 1 : outerLoop.loopInfo.num;
                this.counter %= mod;
            }
        }
        for (let i = 0; i < this.loopInfo.num; i++) {
            const newLast = i === this.loopInfo.num - 1;
            if (this.programElement instanceof WebGLProgramLeaf) {
                if (newLast && last && this.last) {
                    // we are on the final pass of the final loop, so draw screen by
                    // setting to the default framebuffer
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
                else {
                    // we have to bounce between two textures
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                    // use the framebuffer to write to front texture
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.front.tex, 0);
                }
                // allows us to read from `texBack`
                // default sampler is 0, so `uSampler` uniform will always sample from texture 0
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, tex.back.tex);
                // use our last program as the draw program
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                if (settings_1.settings.verbosity > 99) {
                    console.log("intermediate back", tex.back.name);
                    console.log("intermediate front", tex.front.name);
                }
                // swap back and front
                [tex.back, tex.front] = [tex.front, tex.back];
                // deactivate and unbind all the channel textures needed
                for (const n of this.programElement.totalNeeds.extraBuffers) {
                    gl.activeTexture(gl.TEXTURE2 + n);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            else {
                if (this.loopInfo.func !== undefined) {
                    this.loopInfo.func(i);
                }
                for (const p of this.programElement) {
                    p.run(gl, tex, framebuffer, uniformLocs, newLast, defaultUniforms, this // this is now the outer loop
                    );
                }
            }
        }
        // swap the textures back if we were temporarily using a channel texture
        if (savedTexture !== undefined) {
            const target = this.loopInfo.target;
            if (settings_1.settings.verbosity > 99) {
                console.log("pre final back", tex.back.name);
                console.log("pre final front", tex.front.name);
            }
            // back texture is really the front texture because it was just swapped
            if (this.loopInfo.target !== -1) {
                tex.bufTextures[target] = tex.back;
            }
            else {
                if (tex.scene === undefined) {
                    throw new Error("tried to replace -1 but scene texture was undefined");
                }
                tex.scene = tex.back;
            }
            tex.back = savedTexture;
            if (settings_1.settings.verbosity > 99) {
                console.log("post final back", tex.back.name);
                console.log("post final front", tex.front.name);
                console.log("channel texture", tex.bufTextures[target].name);
            }
        }
    }
    delete(gl) {
        if (this.programElement instanceof WebGLProgramLeaf) {
            gl.deleteProgram(this.programElement.program);
        }
        else {
            for (const p of this.programElement) {
                p.delete(gl);
            }
        }
    }
}
exports.WebGLProgramLoop = WebGLProgramLoop;

},{"./settings":55}],58:[function(require,module,exports){
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
