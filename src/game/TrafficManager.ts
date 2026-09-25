import * as THREE from 'three';
import { CITY_CONFIG } from '../constants';

interface TrafficCar {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  direction: 'north' | 'south' | 'east' | 'west';
  speed: number;
  maxSpeed: number;
  length: number;
  color: number;
  headlights: THREE.MeshBasicMaterial;
  taillights: THREE.MeshBasicMaterial;
}

export class TrafficManager {
  public scene: THREE.Scene;
  public cars: TrafficCar[] = [];
  private maxCars = 24;
  private spawnTimer = 0;

  // Shared geometries
  private bodySedanGeo = new THREE.BoxGeometry(1.8, 0.55, 4.2);
  private roofSedanGeo = new THREE.BoxGeometry(1.4, 0.5, 2.3);
  private wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 12);
  private wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.9 });
  private glassMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.8 });

  private carColors = [
    0xd97706, // Taxi yellow/amber
    0xdc2626, // Crimson red
    0x2563eb, // Royal blue
    0x475569, // Slate grey
    0xe2e8f0, // White pearl
    0x0f172a, // Obsidian black
    0x059669, // Emerald green
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.wheelGeo.rotateZ(Math.PI / 2);
  }

  public init(playerPos: THREE.Vector3) {
    // Pre-populate with traffic around the city
    for (let i = 0; i < this.maxCars; i++) {
      this.spawnCarRandom(playerPos, 45, 280);
    }
  }

  private createCarMesh(colorHex: number): { mesh: THREE.Group; hlMat: THREE.MeshBasicMaterial; tlMat: THREE.MeshBasicMaterial } {
    const group = new THREE.Group();

    const paintMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.35,
      metalness: 0.4,
    });

    // Lower body
    const body = new THREE.Mesh(this.bodySedanGeo, paintMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    // Roof & cabin
    const roof = new THREE.Mesh(this.roofSedanGeo, this.glassMat);
    roof.position.set(0, 0.92, -0.15);
    group.add(roof);

    // Taxi roof sign if taxi
    if (colorHex === 0xd97706) {
      const signGeo = new THREE.BoxGeometry(0.5, 0.18, 0.25);
      const signMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, 1.25, -0.15);
      group.add(sign);
    }

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);

    const hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.6, 0.5, -2.12);
    group.add(hlL);

    const hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(0.6, 0.5, -2.12);
    group.add(hlR);

    // Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
    const tlGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);

    const tlL = new THREE.Mesh(tlGeo, tlMat);
    tlL.position.set(-0.6, 0.55, 2.12);
    group.add(tlL);

    const tlR = new THREE.Mesh(tlGeo, tlMat);
    tlR.position.set(0.6, 0.55, 2.12);
    group.add(tlR);

    // 4 Wheels
    const wFL = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    wFL.position.set(-0.85, 0.32, -1.3);
    group.add(wFL);

    const wFR = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    wFR.position.set(0.85, 0.32, -1.3);
    group.add(wFR);

    const wRL = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    wRL.position.set(-0.85, 0.32, 1.3);
    group.add(wRL);

    const wRR = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    wRR.position.set(0.85, 0.32, 1.3);
    group.add(wRR);

    return { mesh: group, hlMat, tlMat };
  }

  private spawnCarRandom(playerPos: THREE.Vector3, minDist: number, maxDist: number) {
    const half = CITY_CONFIG.GRID_HALF_EXTENT;
    const step = CITY_CONFIG.BLOCK_SIZE;
    const roadW = CITY_CONFIG.ROAD_WIDTH;

    // Pick random avenue: either East-West (X road) or North-South (Z road)
    const isXRoad = Math.random() > 0.5;
    const gridIndex = Math.floor((Math.random() - 0.5) * (half * 2 + 1));
    const laneOffset = (roadW * 0.25) * (Math.random() > 0.5 ? 1 : -1);

    let x = 0;
    let z = 0;
    let direction: 'north' | 'south' | 'east' | 'west' = 'east';
    let heading = 0;

    if (isXRoad) {
      z = gridIndex * step + laneOffset;
      x = playerPos.x + (Math.random() > 0.5 ? 1 : -1) * (minDist + Math.random() * (maxDist - minDist));
      if (laneOffset > 0) {
        direction = 'east'; // Moving +X
        heading = -Math.PI / 2;
      } else {
        direction = 'west'; // Moving -X
        heading = Math.PI / 2;
      }
    } else {
      x = gridIndex * step + laneOffset;
      z = playerPos.z + (Math.random() > 0.5 ? 1 : -1) * (minDist + Math.random() * (maxDist - minDist));
      if (laneOffset > 0) {
        direction = 'south'; // Moving +Z
        heading = Math.PI;
      } else {
        direction = 'north'; // Moving -Z
        heading = 0;
      }
    }

    const pos = new THREE.Vector3(x, 0, z);

    // Don't spawn too close to player
    if (pos.distanceTo(playerPos) < minDist) return;

    const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];
    const { mesh, hlMat, tlMat } = this.createCarMesh(color);
    mesh.position.copy(pos);
    mesh.rotation.y = heading;
    this.scene.add(mesh);

    this.cars.push({
      mesh,
      pos,
      direction,
      speed: 10 + Math.random() * 8, // ~36 to 65 km/h
      maxSpeed: 10 + Math.random() * 8,
      length: 4.2,
      color,
      headlights: hlMat,
      taillights: tlMat,
    });
  }

  public update(dt: number, playerPos: THREE.Vector3, isNightOrRain: boolean) {
    const cityLimit = CITY_CONFIG.GRID_HALF_EXTENT * CITY_CONFIG.BLOCK_SIZE + 100;

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];

      // Move car along its direction
      let vx = 0;
      let vz = 0;
      if (car.direction === 'east') vx = car.speed;
      else if (car.direction === 'west') vx = -car.speed;
      else if (car.direction === 'south') vz = car.speed;
      else if (car.direction === 'north') vz = -car.speed;

      // Check distance to player (avoid rear-ending player if player is directly ahead)
      const distToPlayer = car.pos.distanceTo(playerPos);
      let targetSpeed = car.maxSpeed;

      if (distToPlayer < 12) {
        // Slow down if heading towards player
        targetSpeed = 0;
      }

      car.speed = THREE.MathUtils.lerp(car.speed, targetSpeed, dt * 4);
      car.pos.x += vx * dt;
      car.pos.z += vz * dt;

      car.mesh.position.copy(car.pos);

      // Night/Rain lights
      car.headlights.color.setHex(isNightOrRain ? 0xffffff : 0x444444);
      if (car.speed < 2) {
        car.taillights.color.setHex(0xff1111); // brake light
      } else {
        car.taillights.color.setHex(isNightOrRain ? 0x881111 : 0x220000);
      }

      // Check if car is too far from player or outside bounds -> respawn ahead
      if (distToPlayer > 340 || Math.abs(car.pos.x) > cityLimit || Math.abs(car.pos.z) > cityLimit) {
        this.scene.remove(car.mesh);
        this.cars.splice(i, 1);
        this.spawnCarRandom(playerPos, 90, 220);
      }
    }

    // Keep population healthy
    this.spawnTimer += dt;
    if (this.spawnTimer > 2.0) {
      this.spawnTimer = 0;
      if (this.cars.length < this.maxCars) {
        this.spawnCarRandom(playerPos, 70, 240);
      }
    }
  }
}
