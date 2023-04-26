import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';


let container;
let camera, scene, raycaster, renderer;
let cube;

let controller, controllerGrip;
let INTERSECTED;
const tempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // document.body.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshNormalMaterial();
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);

    const controllerModelFactory = new XRControllerModelFactory();
    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    const controllerModel1 = controllerModelFactory.createControllerModel(
        controllerGrip1
    );
    scene.add(controllerGrip1);
    scene.add(controllerModel1);

    camera.position.z = 5;
}


function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}

animate();