import * as THREE from 'three';
import { FirstPersonController } from './player.js';
import { createFacilityMap } from './map.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d0e);
scene.fog = new THREE.FogExp2(0x0b0d0e, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-24, 1.6, 26);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x223344, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x88ccff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const pointLight1 = new THREE.PointLight(0x00ffcc, 1, 15);
pointLight1.position.set(16, 6, -12);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff3333, 1, 15);
pointLight2.position.set(-24, 6, 26);
scene.add(pointLight2);

const facility = createFacilityMap(scene);
const player = new FirstPersonController(camera, renderer.domElement, facility.colliders);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    player.update(delta);
    renderer.render(scene, camera);
}

animate();