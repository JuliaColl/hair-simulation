import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { MassSpringHairCardSystem, scalarPorductVec3 } from './SpringMassSystem.js';
import { InputManager } from './input.js';

let numberOfParticles = 5;  //is one more

export let materials = {
    basicMaterial: 0,
    texturedMaterial: 1,
}

export class HairCard {
    mesh = null;
    system = null;
    initWPos = [];
    skullIndex = null;
    initWPos = null;
    initParticlesWPos = null;

    static basicMaterial = null;
    static texturedMaterial = null;
    static currentMaterial = null;

    constructor(mesh = null, system = null, initParticlesWPos = null, skullIndex = 0) {
        this.mesh = mesh;
        this.system = system;
        this.initParticlesWPos = initParticlesWPos;
        this.skullIndex = skullIndex;
    }

    setPosition = (x, y, z) => {
            this.system.setAnchor([x, y, z]);
    };

    setVisible = (bool) => {
        this.mesh.visible = bool;
    }

    showControlHairs = (bool) => {
        this.system.showControlHair(bool);
    }

    showParticles = (bool) => {
        this.system.showParticles(bool);
    }

    changeMode(mode){
       this.system.changeMode(mode);
    }

    getCurrentMaterial() {
        switch(HairCard.currentMaterial)
        {
            case materials.basicMaterial:
                return HairCard.basicMaterial;
            case materials.texturedMaterial:
                return HairCard.texturedMaterial;
        }
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
        let initParticlesWPos = [];
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
            

            // get local offset
            var offset = [0,0,0]

            offset[0] = vertex2.x - vertex.x;
            offset[1] = vertex2.y - vertex.y;
            offset[2] = vertex2.z - vertex.z;


            localOffsets.push(offset);
            initParticlesWPos.push(worldPos)
        }

