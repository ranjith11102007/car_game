import { WeatherSettings, WeatherType } from './types';

// City grid constants
export const CITY_CONFIG = {
  BLOCK_SIZE: 120,          // Size of one city block in meters
  ROAD_WIDTH: 22,           // 4 lanes total (2 lanes in each direction)
  SIDEWALK_WIDTH: 3.5,      // Sidewalk width on each side
  GRID_HALF_EXTENT: 4,      // 9x9 city blocks = ~1.1km x 1.1km open city
  BUILDING_HEIGHT_MIN: 18,
  BUILDING_HEIGHT_MAX: 85,
  STREET_LAMP_SPACING: 35,
  TREE_SPACING: 25,
};

// Physics constants calibrated for realistic, responsive, non-flipping vehicle dynamics
export const VEHICLE_CONFIG = {
  // Dimensions
  WIDTH: 2.1,
  LENGTH: 4.6,
  HEIGHT: 1.35,
  WHEEL_BASE: 2.7,
  WHEEL_RADIUS: 0.36,

  // Performance
  ACCEL_FORCE: 16.5,          // m/s^2 forward engine acceleration
  TOP_SPEED_FORWARD: 65,      // ~234 km/h
  TOP_SPEED_REVERSE: 12,      // ~43 km/h
  REVERSE_ACCEL: 8.0,

  // Brakes (critical for bug fix!)
  BRAKE_DECEL: 24.0,          // Controlled linear braking deceleration
  HANDBRAKE_DECEL: 14.0,      // Handbrake deceleration
  COAST_DRAG: 1.8,            // Natural rolling resistance and aerodynamic drag
  STOP_SPEED_THRESHOLD: 0.15, // Below this speed (m/s), car comes to a clean absolute stop

  // Steering & Stability
  STEER_SPEED: 4.0,           // How fast steering wheel turns
  STEER_RETURN_SPEED: 6.5,    // How fast steering recenters
  MAX_STEER_ANGLE: 0.58,      // Max front wheel turn in radians (~33 deg)
  HIGH_SPEED_STEER_DAMPING: 0.45, // Steering reduces at top speed to keep car stable

  // Drift & Grip
  NORMAL_LATERAL_GRIP: 14.0,  // High lateral grip for precision road adherence
  DRIFT_LATERAL_GRIP: 2.8,    // Low grip during handbrake/skid
  DRIFT_SLIP_THRESHOLD: 0.18, // Radians slip angle to trigger drift state
  DRIFT_ANGULAR_BOOST: 1.85,  // Slight yaw assistance when drifting into a corner
  GRIP_RECOVERY_RATE: 4.5,    // Smooth recovery back to full grip
};

// Realistic Weather Presets (CRITICAL: Fix the extreme white fog!)
export const WEATHER_PRESETS: Record<WeatherType, WeatherSettings> = {
  sunny: {
    name: 'Sunny Day',
    skyColor: 0x3d8be8,        // Crisp vibrant azure sky
    horizonColor: 0x9bc2ea,    // Soft bright atmospheric horizon
    sunColor: 0xfffae8,        // Warm sunlight
    sunIntensity: 1.25,        // Realistic sunlight without blowout
    sunPosition: [150, 220, 100],
    ambientColor: 0xd8e8ff,    // Sky ambient fill
    ambientIntensity: 0.42,
    hemiSkyColor: 0x6ca3e6,
    hemiGroundColor: 0x3d493a, // Soft ground bounce
    hemiIntensity: 0.35,
    fogColor: 0x8ebae8,        // Long distance atmospheric haze
    fogDensity: 0.0022,        // Clear visibility up to 450+ meters!
    rainIntensity: 0,
    roadWetness: 0,
    streetLightsOn: false,
    headlightsRequired: false,
  },
  cloudy: {
    name: 'Overcast',
    skyColor: 0x76889e,
    horizonColor: 0x9faec0,
    sunColor: 0xe0e7ef,
    sunIntensity: 0.7,
    sunPosition: [100, 180, 80],
    ambientColor: 0x8c9eb5,
    ambientIntensity: 0.55,
    hemiSkyColor: 0x7b8d9f,
    hemiGroundColor: 0x353a3e,
    hemiIntensity: 0.3,
    fogColor: 0x8898a8,
    fogDensity: 0.0035,
    rainIntensity: 0,
    roadWetness: 0.1,
    streetLightsOn: false,
    headlightsRequired: false,
  },
  sunset: {
    name: 'Sunset',
    skyColor: 0xd6532b,        // Deep orange-amber sunset
    horizonColor: 0xf5a04e,    // Golden glow
    sunColor: 0xff7e33,        // Rich low-angle sun
    sunIntensity: 1.1,
    sunPosition: [280, 35, 120],
    ambientColor: 0x8a4b41,
    ambientIntensity: 0.38,
    hemiSkyColor: 0xc45d37,
    hemiGroundColor: 0x221a18,
    hemiIntensity: 0.32,
    fogColor: 0xdd7d4d,
    fogDensity: 0.0026,
    rainIntensity: 0,
    roadWetness: 0,
    streetLightsOn: true,
    headlightsRequired: true,
  },
  night: {
    name: 'Night',
    skyColor: 0x080c16,        // Deep night navy
    horizonColor: 0x121929,    // City ambient skyglow
    sunColor: 0x7c9bc2,        // Soft moonlight
    sunIntensity: 0.22,
    sunPosition: [-80, 160, -100],
    ambientColor: 0x1a233a,    // Ambient night fill
    ambientIntensity: 0.28,
    hemiSkyColor: 0x1c2b48,
    hemiGroundColor: 0x0a0c10,
    hemiIntensity: 0.22,
    fogColor: 0x0b111f,
    fogDensity: 0.0032,
    rainIntensity: 0,
    roadWetness: 0,
    streetLightsOn: true,
    headlightsRequired: true,
  },
  rain: {
    name: 'Heavy Rain',
    skyColor: 0x3a4856,        // Stormy steel grey
    horizonColor: 0x4f5e6e,
    sunColor: 0x93a3b5,
    sunIntensity: 0.45,
    sunPosition: [80, 140, 60],
    ambientColor: 0x54667a,
    ambientIntensity: 0.45,
    hemiSkyColor: 0x47596a,
    hemiGroundColor: 0x1d242c,
    hemiIntensity: 0.28,
    fogColor: 0x475869,
    fogDensity: 0.0048,
    rainIntensity: 1.0,
    roadWetness: 1.0,
    streetLightsOn: true,
    headlightsRequired: true,
  },
};
