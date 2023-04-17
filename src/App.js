import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

import { SpringMassSystem1D, SpringMassSystem2D, MultipleSpringMassSystem, ParticleSystemFromCard } from './SpringMassSystem.js';

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

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // init gui
        this.options = {
            damping: 100,
            k: 800,
            gravity: -9.98,
            mass: 20,
            set: () => {this.set()},
            restart: () => {this.restart()}
        };
        let gui = new GUI().title('Evaluate Dataset Options');
        gui.add(this.options, 'damping', 0, 1000).name('Damping');
        gui.add(this.options, 'k', 0, 1000).name('K');
        gui.add(this.options, 'gravity', -100, 0).name('Gravity');
        gui.add(this.options, 'mass', 0, 100).name('Mass');
        gui.add( this.options, 'set' ).name('Set params');; 
        gui.add( this.options, 'restart' ).name('Restart demo');; 


        /*
        this.loaderGLB.load('./data/hair-card-white.glb', (glb) => {
            this.model = glb.scene;
            this.scene.add(this.model);

        });
        */

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


        this.createHairCard();
        //this.cardMesh.rotateY(0.75);
        this.cardMesh.rotateX(-1);
        //this.cardMesh.rotateZ(0);
        this.cardMesh.updateMatrixWorld();


        let position = this.cardMesh.geometry.getAttribute('position')
        this.initWPos = [];
        // change to world
        for(let i = 0; i < position.count; i++) {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute( position, i );
            this.initWPos.push( this.cardMesh.localToWorld(vertex) );
        }

        this.particleSystem = new ParticleSystemFromCard(this.initWPos, this.options);
        console.log(this.particleSystem)


        /*
        //let numOfVertices = position.count;
        //var length = numOfVertices/2;
        var length = 4;
        this.system = new MultipleSpringMassSystem(length);
        //scene.add(system.anchor);
        for (var i = 0; i < length; i++) {
            this.scene.add(this.system.particles[i]);
            if(i > 0){
                this.scene.add(this.system.lines[i]);
            }

        }
        */


        //this.createHairCone();
        // Start loop
        this.animate();
    };

    set(){
        this.particleSystem.setParams(this.options)
    };

    restart(){
        // CHECK: should I detete first the old particle system? 
        this.particleSystem = new ParticleSystemFromCard(this.initWPos, this.options);

    };

    createHairCard() {
        // Create a plane geometry with width of 0.5 units and height of 1 unit
        const cardGeometry = new THREE.PlaneGeometry(0.5, 1, 1, 4);
        console.log(cardGeometry)
        // Create a basic material with a color and no textures
        const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        // Create a mesh by combining the geometry and material
        this.cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        this.cardMesh.frustumCulled = false;

        // Set the position of the mesh to be at the origin
        this.cardMesh.position.set(0, 2, 0);

        // Add the mesh to the scene
        this.scene.add(this.cardMesh);
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
        if( delta > 0.25)
            delta = 0.25;
        this.accumulator += delta;

        while(this.accumulator >= this.dt){
            this.update(this.dt);
            this.accumulator -= this.dt;
        }


        this.renderer.render(this.scene, this.camera);
    }

    update(delta) {
        if (this.system) {
            this.system.update(delta);
        }

        if (false) {

        //if (this.particleSystem && this.model) {
            const position = this.model.children[0].geometry.getAttribute('position');
            //position.setY(0, position.getY(0) + 0.1);
            this.particleSystem.update(delta);

            for (var i = 0; i < this.particleSystem.particles.length; i++){
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

        if (this.particleSystem && this.cardMesh){
            this.particleSystem.update(delta);
            //console.log(this.particleSystem.particles[1])
            for (var i = 0; i < this.particleSystem.particles.length; i++){
                // Access the geometry data of the model
                const position = this.cardMesh.geometry.getAttribute('position');
                const particle = this.particleSystem.particles[i];

                const vertexIndex = particle.index;
                let aux = new THREE.Vector3(particle.position[0],  particle.position[1],  particle.position[2]);
                let lPos = this.cardMesh.worldToLocal(aux);

                // const newX = particle.position[0];
                // const newY = particle.position[1];
                // const newZ = particle.position[2];

                //position.set(pos,);

                position.setXYZ(vertexIndex, lPos.x, lPos.y, lPos.z);
                position.setXYZ(vertexIndex + 1, lPos.x + particle.offset[0], lPos.y + particle.offset[1], lPos.z + particle.offset[2]);
                position.needsUpdate = true;

            }


        }

    }

}