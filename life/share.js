function getVariable(variable) {
  let query = window.location.search.substring(1);
  let vars = query.split('&');
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split('=');
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return false;
}

function charToNum(c) {
  let code = c.charCodeAt(0);
  if (c === '~') {
    return 62;
  } else if (c === '-') {
    return 63;
  } else if (code <= '9'.charCodeAt(0)) {
    return code - '0'.charCodeAt(0);
  } else if (code <= 'Z'.charCodeAt(0)) {
    return 10 + code - 'A'.charCodeAt(0);
  } else if (code <= 'z'.charCodeAt(0)) {
    return 36 + code - 'a'.charCodeAt(0);
  }
}

function numToChar(n) {
  let str = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~-';
  return str.charAt(n);
}

function numToPaddedBinary(n, p) {
  let result = n.toString(2);
  let len = result.length;
  for (let i = 0; i < p - len; i++) {
    result = '0' + result;
  }
  return result;
}


/**
 * Encodes the board state in a variant of base64. It treats the board as a bit
 * string, starting from the top left corner and reading left to right and then
 * top to bottom. Each set of six bits is stored as its base64 equivalent,
 * except that decimal 63 is a `-' instead of `/', for safer URL encoding.
 * Blocks of consecutive `A's (all zeroes) are compressed. A `~' indicates that
 * the next X characters are all `A's, where X is the decimal value of the
 * following base64 character. In other words, the next X * 6 bits are all
 * zeroes.
 */
const encodeBoard = () => {
  let bitString = '';

  for (let j = 0; j < boardHeight; ++j) {
    for (let i = 0; i < boardWidth; ++i) {
      bitString += board[i][j];
    }
  }

  return compressA(binToB64(bitString));
}


/**
 * Decodes a board state from a special, compressed base64 string. Is the
 * opposite of `encodeBoard()', which you should see for more information
 */
const decodeBoard = (inString) => {
  let bitString = b64ToBin(uncompressA(inString));
  let c = 0;

  for (let j = 0; j < boardHeight; ++j) {
    for (let i = 0; i < boardWidth; ++i) {
      board[i][j] = parseInt(bitString[(j * boardWidth) + i]);
    }
  }

  /**
   * TODO: b64ToBin() pads each b64 digit out to six bits, which means that if
   * the number of squares on the board isn't divisible by 6 some data will get
   * pushed off the end and not read. Here's a dumb way to fix that, but you
   * should come up with a better one Cole. The easy way would be to just make
   * the board size a multiple of 6.
   */
  for (z = boardHeight * boardWidth % 6; z > 0; --z) {
    board[boardWidth - z][boardHeight - 1] = parseInt(bitString[bitString.length - z]);
  }
}


/**
 * Converts a binary string to base64, except that decimal 63 is represented by
 * `-' instead of `/', for safer URL encoding
 */
const binToB64 = (bitString) => {
  let b64String = '';
  for (let i = 0; i < bitString.length; i += 6) {
    b64String += encodeNum(parseInt(bitString.substring(i, i + 6), 2));
  }
  return b64String;
}


/**
 * Converts a special base64 string to a binary string of six-bit numbers
 */
const b64ToBin = (b64String) => {
  let bitString = '';
  for (let i = 0; i < b64String.length; ++i) {
    bitString += decodeChar(b64String[i]).toString(2).padStart(6, '0');
  }
  return bitString
}


/**
 * Compresses consecutive `A's in a base64 string. Up to 63 consecutive `A's can
 * be represented by a `~' followed by a base64 number, which represents the
 * number of hidden `A's. A single A is still represented as just an A.
 */
const compressA = (b64String) => {
  let outString = '';
  let zeroCounter = 0;

  for (let i = 0; i < b64String.length; ++i) {
    if (zeroCounter < 63 && b64String[i] == 'A') {
      zeroCounter++;
    } else {
      if (zeroCounter == 1) {
        // single A's should be preserved
        outString += 'A';
        zeroCounter = 0;
      } else if (zeroCounter > 1) {
        outString += '~' + encodeNum(zeroCounter);
        zeroCounter = 0;
      }
      outString += b64String[i];
    }
  }

  // edge case where we end with an A
  if (zeroCounter > 0)
    outString += 'A';
  
  return outString;
}


/**
 * Uncompresses consecutive `A's according to the scheme from `compressA()',
 * returning a special base64 string
 */
const uncompressA = (inString) => {
  let b64String = '';

  for (let i = 0; i < inString.length; ++i) {
    if (inString[i] == '~') {
      b64String += 'A'.repeat(decodeChar(inString[++i]));
    } else {
      b64String += inString[i];
    }
  }

  return b64String;
}


/**
 * Encodes a single six-bit number into base64, except that decimal 63 is `-'
 * instead of `/'
 */
const encodeNum = (i) => 
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-'[i];


/**
 * Decodes a single character into a six-bit decimal number using the scheme
 * from `encodeNum()'
 */
const decodeChar = (c) =>
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-'.indexOf(c);



function boardToBinary() {
  let result = '';
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      result += board[i][j];
    }
  }
  let len = 6 - result.length % 6;
  for (let i = 0; i < len; i++) { // add extra zeros
    result += 0;
  }
  return result;
}

function binToChars(bin) { // TODO test this
  let result = '';
  let bins = bin.match(/.{1,6}/g);
  for (let i = 0; i < bins.length; i++) {
    result += numToChar(parseInt(bins[i], 2));
  }
  return result;
}

function charsToBin(chars) {
  let result = '';
  for (let i = 0; i < chars.length; i++) {
    result += numToPaddedBinary(charToNum(chars.charAt(i)), 6);
  }
  return result;
}

function binaryToBoard(bin) {
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      board[i][j] = parseInt(bin.charAt((i * boardHeight + j) % bin.length), 2);
    }
  }
}

function copyLink() {
  shareTextArea.select();
  document.execCommand('copy');
}
