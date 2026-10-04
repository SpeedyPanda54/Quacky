import * as THREE from 'three';
import { CarController } from './car.js';
import { HighwayMap } from './map.js';
import { TrafficManager } from './traffic.js';

// Setup Scene, Renderer, and Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
scene.fog = new THREE.FogExp2(0x020208, 0.012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x111133, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x00ffff, 1.2);
dirLight.position.set(20, 50, 20);
scene.add(dirLight);

// Initialize Game Systems
const car = new CarController(scene);
const highwayMap = new HighwayMap(scene);
const trafficManager = new TrafficManager(scene);

// Wire up Restart Button
document.getElementById('restart-btn').addEventListener('click', () => {
    window.location.reload();
});

// Game Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    car.update(delta);
    car.updateCamera(camera);
    highwayMap.update(car.mesh.position.z);
    trafficManager.update(delta, car);

    renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});