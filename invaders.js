window.addEventListener("DOMContentLoaded", function() {
  loadImages(snootSprites, snootSources);
  loadImages(pBulletSprites, pBulletSources);
  loadImages(puffSprites, puffSources);
  loadImages(eBulletSprites, eBulletSources);
  loadImages(alienSprites, alienSources);
  loadImages(fatAlienSprites, fatAlienSources);
  console.log(alienSprites);
  console.log(fatAlienSprites);

  // TODO get rid of this
  for (var i = 0; i < 1000; i+= 100) {
    for (var j = 0; j < 400; j+= 100) {
      enemies.push(new Alien(100 + i, 200 + j));
    }
  }

  enemies.push(new FatAlien(100, 100));
  enemies.push(new FatAlien(300, 100));
  enemies.push(new FatAlien(500, 100));
  enemies.push(new FatAlien(700, 100));

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
    var entity = entities[i];
    entity.update();
    entity.x += entity.vx;
    entity.y += entity.vy;
    if (entity.lifetime !== null) {
      entity.lifetime--;
    }
    if (entity.lifetime !== null && entity.lifetime <= 0 
        || entity.health !== null && entity.health <= 0) {
      entity.destroy();
    }
    if (entity.insideBounds) {
      entity.x = clamp(entity.x, entity.sx / 2, width - entity.sx / 2);
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
  // TODO figure out why filtering by health breaks things
  return entities.filter(entity => (entity.lifetime === null || entity.lifetime > 0)
                         && (entity.health === null || entity.health > 0));
  /*
  return entities.filter(entity => entity.lifetime === null || entity.lifetime > 0);
  */
}

function update() {
  clearScreen();

  // collisions
  // TODO check if this really has to be global
  hitEnemies = collide(enemies, playerBullets);

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

  for (var i = 0; i < hitEnemies.length; i++) {
    hitEnemies[i][0].health--;
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
