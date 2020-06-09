(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

require("core-js/modules/es.array.concat");

require("core-js/modules/es.string.repeat");

var MP = _interopRequireWildcard(require("@bandaloo/merge-pass"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// for simplicity, we imported everything as `MP` but you can also easily import
// only what you need
// if you're using node, you'll need to use a bundler in order to get it to work
// on the web
// get your source and draw canvas/context from the document
var glCanvas =
/** @type {HTMLCanvasElement} */
document.getElementById("gl");
var gl = glCanvas.getContext("webgl2");

if (gl === null) {
  throw new Error("problem getting the gl context");
}

var sourceCanvas =
/** @type {HTMLCanvasElement} */
document.getElementById("source");
var source = sourceCanvas.getContext("2d");

if (source === null) {
  throw new Error("problem getting the source context");
} // let's create our first effect


var grain = new MP.Grain(0.1); // by default, we will not be able to change the grain level in the above
// effect; if we want the value to be a uniform so we can change it, we could
// wrap it in a list and include a name like this:

var hueAdd = new MP.HueAdd(["uHue", 0]); // we can leave off the name and still make the value mutable. in the line
// below, we could have done `MP.Blur(["uBlur", [1, 0]])` but we did it this
// way instead:

var horizontalBlur = new MP.Blur([[1, 0]]); // `repeat` returns an `EffectLoop` that repeats the effect the given amount of times

var horizontalBlurLoop = horizontalBlur.repeat(2); // let's also create a vertical blur and a loop that repeats it twice

var verticalBlur = new MP.Blur([[0, 1]]);
var verticalBlurLoop = verticalBlur.repeat(2); // let's put both of these blurs into a loop that repeats twice

var totalBlurLoop = new MP.EffectLoop([horizontalBlurLoop, verticalBlurLoop], {
  num: 2,
  func: function func(pass) {// `func` is optional, but it lets you pass in a callback that does
    // something (like change a uniform) on each loop. this particular function
    // doesn't do anything. `pass` increments from zero on every loop. this is
    // useful internally; it's okay if you never find a use for this as a user
  }
}); // create the merger with your source canvas and target rendering context

var merger = new MP.Merger([totalBlurLoop, hueAdd, grain], sourceCanvas, gl, {
  minFilterMode: "linear",
  // could also be "nearest"
  maxFilterMode: "linear",
  // could also be "nearest"
  edgeMode: "clamp" // cloud also be "wrap"

}); // in this example, the merger will compile the `hueAdd` effect and the `grain`
// effect into a single program, since they can be done in one pass by a single
// shader
// you can leave off the options object at the end. in this example, the options
// object being passed in is actually just the default values, so it would be
// the same if you simply got rid of the last argument
// instead of a canvas for the source, you can pass anything of type
// `TexImageSource`, which includes: `ImageBitmap | ImageData | HTMLImageElement
// | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas` so it is actually
// pretty flexible
// let's draw something interesting and kick of a draw loop

var steps = 0;

var draw = function draw(time) {
  var t = steps / 60;
  steps++;
  merger.draw(); // set the uniforms in the effects we created. the merger will make sure that
  // these are only sent down when the program is in use and when the values
  // have changed

  var blurSize = Math.pow(Math.cos(time / 1000), 8);
  hueAdd.setUniform("uHue", t / 9); // we can set a uniform by name
  // we can also set uniforms with member functions on the effect, which allows
  // you to set mutable values we didn't give a specfic name

  horizontalBlur.setDirection([blurSize, 0]);
  verticalBlur.setDirection([0, blurSize]); // reminder that we can't do `grain.setGrain(0.2)` because we made the grain
  // amount immutable when we created it; our merger compiled the shader with
  // the grain level as a hard-coded as 0.1, and not as a uniform. if we want to
  // change the grain level dynamically, we could have done `new Grain[[0.1]]`
  // or `new Grain["uGrain", [0.1]]`
  // draw crazy stripes (adapted from my dweet https://www.dwitter.net/d/18968)

  var i = Math.floor(t * 9);
  var j = Math.floor(i / 44);
  var k = i % 44;
  source.fillStyle = "hsl(".concat((k & j) * i, ",40%,").concat(50 + Math.cos(t) * 10, "%)");
  source.fillRect(k * 24, 0, 24, k + 2);
  source.drawImage(sourceCanvas, 0, k + 2);
  requestAnimationFrame(draw);
}; // run the draw function when everything is loaded


window.onload = function () {
  draw(0);
};

},{"@bandaloo/merge-pass":69,"core-js/modules/es.array.concat":56,"core-js/modules/es.string.repeat":57}],2:[function(require,module,exports){
var isObject = require('../internals/is-object');

module.exports = function (it) {
  if (!isObject(it)) {
    throw TypeError(String(it) + ' is not an object');
  } return it;
};

},{"../internals/is-object":28}],3:[function(require,module,exports){
var toIndexedObject = require('../internals/to-indexed-object');
var toLength = require('../internals/to-length');
var toAbsoluteIndex = require('../internals/to-absolute-index');

// `Array.prototype.{ indexOf, includes }` methods implementation
var createMethod = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) {
      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

module.exports = {
  // `Array.prototype.includes` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  includes: createMethod(true),
  // `Array.prototype.indexOf` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
  indexOf: createMethod(false)
};

},{"../internals/to-absolute-index":47,"../internals/to-indexed-object":48,"../internals/to-length":50}],4:[function(require,module,exports){
var fails = require('../internals/fails');
var wellKnownSymbol = require('../internals/well-known-symbol');
var V8_VERSION = require('../internals/engine-v8-version');

var SPECIES = wellKnownSymbol('species');

module.exports = function (METHOD_NAME) {
  // We can't use this feature detection in V8 since it causes
  // deoptimization and serious performance degradation
  // https://github.com/zloirock/core-js/issues/677
  return V8_VERSION >= 51 || !fails(function () {
    var array = [];
    var constructor = array.constructor = {};
    constructor[SPECIES] = function () {
      return { foo: 1 };
    };
    return array[METHOD_NAME](Boolean).foo !== 1;
  });
};

},{"../internals/engine-v8-version":14,"../internals/fails":17,"../internals/well-known-symbol":55}],5:[function(require,module,exports){
var isObject = require('../internals/is-object');
var isArray = require('../internals/is-array');
var wellKnownSymbol = require('../internals/well-known-symbol');

var SPECIES = wellKnownSymbol('species');

// `ArraySpeciesCreate` abstract operation
// https://tc39.github.io/ecma262/#sec-arrayspeciescreate
module.exports = function (originalArray, length) {
  var C;
  if (isArray(originalArray)) {
    C = originalArray.constructor;
    // cross-realm fallback
    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
    else if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  } return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
};

},{"../internals/is-array":26,"../internals/is-object":28,"../internals/well-known-symbol":55}],6:[function(require,module,exports){
var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

},{}],7:[function(require,module,exports){
var has = require('../internals/has');
var ownKeys = require('../internals/own-keys');
var getOwnPropertyDescriptorModule = require('../internals/object-get-own-property-descriptor');
var definePropertyModule = require('../internals/object-define-property');

module.exports = function (target, source) {
  var keys = ownKeys(source);
  var defineProperty = definePropertyModule.f;
  var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!has(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
  }
};

},{"../internals/has":20,"../internals/object-define-property":32,"../internals/object-get-own-property-descriptor":33,"../internals/own-keys":38}],8:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var definePropertyModule = require('../internals/object-define-property');
var createPropertyDescriptor = require('../internals/create-property-descriptor');

module.exports = DESCRIPTORS ? function (object, key, value) {
  return definePropertyModule.f(object, key, createPropertyDescriptor(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

},{"../internals/create-property-descriptor":9,"../internals/descriptors":11,"../internals/object-define-property":32}],9:[function(require,module,exports){
module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

},{}],10:[function(require,module,exports){
'use strict';
var toPrimitive = require('../internals/to-primitive');
var definePropertyModule = require('../internals/object-define-property');
var createPropertyDescriptor = require('../internals/create-property-descriptor');

module.exports = function (object, key, value) {
  var propertyKey = toPrimitive(key);
  if (propertyKey in object) definePropertyModule.f(object, propertyKey, createPropertyDescriptor(0, value));
  else object[propertyKey] = value;
};

},{"../internals/create-property-descriptor":9,"../internals/object-define-property":32,"../internals/to-primitive":52}],11:[function(require,module,exports){
var fails = require('../internals/fails');

// Thank's IE8 for his funny defineProperty
module.exports = !fails(function () {
  return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
});

},{"../internals/fails":17}],12:[function(require,module,exports){
var global = require('../internals/global');
var isObject = require('../internals/is-object');

var document = global.document;
// typeof document.createElement is 'object' in old IE
var EXISTS = isObject(document) && isObject(document.createElement);

module.exports = function (it) {
  return EXISTS ? document.createElement(it) : {};
};

},{"../internals/global":19,"../internals/is-object":28}],13:[function(require,module,exports){
var getBuiltIn = require('../internals/get-built-in');

module.exports = getBuiltIn('navigator', 'userAgent') || '';

},{"../internals/get-built-in":18}],14:[function(require,module,exports){
var global = require('../internals/global');
var userAgent = require('../internals/engine-user-agent');

var process = global.process;
var versions = process && process.versions;
var v8 = versions && versions.v8;
var match, version;

if (v8) {
  match = v8.split('.');
  version = match[0] + match[1];
} else if (userAgent) {
  match = userAgent.match(/Edge\/(\d+)/);
  if (!match || match[1] >= 74) {
    match = userAgent.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  }
}

module.exports = version && +version;

},{"../internals/engine-user-agent":13,"../internals/global":19}],15:[function(require,module,exports){
// IE8- don't enum bug keys
module.exports = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];

},{}],16:[function(require,module,exports){
var global = require('../internals/global');
var getOwnPropertyDescriptor = require('../internals/object-get-own-property-descriptor').f;
var createNonEnumerableProperty = require('../internals/create-non-enumerable-property');
var redefine = require('../internals/redefine');
var setGlobal = require('../internals/set-global');
var copyConstructorProperties = require('../internals/copy-constructor-properties');
var isForced = require('../internals/is-forced');

/*
  options.target      - name of the target object
  options.global      - target is the global object
  options.stat        - export as static methods of target
  options.proto       - export as prototype methods of target
  options.real        - real prototype method for the `pure` version
  options.forced      - export even if the native feature is available
  options.bind        - bind methods to the target, required for the `pure` version
  options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe      - use the simple assignment of property instead of delete + defineProperty
  options.sham        - add a flag to not completely full polyfills
  options.enumerable  - export as enumerable property
  options.noTargetGet - prevent calling a getter on target
*/
module.exports = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var FORCED, target, key, targetProperty, sourceProperty, descriptor;
  if (GLOBAL) {
    target = global;
  } else if (STATIC) {
    target = global[TARGET] || setGlobal(TARGET, {});
  } else {
    target = (global[TARGET] || {}).prototype;
  }
  if (target) for (key in source) {
    sourceProperty = source[key];
    if (options.noTargetGet) {
      descriptor = getOwnPropertyDescriptor(target, key);
      targetProperty = descriptor && descriptor.value;
    } else targetProperty = target[key];
    FORCED = isForced(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
    // contained in target
    if (!FORCED && targetProperty !== undefined) {
      if (typeof sourceProperty === typeof targetProperty) continue;
      copyConstructorProperties(sourceProperty, targetProperty);
    }
    // add a flag to not completely full polyfills
    if (options.sham || (targetProperty && targetProperty.sham)) {
      createNonEnumerableProperty(sourceProperty, 'sham', true);
    }
    // extend global
    redefine(target, key, sourceProperty, options);
  }
};

},{"../internals/copy-constructor-properties":7,"../internals/create-non-enumerable-property":8,"../internals/global":19,"../internals/is-forced":27,"../internals/object-get-own-property-descriptor":33,"../internals/redefine":40,"../internals/set-global":42}],17:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return !!exec();
  } catch (error) {
    return true;
  }
};

},{}],18:[function(require,module,exports){
var path = require('../internals/path');
var global = require('../internals/global');

var aFunction = function (variable) {
  return typeof variable == 'function' ? variable : undefined;
};

module.exports = function (namespace, method) {
  return arguments.length < 2 ? aFunction(path[namespace]) || aFunction(global[namespace])
    : path[namespace] && path[namespace][method] || global[namespace] && global[namespace][method];
};

},{"../internals/global":19,"../internals/path":39}],19:[function(require,module,exports){
(function (global){
var check = function (it) {
  return it && it.Math == Math && it;
};

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
module.exports =
  // eslint-disable-next-line no-undef
  check(typeof globalThis == 'object' && globalThis) ||
  check(typeof window == 'object' && window) ||
  check(typeof self == 'object' && self) ||
  check(typeof global == 'object' && global) ||
  // eslint-disable-next-line no-new-func
  Function('return this')();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],20:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;

module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

},{}],21:[function(require,module,exports){
module.exports = {};

},{}],22:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var fails = require('../internals/fails');
var createElement = require('../internals/document-create-element');

// Thank's IE8 for his funny defineProperty
module.exports = !DESCRIPTORS && !fails(function () {
  return Object.defineProperty(createElement('div'), 'a', {
    get: function () { return 7; }
  }).a != 7;
});

},{"../internals/descriptors":11,"../internals/document-create-element":12,"../internals/fails":17}],23:[function(require,module,exports){
var fails = require('../internals/fails');
var classof = require('../internals/classof-raw');

var split = ''.split;

// fallback for non-array-like ES3 and non-enumerable old V8 strings
module.exports = fails(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins
  return !Object('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classof(it) == 'String' ? split.call(it, '') : Object(it);
} : Object;

},{"../internals/classof-raw":6,"../internals/fails":17}],24:[function(require,module,exports){
var store = require('../internals/shared-store');

var functionToString = Function.toString;

// this helper broken in `3.4.1-3.4.4`, so we can't use `shared` helper
if (typeof store.inspectSource != 'function') {
  store.inspectSource = function (it) {
    return functionToString.call(it);
  };
}

module.exports = store.inspectSource;

},{"../internals/shared-store":44}],25:[function(require,module,exports){
var NATIVE_WEAK_MAP = require('../internals/native-weak-map');
var global = require('../internals/global');
var isObject = require('../internals/is-object');
var createNonEnumerableProperty = require('../internals/create-non-enumerable-property');
var objectHas = require('../internals/has');
var sharedKey = require('../internals/shared-key');
var hiddenKeys = require('../internals/hidden-keys');

var WeakMap = global.WeakMap;
var set, get, has;

var enforce = function (it) {
  return has(it) ? get(it) : set(it, {});
};

var getterFor = function (TYPE) {
  return function (it) {
    var state;
    if (!isObject(it) || (state = get(it)).type !== TYPE) {
      throw TypeError('Incompatible receiver, ' + TYPE + ' required');
    } return state;
  };
};

if (NATIVE_WEAK_MAP) {
  var store = new WeakMap();
  var wmget = store.get;
  var wmhas = store.has;
  var wmset = store.set;
  set = function (it, metadata) {
    wmset.call(store, it, metadata);
    return metadata;
  };
  get = function (it) {
    return wmget.call(store, it) || {};
  };
  has = function (it) {
    return wmhas.call(store, it);
  };
} else {
  var STATE = sharedKey('state');
  hiddenKeys[STATE] = true;
  set = function (it, metadata) {
    createNonEnumerableProperty(it, STATE, metadata);
    return metadata;
  };
  get = function (it) {
    return objectHas(it, STATE) ? it[STATE] : {};
  };
  has = function (it) {
    return objectHas(it, STATE);
  };
}

module.exports = {
  set: set,
  get: get,
  has: has,
  enforce: enforce,
  getterFor: getterFor
};

},{"../internals/create-non-enumerable-property":8,"../internals/global":19,"../internals/has":20,"../internals/hidden-keys":21,"../internals/is-object":28,"../internals/native-weak-map":31,"../internals/shared-key":43}],26:[function(require,module,exports){
var classof = require('../internals/classof-raw');

// `IsArray` abstract operation
// https://tc39.github.io/ecma262/#sec-isarray
module.exports = Array.isArray || function isArray(arg) {
  return classof(arg) == 'Array';
};

},{"../internals/classof-raw":6}],27:[function(require,module,exports){
var fails = require('../internals/fails');

var replacement = /#|\.prototype\./;

var isForced = function (feature, detection) {
  var value = data[normalize(feature)];
  return value == POLYFILL ? true
    : value == NATIVE ? false
    : typeof detection == 'function' ? fails(detection)
    : !!detection;
};

var normalize = isForced.normalize = function (string) {
  return String(string).replace(replacement, '.').toLowerCase();
};

var data = isForced.data = {};
var NATIVE = isForced.NATIVE = 'N';
var POLYFILL = isForced.POLYFILL = 'P';

module.exports = isForced;

},{"../internals/fails":17}],28:[function(require,module,exports){
module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

},{}],29:[function(require,module,exports){
module.exports = false;

},{}],30:[function(require,module,exports){
var fails = require('../internals/fails');

module.exports = !!Object.getOwnPropertySymbols && !fails(function () {
  // Chrome 38 Symbol has incorrect toString conversion
  // eslint-disable-next-line no-undef
  return !String(Symbol());
});

},{"../internals/fails":17}],31:[function(require,module,exports){
var global = require('../internals/global');
var inspectSource = require('../internals/inspect-source');

var WeakMap = global.WeakMap;

module.exports = typeof WeakMap === 'function' && /native code/.test(inspectSource(WeakMap));

},{"../internals/global":19,"../internals/inspect-source":24}],32:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var IE8_DOM_DEFINE = require('../internals/ie8-dom-define');
var anObject = require('../internals/an-object');
var toPrimitive = require('../internals/to-primitive');

var nativeDefineProperty = Object.defineProperty;

// `Object.defineProperty` method
// https://tc39.github.io/ecma262/#sec-object.defineproperty
exports.f = DESCRIPTORS ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return nativeDefineProperty(O, P, Attributes);
  } catch (error) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

},{"../internals/an-object":2,"../internals/descriptors":11,"../internals/ie8-dom-define":22,"../internals/to-primitive":52}],33:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var propertyIsEnumerableModule = require('../internals/object-property-is-enumerable');
var createPropertyDescriptor = require('../internals/create-property-descriptor');
var toIndexedObject = require('../internals/to-indexed-object');
var toPrimitive = require('../internals/to-primitive');
var has = require('../internals/has');
var IE8_DOM_DEFINE = require('../internals/ie8-dom-define');

