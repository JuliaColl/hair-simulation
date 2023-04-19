import * as THREE from 'https://cdn.skypack.dev/three@0.136';


var gravity = -9.81;
var k = 800;
var damping = 100;

function createParticle(color = 'purple') {
    const radius = 0.1;
    const widthSegments = 16;
    const heightSegments = 16;

    const geometry = new THREE.SphereBufferGeometry(
        radius,
        widthSegments,
        heightSegments
    );

    //const material = new MeshBasicMaterial();
    const material = new THREE.MeshBasicMaterial({ color: color });

    const particle = new THREE.Mesh(geometry, material);

    return particle;
}

function createAnchor() {

    const geometry = new THREE.BoxBufferGeometry(0.25, 0.25, 0.25);

    const material = new THREE.MeshBasicMaterial({ color: 'grey' });

    // create a Mesh containing the geometry and material
    const anchor = new THREE.Mesh(geometry, material);

    return anchor;
}

function createLine() {


    //THREE.line.geometry.vertices.push(new THREE.Vector3(0,0,0));
    //THREE.line.geometry.vertices.push(new THREE.Vector3(0,0,0));

    const material = new THREE.LineBasicMaterial({ color: 'grey' });
    
    const points = [];
    points.push( new THREE.Vector3( 0, 1, 0 ) );
    points.push( new THREE.Vector3( 1, 0, 0 ) );
    
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    
    const line = new THREE.Line( geometry, material );
    
    return line;
}

export class SpringMassSystem1D {
    mass = null;
    velocityY = null;

    particle = null;
    anchor = null;

    constructor() {
        this.mass = 20;
        this.velocityY = 0;

        this.particle = createParticle();
        this.anchor = createAnchor();
        this.line = createLine();

        this.anchor.position.set(0, 1, 0);
        this.particle.position.set(0, 3, 0);

    }

    update(delta) {
        let positionY = this.particle.position.y;

        // FORCE CALCULATIONS
        var springForceY = -k*(positionY - this.anchor.position.y);
        var dampingForceY = damping * this.velocityY;
        var forceY = springForceY + this.mass * gravity - dampingForceY;
        var accelerationY = forceY / this.mass;
        this.velocityY = this.velocityY + accelerationY * delta;
        positionY = positionY + this.velocityY * delta;

        this.particle.position.y = positionY;

        // Update line       
        let start = this.anchor.position;
        let end = this.particle.position;

        this.line.geometry.setFromPoints([start, end]);

    }
}



export class SpringMassSystem2D {
    mass = null;
    velocity = null;

    particle = null;
    anchor = null;

    constructor() {
        this.mass = 20;
        this.velocity = [0, 0];

        this.particle = createParticle();
        this.anchor = createAnchor();
        this.line = createLine();

        this.anchor.position.set(0, 1, 0);
        this.particle.position.set(-3, 3, 0);
    }

    update(delta) {
        let positionY = this.particle.position.y;
        let positionX = this.particle.position.x;

        // FORCE CALCULATIONS
        var springForce = [-k*(positionX - this.anchor.position.x), -k*(positionY - this.anchor.position.y)];
        var dampingForce = [ damping * this.velocity[0], damping * this.velocity[1] ];
        var force = [springForce[0] - dampingForce[0], springForce[1] + this.mass * gravity - dampingForce[1]];
        var acceleration = [force[0] / this.mass, force[1] / this.mass];
        this.velocity[0] = this.velocity[0] + acceleration[0] * delta;
        this.velocity[1] = this.velocity[1] + acceleration[1] * delta;
        
        positionX = positionX + this.velocity[0] * delta;
        positionY = positionY + this.velocity[1] * delta;

        this.particle.position.x = positionX;
        this.particle.position.y = positionY;

        // Update line       
        let start = this.anchor.position;
        let end = this.particle.position;

        this.line.geometry.setFromPoints([start, end]);

    }
}


export class MultipleSpringMassSystem {
    mass = null;

    particles = [];
    anchor = null;
    lines = [];

    damping = 100;
    k = 800;
    gravity = -9.98;
    
    constructor(length=1, {damping, k, gravity, mass}) {

        this.mass = mass;
        this.damping = damping;
        this.k = k;
        this.gravity = gravity;
        //this.velocity = [0, 0];

        this.anchor = createAnchor();
        this.anchor.position.set(0, 4, 0);

        

        for(var j = 0; j < length; j++){
            // init particles
            if (j == 0){
                var p = createParticle('green');
                p.position.set(0,2,0)
            }else{
                var p = createParticle();
                p.position.set(-3, 3, 0);

            }
            p.velocity = [0,0,0];
            this.particles.push(p);
            // init lines
            this.lines.push(createLine())
        }
        

        //this.particles[0].position.set(-3, 3, 0);
    };

    restart(){
        for(var j = 1; j < this.particles.length; j++){
            this.particles[j].position.set(-3, 3, 0);
        }
    }

    setParams({damping, k, gravity, mass}){
        this.mass = mass;
        this.damping = damping;
        this.k = k;
        this.gravity = gravity;
    };

