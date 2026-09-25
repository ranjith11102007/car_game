import * as THREE from 'three';

export type WeatherType = 'sunny' | 'cloudy' | 'sunset' | 'night' | 'rain';

export type CameraView = 'chase' | 'close' | 'hood' | 'top';

export type VehicleState =
  | 'idle'
  | 'accelerating'
  | 'cruising'
  | 'braking'
  | 'reverse'
  | 'drifting'
  | 'airborne';

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  gear: string;
  state: VehicleState;
  isDrifting: boolean;
  driftAngle: number;
  driftScore: number;
  driftCombo: number;
  headlightsOn: boolean;
  isBraking: boolean;
  isReversing: boolean;
  nitroPercent: number;
  steerAngle: number;
  position: { x: number; y: number; z: number };
  heading: number; // in radians
}

export interface WeatherSettings {
  name: string;
  skyColor: number;
  horizonColor: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  fogColor: number;
  fogDensity: number;
  rainIntensity: number; // 0 to 1
  roadWetness: number;   // 0 to 1
  streetLightsOn: boolean;
  headlightsRequired: boolean;
}

export interface TrafficCarData {
  id: number;
  mesh: THREE.Group;
  laneIndex: number;
  roadSegment: number;
  speed: number;
  targetSpeed: number;
  length: number;
  width: number;
  color: number;
}
