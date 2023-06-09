import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js';

import { SpringMassSystem1D, SpringMassSystem2D, MultipleSpringMassSystem, MassSpringHairCardSystem, modes } from './SpringMassSystem.js';
import { Head, HairCard, CollisionSphere, materials } from './model.js'
import { InputManager } from './input.js';


let initPlanePos = new THREE.Vector3(0, 1.5, 0);

export class App {

    constructor() {

        this.clock = new THREE.Clock();
        this.loaderGLB = new GLTFLoader();
        this.mousePos = new THREE.Vector2();

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
        this.controls.maxDistance = 3;
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


        // Add text information
        let info = document.createElement('div');
        info.innerHTML = "Use w,a,s,d,q,e keys to move";
        let info2 = document.createElement('div');
        info2.innerHTML = "Use space bar to rotate";
        this.info3 = document.createElement('div');

        info.style.fontFamily = info2.style.fontFamily = this.info3.style.fontFamily = "sans-serif";
        info.style.color = info2.style.color = this.info3.style.color = "white";
        info.style.position = info2.style.position = this.info3.style.position = 'absolute';
        info.style.top = 70 + 'px';
        info.style.left = info2.style.left = this.info3.style.left = 40 + 'px';
        info2.style.top = 95 + 'px';
        this.info3.style.top = 75 + 'px';
        info2.style.fontSize = this.info3.style.fontSize = "small";

        document.body.appendChild(info);
        document.body.appendChild(info2);
        document.body.appendChild(this.info3);

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('click', this.onClick);
        document.onkeydown = (e) => { InputManager.onKey(e, true); };
        document.onkeyup = (e) => { InputManager.onKey(e, false); }

        // add stats 
        this.stats = new Stats()
        document.body.appendChild(this.stats.dom)


        // modes
        this.modeIndeces = {
            MassSpring: 0,
            HairCard: 1,
            //Skull: 2,
            Head: 3
        }

        this.currentModeIndex = this.modeIndeces.Head;
        //this.currentSystemMode = modes.inextensible;

        this.modes = [];

        // init gui
        this.options = {
            damping: 3,
            k: 100,
            gravity: -10.0,
            mass: 0.02,
            d: 0.01,
            materialType: materials.texturedMaterial,
            set: () => { this.set() },
            restart: () => { this.restart() },
            create: () => { this.createNewDemo()},
            mode: this.currentModeIndex,
            systemMode: modes.inextensible,
            showControlHairs: false,
            showParticles: false,
            showCollisionSpheres: true,
            showHairCards: true,
            applyPhysics: false,
            wareframe: true
        };

        this.gui = new GUI().title('Simulation Parameters');
        this.gui.add(this.options, 'mode', this.modeIndeces).name('Mode');
        this.gui.add(this.options, 'systemMode', modes).name('System Mode');
        this.gui.add(this.options, 'damping', 0.01, 150).name('Damping');
        this.gui.add(this.options, 'k', 0.01, 1000).name('K');
        this.gui.add(this.options, 'gravity', -100, 0).name('Gravity');
        this.gui.add(this.options, 'mass', 0.0001, 1).name('Mass');
        this.gui.add(this.options, 'd', 0.001, 0.3).name('Particle Distance');
        this.gui.add(this.options, 'applyPhysics').name('Apply Physics');

        this.gui.onChange(this.onGUI);

        let folder = this.gui.addFolder('Visibility');

        this.gui.add(this.options, 'set').name('Set params');
        this.gui.add(this.options, 'restart').name('Restart demo');
        this.gui.add(this.options, 'create').name('Create new demo');

        folder.add(this.options, 'showControlHairs').name('Show Control Hairs');
        folder.add(this.options, 'showParticles').name('Show Particles');
        folder.add(this.options, 'showHairCards').name('Show Hair Cards');
        folder.add(this.options, 'showCollisionSpheres').name('Show Collision Spheres'); 
        folder.add(this.options, 'wareframe').name('Wareframe'); 
        folder.add(this.options, 'materialType', materials).name('Hair Cards Material');

        folder.show(this.modeIndeces.MassSpring != this.options.mode);
        


        // init gui new demo
        this.guiCreate = new GUI().title('New Simulation Parameters');
        this.guiCreateOptions = {
            damping: 3,
            k: 100,
            gravity: -10.0,
            mass: 0.02,
            d: 0.01,
            numberParticles: 5,
            planeA: 0,
            planeB: 1.2,
            planeC: -1,
            planeD: 1.8855,
            start: () => { this.startNewDemo()},
        };

        this.guiCreate.add(this.guiCreateOptions, 'damping', 0.01, 150).name('Damping');
        this.guiCreate.add(this.guiCreateOptions, 'k', 0.01, 1000).name('K');
        this.guiCreate.add(this.guiCreateOptions, 'gravity', -100, 0).name('Gravity');
        this.guiCreate.add(this.guiCreateOptions, 'mass', 0.0001, 1).name('Mass');
        this.guiCreate.add(this.guiCreateOptions, 'd', 0.001, 0.3).name('Particle Distance');
        this.guiCreate.add(this.guiCreateOptions, 'numberParticles', 1, 50).name('Particles per hair card');
        this.guiCreate.show(false);

        let folderCreate = this.guiCreate.addFolder('Plane Equation');
        folderCreate.add(this.guiCreateOptions, 'planeA', -5, 5).name('A');
        folderCreate.add(this.guiCreateOptions, 'planeB', -5, 5).name('B');
        folderCreate.add(this.guiCreateOptions, 'planeC', -5, 5).name('C');
        folderCreate.add(this.guiCreateOptions, 'planeD', -5, 5).name('D');
        
        this.guiCreate.add(this.guiCreateOptions, 'start').name('Start demo');
        
        this.guiCreate.onChange(this.onCreateGUI);

        this.createPlane()
        this.updatePlane();
        this.isCreateDemo = false;

        //load textures and material
        HairCard.basicMaterial = new THREE.MeshPhongMaterial({ color: "brown", side: THREE.DoubleSide });
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./data/Strand4RGB.png');
        const aTexture = textureLoader.load('./data/Strand4A.png');
        HairCard.texturedMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture, alphaTest: 0.09, alphaToCoverage: false, transparent: true });
        //HairCard.texturedMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture });
        //HairCard.texturedMaterial.transparent = true;
        HairCard.currentMaterial = this.options.materialType;


        // init modes
        this.initOnlyMassSpringSystem();
        this.initOnlyOnePlaneSytem();
        this.initHead();

        console.log(this.scene);

        // Start loop
        this.animate();
    };

    
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

        if (event.property === 'showParticles') {
            if (this.currentModeIndex == this.modeIndeces.MassSpring)
                return;

            this.modes[this.currentModeIndex].showParticles(event.value);
        }

        if (event.property === 'showHairCards') {
            if (this.currentModeIndex == this.modeIndeces.MassSpring)
                return;

            this.modes[this.currentModeIndex].showHairCards(event.value);
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
            
            
            let controller = this.gui.controllers
            for(let i = 0; i < controller.length; i++)
            {
                if(controller[i].property === "d" )
                    controller[i].show(modes.inextensible == event.value);

            }
            //event.controller.show(modes.inextensible == event.value);

        }


        if (event.property === 'mode') {
            this.gui.folders[0].show(this.modeIndeces.MassSpring != event.value);
            this.updateMode();
            
            let controller = this.gui.controllers

            for(let i = 0; i < controller.length; i++)
            {
                if(controller[i].property === "wareframe" )
                    controller[i].show(event.value == this.modeIndeces.Head);

                if(controller[i].property === "create" )
                    controller[i].show(event.value == this.modeIndeces.Head);
            }

            /*
            let controller = this.gui.controllers
            for(let i = 0; i < controller.length; i++)
            {
                if(controller[i].property === "d" )
                    controller[i].show(modes.inextensible == event.value);

            }
            */
            
            
        }

        if (event.property === 'wareframe') 
            this.modes[this.modeIndeces.Head].skull.material.wireframe = event.value;

        if(event.property === 'materialType')
        {
            HairCard.currentMaterial = event.value;
            this.modes[this.currentModeIndex].updateMaterial();


        }
        if (event.property === 'applyPhysics' && this.currentModeIndex == this.modeIndeces.Head && this.modes[this.currentModeIndex]) {
            this.modes[this.currentModeIndex].updateHairCardsPos();
        }

    }

    onCreateGUI = (event) => {
        if (event.property === 'planeA' || event.property === 'planeB' || event.property === 'planeC' || event.property === 'planeD') {
            this.updatePlane();
        }
    }

    initOnlyMassSpringSystem() {
        var length = 6;
        this.modes[this.modeIndeces.MassSpring] = new MultipleSpringMassSystem(length, this.options);
        this.modes[this.modeIndeces.MassSpring].addToScene(this.scene);
        this.modes[this.modeIndeces.MassSpring].setVisible(this.currentModeIndex == this.modeIndeces.MassSpring);
    };

    initOnlyOnePlaneSytem() {

        let collision = new CollisionSphere([0, 1.4, 0.2], 0.05);
        collision.mesh.visible = this.currentModeIndex == this.modeIndeces.HairCard && this.options.showCollisionSpheres;

        //let collision2 = new CollisionSphere([0, 1.4, 0.3], 0.07);
        //collision2.mesh.visible = this.currentModeIndex == this.modeIndeces.HairCard && this.options.showCollisionSpheres;

        this.modes[this.modeIndeces.HairCard] = new HairCard();
        this.modes[this.modeIndeces.HairCard].initHairSystem(0, initPlanePos, this.options, null, [collision]); //, collision2]);
        

        this.scene.add(collision.mesh);
        //this.scene.add(collision2.mesh);

        this.modes[this.modeIndeces.HairCard].addToScene(this.scene);
        this.modes[this.modeIndeces.HairCard].setVisible(this.currentModeIndex == this.modeIndeces.HairCard);
        this.modes[this.modeIndeces.HairCard].showControlHairs(this.currentModeIndex == this.modeIndeces.HairCard && this.options.showControlHairs);
        this.modes[this.modeIndeces.HairCard].showParticles(this.currentModeIndex == this.modeIndeces.HairCard && this.options.showParticles);

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
            //let indeces = [1500, 1510, 662, 1544, 631, 634, 660, 659,652, 644, 678, 641, 1540,1524, 1536, 611, 600, 658, 1536, 1533, 604, 621, 497, 648, 1530, 2546, 1535, 1389, 1528, 1555];
            let pos = [0, 0, 0];
            let indeces = [];
            this.modes[this.modeIndeces.Head] = new Head(head, indeces, this.options, pos);

            let normal = new THREE.Vector3(this.guiCreateOptions.planeA,this.guiCreateOptions.planeB,this.guiCreateOptions.planeC)
            let D = this.guiCreateOptions.planeD;
            //this.createPlane(normal, D);

            this.modes[this.modeIndeces.Head].addHairCardsFromPlane(normal, D, this.options);

            //init collision spheres
            let radius = [0.082, 0.045, 0.063, 0.06];
            let posSphere = [[0,1.586,0.01], [0,1.47, 0], [0,1.593, 0.04], [0,1.525, 0.052]];

            //let radius = [0.06];
            //let posSphere = [[0,1.53, 0.052]];

            for(let i = 0; i < radius.length; i++)
                this.modes[this.modeIndeces.Head].addCollisionsSphere(posSphere[i], radius[i])


            this.modes[this.modeIndeces.Head].addToScene(this.scene);
            this.modes[this.modeIndeces.Head].setVisible(this.currentModeIndex == this.modeIndeces.Head);
            this.modes[this.modeIndeces.Head].showControlHairs(this.currentModeIndex == this.modeIndeces.Head && this.options.showControlHairs);
            this.modes[this.modeIndeces.Head].showCollisionSpheres(this.currentModeIndex == this.modeIndeces.Head && this.options.showCollisionSpheres);
            this.modes[this.modeIndeces.Head].showParticles(this.currentModeIndex == this.modeIndeces.HairCard && this.options.showParticles);
        });
    }

    createPlane(){
        let width = 0.5;
        let height = 0.5;
        const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
        //planeGeometry.lookAt(normal);
        //planeGeometry.translate(0, D/normal.y, 0);
        
        //const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        let material = new THREE.MeshStandardMaterial({ color: "red", side: THREE.DoubleSide});
        this.plane = new THREE.Mesh(planeGeometry, material);
        this.scene.add(this.plane);
        this.plane.visible = false;
    }

    updatePlane(){
        let normal = new THREE.Vector3(this.guiCreateOptions.planeA,this.guiCreateOptions.planeB,this.guiCreateOptions.planeC)
        let D = this.guiCreateOptions.planeD;
        this.plane.position.set(0,0,0);
        this.plane.lookAt(normal);
        this.plane.position.set(0, D/normal.y, 0);
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

    createNewDemo() {
        this.gui.show(false);
        this.guiCreate.show(true);

        this.modes[this.modeIndeces.Head].removeHairCards(this.scene);
        this.modes[this.modeIndeces.Head].showCollisionSpheres(false);
        this.modes[this.modeIndeces.Head].showParticles(false);
        this.modes[this.modeIndeces.Head].showControlHairs(false);

        this.modes[this.modeIndeces.Head].restart();

        this.plane.visible = true;
        this.isCreateDemo = true;

    }

    startNewDemo(){
        let normal = new THREE.Vector3(this.guiCreateOptions.planeA,this.guiCreateOptions.planeB,this.guiCreateOptions.planeC)
        let D = this.guiCreateOptions.planeD;

        this.modes[this.modeIndeces.Head].addHairCardsFromPlane(normal, D, this.guiCreateOptions, Math.ceil(this.guiCreateOptions.numberParticles));

        this.modes[this.modeIndeces.Head].addHairCardsToScene(this.scene);
        this.modes[this.modeIndeces.Head].showControlHairs(this.currentModeIndex == this.modeIndeces.Head && this.options.showControlHairs);
        this.modes[this.modeIndeces.Head].showCollisionSpheres(this.currentModeIndex == this.modeIndeces.Head && this.options.showCollisionSpheres);
        this.modes[this.modeIndeces.Head].showParticles(this.currentModeIndex == this.modeIndeces.HairCard && this.options.showParticles);

        this.options.damping =  this.guiCreateOptions.damping;
        this.options.k = this.guiCreateOptions.k;
        this.options.gravity =this.guiCreateOptions.gravity;
        this.options.mass = this.guiCreateOptions.mass;
        this.options.d = this.guiCreateOptions.d;

        this.set();

        let controllers = this.gui.controllers
        for(let i = 0; i < controllers.length; i++)
        {
            controllers[i].updateDisplay();
        }


        this.plane.visible = false;

        this.gui.show(true);
        this.guiCreate.show(false);
        this.isCreateDemo = false;

    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {

        requestAnimationFrame(this.animate.bind(this));

        let delta = this.clock.getDelta();
        if (delta > 0.03)
            delta = 0.03;
        this.accumulator += delta;

        while (this.accumulator >= this.dt) {
            this.update(this.dt);
            this.accumulator -= this.dt;
        }


        this.renderer.render(this.scene, this.camera);
        this.stats.update()

    }

    update(delta) {
        let model = this.modes[this.currentModeIndex];

        if (!model)
            return;

        if (this.options.applyPhysics &&  !this.isCreateDemo ) {
            model.update(delta);
        }
        else{
            if (this.currentModeIndex == this.modeIndeces.Head && this.modes[this.modeIndeces.Head] &&  !this.isCreateDemo)
                model.updateNoPhysics(delta)
        }
        

    };



    updateMode() {

        // hide previous mode 
        if (this.currentModeIndex == this.modeIndeces.MassSpring)
            this.modes[this.modeIndeces.MassSpring].setVisible(false);

        else if (this.currentModeIndex == this.modeIndeces.HairCard) {
            this.modes[this.modeIndeces.HairCard].setVisible(false);
            this.modes[this.modeIndeces.HairCard].showControlHairs(false);
            this.modes[this.modeIndeces.HairCard].showParticles(false);

            let spheres = this.modes[this.modeIndeces.HairCard].system.collisionSpheres;
            for (let i = 0; i < spheres.length; i++)
                spheres[i].setVisible(false);

        }

        else if (this.currentModeIndex == this.modeIndeces.Head) {
            this.modes[this.modeIndeces.Head].setVisible(false);
            this.modes[this.modeIndeces.Head].showControlHairs(false);
            this.modes[this.modeIndeces.Head].showParticles(false);
            this.modes[this.modeIndeces.Head].showCollisionSpheres(false);
        }


        // show new mode 
        if (this.options.mode == this.modeIndeces.MassSpring)
            this.modes[this.modeIndeces.MassSpring].setVisible(true);

        else if (this.options.mode == this.modeIndeces.HairCard) {
            this.modes[this.modeIndeces.HairCard].setVisible(true);
            this.modes[this.modeIndeces.HairCard].showControlHairs(this.options.showControlHairs);
            this.modes[this.modeIndeces.HairCard].showParticles(this.options.showParticles);
            let spheres = this.modes[this.modeIndeces.HairCard].system.collisionSpheres;
            for (let i = 0; i < spheres.length; i++)
                spheres[i].setVisible(this.options.showCollisionSpheres);

        }

        else if (this.options.mode == this.modeIndeces.Head) {
            this.modes[this.modeIndeces.Head].setVisible(true);
            this.modes[this.modeIndeces.Head].showControlHairs(this.options.showControlHairs);
            this.modes[this.modeIndeces.Head].showParticles(this.options.showParticles);
            this.modes[this.modeIndeces.Head].showCollisionSpheres(this.options.showCollisionSpheres);

        }

        this.currentModeIndex = this.options.mode;
    }

    

   
    

}