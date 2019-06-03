// drawing functions

function basicDraw() {
  if (this.rotation != 0) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation);
    context.drawImage(this.sprites[this.counter], -this.sx / 2, -this.sy / 2);
    context.restore();
  } else {
    // TODO replace functions with drawCentered
    context.drawImage(this.sprites[this.counter], this.x - this.sx / 2, this.y - this.sy / 2);
  }
  if (debug) {
    context.beginPath();
    context.arc(this.x + this.collOffX, this.y + this.collOffY, this.sx / 2 * this.collScalar, 0, 2 * Math.PI);
    context.stroke();
  }
}

function drawCentered(sprite, x, y) {
  var sx = sprite.width;
  var sy = sprite.height;
  context.drawImage(sprite, x - sx / 2, y - sy / 2);
}

function drawLives(amount) {
  var size = lifeSprites[0].width;
  for (var i = 0; i < amount; i++) {
    context.drawImage(lifeSprites[i % lifeSprites.length], width - (i + 1) * size, 32);
  }
}

function drawGauge(amount) {
  d = (i, s, sprites, k = 0) => {
    var offset = 8 * Math.cos((ticks + k) / 50 + i);
    var index = (Math.floor(ticks / 10) + i) % sprites.length;
    drawCentered(sprites[index], width / 2 + s * i * 20, 16 + offset);
  }
  for (var i = 0; i < amount; i++) {
    for (var j = 0; j < 2; j++) {
      d(i, 1, whiteShapesSprites, i + (j + 1) * 10);
      d(i, -1, whiteShapesSprites, i + (j + 1) * 20);
    }
    d(i, 1, shapesSprites);
    d(i, -1, shapesSprites);
  }
}

// spawning functions
function spawnCircle(constructor, posx, posy, amount = 6, direction = 1, speed = 3, distance = 10) {
  for (var i = 0; i < amount; i++) {
    var x = Math.cos(2 * Math.PI * i / amount);
    var y = Math.sin(2 * Math.PI * i / amount);
    var enemy = new constructor(posx + x * distance, posy + y * distance)
    enemy.vx = x * speed;
    enemy.vy = y * speed;
    enemy.accx *= direction;
    enemies.push(enemy);
  }
}

// ------
// Entity 
// ------

function Entity(x, y, vx, vy, sx, sy, sprites) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.sx = sx;
  this.sy = sy;
  this.accx = 0;
  this.accy = 0;
  this.damping = 1;
  this.rotation = 0;
  this.sprites = sprites;
  this.counter = 0;
  this.animationDelay = 3;
  this.animationTimer = 0;
  this.lifetime = null;
  this.insideBounds = true;
  this.health = null;
  this.collScalar = 1;
  this.collOffX = 0;
  this.collOffY = 0;
  this.silent = false;
  this.gauge = 0;
}

Entity.prototype.stepAnimation = function() {
  this.animationTimer++;
  this.animationTimer %= this.animationDelay;
  if (this.animationTimer == 0) {
    this.counter++;
    this.counter %= this.sprites.length;
  }
};

Entity.prototype.destroy = function() {};

Entity.prototype.draw = basicDraw;

Entity.prototype.accelerate = function() {
  this.vx += this.accx;
  this.vy += this.accy;
  this.vx -= this.vx * this.damping;
  this.vy -= this.vy * this.damping;
};

Entity.prototype.atEdge = function() {
  return this.x == this.sx / 2 || this.x == width-this.sx / 2;
};

Entity.prototype.inbounds = function() {
  return rectangleCollision(0, 0, width, height, this.x - this.sx / 2, this.y - this.sy / 2, this.sx, this.sy);
}

Entity.prototype.offTop = function() {
  return y < -this.sy / 2;
}

Entity.prototype.offBottom = function() {
  return y > height + this.sy / 2;
}

// TODO add lifetime argument to this
Entity.prototype.explode = function(amount = 30, speedStart = 6, speedMultiplier = 5, sprites = coloredPuffSprites[this.color],
                                    extraLife = 20, randomize = false) {
  for (var i = 0; i < amount; i++) {
    particles.push(new Particle(this.x, this.y, 0, 0, 0.05, speedStart + Math.random() * speedMultiplier, 30, sprites,
                                extraLife, randomize));
  }
}

// ------
// Player
// ------

function Player() {
  Entity.call(this, width / 2, height - 32, 0, 0, 64, 64, snootSprites);
  this.acceleration = 0.8;
  this.maxSpeed = 15;
  this.insideBounds = true;
  this.collOffY = 16;
  this.damping = 0;
  this.jumpCount = 3;
  this.canSlow = false;
  this.animationDelay = 4;
  this.collScalar = 0.5;
  this.breaking = false;
}

Player.prototype = Object.create(Entity.prototype);

