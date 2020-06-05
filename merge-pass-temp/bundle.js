(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

require("core-js/modules/es.array.concat");

require("core-js/modules/es.string.repeat");

var MP = _interopRequireWildcard(require("@bandaloo/merge-pass"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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


var brightness = new MP.Brightness(["uBrightness", 0.0]); // we could have done `new MP.Brightness(0.0)` but by wrapping

var blur = new MP.Blur(["uBlur", [1, 1]]).repeat(3);
var grain = new MP.Grain(0.1);
var hueAdd = new MP.HueAdd(["uHue", 0]); // create the merger with your source canvas

var merger = new MP.Merger([blur, hueAdd, grain, brightness], sourceCanvas, gl); // instead of a canvas for the source, you can pass anything of type
// `TexImageSource`, which includes: `ImageBitmap | ImageData | HTMLImageElement
// | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas` so it is actually
// pretty flexible
// let's draw something interesting and kick of a draw loop

var steps = 0;

var draw = function draw(time) {
  var t = steps / 60;
  steps++;
  merger.draw();
  brightness.setUniform("uBrightness", 0.3 * Math.cos(time / 2000));
  blur.setUniform("uBlur", [Math.pow(Math.cos(time / 1000), 8), 0]);
  hueAdd.setUniform("uHue", t / 9); // draw crazy stripes (adapted from my dweet https://www.dwitter.net/d/18968)

  var i = Math.floor(t * 9);
  var j = Math.floor(i / 44);
  var k = i % 44;
  source.fillStyle = "hsl(".concat((k & j) * i, ",40%,").concat(50 + Math.cos(t) * 10, "%)");
  source.fillRect(k * 24, 0, 24, k + 2);
  source.drawImage(sourceCanvas, 0, k + 2);
  requestAnimationFrame(draw);
};

draw(0);

},{"@bandaloo/merge-pass":68,"core-js/modules/es.array.concat":56,"core-js/modules/es.string.repeat":57}],2:[function(require,module,exports){
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
exports.uniformGLSLTypeStr = exports.tag = exports.uniformGLSLTypeNum = exports.Effect = void 0;
class Effect {
    constructor(source) {
        this.needsDepthBuffer = false;
        this.needsNeighborSample = false;
        this.needsCenterSample = true;
        this.repeatNum = 1;
        this.uniforms = {};
        this.externalFuncs = [];
        let sourceString = "";
        if (source.sections.length - source.values.length !== 1) {
            throw new Error("wrong lengths for source and values");
        }
        // put all of the values between all of the source sections
        for (let i = 0; i < source.values.length; i++) {
            sourceString +=
                source.sections[i] + this.processGLSLVal(source.values[i]);
        }
        sourceString += source.sections[source.sections.length - 1];
        this.fShaderSource = sourceString;
    }
    setUniform(name, newVal) {
        var _a;
        const oldVal = (_a = this.uniforms[name]) === null || _a === void 0 ? void 0 : _a.val;
        if (oldVal === undefined) {
            console.warn("tried to set uniform " + name + " which doesn't exist");
            return;
        }
        const oldType = uniformGLSLTypeNum(oldVal);
        const newType = uniformGLSLTypeNum(newVal);
        if (oldType !== newType) {
            console.warn("tried to set uniform " + name + " to a new type");
            return;
        }
        this.uniforms[name].val = newVal;
        this.uniforms[name].changed = true;
    }
    processGLSLVal(val) {
        if (typeof val === "number") {
            // this is a float
            val;
            return toGLSLFloatString(val);
        }
        // TODO rewrite this with the helper functions at bottom of file
        if (typeof val[0] === "string") {
            // this is a named value, so it should be inserted as a uniform
            const namedVal = val;
            const name = namedVal[0];
            const uniformVal = namedVal[1];
            this.uniforms[name] = { val: uniformVal, changed: true };
            return name;
        }
        // not a named value, so it can be inserted into code directly like a macro
        const uniformVal = val;
        return `vec${uniformVal.length}(${uniformVal
            .map((n) => toGLSLFloatString(n))
            .join(", ")})`;
    }
    repeat(num) {
        this.repeatNum = num;
        return this;
    }
}
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

},{}],59:[function(require,module,exports){
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
}`);
        this.needsNeighborSample = true;
        this.needsCenterSample = false;
    }
}
exports.Blur = Blur;

},{"../effect":58}],60:[function(require,module,exports){
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
}`);
    }
}
exports.Brightness = Brightness;

},{"../effect":58}],61:[function(require,module,exports){
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
}`);
    }
}
exports.Contrast = Contrast;

},{"../effect":58}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grain = void 0;
const effect_1 = require("../effect");
const __1 = require("..");
class Grain extends effect_1.Effect {
    constructor(val) {
        super(effect_1.tag `void main() {
  gl_FragColor = vec4((1.0 - ${val} * random(gl_FragCoord.xy)) * gl_FragColor.rgb, gl_FragColor.a);
}`);
        this.externalFuncs = [__1.glslFuncs.random];
    }
}
exports.Grain = Grain;

},{"..":68,"../effect":58}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSV = void 0;
const effect_1 = require("../effect");
const glslfunctions_1 = require("../glslfunctions");
class HSV extends effect_1.Effect {
    /**
     * @param vec hue, sat and brightness components
     * @param mask which original color components to zero out and which to keep
     * (defaults to only zeroing out all of original color)
     */
    constructor(vec, mask = [0, 0, 0]) {
        super(effect_1.tag `void main () {
  vec3 hsv = rgb2hsv(gl_FragColor.rgb);
  vec3 m = ${mask};
  hsv.xyz = (vec3(1., 1., 1.) - m) * ${vec} + m * hsv.xyz;
  vec3 rgb = hsv2rgb(hsv);
  gl_FragColor = vec4(rgb.r, rgb.g, rgb.b, gl_FragColor.a);
}`);
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.HSV = HSV;

},{"../effect":58,"../glslfunctions":67}],64:[function(require,module,exports){
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

},{"./hsv":63}],65:[function(require,module,exports){
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
        super(genHSVSource("x", "+", num));
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.HueAdd = HueAdd;
class SaturationAdd extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("y", "+", num));
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.SaturationAdd = SaturationAdd;
class ValueAdd extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("z", "+", num));
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.ValueAdd = ValueAdd;
class Hue extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("x", "", num));
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.Hue = Hue;
class Saturation extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("y", "", num));
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.Saturation = Saturation;
class Value extends effect_1.Effect {
    constructor(num) {
        super(genHSVSource("z", "", num));
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb, glslfunctions_1.glslFuncs.rgb2hsv];
    }
}
exports.Value = Value;

},{"../effect":58,"../glslfunctions":67}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class Passthrough extends __1.Effect {
    constructor() {
        super(__1.tag `void main () {
}`);
    }
}

},{"..":68}],67:[function(require,module,exports){
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

},{}],68:[function(require,module,exports){
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

},{"./effect":58,"./effects/blur":59,"./effects/brightness":60,"./effects/contrast":61,"./effects/grain":62,"./effects/hsv":63,"./effects/hsvadd":64,"./effects/hsvhelpers":65,"./effects/passthrough":66,"./glslfunctions":67,"./mergepass":69}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Merger = void 0;
const effect_1 = require("./effect");
const BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump float uTime;
uniform mediump vec2 uResolution;\n`;
// the line below, which gets placed as the first line of `main`, enables allows
// multiple shaders to be chained together, which works for shaders that don't
// need to use `uSampler` for anything other than the current pixel
const FRAG_SET = `\n  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);`;
const V_SOURCE = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}\n`;
class Merger {
    constructor(effects, source, gl, options) {
        this.fShaders = [];
        this.programs = [];
        this.repeatNums = [];
        this.uniformLocs = {};
        /** effects grouped by program */
        this.lumpedEffects = [];
        this.effects = effects;
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
        this.vShader = vShader;
        this.gl.shaderSource(vShader, V_SOURCE);
        this.gl.compileShader(vShader);
        // make textures
        this.texBack = this.makeTexture();
        this.texFront = this.makeTexture();
        // create the framebuffer
        const framebuffer = gl.createFramebuffer();
        if (framebuffer === null) {
            throw new Error("problem creating the framebuffer");
        }
        this.framebuffer = framebuffer;
        // generate the fragment shaders and programs
        this.generateCode();
    }
    makeTexture() {
        var _a, _b;
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
        return texture;
    }
    sendTexture(src) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, src);
    }
    generateCode() {
        let code = "";
        let calls = "\n";
        let needsCenterSample = false;
        let externalFuncs = [];
        let uniformDeclarations = [];
        let effectLump = [];
        // using this style of loop since we need to do something different on the
        // last element and also know the next element
        for (let i = 0; i < this.effects.length; i++) {
            /** code for each function call to each shader pass */
            const e = this.effects[i];
            effectLump.push(e);
            const next = this.effects[i + 1];
            needsCenterSample = needsCenterSample || e.needsCenterSample;
            // replace the main function
            const replacedFunc = "pass" + i + "()";
            const replacedCode = e.fShaderSource.replace(/main\s*\(\)/, replacedFunc);
            code += "\n" + replacedCode + "\n";
            // an effect that samples neighbors cannot just be run in a for loop
            const forStr = !e.needsNeighborSample && e.repeatNum > 1
                ? `for (int i = 0; i < ${e.repeatNum}; i++) `
                : "";
            calls += "  " + forStr + replacedFunc + ";\n";
            for (const func of e.externalFuncs) {
                if (!externalFuncs.includes("\n" + func))
                    externalFuncs.push("\n" + func);
            }
            for (const name in e.uniforms) {
                const uniformVal = e.uniforms[name];
                const typeName = effect_1.uniformGLSLTypeStr(uniformVal.val);
                uniformDeclarations.push(`uniform mediump ${typeName} ${name};`);
            }
            if (next === undefined ||
                (e.needsNeighborSample && e.repeatNum > 1) ||
                next.needsNeighborSample) {
                // set up the fragment shader
                const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
                if (fShader === null) {
                    throw new Error("problem creating fragment shader");
                }
                const fullCode = BOILERPLATE +
                    "\n" +
                    uniformDeclarations.join("\n") +
                    "\n" +
                    externalFuncs.join("\n\n") +
                    "\n" +
                    code +
                    "\nvoid main () {" +
                    (needsCenterSample ? FRAG_SET : "") +
                    calls +
                    "}";
                this.gl.shaderSource(fShader, fullCode);
                this.gl.compileShader(fShader);
                // set up the program
                const program = this.gl.createProgram();
                if (program === null) {
                    throw new Error("problem creating program");
                }
                this.gl.attachShader(program, this.vShader);
                this.gl.attachShader(program, fShader);
                console.log("vertex shader info log");
                console.log(this.gl.getShaderInfoLog(this.vShader));
                console.log("fragment shader info log");
                console.log(this.gl.getShaderInfoLog(fShader));
                this.gl.linkProgram(program);
                // we need to use the program here so we can get uniform locations
                this.gl.useProgram(program);
                for (const effect of effectLump) {
                    for (const name in effect.uniforms) {
                        const location = this.gl.getUniformLocation(program, name);
                        if (location === null) {
                            throw new Error("couldn't find uniform " + name);
                        }
                        if (this.uniformLocs[name] !== undefined) {
                            throw new Error("uniforms have to all have unique names");
                        }
                        this.uniformLocs[name] = location;
                    }
                }
                // add the shader, the program and the repetitions to the lists
                this.fShaders.push(fShader);
                this.programs.push(program);
                // if the effect doesn't need to sample neighbors, then the repetition
                // of the effect is handled as a for loop in the code generation step,
                // the repeat number can just be 1
                this.repeatNums.push(e.needsNeighborSample ? e.repeatNum : 1);
                // set the uniform resolution (every program has this uniform)
                const uResolution = this.gl.getUniformLocation(program, "uResolution");
                this.gl.uniform2f(uResolution, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
                const position = this.gl.getAttribLocation(program, "aPosition");
                // enable the attribute
                this.gl.enableVertexAttribArray(position);
                // this will point to the vertices in the last bound array buffer.
                // In this example, we only use one array buffer, where we're storing
                // our vertices
                this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0);
                this.lumpedEffects.push(effectLump);
                console.log(fullCode);
                // clear the source code to start merging new shader source
                code = "";
                calls = "\n";
                needsCenterSample = false;
                externalFuncs = [];
                uniformDeclarations = [];
                effectLump = [];
            }
        }
        console.log(this.lumpedEffects);
    }
    applyUniforms(e) {
        for (const name in e.uniforms) {
            const loc = this.uniformLocs[name];
            const val = e.uniforms[name].val;
            if (e.uniforms[name].changed) {
                e.uniforms[name].changed = false;
                switch (effect_1.uniformGLSLTypeNum(val)) {
                    case 1:
                        const float = val;
                        this.gl.uniform1f(loc, float);
                        break;
                    case 2:
                        const vec2 = val;
                        this.gl.uniform2f(loc, vec2[0], vec2[1]);
                        break;
                    case 3:
                        const vec3 = val;
                        this.gl.uniform3f(loc, vec3[0], vec3[1], vec3[2]);
                        break;
                    case 4:
                        const vec4 = val;
                        this.gl.uniform4f(loc, vec4[0], vec4[1], vec4[2], vec4[3]);
                }
            }
        }
    }
    draw() {
        let programIndex = 0;
        this.sendTexture(this.source);
        [this.texBack, this.texFront] = [this.texFront, this.texBack];
        for (const program of this.programs) {
            this.gl.useProgram(program);
            const effectLump = this.lumpedEffects[programIndex];
            for (const e of effectLump) {
                this.applyUniforms(e);
            }
            for (let i = 0; i < this.repeatNums[programIndex]; i++) {
                if (programIndex === this.programs.length - 1 &&
                    i === this.repeatNums[programIndex] - 1) {
                    // we are on the final pass of the final program, so draw to screen
                    // set to the default framebuffer
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
                }
                else {
                    // we have to bounce between two textures
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
                    // use the framebuffer to write to front texture
                    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texFront, 0);
                }
                // allows us to read from `texBack`
                // default sampler is 0, so `uSampler` uniform will always sample from texture 0
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.texBack);
                [this.texBack, this.texFront] = [this.texFront, this.texBack];
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            }
            programIndex++;
        }
        // swap the textures
        //[this.texBack, this.texFront] = [this.texFront, this.texBack];
        // go back to the default framebuffer object
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // use our last program as the draw program
        // draw to the screen
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}
exports.Merger = Merger;

},{"./effect":58}]},{},[1]);
