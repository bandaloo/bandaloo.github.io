// drawing functions

function basicDraw() {
  if (this.rotation != 0) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation);
    context.drawImage(this.sprites[this.counter], -this.sx / 2, -this.sy / 2);
    context.restore();
  } else {
    context.drawImage(this.sprites[this.counter], this.x - this.sx / 2, this.y - this.sy / 2);
  }
  if (debug) {
    context.beginPath();
    context.arc(this.x + this.collOffX, this.y + this.collOffY, this.sx / 2 * this.collScalar, 0, 2 * Math.PI);
    context.stroke();
  }
}

function drawLives(amount) {
  for (var i = 0; i < amount; i++) {
    context.drawImage(lifeSprites[i % lifeSprites.length], width - (i + 1) * lifeSprites[0].width, 0);
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
  return rectangleCollision(0, 0, width, height, this.x - this.sx / 2,
                            this.y - this.sy / 2, this.sx, this.sy);
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

  this.vx += Math.sign(this.vx) * this.acceleration;
  this.vx = clamp(this.vx, -this.maxSpeed, this.maxSpeed);
  this.rotation = this.vx / 48; // originally / 64

  // TODO maybe move this to an off of screen function

  
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
    var pBullet = new PlayerBullet(this.x, this.y - 16, 20, -Math.PI / 2 + this.rotation)
    playerBullets.push(pBullet);
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

Enemy.prototype.destroy = function(amount = 30, speedStart = 6, speedMultiplier = 5) {
  // TODO move this into its own explosion function
  for (var i = 0; i < amount; i++) {
    particles.push(new Particle(this.x, this.y, 0, 0, 0.05, speedStart + Math.random() * speedMultiplier,
                                30, coloredPuffSprites[this.color]));
  }
}

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
    enemyBullets.push(new EnemyBullet(this.x, this.y, 2, Math.PI / 2));
  }
}

// ---------
// Fat Alien
// ---------

function FatAlien(x, y) {
  Enemy.call(this, x, y, 0, 0, 128, 128, fatAlienSprites);
  this.accx = 0.3;
  this.damping = 0.1;
  this.health = 10;
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

// -----
// Tooth
// -----

function Tooth(x, y) {
  Enemy.call(this, x, y, 0, 0, 64, 64, toothSprites);
  //this.accx = 0.3;
  this.damping = 0.1;
  this.health = 10; // TODO change this health to lower
  this.rotationCounter = 0;
  this.moveCounter = 0;
  this.moveDirection = 1;
  this.color = 'orange';
}

Tooth.prototype = Object.create(Enemy.prototype);

Tooth.prototype.update = function() {
  this.rotationCounter += 0.025
  this.rotation = Math.cos(this.rotationCounter) / 2;
  this.stepAnimation();
  this.animationDelay = 5
  if (this.animationTimer == 0 && this.counter == 0) {
    enemyBullets.push(new EnemyBullet(this.x, this.y, 2, this.rotation + Math.PI / 2 + Math.PI / 8));
    enemyBullets.push(new EnemyBullet(this.x, this.y, 2, this.rotation + Math.PI / 2 - Math.PI / 8));
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
  // TODO it's a little weird that player bullet is using enemy destroy function
  Enemy.prototype.destroy.call(this, 5, 2, 2);
}

PlayerBullet.prototype.update = function() {
  particles.push(new Particle(this.x, this.y, 0, 0.4, 0.01, 1.5, 15, coloredPuffSprites['red']));
  this.stepAnimation();
  if (!this.inbounds()) {
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

function Particle(x, y, accx, accy, damping, speed, lifetime, sprites) {
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
}

Particle.prototype = Object.create(Entity.prototype);

Particle.prototype.update = function() {
  this.accelerate();
  var frameCount = Math.ceil(this.sprites.length * this.lifetime / this.maxLifetime) - 1;
  this.counter = (this.sprites.length - 1) - frameCount; 
}

