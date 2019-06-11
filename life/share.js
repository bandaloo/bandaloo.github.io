function getVariable(variable) {
  let query = window.location.search.substring(1);
  let vars = query.split("&");
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split("=");
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
  let str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~-";
  return str.charAt(n);
}

function numToPaddedBinary(n, p) {
  let result = n.toString(2);
  let len = result.length;
  for (let i = 0; i < p - len; i++) {
    result = "0" + result;
  }
  return result;
}

function boardToBinary() {
  let result = "";
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
  let result = "";
  let bins = bin.match(/.{1,6}/g);
  for (let i = 0; i < bins.length; i++) {
    result += numToChar(parseInt(bins[i], 2));
  }
  return result;
}

function charsToBin(chars) {
  let result = "";
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
