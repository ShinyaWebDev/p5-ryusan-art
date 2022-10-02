
var imgs = [];
var imgNames = ["img/Ryusan_dragon.jpg", "img/Ryusan_dragon2.jpg"];
var imgIndex = -1;

var loadPercentage = 0.055; // 0 to 1.0
var closeEnoughTarget = 50;

var allParticles = [];

var mouseSizeSlider;
var particleSizeSlider;
var speedSlider;
var resSlider;
var nextImageButton;


function preload() {
  // Pre-load all images.
  for (var i = 0; i < imgNames.length; i++) {
    var newImg = loadImage(imgNames[i]);
    imgs.push(newImg);
  }
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create on-screen controls.
  mouseSizeSlider = new SliderLayout("Mouse size", 50, 200, 100, 1, 100, 100);
  
  particleSizeSlider = new SliderLayout("Particle size", 1, 20, 8, 1, 100, mouseSizeSlider.slider.position().y+70);
  
  speedSlider = new SliderLayout("Speed", 0, 5, 1, 0.5, 100, particleSizeSlider.slider.position().y+70);
  
  resSlider = new SliderLayout("Count multiplier (on next image)", 0.1, 2, 1, 0.1, 100, speedSlider.slider.position().y+70);
  
  nextImageButton = createButton("Next image");
  nextImageButton.position(100, resSlider.slider.position().y+40);
  nextImageButton.mousePressed(nextImage);
  
  // Change to first image.
  nextImage();
}


function draw() {
  background(255);
  
  for (var i = allParticles.length-1; i > -1; i--) {
    allParticles[i].move();
    allParticles[i].draw();
    
    if (allParticles[i].isKilled) {
      if (allParticles[i].isOutOfBounds()) {
        allParticles.splice(i, 1);
      }
    }
  }
  
  // Display slider labels.
  mouseSizeSlider.display();
  particleSizeSlider.display();
  speedSlider.display();
  resSlider.display();
}


function keyPressed() {
  nextImage();
}

/**
Randomly uses an angle and magnitude from supplied position to get a new position.
@param {number} x
@param {number} y
@param {number} mag
@return {p5.Vector}
*/
function generateRandomPos(x, y, mag) {
  var pos = new p5.Vector(x, y);
  
  var randomDirection = new p5.Vector(random(width), random(height));
  
  var vel = p5.Vector.sub(randomDirection, pos);
  vel.normalize();
  vel.mult(mag);
  pos.add(vel);
  
  return pos;
}


/**
Dynamically adds/removes particles to make up the next image.
*/
function nextImage() {
  // Switch index to next image.
  imgIndex++;
  if (imgIndex > imgs.length-1) {
    imgIndex = 0;
  }
  imgs[imgIndex].loadPixels();
  
  // Create an array of indexes from particle array.
  var particleIndexes = [];
  for (var i = 0; i < allParticles.length; i++) {
    particleIndexes.push(i);
  }
  
  var pixelIndex = 0;
  
  // Go through each pixel of the image.
  for (var y = 0; y < imgs[imgIndex].height; y++) {
    for (var x = 0; x < imgs[imgIndex].width; x++) {
      // Get the pixel's color.
      var pixelR = imgs[imgIndex].pixels[pixelIndex];
      var pixelG = imgs[imgIndex].pixels[pixelIndex+1];
      var pixelB = imgs[imgIndex].pixels[pixelIndex+2];
      var pixelA = imgs[imgIndex].pixels[pixelIndex+3];
      
      pixelIndex += 4;
      
      // Give it small odds that we'll assign a particle to this pixel.
      if (random(1.0) > loadPercentage*resSlider.slider.value()) {
        continue;
      }
      
      var pixelColor = color(pixelR, pixelG, pixelB);
      
      if (particleIndexes.length > 0) {
        // Re-use existing particle.
        var index = particleIndexes.splice(random(particleIndexes.length-1), 1);
        var newParticle = allParticles[index];
      } else {
        // Create a new particle.
        var newParticle = new Particle(width/2, height/2);
        allParticles.push(newParticle);
      }
      
      newParticle.target.x = x+width/2-imgs[imgIndex].width/2;
      newParticle.target.y = y+height/2-imgs[imgIndex].height/2;
      newParticle.endColor = pixelColor;
    }
  }
  
  // Kill off any left over particles that aren't assigned to anything.
  if (particleIndexes.length > 0) {
    for (var i = 0; i < particleIndexes.length; i++) {
      allParticles[particleIndexes[i]].kill();
    }
  }
}

