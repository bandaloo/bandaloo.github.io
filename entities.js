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

Entity.prototype.accelerate = function() {
  this.vx += this.accx;
  this.vy += this.accy;
  this.vx -= this.vx * this.damping;
  this.vy -= this.vy * this.damping;
};

Entity.prototype.atEdge = function() {
  return this.x == this.sx / 2 || this.x == width-this.sx / 2;
  // TODO get rid of this
};

// TODO Entity prototype should probably have a draw function

// ------
// Player
// ------

function Player() {
  Entity.call(this, width / 2, height - 32, 0, 0, 64, 64, snootSprites);
  this.acceleration = 0.8;
  this.maxSpeed = 15;
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
  this.vx += Math.sign(this.vx) * this.acceleration;
  this.vx = clamp(this.vx, -this.maxSpeed, this.maxSpeed);
  this.rotation = this.vx / 64;
  this.stepAnimation();
  if (this.counter == 0 && this.animationTimer == 0) {
    var pBullet = new PlayerBullet(this.x, this.y - 16, 20, -Math.PI / 2 + this.rotation)
    playerBullets.push(pBullet);
  }
}

Player.prototype.draw = basicDraw;

// -----
// Enemy 
// -----

function Enemy(x, y, vx, vy, sx, sy, sprites) {
  Entity.call(this, x, y, vx, vy, sx, sy, sprites);
  this.health = 1;
}

Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.destroy = function() {
  for (var i = 0; i < 30; i++) {
    particles.push(new Particle(this.x, this.y, 0, 0, 0.01, Math.random() * 5, 15, puffSprites));
  }
}

Enemy.prototype.bumpDown = function(bumpSpeed) {
  if (this.atEdge()) {
    this.vy = bumpSpeed;
    this.vx *= -1;
    this.accx *= -1;
  }
}

// -----
// Alien
// -----

function Alien(x, y, direction = 1) {
  Enemy.call(this, x, y, 0, 0, 64, 64, alienSprites);
  this.accx = 0.8 * direction;
  this.damping = 0.1;
}

Alien.prototype = Object.create(Enemy.prototype);

Alien.prototype.update = function() {
  this.accelerate();
  this.stepAnimation();
  this.bumpDown(5);
}

Alien.prototype.draw = basicDraw;

// ---------
// Fat Alien
// ---------

function FatAlien(x, y) {
  Enemy.call(this, x, y, 0, 0, 128, 128, fatAlienSprites);
  this.accx = 0.3;
  this.damping = 0.1;
  this.health = 10;
}

FatAlien.prototype = Object.create(Enemy.prototype);

FatAlien.prototype.update = function() {
  this.accelerate();
  this.stepAnimation();
  this.bumpDown(8);
  this.animationDelay = 5;
}

FatAlien.prototype.destroy = function() {
  spawnCircle(Alien, this.x, this.y, 6, Math.sign(this.vx), 4, 10);
}

FatAlien.prototype.draw = basicDraw;

// -------------
// Player Bullet
// -------------

function PlayerBullet(x, y, speed, direction) {
  var vx = speed * Math.cos(direction);
  var vy = speed * Math.sin(direction);
  Entity.call(this, x, y, vx, vy, 32, 32, pBulletSprites);
  this.counter = randRange(this.sprites.length);
  this.lifetime = 48;
}

PlayerBullet.prototype = Object.create(Entity.prototype);

// TODO check why player bullet is being destroyed so many times

PlayerBullet.prototype.update = function() {
  particles.push(new Particle(this.x, this.y, 0, 0.4, 0.01, 1.5, 15, puffSprites));
  this.stepAnimation();
};

PlayerBullet.prototype.draw = basicDraw;

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

Particle.prototype.draw = basicDraw;
