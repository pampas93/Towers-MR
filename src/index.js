import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

import SpriteText from 'three-spritetext';

import './style.css';

let container;
let camera, scene, raycaster, renderer, light;
let game;
let cube;
let scoreText;

let controller, controllerGrip;
let INTERSECTED;
const tempMatrix = new THREE.Matrix4();

let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    // document.body.appendChild(renderer.domElement);

    // document.body.appendChild(VRButton.createButton(renderer, () => {
    //     game = new Game();
    // }));
    document.body.appendChild(ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test']
    }, () => {
        game = new Game();
    }));

    light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(0, 499, 0);
    const softLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(softLight);
    scene.add(light);

    // const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    // const cubeMaterial = new THREE.MeshNormalMaterial();
    // cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // scene.add(cube);

    const controllerModelFactory = new XRControllerModelFactory();
    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    const controllerModel1 = controllerModelFactory.createControllerModel(
        controllerGrip1
    );
    scene.add(controllerGrip1);
    scene.add(controllerModel1);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', () => {
        game.onAction();
    });
    scene.add(controller);


    // camera.position.x = -6;
    // camera.position.y = 12;
    // camera.position.z = -20;
    // camera.lookAt(new THREE.Vector3(-3, 0, -3)); // pemp maybe?
    // renderer.setClearColor('#D0CBC7', 1);

    // Create the text sprite
    scoreText = new SpriteText('Hello World', 2, 'red');
    // textSprite.backgroundColor = true;
    scoreText.fontSize = 24;
    // textSprite.strokeWidth = 1;
    // textSprite.strokeColor = 'white';
    scoreText.fontFace = 'Comfortaa'
    scoreText.borderRadius = 2;
    scoreText.position.set(0, 0, 0);
    scene.add(scoreText);

    window.addEventListener('resize', onWindowResize);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    if (frame && game && game.state == game.STATES.PLACEMENT) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then(function (referenceSpace) {
                session.requestHitTestSource({ space: referenceSpace }).then(function (source) {
                    hitTestSource = source;
                });
            });

            session.addEventListener('end', function () {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
            hitTestSourceRequested = true;
        }
        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                game.placingFirstBlock(referenceSpace, hit);
                // reticle.visible = true;
                // reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                // reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();

class Stage {
    add(elem) {
        scene.add(elem);
    }

    remove(elem) {
        scene.remove(elem);
    }
}

class Block {
    constructor(block) {
        // set size and position
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 1;
        this.defaultSize = { width: 0.5, height: 0.06, depth: 0.5 };
        this.dimension = { width: 0, height: 0, depth: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetBlock = block;
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? 'x' : 'z';
        this.workingDimension = this.index % 2 ? 'width' : 'depth';

        // set the dimensions from the target block, or defaults.
        this.dimension.width = this.targetBlock ?
            this.targetBlock.dimension.width : this.defaultSize.width;
        this.dimension.height = this.targetBlock ?
            this.targetBlock.dimension.height : this.defaultSize.height;
        this.dimension.depth = this.targetBlock ?
            this.targetBlock.dimension.depth : this.defaultSize.depth;

        this.position.x = this.targetBlock ? this.targetBlock.mesh.position.x : 0;
        this.position.y = this.targetBlock ? this.targetBlock.mesh.position.y + (this.dimension.height * this.index) / 2 : 0;
        this.position.z = this.targetBlock ? this.targetBlock.mesh.position.z : 0;
        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);

        // set color
        if (!this.targetBlock) {
            this.color = 0x333344;
        }
        else {
            let offset = this.index + this.colorOffset;
            var r = Math.sin(0.3 * offset) * 55 + 200;
            var g = Math.sin(0.3 * offset + 2) * 55 + 200;
            var b = Math.sin(0.3 * offset + 4) * 55 + 200;
            this.color = new THREE.Color(r / 255, g / 255, b / 255);
        }

        // state
        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;

        // set direction
        this.speed = -0.01 - (this.index * 0.002);
        if (this.speed < -1)
            this.speed = -1;
        this.direction = this.speed;

        // create block
        let geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        this.material = new THREE.MeshToonMaterial({ color: this.color, shading: THREE.MeshPhongMaterial });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);
        if (this.targetBlock) {
            let targetRotation = this.targetBlock.mesh.quaternion;
            this.mesh.quaternion.set(targetRotation.x, targetRotation.y, targetRotation.z, targetRotation.w);
        }
        console.log('Pemp block state: ' + this.state);

        this.topLimit = this.position[this.workingPlane] - this.MOVE_AMOUNT;
        this.bottomLimit = this.position[this.workingPlane] + this.MOVE_AMOUNT;
    }

    place() {
        this.state = this.STATES.STOPPED;
        let overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
        let blocksToReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };
        if (this.dimension[this.workingDimension] - overlap < 0.3) {
            overlap = this.dimension[this.workingDimension];
            blocksToReturn.bonus = true;
            this.position.x = this.targetBlock.position.x;
            this.position.z = this.targetBlock.position.z;
            this.dimension.width = this.targetBlock.dimension.width;
            this.dimension.depth = this.targetBlock.dimension.depth;
        }
        if (overlap > 0) {
            let choppedDimensions = { width: this.dimension.width, height: this.dimension.height, depth: this.dimension.depth };
            choppedDimensions[this.workingDimension] -= overlap;
            this.dimension[this.workingDimension] = overlap;
            let placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            let placedMesh = new THREE.Mesh(placedGeometry, this.material);
            let choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
            choppedGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
            let choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
            let choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
                this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
            }
            else {
                choppedPosition[this.workingPlane] += overlap;
            }
            placedMesh.position.set(this.position.x, this.position.y, this.position.z);
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
            blocksToReturn.placed = placedMesh;
            if (!blocksToReturn.bonus)
                blocksToReturn.chopped = choppedMesh;
        }
        else {
            this.state = this.STATES.MISSED;
        }
        this.dimension[this.workingDimension] = overlap;
        return blocksToReturn;
    }

    setPosition(transform) {
        let x = transform.position.x - this.defaultSize.width / 2;
        let y = transform.position.y - this.defaultSize.width / 2;
        let z = transform.position.z - this.defaultSize.width / 2;
        this.mesh.position.set(x, y, z);

        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        // this.mesh.quaternion.set(
        //     transform.orientation.x,
        //     transform.orientation.y,
        //     transform.orientation.z,
        //     transform.orientation.w);
    }

    reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    }

    tick() {
        if (this.state == this.STATES.ACTIVE) {
            console.log('Pemp ticking');
            let value = this.position[this.workingPlane];
            if (value < this.topLimit || value > this.bottomLimit)
                this.reverseDirection();
            // FYI, mesh.pos and pos is both having same values.
            this.position[this.workingPlane] += this.direction;
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
        }
    }
}

