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
        //this.mesh.position.set(x, y, z);
        //this.mesh.updateMatrixWorld();
        this.system.setAnchor([x, y, z]);
    };

    setVisible = (bool) => {
        this.mesh.visible = bool;
    }

    showControlHairs = (bool) => {
        this.system.showLines(bool);
    }

    addToScene = (scene) => {
        scene.add(this.mesh);
        for (let i = 0; i < this.system.lines.length; i++) {
            scene.add(this.system.lines[i]);
        }
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

    initHairSystem = (index, worldPos, options) => {
        let plane = this.createHairCard();

        plane.position.set(worldPos.x, worldPos.y, worldPos.z);
        plane.updateMatrixWorld();

        let { system, initWPos } = this.loadParticleSystemFromCard(plane, options);
        system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);
    
        this.mesh = plane;
        this.system = system;
        this.initWPos = initWPos;
        this.skullIndex = index;

    }

    createHairCard = () => {
        const cardGeometry = new THREE.PlaneGeometry(0.05, 0.1, 1, 4);
        //const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./data/Strand4RGB.png');
        const aTexture = textureLoader.load('./data/Strand4A.png');
        let cardMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture });
        let cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        cardMesh.frustumCulled = false;
        cardMaterial.transparent = true;
        
        return cardMesh;
    }

    updateHairCardSystem(delta) {
        this.system.update(delta);
        //console.log(system.particles[1])
        for (var i = 0; i < this.system.particles.length; i++) {
            // Access the geometry data of the model
            const position = this.mesh.geometry.getAttribute('position');
            const particle = this.system.particles[i];

            const vertexIndex = particle.index;
            let aux = new THREE.Vector3(particle.position[0], particle.position[1], particle.position[2]);
            let lPos = this.mesh.worldToLocal(aux);

            position.setXYZ(vertexIndex, lPos.x - particle.offset[0] / 2, lPos.y - particle.offset[1] / 2, lPos.z - particle.offset[2] / 2);
            position.setXYZ(vertexIndex + 1, lPos.x + particle.offset[0] / 2, lPos.y + particle.offset[1] / 2, lPos.z + particle.offset[2] / 2);
            position.needsUpdate = true;

        }
    }

    restart(options, worldPos)
    {
        this.system = new ParticleSystemFromCard(this.initWPos, options);
        this.system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);
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
            let vertex = new THREE.Vector3();

            let index = indeces[i];

            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);

            let hairCard = new entitySystem(null, null, null);
            hairCard.initHairSystem(index, worldPos, options);
            this.hairCards.push(hairCard);
        }
    }
   

    addToScene = (scene) => {
        scene.add(this.skull);
        for (let i = 0; i < this.hairCards.length; i++) {
            scene.add(this.hairCards[i].mesh);
        }
    }

    updateHairCardsPos = () => {
        let position = this.skull.geometry.getAttribute('position');

        for (let i = 0; i < this.hairCards.length; i++) {
            let vertex = new THREE.Vector3();
            let index = this.hairCards[i].skullIndex;
            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);

            this.hairCards[i].setPosition(worldPos.x, worldPos.y, worldPos.z);
        }
    };

    updateSystem = (delta) => {
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].updateHairCardSystem(delta);
        }

    }

    restart = (options) => {
        this.moveSkull(this.initPosition[0], this.initPosition[1], this.initPosition[2]);

        for (let i = 0; i < this.hairCards.length; i++) {
            let position = this.skull.geometry.getAttribute('position');

            let vertex = new THREE.Vector3();
            let index =  this.hairCards[i].skullIndex;
            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);

            this.hairCards[i].restart(options, worldPos); 
        }
    };

    moveSkull = (x, y, z) => {
        this.skull.position.set(x, y, z);
        this.skull.updateMatrixWorld();

        this.updateHairCardsPos();
    }

    rotateSkull = (rad) => {
        //this.skull.rotation.z += rad;
        //this.skull.rotation.x += rad;
        this.skull.rotation.y += rad;
        this.skull.updateMatrixWorld();

        this.updateHairCardsPos();
    }

    setVisible = (bool) => {
        this.skull.visible = bool;
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].setVisible(bool);
        }
    }

    showControlHairs = (bool) => {
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].showControlHairs(bool);
        }
    }
}
