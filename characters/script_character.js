const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const loader = new THREE.GLTFLoader();
const models = []; // Array to hold model references
let currentIndex = 0; // Current model index

// Load Cow model
loader.load('model/Cow.glb', function(gltf) {
    const cow = gltf.scene;
    cow.scale.set(1, 1, 1);
    cow.position.set(0, -1.5, 0);
    models.push(cow); // Add to models array
    if (models.length === 1) {
        scene.add(cow); // Add to scene if it's the first model
    }
});

loader.load('model/rabbit.glb', function(gltf) {
    const rabbit = gltf.scene;
    rabbit.scale.set(0.3, 0.3, 0.3);
    rabbit.position.set(0, -1.5, 0);
    models.push(rabbit); // Add to models array
});

loader.load('model/pig.glb', function(gltf) {
    const pig = gltf.scene;
    pig.scale.set(0.1, 0.1, 0.1);
    pig.position.set(0, -1, 0);
    models.push(pig); // Add to models array
});

loader.load('model/chicken.glb', function(gltf) {
    const chicken = gltf.scene;
    chicken.scale.set(0.1, 0.1, 0.1);
    chicken.position.set(0, -1, 0);
    models.push(chicken); // Add to models array
});

loader.load('model/lion.glb', function(gltf) {
    const lion = gltf.scene;
    
    lion.rotation.y = Math.PI; 
    
    lion.scale.set(1, 1, 1);
    lion.position.set(0, -1.5, 0);
    
    models.push(lion); // Menambahkan model ke dalam array models
});


camera.position.set(0, 0, 5);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI;
controls.minPolarAngle = 0;

function updateModelDisplay() {
    // Clear previous model from the scene
    for (let model of models) {
        scene.remove(model); // Remove each model from the scene
    }

    // Add the current model to the scene
    const modelToDisplay = models[currentIndex];
    if (modelToDisplay) {
        scene.add(modelToDisplay); // Add the current model to the scene
    }
}

// Button event listeners
document.getElementById('nextBtn').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % models.length; // Increment index
    updateModelDisplay();
});

document.getElementById('prevBtn').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + models.length) % models.length; // Wrap to last model
    updateModelDisplay();
});

const selectButton = document.getElementById('selectBtn');
const modelSelect = document.getElementById('modelSelect');

selectButton.addEventListener('click', function() {
    const selectedModelName = modelSelect.options[modelSelect.selectedIndex].text;
    localStorage.setItem('selectedCharacter', selectedModelName);
    alert(`You have selected: ${selectedModelName}`);
});

document.getElementById('playBtn').addEventListener('click', () => {
    const selectedCharacter = localStorage.getItem('selectedCharacter');
    if (selectedCharacter === 'Cow') {
        window.location.href = '../Cow/index.html';
    } else if (selectedCharacter === 'Rabbit') {
        window.location.href = '../rabbit/index.html';
    } else if (selectedCharacter === 'Pig') {
        window.location.href = '../pig/index.html';
    } else if (selectedCharacter === 'Chicken') {
        window.location.href = '../Game/index.html';
    }  else if (selectedCharacter === 'Lion') {
        window.location.href = '../Lion/index.html';
    } else {
        alert("Please select a character.");
    }
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
