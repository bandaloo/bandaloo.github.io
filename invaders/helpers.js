function clamp(num, min, max) {
  return num < min ? min : num > max ? max : num;
}

function randRange(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function circleCollision(x1, y1, r1, x2, y2, r2) {
  return (x1 - x2)**2 + (y1 - y2)**2 < (r1+ r2)**2;
}

function rectangleCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function eCircleCollision(entity1, entity2) {
  r1 = entity1.sx / 2;
  r2 = entity2.sx / 2;
  return circleCollision(entity1.x + entity1.collOffX, entity1.y + entity1.collOffY, r1 * entity1.collScalar,
                         entity2.x + entity2.collOffX, entity2.y + entity2.collOffY, r2 * entity2.collScalar);
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2)**2 + (y1 - y2)**2);
}

function distanceSquared(x1, y1, x2, y2) {
  return (x1 - x2)**2 + (y1 - y2)**2;
}

// TODO check if this function is even useful
function entityDistSquared(e1, e2) {
  return distanceSquared(e1.x + e1.collOffX, e1.y + e1.collOffY, e2.x + e2.collOffX, e2.y + e2.collOffY);
}

function rgba(r, g = 0, b = 0, a = 1) {
  return `rgba(${r},${g},${b},${a})`;
}

function getPlayer() {
  if (playerEntities.length != 0) {
    return playerEntities[0];
  }
  return null;
}

function inPlaceFilter(array, func) {
  for (var i = 0; i < array.length; i++) {
    if (!func(array[i])) {
      array.splice(i, 1);
      i--;
    }
  }
}

function blendWithColor(image, r, g, b, a = 1) {
  var coloredImage = new Image();

  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
 
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;

  tempContext.drawImage(image, 0, 0);
  tempContext.globalCompositeOperation = 'source-atop';
  tempContext.fillStyle = rgba(r, g, b, a);
  tempContext.fillRect(0, 0, image.width, image.height);

  tempContext.globalCompositeOperation = 'multiply';
  tempContext.drawImage(tempCanvas, 0, 0);
  
  coloredImage.src = tempCanvas.toDataURL("image/png");
  image = coloredImage;
  return coloredImage;
}

function blendImages(images, r, g, b, a = 1, alphaFade = 0) {
  for (var i = 0; i < images.length; i++) {
    images[i] = blendWithColor(images[i], r, g, b, a);
    a -= alphaFade;
  }
}
