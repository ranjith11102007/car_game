import * as THREE from 'three';
import { VEHICLE_CONFIG } from '../constants';
import { CameraView, VehicleState, VehicleTelemetry } from '../types';
import { SkidManager } from './SkidManager';
import { CollisionObstacle } from './CityBuilder';
import { SoundManager } from '../audio/SoundManager';

export interface VehicleInputs {
  forward: boolean;
  backward: boolean; // Brake / Reverse
  left: boolean;
  right: boolean;
  drift: boolean;    // Handbrake
  nitro: boolean;
}

export class Vehicle {
  public scene: THREE.Scene;
  public group: THREE.Group;
  public skidManager: SkidManager;
  public soundManager: SoundManager;

  // Visual 3D Meshes
  public bodyMesh!: THREE.Group;
  public wheelMeshes: THREE.Group[] = [];
  public headlightLeftSpot!: THREE.SpotLight;
  public headlightRightSpot!: THREE.SpotLight;
  public headlightLeftGlow!: THREE.Mesh;
  public headlightRightGlow!: THREE.Mesh;
  public brakeLightMat!: THREE.MeshBasicMaterial;
  public reverseLightMat!: THREE.MeshBasicMaterial;
  public headlightBulbMat!: THREE.MeshBasicMaterial;

  // Physics State
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public heading: number = 0; // Yaw angle in radians (0 = facing -Z)
  public angularVelocity: number = 0;
  public speed: number = 0; // scalar forward speed (positive = forward, negative = reverse)

  // Steering
  public steerAngle: number = 0; // radians

  // Drift & Grip
  public isHandbrake: boolean = false;
  public lateralGrip: number = VEHICLE_CONFIG.NORMAL_LATERAL_GRIP;
  public slipAngle: number = 0;
  public isDrifting: boolean = false;
  public driftDuration: number = 0;
  public driftScore: number = 0;
  public driftCombo: number = 1;

  // Headlights
  public headlightsOn: boolean = false;

  // Nitro
  public nitroAmount: number = 100; // 0 to 100%

  // Visual Lean & Wheel Spin
  private rollAngle: number = 0;
  private pitchAngle: number = 0;
  private wheelRotation: number = 0;

  // Collision
  public obstacles: CollisionObstacle[] = [];

  constructor(scene: THREE.Scene, skidManager: SkidManager, soundManager: SoundManager) {
    this.scene = scene;
    this.skidManager = skidManager;
    this.soundManager = soundManager;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.buildCarModel();
    this.reset();
  }

  public reset(spawnX: number = 0, spawnZ: number = 0, spawnHeading: number = 0) {
    this.position.set(spawnX, 0, spawnZ);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.heading = spawnHeading;
    this.angularVelocity = 0;
    this.steerAngle = 0;
    this.isDrifting = false;
    this.driftScore = 0;
    this.driftCombo = 1;
    this.driftDuration = 0;
    this.lateralGrip = VEHICLE_CONFIG.NORMAL_LATERAL_GRIP;
    this.nitroAmount = 100;

    this.group.position.copy(this.position);
    this.group.rotation.set(0, this.heading, 0);
  }

