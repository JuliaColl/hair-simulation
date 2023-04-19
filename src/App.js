import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

import { SpringMassSystem1D, SpringMassSystem2D, MultipleSpringMassSystem, ParticleSystemFromCard } from './SpringMassSystem.js';

//only one can be true
const onlyMassSpringSystem = false;
const onePlane = false;


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

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // init gui
        this.modes = {
            MassSpring: 0,
            Plane: 1,
            MultiPlane: 2,
            Skull: 3
        }

        this.currentMode = this.modes.Skull;

        this.options = {
            damping: 100,
            k: 800,
            gravity: -9.98,
            mass: 20,
            //set: () => { this.set() },
            restart: () => { this.restart() },
            mode: this.currentMode
        };



        let gui = new GUI().title('Evaluate Dataset Options');
        gui.add(this.options, 'mode', this.modes).name('Mode');
        gui.add(this.options, 'damping', 0, 1000).name('Damping');
        gui.add(this.options, 'k', 0, 1000).name('K');
        gui.add(this.options, 'gravity', -100, 0).name('Gravity');
        gui.add(this.options, 'mass', 0, 100).name('Mass');
        // gui.add(this.options, 'set').name('Set params');
        gui.add(this.options, 'restart').name('Restart demo');


        // init models
        if (this.currentMode == this.modes.MassSpring) {
            this.initOnlyMassSpringSystem();
        }

        else if (this.currentMode == this.modes.Plane) {
            this.initOnlyOnePlaneSytem();
        }

        else if (this.currentMode == this.modes.MultiPlane) {
            this.initMultiPlaneSytem();
        }
        else if (this.currentMode == this.modes.Skull) {
            const geometry = new THREE.SphereGeometry(1, 32, 16);
            const material = new THREE.PointsMaterial({size: 0.1, color: 'purple' });
            const sphere = new THREE.Points(geometry, material);
            sphere.position.set(0, 2, 0);
            sphere.frustumCulled = false;
            sphere.updateMatrixWorld();


            let position = sphere.geometry.getAttribute('position')
            //position.setY(100, position.getY(100) + 1);
            //position.setY(110, position.getY(110) + 1);

            let plane = this.createHairCard();
            let {system, initWPos} = this.loadParticleSystemFromCard(plane);

            let vertex = new THREE.Vector3();

            vertex.fromBufferAttribute(position, 100);
            let worldPos = sphere.localToWorld(vertex);

            system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);

            this.scene.add(sphere);
            this.scene.add(plane);

            this.plane = plane;
            this.system = system;

        }

        console.log(this.scene)

        // this.loaderGLB.load('./data/hair-card-vertex.glb', (glb) => {
        //     this.model = glb.scene;
        //     this.scene.add(this.model);
        //     console.log(this.model.children[0].geometry);
        //     let position = this.model.children[0].geometry.getAttribute('position')

        //     // position.setY(10, position.getY(10) + 1);
        //     //position.setY(11, position.getY(11) + 1);

        //     //position.setY(20, position.getY(20) + 1);
        //     //position.setY(21, position.getY(21) + 1);

        //     //position.setY(0, position.getY(0) + 1);

        //     //position.setY(2, position.getY(2) + 1);
        //     //position.setY(1, position.getY(1) + 1);

        //     //position.setY(1, position.getY(1) + 1);
        //     //position.setY(2, position.getY(2) + 1);
        //     //position.setY(3, position.getY(3) + 1);


        //     //.particleSystem = new ParticleSystemFromCard(position);
        //     //console.log(this.particleSystem)
        // });


        // Start loop
        this.animate();
    };

    /*
    set() {
        if (this.options.mode == this.modes.Plane) {
            this.particleSystem.setParams(this.options)
        }
    };
    */

    restart() {
        if (this.currentMode == this.options.mode) {  //same mode only upfate params of the scene
            if (this.options.mode == this.modes.MassSpring) {
                this.particleSystem.setParams(this.options);
                this.particleSystem.restart();

            }

            if (this.options.mode == this.modes.Plane) {
                // CHECK: should I detete first the old particle system? 
                this.particleSystem = new ParticleSystemFromCard(this.initWPos, this.options);
            }

            else if (this.options.mode == this.modes.MultiPlane) {
                for (let i = 0; i < this.hairCards.length; i++) {
                    this.hairCards[i].system = new ParticleSystemFromCard(this.hairCards[i].initWPos, this.options);
                }
            }
        }

        else {
            // clear scene
            for (let i = this.scene.children.length - 1; i >= 0; i--) {
                let child = this.scene.children[i]

                if (child.type === 'Mesh' || child.type === 'Line')  // check if the child is a mesh
                    this.scene.remove(child)
            }

            if (this.options.mode == this.modes.MassSpring) {
                this.initOnlyMassSpringSystem();
            }

            else if (this.options.mode == this.modes.Plane) {
                this.initOnlyOnePlaneSytem();
            }

            else if (this.options.mode == this.modes.MultiPlane) {
                this.initMultiPlaneSytem();
            }

            this.currentMode = this.options.mode;
        }

    };

    createHairCard() {
        const cardGeometry = new THREE.PlaneGeometry(0.5, 1, 1, 4);
        const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        let cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        cardMesh.frustumCulled = false;

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

    };

    loadParticleSystemFromCard(mesh){
        let position = mesh.geometry.getAttribute('position')
        let initWPos = [];
        // change to world position
        for (let i = 0; i < position.count; i++) {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            initWPos.push(mesh.localToWorld(vertex));
        }

        return {system: new ParticleSystemFromCard(initWPos, this.options), initWPos: initWPos};
    }

    initOnlyOnePlaneSytem() {
        this.cardMesh = this.createHairCard();
        
        this.cardMesh.position.set(0, 2, 0);
        //this.cardMesh.rotateY(0.75);
        this.cardMesh.rotateX(-1);
        //this.cardMesh.rotateZ(0);
        this.cardMesh.updateMatrixWorld();

        // Add the mesh to the scene
        this.scene.add(this.cardMesh);

        ({system: this.particleSystem, initWPos: this.initWPos} = this.loadParticleSystemFromCard(this.cardMesh));

        console.log(this.particleSystem)

    };

    initMultiPlaneSytem() {
        let numOfHairCards = 7;
        for (let i = 0; i < numOfHairCards; i++) {
            
            let cardMesh = this.createHairCard();

            // Set the position of the mesh to be at the origin
            cardMesh.position.set(-numOfHairCards / 2 + i, 2, 0);
            cardMesh.rotateX(-1);
            cardMesh.updateMatrixWorld();
           
            let {system, initWPos} = this.loadParticleSystemFromCard(cardMesh);
            // Add the mesh to the scene
            this.scene.add(cardMesh);
            this.hairCards.push({ mesh: cardMesh, system: system, initWPos: initWPos });
        }
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
        if (this.currentMode == this.modes.MassSpring && this.particleSystem) {
            this.particleSystem.update(delta);
        }


        if (this.currentMode == this.modes.Plane && this.particleSystem && this.cardMesh) {
            this.updateHairCard(delta, { mesh: this.cardMesh, system: this.particleSystem });
        }

        else if (this.currentMode == this.modes.MultiPlane) {
            for (let i = 0; i < this.hairCards.length; i++) {
                this.updateHairCard(delta, this.hairCards[i]);
            }
        }

        else if (this.currentMode == this.modes.Skull){
            this.updateHairCard(delta, { mesh: this.plane, system: this.system });
        }

        if (false) {

            //if (this.particleSystem && this.model) {
            const position = this.model.children[0].geometry.getAttribute('position');
            //position.setY(0, position.getY(0) + 0.1);
            this.particleSystem.update(delta);

            for (var i = 0; i < this.particleSystem.particles.length; i++) {
                // Access the geometry data of the model
                //const position = this.cardMesh.geometry.getAttribute('position');
                const position = this.model.children[0].geometry.getAttribute('position');

                const particle = this.particleSystem.particles[i];

                const vertexIndex = particle.index;
                const newX = particle.position[0];
                const newY = particle.position[1];
                const newZ = particle.position[2];

                position.setXYZ(vertexIndex, newX, newY, newZ);
                position.setXYZ(vertexIndex + 1, newX + particle.offset[0], newY + particle.offset[1], newZ + particle.offset[2]);

            }
            position.needsUpdate = true;


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

            position.setXYZ(vertexIndex, lPos.x, lPos.y, lPos.z);
            position.setXYZ(vertexIndex + 1, lPos.x + particle.offset[0], lPos.y + particle.offset[1], lPos.z + particle.offset[2]);
            position.needsUpdate = true;

        }
    }

}