Player.prototype.update = function() {
  // Player does not use the Entity acceleration function
  if (buttons.leftPressed) {
    this.vx = -this.acceleration * 2;
  } else if (buttons.rightPressed) {
    this.vx = this.acceleration * 2;
  } else if (!buttons.leftHeld && !buttons.rightHeld) {
    this.vx = 0;
  }

  if (buttons.primaryPressed && this.jumpCount > 0) {
    this.onGround = false;
    this.canSlow = true;
    this.jumpCount--;
    this.vy = -20;
    this.accy = 1;
  }

  if (buttons.primaryReleased && this.canSlow && this.vy < 0) {
    this.vy *= 0.4;
  }

  if (buttons.secondaryPressed && this.gauge >= 16) {
    this.breaking = true;
  }

  this.vx += Math.sign(this.vx) * this.acceleration;
  this.vx = clamp(this.vx, -this.maxSpeed, this.maxSpeed);
  this.rotation = this.vx / 48; // originally / 64
  
  this.stepAnimation();
  this.accelerate();

  // on ground
  if (this.y > height - this.sy / 2) {
    this.accy = 0;
    this.vy = 0;
    this.y = height - this.sy / 2;
    this.onGround = true;
    this.jumpCount = 3;
  }

  if (this.counter == 0 && this.animationTimer == 0) {
    const shoot = (n) => {
      var pBullet = new PlayerBullet(this.x + n * 20, this.y - 16, 20, -Math.PI / 2 + this.rotation + n / 10);
      playerBullets.push(pBullet);
    }

    var shotAmount = 0;
    if (this.breaking) {
      if (this.gauge >= 16) {
        shotAmount = 3;
      } else {
        shotAmount = 2;
      }
      this.gauge--;
      if (this.gauge <= 0) {
        this.breaking = false;
      }
    }
    shoot(0);
    for (var i = 1; i < shotAmount; i++) {
      shoot(i);
      shoot(-i);
    }
  }
}

// -----
// Enemy 
// -----

function Enemy(x, y, vx, vy, sx, sy, sprites) {
  Entity.call(this, x, y, vx, vy, sx, sy, sprites);
  this.health = 1;
}

Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.destroy = function(amount = 10, speedStart = 6, speedMultiplier = 5) {
  this.explode(amount, speedStart, speedMultiplier);
}

Enemy.prototype.hit = function() {
  // TODO figure out a way to prevent two bullets at same time hitting enemy
  pickups.push(new Cube(this.x, this.y));
};

Enemy.prototype.bumpDown = function(bumpSpeed) {
  this.vy = bumpSpeed;
  this.vx *= -1;
  this.accx *= -1;
}

// -----
// Alien
// -----

function Alien(x, y, direction = 1) {
  Enemy.call(this, x, y, 0, 0, 64, 64, alienSprites);
  this.accx = 0.8 * direction;
  this.damping = 0.1;
  this.color = 'green';
}

Alien.prototype = Object.create(Enemy.prototype);

Alien.prototype.update = function() {
  this.accelerate();
  this.stepAnimation();
  if (this.atEdge()) {
    this.bumpDown(5);
  }
  if (Math.random() > 0.997) {
    enemyBullets.push(new EnemyBullet(this.x, this.y, 3, Math.PI / 2));
  }
}

// ---------
// Fat Alien
// ---------

function FatAlien(x, y) {
  Enemy.call(this, x, y, 0, 0, 128, 128, fatAlienSprites);
  this.accx = 0.3;
  this.damping = 0.1;
  this.health = 6;
  this.color = 'purple';
}

FatAlien.prototype = Object.create(Enemy.prototype);

FatAlien.prototype.update = function() {
  this.accelerate();
  this.stepAnimation();
  if (this.atEdge()) {
    this.bumpDown(8);
  }
  this.animationDelay = 5;
}

FatAlien.prototype.destroy = function() {
  spawnCircle(Alien, this.x, this.y, 6, Math.sign(this.vx), 4, 10);
  Enemy.prototype.destroy.call(this, 50, 10, 10);
}

FatAlien.prototype.hit = function() {
  Enemy.prototype.hit.call(this);
  this.vy = -2.5;
}

// -----
// Tooth
// -----

function Tooth(x, y) {
  Enemy.call(this, x, y, 0, 0, 64, 64, toothSprites);
  //this.accx = 0.3;
  this.damping = 0.1;
  this.health = 5; // TODO change this health to lower
  this.rotationCounter = 0;
  this.moveCounter = 0;
  this.moveDirection = 1;
  this.color = 'orange';
  this.shotSide = 1;
}

Tooth.prototype = Object.create(Enemy.prototype);

