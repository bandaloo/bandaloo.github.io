window.addEventListener("load", function() {
  loadImages(snootSprites, snootSources);
  loadImages(pBulletSprites, pBulletSources);
  loadImages(puffSprites, puffSources);
  loadImages(eBulletSprites, eBulletSources);
  loadImages(alienSprites, alienSources);
  loadImages(fatAlienSprites, fatAlienSources);
  loadImages(toothSprites, toothSources);
  loadImages(lifeSprites, lifeSources);
  loadImages(shapesSprites, shapesSources);
  loadImages(cubeSprites, cubeSources);

  //redPuffSprites = puffSprites.slice();

  blendImages(alienSprites, 124, 255, 11, 0.6);
  blendImages(fatAlienSprites, 166, 16, 232);
  blendImages(pBulletSprites, ...colors.red);
  blendImages(snootSprites, 255, 68, 31);
  blendImages(toothSprites, 255, 209, 47);
  blendImages(eBulletSprites, ...colors.pink);
  blendImages(lifeSprites, ...colors.red, 0.67);
 
  // making cube blink
  cubeSprites[0] = blendWithColor(cubeSprites[0], ...colors.red);
  cubeSprites[1] = blendWithColor(cubeSprites[1], ...colors.yellow);
  cubeSprites[4] = blendWithColor(cubeSprites[4], ...colors.purple);
  cubeSprites[5] = blendWithColor(cubeSprites[5], ...colors.green);

  shapesSprites[0] = blendWithColor(shapesSprites[0], ...colors.red);
  shapesSprites[1] = blendWithColor(shapesSprites[1], ...colors.yellow);
  shapesSprites[2] = blendWithColor(shapesSprites[2], ...colors.purple);
  shapesSprites[3] = blendWithColor(shapesSprites[3], ...colors.green);

  // generate set of colored puffs
  console.log(Object.entries(colors));
  var entries = Object.entries(colors);

  for (var i = 0; i < entries.length; i++) {
    var key = entries[i][0];
    var value = entries[i][1];
    console.log(key, value);
    coloredPuffSprites[key] = puffSprites.slice();
    blendImages(coloredPuffSprites[key], ...colors[key], 0.65, 0.08);
  }

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

  enemies.push(new Tooth(700, 100));

  var player = new Player();
  playerEntities.push(player);
  update();
});

function drawEntities(entities = 0) {
  for (var i = 0; i < entities.length; i++) {
    entities[i].draw();
  }
}

function destroyEntities(entities) {
  // TODO maybe if something expires by lifetime, it shouldn't do the destroy function, just get destroyed silently
  for (var i = 0; i < entities.length; i++) {
    var entity = entities[i];
    if (entity.lifetime !== null && entity.lifetime <= 0 
        || entity.health !== null && entity.health <= 0) {
      if (!entity.silent) {
        entity.destroy();
      }
    }
  }
}

function updateEntities(entities) {
  var len = entities.length;
  for (var i = 0; i < len; i++) {
    var entity = entities[i];
    entity.update();
    entity.x += entity.vx;
    entity.y += entity.vy;
    if (entity.lifetime !== null) {
      entity.lifetime--;
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
  return entities.filter(entity => (entity.lifetime === null || entity.lifetime > 0)
                         && (entity.health === null || entity.health > 0));
}

function update() {
  clearScreen();

  var hitEnemies = collide(enemies, playerBullets);
  var hitPlayers = collide(enemyBullets, playerEntities);
  var hitCubes = collide(pickups, playerEntities);

  // TODO make updating, drawing and clearing better
  // TODO do the thing where each list iterates with original length
  updateEntities(pickups);
  updateEntities(particles);
  updateEntities(playerEntities);
  updateEntities(playerBullets);
  updateEntities(enemies);
  updateEntities(enemyBullets);

  drawLives(5);

  drawEntities(pickups);
  drawEntities(particles);
  drawEntities(playerEntities);
  drawEntities(playerBullets);
  drawEntities(enemies);
  drawEntities(enemyBullets);

  // TODO check if it makes more sense to filter before draw
  // resolving bullets hitting enemies
  for (var i = 0; i < hitEnemies.length; i++) {
    hitEnemies[i][0].health--;
    hitEnemies[i][0].hit();
    hitEnemies[i][1].lifetime = 0;
  }

  for (var i = 0; i < hitCubes.length; i++) {
    hitCubes[i][0].lifetime = 0;
  }

  // resolving enemy bullets hitting players
  // TODO figure out how to avoid double hit; probably can do that by filtering afterwards
  for (var i = 0; i < hitPlayers.length; i++) {
    hitPlayers[i][0].lifetime = 0;
  }

  destroyEntities(pickups);
  destroyEntities(particles);
  destroyEntities(playerEntities);
  destroyEntities(playerBullets);
  destroyEntities(enemies);
  destroyEntities(enemyBullets);

  // TODO figure out why moving this block after the collision event means destroy doesn't happen
  pickups = filterEntities(pickups);
  particles = filterEntities(particles);
  playerEntities = filterEntities(playerEntities);
  playerBullets = filterEntities(playerBullets);
  enemies = filterEntities(enemies);
  enemyBullets = filterEntities(enemyBullets);

  ticks++;

  requestAnimationFrame(update);

  // TODO check if this should be before requesting animation frame
  // TODO set other pressed buttons to false; maybe put into function
  buttons.leftPressed = false;
  buttons.downPressed = false;
  buttons.upPressed = false;
  buttons.rightPressed = false;
  buttons.primaryPressed = false;
  buttons.secondaryPressed = false;

  buttons.leftReleased = false;
  buttons.downReleased = false;
  buttons.upReleased = false;
  buttons.rightReleased = false;
  buttons.primaryReleased = false;
  buttons.secondaryReleased = false;
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

/*
function blendAllImages() {
}
*/
