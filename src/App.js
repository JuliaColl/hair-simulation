import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

import { SpringMassSystem1D, SpringMassSystem2D, MultipleSpringMassSystem, MassSpringHairCardSystem, modes } from './SpringMassSystem.js';
import { Head, HairCard, CollisionSphere } from './model.js'

let initPlanePos = new THREE.Vector3(0, 1.5, 0);

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
        this.camera.position.set(0, 1.5, 1);

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

        // Add text information
        let info = document.createElement('div');
        info.innerHTML = "Use w,a,s,d,q,e keys to move";
        let info2 = document.createElement('div');
        info2.innerHTML = "Use space bar to rotate";
        this.info3 = document.createElement('div');

        info.style.fontFamily = info2.style.fontFamily = this.info3.style.fontFamily = "sans-serif";
        info.style.color = info2.style.color = this.info3.style.color = "white";
        info.style.position = info2.style.position = this.info3.style.position = 'absolute';
        info.style.top = 30 + 'px';
        info.style.left = info2.style.left = this.info3.style.left = 40 + 'px';
        info2.style.top = 55 + 'px';
        this.info3.style.top = 75 + 'px';
        info2.style.fontSize = this.info3.style.fontSize = "small";

        document.body.appendChild(info);
        document.body.appendChild(info2);
        document.body.appendChild(this.info3);

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('click', this.onClick);
        document.onkeydown = (e) => { this.onKey(e, true); };
        document.onkeyup = (e) => { this.onKey(e, false); }

        this.modeIndeces = {
            MassSpring: 0,
            HairCard: 1,
            //Skull: 2,
            Head: 3
        }

        this.currentModeIndex = this.modeIndeces.MassSpring;
        //this.currentSystemMode = modes.inextensible;

        this.modes = [];

        // init gui
        this.options = {
            damping: 3,
            k: 100,
            gravity: -10.0,
            mass: 0.02,
            set: () => { this.set() },
            restart: () => { this.restart() },
            mode: this.currentModeIndex,
            systemMode: modes.inextensible,
            showControlHairs: false,
            showCollisionSpheres: true,
            applyPhysics: false,
        };

        let gui = new GUI().title('Evaluate Dataset Options');
        gui.add(this.options, 'mode', this.modeIndeces).name('Mode');
        gui.add(this.options, 'systemMode', modes).name('System Mode');
        gui.add(this.options, 'damping', 0.01, 1000).name('Damping');
        gui.add(this.options, 'k', 0.01, 1000).name('K');
        gui.add(this.options, 'gravity', -100, 0).name('Gravity');
        gui.add(this.options, 'mass', 0, 100).name('Mass');
        gui.add(this.options, 'showControlHairs').name('Show Control Hairs');
        gui.add(this.options, 'showCollisionSpheres').name('Show Collision Spheres');        
        gui.add(this.options, 'applyPhysics').name('Apply Physics');

        gui.add(this.options, 'set').name('Set params');
        gui.add(this.options, 'restart').name('Restart demo');

        gui.onChange(this.onGUI);

        // init models
        this.initOnlyMassSpringSystem();

        this.initOnlyOnePlaneSytem();

        //this.initSkullSystem();

        this.initHead();

        console.log(this.scene);

        // Start loop
        this.animate();
    };

    onKey(e, bool) {
        if (e.code === 'KeyW')
            this.isKeyW = bool;

        else if (e.code === 'KeyS')
            this.isKeyS = bool;

        else if (e.code === 'KeyA')
            this.isKeyA = bool;

        else if (e.code === 'KeyD')
            this.isKeyD = bool;

        else if (e.code === 'KeyQ')
            this.isKeyQ = bool;

        else if (e.code === 'KeyE')
            this.isKeyE = bool;

        else if (e.code === 'Space')
            this.isSpace = bool;

    }

    onClick = (event) => {
        // calculate normalized mouse coordinates (-1 to +1)

        if (!this.modes[this.modeIndeces.Head] || this.currentModeIndex != this.modeIndeces.Head)
            return;

        this.mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

        let raycaster = new THREE.Raycaster();

        raycaster.setFromCamera(this.mousePos, this.camera);

        this.modes[this.modeIndeces.Head].skull.updateMatrixWorld();
        let position = this.modes[this.modeIndeces.Head].skull.geometry.attributes.position;

        // get an array of intersections between the ray and the mesh
        let intersects = raycaster.intersectObject(this.modes[this.modeIndeces.Head].skull);

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
            const vertexIndices = this.modes[this.modeIndeces.Head].skull.geometry.index.array.slice(
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

    onGUI = (event) => {
        if (event.property === 'showControlHairs') {
            if (this.currentModeIndex == this.modeIndeces.MassSpring)
                return;

            this.modes[this.currentModeIndex].showControlHairs(event.value);
        }

        if (event.property === 'showCollisionSpheres') {
            if (this.currentModeIndex == this.modeIndeces.Head)
                this.modes[this.currentModeIndex].showCollisionSpheres(event.value);
            
            else if (this.currentModeIndex == this.modeIndeces.HairCard)
            {
                let spheres = this.modes[this.modeIndeces.HairCard].system.collisionSpheres;

                for (let i = 0; i < spheres.length; i++)
                    spheres[i].setVisible(event.value);
            }

        }

        if (event.property === 'systemMode') {
            this.modes[this.currentModeIndex].changeMode(event.value);
        }


        if (event.property === 'mode') {
            this.updateMode();
        }
        

    }

    initOnlyMassSpringSystem() {
        var length = 9;
        this.modes[this.modeIndeces.MassSpring] = new MultipleSpringMassSystem(length, this.options);
        this.modes[this.modeIndeces.MassSpring].addToScene(this.scene);
        this.modes[this.modeIndeces.MassSpring].setVisible(this.currentModeIndex == this.modeIndeces.MassSpring);
    };

    initOnlyOnePlaneSytem() {

        let collision = new CollisionSphere([0, 1.4, 0.2], 0.05);
        collision.mesh.visible = false;
        this.modes[this.modeIndeces.HairCard] = new HairCard();
        this.modes[this.modeIndeces.HairCard].initHairSystem(0, initPlanePos, this.options, null, [collision]);
        

        this.scene.add(collision.mesh);
        this.modes[this.modeIndeces.HairCard].addToScene(this.scene);
        this.modes[this.modeIndeces.HairCard].setVisible(this.currentModeIndex == this.modeIndeces.HairCard);
        this.modes[this.modeIndeces.HairCard].showControlHairs(this.options.showControlHairs);
    };

    initHead() {

        this.loaderGLB.load('./data/head.glb', (glb) => {
            let model = glb.scene;
            model.position.set(0, 0, 0);

            console.log(model);
            // hide hair
            model.getObjectByName("Hair").visible = false;

            //get head
            let head = model.getObjectByName("Body");

            if (this.currentModeIndex != this.modeIndeces.Head)
                head.visible = false;

            head.material.wireframe = true;
            head.material.depthTest = true; // Example value

            head.updateMatrixWorld(); // make sure the object's world matrix is up-to-date


            // init hair cards
            //let indeces = [1500, 1510, 662, 1544, 631];
            let indeces = [1500, 1510, 662, 1544, 631, 634, 660, 659,652, 644, 678, 641, 1540,1524, 1536, 611, 600, 658, 1536, 1533, 604, 621, 497, 648, 1530, 2546, 1535, 1389, 1528, 1555];
            let pos = [0, 0, 0];
            this.modes[this.modeIndeces.Head] = new Head(head, indeces, this.options, pos);

            //init collision spheres
            let radius = [0.082, 0.045];
            let posSphere = [[0,1.585,0.01], [0,1.47, 0]];

            for(let i = 0; i < radius.length; i++)
                this.modes[this.modeIndeces.Head].addCollisionsSphere(posSphere[i], radius[i])


            this.modes[this.modeIndeces.Head].addToScene(this.scene);
            this.modes[this.modeIndeces.Head].setVisible(this.currentModeIndex == this.modeIndeces.Head);
            this.modes[this.modeIndeces.Head].showControlHairs(this.options.showControlHairs);
            this.modes[this.modeIndeces.Head].showCollisionSpheres(this.currentModeIndex == this.modeIndeces.Head && this.options.showCollisionSpheres);

            
        });
    }

    set() {
        let model = this.modes[this.currentModeIndex];

        if (!this.currentModeIndex == this.options.mode || !model)
            return;

        model.setParams(this.options);

    };

    restart() {
        let model = this.modes[this.currentModeIndex];

        if (!this.currentModeIndex == this.options.mode || !model)
            return;

        model.restart(this.options);

    };

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {

        requestAnimationFrame(this.animate.bind(this));

        let delta = this.clock.getDelta();
        if (delta > 0.05)
            delta = 0.05;
        this.accumulator += delta;

        while (this.accumulator >= this.dt) {
            this.update(this.dt);
            this.accumulator -= this.dt;
        }


        this.renderer.render(this.scene, this.camera);
    }

    update(delta) {

        if (this.currentModeIndex == this.modeIndeces.MassSpring && this.modes[this.modeIndeces.MassSpring]) {
            this.modes[this.modeIndeces.MassSpring].update(delta);
            this.updateSystemPosition(delta)
        }


        if (this.currentModeIndex == this.modeIndeces.HairCard && this.modes[this.modeIndeces.HairCard]) {
            this.modes[this.modeIndeces.HairCard].updateHairCardSystem(delta);
            this.updatePositionCard(delta);
        }


        else if (this.currentModeIndex == this.modeIndeces.Head && this.modes[this.modeIndeces.Head]) {

            if (this.options.applyPhysics) {
                this.modes[this.modeIndeces.Head].updateSystem(delta);
                this.updatePosition(delta);
            }
        }

    };



    updateMode() {

        // hide previous mode 
        if (this.currentModeIndex == this.modeIndeces.MassSpring)
            this.modes[this.modeIndeces.MassSpring].setVisible(false);

        else if (this.currentModeIndex == this.modeIndeces.HairCard) {
            this.modes[this.modeIndeces.HairCard].setVisible(false);
            this.modes[this.modeIndeces.HairCard].showControlHairs(false);
            let spheres = this.modes[this.modeIndeces.HairCard].system.collisionSpheres;
            for (let i = 0; i < spheres.length; i++)
                spheres[i].setVisible(false);

        }

        else if (this.currentModeIndex == this.modeIndeces.Head) {
            this.modes[this.modeIndeces.Head].setVisible(false);
            this.modes[this.modeIndeces.Head].showControlHairs(false);
            this.modes[this.modeIndeces.Head].showCollisionSpheres(false);
        }


        // show new mode 
        if (this.options.mode == this.modeIndeces.MassSpring)
            this.modes[this.modeIndeces.MassSpring].setVisible(true);

        else if (this.options.mode == this.modeIndeces.HairCard) {
            this.modes[this.modeIndeces.HairCard].setVisible(true);
            this.modes[this.modeIndeces.HairCard].showControlHairs(this.options.showControlHairs);
            let spheres = this.modes[this.modeIndeces.HairCard].system.collisionSpheres;
            for (let i = 0; i < spheres.length; i++)
                spheres[i].setVisible(this.options.showCollisionSpheres);

        }

        else if (this.options.mode == this.modeIndeces.Head) {
            this.modes[this.modeIndeces.Head].setVisible(true);
            this.modes[this.modeIndeces.Head].showControlHairs(this.options.showControlHairs);
            this.modes[this.modeIndeces.Head].showCollisionSpheres(this.options.showCollisionSpheres);

        }

        this.currentModeIndex = this.options.mode;
    }

    updatePosition(delta) {  // TODO put it in model?
        let model = this.modes[this.currentModeIndex];
        if (model == null)
            return;

        let tt = delta * 0.2;
        if (this.isKeyQ) {
            model.moveSkull(0, tt, 0);
        }
        if (this.isKeyE) {
            model.moveSkull(0, - tt, 0);
        }
        if (this.isKeyA) {
            model.moveSkull(- tt, 0, 0);
        }
        if (this.isKeyD) {
            model.moveSkull( tt, 0, 0);
        }
        if (this.isKeyS) {
            model.moveSkull(0, 0, tt);
        }
        if (this.isKeyW) {
            model.moveSkull(0, 0, - tt);
        }
        if (this.isSpace) {
            model.rotateSkull(delta * 1.5);
        }

    }

    updatePositionCard(delta) {
        let model = this.currentModeIndex == this.modeIndeces.HairCard ? this.modes[this.modeIndeces.HairCard] : null;
        if (model == null)
        return;

        let position = model.system.particles[0].position;
        let tt = delta * 0.2;
        if (this.isKeyQ) {
            model.setPosition(position[0], position[1] + tt, position[2]);
        }
        if (this.isKeyE) {
            model.setPosition(position[0], position[1] - tt, position[2]);
        }
        if (this.isKeyW) {
            model.setPosition(position[0], position[1], position[2] - tt);
        }
        if (this.isKeyS) {
            model.setPosition(position[0], position[1], position[2] + tt);
        }
        if (this.isKeyA) {
            model.setPosition(position[0] - tt, position[1], position[2]);
        }
        if (this.isKeyD) {
            model.setPosition(position[0] + tt, position[1], position[2]);
        }

        if (this.isSpace) {
            this.modes[this.modeIndeces.HairCard].rotateCard(delta);
        }
    }

    updateSystemPosition(delta) {
        let model = this.currentModeIndex == this.modeIndeces.MassSpring ? this.modes[this.modeIndeces.MassSpring] : null;
        if (model == null)
            return;

        let position = model.particles[0].position;
        let tt = delta * 0.2;
        if (this.isKeyQ) {
            model.setAnchor(position.x, position.y + tt, position.z);
        }
        if (this.isKeyE) {
            model.setAnchor(position.x, position.y - tt, position.z);
        }
        if (this.isKeyW) {
            model.setAnchor(position.x, position.y, position.z - tt);
        }
        if (this.isKeyS) {
            model.setAnchor(position.x, position.y, position.z + tt);
        }
        if (this.isKeyA) {
            model.setAnchor(position.x - tt, position.y, position.z);
        }
        if (this.isKeyD) {
            model.setAnchor(position.x + tt, position.y, position.z);
        }

    }

}