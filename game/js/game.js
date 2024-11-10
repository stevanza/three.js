/**
 *
 * LARI ADA PKI
 * ----
 * Modified Temple-Run-esque game with Indonesian theme
 *
 */

/**
 * Constants used in this game.
 */
var Colors = {
    sky: 0x87ceeb,        // Light blue sky
    ground: 0x8B4513,     // Brown earth/ground
    red: 0xFF0000,        // Red for character/details
    white: 0xFFFFFF,      // White for character/details
    darkGreen: 0x006400,  // Dark green for vegetation
    bamboo: 0x98FB98,     // Light green for bamboo
    wood: 0x8B4513,       // Brown for wooden structures
    black: 0x000000,      // Black for details
    brown: 0x59332e,      // Skin tone
    grey: 0x696969,       // For details
    brownDark: 0x23190f,  // Dark wood
    sand: 0xc2b280,       // Ground details
    peach: 0xffdab9,      // Lighter skin tone
	batik: 0x8B4513,     // Coklat untuk motif batik
    stone: 0x808080,     // Abu-abu untuk tugu/batu
    gold: 0xFFD700,      // Emas untuk ornamen
    redFlag: 0xFF0000,   // Merah untuk bendera
    whiteFlag: 0xFFFFFF, // Putih untuk bendera
    torch: 0xFFA500,     // Oranye untuk obor
};

var deg2Rad = Math.PI / 180;

// Make a new world when the page is loaded.
window.addEventListener('load', function(){
    new World();
});

/**
 * Creates and returns a box with the specified properties.
 */
function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
    var geom = new THREE.BoxGeometry(dx, dy, dz);
    var mat = new THREE.MeshPhongMaterial({
        color: color,
        flatShading: notFlatShading != true
    });
    var box = new THREE.Mesh(geom, mat);
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(x, y, z);
    return box;
}

/**
 * Creates and returns a cylinder
 */
function createCylinder(radiusTop, radiusBottom, height, radialSegments, 
                        color, x, y, z) {
    var geom = new THREE.CylinderGeometry(
        radiusTop, radiusBottom, height, radialSegments);
    var mat = new THREE.MeshPhongMaterial({
        color: color,
        flatShading: true
    });
    var cylinder = new THREE.Mesh(geom, mat);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.position.set(x, y, z);
    return cylinder;
}

/**
 * Creates an empty group of objects at a specified location.
 */
function createGroup(x, y, z) {
    var group = new THREE.Group();
    group.position.set(x, y, z);
    return group;
}

/**
 * Utility function for generating current values of sinusoidally
 * varying variables.
 */
function sinusoid(frequency, minimum, maximum, phase, time) {
    var amplitude = 0.5 * (maximum - minimum);
    var angularFrequency = 2 * Math.PI * frequency;
    var phaseRadians = phase * Math.PI / 180;
    var offset = amplitude * Math.sin(
        angularFrequency * time + phaseRadians);
    var average = (minimum + maximum) / 2;
    return average + offset;
}

/**
 * The player's character in the game.
 */