    update(delta) {
        //
        for(var j = 1; j < this.particles.length; j++){
            let position1 = this.particles[j].position; 
            let position2 = (j < this.particles.length - 1 ) ? this.particles[j+1].position : position1;
    
            let velocity1 = this.particles[j].velocity;
            let velocity2 = (j < this.particles.length - 1 ) ? this.particles[j+1].velocity : [0,0,0];

            // FORCE CALCULATIONS
            var endPos = (j > 0) ? this.particles[j-1].position : this.particles[0].position;
            var springForce1 = [-this.k*(position1.x - endPos.x), -this.k*(position1.y - endPos.y), -this.k*(position1.z - endPos.z)];
            var dampingForce1 = [ this.damping * velocity1[0], this.damping * velocity1[1], this.damping * velocity1[2] ];
            
            var springForce2 =  [-this.k*(position2.x - position1.x), -this.k*(position2.y - position1.y), -this.k*(position2.z - position1.z)];
            var dampingForce2 = [ this.damping * velocity2[0], this.damping * velocity2[1],this.damping * velocity2[2]];

            var force = [0,0,0];
            force[0] = springForce1[0] - dampingForce1[0] - springForce2[0] + dampingForce2[0]; 
            force[1] = springForce1[1] + this.mass * this.gravity - dampingForce1[1] - springForce2[1] + dampingForce2[1];
            force[2] = springForce1[2] - dampingForce1[2] - springForce2[2] + dampingForce2[2]; 

            var acceleration = [force[0] / this.mass, force[1] / this.mass, force[2] / this.mass];
            velocity1[0] = velocity1[0] + acceleration[0] * delta;
            velocity1[1] = velocity1[1] + acceleration[1] * delta;
            velocity1[2] = velocity1[2] + acceleration[2] * delta;

    
            // update particle position and velocity
            this.particles[j].position.x = position1.x + velocity1[0] * delta;
            this.particles[j].position.y = position1.y + velocity1[1] * delta;
            this.particles[j].position.z = position1.z + velocity1[2] * delta;

            this.particles[j].velocity[0] = velocity1[0];
            this.particles[j].velocity[1] = velocity1[1];
            this.particles[j].velocity[2] = velocity1[2];


            // Update line           
            this.lines[j].geometry.setFromPoints([this.particles[j].position, endPos]);
        }
       

    }
}

function Particle(p, v, i, o, m = 20){
    this.position = [...p];
    this.velocity = [...v];
    this.offset = [...o];
    this.index = i;
    this.mass = m ;
}

export class ParticleSystemFromCard {
    mass = 20;

    particles = [];

    damping = 100;
    k = 800;
    gravity = -9.98;

    constructor(position, {damping, k, gravity, mass}) {

        this.mass = mass;
        this.damping = damping;
        this.k = k;
        this.gravity = gravity;

        for(var i = 0; i < position.length; i = i + 2){
            // init particles
            let velocity = [0,0,0]
            let pos = [position[i].x, position[i].y, position[i].z];

            var offset = [0,0,0]

            offset[0] = position[i+1].x - pos[0];
            offset[1] = position[i+1].y - pos[1];
            offset[2] = position[i+1].z - pos[2];

            var p = new Particle(pos, velocity, i, offset);
            this.particles.push(p)
        }
        
        //this.particles[0].position.set(-3, 3, 0);
    };

    setParams({damping, k, gravity, mass}){
        this.mass = mass;
        this.damping = damping;
        this.k = k;
        this.gravity = gravity;
    }

    setAnchor(position){
        this.particles[0].position = [...position];
    }

    update(delta) {
        //
        for(var j = 1; j < this.particles.length; j++){
            let position1 = this.particles[j].position; 
            let position2 = (j < this.particles.length - 1 ) ? this.particles[j+1].position : position1;
    
            let velocity1 = this.particles[j].velocity;
            let velocity2 = (j < this.particles.length - 1 ) ? this.particles[j+1].velocity : [0,0,0];

            // FORCE CALCULATIONS
            var endPos = (j > 0) ? this.particles[j-1].position : this.particles[0].position;
            var springForce1 = [-this.k*(position1[0] - endPos[0]), -this.k*(position1[1] - endPos[1]), -this.k*(position1[2] - endPos[2])];
            var dampingForce1 = [ this.damping * velocity1[0], this.damping * velocity1[1], this.damping * velocity1[2] ];
            
            var springForce2 =  [-this.k*(position2[0] - position1[0]), -this.k*(position2[1] - position1[1]), -this.k*(position2[2] - position1[2])];
            var dampingForce2 = [ this.damping * velocity2[0], this.damping * velocity2[1],this.damping * velocity2[2]];

            var force = [0,0,0];
            force[0] = springForce1[0] - dampingForce1[0] - springForce2[0] + dampingForce2[0]; 
            force[1] = springForce1[1] + this.mass * this.gravity - dampingForce1[1] - springForce2[1] + dampingForce2[1];
            force[2] = springForce1[2] - dampingForce1[2] - springForce2[2] + dampingForce2[2]; 

            var acceleration = [force[0] / this.mass, force[1] / this.mass, force[2] / this.mass];
            velocity1[0] = velocity1[0] + acceleration[0] * delta;
            velocity1[1] = velocity1[1] + acceleration[1] * delta;
            velocity1[2] = velocity1[2] + acceleration[2] * delta;

    
            // update particle position and velocity
            this.particles[j].position[0] = position1[0] + velocity1[0] * delta;
            this.particles[j].position[1] = position1[1] + velocity1[1] * delta;
            this.particles[j].position[2] = position1[2] + velocity1[2] * delta;

            this.particles[j].velocity[0] = velocity1[0];
            this.particles[j].velocity[1] = velocity1[1];
            this.particles[j].velocity[2] = velocity1[2];
        }
       

    }
}
