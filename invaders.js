window.addEventListener("DOMContentLoaded", function() {
  loadImages(snootSprites, snootSources);
  loadImages(pBulletSprites, pBulletSources);
  loadImages(puffSprites, puffSources);
  loadImages(eBulletSprites, eBulletSources);
  loadImages(alienSprites, alienSources);

  // TODO get rid of this
  var firstEnemy = new Alien(200, 200);
  enemies.push(firstEnemy);
  var player = new Player();
  playerEntities.push(player);
  context.drawImage(snootSprites[0], 200, 200);
  update();
});

// TODO move these to a helper function script
function clamp(num, min, max) {
  return num < min ? min : num > max ? max : num;
}

function randRange(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function drawEntities(entities) {
  for (var i = 0; i < entities.length; i++) {
    entities[i].draw();
  }
}

function updateEntities(entities) {
  for (var i = 0; i < entities.length; i++) {
    entities[i].update();
    entities[i].x += entities[i].vx;
    entities[i].y += entities[i].vy;
    if (entities[i].lifetime !== null) {
      entities[i].lifetime--;
    }
    if (entities[i].insideBounds) {
      entities[i].x = clamp(entities[i].x, entities[i].sx / 2, width - entities[i].sx / 2);
    }
  }
}

function filterEntities(entities) {
  return entities.filter(entity => entity.lifetime === null || entity.lifetime > 0);
}

function update() {
  clearScreen();

  // TODO make updating, drawing and clearing better
  updateEntities(playerEntities);
  updateEntities(playerBullets);
  updateEntities(enemies);
  updateEntities(enemyBullets);
  updateEntities(particles);

  drawEntities(playerEntities);
  drawEntities(playerBullets);
  drawEntities(enemies);
  drawEntities(enemyBullets);
  drawEntities(particles);

  // TODO check if it makes more sense to filter before draw
  playerEntities = filterEntities(playerEntities);
  playerBullets = filterEntities(playerBullets);
  enemies = filterEntities(enemies);
  enemyBullets = filterEntities(enemyBullets);
  particles = filterEntities(particles);

  requestAnimationFrame(update);

  // TODO check if this should be before requesting animation frame
  buttons.leftPressed = false;
  buttons.downPressed = false;
  buttons.upPressed = false;
  buttons.rightPressed = false;
}

function clearScreen() {
  context.fillStyle = "#333333";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function loadImages(images, sources) {
  for (var i = 0; i < sources.length; i++) {
    images.push(document.getElementById(sources[i]));
  }
}
