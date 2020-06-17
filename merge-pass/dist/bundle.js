(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBuilder = exports.BOILERPLATE = void 0;
const webglprogramloop_1 = require("./webglprogramloop");
const expr_1 = require("./expressions/expr");
const FRAG_SET = `  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);\n`;
const SCENE_SET = `uniform sampler2D uSceneSampler;`;
exports.BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump float uTime;
uniform mediump vec2 uResolution;\n`;
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
                depthBuffer: false,
                sceneBuffer: false,
            },
        };
        console.log(effectLoop);
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
                //this.exprs.push(e);
                //const name = `effect${this.counter}()`;
                //const func = e.sourceCode.replace(/main\s*\(\)/, name);
                this.calls.push("  ".repeat(indentLevel) + "gl_FragColor = " + e.sourceCode + ";");
                this.counter++;
                //this.funcs.push(func);
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
        console.log("needs", this.totalNeeds);
        const fullCode = exports.BOILERPLATE +
            (this.totalNeeds.sceneBuffer ? SCENE_SET : "") +
            [...this.uniformDeclarations].join("\n") +
            [...this.externalFuncs].join("") +
            "\n" +
            //this.funcs.join("\n") +
            "\nvoid main () {\n" +
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
                // makes sure you don't declare uniform with same name
                if (uniformLocs[name] !== undefined) {
                    throw new Error("uniforms have to all have unique names");
                }
                // assign the name to the location
                uniformLocs[name] = location;
            }
        }
        // set the uniform resolution (every program has this uniform)
        const uResolution = gl.getUniformLocation(program, "uResolution");
        gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        /*
        if (this.baseLoop.getNeeds("sceneBuffer")) {
          // TODO allow for texture options for scene texture
          const sceneSamplerLocation = gl.getUniformLocation(
            program,
            "uSceneSampler"
          );
          // put the scene buffer in texture 1 (0 is used for the backbuffer)
          gl.uniform1i(sceneSamplerLocation, 1);
        }
        */
        if (this.totalNeeds.sceneBuffer) {
            // TODO allow for texture options for scene texture
            const sceneSamplerLocation = gl.getUniformLocation(program, "uSceneSampler");
            // put the scene buffer in texture 1 (0 is used for the backbuffer)
            gl.uniform1i(sceneSamplerLocation, 1);
        }
        // get attribute
        const position = gl.getAttribLocation(program, "aPosition");
        // enable the attribute
        gl.enableVertexAttribArray(position);
        // this will point to the vertices in the last bound array buffer.
        // In this example, we only use one array buffer, where we're storing
        // our vertices
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        return new webglprogramloop_1.WebGLProgramLoop(program, this.baseLoop.repeat, this.totalNeeds, this.exprs);
    }
}
exports.CodeBuilder = CodeBuilder;

},{"./expressions/expr":8,"./webglprogramloop":24}],2:[function(require,module,exports){
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
const MP = __importStar(require("./index"));
const glCanvas = document.getElementById("gl");
const gl = glCanvas.getContext("webgl2");
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
const x = source;
const c = sourceCanvas;
let R = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const demos = {
    edgeblur: () => {
        const merger = new MP.Merger([
            MP.blur2d(MP.mul(MP.len(MP.ncfcoord()), 3), MP.mul(MP.len(MP.ncfcoord()), 3), 6),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: (merger, time, frame) => { },
        };
    },
    vectordisplay: () => {
        const merger = new MP.Merger([
            MP.loop([
                MP.gauss5(MP.vec2(1, 0)),
                MP.gauss5(MP.vec2(0, 1)),
                MP.brightness(0.15),
                MP.contrast(1.2),
            ], 5),
            MP.brightness(-0.5),
            MP.setcolor(MP.add(MP.fcolor(), MP.input())),
        ], sourceCanvas, gl);
        return {
            merger: merger,
            change: (merger, time, frame) => { },
        };
    },
};
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
// canvas drawing loops
// TODO deobfuscate these more
const spiral = (t, frames) => {
    let d;
    c.width |= 0;
    for (let i = 50; (i -= 0.5);)
        x.beginPath(),
            (d = 2 * C((2 + S(t / 99)) * 2 * i)),
            x.arc(480 + d * 10 * C(i) * i, 270 + d * 9 * S(i) * i, i, 0, 44 / 7),
            (x.fillStyle = R(i * 5)),
            x.fill();
};
const vectorSpiral = (t, frames) => {
    x.fillStyle = "black";
    x.fillRect(0, 0, 960, 540);
    let d;
    x.lineWidth = 2;
    for (let i = 50; (i -= 0.5);)
        x.beginPath(),
            (x.strokeStyle = `hsl(${i * 9},50%,50%)`),
            (d = 2 * C((2 + S(t / 99)) * 2 * i)),
            x.arc(480 + d * 10 * C(i) * i, 270 + d * 9 * S(i) * i, i, 0, 44 / 7),
            x.stroke();
};
const draws = {
    edgeblur: spiral,
    vectordisplay: vectorSpiral,
};
window.addEventListener("load", () => {
    let mstr = getVariable("m");
    let dstr = getVariable("d");
    if (mstr === undefined || demos[mstr] === undefined)
        mstr = "edgeblur"; // default demo
    if (dstr === undefined || draws[dstr] === undefined)
        dstr = mstr; // pair with merger
    const demo = demos[mstr]();
    if (demo === undefined)
        throw new Error("merger not found");
    const draw = draws[dstr];
    if (draw === undefined)
        throw new Error("draw not found");
    document.getElementById("title").innerText = "demo: " + mstr;
    document.getElementById("mergercode").innerText =
        "" + demos[mstr];
    let frame = 0;
    x.save();
    const step = (t = 0) => {
        draw(t / 1000, frame);
        demo.change(demo.merger, t, frame);
        demo.merger.draw();
        requestAnimationFrame(step);
        frame++;
    };
    x.restore();
    step(0);
});
glCanvas.addEventListener("click", () => glCanvas.requestFullscreen());

},{"./index":22}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add = exports.AddExpr = void 0;
const expr_1 = require("./expr");
class AddExpr extends expr_1.Operator {
    constructor(left, right) {
        super(left, expr_1.tag `(${left} + ${right})`, ["uLeft", "uRight"]);
        this.left = left;
        this.right = right;
    }
    setLeft(left) {
        expr_1.checkGeneric(this.left, left);
        this.setUniform("uLeft" + this.id, expr_1.wrapInValue(left));
    }
    setRight(right) {
        expr_1.checkGeneric(this.right, right);
        this.setUniform("uRight" + this.id, this.right);
    }
}
exports.AddExpr = AddExpr;
// implementation
function add(left, right) {
    return new AddExpr(left, right);
}
exports.add = add;

},{"./expr":8}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur2d = exports.Blur2dLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
class Blur2dLoop extends mergepass_1.EffectLoop {
    constructor(horizontalExpr, verticalExpr, reps = 2) {
        const side = blurexpr_1.gauss5(vecexprs_1.vec2(horizontalExpr, 0));
        const up = blurexpr_1.gauss5(vecexprs_1.vec2(0, verticalExpr));
        super([side, up], { num: reps });
    }
}
exports.Blur2dLoop = Blur2dLoop;
function blur2d(horizontalExpr, verticalExpr, reps) {
    return new Blur2dLoop(expr_1.n2e(horizontalExpr), expr_1.n2e(verticalExpr), reps);
}
exports.blur2d = blur2d;

},{"../mergepass":23,"./blurexpr":5,"./expr":8,"./vecexprs":19}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gauss5 = exports.BlurExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
class BlurExpr extends expr_1.ExprVec4 {
    constructor(direction) {
        super(expr_1.tag `(gauss5(${direction}))`, ["uDirection"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.gauss5];
        this.needs.neighborSample = true;
    }
    setDirection(direction) {
        this.setUniform("uDirection" + this.id, direction);
    }
}
exports.BlurExpr = BlurExpr;
function gauss5(direction) {
    return new BlurExpr(direction);
}
exports.gauss5 = gauss5;

},{"../glslfunctions":21,"./expr":8}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brightness = exports.Brightness = void 0;
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const glslfunctions_1 = require("../glslfunctions");
class Brightness extends expr_1.ExprVec4 {
    constructor(val, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `(brightness(${val}, ${col}))`, ["uBrightness", "uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.brightness];
    }
    setBrightness(brightness) {
        this.setUniform("uBrightness" + this.id, expr_1.n2e(brightness));
    }
}
exports.Brightness = Brightness;
function brightness(val, col) {
    return new Brightness(expr_1.n2e(val), col);
}
exports.brightness = brightness;

},{"../glslfunctions":21,"./expr":8,"./fragcolorexpr":9}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contrast = exports.Contrast = void 0;
const fragcolorexpr_1 = require("./fragcolorexpr");
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
class Contrast extends expr_1.ExprVec4 {
    constructor(val, col = new fragcolorexpr_1.FragColorExpr()) {
        super(expr_1.tag `contrast(${val}, ${col})`, ["uVal", "uCol"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.contrast];
    }
    setContrast(contrast) {
        this.setUniform("uContrast" + this.id, expr_1.n2p(contrast));
    }
}
exports.Contrast = Contrast;
function contrast(val, col) {
    return new Contrast(expr_1.n2e(val), col);
}
exports.contrast = contrast;

},{"../glslfunctions":21,"./expr":8,"./fragcolorexpr":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tag = exports.checkGeneric = exports.wrapInValue = exports.pfloat = exports.n2p = exports.n2e = exports.Operator = exports.ExprVec4 = exports.ExprVec3 = exports.ExprVec2 = exports.float = exports.ExprFloat = exports.ExprVec = exports.PrimitiveVec4 = exports.PrimitiveVec3 = exports.PrimitiveVec2 = exports.PrimitiveVec = exports.PrimitiveFloat = exports.Primitive = exports.mut = exports.Mutable = exports.Expr = void 0;
const mergepass_1 = require("../mergepass");
function toGLSLFloatString(num) {
    let str = "" + num;
    if (!str.includes("."))
        str += ".";
    return str;
}
class Expr {
    constructor(sourceLists, defaultNames) {
        this.added = false;
        this.needs = {
            depthBuffer: false,
            neighborSample: false,
            centerSample: true,
            sceneBuffer: false,
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
                this.uniformValChangeMap[name].changed = false;
                this.uniformValChangeMap[name].val.applyUniform(gl, loc);
            }
        }
    }
    getNeeds(name) {
        return this.needs[name];
    }
    getSampleNum(mult = 1) {
        return this.needs.neighborSample ? mult : 0;
    }
    setUniform(name, newVal) {
        var _a, _b;
        const originalName = name;
        if (typeof newVal === "number") {
            newVal = n2p(newVal);
        }
        // TODO this is a duplicate check
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
                " which doesn't exist." +
                " original name: " +
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
        if (this.added) {
            throw new Error("expression already added to another part of tree");
        }
        this.sourceCode = "";
        buildInfo.exprs.push(this);
        const updateNeed = (name) => (buildInfo.needs[name] = buildInfo.needs[name] || this.needs[name]);
        // update me on change to needs: no good way to iterate through an interface
        updateNeed("centerSample");
        updateNeed("neighborSample");
        updateNeed("depthBuffer");
        updateNeed("sceneBuffer");
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
        this.added = true;
        return this.sourceCode;
    }
}
exports.Expr = Expr;
Expr.count = 0;
class Mutable {
    constructor(primitive, name) {
        this.added = false;
        this.primitive = primitive;
        this.name = name;
    }
    parse(buildInfo, defaultName, enc) {
        if (this.added) {
            throw new Error("mutable expression already added to another part of tree");
        }
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
        this.added = true;
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
    constructor() {
        this.added = false;
    }
    parse(buildInfo, defaultName, enc) {
        // TODO see if this is okay actually
        if (this.added) {
            throw new Error("primitive expression already added to another part of tree");
        }
        this.added = true;
        return this.toString();
    }
}
exports.Primitive = Primitive;
class PrimitiveFloat extends Primitive {
    constructor(num) {
        // TODO throw error when NaN, Infinity or -Infinity
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
        this.value = comps;
    }
    typeString() {
        return ("vec" + this.value.length);
    }
    toString() {
        return `${this.typeString}(${this.value
            .map((n) => toGLSLFloatString(n))
            .join(", ")})`;
    }
}
exports.PrimitiveVec = PrimitiveVec;
class PrimitiveVec2 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform2f(loc, this.value[0], this.value[1]);
    }
}
exports.PrimitiveVec2 = PrimitiveVec2;
class PrimitiveVec3 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform3f(loc, this.value[0], this.value[1], this.value[2]);
    }
}
exports.PrimitiveVec3 = PrimitiveVec3;
class PrimitiveVec4 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform4f(loc, this.value[0], this.value[1], this.value[2], this.value[3]);
    }
}
exports.PrimitiveVec4 = PrimitiveVec4;
class ExprVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
    setComp(index, primitive) {
        if (index < 0 || index >= this.values.length) {
            throw new Error("out of bounds of setting component");
        }
        this.setUniform(this.defaultNames[index], n2p(primitive));
    }
}
exports.ExprVec = ExprVec;
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
    return new ExprFloat({ sections: ["", ""], values: [value] }, ["uFloat"]);
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
    genPrograms(gl, vShader, uniformLocs, sceneSource) {
        return new mergepass_1.EffectLoop([this], { num: 1 }).genPrograms(gl, vShader, uniformLocs, sceneSource);
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
/** number to expression float */
function n2e(num) {
    if (num instanceof PrimitiveFloat ||
        num instanceof ExprFloat ||
        num instanceof Operator ||
        num instanceof Mutable)
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
function checkGeneric(gen, input) {
    if (!(gen instanceof Primitive)) {
        throw new TypeError("cannot change the value of a non-primitive");
    }
    if (typeof input === "number" && !(gen instanceof PrimitiveFloat)) {
        throw new TypeError("cannot set primitive vec to a number");
    }
}
exports.checkGeneric = checkGeneric;
function tag(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.tag = tag;

},{"../mergepass":23}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fcolor = exports.FragColorExpr = void 0;
const expr_1 = require("./expr");
class FragColorExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `(gl_FragColor)`, []);
    }
}
exports.FragColorExpr = FragColorExpr;
function fcolor() {
    return new FragColorExpr();
}
exports.fcolor = fcolor;

},{"./expr":8}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.len = exports.LenExpr = void 0;
const expr_1 = require("./expr");
class LenExpr extends expr_1.ExprFloat {
    constructor(vec) {
        super(expr_1.tag `(length(${vec}))`, ["uVec"]);
        this.vec = vec;
    }
}
exports.LenExpr = LenExpr;
function len(vec) {
    return new LenExpr(vec);
}
exports.len = len;

},{"./expr":8}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mul = exports.MultExpr = void 0;
const expr_1 = require("./expr");
class MultExpr extends expr_1.Operator {
    constructor(left, right) {
        super(left, expr_1.tag `(${left} * ${right})`, ["uLeft", "uRight"]);
        this.left = left;
        this.right = right;
    }
    setLeft(left) {
        expr_1.checkGeneric(this.right, left);
        this.setUniform("uLeft" + this.id, expr_1.wrapInValue(left));
    }
    setRight(right) {
        expr_1.checkGeneric(this.right, right);
        this.setUniform("uRight" + this.id, expr_1.wrapInValue(right));
    }
}
exports.MultExpr = MultExpr;
// implementation
function mul(left, right) {
    let leftVal = typeof left === "number" ? expr_1.n2p(left) : left;
    let rightVal = typeof right === "number" ? expr_1.n2p(right) : right;
    return new MultExpr(leftVal, rightVal);
}
exports.mul = mul;

},{"./expr":8}],12:[function(require,module,exports){
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

},{"./expr":8}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nfcoord = exports.NormFragCoordExpr = void 0;
const expr_1 = require("./expr");
class NormFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(gl_FragCoord.xy / uResolution)`, []);
        this.needs.centerSample = false;
    }
}
exports.NormFragCoordExpr = NormFragCoordExpr;
function nfcoord() {
    return new NormFragCoordExpr();
}
exports.nfcoord = nfcoord;

},{"./expr":8}],14:[function(require,module,exports){
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
        const side = blurexpr_1.gauss5(expr_1.mut(vecexprs_1.pvec2(size, 0)));
        const up = blurexpr_1.gauss5(expr_1.mut(vecexprs_1.pvec2(0, size)));
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

},{"../mergepass":23,"./blurexpr":5,"./expr":8,"./vecexprs":19}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
class RandomExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `(random(gl_FragCoord.xy))`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
    }
}
exports.RandomExpr = RandomExpr;

},{"../glslfunctions":21,"./expr":8}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scale = exports.ScaleExpr = void 0;
const expr_1 = require("./expr");
/** scalar multiplication of vector */
class ScaleExpr extends expr_1.Operator {
    constructor(scalar, vec) {
        super(vec, expr_1.tag `(${scalar} * ${vec})`, ["uScalar", "uVec"]);
    }
    setScalar(scalar) {
        this.setUniform("uScalar" + this.id, expr_1.n2p(scalar));
    }
    setVector(scalar) {
        this.setUniform("uVec" + this.id, scalar);
    }
}
exports.ScaleExpr = ScaleExpr;
function scale(scalar, vec) {
    return new ScaleExpr(expr_1.n2e(scalar), vec);
}
exports.scale = scale;

},{"./expr":8}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.input = exports.SceneSampleExpr = void 0;
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
class SceneSampleExpr extends expr_1.ExprVec4 {
    constructor(coord = normfragcoordexpr_1.nfcoord()) {
        super(expr_1.tag `(texture2D(uSceneSampler, ${coord}))`, ["uVec"]);
        this.needs.sceneBuffer = true;
        this.needs.centerSample = false;
    }
}
exports.SceneSampleExpr = SceneSampleExpr;
function input(vec) {
    return new SceneSampleExpr(vec);
}
exports.input = input;

},{"./expr":8,"./normfragcoordexpr":13}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setcolor = exports.SetColorExpr = void 0;
const expr_1 = require("./expr");
class SetColorExpr extends expr_1.ExprVec4 {
    constructor(val) {
        super(expr_1.tag `(${val})`, ["uVal"]);
    }
}
exports.SetColorExpr = SetColorExpr;
function setcolor(val) {
    return new SetColorExpr(val);
}
exports.setcolor = setcolor;

},{"./expr":8}],19:[function(require,module,exports){
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
    return new expr_1.ExprVec2(...vecSourceList(...[comp1, comp2].map((c) => expr_1.n2e(c))));
}
exports.vec2 = vec2;
function vec3(comp1, comp2, comp3) {
    return new expr_1.ExprVec3(...vecSourceList(...[comp1, comp2, comp3].map((c) => expr_1.n2e(c))));
}
exports.vec3 = vec3;
function vec4(comp1, comp2, comp3, comp4) {
    return new expr_1.ExprVec4(...vecSourceList(...[comp1, comp2, comp3, comp4].map((c) => expr_1.n2e(c))));
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

},{"./expr":8}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glslFuncs = void 0;
// adapted from The Book of Shaders
exports.glslFuncs = {
    // TODO replace with a better one
    random: `float random(vec2 st) {
  return fract(sin(dot(st.xy / 99., vec2(12.9898, 78.233))) * 43758.5453123);
}`,
    rotate2d: `mat2 rotate2d(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}`,
    scale: `mat2 scale(vec2 scale) {
  return mat2(scale.x, 0.0, 0.0, scale.y);
}`,
    hsv2rgb: `vec3 hsv2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(
    c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}`,
    rgb2hsv: `vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz),
               vec4(c.gb, K.xy),
               step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r),
               vec4(c.r, p.yzx),
               step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
              d / (q.x + e),
              q.x);
}`,
    // adapted from https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
    gauss5: `vec4 gauss5(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 direction = dir;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3333333333333333) * direction;
  col += texture2D(uSampler, uv) * 0.29411764705882354;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.35294117647058826;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.35294117647058826;
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
    hsvmask: `void main(vec4 mask, vec4 components, vec4 col) {
  vec3 hsv = rgb2hsv(col.rgb);
  vec3 m = mask;
  hsv.xyz = (vec3(1., 1., 1.) - m) * components + m * hsv.xyz;
  vec3 rgb = hsv2rgb(hsv);
  col = vec4(rgb.r, rgb.g, rgb.b, gl_FragColor.a);
  return col;
}`,
    setxyz: `vec4 setxyz (vec3 comp, vec3 mask, vec4 col) {
  col.xyz = (vec3(1., 1., 1.) - mask) * comp + m * hsv.xyz;
}`,
};

},{}],22:[function(require,module,exports){
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
// TODO export fewer things for the user
__exportStar(require("./mergepass"), exports);
__exportStar(require("./exprtypes"), exports);
__exportStar(require("./glslfunctions"), exports);
__exportStar(require("./expressions/blurexpr"), exports);
__exportStar(require("./expressions/scaleexpr"), exports);
__exportStar(require("./expressions/randomexpr"), exports);
__exportStar(require("./expressions/fragcolorexpr"), exports);
__exportStar(require("./expressions/vecexprs"), exports);
__exportStar(require("./expressions/multexpr"), exports);
__exportStar(require("./expressions/powerblur"), exports);
__exportStar(require("./expressions/blur2dloop"), exports);
__exportStar(require("./expressions/lenexpr"), exports);
__exportStar(require("./expressions/normfragcoordexpr"), exports);
__exportStar(require("./expressions/normcenterfragcoordexpr"), exports);
__exportStar(require("./expressions/scenesampleexpr"), exports);
__exportStar(require("./expressions/brightnessexpr"), exports);
__exportStar(require("./expressions/addexpr"), exports);
__exportStar(require("./expressions/setcolorexpr"), exports);
__exportStar(require("./expressions/contrast"), exports);
__exportStar(require("./expressions/expr"), exports);

},{"./expressions/addexpr":3,"./expressions/blur2dloop":4,"./expressions/blurexpr":5,"./expressions/brightnessexpr":6,"./expressions/contrast":7,"./expressions/expr":8,"./expressions/fragcolorexpr":9,"./expressions/lenexpr":10,"./expressions/multexpr":11,"./expressions/normcenterfragcoordexpr":12,"./expressions/normfragcoordexpr":13,"./expressions/powerblur":14,"./expressions/randomexpr":15,"./expressions/scaleexpr":16,"./expressions/scenesampleexpr":17,"./expressions/setcolorexpr":18,"./expressions/vecexprs":19,"./exprtypes":20,"./glslfunctions":21,"./mergepass":23}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTexture = exports.makeTexture = exports.Merger = exports.loop = exports.EffectLoop = exports.getNeedsOfList = void 0;
const codebuilder_1 = require("./codebuilder");
const webglprogramloop_1 = require("./webglprogramloop");
// TODO get rid of this
function getNeedsOfList(name, list) {
    if (list.length === 0) {
        throw new Error("list was empty, so no needs could be found");
    }
    const bools = list.map((e) => e.getNeeds(name));
    return bools.reduce((acc, curr) => acc || curr);
}
exports.getNeedsOfList = getNeedsOfList;
class EffectLoop {
    constructor(effects, repeat) {
        this.effects = effects;
        this.repeat = repeat;
    }
    getNeeds(name) {
        return getNeedsOfList(name, this.effects);
        //const bools: boolean[] = this.effects.map((e) => e.getNeeds(name));
        //return bools.reduce((acc: boolean, curr: boolean) => acc || curr);
    }
    getSampleNum(mult = 1) {
        mult *= this.repeat.num;
        let acc = 0;
        for (const e of this.effects) {
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
            //firstBreak = false;
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
    genPrograms(gl, vShader, uniformLocs, sceneSource) {
        // TODO we probably don't need scenesource anymore
        if (this.getSampleNum() / this.repeat.num <= 1) {
            // if this group only samples neighbors at most once, create program
            const codeBuilder = new codebuilder_1.CodeBuilder(this);
            const program = codeBuilder.compileProgram(gl, vShader, uniformLocs);
            return program;
        }
        // otherwise, regroup and try again on regrouped loops
        this.effects = this.regroup();
        // okay to have undefined needs here
        return new webglprogramloop_1.WebGLProgramLoop(this.effects.map((e) => e.genPrograms(gl, vShader, uniformLocs, sceneSource)), this.repeat);
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
        this.uniformLocs = {};
        // wrap the given list of effects as a loop if need be
        if (!(effects instanceof EffectLoop)) {
            this.effectLoop = new EffectLoop(effects, { num: 1 });
        }
        else {
            this.effectLoop = effects;
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
            front: makeTexture(this.gl, this.options),
            back: makeTexture(this.gl, this.options),
            scene: undefined,
        };
        // create the framebuffer
        const framebuffer = gl.createFramebuffer();
        if (framebuffer === null) {
            throw new Error("problem creating the framebuffer");
        }
        this.framebuffer = framebuffer;
        // generate the fragment shaders and programs
        this.programLoop = this.effectLoop.genPrograms(this.gl, vShader, this.uniformLocs, this.source);
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
        // TODO get rid of this (or make it only log when verbose)
        console.log(this.programLoop);
    }
    draw() {
        //this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.back);
        sendTexture(this.gl, this.source);
        if (this.programLoop.getTotalNeeds().sceneBuffer &&
            this.tex.scene !== undefined) {
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.scene);
            sendTexture(this.gl, this.source);
        }
        // swap textures before beginning draw
        this.programLoop.draw(this.gl, this.tex, this.framebuffer, this.uniformLocs, this.programLoop.last);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}
exports.sendTexture = sendTexture;

},{"./codebuilder":1,"./webglprogramloop":24}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLProgramLoop = void 0;
const mergepass_1 = require("./mergepass");
class WebGLProgramLoop {
    constructor(programElement, repeat, totalNeeds, effects = [] // only populated when leaf
    ) {
        this.last = false;
        this.programElement = programElement;
        this.repeat = repeat;
        this.totalNeeds = totalNeeds;
        this.effects = effects;
    }
    getTotalNeeds() {
        // go through needs of program loop
        if (!(this.programElement instanceof WebGLProgram)) {
            const allNeeds = [];
            for (const p of this.programElement) {
                allNeeds.push(p.getTotalNeeds());
            }
            // update me on change to needs
            return allNeeds.reduce((acc, curr) => {
                return {
                    neighborSample: acc.neighborSample || curr.neighborSample,
                    centerSample: acc.centerSample || curr.centerSample,
                    sceneBuffer: acc.sceneBuffer || curr.sceneBuffer,
                    depthBuffer: acc.depthBuffer || curr.depthBuffer,
                };
            });
        }
        if (this.totalNeeds === undefined) {
            throw new Error("total needs of webgl program was somehow undefined");
        }
        return this.totalNeeds;
    }
    draw(gl, tex, framebuffer, uniformLocs, last) {
        let used = false;
        for (let i = 0; i < this.repeat.num; i++) {
            const newLast = i === this.repeat.num - 1;
            if (this.programElement instanceof WebGLProgram) {
                if (!used) {
                    gl.useProgram(this.programElement);
                    used = true;
                    // bind the texture if we need the scene buffer
                    if (mergepass_1.getNeedsOfList("sceneBuffer", this.effects)) {
                        if (tex.scene === undefined) {
                            throw new Error("needs scene buffer, but scene texture is somehow undefined");
                        }
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, tex.scene);
                    }
                }
                // effects list is populated
                if (i === 0) {
                    for (const effect of this.effects) {
                        effect.applyUniforms(gl, uniformLocs);
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
                    // swap the textures
                    //console.log("swapping textures");
                    //gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
                // allows us to read from `texBack`
                // default sampler is 0, so `uSampler` uniform will always sample from texture 0
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, tex.back);
                [tex.back, tex.front] = [tex.front, tex.back];
                // go back to the default framebuffer object
                // use our last program as the draw program
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            else {
                if (this.repeat.func !== undefined) {
                    this.repeat.func(i);
                }
                for (const p of this.programElement) {
                    p.draw(gl, tex, framebuffer, uniformLocs, newLast);
                }
            }
        }
    }
}
exports.WebGLProgramLoop = WebGLProgramLoop;

},{"./mergepass":23}]},{},[2]);
