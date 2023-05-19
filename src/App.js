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
        document.onkeydown = (e) => { this.setKeyEvent(e, true); };

        document.onkeyup = (e) => { this.setKeyEvent(e, false); }

        this.modeIndeces = {
            MassSpring: 0,
            Plane: 1,
            //Skull: 2,
            Head: 3
        }

        this.currentModeIndex = this.modeIndeces.Head;

        this.modes = [];

        // init gui
        this.options = {
            damping: 100,
            k: 800,
            gravity: -9.98,
            mass: 1.5,
            set: () => { this.set() },
            restart: () => { this.restart() },
            mode: this.currentModeIndex,
            showControlHairs: false,
            applyPhysics: true,
        };

        let gui = new GUI().title('Evaluate Dataset Options');
        gui.add(this.options, 'mode', this.modeIndeces).name('Mode');
        gui.add(this.options, 'damping', 0, 1000).name('Damping');
        gui.add(this.options, 'k', 0, 1000).name('K');
        gui.add(this.options, 'gravity', -100, 0).name('Gravity');
        gui.add(this.options, 'mass', 0, 100).name('Mass');
        gui.add(this.options, 'showControlHairs').name('Show Control Hairs');
        gui.add(this.options, 'applyPhysics').name('Apply Physics');

        gui.add(this.options, 'set').name('Set params');
        gui.add(this.options, 'restart').name('Restart demo');

        gui.onChange(event => {
            if (event.property === 'showControlHairs') {
                if (this.currentModeIndex == this.modeIndeces.MassSpring)
                    return;

                this.modes[this.currentModeIndex].showControlHairs(event.value);
            }
        })

        // init models
        this.initOnlyMassSpringSystem();

        this.initOnlyOnePlaneSytem();

        //this.initSkullSystem();

        this.initHead();

        console.log(this.scene);

        // Start loop
        this.animate();
    };

    setKeyEvent(e, bool) {
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


    set() {
        if (this.currentModeIndex == this.options.mode) {

            if (this.options.mode == this.modeIndeces.MassSpring) {
                this.modes[this.modeIndeces.MassSpring].setParams(this.options);
            }

            else if (this.options.mode == this.modeIndeces.Plane) {
                this.modes[this.modeIndeces.Plane].system.setParams(this.options);
            }

            //else if (this.options.mode == this.modeIndeces.Skull || this.options.mode == this.modeIndeces.Head) {
            else if (this.options.mode == this.modeIndeces.Head) {

                //let model = this.options.mode == this.modeIndeces.Skull ? this.modes[this.modeIndeces.Skull] : this.modes[this.modeIndeces.Head];
                let model = this.modes[this.modeIndeces.Head];
                for (let i = 0; i < model.hairCards.length; i++) {
                    model.hairCards[i].system.setParams(this.options);
                }

            }

        }
    };

    restart() {
        if (this.options.mode == this.modeIndeces.MassSpring) {
            this.modes[this.modeIndeces.MassSpring].setParams(this.options);
            this.modes[this.modeIndeces.MassSpring].restart();
        }

        else if (this.options.mode == this.modeIndeces.Plane) {
            this.modes[this.modeIndeces.Plane].restart(this.options, new THREE.Vector3(0, 1.5, 0));
        }


        //else if (this.options.mode == this.modeIndeces.Head) {
        else if (this.options.mode == this.modeIndeces.Skull || this.options.mode == this.modeIndeces.Head) {
            //let model = this.options.mode == this.modeIndeces.Skull ? this.modes[this.modeIndeces.Skull] : this.modes[this.modeIndeces.Head];
            this.modes[this.modeIndeces.Head].model.restart(this.options);
        }


    };



    /*
    createHairCard() {
        const cardGeometry = new THREE.PlaneGeometry(0.05, 0.1, 1, 4);
        //const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/data/Strand4RGB.png');
        const aTexture = textureLoader.load('/data/Strand4A.png');
        let cardMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture });
        let cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        cardMesh.frustumCulled = false;
        cardMaterial.transparent = true;
        
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
    */

    initOnlyMassSpringSystem() {
        var length = 4;
        this.modes[this.modeIndeces.MassSpring] = new MultipleSpringMassSystem(length, this.options);
        for (var i = 0; i < length; i++) {
            this.scene.add(this.modes[this.modeIndeces.MassSpring].particles[i]);
            if (i > 0) {
                this.scene.add(this.modes[this.modeIndeces.MassSpring].lines[i]);
            }
        }

        this.modes[this.modeIndeces.MassSpring].setVisible(false);


    };

    initOnlyOnePlaneSytem() {

        this.modes[this.modeIndeces.Plane] = new entitySystem(null, null, null);
        this.modes[this.modeIndeces.Plane].initHairSystem(0, new THREE.Vector3(0, 1.5, 0), this.options);
        this.modes[this.modeIndeces.Plane].mesh.rotateX(-1);
        this.modes[this.modeIndeces.Plane].mesh.updateMatrixWorld();

        this.modes[this.modeIndeces.Plane].addToScene(this.scene);
        this.modes[this.modeIndeces.Plane].setVisible(this.currentModeIndex == this.modeIndeces.Plane);
        this.modes[this.modeIndeces.Plane].showControlHairs(this.options.showControlHairs);
    };


    /*
    initSkullSystem() {
        const geometry = new THREE.SphereGeometry(0.1, 32, 16);
        const material = new THREE.PointsMaterial({ size: 0.01, color: 'purple' });
        const sphere = new THREE.Points(geometry, material);

        let indeces = [200, 210, 220, 230, 240, 250, 260, 270, 280];
        this.modes[this.modeIndeces.Skull] = new skullSystem(sphere, indeces, this.options, [0, 1.3, 0]);

        this.modes[this.modeIndeces.Skull].addToScene(this.scene);
        this.modes[this.modeIndeces.Skull].setVisible(this.currentModeIndex == this.modeIndeces.Skull);
        this.modes[this.modeIndeces.Skull].showControlHairs(this.options.showControlHairs);

    }
    */

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

            let indeces = [1500, 1510, 662, 1544, 631];
            let pos = [0, 0, 0];
            this.modes[this.modeIndeces.Head] = new skullSystem(head, indeces, this.options, pos);
            this.modes[this.modeIndeces.Head].addToScene(this.scene);
            this.modes[this.modeIndeces.Head].setVisible(this.currentModeIndex == this.modeIndeces.Head);
            this.modes[this.modeIndeces.Head].showControlHairs(this.options.showControlHairs);

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

        if (this.currentModeIndex != this.options.mode)
            this.updateMode();


        if (this.currentModeIndex == this.modeIndeces.MassSpring && this.modes[this.modeIndeces.MassSpring]) {
            this.modes[this.modeIndeces.MassSpring].update(delta);
        }


        if (this.currentModeIndex == this.modeIndeces.Plane && this.modes[this.modeIndeces.Plane]) {
            this.modes[this.modeIndeces.Plane].updateHairCardSystem(delta);
            this.updatePositionCard(delta);

        }


        //else if (this.currentModeIndex == this.modeIndeces.Skull || this.currentModeIndex == this.modeIndeces.Head) {
        else if (this.options.mode == this.modeIndeces.Skull || this.options.mode == this.modeIndeces.Head) {

            //let model = this.currentModeIndex == this.modeIndeces.Skull ? this.modes[this.modeIndeces.Skull] : this.modes[this.modeIndeces.Head];
            let model = this.modes[this.modeIndeces.Head];
            if (!model)
                return;

            if (this.options.applyPhysics) {
                model.updateSystem(delta);
                this.updatePosition(delta);
            }


        }

    };



    updateMode() {

        // hide previous mode 
        if (this.currentModeIndex == this.modeIndeces.MassSpring)
            this.modes[this.modeIndeces.MassSpring].setVisible(false);

        else if (this.currentModeIndex == this.modeIndeces.Plane) {
            this.modes[this.modeIndeces.Plane].setVisible(false);
            this.modes[this.modeIndeces.Plane].showControlHairs(false);
        }

        /*
        else if (this.currentModeIndex == this.modeIndeces.Skull)
        {
            this.modes[this.modeIndeces.Skull].setVisible(false);
            this.modes[this.modeIndeces.Skull].showControlHairs(false);
        }
        */

        else if (this.currentModeIndex == this.modeIndeces.Head) {
            this.modes[this.modeIndeces.Head].setVisible(false);
            this.modes[this.modeIndeces.Head].showControlHairs(false);
        }


        // show new mode 
        if (this.options.mode == this.modeIndeces.MassSpring)
            this.modes[this.modeIndeces.MassSpring].setVisible(true);

        else if (this.options.mode == this.modeIndeces.Plane) {
            this.modes[this.modeIndeces.Plane].setVisible(true);
            this.modes[this.modeIndeces.Plane].showControlHairs(this.options.showControlHairs);
        }

        /*
        else if (this.options.mode == this.modeIndeces.Skull)
        {
            this.modes[this.modeIndeces.Skull].setVisible(true);
            this.modes[this.modeIndeces.Skull].showControlHairs(this.options.showControlHairs);
        }
        */

        else if (this.options.mode == this.modeIndeces.Head) {
            this.modes[this.modeIndeces.Head].setVisible(true);
            this.modes[this.modeIndeces.Head].showControlHairs(this.options.showControlHairs);
        }

        this.currentModeIndex = this.options.mode;
    }

    updatePosition(delta) {  // TODO put it in model?
        //let model = this.currentModeIndex == this.modeIndeces.Skull ? this.modes[this.modeIndeces.Skull] : (this.currentModeIndex == this.modeIndeces.Head ? this.modes[this.modeIndeces.Head] : null) ;
        let model = this.modes[this.currentModeIndex];
        if (model == null)
            return;

        let tt = delta * 0.2;
        if (this.isKeyQ) {
            let position = model.skull.position;
            model.moveSkull(position.x, position.y + tt, position.z);
        }
        if (this.isKeyE) {
            let position = model.skull.position;
            model.moveSkull(position.x, position.y - tt, position.z);
        }
        if (this.isKeyA) {
            let position = model.skull.position;
            model.moveSkull(position.x - tt, position.y, position.z);
        }
        if (this.isKeyD) {
            let position = model.skull.position;
            model.moveSkull(position.x + tt, position.y, position.z);
        }
        if (this.isKeyS) {
            let position = model.skull.position;
            model.moveSkull(position.x, position.y, position.z + tt);
        }
        if (this.isKeyW) {
            let position = model.skull.position;
            model.moveSkull(position.x, position.y, position.z - tt);
        }
        if (this.isSpace) {
            model.rotateSkull(delta * 1.5);
        }

    }

    updatePositionCard(delta) {
        let model = this.currentModeIndex == this.modeIndeces.Plane ? this.modes[this.modeIndeces.Plane] : null;

        let tt = delta * 0.2;
        if (this.isKeyW) {
            let position = model.system.particles[0].position;
            model.setPosition(position[0], position[1] + tt, position[2]);
        }
        if (this.isKeyS) {
            let position = model.system.particles[0].position;
            model.setPosition(position[0], position[1] - tt, position[2]);
        }
        if (this.isKeyA) {
            let position = model.system.particles[0].position;
            model.setPosition(position[0] - tt, position[1], position[2]);
        }
        if (this.isKeyD) {
            let position = model.system.particles[0].position;
            model.setPosition(position[0] + tt, position[1], position[2]);
        }

        if (this.isSpace) {
            this.modes[this.modeIndeces.Plane].rotateCard(delta);
        }
    }

}