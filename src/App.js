import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

import { SpringMassSystem1D, SpringMassSystem2D, MultipleSpringMassSystem, ParticleSystemFromCard } from './SpringMassSystem.js';
import { skullSystem, entitySystem } from './model.js'

export class App {

    constructor() {

        this.clock = new THREE.Clock();
        this.loaderGLB = new GLTFLoader();

        // main render attributes
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.controls = null;

        this.options = {};

        this.hairCards = [];

        // fix time step
        this.dt = 0.01;
        this.accumulator = 0.0;
    }

    init() {

        // Init scene, renderer and add to body element
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2c2c2c);
        this.scene.add(new THREE.GridHelper(10, 10));

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        const canvas = this.renderer.domElement;
        document.body.appendChild(canvas);

        // Set up camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
        this.camera.position.set(0, 3, 6);

        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 10;
        this.controls.target = new THREE.Vector3(0, 1.3, 0);
        this.controls.update();

        // Set up lights
        let hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 0.2);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        let dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(0, 3, 4);
        dirLight.castShadow = false;
        this.scene.add(dirLight);


        this.mousePos = new THREE.Vector2();

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('click', this.onClick);
        document.onkeydown = (e) => {

            if (e.code === 'ArrowUp')
                this.isArrowUp = true;

            else if (e.code === 'ArrowDown')
                this.isArrowDown = true;

            else if (e.code === 'ArrowLeft')
                this.isArrowLeft = true;

            else if (e.code === 'ArrowRight')
                this.isArrowRight = true;

            else if (e.code === 'Space') 
                this.isSpace = true;
        };

        document.onkeyup = (e) => {

            if (e.code === 'ArrowUp')
                this.isArrowUp = false;

            else if (e.code === 'ArrowDown')
                this.isArrowDown = false;

            else if (e.code === 'ArrowLeft')
                this.isArrowLeft = false;

            else if (e.code === 'ArrowRight')
                this.isArrowRight = false;

            else if (e.code === 'Space') 
                this.isSpace = false;

        }

        // init gui
        this.modes = {
            MassSpring: 0,
            Plane: 1,
            //MultiPlane: 2,
            Skull: 3,
            Head: 4
        }

        this.currentMode = this.modes.Head;

        this.options = {
            damping: 100,
            k: 800,
            gravity: -9.98,
            mass: 1.5,
            set: () => { this.set() },
            restart: () => { this.restart() },
            mode: this.currentMode
        };



        let gui = new GUI().title('Evaluate Dataset Options');
        gui.add(this.options, 'mode', this.modes).name('Mode');
        gui.add(this.options, 'damping', 0, 1000).name('Damping');
        gui.add(this.options, 'k', 0, 1000).name('K');
        gui.add(this.options, 'gravity', -100, 0).name('Gravity');
        gui.add(this.options, 'mass', 0, 100).name('Mass');
        gui.add(this.options, 'set').name('Set params');
        gui.add(this.options, 'restart').name('Restart demo');



        // init models
        this.initOnlyMassSpringSystem();

        this.initOnlyOnePlaneSytem();

        //this.initMultiPlaneSytem();

        this.initSkullSystem();

        this.initHead();

        console.log(this.scene)



        // Start loop
        this.animate();
    };


    onClick = (event) => {
        // calculate normalized mouse coordinates (-1 to +1)
        this.mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

        let raycaster = new THREE.Raycaster();

        raycaster.setFromCamera(this.mousePos, this.camera);

        this.head.skull.updateMatrixWorld();
        let position = this.head.skull.geometry.attributes.position;

        // get an array of intersections between the ray and the mesh
        let intersects = raycaster.intersectObject(this.head.skull);

        if (intersects.length > 0) {

            // get the face of the closest intersection
            let face = intersects[0].face;

            console.log(face);

            // get one vertex position indix of the face
            let v = new THREE.Vector3();

            v.fromBufferAttribute(position, face.a);
            console.log(v);


            /*
            // get the face index of the closest intersection
            const faceIndex = intersects[0].faceIndex;
    
            // get the vertex indices of the face
            const vertexIndices = this.head.skull.geometry.index.array.slice(
                faceIndex * 3,
                faceIndex * 3 + 3
            );
    
            // create a new array to store the positions of the vertices of the face
            const facePositions = [];
    
            // add the positions of the vertices to the array
            for (let i = 0; i < 3; i++) {
                const index = vertexIndices[i];
                facePositions.push(new THREE.Vector3(
                    position.array[index * 3],
                    position.array[index * 3 + 1],
                    position.array[index * 3 + 2]
                ));
            }
            console.log(facePositions);
            */

        }

    }


    set() {
        if (this.currentMode == this.options.mode) {

            if (this.options.mode == this.modes.MassSpring) {
                this.particleSystem.setParams(this.options);
            }

            else if (this.options.mode == this.modes.Plane) {
                this.hairCard.system.setParams(this.options);
            }

            /*
            else if (this.options.mode == this.modes.MultiPlane) {
                for (let i = 0; i < this.hairCards.length; i++) {
                    this.hairCards[i].system.setParams(this.options);

                }
            }
            */

            else if (this.options.mode == this.modes.Skull || this.options.mode == this.modes.Head) {
                //this.skull.moveSkull(0, 2, 0);
                let model = this.options.mode == this.modes.Skull ? this.skull : this.head;
                for (let i = 0; i < model.hairCards.length; i++) {
                    model.hairCards[i].system.setParams(this.options);
                }

            }

        }
    };

    restart() {
        if (this.options.mode == this.modes.MassSpring) {
            this.particleSystem.setParams(this.options);
            this.particleSystem.restart();
        }

        else if (this.options.mode == this.modes.Plane) {
            this.hairCard.system = new ParticleSystemFromCard(this.hairCard.initWPos, this.options);
        }

        /*
        else if (this.options.mode == this.modes.MultiPlane) {
            for (let i = 0; i < this.hairCards.length; i++) {
                this.hairCards[i].system = new ParticleSystemFromCard(this.hairCards[i].initWPos, this.options);
            }
        }
        */

        else if (this.options.mode == this.modes.Skull || this.options.mode == this.modes.Head) {
            let model = this.options.mode == this.modes.Skull ? this.skull : this.head;
            model.restart(this.options);
        }


    };

    createHairCard() {
        const cardGeometry = new THREE.PlaneGeometry(0.05, 0.1, 1, 4);
        //const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/data/strand 4 RGB.png');
        const aTexture = textureLoader.load('/data/strand 4 A.png');
        let cardMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture });
        let cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        cardMesh.frustumCulled = false;
        cardMesh.transparent = true;
        
        return cardMesh;
    }

    createHairCone() {
        // Create a plane geometry with width and height of 1 unit
        const coneGeometry = new THREE.ConeGeometry(0.1, 2.0, 4, 1, false);
        console.log(coneGeometry)

        // Create a basic material with a color and no textures
        const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Create a mesh by combining the geometry and material
        this.coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);

        this.coneMesh.position.set(0, 0, 0);

        // Add the mesh to the scene
        this.scene.add(this.coneMesh);
    }

    initOnlyMassSpringSystem() {
        var length = 4;
        this.particleSystem = new MultipleSpringMassSystem(length, this.options);
        for (var i = 0; i < length; i++) {
            this.scene.add(this.particleSystem.particles[i]);
            if (i > 0) {
                this.scene.add(this.particleSystem.lines[i]);
            }
        }

        this.particleSystem.setVisible(false);


    };

    loadParticleSystemFromCard(mesh) {
        let position = mesh.geometry.getAttribute('position')
        let initWPos = [];
        // change to world position
        for (let i = 0; i < position.count; i++) {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            initWPos.push(mesh.localToWorld(vertex));
        }

        return { system: new ParticleSystemFromCard(initWPos, this.options), initWPos: initWPos };
    }

    initOnlyOnePlaneSytem() {
        let cardMesh = this.createHairCard();

        cardMesh.position.set(0, 1.5, 0);
        //cardMesh.rotateY(0.75);
        cardMesh.rotateX(-1);
        //cardMesh.rotateZ(0);
        cardMesh.updateMatrixWorld();

        // Add the mesh to the scene
        this.scene.add(cardMesh);

        let { system, initWPos } = this.loadParticleSystemFromCard(cardMesh);

        this.hairCard = new entitySystem(cardMesh, system, initWPos);
        this.hairCard.setVisible(false);
    };

    /*
    initMultiPlaneSytem() {
        let numOfHairCards = 7;
        for (let i = 0; i < numOfHairCards; i++) {

            let cardMesh = this.createHairCard();

            // Set the position of the mesh to be at the origin
            cardMesh.position.set(-numOfHairCards / 4 + i / 2, 1.5, 0);
            cardMesh.rotateX(-1);
            cardMesh.updateMatrixWorld();

            let { system, initWPos } = this.loadParticleSystemFromCard(cardMesh);
            // Add the mesh to the scene
            this.scene.add(cardMesh);

            let card = new entitySystem(cardMesh, system, initWPos);
            card.setVisible(false);
            this.hairCards.push(card);
        }
    }
    */

    initSkullSystem() {
        const geometry = new THREE.SphereGeometry(0.1, 32, 16);
        const material = new THREE.PointsMaterial({ size: 0.01, color: 'purple' });
        const sphere = new THREE.Points(geometry, material);

        let indeces = [200, 210, 220, 230, 240, 250, 260, 270, 280];
        this.skull = new skullSystem(sphere, indeces, this.options, [0, 1.3, 0]);

        this.skull.addToScene(this.scene);
        this.skull.setVisible(false);

    }

    initHead() {

        this.loaderGLB.load('./data/head.glb', (glb) => {
            let model = glb.scene;
            model.position.set(0, 0, 0);

            console.log(model);
            // hide hair
            model.getObjectByName("Hair").visible = false;

            //get head
            let head = model.getObjectByName("Body");

            if (this.currentMode != this.modes.Head)
                head.visible = false;

            head.material.wireframe = true;
            head.updateMatrixWorld(); // make sure the object's world matrix is up-to-date

            let indeces = [1500, 1510, 662, 1544, 631];
            this.head = new skullSystem(head, indeces, this.options, [0, 0, 0]);
            this.head.addToScene(this.scene);
        });
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // set the pixel ratio (for mobile devices)
        //renderer.setPixelRatio(window.devicePixelRatio);
    }

    animate() {

        requestAnimationFrame(this.animate.bind(this));

        let delta = this.clock.getDelta();
        if (delta > 0.25)
            delta = 0.25;
        this.accumulator += delta;

        while (this.accumulator >= this.dt) {
            this.update(this.dt);
            this.accumulator -= this.dt;
        }


        this.renderer.render(this.scene, this.camera);
    }

    update(delta) {

        if (this.currentMode != this.options.mode)
            this.updateMode();


        if (this.currentMode == this.modes.MassSpring && this.particleSystem) {
            this.particleSystem.update(delta);
        }


        if (this.currentMode == this.modes.Plane && this.hairCard) {
            this.updateHairCard(delta, this.hairCard);
        }

        /*
        else if (this.currentMode == this.modes.MultiPlane) {
            for (let i = 0; i < this.hairCards.length; i++) {
                this.updateHairCard(delta, this.hairCards[i]);
            }
        }
        */

        else if (this.currentMode == this.modes.Skull || this.currentMode == this.modes.Head) {
            let model = this.currentMode == this.modes.Skull ? this.skull : this.head;
            if (!model)
                return;

            for (let i = 0; i < model.hairCards.length; i++) {
                this.updateHairCard(delta, model.hairCards[i]);
            }

            this.updatePosition(delta);

        }

    };

    updateHairCard(delta, { mesh, system }) {
        system.update(delta);
        //console.log(system.particles[1])
        for (var i = 0; i < system.particles.length; i++) {
            // Access the geometry data of the model
            const position = mesh.geometry.getAttribute('position');
            const particle = system.particles[i];

            const vertexIndex = particle.index;
            let aux = new THREE.Vector3(particle.position[0], particle.position[1], particle.position[2]);
            let lPos = mesh.worldToLocal(aux);

            position.setXYZ(vertexIndex, lPos.x - particle.offset[0] / 2, lPos.y - particle.offset[1] / 2, lPos.z - particle.offset[2] / 2);
            position.setXYZ(vertexIndex + 1, lPos.x + particle.offset[0] / 2, lPos.y + particle.offset[1] / 2, lPos.z + particle.offset[2] / 2);
            position.needsUpdate = true;

        }
    }

    updateMode() {

        // hide previous mode 
        if (this.currentMode == this.modes.MassSpring)
            this.particleSystem.setVisible(false);

        else if (this.currentMode == this.modes.Plane)
            this.hairCard.setVisible(false);

        /*
        else if (this.currentMode == this.modes.MultiPlane) {
            for (let i = 0; i < this.hairCards.length; i++) {
                this.hairCards[i].setVisible(false);
            }
        }
        */
        else if (this.currentMode == this.modes.Skull)
            this.skull.setVisible(false);

        else if (this.currentMode == this.modes.Head)
            this.head.setVisible(false);


        // show new mode 
        if (this.options.mode == this.modes.MassSpring)
            this.particleSystem.setVisible(true);

        else if (this.options.mode == this.modes.Plane)
            this.hairCard.setVisible(true);

        /*
        else if (this.options.mode == this.modes.MultiPlane) {
            for (let i = 0; i < this.hairCards.length; i++) {
                this.hairCards[i].setVisible(true);
            }
        }
        */

        else if (this.options.mode == this.modes.Skull)
            this.skull.setVisible(true);

        else if (this.options.mode == this.modes.Head)
            this.head.setVisible(true);

        this.currentMode = this.options.mode;
    }

    updatePosition(delta) {
        let model = this.currentMode == this.modes.Skull ? this.skull : (this.currentMode == this.modes.Head ? this.head : null) ;
        if(model == null)
            return;
            
        let tt = delta * 0.2;
        if (this.isArrowUp) {
            let position = model.skull.position;
            model.moveSkull(position.x, position.y + tt, position.z); //TODO: add dt somewhere in the future if I want to keep it
        }
        if (this.isArrowDown) {
            let position = model.skull.position;
            model.moveSkull(position.x, position.y - tt, position.z);
        }
        if (this.isArrowLeft) {
            let position = model.skull.position;
            model.moveSkull(position.x - tt, position.y, position.z);
        }
        if (this.isArrowRight) {
            let position = model.skull.position;
            model.moveSkull(position.x + tt, position.y, position.z);
        }
        
        if (this.isSpace) {
            model.rotateSkull(delta);
        }
        
    }

}