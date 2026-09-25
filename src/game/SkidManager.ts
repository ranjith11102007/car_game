import * as THREE from 'three';

interface SkidQuad {
  active: boolean;
  alpha: number;
  matrix: THREE.Matrix4;
}

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  opacity: number;
}

export class SkidManager {
  private scene: THREE.Scene;

  // Skid Marks via InstancedMesh for max 60fps performance
  private maxSkidSegments = 600;
  private skidMesh: THREE.InstancedMesh;
  private skidQuads: SkidQuad[] = [];
  private skidHead = 0;
  private lastLeftPos: THREE.Vector3 | null = null;
  private lastRightPos: THREE.Vector3 | null = null;
  private minDistanceBetweenSkids = 0.55;

  // Smoke & Spray Particles
  private maxParticles = 300;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private particlePoints: THREE.Points;
  private particles: Particle[] = [];
  private particlePositions: Float32Array;
  private particleColors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Skid marks instanced mesh
    // A small rectangle ribbon segment
    const quadGeo = new THREE.PlaneGeometry(0.28, 0.7);
    quadGeo.rotateX(-Math.PI / 2);

    const quadMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    this.skidMesh = new THREE.InstancedMesh(quadGeo, quadMat, this.maxSkidSegments);
    this.skidMesh.frustumCulled = false;

    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxSkidSegments; i++) {
      this.skidQuads.push({
        active: false,
        alpha: 0,
        matrix: new THREE.Matrix4(),
      });
      this.skidMesh.setMatrixAt(i, zeroMatrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.skidMesh);

    // 2. Smoke & Spray particle system
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleColors = new Float32Array(this.maxParticles * 3);

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    this.particleMat = new THREE.PointsMaterial({
      size: 0.65,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.particlePoints = new THREE.Points(this.particleGeo, this.particleMat);
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);
  }

  public addSkidMark(leftTire: THREE.Vector3, rightTire: THREE.Vector3, heading: number) {
    // Left tire skid
    if (!this.lastLeftPos || this.lastLeftPos.distanceTo(leftTire) >= this.minDistanceBetweenSkids) {
      this.spawnQuad(leftTire, heading);
      this.lastLeftPos = leftTire.clone();
    }

    // Right tire skid
    if (!this.lastRightPos || this.lastRightPos.distanceTo(rightTire) >= this.minDistanceBetweenSkids) {
      this.spawnQuad(rightTire, heading);
      this.lastRightPos = rightTire.clone();
    }
  }

  private spawnQuad(pos: THREE.Vector3, heading: number) {
    const idx = this.skidHead;
    this.skidHead = (this.skidHead + 1) % this.maxSkidSegments;

    const dummy = new THREE.Object3D();
    dummy.position.set(pos.x, 0.025, pos.z);
    dummy.rotation.y = heading;
    dummy.updateMatrix();

    this.skidQuads[idx].active = true;
    this.skidQuads[idx].alpha = 0.85;
    this.skidQuads[idx].matrix.copy(dummy.matrix);

    this.skidMesh.setMatrixAt(idx, dummy.matrix);
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  public emitTireSmoke(pos: THREE.Vector3, count: number = 2, isRain: boolean = false) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.1 + Math.random() * 0.1,
        (Math.random() - 0.5) * 0.4
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.5
      );

      const color = isRain
        ? new THREE.Color(0x9fc2e6) // Bluish water spray
        : new THREE.Color(0xe8ebed); // White/grey tire smoke

      this.particles.push({
        pos: pos.clone().add(offset),
        vel,
        size: isRain ? 0.35 : 0.65,
        life: 0,
        maxLife: isRain ? 0.5 : 0.85,
        color,
        opacity: isRain ? 0.5 : 0.75,
      });
    }
  }

  public update(dt: number) {
    // 1. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.vel.y += 0.2 * dt; // slight buoyant rise
      p.vel.multiplyScalar(0.96); // drag
      p.size += dt * 0.8; // expand as it dissipates
    }

    // Write to particle buffer
    const pCount = this.particles.length;
    for (let i = 0; i < pCount; i++) {
      const p = this.particles[i];
      const idx = i * 3;
      this.particlePositions[idx + 0] = p.pos.x;
      this.particlePositions[idx + 1] = p.pos.y;
      this.particlePositions[idx + 2] = p.pos.z;

      const fade = 1 - p.life / p.maxLife;
      this.particleColors[idx + 0] = p.color.r * fade;
      this.particleColors[idx + 1] = p.color.g * fade;
      this.particleColors[idx + 2] = p.color.b * fade;
    }

    // Clear remainder of buffer
    for (let i = pCount; i < this.maxParticles; i++) {
      const idx = i * 3;
      this.particlePositions[idx + 0] = 0;
      this.particlePositions[idx + 1] = -100;
      this.particlePositions[idx + 2] = 0;
    }

    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;
  }
}
