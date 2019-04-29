window.addEventListener("DOMContentLoaded", function() {
  loadImages(snootSprites, snootSources);
  loadImages(pBulletSprites, pBulletSources);
  loadImages(puffSprites, puffSources);
  loadImages(eBulletSprites, eBulletSources);
  loadImages(alienSprites, alienSources);

  // TODO get rid of this
  for (var i = 0; i < 1000; i+= 100) {
    for (var j = 0; j < 400; j+= 100) {
      enemies.push(new Alien(100 + i, 100 + j));
    }
  }
  /*
  enemies.push(
  new Alien(200, 200),
  new Alien(300, 200),
  new Alien(400, 200),
  new Alien(500, 200),
  new Alien(600, 200),
  );
  */
  var player = new Player();
  playerEntities.push(player);
  context.drawImage(snootSprites[0], 200, 200);
  update();
});

function drawEntities(entities) {
  for (var i = 0; i < entities.length; i++) {
    entities[i].draw();
  }
}

function updateEntities(entities) {
  for (var i = 0; i < entities.length; i++) {
    //console.log('updating')
    entities[i].update();
    entities[i].x += entities[i].vx;
    entities[i].y += entities[i].vy;
    if (entities[i].lifetime !== null) {
      entities[i].lifetime--;
      if (entities[i].lifetime <= 0) {
        entities[i].destroy();
      }
    }
    if (entities[i].insideBounds) {
      entities[i].x = clamp(entities[i].x, entities[i].sx / 2, width - entities[i].sx / 2);
    }
  }
}

function collide(colliders, collidees) {
  collisions = [];
  for (var i = 0; i < colliders.length; i++) {
    for (var j = 0; j < collidees.length; j++) {
      if (eCircleCollision(colliders[i], collidees[j])) {
        collisions.push([colliders[i], collidees[j]]);
      }
    }
  }
  return collisions;
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

  // collisions
  hitEnemies = collide(enemies, playerBullets);

  for (var i = 0; i < hitEnemies.length; i++) {
    hitEnemies[i][0].lifetime = 0;
    hitEnemies[i][1].lifetime = 0;
  }

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
