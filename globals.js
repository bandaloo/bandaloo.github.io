// TODO check if canvas should be const if the width will change
const canvas = document.getElementById("invaderscanvas");
const context = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

var debug = false;
var ticks = 0;

// arrays to hold all entities that have an update cycles
var playerEntities = [];
var playerBullets = [];
var enemies = [];
var enemyBullets = [];
var particles = [];
var pickups = [];

// arrays for sprites and sprite file names
var snootSprites = [];
var snootSources = ["snoot0", "snoot1", "snoot2"];

var pBulletSprites = [];
var pBulletSources = ["pbullet0", "pbullet1", "pbullet2", "pbullet3"];

var eBulletSprites = [];
var eBulletSources = ["ebullet0"];

var puffSprites = [];
var puffSources = ["puff0", "puff1", "puff2", "puff3", "puff4"];

var alienSprites = [];
var alienSources = ["alien0", "alien1", "alien2", "alien3"]; 

var fatAlienSprites = [];
var fatAlienSources = ["fatalien0", "fatalien1", "fatalien2", "fatalien3"]; 

var toothSprites = [];
var toothSources = ["tooth0", "tooth1", "tooth2"]; 

var lifeSprites = [];
var lifeSources = ["life0", "life1", "life2", "life3"];

var shapesSprites = [];
var shapesSources = ["shapes0", "shapes1", "shapes2", "shapes3"];

var cubeSprites = [];
var cubeSources = ["cube0", "cube1", "cube2", "cube3", "cube4", "cube5"];

var colors = {
  red: [255, 58, 31],
  green: [124, 244, 11],
  purple: [166, 16, 232],
  orange: [255, 209, 47],
  pink: [255, 28, 175],
  yellow: [255, 238, 40]
}

var coloredPuffSprites = {};
