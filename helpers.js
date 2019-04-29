function clamp(num, min, max) {
  return num < min ? min : num > max ? max : num;
}

function randRange(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function circleCollision(x1, y1, r1, x2, y2, r2) {
  return (x1 - x2)**2 + (y1 - y2)**2 < (r1+ r2)**2;
}

function eCircleCollision(entity1, entity2, scalar1 = 1, scalar2 = 1) {
  r1 = entity1.sx / 2;
  r2 = entity2.sx / 2;
  return circleCollision(entity1.x, entity1.y, r1 * scalar1,
                         entity2.x, entity2.y, r2 * scalar2);
}

function accelerate() {
  this.vx += this.accx;
  this.vy += this.accy;
  this.vx -= this.vx * this.damping;
  this.vy -= this.vy * this.damping;
}
