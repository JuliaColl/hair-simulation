import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { ParticleSystemFromCard } from './SpringMassSystem.js';

export class entitySystem {
    mesh = null;
    system = null;
    initWPos = [];
    skullIndex = null;
    

    constructor(mesh, system, initWPos, skullIndex = 0) {
        this.mesh = mesh;
        this.system = system;
        this.initWPos = initWPos;
        this.skullIndex = skullIndex;
    }

    setPosition = (x, y, z) => {
        this.mesh.position.set(x, y, z);
        this.mesh.updateMatrixWorld();
        this.system.setAnchor([x, y, z]);
    };

    setVisible = (bool) => {
        this.mesh.visible = bool;
    }
}


export class skullSystem {
    skull = null;
    hairCards = [];
    initPosition = [];

    constructor(headMesh, indeces, options, wPos = [0, 0, 0]) {
        this.skull = headMesh;    //mesh of the head

        this.skull.position.set(wPos[0], wPos[1], wPos[2]);
        this.skull.frustumCulled = false;
        this.skull.updateMatrixWorld();

        this.initPosition = [...wPos];

        let position = this.skull.geometry.getAttribute('position');

        let numOfHairCards = indeces.length;
        for (let i = 0; i < numOfHairCards; i++) {
            let plane = this.createHairCard();

            let vertex = new THREE.Vector3();

            let index = indeces[i];

            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);

            plane.position.set(worldPos.x, worldPos.y, worldPos.z);
            plane.updateMatrixWorld();

            let { system, initWPos } = this.loadParticleSystemFromCard(plane, options);
            system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);

            this.hairCards.push(new entitySystem(plane, system, initWPos, index));
        }
    }

    createHairCard = () => {
        const cardGeometry = new THREE.PlaneGeometry(0.05, 0.1, 1, 4);
        //const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./data/strand4RGB.png');
        const aTexture = textureLoader.load('./data/strand4A.png');
        let cardMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture });
        let cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        cardMesh.frustumCulled = false;
        cardMaterial.transparent = true;
        
        return cardMesh;
    }

    loadParticleSystemFromCard = (mesh, options) => {
        let position = mesh.geometry.getAttribute('position')
        let initWPos = [];
        // change to world position
        for (let i = 0; i < position.count; i++) {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            initWPos.push(mesh.localToWorld(vertex));
        }

        return { system: new ParticleSystemFromCard(initWPos, options), initWPos: initWPos };
    }

    addToScene = (scene) => {
        scene.add(this.skull);
        for (let i = 0; i < this.hairCards.length; i++) {
            scene.add(this.hairCards[i].mesh);
        }
    }

    updateHairCards = () => {
        let position = this.skull.geometry.getAttribute('position');

        for (let i = 0; i < this.hairCards.length; i++) {
            let vertex = new THREE.Vector3();
            let index = this.hairCards[i].skullIndex;
            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);

            this.hairCards[i].setPosition(worldPos.x, worldPos.y, worldPos.z);
        }
    };

    restart = (options) => {
        this.moveSkull(this.initPosition[0], this.initPosition[1], this.initPosition[2]);

        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].system = new ParticleSystemFromCard(this.hairCards[i].initWPos, options);

            let position = this.skull.geometry.getAttribute('position');

            let vertex = new THREE.Vector3();
            let index =  this.hairCards[i].skullIndex;
            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);
            this.hairCards[i].system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);

        }
    };

    moveSkull = (x, y, z) => {
        this.skull.position.set(x, y, z);
        this.skull.updateMatrixWorld();

        this.updateHairCards();
    }

    rotateSkull = (rad) => {
        //this.skull.rotation.z += rad;
        //this.skull.rotation.x += rad;
        this.skull.rotation.y += rad;
        this.skull.updateMatrixWorld();

        this.updateHairCards();
    }

    setVisible = (bool) => {
        this.skull.visible = bool;
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].setVisible(bool);
        }
    }
}