function Character() {
    var self = this;
    
    // Character defaults
    this.skinColor = Colors.brown;
    this.clothColor = Colors.red;      // Red for traditional outfit
    this.pantsColor = Colors.white;    // White pants
    this.hatColor = Colors.black;      // Black traditional hat
    this.stepFreq = 2;
    this.jumpDuration = 0.6;
    this.jumpHeight = 2000;

    function init() {
        // Build character's head
        self.face = createBox(100, 100, 60, self.skinColor, 0, 0, 0);
        self.hat = createCylinder(52, 52, 30, 8, self.hatColor, 0, 65, 0);
        self.head = createGroup(0, 260, -25);
        self.head.add(self.face);
        self.head.add(self.hat);

        // Build character's body
        self.torso = createBox(150, 190, 40, self.clothColor, 0, 100, 0);

        // Build character's arms
        self.leftLowerArm = createLimb(20, 120, 30, self.skinColor, 0, -170, 0);
        self.leftArm = createLimb(30, 140, 40, self.skinColor, -100, 190, -10);
        self.leftArm.add(self.leftLowerArm);

        self.rightLowerArm = createLimb(20, 120, 30, self.skinColor, 0, -170, 0);
        self.rightArm = createLimb(30, 140, 40, self.skinColor, 100, 190, -10);
        self.rightArm.add(self.rightLowerArm);

        // Build character's legs
        self.leftLowerLeg = createLimb(40, 200, 40, self.skinColor, 0, -200, 0);
        self.leftLeg = createLimb(50, 170, 50, self.pantsColor, -50, -10, 30);
        self.leftLeg.add(self.leftLowerLeg);

        self.rightLowerLeg = createLimb(40, 200, 40, self.skinColor, 0, -200, 0);
        self.rightLeg = createLimb(50, 170, 50, self.pantsColor, 50, -10, 30);
        self.rightLeg.add(self.rightLowerLeg);

        // Assemble the character
        self.element = createGroup(0, 0, -4000);
        self.element.add(self.head);
        self.element.add(self.torso);
        self.element.add(self.leftArm);
        self.element.add(self.rightArm);
        self.element.add(self.leftLeg);
        self.element.add(self.rightLeg);

        // Initialize movement parameters
        self.isJumping = false;
        self.isSwitchingLeft = false;
        self.isSwitchingRight = false;
        self.currentLane = 0;
        self.runningStartTime = new Date() / 1000;
        self.pauseStartTime = new Date() / 1000;
        self.queuedActions = [];
    }

    /**
     * Creates and returns a limb with an axis of rotation at the top.
     */
    function createLimb(dx, dy, dz, color, x, y, z) {
        var limb = createGroup(x, y, z);
        var offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
        var limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
        limb.add(limbBox);
        return limb;
    }

    /**
     * Updates character's position and animation
     */
    this.update = function() {
        var currentTime = new Date() / 1000;

        // Handle queued actions
        if (!self.isJumping &&
            !self.isSwitchingLeft &&
            !self.isSwitchingRight &&
            self.queuedActions.length > 0) {
            switch(self.queuedActions.shift()) {
                case "up":
                    self.isJumping = true;
                    self.jumpStartTime = new Date() / 1000;
                    break;
                case "left":
                    if (self.currentLane != -1) {
                        self.isSwitchingLeft = true;
                    }
                    break;
                case "right":
                    if (self.currentLane != 1) {
                        self.isSwitchingRight = true;
                    }
                    break;
            }
        }

        // Handle jumping
        if (self.isJumping) {
            var jumpClock = currentTime - self.jumpStartTime;
            self.element.position.y = self.jumpHeight * Math.sin(
                (1 / self.jumpDuration) * Math.PI * jumpClock) +
                sinusoid(2 * self.stepFreq, 0, 20, 0,
                    self.jumpStartTime - self.runningStartTime);
            if (jumpClock > self.jumpDuration) {
                self.isJumping = false;
                self.runningStartTime += self.jumpDuration;
            }
        } else {
            // Handle running animation
            var runningClock = currentTime - self.runningStartTime;
            self.element.position.y = sinusoid(
                2 * self.stepFreq, 0, 20, 0, runningClock);
            self.head.rotation.x = sinusoid(
                2 * self.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
            self.torso.rotation.x = sinusoid(
                2 * self.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
            self.leftArm.rotation.x = sinusoid(
                self.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
            self.rightArm.rotation.x = sinusoid(
                self.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
            self.leftLowerArm.rotation.x = sinusoid(
                self.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
            self.rightLowerArm.rotation.x = sinusoid(
                self.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
            self.leftLeg.rotation.x = sinusoid(
                self.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
            self.rightLeg.rotation.x = sinusoid(
                self.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
            self.leftLowerLeg.rotation.x = sinusoid(
                self.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
            self.rightLowerLeg.rotation.x = sinusoid(
                self.stepFreq, -130, 5, 60, runningClock) * deg2Rad;

            // Handle lane switching
            if (self.isSwitchingLeft) {
                self.element.position.x -= 200;
                var offset = self.currentLane * 800 - self.element.position.x;
                if (offset > 800) {
                    self.currentLane -= 1;
                    self.element.position.x = self.currentLane * 800;
                    self.isSwitchingLeft = false;
                }
            }
            if (self.isSwitchingRight) {
                self.element.position.x += 200;
                var offset = self.element.position.x - self.currentLane * 800;
                if (offset > 800) {
                    self.currentLane += 1;
                    self.element.position.x = self.currentLane * 800;
                    self.isSwitchingRight = false;
                }
            }
        }
    };

    // Event handlers
    this.onLeftKeyPressed = function() {
        self.queuedActions.push("left");
    };

    this.onUpKeyPressed = function() {
        self.queuedActions.push("up");
    };

    this.onRightKeyPressed = function() {
        self.queuedActions.push("right");
    };

    this.onPause = function() {
        self.pauseStartTime = new Date() / 1000;
    };

    this.onUnpause = function() {
        var currentTime = new Date() / 1000;
        var pauseDuration = currentTime - self.pauseStartTime;
        self.runningStartTime += pauseDuration;
        if (self.isJumping) {
            self.jumpStartTime += pauseDuration;
        }
    };

    init();
}

/**
 * Bamboo obstacle in the game
 */
function Tree(x, y, z, s) {
    var self = this;
    this.mesh = new THREE.Object3D();
    
    // Create bamboo stalks (3 stalks per cluster)
    for(let i = 0; i < 3; i++) {
        // Main bamboo stalk
        var stalkHeight = 800 + Math.random() * 200;
        var stalk = createCylinder(30, 30, stalkHeight, 8, Colors.bamboo, 
            i * 60 - 60, stalkHeight/2, 0);
        
        // Bamboo nodes (segments)
        var nodeCount = Math.floor(stalkHeight / 100);
        for(let j = 0; j < nodeCount; j++) {
            var node = createCylinder(35, 35, 20, 8, Colors.darkGreen,
                i * 60 - 60, j * 100 + 50, 0);
            this.mesh.add(node);
        }
        
        // Add some leaves
        var leaves = createCylinder(1, 200, 400, 4, Colors.darkGreen,
            i * 60 - 60, stalkHeight - 100, 0);
        leaves.rotation.x = Math.random() * Math.PI/4;
        leaves.rotation.z = Math.random() * Math.PI/2;
        
        this.mesh.add(stalk);
        this.mesh.add(leaves);
    }

    this.mesh.position.set(x, y, z);
    this.mesh.scale.set(s, s, s);
    this.scale = s;

    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
        var boundMinX = self.mesh.position.x - this.scale * 150;
        var boundMaxX = self.mesh.position.x + this.scale * 150;
        var boundMinY = self.mesh.position.y;
        var boundMaxY = self.mesh.position.y + this.scale * 1000;
        var boundMinZ = self.mesh.position.z - this.scale * 150;
        var boundMaxZ = self.mesh.position.z + this.scale * 150;
        return boundMinX <= maxX && boundMaxX >= minX
            && boundMinY <= maxY && boundMaxY >= minY
            && boundMinZ <= maxZ && boundMaxZ >= minZ;
    };
}

/**
 * Gapura/Gateway obstacle
 */
function Gapura(x, y, z, s) {
    var self = this;
    this.mesh = new THREE.Object3D();
    
    // Tiang utama
    var leftPillar = createBox(100, 1000, 100, Colors.stone, -300, 0, 0);
    var rightPillar = createBox(100, 1000, 100, Colors.stone, 300, 0, 0);
    
    // Atap
    var roof = new THREE.Object3D();
    var roofBase = createBox(700, 50, 150, Colors.wood, 0, 500, 0);
    var roofTop = createBox(600, 150, 150, Colors.red, 0, 600, 0);
    
    // Ornamen
    for(let i = 0; i < 5; i++) {
        var ornament = createBox(20, 80, 20, Colors.gold, -240 + i*120, 520, 0);
        roof.add(ornament);
    }
    
    roof.add(roofBase);
    roof.add(roofTop);
    
    this.mesh.add(leftPillar);
    this.mesh.add(rightPillar);
    this.mesh.add(roof);
    
    this.mesh.position.set(x, y, z);
    this.mesh.scale.set(s, s, s);
    this.scale = s;
    
    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
        // Collision check untuk ketiga bagian (tiang kiri, tiang kanan, atap)
        return (
            // Left pillar collision
            (minX <= (x - 250*s) && maxX >= (x - 350*s) &&
             minY <= (y + 1000*s) && maxY >= y &&
             minZ <= (z + 50*s) && maxZ >= (z - 50*s)) ||
            // Right pillar collision
            (minX <= (x + 350*s) && maxX >= (x + 250*s) &&
             minY <= (y + 1000*s) && maxY >= y &&
             minZ <= (z + 50*s) && maxZ >= (z - 50*s)) ||
            // Roof collision
            (minX <= (x + 350*s) && maxX >= (x - 350*s) &&
             minY <= (y + 650*s) && maxY >= (y + 500*s) &&
             minZ <= (z + 75*s) && maxZ >= (z - 75*s))
        );
    };
}

/**
 * Tugu/Monument obstacle
 */
function Tugu(x, y, z, s) {
    var self = this;
    this.mesh = new THREE.Object3D();
    
    // Base
    var base = createCylinder(150, 200, 100, 8, Colors.stone, 0, 50, 0);
    
    // Main pillar
    var pillar = createCylinder(100, 100, 800, 8, Colors.stone, 0, 500, 0);
    
    // Top ornament
    var top = createCylinder(120, 80, 200, 8, Colors.gold, 0, 900, 0);
    
    // Torch (optional, can be animated)
    var torch = createCylinder(40, 20, 100, 8, Colors.torch, 0, 1050, 0);
    
    this.mesh.add(base);
    this.mesh.add(pillar);
    this.mesh.add(top);
    this.mesh.add(torch);
    
    this.mesh.position.set(x, y, z);
    this.mesh.scale.set(s, s, s);
    this.scale = s;
    
    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
        var boundMinX = self.mesh.position.x - this.scale * 100;
        var boundMaxX = self.mesh.position.x + this.scale * 100;
        var boundMinY = self.mesh.position.y;
        var boundMaxY = self.mesh.position.y + this.scale * 1100;
        var boundMinZ = self.mesh.position.z - this.scale * 100;
        var boundMaxZ = self.mesh.position.z + this.scale * 100;
        return boundMinX <= maxX && boundMaxX >= minX
            && boundMinY <= maxY && boundMaxY >= minY
            && boundMinZ <= maxZ && boundMaxZ >= minZ;
    };
}

/**
 * Bendera bergerak/Moving flag obstacle
 */
function MovingFlag(x, y, z, s) {
    var self = this;
    this.mesh = new THREE.Object3D();
    
    // Tiang bendera
    var pole = createCylinder(20, 20, 800, 8, Colors.grey, 0, 400, 0);
    
    // Bendera (dibuat dari beberapa segmen untuk animasi)
    this.flagSegments = [];
    var segmentCount = 10;
    for(let i = 0; i < segmentCount; i++) {
        var color = i % 2 === 0 ? Colors.redFlag : Colors.whiteFlag;
        var segment = createBox(10, 80, 200/segmentCount, color, 100, 700, (-100 + i*(200/segmentCount)));
        this.flagSegments.push(segment);
        this.mesh.add(segment);
    }
    
    this.mesh.add(pole);
    this.mesh.position.set(x, y, z);
    this.mesh.scale.set(s, s, s);
    this.scale = s;
    
    this.update = function(time) {
        // Animasi bendera berkibar
        this.flagSegments.forEach((segment, index) => {
            segment.rotation.y = Math.sin(time * 5 + index * 0.5) * 0.2;
            segment.position.x = 100 + Math.sin(time * 5 + index * 0.5) * 20;
        });
    };
    
    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
        // Collision untuk tiang dan area bendera
        return (
            // Pole collision
            (minX <= (x + 20*s) && maxX >= (x - 20*s) &&
             minY <= (y + 800*s) && maxY >= y &&
             minZ <= (z + 20*s) && maxZ >= (z - 20*s)) ||
            // Flag collision
            (minX <= (x + 150*s) && maxX >= (x + 50*s) &&
             minY <= (y + 750*s) && maxY >= (y + 650*s) &&
             minZ <= (z + 100*s) && maxZ >= (z - 100*s))
        );
    };
}

/**
 * The world in which the game takes place
 */
/**
 * The world in which the game takes place (continued)
 */
function World() {
    var self = this;
    var element, scene, camera, character, renderer;
    var ambientLight, directionalLight;
    var objects, paused, keysAllowed, score, difficulty;
    var treePresenceProb, maxTreeSize, fogDistance, gameOver;
	var gameOverScreen, scoreDisplay, rankDisplay;
    var clouds = []; 
    var terrain; 

    function init() {
        // Locate where the world is to be located on the screen
        element = document.getElementById('world');

        // Initialize the renderer
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        renderer.setSize(element.clientWidth, element.clientHeight);
        renderer.shadowMap.enabled = true;
        element.appendChild(renderer.domElement);

        // Initialize the scene
        scene = new THREE.Scene();
        fogDistance = 40000;
        scene.fog = new THREE.Fog(0x363d3d, 1, fogDistance);  // Darker fog for atmosphere

        // Initialize the camera
        camera = new THREE.PerspectiveCamera(
            60, element.clientWidth / element.clientHeight, 1, 120000);
        camera.position.set(0, 1500, -2000);
        camera.lookAt(new THREE.Vector3(0, 600, -5000));
        window.camera = camera;

		// Initialize UI elements
        initializeUI();

        // Set up resizing capabilities
        window.addEventListener('resize', handleWindowResize, false);

        // Initialize the lights for dramatic effect
        ambientLight = new THREE.AmbientLight(0x444444, 0.8);
        scene.add(ambientLight);

        directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1000, 0);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Initialize the character
        character = new Character();
        scene.add(character.element);

        // Create ground with traditional pattern
        var ground = createBox(3000, 20, 120000, Colors.ground, 0, -400, -60000);
        scene.add(ground);

        // Initialize obstacles
        objects = [];
        treePresenceProb = 0.2;
        maxTreeSize = 0.5;
        for (var i = 10; i < 40; i++) {
            createRowOfTrees(i * -3000, treePresenceProb, 0.5, maxTreeSize);
        }

        // Game state initialization
        gameOver = false;
        paused = true;

        // Event listeners for controls
        var left = 37;
        var up = 38;
        var right = 39;
        var p = 80;
        
        keysAllowed = {};
        
        document.addEventListener('keydown', function(e) {
            if (!gameOver) {
                var key = e.keyCode;
                if (keysAllowed[key] === false) return;
                keysAllowed[key] = false;
                if (paused && !collisionsDetected() && key > 18) {
                    paused = false;
                    character.onUnpause();
                    document.getElementById("variable-content").style.visibility = "hidden";
                    document.getElementById("controls").style.display = "none";
                } else {
                    if (key == p) {
                        paused = true;
                        character.onPause();
                        document.getElementById("variable-content").style.visibility = "visible";
                        document.getElementById("variable-content").innerHTML = 
                            "Game is paused. Press any key to resume.";
                    }
                    if (key == up && !paused) {
                        character.onUpKeyPressed();
                    }
                    if (key == left && !paused) {
                        character.onLeftKeyPressed();
                    }
                    if (key == right && !paused) {
                        character.onRightKeyPressed();
                    }
                }
            }
        });

        document.addEventListener('keyup', function(e) {
            keysAllowed[e.keyCode] = true;
        });

        document.addEventListener('focus', function(e) {
            keysAllowed = {};
        });

        // Initialize score and difficulty
        score = 0;
        difficulty = 0;
        document.getElementById("score").innerHTML = score;

        // Begin the rendering loop
        loop();
    }

	function createMixedObstacles(position, probability, distribution) {
        distribution = distribution || {
            bamboo: 0.4,
            flag: 0.2,
            gapura: 0.2,
            tugu: 0.2
        };

        for (var lane = -1; lane < 2; lane++) {
            if (Math.random() < probability) {
                var scale = 0.3 + Math.random() * 0.2;
                var obstacle;
                var type = Math.random();
                
                if (type < distribution.bamboo) {
                    obstacle = new Tree(lane * 800, -400, position, scale);
                } else if (type < distribution.bamboo + distribution.flag) {
                    obstacle = new MovingFlag(lane * 800, -400, position, scale);
                } else if (type < distribution.bamboo + distribution.flag + distribution.gapura) {
                    obstacle = new Gapura(lane * 800, -400, position, scale * 0.8);
                } else {
                    obstacle = new Tugu(lane * 800, -400, position, scale);
                }
                
                objects.push(obstacle);
                scene.add(obstacle.mesh);
            }
        }
    }

	function loop() {
		try {
			if (!paused) {
				var currentTime = new Date() / 1000;
	
				// Safety check untuk memastikan objects array tidak kosong
				if (!objects || objects.length === 0) {
					console.log("Regenerating obstacles...");
					createInitialObstacles();
					return;
				}
	
				// Update all animated obstacles
				objects.forEach(function(object) {
					if (object && object.update) {
						object.update(currentTime);
					}
				});
	
				// Safety check sebelum mengakses last object
				var lastObject = objects[objects.length - 1];
				if (!lastObject || !lastObject.mesh) {
					console.log("Last object invalid, regenerating...");
					createInitialObstacles();
					return;
				}
	
				// Add more obstacles and increase difficulty
				if ((lastObject.mesh.position.z) % 3000 == 0) {
					difficulty += 1;
					var levelLength = 30;
	
					// Regenerate obstacles if there aren't enough ahead
					if (objects.filter(obj => obj.mesh.position.z < -50000).length < 10) {
						createMixedObstacles(-120000, treePresenceProb, getCurrentLevelDistribution());
					}
	
					if (difficulty % levelLength == 0) {
						var level = difficulty / levelLength;
						switch (level) {
							case 1:
								treePresenceProb = 0.35;
								maxTreeSize = 0.5;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.6,
									flag: 0.4,
									gapura: 0,
									tugu: 0
								});
								break;
							case 2:
								treePresenceProb = 0.35;
								maxTreeSize = 0.85;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.5,
									flag: 0.3,
									gapura: 0.2,
									tugu: 0
								});
								break;
							case 3:
								treePresenceProb = 0.5;
								maxTreeSize = 0.85;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.4,
									flag: 0.2,
									gapura: 0.2,
									tugu: 0.2
								});
								break;
							case 4:
								treePresenceProb = 0.5;
								maxTreeSize = 1.1;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.3,
									flag: 0.3,
									gapura: 0.2,
									tugu: 0.2
								});
								break;
							case 5:
								treePresenceProb = 0.5;
								maxTreeSize = 1.1;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.2,
									flag: 0.4,
									gapura: 0.2,
									tugu: 0.2
								});
								break;
							case 6:
								treePresenceProb = 0.55;
								maxTreeSize = 1.1;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.25,
									flag: 0.25,
									gapura: 0.25,
									tugu: 0.25
								});
								break;
							default:
								treePresenceProb = 0.55;
								maxTreeSize = 1.25;
								createMixedObstacles(-120000, treePresenceProb, {
									bamboo: 0.2,
									flag: 0.3,
									gapura: 0.3,
									tugu: 0.2
								});
						}
	
						// Add special effects for level transitions
						createLevelTransitionEffect(level);
					} else {
						// Regular obstacle generation between levels
						createMixedObstacles(-120000, treePresenceProb, getCurrentLevelDistribution());
					}
	
					// Adjust atmosphere based on level
					if ((difficulty >= 5 * levelLength && difficulty < 6 * levelLength)) {
						fogDistance = Math.max(fogDistance - (25000 / levelLength), 5000);
						scene.fog.far = fogDistance;
						updateEnvironmentLighting(difficulty, levelLength);
					} else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
						fogDistance = Math.max(fogDistance - (5000 / levelLength), 3000);
						scene.fog.far = fogDistance;
						updateEnvironmentLighting(difficulty, levelLength);
					}
				}
	
				// Move and cleanup obstacles
				for (let i = objects.length - 1; i >= 0; i--) {
					const object = objects[i];
					if (!object || !object.mesh) {
						objects.splice(i, 1);
						continue;
					}
	
					// Calculate speed based on difficulty with maximum cap
					var speed = Math.min(100 + (difficulty * 2), 300);
					if (object instanceof MovingFlag) {
						speed *= 1.2;
					}
	
					// Move obstacle
					object.mesh.position.z += speed;
	
					// Remove if too far past player
					if (object.mesh.position.z > 2000) {
						scene.remove(object.mesh);
						objects.splice(i, 1);
					}
				}
	
				// Ensure minimum number of obstacles
				if (objects.length < 20) {
					console.log("Regenerating obstacles due to low count...");
					createMixedObstacles(-120000, treePresenceProb, getCurrentLevelDistribution());
				}
	
				// Update character with safety check
				if (character && character.update) {
					character.update();
				} else {
					console.warn('Character update failed');
					return;
				}
	
				// Check for collisions
				if (collisionsDetected()) {
					gameOver = true;
					paused = true;
					handleGameOver();
					return;
				}
	
				// Update score with difficulty multiplier
				var scoreIncrement = 10 * (1 + Math.floor(difficulty / 30) * 0.1);
				score += scoreIncrement;
				document.getElementById("score").innerHTML = Math.floor(score);
	
				// Update environment
				if (updateEnvironment) {
					updateEnvironment(currentTime);
				}
	
				// Clean up any null objects
				objects = objects.filter(object => object && object.mesh);
	
				// Update cloud positions if they exist
				if (clouds && clouds.length > 0) {
					clouds.forEach(cloud => {
						if (cloud && cloud.position) {
							cloud.position.x += Math.sin(currentTime) * 0.5;
							if (cloud.position.x > 10000) cloud.position.x = -10000;
						}
					});
				}
	
				// Update terrain if it exists
				if (terrain && terrain.material && terrain.material.uniforms) {
					terrain.material.uniforms.time.value = currentTime;
				}
			}
	
			// Render scene if all components are available
			if (renderer && scene && camera) {
				renderer.render(scene, camera);
			} else {
				console.warn('Essential components missing for render');
				return;
			}
	
		} catch (error) {
			console.error('Error in game loop:', error);
			// Attempt to recover
			if (!gameOver) {
				createInitialObstacles();
			}
		}
	
		// Request next frame
		requestAnimationFrame(loop);
	}

	function createLevelTransitionEffect(level) {
		// Flash effect
		var flash = new THREE.DirectionalLight(0xffffff, 1);
		flash.position.set(0, 1000, -5000);
		scene.add(flash);
		
		setTimeout(() => {
			scene.remove(flash);
		}, 1000);
	
		// Display level message
		var variableContent = document.getElementById("variable-content");
		variableContent.style.visibility = "visible";
		variableContent.innerHTML = `Level ${level} - ${getLevelName(level)}`;
		setTimeout(() => {
			variableContent.style.visibility = "hidden";
		}, 2000);
	}
	
	function getLevelName(level) {
		const levelNames = [
			"Perjuangan Dimulai",
			"Semangat Membara",
			"Tekad Membaja",
			"Pantang Menyerah",
			"Jiwa Patriot",
			"Semangat '45",
			"Kemerdekaan"
		];
		return levelNames[level - 1] || "Perjuangan Tanpa Henti";
	}
	
	function getCurrentLevelDistribution() {
		const level = Math.floor(difficulty / 30);
		const baseDistribution = {
			bamboo: 0.4,
			flag: 0.2,
			gapura: 0.2,
			tugu: 0.2
		};
	
		// Adjust distribution based on current difficulty
		return baseDistribution;
	}
	
	function updateEnvironmentLighting(difficulty, levelLength) {
		// Adjust ambient light based on difficulty
		const intensity = Math.max(0.2, 1 - (difficulty / (10 * levelLength)));
		ambientLight.intensity = intensity;
		
		// Adjust directional light for dramatic effect
		directionalLight.intensity = Math.min(1.5, 1 + (difficulty / (5 * levelLength)));
	}
	
	function updateEnvironment(currentTime) {
		// Update clouds position
		clouds.forEach(cloud => {
			cloud.position.x += Math.sin(currentTime) * 0.5;
			if (cloud.position.x > 10000) cloud.position.x = -10000;
		});
	
		// Update water/terrain animation if present
		if (terrain) {
			terrain.material.uniforms.time.value = currentTime;
		}
	}
	
	function initializeUI() {
        // Create game over screen if it doesn't exist
        if (!document.getElementById('gameOverScreen')) {
            const gameOverDiv = document.createElement('div');
            gameOverDiv.id = 'gameOverScreen';
            gameOverDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                display: none;
                z-index: 1000;
                min-width: 300px;
            `;
            document.body.appendChild(gameOverDiv);
        }
        
        // Create or get variable content div
        if (!document.getElementById('variable-content')) {
            const varContent = document.createElement('div');
            varContent.id = 'variable-content';
            document.body.appendChild(varContent);
        }

        // Create or get ranks table
        if (!document.getElementById('ranks')) {
            const ranksTable = document.createElement('table');
            ranksTable.id = 'ranks';
            document.getElementById('gameOverScreen').appendChild(ranksTable);
        }

        gameOverScreen = document.getElementById('gameOverScreen');
        scoreDisplay = document.getElementById('score');
    }

    function handleGameOver() {
        try {
            gameOver = true;
            paused = true;

            // Display game over screen
            gameOverScreen.innerHTML = `
                <h2 style="color: #FF0000; margin-bottom: 20px;">Game Over!</h2>
                <p style="margin-bottom: 15px;">Skor Anda: ${Math.floor(score)}</p>
                <table id="ranks" style="width: 100%; margin-bottom: 20px;"></table>
                <p style="color: #FFD700;">Tekan tombol panah bawah untuk mencoba lagi</p>
            `;
            gameOverScreen.style.display = 'block';

            // Get the ranks table
            var table = document.getElementById("ranks");
            table.innerHTML = ''; // Clear existing content

            // Define rank names
            var rankNames = [
                "Pejuang Pemula", "Pejuang Muda", "Pejuang Tangguh",
                "Pejuang Sejati", "Pahlawan Muda", "Pahlawan Bangsa",
                "Pahlawan Nasional", "Pahlawan Revolusi"
            ];
            var rankIndex = Math.floor(score / 15000);

            // Display next achievable rank if applicable
            if (score < 124000) {
                var nextRankRow = table.insertRow(0);
                nextRankRow.style.cssText = 'color: #FFD700;';
                var nextRankCell = nextRankRow.insertCell(0);
                nextRankCell.colSpan = 2;
                nextRankCell.innerHTML = `Capai ${(rankIndex + 1) * 15}k untuk naik ke pangkat ${rankNames[Math.min(rankIndex + 1, 7)]}`;
            }

            // Display achieved rank
            var achievedRankRow = table.insertRow(0);
            achievedRankRow.style.cssText = 'color: #00FF00; font-weight: bold;';
            var achievedRankCell = achievedRankRow.insertCell(0);
            achievedRankCell.colSpan = 2;
            achievedRankCell.innerHTML = `Selamat! Anda adalah ${rankNames[Math.min(rankIndex, 7)]}!`;

            // Add event listener for restart
            const restartHandler = function(e) {
                if (e.keyCode === 40) { // Down arrow
                    document.location.reload(true);
                }
            };
            
            // Remove existing event listeners before adding new one
            document.removeEventListener('keydown', restartHandler);
            document.addEventListener('keydown', restartHandler);

        } catch (error) {
            console.error('Error in handleGameOver:', error);
            // Fallback game over message
            alert('Game Over! Skor: ' + Math.floor(score) + '\nTekan OK dan reload halaman untuk main lagi.');
        }
    }

    // Modify collision detection to immediately trigger game over
    function collisionsDetected() {
        var charMinX = character.element.position.x - 115;
        var charMaxX = character.element.position.x + 115;
        var charMinY = character.element.position.y - 310;
        var charMaxY = character.element.position.y + 320;
        var charMinZ = character.element.position.z - 40;
        var charMaxZ = character.element.position.z + 40;
        
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].collides(charMinX, charMaxX, charMinY, 
                    charMaxY, charMinZ, charMaxZ)) {
                handleGameOver(); // Immediately handle game over
                return true;
            }
        }
        return false;
    }

    function createRowOfTrees(position, probability, minScale, maxScale) {
        for (var lane = -1; lane < 2; lane++) {
            var randomNumber = Math.random();
            if (randomNumber < probability) {
                var scale = minScale + (maxScale - minScale) * Math.random();
                var tree = new Tree(lane * 800, -400, position, scale);
                objects.push(tree);
                scene.add(tree.mesh);
            }
        }
    }

    function handleWindowResize() {
        renderer.setSize(element.clientWidth, element.clientHeight);
        camera.aspect = element.clientWidth / element.clientHeight;
        camera.updateProjectionMatrix();
    }

    init();
}