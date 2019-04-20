var canvas = document.getElementById("sketchcanvas");
var context = canvas.getContext("2d");

var c = document.createElement("canvas");
var x = c.getContext("2d");

var title = document.getElementById("title");
var author = document.getElementById("author");
var golfed = document.getElementById("golfed");
var code = document.getElementById("code");

c.width = 1920;
c.height = 1080;

var t = 0;

const ratio = 0.5;

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

// sketches
const sketches = [
{
  name: "simple helix",
  author: "me",
  golfed: "yes",
  func: (t) => {a=1920;c.width=a;d=(i)=>{x.fillRect(i,536+C(i+t)*50,32,8)};for(i=0;i<a;i+=32){x.fillStyle=R((1+C(i))/2*255,0,155);for(j=0;j<3;j++)d(i+j)}}
},

{
  name: "undulating lines",
  author: "me",
  golfed: "not yet",
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
},

{
  name: "diamond zoom",
  author: "me",
  golfed: "yes",
  func: (t) => {w=1920;h=1080;a=100;c.width=w;for(i=0;i<w;i+=24){for(j=0;j<h;j+=24){x.fillRect(i,j,6*(4+C(C(t)*i/a)+S(C(t)*j/a)),24);}}}
},

{
  name: "dot zoom",
  author: "me",
  golfed: "yes",
  func: (t) => {w=1920;h=1080;a=100;c.width=w;for(i=0;i<w;i+=24){for(j=0;j<h;j+=24){x.fillRect(i,j,6*(2+C(C(t)*i/a)+S(C(t)*j/a)),24);}}}
},

{
  name: "inverting dots",
  author: "me",
  golfed: "yes",
  func: (t) => {w=1920;h=1080;a=100;c.width=w;for(i=0;i<w;i+=24){for(j=0;j<h;j+=24){x.fillRect(i,j,6*(4+C(t*6)+C(i/a+t)+S(j/a+t)),24);}}}
},

{
  name: "rainbow helix waves",
  author: "me",
  golfed: "yes",
  func: (t) => {a=1920;g=255;c.width=a;d=(i,y)=>{x.fillRect(i,y+536+25*C(i+t)+20*S((y/40)*t+i/100),32,8)};for(k=-4;k<5;k++)for(i=0;i<a;i+=32){x.fillStyle=`hsl(${i/25+k*190*C(t/8)},99%,50%)`;for(j=0;j<3;j++)d(i+j,k*100)}}
},

{
  name: "orange gravity",
  author: "me",
  golfed: "yes",
  func: (t) => {c.width|=0;for(i=50;i-=0.25;)x.beginPath(),d=2*C((2+S(t/120))*2*i),x.arc(960+C(0)*d*10*C(i)*i,540+d*C(0)*10*S(i)*i,i,0,44/7),x.fillStyle=`hsl(${i},99%,50%)`,x.fill()}
},
];

function setSketch() {
  t = 0;
  x.restore();
  x.save();
  u = sketches[si].func;
  title.innerHTML = sketches[si].name;
  author.innerHTML= "author: " + sketches[si].author;
  var golfedText = sketches[si].golfed;
  var codeText = sketches[si].func.toString();
  code.innerHTML = sanitize(codeText);
  if (golfedText == "yes") {
    golfedText += " (" + (codeText.length - 9) + " characters)";
  }
  golfed.innerHTML= "golfed: " + golfedText;
}

var u = () => {};
var si = 6;
x.save();
setSketch();

function cycleSketch(n) {
  c.width = c.width;
  si += n;
  si = si < 0 ? sketches.length - 1 : si >= sketches.length ? si = 0 : si;
  setSketch();
}

function sanitize(string) {
  return string.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}


function update() {
  canvas.width = canvas.width; // clear the screen
  x.save();
  u(t);
  x.restore();
  context.save();
  context.scale(canvas.width / c.width, canvas.height / c.height);
  context.drawImage(c, 0, 0);
  context.restore();
  t += 1/60;
  requestAnimationFrame(update);
}

update();
