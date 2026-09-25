import * as THREE from 'three';
import { CameraView } from '../types';
import { Vehicle } from './Vehicle';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public viewMode: CameraView = 'chase';

  private currentTarget: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();

  // Drift swing offset
  private driftLagAngle: number = 0;

  // Camera Shake
  private shakeIntensity: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public setViewMode(mode: CameraView) {
    this.viewMode = mode;
  }

  public nextViewMode() {
    const modes: CameraView[] = ['chase', 'close', 'hood', 'top'];
    const idx = modes.indexOf(this.viewMode);
    this.viewMode = modes[(idx + 1) % modes.length];
  }

  public triggerShake(intensity: number = 0.4) {
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + intensity);
  }

  public update(dt: number, vehicle: Vehicle) {
    const carPos = vehicle.position;
    const heading = vehicle.heading;
    const speed = vehicle.speed;
    const speedKmh = Math.abs(speed * 3.6);

    // Dynamic FOV widening at high speeds (72 -> 82 deg)
    const targetFov = 72 + Math.min(10, (speedKmh / 180) * 10);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 4);
    this.camera.updateProjectionMatrix();

    // Smooth drift angle lag
    if (vehicle.isDrifting) {
      // Slightly rotate camera offset in direction of slide
      this.driftLagAngle = THREE.MathUtils.lerp(this.driftLagAngle, vehicle.slipAngle * 0.4, dt * 5);
    } else {
      this.driftLagAngle = THREE.MathUtils.lerp(this.driftLagAngle, 0, dt * 6);
    }

    const effectiveHeading = heading + (vehicle.speed >= 0 ? 0 : Math.PI) + (vehicle.steerAngle > 0 ? -this.driftLagAngle : this.driftLagAngle);

    let desiredPos = new THREE.Vector3();
    let desiredLook = new THREE.Vector3();

    if (this.viewMode === 'chase') {
      // Third-person dynamic chase
      const distance = 7.2 + Math.min(1.8, (speedKmh / 200) * 1.8);
      const height = 2.8 + Math.min(0.5, (speedKmh / 200) * 0.5);

      const offset = new THREE.Vector3(
        Math.sin(effectiveHeading) * distance,
        height,
        Math.cos(effectiveHeading) * distance
      );

      desiredPos = carPos.clone().add(offset);
      desiredLook = carPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    } else if (this.viewMode === 'close') {
      // Tight action chase
      const distance = 5.2;
      const height = 1.9;

      const offset = new THREE.Vector3(
        Math.sin(effectiveHeading) * distance,
        height,
        Math.cos(effectiveHeading) * distance
      );

      desiredPos = carPos.clone().add(offset);
      desiredLook = carPos.clone().add(new THREE.Vector3(0, 1.0, 0));
    } else if (this.viewMode === 'hood') {
      // First-person / hood cam
      const forwardDir = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
      desiredPos = carPos.clone().add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(forwardDir, 0.4);
      desiredLook = desiredPos.clone().addScaledVector(forwardDir, 10).add(new THREE.Vector3(0, -0.2, 0));
    } else {
      // Top-down tactical overview
      desiredPos = carPos.clone().add(new THREE.Vector3(0, 42, 10));
      desiredLook = carPos.clone();
    }

    // Camera shake decay
    if (this.shakeIntensity > 0.01) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      desiredPos.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    }

    // Smooth damping (faster in hood, silky smooth in chase)
    const followSpeed = this.viewMode === 'hood' ? 24 : 9.5;
    this.currentPosition.lerp(desiredPos, Math.min(1.0, dt * followSpeed));
    this.currentTarget.lerp(desiredLook, Math.min(1.0, dt * followSpeed));

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }
}
