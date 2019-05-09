var buttons = {
  leftHeld: false,
  leftPressed: false,
  leftReleased: false,
  leftHeld: false,
  leftPressed: false,
  upHeld: false,
  upPressed: false,
  upReleased: false,
  rightHeld: false,
  rightPressed: false,
  rightReleased: false,
  primaryHeld: false,
  primaryPressed: false,
  primaryReleased: false,
  secondaryHeld: false,
  secondaryPressed: false,
  secondaryReleased: false
};

document.addEventListener('keydown', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);

  if ([37, 38, 39, 40, 32].includes(code)) {
    e.preventDefault();
  }

  if (key == 'A' || code == 37) { // left
    if (!buttons.leftHeld) {
      buttons.leftPressed = true;
    }
    buttons.leftHeld = true;
  }
  if (key == 'S' || code == 40) { // down
    if (!buttons.downHeld) {
      buttons.downPressed = true;
    }
    buttons.downHeld = true;
  }
  if (key == 'W' || code == 38) { // up
    if (!buttons.upHeld) {
      buttons.upPressed = true;
    }
    buttons.upHeld = true;
  }
  if (key == 'D' || code == 39) { // right
    if (!buttons.rightHeld) {
      buttons.rightPressed = true;
    }
    buttons.rightHeld = true;
  }
  if (key == 'J' || code == 32) { // primary
    if (!buttons.primaryHeld) {
      buttons.primaryPressed = true;
    }
    buttons.primaryHeld = true;
  }
  if (key == 'K' || code == 16) { // secondary
    if (!buttons.secondaryHeld) {
      buttons.secondaryPressed = true;
    }
    buttons.secondaryHeld = true;
  }
});

document.addEventListener('keyup', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);
  if (key == 'A' || code == 37) { // left
    buttons.leftHeld = false;
    buttons.leftReleased = true;
  }
  if (key == 'S' || code == 40) { // down
    buttons.downHeld = false;
    buttons.downReleased = true;
  }
  if (key == 'W' || code == 38) { // up
    buttons.upHeld = false;
    buttons.upReleased = true;
  }
  if (key == 'D' || code == 39) { // right
    buttons.rightHeld = false;
    buttons.rightReleased = true;
  }
  if (key == 'J' || code == 32) { // primary
    buttons.primaryHeld = false;
    buttons.primaryReleased = true;
  }
  if (key == 'K' || code == 16) { // secondary
    buttons.secondaryHeld = false;
    buttons.secondaryReleased = true;
  }
});