  private buildCarModel() {
    this.bodyMesh = new THREE.Group();

    // High quality metallic sports car paint
    const paintMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9, // Electric Racing Cyan / Azure
      metalness: 0.85,
      roughness: 0.18,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.3,
      roughness: 0.6,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.82,
    });

    // 1. Lower chassis / floor
    const chassisGeo = new THREE.BoxGeometry(1.9, 0.45, 4.3);
    const chassis = new THREE.Mesh(chassisGeo, paintMat);
    chassis.position.y = 0.42;
    chassis.castShadow = true;
    this.bodyMesh.add(chassis);

    // Front splitter
    const splitterGeo = new THREE.BoxGeometry(1.95, 0.08, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.22, -2.15);
    this.bodyMesh.add(splitter);

    // Rear diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.95, 0.15, 0.5);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
    diffuser.position.set(0, 0.25, 2.15);
    this.bodyMesh.add(diffuser);

    // 2. Cabin / Roof (sleek aerodynamic coupe silhouette)
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.55, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.88, 0.15);
    cabin.castShadow = true;
    this.bodyMesh.add(cabin);

    // Roof panel
    const roofGeo = new THREE.BoxGeometry(1.42, 0.08, 1.7);
    const roof = new THREE.Mesh(roofGeo, paintMat);
    roof.position.set(0, 1.18, 0.15);
    this.bodyMesh.add(roof);

    // Hood scoop / detail
    const hoodGeo = new THREE.BoxGeometry(1.1, 0.08, 1.2);
    const hood = new THREE.Mesh(hoodGeo, carbonMat);
    hood.position.set(0, 0.68, -1.2);
    this.bodyMesh.add(hood);

    // Rear GT spoiler
    const spoilerWingGeo = new THREE.BoxGeometry(1.8, 0.06, 0.35);
    const spoilerWing = new THREE.Mesh(spoilerWingGeo, carbonMat);
    spoilerWing.position.set(0, 1.05, 2.0);
    this.bodyMesh.add(spoilerWing);

    const strutGeo = new THREE.BoxGeometry(0.08, 0.45, 0.15);
    const strutLeft = new THREE.Mesh(strutGeo, carbonMat);
    strutLeft.position.set(-0.6, 0.82, 2.0);
    this.bodyMesh.add(strutLeft);

    const strutRight = new THREE.Mesh(strutGeo, carbonMat);
    strutRight.position.set(0.6, 0.82, 2.0);
    this.bodyMesh.add(strutRight);

    // 3. Headlights & Taillights
    this.headlightBulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bulbGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);

    // Left headlight bulb
    const hlBulb = new THREE.Mesh(bulbGeo, this.headlightBulbMat);
    hlBulb.position.set(-0.68, 0.5, -2.16);
    this.bodyMesh.add(hlBulb);

    // Right headlight bulb
    const hrBulb = new THREE.Mesh(bulbGeo, this.headlightBulbMat);
    hrBulb.position.set(0.68, 0.5, -2.16);
    this.bodyMesh.add(hrBulb);

    // Headlight Spotlights (project beam onto road ahead)
    this.headlightLeftSpot = new THREE.SpotLight(0xfff8e7, 0, 45, Math.PI / 6, 0.5, 1.2);
    this.headlightLeftSpot.position.set(-0.68, 0.5, -2.1);
    this.headlightLeftSpot.target.position.set(-0.68, 0, -25);
    this.bodyMesh.add(this.headlightLeftSpot);
    this.bodyMesh.add(this.headlightLeftSpot.target);

    this.headlightRightSpot = new THREE.SpotLight(0xfff8e7, 0, 45, Math.PI / 6, 0.5, 1.2);
    this.headlightRightSpot.position.set(0.68, 0.5, -2.1);
    this.headlightRightSpot.target.position.set(0.68, 0, -25);
    this.bodyMesh.add(this.headlightRightSpot);
    this.bodyMesh.add(this.headlightRightSpot.target);

    // Taillights / Brake lights
    this.brakeLightMat = new THREE.MeshBasicMaterial({ color: 0x550000 });
    const tailGeo = new THREE.BoxGeometry(0.42, 0.12, 0.1);

    const tlLeft = new THREE.Mesh(tailGeo, this.brakeLightMat);
    tlLeft.position.set(-0.68, 0.55, 2.16);
    this.bodyMesh.add(tlLeft);

    const tlRight = new THREE.Mesh(tailGeo, this.brakeLightMat);
    tlRight.position.set(0.68, 0.55, 2.16);
    this.bodyMesh.add(tlRight);

    // Reverse lights
    this.reverseLightMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const revGeo = new THREE.BoxGeometry(0.18, 0.08, 0.1);

    const revLeft = new THREE.Mesh(revGeo, this.reverseLightMat);
    revLeft.position.set(-0.35, 0.45, 2.16);
    this.bodyMesh.add(revLeft);

    const revRight = new THREE.Mesh(revGeo, this.reverseLightMat);
    revRight.position.set(0.35, 0.45, 2.16);
    this.bodyMesh.add(revRight);

    this.group.add(this.bodyMesh);

    // 4. Wheels (FL, FR, RL, RR)
    this.buildWheels();
  }

  private buildWheels() {
    const wheelRadius = VEHICLE_CONFIG.WHEEL_RADIUS;
    const wheelWidth = 0.32;

    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.9 });

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

    const wheelOffsets = [
      { name: 'FL', x: -0.95, y: wheelRadius, z: -1.4 },
      { name: 'FR', x: 0.95, y: wheelRadius, z: -1.4 },
      { name: 'RL', x: -0.95, y: wheelRadius, z: 1.4 },
      { name: 'RR', x: 0.95, y: wheelRadius, z: 1.4 },
    ];

    for (const offset of wheelOffsets) {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(offset.x, offset.y, offset.z);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);

      this.wheelMeshes.push(wheelGroup);
      this.group.add(wheelGroup);
    }
  }

  public update(dt: number, inputs: VehicleInputs, isRain: boolean) {
    // -------------------------------------------------------------
    // 1. INPUT PROCESSING & RESOLUTION (SOLVING THE BRAKE BUG!)
    // -------------------------------------------------------------
    const forwardInput = inputs.forward;
    const brakeReverseInput = inputs.backward;
    const driftInput = inputs.drift;
    const nitroInput = inputs.nitro && this.nitroAmount > 0;

    let isAccelerating = false;
    let isBraking = false;
    let isReversing = false;

    // Strict forward speed vs reverse speed separation
    if (this.speed >= VEHICLE_CONFIG.STOP_SPEED_THRESHOLD) {
      // CAR IS CURRENTLY MOVING FORWARD
      if (brakeReverseInput) {
        // Player presses S/Down: THIS IS PURE BRAKING, NOT REVERSE!
        isBraking = true;
        this.speed -= VEHICLE_CONFIG.BRAKE_DECEL * dt;

        // Clean deceleration to absolute stop: do not reverse until fully stopped!
        if (this.speed <= VEHICLE_CONFIG.STOP_SPEED_THRESHOLD) {
          this.speed = 0;
        }
      } else if (forwardInput) {
        isAccelerating = true;
        let accel = VEHICLE_CONFIG.ACCEL_FORCE;
        if (nitroInput) {
          accel *= 1.6;
          this.nitroAmount = Math.max(0, this.nitroAmount - dt * 25);
        }
        // Top speed curve
        const speedRatio = Math.min(1.0, this.speed / VEHICLE_CONFIG.TOP_SPEED_FORWARD);
        const effectiveAccel = accel * (1.0 - Math.pow(speedRatio, 1.8));
        this.speed += effectiveAccel * dt;
      } else {
        // Natural rolling resistance & coast drag
        this.speed -= VEHICLE_CONFIG.COAST_DRAG * dt;
        if (this.speed < 0) this.speed = 0;
      }
    } else if (this.speed <= -VEHICLE_CONFIG.STOP_SPEED_THRESHOLD) {
      // CAR IS CURRENTLY MOVING IN REVERSE
      if (forwardInput) {
        // Pressing forward while in reverse: BRAKE TO STOP!
        isBraking = true;
        this.speed += VEHICLE_CONFIG.BRAKE_DECEL * dt;
        if (this.speed >= -VEHICLE_CONFIG.STOP_SPEED_THRESHOLD) {
          this.speed = 0;
        }
      } else if (brakeReverseInput) {
        // Continue holding reverse: ACCELERATE IN REVERSE
        isReversing = true;
        const revRatio = Math.min(1.0, Math.abs(this.speed) / VEHICLE_CONFIG.TOP_SPEED_REVERSE);
        const revAccel = VEHICLE_CONFIG.REVERSE_ACCEL * (1.0 - revRatio);
        this.speed -= revAccel * dt;
      } else {
        // Coasting while in reverse
        this.speed += VEHICLE_CONFIG.COAST_DRAG * dt;
        if (this.speed > 0) this.speed = 0;
      }
    } else {
      // CAR IS STOPPED (speed ~ 0)
      this.speed = 0;
      if (forwardInput) {
        // Engage 1st gear forward
        isAccelerating = true;
        this.speed = VEHICLE_CONFIG.ACCEL_FORCE * 0.4 * dt;
      } else if (brakeReverseInput) {
        // Engage Reverse gear
        isReversing = true;
        this.speed = -VEHICLE_CONFIG.REVERSE_ACCEL * 0.4 * dt;
      }
    }

    // Handbrake deceleration
    if (driftInput && Math.abs(this.speed) > 0.1) {
      const decel = VEHICLE_CONFIG.HANDBRAKE_DECEL * dt;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - decel);
      } else {
        this.speed = Math.min(0, this.speed + decel);
      }
    }

    // Regenerate nitro slowly when not boosting
    if (!nitroInput) {
      this.nitroAmount = Math.min(100, this.nitroAmount + dt * 4.5);
    }

    // -------------------------------------------------------------
    // 2. STEERING & YAW DYNAMICS
    // -------------------------------------------------------------
    // Steering damping at high speeds for realistic car stability
    const speedKmh = Math.abs(this.speed * 3.6);
    const speedRatio = Math.min(1.0, speedKmh / 160);
    const currentMaxSteer = VEHICLE_CONFIG.MAX_STEER_ANGLE * (1.0 - speedRatio * VEHICLE_CONFIG.HIGH_SPEED_STEER_DAMPING);

    let targetSteer = 0;
    if (inputs.left) targetSteer += currentMaxSteer;
    if (inputs.right) targetSteer -= currentMaxSteer;

    if (targetSteer !== 0) {
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, dt * VEHICLE_CONFIG.STEER_SPEED);
    } else {
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, 0, dt * VEHICLE_CONFIG.STEER_RETURN_SPEED);
    }

    // -------------------------------------------------------------
    // 3. DRIFT PHYSICS & SLIP ANGLE
    // -------------------------------------------------------------
    this.isHandbrake = driftInput;

    // Target grip level
    let targetGrip = VEHICLE_CONFIG.NORMAL_LATERAL_GRIP;
    if (this.isHandbrake) {
      targetGrip = VEHICLE_CONFIG.DRIFT_LATERAL_GRIP;
    } else if (isRain) {
      targetGrip = VEHICLE_CONFIG.NORMAL_LATERAL_GRIP * 0.65;
    }

    this.lateralGrip = THREE.MathUtils.lerp(this.lateralGrip, targetGrip, dt * VEHICLE_CONFIG.GRIP_RECOVERY_RATE);

    // Calculate turning rate from steering and wheel base
    // Ackermann-like kinematic steering: angular velocity = (speed / L) * tan(steer)
    let turnRate = 0;
    if (Math.abs(this.speed) > 0.2) {
      turnRate = (this.speed / VEHICLE_CONFIG.WHEEL_BASE) * Math.sin(this.steerAngle);
      if (this.isHandbrake && Math.abs(this.speed) > 4) {
        // Drift boost yaw
        turnRate *= VEHICLE_CONFIG.DRIFT_ANGULAR_BOOST;
      }
    }

    this.angularVelocity = THREE.MathUtils.lerp(this.angularVelocity, turnRate, dt * 10);
    this.heading += this.angularVelocity * dt;

    // Forward direction unit vector
    const forwardDir = new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading));
    const rightDir = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));

    // Desired forward velocity
    const targetVel = forwardDir.clone().multiplyScalar(this.speed);

    // Apply lateral grip: blend current velocity towards forward vector
    this.velocity.lerp(targetVel, Math.min(1.0, dt * this.lateralGrip));

    // Calculate Slip Angle: angle between forward direction and actual velocity
    const currentVelNorm = this.velocity.clone().normalize();
    const dotForward = forwardDir.dot(currentVelNorm);
    this.slipAngle = Math.abs(Math.acos(THREE.MathUtils.clamp(dotForward, -1, 1)));

    // Drift Detection
    const speedThresholdForDrift = 12; // ~43 km/h
    this.isDrifting =
      speedKmh > speedThresholdForDrift &&
      (this.isHandbrake || this.slipAngle > VEHICLE_CONFIG.DRIFT_SLIP_THRESHOLD);

    if (this.isDrifting) {
      this.driftDuration += dt;
      const points = Math.round((speedKmh * 1.5 + this.slipAngle * 120) * dt * this.driftCombo);
      this.driftScore += points;

      if (this.driftDuration > 2.0 && this.driftCombo === 1) this.driftCombo = 2;
      if (this.driftDuration > 4.5 && this.driftCombo === 2) this.driftCombo = 3;
    } else {
      if (this.driftDuration > 0) {
        this.driftDuration = Math.max(0, this.driftDuration - dt * 2.0);
        if (this.driftDuration === 0) {
          this.driftCombo = 1;
        }
      }
    }

    // -------------------------------------------------------------
    // 4. POSITION & COLLISION HANDLING
    // -------------------------------------------------------------
    const nextPos = this.position.clone().addScaledVector(this.velocity, dt);

    // Check collision with city buildings/pillars
    let collided = false;
    const carRadius = 1.3;

    for (const obs of this.obstacles) {
      if (
        nextPos.x + carRadius > obs.minX &&
        nextPos.x - carRadius < obs.maxX &&
        nextPos.z + carRadius > obs.minZ &&
        nextPos.z - carRadius < obs.maxZ
      ) {
        collided = true;
        // Bounce slightly off collision boundary
        this.speed *= -0.3;
        this.velocity.multiplyScalar(-0.3);
        this.soundManager.playCrash();
        break;
      }
    }

    if (!collided) {
      this.position.copy(nextPos);
    }

    // Update 3D Group Position & Heading
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // -------------------------------------------------------------
    // 5. VISUAL SUSPENSION ROLL, PITCH & WHEEL ANIMATIONS
    // -------------------------------------------------------------
    // Pitch forward on heavy braking, pitch back on acceleration
    let targetPitch = 0;
    if (isBraking) targetPitch = -0.055;
    else if (isAccelerating) targetPitch = 0.038;

    this.pitchAngle = THREE.MathUtils.lerp(this.pitchAngle, targetPitch, dt * 8);

    // Roll into turns
    const targetRoll = -this.steerAngle * Math.min(1.0, speedKmh / 80) * 0.08;
    this.rollAngle = THREE.MathUtils.lerp(this.rollAngle, targetRoll, dt * 8);

    this.bodyMesh.rotation.set(this.pitchAngle, 0, this.rollAngle);

    // Wheel spin rotation
    const distTraveled = this.speed * dt;
    this.wheelRotation += distTraveled / VEHICLE_CONFIG.WHEEL_RADIUS;

    for (let i = 0; i < 4; i++) {
      const wheel = this.wheelMeshes[i];
      // Front wheels steer (i = 0, 1)
      if (i < 2) {
        wheel.rotation.set(this.wheelRotation, this.steerAngle, 0);
      } else {
        wheel.rotation.set(this.wheelRotation, 0, 0);
      }
    }

    // -------------------------------------------------------------
    // 6. LIGHTS SYSTEM (HEADLIGHTS, BRAKE LIGHTS, REVERSE LIGHTS)
    // -------------------------------------------------------------
    // Brake lights
    if (isBraking || (this.isHandbrake && Math.abs(this.speed) > 1)) {
      this.brakeLightMat.color.setHex(0xff1111); // Bright glowing red
    } else {
      this.brakeLightMat.color.setHex(this.headlightsOn ? 0x881111 : 0x220000);
    }

    // Reverse lights
    if (isReversing) {
      this.reverseLightMat.color.setHex(0xffffff); // Bright white
    } else {
      this.reverseLightMat.color.setHex(0x1a1a1a);
    }

    // Headlight spotlights
    this.headlightLeftSpot.intensity = this.headlightsOn ? 2.8 : 0;
    this.headlightRightSpot.intensity = this.headlightsOn ? 2.8 : 0;
    this.headlightBulbMat.color.setHex(this.headlightsOn ? 0xffffff : 0x555555);

    // -------------------------------------------------------------
    // 7. SKID MARKS & SMOKE GENERATION
    // -------------------------------------------------------------
    const shouldSkid =
      (this.isDrifting && Math.abs(this.speed) > 4) ||
      (isBraking && speedKmh > 35) ||
      (this.isHandbrake && speedKmh > 10);

    if (shouldSkid) {
      // Rear wheel world positions
      const rlOffset = new THREE.Vector3(-0.95, 0.05, 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading).add(this.position);
      const rrOffset = new THREE.Vector3(0.95, 0.05, 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading).add(this.position);

      this.skidManager.addSkidMark(rlOffset, rrOffset, this.heading);
      this.skidManager.emitTireSmoke(rlOffset, 1, isRain);
      this.skidManager.emitTireSmoke(rrOffset, 1, isRain);

      this.soundManager.updateSkid(Math.min(1.0, this.slipAngle * 2 + (isBraking ? 0.4 : 0)));
    } else {
      this.soundManager.updateSkid(0);
    }

    // -------------------------------------------------------------
    // 8. AUDIO UPDATE
    // -------------------------------------------------------------
    const rpmNorm = Math.min(1.0, Math.max(0.15, (speedKmh % 45) / 45));
    this.soundManager.updateEngine(speedKmh, rpmNorm, isAccelerating ? 1.0 : 0);
  }

  public getTelemetry(): VehicleTelemetry {
    const speedKmh = Math.round(Math.abs(this.speed * 3.6));

    // Dynamic Gear calculation
    let gear = 'N';
    if (this.speed < -0.2) {
      gear = 'R';
    } else if (speedKmh === 0) {
      gear = 'P';
    } else if (speedKmh < 32) {
      gear = '1';
    } else if (speedKmh < 65) {
      gear = '2';
    } else if (speedKmh < 105) {
      gear = '3';
    } else if (speedKmh < 150) {
      gear = '4';
    } else if (speedKmh < 195) {
      gear = '5';
    } else {
      gear = '6';
    }

    // State machine
    let state: VehicleState = 'idle';
    if (this.isDrifting) state = 'drifting';
    else if (this.speed < -0.2) state = 'reverse';
    else if (this.speed > 0.5) state = 'accelerating';
    else if (speedKmh > 0) state = 'cruising';

    const rpm = Math.min(8500, Math.max(900, Math.round(900 + (speedKmh % 45) * 140)));

    return {
      speedKmh,
      rpm,
      gear,
      state,
      isDrifting: this.isDrifting,
      driftAngle: Math.round(THREE.MathUtils.radToDeg(this.slipAngle)),
      driftScore: this.driftScore,
      driftCombo: this.driftCombo,
      headlightsOn: this.headlightsOn,
      isBraking: this.brakeLightMat.color.getHex() === 0xff1111,
      isReversing: gear === 'R',
      nitroPercent: Math.round(this.nitroAmount),
      steerAngle: this.steerAngle,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      heading: this.heading,
    };
  }
}