class Game {
    constructor() {
        this.STATES = {
            'PLACEMENT': 'placement',
            'PLAYING': 'playing',
            'READY': 'ready',
            'ENDED': 'ended',
            'RESETTING': 'resetting'
        };
        this.blocks = [];
        this.state = this.STATES.PLACEMENT;
        // this.mainContainer = document.getElementById('container');
        // this.scoreContainer = document.getElementById('score');
        // this.scoreContainer.innerHTML = '0';
        this.setScore(0);

        this.newBlocks = new THREE.Group();
        this.placedBlocks = new THREE.Group();
        this.choppedBlocks = new THREE.Group();

        this.stage = new Stage();
        this.stage.add(this.newBlocks);
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);

        this.firstBlock = new Block(null);
        this.newBlocks.add(this.firstBlock.mesh);
        this.blocks.push(this.firstBlock);

        // this.addBlock();
        this.tick();
        // this.updateState(this.STATES.READY);

        // document.addEventListener('keydown', e => {
        //     if (e.keyCode == 32) {
        //         // this.onAction();
        //     }
        // });
        // document.addEventListener('click', e => {
        //     this.onAction();
        // });
        // document.addEventListener('touchstart', e => {
        //     e.preventDefault();
        //     // this.onAction();
        //     // ☝️ this triggers after click on android so you
        //     // insta-lose, will figure it out later.
        // });
    }

    updateState(newState) {
        // for (let key in this.STATES) // Pemp maybe?
        //     this.mainContainer.classList.remove(this.STATES[key]);
        // this.mainContainer.classList.add(newState);
        console.log('Pemp updateState to ' + newState);
        this.state = newState;
        this.setScore(this.blocks.length - 1);
    }

    onAction() {
        console.log('Pemp current state:' + this.state);
        switch (this.state) {
            case this.STATES.PLACEMENT:
                this.startGame();
                break;
            // case this.STATES.READY:
            //     this.startGame();
            //     break;
            case this.STATES.PLAYING:
                this.placeBlock();
                break;
            // case this.STATES.ENDED:
            //     this.restartGame();
            //     break;
        }
    }

    setScore(score) {
        const pretext = this.state != this.STATES.ENDED ? 'Score: ' : 'Congrats on ';
        scoreText.text = pretext + score;
    }

    startGame() {
        console.log('startGame func');
        if (this.state != this.STATES.PLAYING) {
            // this.scoreContainer.innerHTML = '0';
            this.setScore(0);
            this.updateState(this.STATES.PLAYING);
            this.addBlock();
        }
    }

    // restartGame() {
    //     this.updateState(this.STATES.RESETTING);
    //     let oldBlocks = this.placedBlocks.children;
    //     let removeSpeed = 0.2;
    //     let delayAmount = 0.02;
    //     for (let i = 0; i < oldBlocks.length; i++) {
    //         TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn, onComplete: () => this.placedBlocks.remove(oldBlocks[i]) });
    //         TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn });
    //     }
    //     let cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
    //     // this.stage.setCamera(2, cameraMoveSpeed);
    //     let countdown = { value: this.blocks.length - 1 };
    //     TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: () => { this.scoreContainer.innerHTML = String(Math.round(countdown.value)); } });
    //     this.blocks = this.blocks.slice(0, 1);
    //     setTimeout(() => {
    //         this.startGame();
    //     }, cameraMoveSpeed * 1000);
    // }

    placeBlock() {
        console.log('placeBlock()');
        let currentBlock = this.blocks[this.blocks.length - 1];
        let newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);
        if (newBlocks.placed)
            this.placedBlocks.add(newBlocks.placed);
        if (newBlocks.chopped) {
            this.choppedBlocks.add(newBlocks.chopped);
            let positionParams = { y: '-=30', ease: Power1.easeIn, onComplete: () => this.choppedBlocks.remove(newBlocks.chopped) };
            let rotateRandomness = 10;
            let rotationParams = {
                delay: 0.05,
                x: newBlocks.plane == 'z' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                z: newBlocks.plane == 'x' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                y: Math.random() * 0.1,
            };
            if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
                positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
            }
            else {
                positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
            }
            TweenLite.to(newBlocks.chopped.position, 1, positionParams);
            TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
        }
        this.addBlock();
    }

    placingFirstBlock(referenceSpace, hit) {
        if (this.firstBlock) {
            const transform = hit.getPose(referenceSpace).transform;
            // console.log(transform.position);
            this.firstBlock.setPosition(transform);
        }
    }

    addBlock() {
        console.log('addBlock()');
        let lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
            console.log('Pemp game ending from addBlock');
            return this.endGame();
        }
        // this.scoreContainer.innerHTML = String(this.blocks.length - 1);
        this.setScore(this.blocks.length - 1);
        let newKidOnTheBlock = new Block(lastBlock);
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        // this.stage.setCamera(this.blocks.length * 2);
    }

    endGame() {
        this.updateState(this.STATES.ENDED);
    }

    tick() {
        if (this.blocks.length > 0) {
            this.blocks[this.blocks.length - 1].tick();
        }
        requestAnimationFrame(() => { this.tick() });
    }
}