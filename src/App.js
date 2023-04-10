import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

import { SpringMassSystem1D, SpringMassSystem2D, MultipleSpringMassSystem } from './SpringMassSystem.js';

export class App {

    constructor() {

        this.clock = new THREE.Clock();
        this.loaderFBX = new FBXLoader();
        this.loaderGLB = new GLTFLoader();

        // main render attributes
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.controls = null;

        this.valid_extensions = ['fbx', 'glb', 'gltf'];
        this.dropEnable = true;
        this.options = {};
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

        /*
        // Add text information
        let info = document.createElement('div');
        info.innerHTML = "Drop your files on screen";
        let icon = document.createElement('i');
        icon.innerHTML = "<i class='bi bi-arrow-down-square'></i>"
        let info2 = document.createElement('div');
        info2.innerHTML = "Supported files: [ " + this.valid_extensions + " ]";
        this.info3 = document.createElement('div');
        
        info.style.fontFamily = info2.style.fontFamily = this.info3.style.fontFamily = "sans-serif";
        info.style.color = info2.style.color = this.info3.style.color = icon.style.color = "white";
        info.style.position = info2.style.position = this.info3.style.position = icon.style.position = 'absolute';
        info.style.top = icon.style.top = 30 + 'px';
        info.style.left = info2.style.left = this.info3.style.left = 40 + 'px';
        icon.style.left = 225 + 'px';
        info2.style.top = 55 + 'px';
        this.info3.style.top = 75 + 'px';
        info2.style.fontSize = this.info3.style.fontSize = "small";

        document.body.appendChild(info);
        document.body.appendChild(icon);
        document.body.appendChild(info2);
        document.body.appendChild(this.info3);
        */

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));

        /*
        canvas.ondragover = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        canvas.ondragend = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        canvas.ondrop = (e) => this.onDrop(e);

        let loadModal = document.getElementById("loading");
        loadModal.ondrop = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        loadModal.ondragover = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        loadModal.ondragend = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        */

        // init gui functions
        //this.options = {};


        
        var length = 5;
        this.system = new MultipleSpringMassSystem(length);
        //scene.add(system.anchor);
        for (var i = 0; i < length; i++) {
            this.scene.add(this.system.particles[i]);
            this.scene.add(this.system.lines[i]);
        }
        


        /*
        const radius = 0.1;
        const widthSegments = 16;
        const heightSegments = 16;

        const geometry = new THREE.SphereBufferGeometry(
            radius,
            widthSegments,
            heightSegments
        );

        //const material = new MeshBasicMaterial();
        const material = new THREE.MeshBasicMaterial({ color: 'purple' });

        this.particle = new THREE.Mesh(geometry, material);
        this.particle.position.set(0, 2, 0);

        this.scene.add(this.particle);
        */

        // Start loop
        this.animate();
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

        
        const delta = this.clock.getDelta();
        this.update(delta);

        /*
        if ( this.mixer ) {s
            this.mixer.update( delta );
        }
        */

        this.renderer.render(this.scene, this.camera);
    }

    update(delta) {
        this.system.update(delta);
    }

}