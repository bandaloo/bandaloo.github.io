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
function encodeBoard() {
  let bitString = '';
  let sectionWidth = corner.x2 - corner.x1 + 1;
  let sectionHeight = corner.y2 - corner.y1 + 1;

  // TODO iterate row-major
  for (let j = corner.y1; j < corner.y2 + 1; ++j) {
    for (let i = corner.x1; i < corner.x2 + 1; ++i) {
      bitString += board[i][j];
    }
  }
  let boardSize = sectionWidth * sectionHeight;
  bitString = bitString.padEnd(boardSize + (6 - boardSize % 6), '0');

  return compressA(binToB64(bitString));
}


/**
 * Decodes a board state from a special, compressed base64 string. Is the
 * opposite of `encodeBoard()', which you should see for more information
 */
function decodeBoard(inString) {
  let bitString = b64ToBin(uncompressA(inString));
  let c = 0;
  let sectionWidth = corner.x2 - corner.x1 + 1;
  let sectionHeight = corner.y2 - corner.y1 + 1;
  bitString = bitString.slice(0, sectionWidth * sectionHeight);

  // TODO iterate row-major
  for (let j = 0; j < sectionHeight; ++j) {
    for (let i = 0; i < sectionWidth; ++i) {
      board[i + corner.x1][j + corner.y1] = parseInt(bitString[(j * (corner.x2 + 1 - corner.x1) + i) % bitString.length]);
    }
  }
}


/**
 * Converts a binary string to base64, except that decimal 63 is represented by
 * `-' instead of `/', for safer URL encoding
 */
function binToB64(bitString) {
  let b64String = '';
  for (let i = 0; i < bitString.length; i += 6) {
    b64String += encodeNum(parseInt(bitString.substring(i, i + 6), 2));
  }
  return b64String;
}


/**
 * Converts a special base64 string to a binary string of six-bit numbers
 */
function b64ToBin(b64String) {
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
function compressA(b64String) {
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
function uncompressA(inString) {
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

function copyLink() {
  shareTextArea.select();
  document.execCommand('copy');
}
