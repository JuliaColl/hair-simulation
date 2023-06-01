import * as THREE from 'https://cdn.skypack.dev/three@0.136';


var gravity = -9.81;
var k = 800;
var damping = 100;

let particlesRadius = 0.001;
let strength = 100;
let c = 70;


function lengthVec3(v){
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

function normalizeVec3(v){
    let length = lengthVec3(v);
    v[0] /= length;
    v[1] /= length;
    v[2] /= length;
}

function scalarPorductVec3( v, u){
    return v[0]*u[0] + v[1]*u[1] + v[2]*u[2];
}

function createParticle(color = 'purple') {
    const radius = 0.01;
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

    const material = new THREE.LineBasicMaterial({ side: THREE.DoubleSide, color: 'grey' });
    
    const points = [];
    points.push( new THREE.Vector3( 0, 1, 0 ) );
    points.push( new THREE.Vector3( 1, 0, 0 ) );
    
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    
    const line = new THREE.Line( geometry, material );
    line.frustrumCulled = false;
    
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
        this.line.frustrumCulled = false;


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

    mode = modes.massSpring;

    restDistance = 0.5;

    
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
                p.position.set(0,1.5,0)
            }else{
                var p = createParticle();
                p.position.set(-j, j, j);

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

    setVisible( bool ){
        for (let i = 0; i < this.particles.length; i++ ){
            this.particles[i].visible = bool; 
            this.lines[i].visible = bool;
        }
    }

    update(delta) {
        //
        if (this.mode == modes.massSpring)
            this.updateMassSpringSystem(delta)

        else if (this.mode == modes.inextensible)
            this.inextensibleSystem(delta);
    }

    updateMassSpringSystem(delta)
    {
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
            this.particles[j].position.x = position1.x + velocity1[0] * delta ;
            this.particles[j].position.y = position1.y + velocity1[1] * delta ;
            this.particles[j].position.z = position1.z + velocity1[2] * delta;

            this.particles[j].velocity[0] = velocity1[0];
            this.particles[j].velocity[1] = velocity1[1];
            this.particles[j].velocity[2] = velocity1[2];


            // Update line           
            this.lines[j].geometry.setFromPoints([this.particles[j].position, endPos]);
            this.lines[j].geometry.computeBoundingSphere();

        }

    }

    inextensibleSystem(delta)
    {
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

            //apply inextensibility constraint
            let diffX = this.particles[j - 1].position.x - this.particles[j].position.x;
            let x = (1 - this.restDistance / Math.abs(diffX) ) * diffX; 

            let diffY = this.particles[j - 1].position.y - this.particles[j].position.y;
            let y = (1 - this.restDistance / Math.abs(diffY) ) * diffY;
            
            let diffZ = this.particles[j - 1].position.z - this.particles[j].position.z;
            let z = (1 - this.restDistance / Math.abs(diffZ) ) * diffZ; 

            // update particle position and velocity
            this.particles[j].position.x = position1.x + velocity1[0] * delta + x;
            this.particles[j].position.y = position1.y + velocity1[1] * delta + y;
            this.particles[j].position.z = position1.z + velocity1[2] * delta + z;

            this.particles[j].velocity[0] = velocity1[0];
            this.particles[j].velocity[1] = velocity1[1];
            this.particles[j].velocity[2] = velocity1[2];


            // Update line           
            this.lines[j].geometry.setFromPoints([this.particles[j].position, endPos]);
        }
    }
}

function Particle(p, v, i, o, m = 20){
    this.position = [...p];     //world position
    this.velocity = [...v];
    this.offset = [...o];       // local offset
    this.index = i;
    this.mass = m ;
}

export let modes = {
    massSpring: 0,
    inextensible: 1,
}

export class ParticleSystemFromCard {
    mass = 20;

    particles = [];

    damping = 100;
    k = 800;
    gravity = -9.98;

    mode = modes.massSpring;

    lines = [];

    collisionSpheres = null;

    constructor(position, localOffsets, {damping, k, gravity, mass}) {

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
            
            let localOffset = localOffsets[i/2];
            var p = new Particle([pos[0] + offset[0]/2, pos[1] + offset[1]/2, pos[2] + offset[2]/2 ], velocity, i, localOffset);
            this.particles.push(p)

            //add lines to show control hairs
            if (i != 0)
            {
                let line = createLine();
                let start = new THREE.Vector3(this.particles[i/2-1].position[0], this.particles[i/2-1].position[1], this.particles[i/2-1].position[2])
                let end = new THREE.Vector3(this.particles[i/2].position[0], this.particles[i/2].position[1], this.particles[i/2].position[2]);
                line.geometry.setFromPoints([start, end]);

                this.lines.push(line);
            }
                
                


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
        if (this.mode == modes.massSpring)
            this.updateMassSpringSystem(delta)
    }