Tooth.prototype.update = function() {
  this.rotationCounter += 0.025
  this.rotation = Math.cos(this.rotationCounter) / 2;
  this.stepAnimation();
  this.animationDelay = 7
  if (this.animationTimer == 0 && this.counter == 0) {
    var direction = this.rotation + Math.PI / 2 + Math.PI / 6 * this.shotSide;
    enemyBullets.push(new EnemyBullet(this.x + 20 * Math.cos(direction), this.y + 20 * Math.sin(direction), 3, direction));
    this.shotSide *= -1;
    this.moveCounter++;
  }

  if (this.moveCounter >= 5) {
    this.moveCounter = 0;
    this.vx = 10 * this.moveDirection;
  }
  this.accelerate();
  if (this.atEdge()) {
    this.bumpDown(5);
    this.moveDirection *= -1;
  }
}

Tooth.prototype.hit = function() {
  // TODO maybe make the bullet turn into the cube
  Enemy.prototype.hit.call(this);
  this.vy = -5;
}

// -------------
// Player Bullet
// -------------

function PlayerBullet(x, y, speed, direction) {
  var vx = speed * Math.cos(direction);
  var vy = speed * Math.sin(direction);
  Entity.call(this, x, y, vx, vy, 32, 32, pBulletSprites);
  this.counter = randRange(this.sprites.length);
  this.lifetime = 48;
  this.insideBounds = false;
  this.color = 'red';
}

PlayerBullet.prototype = Object.create(Entity.prototype);

PlayerBullet.prototype.destroy = function() {
  this.explode(5, 4, 2);
}

PlayerBullet.prototype.update = function() {
  particles.push(new Particle(this.x, this.y, 0, 0.4, 0.01, 1.5, 7, coloredPuffSprites['red']));
  this.stepAnimation();
  if (!this.inbounds()) {
    this.silent = true;
    this.lifetime = 0;
  }
};

// -------------
// Enemy Bullet
// -------------

function EnemyBullet(x, y, speed, direction) {
  // TODO try to get rid of repeated code here
  var vx = speed * Math.cos(direction);
  var vy = speed * Math.sin(direction);
  Entity.call(this, x, y, vx, vy, 32, 32, eBulletSprites);
  this.lifetime = 1000; // shouldn't really die before it leaves the screen anyways
  this.puffCounter = 20;
  this.insideBounds = false;
  this.rotation = -Math.atan2(vx, vy);
}

EnemyBullet.prototype = Object.create(Entity.prototype);

EnemyBullet.prototype.update = function() {
  this.puffCounter--;
  if (this.puffCounter <= 0) {
    this.puffCounter = 20;
    particles.push(new Particle(this.x, this.y, 0, 0, 0.01, 0.2, 60, coloredPuffSprites['pink']));
  }
  if (!this.inbounds()) {
    this.lifetime = 0;
  }
}

// --------
// Particle
// --------

function Particle(x, y, accx, accy, damping, speed, lifetime, sprites, extraLife = 0, randomize = false) {
  Entity.call(this, x, y, 0, 0, 32, 32, sprites);
  this.lifetime = lifetime;
  this.maxLifetime = lifetime;
  this.accx = accx;
  this.accy = accy;
  this.damping = damping;
  var direction = Math.random() * 2 * Math.PI;
  var vx = speed * Math.cos(direction);
  var vy = speed * Math.sin(direction);
  this.vx = vx;
  this.vy = vy;
  this.animationOffset = 0;

  if (randomize) {
    this.animationOffset = Math.floor(sprites.length * Math.random());
  }

  if (extraLife) {
    this.lifetime += Math.floor(extraLife * Math.random());
    this.maxLifetime = this.lifetime;
  }
}

Particle.prototype = Object.create(Entity.prototype);

Particle.prototype.update = function() {
  this.accelerate();
  var frameCount = Math.ceil(this.sprites.length * this.lifetime / this.maxLifetime) - 1;
  this.counter = ((this.sprites.length - 1) - frameCount + this.animationOffset) % this.sprites.length;
}

// ----
// Cube
// ----

function Cube(x, y) {
  Entity.call(this, x, y, 0, 0, 64, 64, cubeSprites);
  this.accy = 1;
  this.damping = 0.2;
  var direction = Math.random() * 2 * Math.PI;
  this.vx = 20 * Math.cos(direction);
  this.vy = 20 * Math.sin(direction);
  this.following = false;
}

Cube.prototype = Object.create(Entity.prototype);

Cube.prototype.update = function() {
  this.accelerate();
  this.stepAnimation();
  if (!this.inbounds() && !this.following) {
    this.lifetime = 0;
  }
  var distSquared = entityDistSquared(this, playerEntities[0]);
  if (distSquared <= 200**2) {
    var accx = playerEntities[0].x - this.x;
    var accy = playerEntities[0].y - this.y;
    var dist = distance(0, 0, accx, accy);
    accx /= dist;
    accy /= dist;
    this.accx = 5 * accx;
    this.accy = 1 + 5 * accy;
    this.following = true;
  } else {
    this.following = false;
  }
}

Cube.prototype.destroy = function() {
  this.explode(12, 4, 3, shapesSprites, 20, true);
}
