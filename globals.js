const canvas = document.getElementById("invaderscanvas");
const context = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

var playerEntities = [];
var playerBullets = [];
var enemies = [];
var enemyBullets = [];
var particles = [];

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