    updateMassSpringSystem(delta)
    {
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


            let {position, velocity} = this.checkCollision1(position1, velocity1, delta);
            //let {position, velocity} = this.checkCollision2(position1, velocity1, delta, force);

            // update particle position and velocity
            this.particles[j].position[0] = position[0];
            this.particles[j].position[1] = position[1];
            this.particles[j].position[2] = position[2];

            this.particles[j].velocity[0] = velocity[0];
            this.particles[j].velocity[1] = velocity[1];
            this.particles[j].velocity[2] = velocity[2];

              
            // Update line
            let start = new THREE.Vector3(this.particles[j].position[0], this.particles[j].position[1], this.particles[j].position[2]);
            let end = new THREE.Vector3(endPos[0], endPos[1], endPos[2]);
            this.lines[j - 1].geometry.setFromPoints([start, end]);
           
        }
    }
     /*
        source: https://www.martinruenz.de/media/pubs/ruenz12bachelor.pdf
     */

    checkCollision1(position, velocity, delta){
        let newPos = [position[0] + velocity[0] * delta, position[1] + velocity[1] * delta, position[2] + velocity[2] * delta]
 
        if(!this.collisionSpheres)
            return {position: newPos, velocity: velocity};


        for(let i = 0; i < this.collisionSpheres.length; i++)
        {
            let cs = this.collisionSpheres[i];
            let vec = [newPos[0] - cs.center[0], newPos[1] - cs.center[1], newPos[2] - cs.center[2]]
            let modulusSquared = vec[0]*vec[0] + vec[1]*vec[1] + vec[2]*vec[2];

            let difSquared = (cs.radius + particlesRadius) * (cs.radius + particlesRadius);
            
            if((modulusSquared - difSquared) < 0)  //there is collision
            {
                let modulus = Math.sqrt(modulusSquared);
                let finalPos = [0,0,0];
                //finalPos[0] = ((cs.radius + particlesRadius) * (newPos[0] - cs.center[0]) / modulus) ;
                //finalPos[1] = ((cs.radius + particlesRadius) * (newPos[1] - cs.center[1]) / modulus) ;
                //finalPos[2] = ((cs.radius + particlesRadius) * (newPos[2] - cs.center[2]) / modulus) ;

                let w = [newPos[0] - cs.center[0], newPos[1] - cs.center[1], newPos[2] - cs.center[2] ]
                let sum_radius = (cs.radius + particlesRadius);

                let A = velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2];
                let B = 2 * velocity[0]*w[0] + 2 * velocity[1]*w[1] + 2 * velocity[2]*w[2];
                let C = - sum_radius * sum_radius + w[0] * w[0] + w[1] * w[1] + w[2] * w[2];

                let sqrt = Math.sqrt(B*B - 4 * A * C);
                let s = (-B + sqrt) / (2 * A);

                if (s > 0)
                    s =  (-B - sqrt) / (2 * A);

                finalPos[0] = s * velocity[0] + newPos[0];
                finalPos[1] = s * velocity[1] + newPos[1];
                finalPos[2] = s * velocity[2] + newPos[2];
                
                //TODO: update velocity somehow :)
                let finalVel = [0,0,0];
               

                return {position: finalPos, velocity: [0,0,0]};
            }
        }

        return {position: newPos, velocity: velocity};

    }

    /*
    Scource: https://www.researchgate.net/profile/Zhiyong-Huang-5/publication/4038534_An_enhanced_framework_for_real-time_hair_animation/links/0c96052312d31cd3f8000000/An-enhanced-framework-for-real-time-hair-animation.pdf
    reaction constraint method: https://dl.acm.org/doi/pdf/10.1145/54852.378524
    */

    checkCollision2(position, velocity, delta, force){
        let newPos = [position[0] + velocity[0] * delta, position[1] + velocity[1] * delta, position[2] + velocity[2] * delta]
 
        if(!this.collisionSpheres)
            return {position: newPos, velocity: velocity};

        for(let i = 0; i < this.collisionSpheres.length; i++)
        {
            let cs = this.collisionSpheres[i];
            let N = [newPos[0] - cs.center[0], newPos[1] - cs.center[1], newPos[2] - cs.center[2]]
            let distanceSquare = N[0]*N[0] + N[1]*N[1] + N[2]*N[2];

            let radiusSquare = cs.radius * cs.radius;
            
            if (distanceSquare < radiusSquare)  //there is collision
            {
                normalizeVec3(N);
                let scalarFN = scalarPorductVec3(N, force);
                let scalarVN = scalarPorductVec3(N, velocity);

                let T = [0,0,0];
                let unconstrainedForce;
                let constrainedForce;
                let outputF = [0,0,0];

                for(let i = 0; i < 3; i++ )
                {
                    T[i] = cs.center[i] + cs.radius * N[i]; 
                    unconstrainedForce = force[i] - scalarFN*N[i];
                    constrainedForce = - (strength * newPos[i]*T[i] + c*scalarVN ) * N[i];
                    outputF[i] = unconstrainedForce + constrainedForce;
                }


                var acceleration = [outputF[0] / this.mass, outputF[1] / this.mass, outputF[2] / this.mass];
                velocity[0] = velocity[0] + acceleration[0] * delta;
                velocity[1] = velocity[1] + acceleration[1] * delta;
                velocity[2] = velocity[2] + acceleration[2] * delta;

                velocity[0] = velocity[0] -  scalarVN * N[0];
                velocity[1] = velocity[1] -  scalarVN * N[1];
                velocity[2] = velocity[2] -  scalarVN * N[2];

                let finalPos = [newPos[0] + velocity[0] * delta, newPos[1] + velocity[1] * delta, newPos[2] + velocity[2] * delta]
                //let finalPos = [position[0] + velocity[0] * delta, position[1] + velocity[1] * delta, position[2] + velocity[2] * delta]

                return {position: finalPos, velocity: velocity};

            }
        }

        return {position: newPos, velocity: velocity};

    }

    showLines( bool ){
        for (let i = 0; i < this.lines.length; i++ ){
            this.lines[i].visible = bool;
        }
    }
    
}
