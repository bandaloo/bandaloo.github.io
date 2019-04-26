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
  return `rgba(${r},${g},${b},${a})`;
}

canvas.addEventListener('webkitfullscreenchange', exitHandler, false);
canvas.addEventListener('mozfullscreenchange', exitHandler, false);
canvas.addEventListener('fullscreenchange', exitHandler, false);
canvas.addEventListener('MSFullscreenChange', exitHandler, false);

function exitHandler() {
  if (!document.webkitIsFullScreen && !document.mozFullScreen
      && !document.msFullscreenElement) {
    canvas.width = 1920 / 2;
    canvas.height = 1080 / 2;
  }
}

function getVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return false;
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
  func: (t) => {c.width|=0;for(i=50;i-=1/4;)x.beginPath(),d=2*C((2+S(t/120))*2*i),x.arc(960+d*10*C(i)*i,540+d*10*S(i)*i,i,0,44/7),x.fillStyle=`hsl(${i},99%,50%)`,x.fill()}
},

{
  name: "red shorter gravity",
  author: "me",
  golfed: "yes",
  func: (t) => {c.width|=0;for(i=50;i-=1/4;)x.beginPath(),d=2*C((2+S(t/99))*2*i),x.arc(960+d*10*C(i)*i,540+d*10*S(i)*i,i,0,44/7),x.fillStyle=R(i*5),x.fill()}
},

{
  name: "circles in circles",
  author: "me",
  golfed: "yes",
  func: (t) => {c.width|=d=(y,z,s,i)=>{i?(x.fillStyle=R(i*20),x.beginPath(),x.arc(960+y,540+z,s,0,44/7),x.fill(),d(y-s*(1-.8)*C(t*5)/3,z,s*.8,i-1)):0};d(0,0,512,9)}
},

{
  name: "rainbow portal",
  author: "me",
  golfed: "yes",
  func: (t) => {for(i=200;i--;x.beginPath(x.fill(x.arc(960+d*9*C(i+t)*i,540+d*9*S(i+t)*i,i,0,7))))d=C(S(t/99)*i),x.fillStyle=`hsl(${i+t*9},99%,50%,50%)`}
},

{
  name: "pink stretchy dots",
  author: "me",
  golfed: "yes",
  func: (t) => {c.width|=0;for(i=1896;i-=24;)for(j=1056;j-=24;)x.fillStyle=R(6*(s=6*(4+C(t*6)+C(C(t)*i/99+t)+S(S(t)*j/99+t))),0,s+i/9),x.fillRect(i,j,s,s)}
}

];

function setSketch() {
  t = 0;
  x.restore();
  x.save();
  u = sketches[si].func;
  title.innerHTML = si.toString() + ". " + sketches[si].name;
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
var queryResult = getVariable("si");
if (queryResult && !isNaN(parseInt(queryResult)) && parseInt(queryResult)
    > 0 && parseInt(queryResult) < sketches.length) {
  si = Math.round(parseInt(queryResult));
}
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

document.addEventListener('keydown', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);
  if (key == 'F') {
    canvas.width = 1920;
    canvas.height = 1080;
    //canvas.width = window.innerWidth;
    //canvas.height = window.innerHeight;
    enterFullscreen(canvas);
  } else if (key == 'H' || code == 37) {
    cycleSketch(-1);
  } else if (key == 'L' || code == 39) {
    cycleSketch(1);
  }
});

function enterFullscreen(element) {
  if (element.requestFullscreen)
    element.requestFullscreen();
  else if (element.mozRequestFullScreen)
    element.mozRequestFullScreen();
  else if (element.webkitRequestFullscreen)
    element.webkitRequestFullscreen();
  else if (element.msRequestFullscreen)
    element.msRequestFullscreen();
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