var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// `Object.getOwnPropertyDescriptor` method
// https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptor
exports.f = DESCRIPTORS ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return nativeGetOwnPropertyDescriptor(O, P);
  } catch (error) { /* empty */ }
  if (has(O, P)) return createPropertyDescriptor(!propertyIsEnumerableModule.f.call(O, P), O[P]);
};

},{"../internals/create-property-descriptor":9,"../internals/descriptors":11,"../internals/has":20,"../internals/ie8-dom-define":22,"../internals/object-property-is-enumerable":37,"../internals/to-indexed-object":48,"../internals/to-primitive":52}],34:[function(require,module,exports){
var internalObjectKeys = require('../internals/object-keys-internal');
var enumBugKeys = require('../internals/enum-bug-keys');

var hiddenKeys = enumBugKeys.concat('length', 'prototype');

// `Object.getOwnPropertyNames` method
// https://tc39.github.io/ecma262/#sec-object.getownpropertynames
exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return internalObjectKeys(O, hiddenKeys);
};

},{"../internals/enum-bug-keys":15,"../internals/object-keys-internal":36}],35:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;

},{}],36:[function(require,module,exports){
var has = require('../internals/has');
var toIndexedObject = require('../internals/to-indexed-object');
var indexOf = require('../internals/array-includes').indexOf;
var hiddenKeys = require('../internals/hidden-keys');

module.exports = function (object, names) {
  var O = toIndexedObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~indexOf(result, key) || result.push(key);
  }
  return result;
};

},{"../internals/array-includes":3,"../internals/has":20,"../internals/hidden-keys":21,"../internals/to-indexed-object":48}],37:[function(require,module,exports){
'use strict';
var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// Nashorn ~ JDK8 bug
var NASHORN_BUG = getOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

// `Object.prototype.propertyIsEnumerable` method implementation
// https://tc39.github.io/ecma262/#sec-object.prototype.propertyisenumerable
exports.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
  var descriptor = getOwnPropertyDescriptor(this, V);
  return !!descriptor && descriptor.enumerable;
} : nativePropertyIsEnumerable;

},{}],38:[function(require,module,exports){
var getBuiltIn = require('../internals/get-built-in');
var getOwnPropertyNamesModule = require('../internals/object-get-own-property-names');
var getOwnPropertySymbolsModule = require('../internals/object-get-own-property-symbols');
var anObject = require('../internals/an-object');

// all object keys, includes non-enumerable and symbols
module.exports = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
  var keys = getOwnPropertyNamesModule.f(anObject(it));
  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
  return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
};

},{"../internals/an-object":2,"../internals/get-built-in":18,"../internals/object-get-own-property-names":34,"../internals/object-get-own-property-symbols":35}],39:[function(require,module,exports){
var global = require('../internals/global');

module.exports = global;

},{"../internals/global":19}],40:[function(require,module,exports){
var global = require('../internals/global');
var createNonEnumerableProperty = require('../internals/create-non-enumerable-property');
var has = require('../internals/has');
var setGlobal = require('../internals/set-global');
var inspectSource = require('../internals/inspect-source');
var InternalStateModule = require('../internals/internal-state');

var getInternalState = InternalStateModule.get;
var enforceInternalState = InternalStateModule.enforce;
var TEMPLATE = String(String).split('String');

(module.exports = function (O, key, value, options) {
  var unsafe = options ? !!options.unsafe : false;
  var simple = options ? !!options.enumerable : false;
  var noTargetGet = options ? !!options.noTargetGet : false;
  if (typeof value == 'function') {
    if (typeof key == 'string' && !has(value, 'name')) createNonEnumerableProperty(value, 'name', key);
    enforceInternalState(value).source = TEMPLATE.join(typeof key == 'string' ? key : '');
  }
  if (O === global) {
    if (simple) O[key] = value;
    else setGlobal(key, value);
    return;
  } else if (!unsafe) {
    delete O[key];
  } else if (!noTargetGet && O[key]) {
    simple = true;
  }
  if (simple) O[key] = value;
  else createNonEnumerableProperty(O, key, value);
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, 'toString', function toString() {
  return typeof this == 'function' && getInternalState(this).source || inspectSource(this);
});

},{"../internals/create-non-enumerable-property":8,"../internals/global":19,"../internals/has":20,"../internals/inspect-source":24,"../internals/internal-state":25,"../internals/set-global":42}],41:[function(require,module,exports){
// `RequireObjectCoercible` abstract operation
// https://tc39.github.io/ecma262/#sec-requireobjectcoercible
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on " + it);
  return it;
};

},{}],42:[function(require,module,exports){
var global = require('../internals/global');
var createNonEnumerableProperty = require('../internals/create-non-enumerable-property');

module.exports = function (key, value) {
  try {
    createNonEnumerableProperty(global, key, value);
  } catch (error) {
    global[key] = value;
  } return value;
};

},{"../internals/create-non-enumerable-property":8,"../internals/global":19}],43:[function(require,module,exports){
var shared = require('../internals/shared');
var uid = require('../internals/uid');

var keys = shared('keys');

module.exports = function (key) {
  return keys[key] || (keys[key] = uid(key));
};

},{"../internals/shared":45,"../internals/uid":53}],44:[function(require,module,exports){
var global = require('../internals/global');
var setGlobal = require('../internals/set-global');

var SHARED = '__core-js_shared__';
var store = global[SHARED] || setGlobal(SHARED, {});

module.exports = store;

},{"../internals/global":19,"../internals/set-global":42}],45:[function(require,module,exports){
var IS_PURE = require('../internals/is-pure');
var store = require('../internals/shared-store');

(module.exports = function (key, value) {
  return store[key] || (store[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: '3.6.5',
  mode: IS_PURE ? 'pure' : 'global',
  copyright: '© 2020 Denis Pushkarev (zloirock.ru)'
});

},{"../internals/is-pure":29,"../internals/shared-store":44}],46:[function(require,module,exports){
'use strict';
var toInteger = require('../internals/to-integer');
var requireObjectCoercible = require('../internals/require-object-coercible');

// `String.prototype.repeat` method implementation
// https://tc39.github.io/ecma262/#sec-string.prototype.repeat
module.exports = ''.repeat || function repeat(count) {
  var str = String(requireObjectCoercible(this));
  var result = '';
  var n = toInteger(count);
  if (n < 0 || n == Infinity) throw RangeError('Wrong number of repetitions');
  for (;n > 0; (n >>>= 1) && (str += str)) if (n & 1) result += str;
  return result;
};

},{"../internals/require-object-coercible":41,"../internals/to-integer":49}],47:[function(require,module,exports){
var toInteger = require('../internals/to-integer');

var max = Math.max;
var min = Math.min;

// Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
module.exports = function (index, length) {
  var integer = toInteger(index);
  return integer < 0 ? max(integer + length, 0) : min(integer, length);
};

},{"../internals/to-integer":49}],48:[function(require,module,exports){
// toObject with fallback for non-array-like ES3 strings
var IndexedObject = require('../internals/indexed-object');
var requireObjectCoercible = require('../internals/require-object-coercible');

module.exports = function (it) {
  return IndexedObject(requireObjectCoercible(it));
};

},{"../internals/indexed-object":23,"../internals/require-object-coercible":41}],49:[function(require,module,exports){
var ceil = Math.ceil;
var floor = Math.floor;

// `ToInteger` abstract operation
// https://tc39.github.io/ecma262/#sec-tointeger
module.exports = function (argument) {
  return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
};

},{}],50:[function(require,module,exports){
var toInteger = require('../internals/to-integer');

var min = Math.min;

// `ToLength` abstract operation
// https://tc39.github.io/ecma262/#sec-tolength
module.exports = function (argument) {
  return argument > 0 ? min(toInteger(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
};

},{"../internals/to-integer":49}],51:[function(require,module,exports){
var requireObjectCoercible = require('../internals/require-object-coercible');

// `ToObject` abstract operation
// https://tc39.github.io/ecma262/#sec-toobject
module.exports = function (argument) {
  return Object(requireObjectCoercible(argument));
};

},{"../internals/require-object-coercible":41}],52:[function(require,module,exports){
var isObject = require('../internals/is-object');

// `ToPrimitive` abstract operation
// https://tc39.github.io/ecma262/#sec-toprimitive
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (input, PREFERRED_STRING) {
  if (!isObject(input)) return input;
  var fn, val;
  if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
  if (typeof (fn = input.valueOf) == 'function' && !isObject(val = fn.call(input))) return val;
  if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
  throw TypeError("Can't convert object to primitive value");
};

},{"../internals/is-object":28}],53:[function(require,module,exports){
var id = 0;
var postfix = Math.random();

module.exports = function (key) {
  return 'Symbol(' + String(key === undefined ? '' : key) + ')_' + (++id + postfix).toString(36);
};

},{}],54:[function(require,module,exports){
var NATIVE_SYMBOL = require('../internals/native-symbol');

module.exports = NATIVE_SYMBOL
  // eslint-disable-next-line no-undef
  && !Symbol.sham
  // eslint-disable-next-line no-undef
  && typeof Symbol.iterator == 'symbol';

},{"../internals/native-symbol":30}],55:[function(require,module,exports){
var global = require('../internals/global');
var shared = require('../internals/shared');
var has = require('../internals/has');
var uid = require('../internals/uid');
var NATIVE_SYMBOL = require('../internals/native-symbol');
var USE_SYMBOL_AS_UID = require('../internals/use-symbol-as-uid');

var WellKnownSymbolsStore = shared('wks');
var Symbol = global.Symbol;
var createWellKnownSymbol = USE_SYMBOL_AS_UID ? Symbol : Symbol && Symbol.withoutSetter || uid;

module.exports = function (name) {
  if (!has(WellKnownSymbolsStore, name)) {
    if (NATIVE_SYMBOL && has(Symbol, name)) WellKnownSymbolsStore[name] = Symbol[name];
    else WellKnownSymbolsStore[name] = createWellKnownSymbol('Symbol.' + name);
  } return WellKnownSymbolsStore[name];
};

},{"../internals/global":19,"../internals/has":20,"../internals/native-symbol":30,"../internals/shared":45,"../internals/uid":53,"../internals/use-symbol-as-uid":54}],56:[function(require,module,exports){
'use strict';
var $ = require('../internals/export');
var fails = require('../internals/fails');
var isArray = require('../internals/is-array');
var isObject = require('../internals/is-object');
var toObject = require('../internals/to-object');
var toLength = require('../internals/to-length');
var createProperty = require('../internals/create-property');
var arraySpeciesCreate = require('../internals/array-species-create');
var arrayMethodHasSpeciesSupport = require('../internals/array-method-has-species-support');
var wellKnownSymbol = require('../internals/well-known-symbol');
var V8_VERSION = require('../internals/engine-v8-version');

var IS_CONCAT_SPREADABLE = wellKnownSymbol('isConcatSpreadable');
var MAX_SAFE_INTEGER = 0x1FFFFFFFFFFFFF;
var MAXIMUM_ALLOWED_INDEX_EXCEEDED = 'Maximum allowed index exceeded';

// We can't use this feature detection in V8 since it causes
// deoptimization and serious performance degradation
// https://github.com/zloirock/core-js/issues/679
var IS_CONCAT_SPREADABLE_SUPPORT = V8_VERSION >= 51 || !fails(function () {
  var array = [];
  array[IS_CONCAT_SPREADABLE] = false;
  return array.concat()[0] !== array;
});

var SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('concat');

var isConcatSpreadable = function (O) {
  if (!isObject(O)) return false;
  var spreadable = O[IS_CONCAT_SPREADABLE];
  return spreadable !== undefined ? !!spreadable : isArray(O);
};

var FORCED = !IS_CONCAT_SPREADABLE_SUPPORT || !SPECIES_SUPPORT;

// `Array.prototype.concat` method
// https://tc39.github.io/ecma262/#sec-array.prototype.concat
// with adding support of @@isConcatSpreadable and @@species
$({ target: 'Array', proto: true, forced: FORCED }, {
  concat: function concat(arg) { // eslint-disable-line no-unused-vars
    var O = toObject(this);
    var A = arraySpeciesCreate(O, 0);
    var n = 0;
    var i, k, length, len, E;
    for (i = -1, length = arguments.length; i < length; i++) {
      E = i === -1 ? O : arguments[i];
      if (isConcatSpreadable(E)) {
        len = toLength(E.length);
        if (n + len > MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
        for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
      } else {
        if (n >= MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
        createProperty(A, n++, E);
      }
    }
    A.length = n;
    return A;
  }
});

},{"../internals/array-method-has-species-support":4,"../internals/array-species-create":5,"../internals/create-property":10,"../internals/engine-v8-version":14,"../internals/export":16,"../internals/fails":17,"../internals/is-array":26,"../internals/is-object":28,"../internals/to-length":50,"../internals/to-object":51,"../internals/well-known-symbol":55}],57:[function(require,module,exports){
var $ = require('../internals/export');
var repeat = require('../internals/string-repeat');

// `String.prototype.repeat` method
// https://tc39.github.io/ecma262/#sec-string.prototype.repeat
$({ target: 'String', proto: true }, {
  repeat: repeat
});

},{"../internals/export":16,"../internals/string-repeat":46}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBuilder = exports.BOILERPLATE = void 0;
const effect_1 = require("./effect");
const webglprogramloop_1 = require("./webglprogramloop");
// the line below, which gets placed as the first line of `main`, enables allows
// multiple shaders to be chained together, which works for shaders that don't
// need to use `uSampler` for anything other than the current pixel
const FRAG_SET = `  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);\n`;
exports.BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump float uTime;
uniform mediump vec2 uResolution;\n`;
class CodeBuilder {
    // TODO indentation level?
    constructor(effectLoop) {
        this.funcs = [];
        this.calls = [];
        this.externalFuncs = [];
        this.uniformDeclarations = [];
        this.counter = 0;
        /** flat array of effects within loop for attaching uniforms */
        this.effects = [];
        this.baseLoop = effectLoop;
        this.addEffectLoop(effectLoop, 1);
    }
    addEffectLoop(effectLoop, indentLevel, topLevel = true) {
        const needsLoop = !topLevel && effectLoop.repeat.num > 1;
        if (needsLoop) {
            const iName = "i" + this.counter;
            indentLevel++;
            const forStart = "  ".repeat(indentLevel - 1) +
                `for (int ${iName} = 0; ${iName} < ${effectLoop.repeat.num}; ${iName}++) {`;
            this.calls.push(forStart);
        }
        for (const e of effectLoop.effects) {
            if (e instanceof effect_1.Effect) {
                this.effects.push(e);
                const name = `effect${this.counter}()`;
                const func = e.fShaderSource.replace(/main\s*\(\)/, name);
                this.calls.push("  ".repeat(indentLevel) + name + ";");
                this.counter++;
                this.funcs.push(func);
                for (const func of e.externalFuncs) {
                    if (!this.externalFuncs.includes("\n" + func))
                        this.externalFuncs.push("\n" + func);
                }
                for (const name in e.uniforms) {
                    const uniformVal = e.uniforms[name];
                    const typeName = effect_1.uniformGLSLTypeStr(uniformVal.val);
                    this.uniformDeclarations.push(`uniform mediump ${typeName} ${name};`);
                }
            }
            else {
                this.addEffectLoop(e, indentLevel, false);
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
        const fullCode = exports.BOILERPLATE +
            this.uniformDeclarations.join("\n") +
            this.externalFuncs.join("") +
            "\n" +
            this.funcs.join("\n") +
            "\nvoid main () {\n" +
            (this.baseLoop.getNeeds("centerSample") ? FRAG_SET : "") +
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
        for (const effect of this.effects) {
            for (const name in effect.uniforms) {
                const location = gl.getUniformLocation(program, name);
                if (location === null) {
                    throw new Error("couldn't find uniform " + name);
                }
                if (uniformLocs[name] !== undefined) {
                    throw new Error("uniforms have to all have unique names");
                }
                uniformLocs[name] = location;
            }
        }
        // set the uniform resolution (every program has this uniform)
        const uResolution = gl.getUniformLocation(program, "uResolution");
        gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        // get attribute
        const position = gl.getAttribLocation(program, "aPosition");
        // enable the attribute
        gl.enableVertexAttribArray(position);
        // this will point to the vertices in the last bound array buffer.
        // In this example, we only use one array buffer, where we're storing
        // our vertices
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        return new webglprogramloop_1.WebGLProgramLoop(program, this.baseLoop.repeat, this.effects);
    }
}
exports.CodeBuilder = CodeBuilder;

},{"./effect":59,"./webglprogramloop":71}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniformGLSLTypeStr = exports.tag = exports.uniformGLSLTypeNum = exports.Effect = void 0;
const mergepass_1 = require("./mergepass");
let Effect = /** @class */ (() => {
    class Effect {
        constructor(source, defaultNames) {
            this.needs = {
                depthBuffer: false,
                neighborSample: false,
                centerSample: true,
            };
            this.uniforms = {};
            this.externalFuncs = [];
            this.defaultNameMap = {};
            this.id = Effect.count;
            this.idStr = "_id_" + this.id;
            // TODO check to see if user-defined name includes this
            Effect.count++;
            let sourceString = "";
            if (source.sections.length - source.values.length !== 1) {
                throw new Error("wrong lengths for source and values");
            }
            if (source.values.length !== defaultNames.length) {
                throw new Error("default names list length doesn't match values list length");
            }
            // put all of the values between all of the source sections
            for (let i = 0; i < source.values.length; i++) {
                sourceString +=
                    source.sections[i] +
                        this.processGLSLVal(source.values[i], defaultNames[i] + this.idStr);
            }
            sourceString += source.sections[source.sections.length - 1];
            this.fShaderSource = sourceString;
        }
        setUniform(name, newVal) {
            var _a, _b;
            // if name does not exist, try mapping default name to new name
            if (((_a = this.uniforms[name]) === null || _a === void 0 ? void 0 : _a.val) === undefined) {
                name = this.defaultNameMap[name];
            }
            const oldVal = (_b = this.uniforms[name]) === null || _b === void 0 ? void 0 : _b.val;
            // TODO should these really be warnings?
            if (oldVal === undefined) {
                throw new Error("tried to set uniform " + name + " which doesn't exist");
            }
            const oldType = uniformGLSLTypeNum(oldVal);
            const newType = uniformGLSLTypeNum(newVal);
            if (oldType !== newType) {
                throw new Error("tried to set uniform " + name + " to a new type");
            }
            // TODO check for trying to name variable of already existing default name
            this.uniforms[name].val = newVal;
            this.uniforms[name].changed = true;
        }
        processGLSLVal(val, defaultName) {
            // transform `DefaultUniformVal` to `NamedUniformVal`
            let defaulted = false;
            if (typeof val !== "number" && val.length === 1) {
                const namedVal = [defaultName, val[0]];
                val = namedVal;
                defaulted = true;
            }
            if (typeof val === "number") {
                // this is a float
                val;
                return toGLSLFloatString(val);
            }
            if (typeof val[0] === "string") {
                // this is a named value, so it should be inserted as a uniform
                const namedVal = val;
                const name = namedVal[0];
                if (!defaulted && name.includes("_id_")) {
                    throw new Error("cannot set a named uniform that has _id_ in it");
                }
                if (/^i[0-9]+$/g.test(name)) {
                    throw new Error("cannot name a uniform that matches regex ^i[0-9]+$" +
                        "since that's reserved for name of index" +
                        "in for loops of generated code");
                }
                const uniformVal = namedVal[1];
                this.uniforms[name] = { val: uniformVal, changed: true };
                // add the name mapping
                this.defaultNameMap[defaultName] = name;
                return name;
            }
            // not a named value, so it can be inserted into code directly like a macro
            const uniformVal = val;
            return `vec${uniformVal.length}(${uniformVal
                .map((n) => toGLSLFloatString(n))
                .join(", ")})`;
        }
        getNeeds(name) {
            return this.needs[name];
        }
        repeat(num) {
            return new mergepass_1.EffectLoop([this], { num: num });
        }
        getSampleNum(mult = 1) {
            return this.needs.neighborSample ? mult : 0;
        }
        genPrograms(gl, vShader, uniformLocs) {
            console.log("gen programs in effect");
            return new mergepass_1.EffectLoop([this], { num: 1 }).genPrograms(gl, vShader, uniformLocs);
        }
        applyUniforms(gl, uniformLocs) {
            for (const name in this.uniforms) {
                const loc = uniformLocs[name];
                const val = this.uniforms[name].val;
                if (this.uniforms[name].changed) {
                    this.uniforms[name].changed = false;
                    switch (uniformGLSLTypeNum(val)) {
                        case 1:
                            const float = val;
                            gl.uniform1f(loc, float);
                            break;
                        case 2:
                            const vec2 = val;
                            gl.uniform2f(loc, vec2[0], vec2[1]);
                            break;
                        case 3:
                            const vec3 = val;
                            gl.uniform3f(loc, vec3[0], vec3[1], vec3[2]);
                            break;
                        case 4:
                            const vec4 = val;
                            gl.uniform4f(loc, vec4[0], vec4[1], vec4[2], vec4[3]);
                    }
                }
            }
        }
    }
    /** used to give each effect a unique id */
    Effect.count = 0;
    return Effect;
})();
exports.Effect = Effect;
// some helpers
function toGLSLFloatString(num) {
    let str = "" + num;
    if (!str.includes("."))
        str += ".";
    return str;
}
function uniformGLSLTypeNum(val) {
    if (typeof val === "number") {
        return 1;
    }
    return val.length;
}
exports.uniformGLSLTypeNum = uniformGLSLTypeNum;
function tag(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.tag = tag;
function uniformGLSLTypeStr(val) {
    const num = uniformGLSLTypeNum(val);
    if (num === 1)
        return "float";
    if (num >= 2 && num <= 4)
        return "vec" + num;
    throw new Error("cannot convert " + val + " to a GLSL type");
}
exports.uniformGLSLTypeStr = uniformGLSLTypeStr;

},{"./mergepass":70}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blur = void 0;
const effect_1 = require("../effect");
// adapted from https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
class Blur extends effect_1.Effect {
    constructor(direction) {
        super(effect_1.tag `void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 direction = ${direction}; 
  gl_FragColor = vec4(0.0);
  vec2 off1 = vec2(1.3333333333333333) * direction;
  gl_FragColor += texture2D(uSampler, uv) * 0.29411764705882354;
  gl_FragColor += texture2D(uSampler, uv + (off1 / uResolution)) * 0.35294117647058826;
  gl_FragColor += texture2D(uSampler, uv - (off1 / uResolution)) * 0.35294117647058826;
}`, ["uDirection"]);
        this.needs.neighborSample = true;
        this.needs.centerSample = false;
    }
    setDirection(direction) {
        this.setUniform("uDirection" + this.idStr, direction);
    }
}
exports.Blur = Blur;

},{"../effect":59}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brightness = void 0;
const effect_1 = require("../effect");
class Brightness extends effect_1.Effect {
    constructor(val) {
        super(effect_1.tag `void main() {
  gl_FragColor.rgb /= gl_FragColor.a;
  gl_FragColor.rgb += ${val};
  gl_FragColor.rgb *= gl_FragColor.a;
}`, ["uBrightness"]);
    }
    setDirection(brightness) {
        this.setUniform("uBrightness" + this.idStr, brightness);
    }
}
exports.Brightness = Brightness;

},{"../effect":59}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contrast = void 0;
const effect_1 = require("../effect");
class Contrast extends effect_1.Effect {
    constructor(val) {
        if (val <= 0) {
            throw new Error("contrast must be > 0");
        }
        super(effect_1.tag `void main() {
  gl_FragColor.rgb /= gl_FragColor.a;
  gl_FragColor.rgb = ((gl_FragColor.rgb - 0.5) * ${val}) + 0.5;
  gl_FragColor.rgb *= gl_FragColor.a;
}`, ["uContrast"]);
    }
    setContrast(contrast) {
        this.setUniform("uContrast" + this.idStr, contrast);
    }
}
exports.Contrast = Contrast;

},{"../effect":59}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grain = void 0;
const effect_1 = require("../effect");
const __1 = require("..");
class Grain extends effect_1.Effect {
    constructor(val) {
        super(effect_1.tag `void main() {
  gl_FragColor = vec4((1.0 - ${val} * random(gl_FragCoord.xy)) * gl_FragColor.rgb, gl_FragColor.a);
}`, ["uGrain"]);
        this.externalFuncs = [__1.glslFuncs.random];
    }
    setGrain(grain) {
        this.setUniform("uGrain" + this.idStr, grain);
    }
}
exports.Grain = Grain;

},{"..":69,"../effect":59}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSV = void 0;
const effect_1 = require("../effect");
const glslfunctions_1 = require("../glslfunctions");
class HSV extends effect_1.Effect {
    /**
     * @param components hue, sat and brightness components
     * @param mask which original color components to zero out and which to keep
     * (defaults to only zeroing out all of original color)
     */
    constructor(components, mask = [0, 0, 0]) {
        super(effect_1.tag `void main () {
  vec3 hsv = rgb2hsv(gl_FragColor.rgb);
  vec3 m = ${mask};
  hsv.xyz = (vec3(1., 1., 1.) - m) * ${components} + m * hsv.xyz;
  vec3 rgb = hsv2rgb(hsv);
  gl_FragColor = vec4(rgb.r, rgb.g, rgb.b, gl_FragColor.a);
}`, ["uComponent", "uMask"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setComponents(components) {
        this.setUniform("uComponent", components);
    }
    setMask(mask) {
        this.setUniform("uMask", mask);
    }
}
exports.HSV = HSV;

},{"../effect":59,"../glslfunctions":68}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSVAdd = void 0;
const hsv_1 = require("./hsv");
class HSVAdd extends hsv_1.HSV {
    constructor(vec) {
        super(vec, [1, 1, 1]);
    }
}
exports.HSVAdd = HSVAdd;

},{"./hsv":64}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Value = exports.Saturation = exports.Hue = exports.ValueAdd = exports.SaturationAdd = exports.HueAdd = void 0;
const effect_1 = require("../effect");
const glslfunctions_1 = require("../glslfunctions");
function genHSVSource(component, operation, val) {
    return {
        sections: [
            `void main () {
  vec3 hsv = rgb2hsv(gl_FragColor.rgb);
  hsv.${component} ${operation}= `,
            `;
  vec3 rgb = hsv2rgb(hsv);
  gl_FragColor = vec4(rgb.r, rgb.g, rgb.b, gl_FragColor.a);
}`,
        ],
        values: [val],
    };
}
class HueAdd extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("x", "+", num), ["uHueAdd"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setHue(hue) {
        this.setUniform("uHueAdd" + this.idStr, hue);
    }
}
exports.HueAdd = HueAdd;
class SaturationAdd extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("y", "+", num), ["uSatAdd"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setSaturation(sat) {
        this.setUniform("uSatAdd" + this.idStr, sat);
    }
}
exports.SaturationAdd = SaturationAdd;
class ValueAdd extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("z", "+", num), ["uValAdd"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setValue(val) {
        this.setUniform("uValAdd", val);
    }
}
exports.ValueAdd = ValueAdd;
class Hue extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("x", "", num), ["uHue"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setHue(hue) {
        this.setUniform("uHueAdd" + this.idStr, hue);
    }
}
exports.Hue = Hue;
class Saturation extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("y", "", num), ["uSat"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setSaturation(sat) {
        this.setUniform("uSatAdd" + this.idStr, sat);
    }
}
exports.Saturation = Saturation;
class Value extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("z", "", num), ["uVal"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
    setValue(val) {
        this.setUniform("uValAdd", val);
    }
}
exports.Value = Value;

},{"../effect":59,"../glslfunctions":68}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class Passthrough extends __1.Effect {
    constructor() {
        super(__1.tag `void main () {
}`, []);
    }
}

},{"..":69}],68:[function(require,module,exports){
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
};

},{}],69:[function(require,module,exports){
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
__exportStar(require("./effect"), exports);
__exportStar(require("./glslfunctions"), exports);
__exportStar(require("./effects/blur"), exports);
__exportStar(require("./effects/brightness"), exports);
__exportStar(require("./effects/contrast"), exports);
__exportStar(require("./effects/grain"), exports);
__exportStar(require("./effects/passthrough"), exports);
__exportStar(require("./effects/hsv"), exports);
__exportStar(require("./effects/hsvadd"), exports);
__exportStar(require("./effects/hsvhelpers"), exports);

},{"./effect":59,"./effects/blur":60,"./effects/brightness":61,"./effects/contrast":62,"./effects/grain":63,"./effects/hsv":64,"./effects/hsvadd":65,"./effects/hsvhelpers":66,"./effects/passthrough":67,"./glslfunctions":68,"./mergepass":70}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Merger = exports.EffectLoop = void 0;
const codebuilder_1 = require("./codebuilder");
const webglprogramloop_1 = require("./webglprogramloop");
class EffectLoop {
    constructor(effects, repeat) {
        this.effects = effects;
        this.repeat = repeat;
    }
    /** returns true if any sub-effects need neighbor sample down the tree */
    getNeeds(name) {
        const bools = this.effects.map((e) => e.getNeeds(name));
        return bools.reduce((acc, curr) => acc || curr);
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
        };
        for (const e of this.effects) {
            const sampleNum = e.getSampleNum();
            prevSampleCount = sampleCount;
            sampleCount += sampleNum;
            if (sampleCount > 1)
                breakOff();
            prevEffects.push(e);
        }
        // push on all the straggling effects after the grouping is done
        breakOff();
        return regroupedEffects;
    }
    /** recursive descent parser for turning effects into programs */
    genPrograms(gl, vShader, uniformLocs) {
        if (this.getSampleNum() / this.repeat.num <= 1) {
            // if this group only samples neighbors at most once, create program
            const codeBuilder = new codebuilder_1.CodeBuilder(this);
            return codeBuilder.compileProgram(gl, vShader, uniformLocs);
        }
        // otherwise, regroup and try again on regrouped loops
        // TODO should it be getSampleNum(1)?
        this.effects = this.regroup();
        return new webglprogramloop_1.WebGLProgramLoop(this.effects.map((e) => e.genPrograms(gl, vShader, uniformLocs)), this.repeat);
    }
}
exports.EffectLoop = EffectLoop;
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
        //this.vShader = vShader;
        this.gl.shaderSource(vShader, V_SOURCE);
        this.gl.compileShader(vShader);
        // make textures
        this.tex = { front: this.makeTexture(), back: this.makeTexture() };
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
            if (currProgramLoop.program instanceof WebGLProgram) {
                // we traveled right and hit a program, so it must be the last
                currProgramLoop.last = true;
                atBottom = true;
            }
            else {
                // set the current program loop to the last in the list
                currProgramLoop =
                    currProgramLoop.program[currProgramLoop.program.length - 1];
            }
        }
        // TODO get rid of this (or make it only log when verbose)
        console.log(this.programLoop);
    }
    makeTexture() {
        var _a, _b, _c;
        const texture = this.gl.createTexture();
        if (texture === null) {
            throw new Error("problem creating texture");
        }
        // flip the order of the pixels, or else it displays upside down
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        // bind the texture after creating it
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        const filterMode = (f) => f === undefined || f === "linear" ? this.gl.LINEAR : this.gl.NEAREST;
        // how to map texture element
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filterMode((_a = this.options) === null || _a === void 0 ? void 0 : _a.minFilterMode));
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filterMode((_b = this.options) === null || _b === void 0 ? void 0 : _b.maxFilterMode));
        if (((_c = this.options) === null || _c === void 0 ? void 0 : _c.edgeMode) !== "wrap") {
            const gl = this.gl; // for succinctness
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        return texture;
    }
    sendTexture(src) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, src);
    }
    draw() {
        //this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.back);
        this.sendTexture(this.source);
        // swap textures before beginning draw
        this.programLoop.draw(this.gl, this.tex, this.framebuffer, this.uniformLocs, this.programLoop.last);
    }
}
exports.Merger = Merger;

},{"./codebuilder":58,"./webglprogramloop":71}],71:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLProgramLoop = void 0;
class WebGLProgramLoop {
    constructor(program, repeat, effects = []) {
        this.last = false;
        this.program = program;
        this.repeat = repeat;
        this.effects = effects;
    }
    draw(gl, tex, framebuffer, uniformLocs, last) {
        for (let i = 0; i < this.repeat.num; i++) {
            const newLast = i === this.repeat.num - 1;
            if (this.program instanceof WebGLProgram) {
                // TODO figure out way to move this from loop
                gl.useProgram(this.program);
                // effects list is populated
                if (i === 0) {
                    for (const effect of this.effects) {
                        effect.applyUniforms(gl, uniformLocs);
                    }
                }
                if (newLast && last && this.last) {
                    // TODO need to send `this.last` all the way down
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
                // TODO can we remove this?
                //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                // use our last program as the draw program
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            else {
                if (this.repeat.func !== undefined) {
                    this.repeat.func(i);
                }
                for (const p of this.program) {
                    p.draw(gl, tex, framebuffer, uniformLocs, newLast);
                }
            }
        }
    }
}
exports.WebGLProgramLoop = WebGLProgramLoop;

},{}]},{},[1]);
