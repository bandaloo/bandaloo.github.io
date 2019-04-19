var canvas = document.getElementById("sketchcanvas");
var context = canvas.getContext("2d");
//var c = document.getElementById("tempcanvas");
var c = document.createElement("canvas");
var x = c.getContext("2d");

c.width = 1920;
c.height = 1080;

canvas.addEventListener('resize', () => {
  console.log('resized');
  c.width = 100;
});

var ratio = 0.5;
var t = 0;

canvas.width *= ratio;
canvas.height *= ratio;

// dwitter shorthand
var C = Math.cos
var S = Math.sin
var T = Math.tan

function R(r, g = 0, b = 0, a = 1) {
  return "#" + Math.round(r).toString(16) + Math.round(g).toString(16)
             + Math.round(b).toString(16) + Math.round(a).toString(16);
}

function u(t) {
  a=1920;c.width=a;d=(i)=>{x.fillRect(i,536+C(i+t)*50,32,8)};for(i=0;i<a;i+=32){x.fillStyle=R((1+C(i))/2*255,0,155);for(j=0;j<3;j++)d(i+j)}
};

console.log('test');

function update() {
  canvas.width = canvas.width; // clear the screen
  u(t);
  context.save();
  context.scale(ratio, ratio);
  context.drawImage(c, 0, 0);
  context.restore();
  t += 0.01;
  requestAnimationFrame(update);
}

update();
