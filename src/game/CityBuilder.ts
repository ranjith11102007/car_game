import * as THREE from 'three';
import { CITY_CONFIG } from '../constants';
import { EnvironmentManager } from './EnvironmentManager';

export interface CollisionObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  type: 'building' | 'barrier' | 'pillar';
}

export interface RoadSegment {
  type: 'x-road' | 'z-road' | 'intersection';
  x: number;
  z: number;
  width: number;
  length: number;
}

export class CityBuilder {
  public scene: THREE.Scene;
  public envManager: EnvironmentManager;
  public obstacles: CollisionObstacle[] = [];
  public roads: RoadSegment[] = [];
  public cityRoot: THREE.Group;

  // Shared geometry & materials for high rendering performance
  private roadMaterial: THREE.MeshStandardMaterial;
  private sidewalkMaterial: THREE.MeshStandardMaterial;
  private whiteLineMaterial: THREE.MeshBasicMaterial;
  private yellowLineMaterial: THREE.MeshBasicMaterial;
  private crosswalkMaterial: THREE.MeshBasicMaterial;
  private curbMaterial: THREE.MeshStandardMaterial;
  private grassMaterial: THREE.MeshStandardMaterial;
  private lampPostMaterial: THREE.MeshStandardMaterial;
  private lampHeadMaterial: THREE.MeshBasicMaterial;
  private barkMaterial: THREE.MeshStandardMaterial;
  private leavesMaterial: THREE.MeshStandardMaterial;
  private windowMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, envManager: EnvironmentManager) {
    this.scene = scene;
    this.envManager = envManager;
    this.cityRoot = new THREE.Group();
    this.scene.add(this.cityRoot);

    // Realistic PBR materials
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x282c34,
      roughness: 0.82,
      metalness: 0.08,
    });
    this.envManager.roadMaterials.push(this.roadMaterial);

    this.sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fa4ab,
      roughness: 0.88,
      metalness: 0.04,
    });

    this.curbMaterial = new THREE.MeshStandardMaterial({
      color: 0x737880,
      roughness: 0.9,
    });

    this.grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5c34,
      roughness: 0.95,
      metalness: 0.0,
    });

    this.whiteLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.yellowLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffbe1a });
    this.crosswalkMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });

    this.lampPostMaterial = new THREE.MeshStandardMaterial({
      color: 0x33373d,
      roughness: 0.5,
      metalness: 0.8,
    });

    this.lampHeadMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
    });
    this.envManager.streetLightMaterials.push(this.lampHeadMaterial);

    this.barkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    this.leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2d6328, roughness: 0.8 });

    this.windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4856,
      emissive: 0xffe699,
      emissiveIntensity: 0.08,
      roughness: 0.3,
      metalness: 0.6,
    });
    this.envManager.windowMaterials.push(this.windowMaterial);
  }

  public build() {
    this.buildGroundBase();
    this.buildRoadNetwork();
    this.buildBuildingsAndBlocks();
    this.buildBridgesAndOverpasses();
    this.buildDistantSkyline();
  }

  private buildGroundBase() {
    const totalSize = (CITY_CONFIG.GRID_HALF_EXTENT * 2 + 1) * CITY_CONFIG.BLOCK_SIZE + 200;
    const groundGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.grassMaterial);
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.cityRoot.add(ground);
  }

  private buildRoadNetwork() {
    const half = CITY_CONFIG.GRID_HALF_EXTENT;
    const step = CITY_CONFIG.BLOCK_SIZE;
    const roadW = CITY_CONFIG.ROAD_WIDTH;
    const totalSpan = half * 2 * step + step;

    // Build East-West roads (along X)
    for (let i = -half; i <= half; i++) {
      const z = i * step;

      // Road asphalt surface
      const roadGeo = new THREE.PlaneGeometry(totalSpan, roadW);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial);
      roadMesh.position.set(0, 0.01, z);
      roadMesh.receiveShadow = true;
      this.cityRoot.add(roadMesh);

      this.roads.push({
        type: 'x-road',
        x: 0,
        z,
        width: roadW,
        length: totalSpan,
      });

      // Road markings along X
      this.buildRoadMarkingsX(totalSpan, z, roadW);

      // Sidewalks along X
      this.buildSidewalksX(totalSpan, z, roadW);
    }

    // Build North-South roads (along Z)
    for (let i = -half; i <= half; i++) {
      const x = i * step;

      // Road asphalt surface
      const roadGeo = new THREE.PlaneGeometry(roadW, totalSpan);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial);
      roadMesh.position.set(x, 0.01, 0);
      roadMesh.receiveShadow = true;
      this.cityRoot.add(roadMesh);

      this.roads.push({
        type: 'z-road',
        x,
        z: 0,
        width: roadW,
        length: totalSpan,
      });

      // Road markings along Z
      this.buildRoadMarkingsZ(x, totalSpan, roadW);

      // Sidewalks along Z
      this.buildSidewalksZ(x, totalSpan, roadW);
    }

    // Build intersections with crosswalks and traffic lights
    for (let ix = -half; ix <= half; ix++) {
      for (let iz = -half; iz <= half; iz++) {
        const x = ix * step;
        const z = iz * step;
        this.buildIntersectionDetails(x, z, roadW);
      }
    }
  }

  private buildRoadMarkingsX(totalSpan: number, z: number, roadW: number) {
    const markingGroup = new THREE.Group();

    // Double yellow center lines
    const yellowGeo = new THREE.PlaneGeometry(totalSpan, 0.18);
    yellowGeo.rotateX(-Math.PI / 2);

    const yellow1 = new THREE.Mesh(yellowGeo, this.yellowLineMaterial);
    yellow1.position.set(0, 0.02, z - 0.22);
    markingGroup.add(yellow1);

    const yellow2 = new THREE.Mesh(yellowGeo, this.yellowLineMaterial);
    yellow2.position.set(0, 0.02, z + 0.22);
    markingGroup.add(yellow2);

    // Dashed white lane lines
    // Lane 1 divider (+roadW/4) and Lane 2 divider (-roadW/4)
    const dashLength = 3.5;
    const dashGap = 5.0;
    const dashCount = Math.floor(totalSpan / (dashLength + dashGap));

    const singleDashGeo = new THREE.PlaneGeometry(dashLength, 0.16);
    singleDashGeo.rotateX(-Math.PI / 2);

    const dashesMesh = new THREE.InstancedMesh(singleDashGeo, this.whiteLineMaterial, dashCount * 2);
    const dummy = new THREE.Object3D();
    let instIdx = 0;

    const startX = -totalSpan / 2 + dashLength;
    for (let i = 0; i < dashCount; i++) {
      const px = startX + i * (dashLength + dashGap);
      // Skip inside intersections to avoid drawing dashes across intersection centers
      const modX = Math.abs(px % CITY_CONFIG.BLOCK_SIZE);
      if (modX < roadW * 0.65 || modX > CITY_CONFIG.BLOCK_SIZE - roadW * 0.65) continue;

      // Positive side lane divider
      dummy.position.set(px, 0.02, z + roadW * 0.25);
      dummy.updateMatrix();
      dashesMesh.setMatrixAt(instIdx++, dummy.matrix);

      // Negative side lane divider
      dummy.position.set(px, 0.02, z - roadW * 0.25);
      dummy.updateMatrix();
      dashesMesh.setMatrixAt(instIdx++, dummy.matrix);
    }
    dashesMesh.count = instIdx;
    dashesMesh.instanceMatrix.needsUpdate = true;
    markingGroup.add(dashesMesh);

    // Solid white edge lines near curbs
    const edgeGeo = new THREE.PlaneGeometry(totalSpan, 0.2);
    edgeGeo.rotateX(-Math.PI / 2);

    const edgeNorth = new THREE.Mesh(edgeGeo, this.whiteLineMaterial);
    edgeNorth.position.set(0, 0.02, z - roadW * 0.46);
    markingGroup.add(edgeNorth);

    const edgeSouth = new THREE.Mesh(edgeGeo, this.whiteLineMaterial);
    edgeSouth.position.set(0, 0.02, z + roadW * 0.46);
    markingGroup.add(edgeSouth);

    this.cityRoot.add(markingGroup);
  }

  private buildRoadMarkingsZ(x: number, totalSpan: number, roadW: number) {
    const markingGroup = new THREE.Group();

    // Double yellow center lines
    const yellowGeo = new THREE.PlaneGeometry(0.18, totalSpan);
    yellowGeo.rotateX(-Math.PI / 2);

    const yellow1 = new THREE.Mesh(yellowGeo, this.yellowLineMaterial);
    yellow1.position.set(x - 0.22, 0.02, 0);
    markingGroup.add(yellow1);

    const yellow2 = new THREE.Mesh(yellowGeo, this.yellowLineMaterial);
    yellow2.position.set(x + 0.22, 0.02, 0);
    markingGroup.add(yellow2);

    // Dashed white lane lines
    const dashLength = 3.5;
    const dashGap = 5.0;
    const dashCount = Math.floor(totalSpan / (dashLength + dashGap));

    const singleDashGeo = new THREE.PlaneGeometry(0.16, dashLength);
    singleDashGeo.rotateX(-Math.PI / 2);

    const dashesMesh = new THREE.InstancedMesh(singleDashGeo, this.whiteLineMaterial, dashCount * 2);
    const dummy = new THREE.Object3D();
    let instIdx = 0;

    const startZ = -totalSpan / 2 + dashLength;
    for (let i = 0; i < dashCount; i++) {
      const pz = startZ + i * (dashLength + dashGap);
      const modZ = Math.abs(pz % CITY_CONFIG.BLOCK_SIZE);
      if (modZ < roadW * 0.65 || modZ > CITY_CONFIG.BLOCK_SIZE - roadW * 0.65) continue;

      dummy.position.set(x + roadW * 0.25, 0.02, pz);
      dummy.updateMatrix();
      dashesMesh.setMatrixAt(instIdx++, dummy.matrix);

      dummy.position.set(x - roadW * 0.25, 0.02, pz);
      dummy.updateMatrix();
      dashesMesh.setMatrixAt(instIdx++, dummy.matrix);
    }
    dashesMesh.count = instIdx;
    dashesMesh.instanceMatrix.needsUpdate = true;
    markingGroup.add(dashesMesh);

    // Solid white edge lines near curbs
    const edgeGeo = new THREE.PlaneGeometry(0.2, totalSpan);
    edgeGeo.rotateX(-Math.PI / 2);

    const edgeWest = new THREE.Mesh(edgeGeo, this.whiteLineMaterial);
    edgeWest.position.set(x - roadW * 0.46, 0.02, 0);
    markingGroup.add(edgeWest);

    const edgeEast = new THREE.Mesh(edgeGeo, this.whiteLineMaterial);
    edgeEast.position.set(x + roadW * 0.46, 0.02, 0);
    markingGroup.add(edgeEast);

    this.cityRoot.add(markingGroup);
  }

  private buildSidewalksX(totalSpan: number, z: number, roadW: number) {
    const swW = CITY_CONFIG.SIDEWALK_WIDTH;
    const curbH = 0.22;

    const swGeo = new THREE.BoxGeometry(totalSpan, curbH, swW);

    // North sidewalk
    const swNorth = new THREE.Mesh(swGeo, this.sidewalkMaterial);
    swNorth.position.set(0, curbH / 2, z - (roadW / 2 + swW / 2));
    swNorth.receiveShadow = true;
    this.cityRoot.add(swNorth);

    // South sidewalk
    const swSouth = new THREE.Mesh(swGeo, this.sidewalkMaterial);
    swSouth.position.set(0, curbH / 2, z + (roadW / 2 + swW / 2));
    swSouth.receiveShadow = true;
    this.cityRoot.add(swSouth);

    // Street lamps and trees along the sidewalk
    const lampSpacing = CITY_CONFIG.STREET_LAMP_SPACING;
    const count = Math.floor(totalSpan / lampSpacing);
    for (let i = 0; i < count; i++) {
      const px = -totalSpan / 2 + i * lampSpacing + lampSpacing * 0.5;
      const modX = Math.abs(px % CITY_CONFIG.BLOCK_SIZE);
      if (modX < roadW) continue; // Skip in intersections

      // Alternate north/south
      const sideZ = (i % 2 === 0 ? 1 : -1) * (roadW / 2 + swW * 0.5);
      this.buildStreetLamp(px, sideZ, i % 2 === 0 ? 0 : Math.PI);

      if (i % 3 === 0) {
        const treeZ = (i % 2 === 0 ? -1 : 1) * (roadW / 2 + swW * 0.5);
        this.buildTree(px + 8, treeZ);
      }
    }
  }

  private buildSidewalksZ(x: number, totalSpan: number, roadW: number) {
    const swW = CITY_CONFIG.SIDEWALK_WIDTH;
    const curbH = 0.22;

    const swGeo = new THREE.BoxGeometry(swW, curbH, totalSpan);

    const swWest = new THREE.Mesh(swGeo, this.sidewalkMaterial);
    swWest.position.set(x - (roadW / 2 + swW / 2), curbH / 2, 0);
    swWest.receiveShadow = true;
    this.cityRoot.add(swWest);

    const swEast = new THREE.Mesh(swGeo, this.sidewalkMaterial);
    swEast.position.set(x + (roadW / 2 + swW / 2), curbH / 2, 0);
    swEast.receiveShadow = true;
    this.cityRoot.add(swEast);
  }

  private buildIntersectionDetails(x: number, z: number, roadW: number) {
    const group = new THREE.Group();

    // 4 Crosswalks (North, South, East, West entry into intersection)
    const stripeW = 0.55;
    const stripeL = 3.6;
    const stripeGap = 0.95;
    const stripeCount = 14;

    const stripeGeo = new THREE.PlaneGeometry(stripeL, stripeW);
    stripeGeo.rotateX(-Math.PI / 2);

    // North & South crosswalks
    for (let side = -1; side <= 1; side += 2) {
      const cz = z + side * (roadW * 0.5 + stripeL * 0.5);
      for (let s = 0; s < stripeCount; s++) {
        const sx = x - (stripeCount * stripeGap) / 2 + s * stripeGap;
        const stripe = new THREE.Mesh(stripeGeo, this.crosswalkMaterial);
        stripe.position.set(sx, 0.025, cz);
        group.add(stripe);
      }
    }

    // East & West crosswalks (rotated 90 deg)
    const stripeGeoRot = new THREE.PlaneGeometry(stripeW, stripeL);
    stripeGeoRot.rotateX(-Math.PI / 2);

    for (let side = -1; side <= 1; side += 2) {
      const cx = x + side * (roadW * 0.5 + stripeL * 0.5);
      for (let s = 0; s < stripeCount; s++) {
        const sz = z - (stripeCount * stripeGap) / 2 + s * stripeGap;
        const stripe = new THREE.Mesh(stripeGeoRot, this.crosswalkMaterial);
        stripe.position.set(cx, 0.025, sz);
        group.add(stripe);
      }
    }

    // Traffic light posts at intersection 4 corners
    const cornerOffset = roadW * 0.5 + 2.0;
    this.buildTrafficLight(x + cornerOffset, z + cornerOffset, group, Math.PI);
    this.buildTrafficLight(x - cornerOffset, z - cornerOffset, group, 0);
    this.buildTrafficLight(x - cornerOffset, z + cornerOffset, group, Math.PI / 2);
    this.buildTrafficLight(x + cornerOffset, z - cornerOffset, group, -Math.PI / 2);

    this.cityRoot.add(group);
  }

  private buildTrafficLight(x: number, z: number, parent: THREE.Group, rotation: number) {
    const postGroup = new THREE.Group();
    postGroup.position.set(x, 0, z);
    postGroup.rotation.y = rotation;

    // Vertical pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.5, 8);
    const pole = new THREE.Mesh(poleGeo, this.lampPostMaterial);
    pole.position.y = 2.75;
    postGroup.add(pole);

    // Horizontal arm reaching over lane
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.0, 8);
    armGeo.rotateZ(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, this.lampPostMaterial);
    arm.position.set(2.0, 5.2, 0);
    postGroup.add(arm);

    // Traffic signal housing
    const boxGeo = new THREE.BoxGeometry(0.4, 1.2, 0.35);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
    const signalBox = new THREE.Mesh(boxGeo, boxMat);
    signalBox.position.set(3.6, 4.8, 0);
    postGroup.add(signalBox);

    // Red, yellow, green lenses
    const lensGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x443300 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x004411 });

    const red = new THREE.Mesh(lensGeo, redMat);
    red.position.set(3.6, 5.15, -0.16);
    postGroup.add(red);

    const yellow = new THREE.Mesh(lensGeo, yellowMat);
    yellow.position.set(3.6, 4.8, -0.16);
    postGroup.add(yellow);

    const green = new THREE.Mesh(lensGeo, greenMat);
    green.position.set(3.6, 4.45, -0.16);
    postGroup.add(green);

    parent.add(postGroup);
  }

  private buildStreetLamp(x: number, z: number, rotation: number) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);
    lampGroup.rotation.y = rotation;

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const pole = new THREE.Mesh(poleGeo, this.lampPostMaterial);
    pole.position.y = 3.75;
    lampGroup.add(pole);

    // Curved arm
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    armGeo.rotateZ(Math.PI / 3);
    const arm = new THREE.Mesh(armGeo, this.lampPostMaterial);
    arm.position.set(0.9, 7.2, 0);
    lampGroup.add(arm);

    // Lamp fixture
    const headGeo = new THREE.ConeGeometry(0.35, 0.4, 8);
    headGeo.rotateX(Math.PI);
    const head = new THREE.Mesh(headGeo, this.lampHeadMaterial);
    head.position.set(1.8, 6.8, 0);
    lampGroup.add(head);

    this.cityRoot.add(lampGroup);
  }

  private buildTree(x: number, z: number) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunkH = 2.8 + Math.random() * 0.8;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, trunkH, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.barkMaterial);
    trunk.position.y = trunkH / 2;
    treeGroup.add(trunk);

    // Foliage (layered geometric spheres for clean modern low-poly urban aesthetic)
    const foliageH = trunkH + 1.2;
    const foliageGeo = new THREE.DodecahedronGeometry(1.6 + Math.random() * 0.4, 1);
    const foliage = new THREE.Mesh(foliageGeo, this.leavesMaterial);
    foliage.position.y = foliageH;
    foliage.castShadow = true;
    treeGroup.add(foliage);

    const foliageTopGeo = new THREE.DodecahedronGeometry(1.1, 1);
    const foliageTop = new THREE.Mesh(foliageTopGeo, this.leavesMaterial);
    foliageTop.position.y = foliageH + 1.2;
    foliageTop.castShadow = true;
    treeGroup.add(foliageTop);

    this.cityRoot.add(treeGroup);
  }

  private buildBuildingsAndBlocks() {
    const half = CITY_CONFIG.GRID_HALF_EXTENT;
    const step = CITY_CONFIG.BLOCK_SIZE;
    const roadW = CITY_CONFIG.ROAD_WIDTH;
    const swW = CITY_CONFIG.SIDEWALK_WIDTH;

    // Usable block interior area
    const usableBlockSize = step - (roadW + swW * 2 + 3);

    // Palette of modern city architectural building materials
    const buildingColors = [
      0x4a5568, // Slate graphite
      0x2d3748, // Deep obsidian
      0x718096, // Brushed steel
      0x8b9bb4, // Glass blue-grey
      0xcad2c5, // Off-white concrete
      0x354f52, // Dark teal corporate
      0x52796f, // Modern mint architectural
      0x3b3d45, // Carbon dark
      0x5c677d, // Midnight slate
    ];

    for (let ix = -half; ix < half; ix++) {
      for (let iz = -half; iz < half; iz++) {
        const blockCenterX = ix * step + step / 2;
        const blockCenterZ = iz * step + step / 2;

        // Skip center block for special plaza / high-speed start area
        const isCenterBlock = ix === 0 && iz === 0;

        if (isCenterBlock) {
          this.buildPlazaBlock(blockCenterX, blockCenterZ, usableBlockSize);
          continue;
        }

        // Subdivide each block into 2 to 4 distinct buildings
        this.buildBlockBuildings(blockCenterX, blockCenterZ, usableBlockSize, buildingColors);
      }
    }
  }

  private buildPlazaBlock(cx: number, cz: number, size: number) {
    // Elegant civic plaza with parking spots, fountain, and twin corporate towers on sides
    const plazaGeo = new THREE.BoxGeometry(size, 0.3, size);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c4, roughness: 0.6 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(cx, 0.15, cz);
    plaza.receiveShadow = true;
    this.cityRoot.add(plaza);

    // Twin towers on the North & South sides of the plaza
    const towerW = size * 0.4;
    const towerD = size * 0.35;
    const towerH = 65;

    for (let side = -1; side <= 1; side += 2) {
      const tz = cz + side * (size * 0.28);
      this.createSkyscraper(cx, tz, towerW, towerD, towerH, 0x2b3848);
    }

    // Plaza fountain in center
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.5, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x485868, roughness: 0.4 })
    );
    fountainBase.position.set(cx, 0.4, cz);
    this.cityRoot.add(fountainBase);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.2, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x1f78b4, roughness: 0.1, metalness: 0.8 })
    );
    water.position.set(cx, 0.8, cz);
    this.cityRoot.add(water);

    // Add collision for towers
    for (let side = -1; side <= 1; side += 2) {
      const tz = cz + side * (size * 0.28);
      this.obstacles.push({
        minX: cx - towerW / 2 - 0.5,
        maxX: cx + towerW / 2 + 0.5,
        minZ: tz - towerD / 2 - 0.5,
        maxZ: tz + towerD / 2 + 0.5,
        type: 'building',
      });
    }
  }

  private buildBlockBuildings(cx: number, cz: number, size: number, colors: number[]) {
    // Divide into 4 quadrants or 2 large buildings
    const splitType = (Math.abs(cx * 13 + cz * 7) % 3);

    if (splitType === 0) {
      // 4 quadrant buildings with internal alleyway
      const bSize = size * 0.46;
      const offset = size * 0.25;

      const offsets = [
        [-offset, -offset],
        [offset, -offset],
        [-offset, offset],
        [offset, offset],
      ];

      for (const [ox, oz] of offsets) {
        const bx = cx + ox;
        const bz = cz + oz;
        const height = CITY_CONFIG.BUILDING_HEIGHT_MIN + Math.random() * (CITY_CONFIG.BUILDING_HEIGHT_MAX - CITY_CONFIG.BUILDING_HEIGHT_MIN);
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.createSkyscraper(bx, bz, bSize, bSize, height, color);

        this.obstacles.push({
          minX: bx - bSize / 2 - 0.5,
          maxX: bx + bSize / 2 + 0.5,
          minZ: bz - bSize / 2 - 0.5,
          maxZ: bz + bSize / 2 + 0.5,
          type: 'building',
        });
      }
    } else if (splitType === 1) {
      // 2 long avenue buildings
      const bW = size * 0.94;
      const bD = size * 0.44;
      const offsetZ = size * 0.25;

      for (const oz of [-offsetZ, offsetZ]) {
        const bz = cz + oz;
        const height = CITY_CONFIG.BUILDING_HEIGHT_MIN + Math.random() * 45;
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.createSkyscraper(cx, bz, bW, bD, height, color);

        this.obstacles.push({
          minX: cx - bW / 2 - 0.5,
          maxX: cx + bW / 2 + 0.5,
          minZ: bz - bD / 2 - 0.5,
          maxZ: bz + bD / 2 + 0.5,
          type: 'building',
        });
      }
    } else {
      // 1 major central tower with parking lot and small retail unit
      const towerSize = size * 0.65;
      const height = CITY_CONFIG.BUILDING_HEIGHT_MIN + 25 + Math.random() * (CITY_CONFIG.BUILDING_HEIGHT_MAX - 25);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const bx = cx - size * 0.15;
      const bz = cz - size * 0.15;
      this.createSkyscraper(bx, bz, towerSize, towerSize, height, color);

      this.obstacles.push({
        minX: bx - towerSize / 2 - 0.5,
        maxX: bx + towerSize / 2 + 0.5,
        minZ: bz - towerSize / 2 - 0.5,
        maxZ: bz + towerSize / 2 + 0.5,
        type: 'building',
      });

      // Small parking lot & trees in remaining space
      const parkingX = cx + size * 0.3;
      const parkingZ = cz + size * 0.3;
      this.buildTree(parkingX, parkingZ);
      this.buildTree(parkingX - 10, parkingZ);
    }
  }

  private createSkyscraper(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    color: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Main tower volume
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.25,
    });

    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = height / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Architectural crown / upper setback
    if (height > 35) {
      const crownH = 5 + Math.random() * 8;
      const crownGeo = new THREE.BoxGeometry(width * 0.75, crownH, depth * 0.75);
      const crown = new THREE.Mesh(crownGeo, bodyMat);
      crown.position.y = height + crownH / 2;
      group.add(crown);

      // Antenna / Spire on tall towers
      if (height > 55) {
        const antennaGeo = new THREE.CylinderGeometry(0.1, 0.25, 12, 6);
        const antennaMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.position.y = height + crownH + 6;
        group.add(antenna);
      }
    }

    // Windows rows (emissive glass that turns on at night!)
    const windowCols = Math.floor(width / 3.8);
    const windowRows = Math.floor(height / 4.2);

    if (windowCols > 1 && windowRows > 2) {
      const winGeo = new THREE.PlaneGeometry(1.6, 2.2);

      // Windows along North and South facades
      const northSouthMesh = new THREE.InstancedMesh(winGeo, this.windowMaterial, windowCols * windowRows * 2);
      const dummy = new THREE.Object3D();
      let winIdx = 0;

      const colStep = width / (windowCols + 1);
      const rowStep = height / (windowRows + 1);

      for (let r = 1; r <= windowRows; r++) {
        const wy = r * rowStep;
        for (let c = 1; c <= windowCols; c++) {
          const wx = -width / 2 + c * colStep;

          // South face
          dummy.position.set(wx, wy, depth / 2 + 0.05);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          northSouthMesh.setMatrixAt(winIdx++, dummy.matrix);

          // North face
          dummy.position.set(wx, wy, -depth / 2 - 0.05);
          dummy.rotation.set(0, Math.PI, 0);
          dummy.updateMatrix();
          northSouthMesh.setMatrixAt(winIdx++, dummy.matrix);
        }
      }
      northSouthMesh.count = winIdx;
      northSouthMesh.instanceMatrix.needsUpdate = true;
      group.add(northSouthMesh);
    }

    this.cityRoot.add(group);
  }

  private buildBridgesAndOverpasses() {
    // Create an elevated highway overpass running across one of the primary corridors
    const step = CITY_CONFIG.BLOCK_SIZE;
    const overpassZ = step * 1; // 1 block North of center
    const span = step * 5;
    const bridgeW = 16;
    const bridgeH = 8.5; // High clearance for lower traffic

    const overpassGroup = new THREE.Group();

    // Elevated bridge deck
    const deckGeo = new THREE.BoxGeometry(span, 1.2, bridgeW);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x3e4450, roughness: 0.7, metalness: 0.2 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, bridgeH, overpassZ);
    overpassGroup.add(deck);

    // Road asphalt on top of bridge
    const bridgeRoadGeo = new THREE.PlaneGeometry(span, bridgeW - 1.5);
    bridgeRoadGeo.rotateX(-Math.PI / 2);
    const bridgeRoad = new THREE.Mesh(bridgeRoadGeo, this.roadMaterial);
    bridgeRoad.position.set(0, bridgeH + 0.62, overpassZ);
    overpassGroup.add(bridgeRoad);

    // Guardrails on both sides of bridge
    const railGeo = new THREE.BoxGeometry(span, 1.4, 0.4);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8892a0, metalness: 0.7, roughness: 0.3 });

    const railN = new THREE.Mesh(railGeo, railMat);
    railN.position.set(0, bridgeH + 1.2, overpassZ - bridgeW / 2 + 0.2);
    overpassGroup.add(railN);

    const railS = new THREE.Mesh(railGeo, railMat);
    railS.position.set(0, bridgeH + 1.2, overpassZ + bridgeW / 2 - 0.2);
    overpassGroup.add(railS);

    // Support pillars
    const pillarCount = 6;
    const pillarSpacing = span / (pillarCount + 1);
    for (let p = 1; p <= pillarCount; p++) {
      const px = -span / 2 + p * pillarSpacing;

      // Pillars on outer sides so center road lanes stay clear
      for (const side of [-1, 1]) {
        const pz = overpassZ + side * (bridgeW * 0.38);
        const pillarGeo = new THREE.CylinderGeometry(0.8, 0.9, bridgeH, 12);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a6370, roughness: 0.8 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, bridgeH / 2, pz);
        pillar.castShadow = true;
        overpassGroup.add(pillar);

        this.obstacles.push({
          minX: px - 1.2,
          maxX: px + 1.2,
          minZ: pz - 1.2,
          maxZ: pz + 1.2,
          type: 'pillar',
        });
      }
    }

    this.cityRoot.add(overpassGroup);
  }

  private buildDistantSkyline() {
    // Distant mountain / skyline silhouettes on horizon to give depth
    const skylineGroup = new THREE.Group();
    const distance = 420;
    const count = 32;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const w = 40 + Math.random() * 50;
      const h = 80 + Math.random() * 120;
      const d = 30 + Math.random() * 40;

      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshBasicMaterial({ color: 0x222e42 });
      const tower = new THREE.Mesh(geo, mat);
      tower.position.set(x, h / 2 - 10, z);
      skylineGroup.add(tower);
    }

    this.cityRoot.add(skylineGroup);
  }
}