        return { system: new MassSpringHairCardSystem(initParticlesWPos, localOffsets, options), initParticlesWPos: initParticlesWPos };
    }

    initHairSystem = (index, worldPos, options, worldNorm = null, collisionSpheres = null ) => {
        let plane = this.createHairCard();
        plane.position.set(worldPos.x, worldPos.y , worldPos.z);
        plane.updateMatrixWorld();

        if (worldNorm)
        {
            /*
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

            */

            //rotate
            plane.geometry.lookAt(worldNorm);
            plane.updateMatrixWorld();

            // place the top of the card in the vertex position
            let position = plane.geometry.getAttribute('position');

            let aux = new THREE.Vector3();
            aux.fromBufferAttribute(position, 0);
            let vertex0 = plane.localToWorld(aux);

            let aux2 = new THREE.Vector3();
            aux2.fromBufferAttribute(position, 1);
            let vertex1 = plane.localToWorld(aux2);

            aux.addVectors(vertex0, vertex1)                
            aux.divideScalar(2);
            

            let x =  worldPos.x + worldPos.x - aux.x;
            let y = worldPos.y + worldPos.y - aux.y;
            let z =  worldPos.z + worldPos.z - aux.z;
            this.initWPos = [x,y,z];
            plane.position.set(x, y, z);
           
        }

        else{
            this.initWPos = [worldPos.x, worldPos.y - plane.geometry.height / 2, worldPos.z];
            plane.position.set(worldPos.x, worldPos.y - plane.geometry.height / 2, worldPos.z);
        }

        plane.updateMatrixWorld();

        let { system, initParticlesWPos } = this.loadMassSpringHairCardSystem(plane, options);
        system.setAnchor([worldPos.x, worldPos.y, worldPos.z]);
        system.collisionSpheres = collisionSpheres;    // TODO: idk if this is optimal

        this.mesh = plane;
        this.system = system;
        this.initParticlesWPos = initParticlesWPos;
        this.skullIndex = index;

    }

    updateMaterial() {
        this.mesh.material = this.getCurrentMaterial();
    }

    createHairCard = () => {
        let width = 0.05;
        let height = 0.1;
        const cardGeometry = new THREE.PlaneGeometry(width, height, 1, numberOfParticles);
        
        // add atributtes to store width and height
        cardGeometry.height = height;
        cardGeometry.width = width;
        
        

        
        let cardMesh = new THREE.Mesh(cardGeometry, this.getCurrentMaterial());
        cardMesh.frustumCulled = false;
        //cardMaterial.transparent = true;
        //cardMaterial.blending = THREE.NormalBlending; 
        //cardMaterial.depthTest = false; 

        return cardMesh;
    }

    updateHairCardSystem(delta) {
        this.system.updateSystem(delta);
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
        this.system.restart(options, this.initParticlesWPos);
        this.mesh.position.set(this.initWPos[0], this.initWPos[1], this.initWPos[2]);
    }   

    rotateCard(rad){
        this.mesh.rotation.y += rad;
        this.mesh.updateMatrixWorld();
    }

    setParams(options){
        this.system.setParams(options);
    }

    update(delta){
        this.updatePositionCard(delta);
        this.updateHairCardSystem(delta);
    }

    updatePositionCard(delta) {
        
        let position = this.system.particles[0].position;
        let tt = delta * 0.2;
        if (InputManager.isKeyQ) {
            this.setPosition(position[0], position[1] + tt, position[2]);
        }
        if (InputManager.isKeyE) {
            this.setPosition(position[0], position[1] - tt, position[2]);
        }
        if (InputManager.isKeyW) {
            this.setPosition(position[0], position[1], position[2] - tt);
        }
        if (InputManager.isKeyS) {
            this.setPosition(position[0], position[1], position[2] + tt);
        }
        if (InputManager.isKeyA) {
            this.setPosition(position[0] - tt, position[1], position[2]);
        }
        if (InputManager.isKeyD) {
            this.setPosition(position[0] + tt, position[1], position[2]);
        }

        if (InputManager.isSpace) {
            this.rotateCard(delta);
        }
    }

    updateNoPhysics(delta){};

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

        let numOfHairCards = indeces.length;
        for (let i = 0; i < numOfHairCards; i++) {
            this.addHairCard(indeces[i], options);
            // TRY GROUP
            // this.headSystem = new THREE.Group();
            // this.headSystem.add(this.skull);
        }
    }

    addHairCard = (index, options) => {
        let position = this.skull.geometry.getAttribute('position');
        let normals = this.skull.geometry.getAttribute('normal');

        let vertex = new THREE.Vector3();

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

    }

    addHairCardsFromPlane = (normalVector, D, options) => {
        let position = this.skull.geometry.getAttribute('position');
        let count = 0;
        for(let i = 0; i < position.count; i++){
            //world position
            let vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            let worldPos = this.skull.localToWorld(vertex);

            let scalarProduct = normalVector.dot(worldPos);
            if(scalarProduct > D ) // && count < 50)
            {
                this.addHairCard(i, options);
                count++;
            }
        }

        console.log("number of hair cards: " + count);
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

    update = (delta) => {
        this.updateSkullPosition(delta);
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].updateHairCardSystem(delta);
        }

    }

    updateSkullPosition(delta) {  
       
        let tt = delta * 0.2;
        if (InputManager.isKeyQ) {
            this.moveSkull(0, tt, 0);
        }
        if (InputManager.isKeyE) {
            this.moveSkull(0, - tt, 0);
        }
        if (InputManager.isKeyA) {
            this.moveSkull(- tt, 0, 0);
        }
        if (InputManager.isKeyD) {
            this.moveSkull( tt, 0, 0);
        }
        if (InputManager.isKeyS) {
            this.moveSkull(0, 0, tt);
        }
        if (InputManager.isKeyW) {
            this.moveSkull(0, 0, - tt);
        }
        if (InputManager.isSpace) {
            this.rotateSkull(delta * 1.5);
        }

    }

    updateNoPhysics(delta) {  
       
        let tt = delta * 0.2;
        if (InputManager.isKeyQ) {
            this.moveSkullNoPhysics(0, tt, 0);
        }
        if (InputManager.isKeyE) {
            this.moveSkullNoPhysics(0, - tt, 0);
        }
        if (InputManager.isKeyA) {
            this.moveSkullNoPhysics(- tt, 0, 0);
        }
        if (InputManager.isKeyD) {
            this.moveSkullNoPhysics( tt, 0, 0);
        }
        if (InputManager.isKeyS) {
            this.moveSkullNoPhysics(0, 0, tt);
        }
        if (InputManager.isKeyW) {
            this.moveSkullNoPhysics(0, 0, - tt);
        }
        if (InputManager.isSpace) {
            //this.rotateSkullNoPhysics(delta * 1.5);
        }

    }

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

    moveSkullNoPhysics = (dx, dy, dz) => {
        let position = this.skull.position;
        this.skull.position.set(position.x + dx, position.y + dy, position.z + dz);
        this.skull.updateMatrixWorld();
        
        this.moveCollisionSpheres(dx, dy, dz);
        
        for(let i = 0; i<this.hairCards.length; i++)
        {
            let cardPos = this.hairCards[i].mesh.position;

            this.hairCards[i].mesh.position.set(cardPos.x + dx, cardPos.y + dy, cardPos.z + dz);
            this.hairCards[i].setPosition(cardPos.x + dx, cardPos.y + dy, cardPos.z + dz);

        }

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
    
    updateMaterial() {
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].updateMaterial();
        }
    }

    restart = (options) => {
        this.skull.position.set(this.initPosition[0], this.initPosition[1], this.initPosition[2]);
        this.skull.updateMatrixWorld();


        for(let i = 0; i < this.collisionSpheres.length; i++)
            this.collisionSpheres[i].restart();
        
        
        for (let i = 0; i < this.hairCards.length; i++)
            this.hairCards[i].restart(options); 
        
        this.updateHairCardsPos();
    };

    
    /*
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
    */

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

    showParticles = (bool) => {
        for (let i = 0; i < this.hairCards.length; i++) {
            this.hairCards[i].showParticles(bool);
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