/**
A particle that uses a seek behaviour to move to its target.
@param {number} x
@param {number} y
*/
function Particle(x, y) {
  
  this.pos = new p5.Vector(x, y);
  this.vel = new p5.Vector(0, 0);
  this.acc = new p5.Vector(0, 0);
  this.target = new p5.Vector(0, 0);
  this.isKilled = false;
  
  this.maxSpeed = random(0.25, 2); // How fast it can move per frame.
  this.maxForce = random(8, 15); // Its speed limit.
  
  this.currentColor = color(0);
  this.endColor = color(0);
  this.colorBlendRate = random(0.01, 0.05);
  
  this.currentSize = 0;
  
  // Saving as class var so it doesn't need to calculate twice.
  this.distToTarget = 0;
  
  this.move = function() {
    this.distToTarget = dist(this.pos.x, this.pos.y, this.target.x, this.target.y);
    
    // If it's close enough to its target, the slower it'll get
    // so that it can settle.
    if (this.distToTarget < closeEnoughTarget) {
      var proximityMult = this.distToTarget/closeEnoughTarget;
      this.vel.mult(0.9);
    } else {
      var proximityMult = 1;
      this.vel.mult(0.95);
    }
    
    // Steer towards its target.
    if (this.distToTarget > 1) {
      var steer = new p5.Vector(this.target.x, this.target.y);
      steer.sub(this.pos);
      steer.normalize();
      steer.mult(this.maxSpeed*proximityMult*speedSlider.slider.value());
      this.acc.add(steer);
    }
    
    var mouseDist = dist(this.pos.x, this.pos.y, mouseX, mouseY);
    
    // Interact with mouse.
    if (mouseDist < mouseSizeSlider.slider.value()) {
      if (mouseIsPressed) {
        // Push towards mouse.
        var push = new p5.Vector(mouseX, mouseY);
        push.sub(new p5.Vector(this.pos.x, this.pos.y));
      } else {
        // Push away from mouse.
        var push = new p5.Vector(this.pos.x, this.pos.y);
        push.sub(new p5.Vector(mouseX, mouseY));
      }
      push.normalize();
      push.mult((mouseSizeSlider.slider.value()-mouseDist)*0.05);
      this.acc.add(push);
    }
    
    // Move it.
    this.vel.add(this.acc);
    this.vel.limit(this.maxForce*speedSlider.slider.value());
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
  
  this.draw = function() {
    this.currentColor = lerpColor(this.currentColor, this.endColor, this.colorBlendRate);
    stroke(this.currentColor);
    
    if (! this.isKilled) {
      // Size is bigger the closer it is to its target.
      var targetSize = map(min(this.distToTarget, closeEnoughTarget), 
                           closeEnoughTarget, 0, 
                           0, particleSizeSlider.slider.value());
    } else {
      var targetSize = 2;
    }
    
    this.currentSize = lerp(this.currentSize, targetSize, 0.1);
    strokeWeight(this.currentSize);
    
    point(this.pos.x, this.pos.y);
  }
  
  this.kill = function() {
    if (! this.isKilled) {
      this.target = generateRandomPos(width/2, height/2, max(width, height));
      this.endColor = color(0);
      this.isKilled = true;
    }
  }
  
  this.isOutOfBounds = function() {
    return (this.pos.x < 0 || this.pos.x > width || 
            this.pos.y < 0 || this.pos.y > height)
  }
}

/**
A slider with labels for its title and value.
@param {string} label
@param {number} minValue
@param {number} maxValue
@param {number} defaultValue
@param {number} steps
@param {number} posx
@param {number} posy
*/
function SliderLayout(label, minValue, maxValue, defaultValue, steps, posx, posy) {
  
  this.label = label;
  this.slider = createSlider(minValue, maxValue, defaultValue, steps);
  this.slider.position(posx, posy);
  
  this.display = function() {
    var sliderPos = this.slider.position();
    
    noStroke();
    fill(0);
    textSize(15);
    text(this.label, sliderPos.x, sliderPos.y-10);

    fill(0);
    text(this.slider.value(), sliderPos.x+this.slider.width+10, sliderPos.y+10);
  }
}