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
        let localOffsets = [];
        // change to world position
        for (let i = 0; i < position.count; i++) {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            initWPos.push(mesh.localToWorld(vertex));
        }

        for(let i = 0; i < position.count; i+=2)
        {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);

            let vertex2 = new THREE.Vector3();
            vertex2.fromBufferAttribute(position, i + 1);

            var offset = [0,0,0]

            offset[0] = vertex2.x - vertex.x;
            offset[1] = vertex2.y - vertex.y;
            offset[2] = vertex2.z - vertex.z;

            localOffsets.push(offset);
        }

        return { system: new ParticleSystemFromCard(initWPos, localOffsets, options), initWPos: initWPos };
    }

    initHairSystem = (index, worldPos, options, worldNorm = null) => {
        let plane = this.createHairCard();
        plane.position.set(worldPos.x, worldPos.y , worldPos.z);
        plane.updateMatrixWorld();

        if (worldNorm)
        {
            const desiredNormal = new THREE.Vector3().copy(worldNorm).negate();
            
            const planeNormal = plane.geometry.getAttribute('normal');
            const rotationAxis = new THREE.Vector3().crossVectors(
              new THREE.Vector3(
                planeNormal.getX(0),
                planeNormal.getY(0),
                planeNormal.getZ(0)
              ),
              desiredNormal
            ).normalize();

            const currentNormalVector = new THREE.Vector3(
                planeNormal.getX(0),
                planeNormal.getY(0),
                planeNormal.getZ(0)
              );

            const angle = currentNormalVector.angleTo(desiredNormal);

            plane.rotateOnAxis(rotationAxis, angle);
            plane.geometry.attributes.normal.needsUpdate = true;
            plane.updateMatrixWorld();

            let position = plane.geometry.getAttribute('position');

            let vertex = new THREE.Vector3();

            vertex.fromBufferAttribute(position, 0);
            let currentWorldPos = plane.localToWorld(vertex);

            let x =  worldPos.x + plane.position.x - currentWorldPos.x;
            let y = worldPos.y + plane.position.y - currentWorldPos.y;
            let z =  worldPos.z + plane.position.z - currentWorldPos.z;
            plane.position.set(x, y, z);
           
        }

        else{
            plane.position.set(worldPos.x, worldPos.y - plane.geometry.height / 2, worldPos.z);
        }

        plane.updateMatrixWorld();

        let { system, initWPos } = this.loadParticleSystemFromCard(plane, options);
        system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);
    
        this.mesh = plane;
        this.system = system;
        this.initWPos = initWPos;
        this.skullIndex = index;

    }

    createHairCard = () => {
        let width = 0.05;
        let height = 0.1;
        const cardGeometry = new THREE.PlaneGeometry(width, height, 1, 4);
        
        // add atributtes to store width and height
        cardGeometry.height = height;
        cardGeometry.width = width;
        
        
        //const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./data/Strand4RGB.png');
        const aTexture = textureLoader.load('./data/Strand4A.png');
        let cardMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, alphaMap: aTexture });
        let cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
        cardMesh.frustumCulled = false;
        cardMaterial.transparent = true;
        //cardMaterial.blending = THREE.NormalBlending; // Example value
        //cardMaterial.depthTest = false; // Example value

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
            let aux1 = new THREE.Vector3(particle.position[0], particle.position[1], particle.position[2]);
            let lPos1 = this.mesh.worldToLocal(aux1);
            
            let aux2 = new THREE.Vector3(particle.position[0], particle.position[1], particle.position[2]);
            let lPos2 = this.mesh.worldToLocal(aux2);

            position.setXYZ(vertexIndex, lPos1.x - particle.offset[0] / 2, lPos1.y - particle.offset[1] / 2, lPos1.z - particle.offset[2] / 2);
            position.setXYZ(vertexIndex + 1, lPos2.x + particle.offset[0] / 2, lPos2.y + particle.offset[1] / 2, lPos2.z + particle.offset[2] / 2);
            position.needsUpdate = true;

        }
    }

    restart(options, worldPos)
    {
        this.system = new ParticleSystemFromCard(this.initWPos, options);
        this.system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);
    }

    rotateCard(rad){
        this.mesh.rotation.y += rad;
        this.mesh.updateMatrixWorld();
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
        let normals = this.skull.geometry.getAttribute('normal');

        let numOfHairCards = indeces.length;
        for (let i = 0; i < numOfHairCards; i++) {
            let vertex = new THREE.Vector3();

            let index = indeces[i];

            //world position
            vertex.fromBufferAttribute(position, index);
            let worldPos = this.skull.localToWorld(vertex);

            // normal
            let normal = new THREE.Vector3();
            normal.fromBufferAttribute(normals, index);
            let worldNorm = this.skull.localToWorld(normal);

            let hairCard = new entitySystem(null, null, null);
            hairCard.initHairSystem(index, worldPos, options, worldNorm);
            this.hairCards.push(hairCard);
        }
    }
   

    addToScene = (scene) => {
        scene.add(this.skull);
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].addToScene(scene);
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

        this.rotateCards(rad);
        this.updateHairCardsPos();
    }

    rotateCards(rad){
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].rotateCard(rad);

        }
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
