var canvas = document.getElementById("sketchcanvas");
var context = canvas.getContext("2d");

var c = document.createElement("canvas");
var x = c.getContext("2d");

var title = document.getElementById("title");
var author = document.getElementById("author");
var golfed = document.getElementById("golfed");

c.width = 1920;
c.height = 1080;

var t = 0;

canvas.width *= 0.5;
canvas.height *= 0.5;

// dwitter shorthand
var C = Math.cos
var S = Math.sin
var T = Math.tan

function R(r, g = 0, b = 0, a = 1) {
  return "#" + Math.round(r).toString(16) + Math.round(g).toString(16)
             + Math.round(b).toString(16) + Math.round(a).toString(16);
}

// sketches
const sketches = [
{
  name: "simple helix",
  author: "me",
  golfed: "yes",
  func: (t) => {
    a=1920;c.width=a;d=(i)=>{x.fillRect(i,536+C(i+t)*50,32,8)};for(i=0;i<a;i+=32){x.fillStyle=R((1+C(i))/2*255,0,155);for(j=0;j<3;j++)d(i+j)}
  }
},
{
  name: "undulating lines",
  author: "me",
  golfed: "not really",
  func: (t) => {
    w = 1920;
    h = 1080;
    c.width = w;
    for (i = 0; i < w; i += 24) {
      for (j = 0; j < h; j += 24) {
        x.fillRect(i, j, 12 * (1 + C((i + j + t * 100) / 100)), 24);
      }
    }
  }
}];

function setSketch() {
  t = 0;
  x.restore();
  x.save();
  u = sketches[si].func;
  title.innerHTML = sketches[si].name;
  author.innerHTML= "author: " + sketches[si].author;
  golfed.innerHTML= "golfed: " + sketches[si].golfed;
}

var u = () => {};
var si = 0;
x.save();
setSketch();

function cycleSketch(n) {
    c.width = c.width;
    si += n;
    si = si < 0 ? sketches.length - 1 : si >= sketches.length ? si = 0 : si;
    setSketch();
}

console.log('test');

function update() {
  canvas.width = canvas.width; // clear the screen
  u(t);
  context.save();
  context.scale(canvas.width / c.width, canvas.height / c.height);
  context.drawImage(c, 0, 0);
  context.restore();
  t += 0.01;
  requestAnimationFrame(update);
}

update();
