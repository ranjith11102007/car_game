/**
 * Apex City Drive 3D
 * Open-world city driving simulator with dynamic weather, day/night cycles, drift physics, and AI traffic.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CameraView, VehicleTelemetry, WeatherType } from './types';
import { EnvironmentManager } from './game/EnvironmentManager';
import { CityBuilder } from './game/CityBuilder';
import { Vehicle, VehicleInputs } from './game/Vehicle';
import { SkidManager } from './game/SkidManager';
import { TrafficManager } from './game/TrafficManager';
import { CameraController } from './game/CameraController';
import { SoundManager } from './audio/SoundManager';
import { HUD } from './components/HUD';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core Game References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const envManagerRef = useRef<EnvironmentManager | null>(null);
  const vehicleRef = useRef<Vehicle | null>(null);
  const skidManagerRef = useRef<SkidManager | null>(null);
  const trafficManagerRef = useRef<TrafficManager | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);

  // Input State
  const inputsRef = useRef<VehicleInputs>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false,
  });

  const [touchState, setTouchState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false,
  });

  // UI Reactive States
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    rpm: 900,
    gear: 'P',
    state: 'idle',
    isDrifting: false,
    driftAngle: 0,
    driftScore: 0,
    driftCombo: 1,
    headlightsOn: false,
    isBraking: false,
    isReversing: false,
    nitroPercent: 100,
    steerAngle: 0,
    position: { x: 0, y: 0, z: 0 },
    heading: 0,
  });

  const [currentWeather, setCurrentWeather] = useState<WeatherType>('sunny');
  const [gameTime, setGameTime] = useState<string>('14:00');
  const [gameTimeHours, setGameTimeHours] = useState<number>(14.0);
  const [cameraView, setCameraView] = useState<CameraView>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [autoWeather, setAutoWeather] = useState<boolean>(true);
  const [autoCycleTime, setAutoCycleTime] = useState<boolean>(true);

  // Initialize Game World
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / container.clientHeight,
      0.2,
      900
    );
    camera.position.set(0, 3, 8);
    cameraRef.current = camera;

    const cameraController = new CameraController(camera);
    cameraControllerRef.current = cameraController;

    // 3. Renderer with realistic Tone Mapping (FIXES BLOWN-OUT WHITE SCREEN)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Balanced realistic exposure
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. Sound Manager
    const soundManager = new SoundManager();
    soundManagerRef.current = soundManager;

    // 5. Environment & Weather System
    const envManager = new EnvironmentManager(scene);
    envManagerRef.current = envManager;

    // 6. City Environment & Road Network
    const cityBuilder = new CityBuilder(scene, envManager);
    cityBuilder.build();

    // 7. Skid Marks & Tire Smoke System
    const skidManager = new SkidManager(scene);
    skidManagerRef.current = skidManager;

    // 8. Player Vehicle
    const vehicle = new Vehicle(scene, skidManager, soundManager);
    vehicle.obstacles = cityBuilder.obstacles;
    vehicleRef.current = vehicle;

    // Spawn player in center boulevard lane
    vehicle.reset(0, 0, 0);

    // 9. Traffic AI System
    const trafficManager = new TrafficManager(scene);
    trafficManager.init(vehicle.position);
    trafficManagerRef.current = trafficManager;

    // 10. Desktop Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      // First keydown activates Web Audio
      soundManager.init();
      soundManager.resume();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputsRef.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputsRef.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputsRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputsRef.current.right = true;
          break;
        case 'Space':
          inputsRef.current.drift = true;
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputsRef.current.nitro = true;
          break;
        case 'KeyR':
          handleResetCar();
          break;
        case 'KeyC':
          handleCycleCamera();
          break;
        case 'KeyL':
          handleToggleHeadlights();
          break;
        case 'Escape':
          setIsSettingsOpen((prev) => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputsRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputsRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputsRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputsRef.current.right = false;
          break;
        case 'Space':
          inputsRef.current.drift = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputsRef.current.nitro = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 11. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 12. Main 60 FPS Game Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let hudUpdateCounter = 0;

    const gameLoop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(gameLoop);

      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;
      const dt = Math.min(deltaMs / 1000, 0.1); // Clamp delta time to avoid large physics steps

      // Merge keyboard inputs and touch inputs
      const activeInputs: VehicleInputs = {
        forward: inputsRef.current.forward || touchState.forward,
        backward: inputsRef.current.backward || touchState.backward,
        left: inputsRef.current.left || touchState.left,
        right: inputsRef.current.right || touchState.right,
        drift: inputsRef.current.drift || touchState.drift,
        nitro: inputsRef.current.nitro || touchState.nitro,
      };

      const isRain = envManager.rainIntensity > 0.3;

      // Update Vehicle Physics
      vehicle.update(dt, activeInputs, isRain);

      // Auto headlights in dark or rain
      const isDark = envManager.currentWeather === 'night' || envManager.currentWeather === 'rain' || envManager.currentWeather === 'sunset';
      if (isDark && !vehicle.headlightsOn) {
        vehicle.headlightsOn = true;
      }

      // Update Environment & Weather
      envManager.update(dt, vehicle.position);

      // Update Skid Marks & Smoke
      skidManager.update(dt);

      // Update Traffic
      trafficManager.update(dt, vehicle.position, isDark);

      // Update Camera
      cameraController.update(dt, vehicle);

      // Render Scene
      renderer.render(scene, camera);

      // Update HUD UI at 20-30Hz to prevent excessive React state re-renders
      hudUpdateCounter++;
      if (hudUpdateCounter % 2 === 0) {
        setTelemetry(vehicle.getTelemetry());
        setCurrentWeather(envManager.currentWeather);
        setGameTime(envManager.getFormattedTime());
        setGameTimeHours(envManager.gameTimeHours);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [touchState]);

  // Touch controls updater
  const handleTouchInput = useCallback(
    (key: 'forward' | 'backward' | 'left' | 'right' | 'drift' | 'nitro', active: boolean) => {
      // Audio trigger
      if (soundManagerRef.current) {
        soundManagerRef.current.init();
        soundManagerRef.current.resume();
      }
      setTouchState((prev) => ({ ...prev, [key]: active }));
    },
    []
  );

  // Quick Action Handlers
  const handleResetCar = useCallback(() => {
    if (vehicleRef.current) {
      // Reset car back on road aligned with nearest lane
      const pos = vehicleRef.current.position;
      vehicleRef.current.reset(pos.x, pos.z, 0);
    }
  }, []);

  const handleCycleCamera = useCallback(() => {
    if (cameraControllerRef.current) {
      cameraControllerRef.current.nextViewMode();
      setCameraView(cameraControllerRef.current.viewMode);
    }
  }, []);

  const handleToggleHeadlights = useCallback(() => {
    if (vehicleRef.current) {
      vehicleRef.current.headlightsOn = !vehicleRef.current.headlightsOn;
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (soundManagerRef.current) {
      const nextMuted = !isMuted;
      soundManagerRef.current.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  }, [isMuted]);

  const handleChangeWeather = useCallback((w: WeatherType) => {
    if (envManagerRef.current) {
      envManagerRef.current.setWeather(w, 2.5);
      setCurrentWeather(w);
    }
  }, []);

  const handleToggleAutoWeather = useCallback(() => {
    if (envManagerRef.current) {
      envManagerRef.current.autoCycleWeather = !autoWeather;
      setAutoWeather(!autoWeather);
    }
  }, [autoWeather]);

  const handleChangeGameTime = useCallback((h: number) => {
    if (envManagerRef.current) {
      envManagerRef.current.gameTimeHours = h;
      setGameTimeHours(h);
      setGameTime(envManagerRef.current.getFormattedTime());
    }
  }, []);

  const handleToggleAutoCycleTime = useCallback(() => {
    if (envManagerRef.current) {
      envManagerRef.current.autoCycleTime = !autoCycleTime;
      setAutoCycleTime(!autoCycleTime);
    }
  }, [autoCycleTime]);

  const handleChangeCamera = useCallback((c: CameraView) => {
    if (cameraControllerRef.current) {
      cameraControllerRef.current.setViewMode(c);
      setCameraView(c);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Modern HUD */}
      <HUD
        telemetry={telemetry}
        weather={currentWeather}
        gameTime={gameTime}
        cameraView={cameraView}
        trafficManager={trafficManagerRef.current}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onCycleCamera={handleCycleCamera}
        onResetCar={handleResetCar}
        onToggleHeadlights={handleToggleHeadlights}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTouchInput={handleTouchInput}
        touchState={touchState}
      />

      {/* Settings / Simulation Controls Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentWeather={currentWeather}
        onChangeWeather={handleChangeWeather}
        autoWeather={autoWeather}
        onToggleAutoWeather={handleToggleAutoWeather}
        gameTimeHours={gameTimeHours}
        onChangeGameTime={handleChangeGameTime}
        autoCycleTime={autoCycleTime}
        onToggleAutoCycleTime={handleToggleAutoCycleTime}
        cameraView={cameraView}
        onChangeCamera={handleChangeCamera}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResetCar={handleResetCar}
      />
    </div>
  );
}
