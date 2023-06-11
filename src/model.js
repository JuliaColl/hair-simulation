import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { MassSpringHairCardSystem } from './SpringMassSystem.js';

let numberOfParticles = 5;  //is one more

export class HairCard {
    mesh = null;
    system = null;
    initWPos = [];
    skullIndex = null;

    

    constructor(mesh = null, system = null, initWPos = null, skullIndex = 0) {
        this.mesh = mesh;
        this.system = system;
        this.initWPos = initWPos;
        this.skullIndex = skullIndex;
    }

    setPosition = (x, y, z) => {
            this.system.setAnchor([x, y, z]);
    };

    setVisible = (bool) => {
        this.mesh.visible = bool;
    }

    showControlHairs = (bool) => {
        this.system.showLines(bool);
    }

    changeMode(mode){
       this.system.changeMode(mode);
    }

    addToScene = (scene) => {
        scene.add(this.mesh);
        for (let i = 0; i < this.system.lines.length; i++) {
            scene.add(this.system.lines[i]);
        }

        for (let i = 0; i < this.system.particles.length; i++) {
            scene.add(this.system.particles[i].mesh);

        }
    }

    loadMassSpringHairCardSystem = (mesh, options) => {
        let position = mesh.geometry.getAttribute('position')
        let initWPos = [];
        let localOffsets = [];

        
        // change to world position
        for (let i = 0; i < position.count; i+=2) {
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            let worldPos = mesh.localToWorld(vertex);

            let vertex2 = new THREE.Vector3();
            vertex2.fromBufferAttribute(position, i + 1);
            let worldPos2 = mesh.localToWorld(vertex2);

            // get init World Position of the control hair
            worldPos.add(worldPos2);
            worldPos.divideScalar(2);
            //initWPos.push(worldPos);
            

            // get local offset
            var offset = [0,0,0]

            offset[0] = vertex2.x - vertex.x;
            offset[1] = vertex2.y - vertex.y;
            offset[2] = vertex2.z - vertex.z;

            localOffsets.push(offset);
            initWPos.push(worldPos)
        }

        return { system: new MassSpringHairCardSystem(initWPos, localOffsets, options), initWPos: initWPos };
    }

    initHairSystem = (index, worldPos, options, worldNorm = null, collisionSpheres = null ) => {
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

        let { system, initWPos } = this.loadMassSpringHairCardSystem(plane, options);
        system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);
        system.collisionSpheres = collisionSpheres;    // TODO: idk if this is optimal

        this.mesh = plane;
        this.system = system;
        this.initWPos = initWPos;
        this.skullIndex = index;

    }

    createHairCard = () => {
        let width = 0.05;
        let height = 0.1;
        const cardGeometry = new THREE.PlaneGeometry(width, height, 1, numberOfParticles);
        
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
        //cardMaterial.blending = THREE.NormalBlending; 
        //cardMaterial.depthTest = false; 

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

    restart(options)
    {
        this.system.restart(options, this.initWPos);
    }

    rotateCard(rad){
        this.mesh.rotation.y += rad;
        this.mesh.updateMatrixWorld();
    }

    setParams(options){
        this.system.setParams(options);
    }
}

export class CollisionSphere {
    mesh = null;
    center;     //center position vec3
    radius;
    initWPos;

    constructor(center = [0,0,0], radius = 1.0){
        this.center = [...center]
        this.radius = radius;

        let geometry = new THREE.SphereGeometry( radius, 32, 16 ); 
        let material = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 
        this.mesh = new THREE.Mesh( geometry, material ); 

        this.mesh.position.set(center[0], center[1], center[2]);
        this.mesh.updateMatrixWorld();

        this.initWPos = [...center];
    }

    addToScene(scene){
        scene.add(this.mesh);
    }

    setVisible(bool){
        this.mesh.visible = bool;
    }

    restart(){
        this.setPosition(this.initWPos[0], this.initWPos[1], this.initWPos[2]);
    }

    setPosition(x,y,z){
        this.mesh.position.set(x,y,z);
        this.center = [x, y, z];
    }
}


export class Head {
    skull = null;
    hairCards = [];
    initPosition = [];
    collisionSpheres = [];

    headSystem = null;  //group containg the skull and the collisionSpheres

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

            let hairCard = new HairCard();
            hairCard.initHairSystem(index, worldPos, options, worldNorm, this.collisionSpheres);
            this.hairCards.push(hairCard);

            // TRY GROUP
            // this.headSystem = new THREE.Group();
            // this.headSystem.add(this.skull);
        }
    }

    addCollisionsSphere = (position, radius) => {
        let cs = new CollisionSphere(position, radius);
        this.collisionSpheres.push(cs);

        // TRY GROUP
        // this.headSystem.add(cs.mesh);

    }
   

    addToScene = (scene) => {
       // TRY GROUP
       //scene.add(this.headSystem);
        
       scene.add(this.skull);

        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].addToScene(scene);
        }

        
        for(let i = 0; i < this.collisionSpheres.length; i++) {
            this.collisionSpheres[i].addToScene(scene);
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
        this.skull.position.set(this.initPosition[0], this.initPosition[1], this.initPosition[2]);
        
        for(let i = 0; i < this.collisionSpheres.length; i++)
            this.collisionSpheres[i].restart();
        
        
        for (let i = 0; i < this.hairCards.length; i++)
            this.hairCards[i].restart(options); 
        
    };

    moveSkull = (dx, dy, dz) => {
        // TRY GROUP
        // let position = this.headSystem.position;
        // this.headSystem.position.set(position.x + dx, position.y + dy, position.z + dz);
        // this.headSystem.updateMatrixWorld();
        // this.updateCollisionSphere();

        let position = this.skull.position;
        this.skull.position.set(position.x + dx, position.y + dy, position.z + dz);
        this.skull.updateMatrixWorld();
        
        this.moveCollisionSpheres(dx, dy, dz);

        this.updateHairCardsPos();
    }

    moveCollisionSpheres = (dx, dy, dz) => {
        for (let i = 0; i < this.collisionSpheres.length; i++){
            this.collisionSpheres[i].center[0] += dx;
            this.collisionSpheres[i].center[1] += dy;
            this.collisionSpheres[i].center[2] += dz;

            this.collisionSpheres[i].mesh.position.set(this.collisionSpheres[i].center[0],this.collisionSpheres[i].center[1],this.collisionSpheres[i].center[2]);
            this.collisionSpheres[i].mesh.updateMatrixWorld();
        }
    }

    updateCollisionSphere = () => {
        for (let i = 0; i < this.collisionSpheres.length; i++){
            
            
            let position = this.collisionSpheres[i].mesh.position;
            //let position = THREE.Vector3();
            //this.collisionSpheres[i].mesh.getWorldPosition( position );

            this.collisionSpheres[i].center[0] = position.x;
            this.collisionSpheres[i].center[1] = position.y;
            this.collisionSpheres[i].center[2] = position.z;

           
        }
    }

    rotateSkull = (rad) => {
        

        // TRY GROUP
        // this.headSystem.rotation.y += rad;
        // this.headSystem.updateMatrixWorld();
        // this.updateCollisionSphere();
        
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

    showCollisionSpheres = (bool) => {
        for (let i = 0; i < this.collisionSpheres.length; i++) {
            this.collisionSpheres[i].setVisible(bool);
        }
    }

    changeMode(mode){
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].changeMode(mode);

        }
    }

    setParams(options){
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].setParams(options);
        }
    }
     
}
