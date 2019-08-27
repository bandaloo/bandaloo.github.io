//var earthquakes = require('./earthquakes.json');
//console.log(earthquakes.length);
//earthquakes.sort((a, b) => {return b.impact.magnitude - a.impact.magnitude});
// assumption that list is already sorted by time
//var earthquakes;

const pulsespeed = 0.05;
const simspeed = 60000;

var img;
var theta = -1.3;
var phi = -0.2;
//var pulsemin = 10;
//var pulsemax = 30;
//var pulse = pulsemin;
var currepoch;
var currindex = 0;

const radius = 150
/*
var latitude = 42.4072 * -1;
var longitude = -71.3824 + 45;
*/

var markers = [];

var datelabel = document.getElementById("datelabel");
var timelabel = document.getElementById("timelabel");
var cnv;

function preload() {
  img = loadImage("../../images/world-map-bw-reduced-size.png");
  currepoch = earthquakes[0].time.epoch;
  console.log(currepoch);
}

function setup(){
  cnv = createCanvas(710, 400, WEBGL);
  cnv.parent("sketch-holder");
}

function draw(){
  colorMode(RGB, 255);
  //pulse += 0.5;
  currepoch += simspeed;
  //console.log(currepoch);
  var date = new Date(currepoch);
  datelabel.innerHTML = (date.getUTCMonth() + 1) + "/" + date.getDate() + "/"
                      + date.getUTCFullYear();
  timelabel.innerHTML = date.getUTCHours() + ":" + date.getUTCMinutes().toString().padStart(2, '0');
  while (currindex < earthquakes.length && currepoch >= earthquakes[currindex].time.epoch) {
    var plat = earthquakes[currindex].location.latitude;
    var plon = earthquakes[currindex].location.longitude;

    var latitude = plat * -1;
    var longitude = plon * -1 + -90;
    var rlat = latitude / 180 * Math.PI;
    var rlon = longitude / 180 * Math.PI;
    var magnitude = earthquakes[currindex].impact.magnitude;
    var sat = 36 * magnitude;
    markers.push({rlat: rlat, rlon: rlon, pulse: 10 + magnitude * 2.5,
                  maxpulse: 10 + magnitude * 5,
                  sat: sat});
    currindex++;

    console.log(markers.length);
  }
  /*
  if (pulse > pulsemax) {
    pulse = pulsemin;
  }
  */
  background(250);

  ambientLight(100, 100, 100);
  directionalLight(255, 255, 255, 0.25, 0.1, 0);
  push();
  //rotateX(3.14159 / 2)
  rotateY(Math.PI / 2);
  rotateZ(phi);
  rotateY(theta - Math.PI / 2);
  //normalMaterial();
  texture(img);
  sphere(radius, 32, 48);
  pop();

  colorMode(HSB, 255);
  for (var i = 0; i < markers.length; i++) {
    var m = markers[i];
    push();
    var scalar = Math.sqrt(Math.pow(radius + 0.7, 2) - Math.pow(m.pulse, 2));
    var x = scalar * Math.cos(m.rlat) * Math.cos(m.rlon);
    var z = scalar * Math.cos(m.rlat) * Math.sin(m.rlon);
    var y = scalar * Math.sin(m.rlat);
    rotateY(Math.PI / 2);
    rotateZ(phi);
    rotateY(theta - Math.PI / 2);
    translate(x, y, z);
    rotateY(-m.rlon + Math.PI / 2);
    rotateX(-m.rlat);
    normalMaterial();
    fill(250, m.sat, 250);
    torus(m.pulse, 1);
    m.pulse += pulsespeed;
    pop();
  }
  markers = markers.filter(m => m.pulse < m.maxpulse);
}

function mouseDragged() {
  theta += (mouseX - pmouseX) / 200;
  phi += -(mouseY - pmouseY) / 200;
  if (phi > 1) phi = 1;
  if (phi < -1) phi = -1;
}
