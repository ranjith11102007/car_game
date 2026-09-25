import React from 'react';
import { CameraView, VehicleTelemetry, WeatherType } from '../types';
import { Minimap } from './Minimap';
import { TrafficManager } from '../game/TrafficManager';
import {
  Sun,
  Cloud,
  Sunset,
  Moon,
  CloudRain,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Lightbulb,
  Zap,
} from 'lucide-react';

interface HUDProps {
  telemetry: VehicleTelemetry;
  weather: WeatherType;
  gameTime: string;
  cameraView: CameraView;
  trafficManager: TrafficManager | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onResetCar: () => void;
  onToggleHeadlights: () => void;
  onOpenSettings: () => void;
  // Touch Handlers
  onTouchInput: (key: 'forward' | 'backward' | 'left' | 'right' | 'drift' | 'nitro', active: boolean) => void;
  touchState: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    drift: boolean;
    nitro: boolean;
  };
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  weather,
  gameTime,
  cameraView,
  trafficManager,
  isMuted,
  onToggleMute,
  onCycleCamera,
  onResetCar,
  onToggleHeadlights,
  onOpenSettings,
  onTouchInput,
  touchState,
}) => {
  const getWeatherIcon = (type: WeatherType) => {
    switch (type) {
      case 'sunny':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'cloudy':
        return <Cloud className="w-4 h-4 text-slate-300" />;
      case 'sunset':
        return <Sunset className="w-4 h-4 text-orange-400" />;
      case 'night':
        return <Moon className="w-4 h-4 text-indigo-300" />;
      case 'rain':
        return <CloudRain className="w-4 h-4 text-sky-400" />;
    }
  };

  // Speed arc calculation (0 to 240 km/h)
  const maxDisplaySpeed = 240;
  const speedPercentage = Math.min(100, (telemetry.speedKmh / maxDisplaySpeed) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-4 md:p-6">
      {/* ================= TOP BAR ================= */}
      <div className="w-full flex items-start justify-between">
        {/* Top Left: Minimap + Position Info */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <Minimap
            playerX={telemetry.position.x}
            playerZ={telemetry.position.z}
            playerHeading={telemetry.heading}
            trafficManager={trafficManager}
          />
          <div className="bg-slate-950/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-3 text-xs font-mono text-slate-300 shadow-lg">
            <span className="flex items-center gap-1.5">
              {getWeatherIcon(weather)}
              <span className="capitalize">{weather}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span>{gameTime}</span>
          </div>
        </div>

        {/* Top Center: Drift Combo Toast */}
        {telemetry.isDrifting && (
          <div className="flex flex-col items-center animate-bounce">
            <div className="bg-gradient-to-r from-amber-500/90 to-red-600/90 backdrop-blur-md px-6 py-2 rounded-xl border border-amber-300/40 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center gap-3">
              <span className="font-speedo font-bold italic tracking-wider text-xl text-white">
                DRIFT +{telemetry.driftScore}
              </span>
              {telemetry.driftCombo > 1 && (
                <span className="bg-white text-amber-700 font-extrabold text-xs px-2 py-0.5 rounded-md shadow">
                  x{telemetry.driftCombo} COMBO
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-amber-300 mt-1 drop-shadow">
              {telemetry.driftAngle}° SLIP ANGLE
            </span>
          </div>
        )}

        {/* Top Right: Game controls (Camera, Reset, Audio, Settings) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleHeadlights}
            title="Toggle Headlights [L]"
            className={`p-2.5 rounded-xl border transition-all backdrop-blur-md shadow-lg ${
              telemetry.headlightsOn
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30'
                : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-5 h-5" />
          </button>

          <button
            onClick={onCycleCamera}
            title="Switch Camera [C]"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs font-medium"
          >
            <Camera className="w-5 h-5" />
            <span className="uppercase text-[10px] hidden sm:inline">{cameraView}</span>
          </button>

          <button
            onClick={onResetCar}
            title="Reset Car [R]"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all backdrop-blur-md shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleMute}
            title="Sound Mute/Unmute"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all backdrop-blur-md shadow-lg"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onOpenSettings}
            title="Settings & Time [ESC]"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all backdrop-blur-md shadow-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ================= BOTTOM BAR ================= */}
      <div className="w-full flex items-end justify-between">
        {/* Bottom Left: Touch Steering Controls (or desktop helper) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex gap-2">
            <button
              onPointerDown={() => onTouchInput('left', true)}
              onPointerUp={() => onTouchInput('left', false)}
              onPointerLeave={() => onTouchInput('left', false)}
              onPointerCancel={() => onTouchInput('left', false)}
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-2xl transition-transform active:scale-95 border backdrop-blur-md shadow-xl select-none touch-none ${
                touchState.left
                  ? 'bg-sky-500 text-white border-sky-300 scale-95 shadow-sky-500/40'
                  : 'bg-slate-900/85 text-slate-200 border-white/15 hover:bg-slate-800'
              }`}
            >
              ◀
            </button>
            <button
              onPointerDown={() => onTouchInput('right', true)}
              onPointerUp={() => onTouchInput('right', false)}
              onPointerLeave={() => onTouchInput('right', false)}
              onPointerCancel={() => onTouchInput('right', false)}
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-2xl transition-transform active:scale-95 border backdrop-blur-md shadow-xl select-none touch-none ${
                touchState.right
                  ? 'bg-sky-500 text-white border-sky-300 scale-95 shadow-sky-500/40'
                  : 'bg-slate-900/85 text-slate-200 border-white/15 hover:bg-slate-800'
              }`}
            >
              ▶
            </button>
          </div>
        </div>

        {/* Bottom Center: High-Tech Speedometer & Tachometer */}
        <div className="flex flex-col items-center">
          <div className="relative bg-slate-950/85 backdrop-blur-lg border border-white/15 px-6 py-4 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[210px]">
            {/* Speed Gauge Arc Indicator */}
            <div className="w-full flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Speed</span>
                <div className="flex items-baseline">
                  <span className="font-speedo text-4xl sm:text-5xl font-black tracking-tight text-white">
                    {telemetry.speedKmh.toString().padStart(3, '0')}
                  </span>
                  <span className="font-speedo text-xs sm:text-sm font-semibold text-sky-400 ml-1.5">KM/H</span>
                </div>
              </div>

              {/* Gear Box */}
              <div className="flex flex-col items-center bg-slate-900/90 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Gear</span>
                <span
                  className={`font-speedo text-2xl font-black ${
                    telemetry.gear === 'R'
                      ? 'text-red-500 animate-pulse'
                      : telemetry.gear === 'P'
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                >
                  {telemetry.gear}
                </span>
              </div>
            </div>

            {/* Speed Radial Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2 mt-3 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 transition-all duration-75"
                style={{ width: `${speedPercentage}%` }}
              />
            </div>

            {/* Nitro & State row */}
            <div className="w-full flex items-center justify-between mt-2.5 text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>NOS {telemetry.nitroPercent}%</span>
              </div>
              <span
                className={`uppercase px-2 py-0.5 rounded text-[10px] font-bold ${
                  telemetry.state === 'drifting'
                    ? 'bg-amber-500/20 text-amber-400'
                    : telemetry.state === 'braking'
                    ? 'bg-red-500/20 text-red-400'
                    : telemetry.state === 'reverse'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'text-slate-400'
                }`}
              >
                {telemetry.state}
              </span>
            </div>
          </div>

          {/* Desktop Controls Hint Banner */}
          <div className="hidden lg:flex items-center gap-4 text-[11px] font-mono text-slate-400 bg-slate-950/60 backdrop-blur-sm px-4 py-1 rounded-full border border-white/5 mt-2">
            <span>[W/S] Drive & Brake</span>
            <span>·</span>
            <span>[A/D] Steer</span>
            <span>·</span>
            <span>[SPACE] Drift / Skid</span>
            <span>·</span>
            <span>[SHIFT] Nitro</span>
            <span>·</span>
            <span>[R] Reset</span>
            <span>·</span>
            <span>[C] Cam</span>
          </div>
        </div>

        {/* Bottom Right: Responsive Drive / Brake / Drift Buttons (Requirement 13) */}
        <div className="flex flex-col gap-2.5 items-end pointer-events-auto">
          {/* BRAKE BUTTON */}
          <button
            onPointerDown={() => onTouchInput('backward', true)}
            onPointerUp={() => onTouchInput('backward', false)}
            onPointerLeave={() => onTouchInput('backward', false)}
            onPointerCancel={() => onTouchInput('backward', false)}
            className={`w-28 sm:w-32 h-14 rounded-2xl flex items-center justify-center font-bold text-sm tracking-wider uppercase transition-transform active:scale-95 border backdrop-blur-md shadow-xl select-none touch-none ${
              touchState.backward
                ? 'bg-red-600 text-white border-red-400 scale-95 shadow-red-500/50'
                : 'bg-slate-900/90 text-red-400 border-red-500/30 hover:bg-slate-800'
            }`}
          >
            BRAKE
          </button>

          {/* DRIFT BUTTON (Requirement 9 & 13) */}
          <button
            onPointerDown={() => onTouchInput('drift', true)}
            onPointerUp={() => onTouchInput('drift', false)}
            onPointerLeave={() => onTouchInput('drift', false)}
            onPointerCancel={() => onTouchInput('drift', false)}
            className={`w-28 sm:w-32 h-14 rounded-2xl flex items-center justify-center font-bold text-sm tracking-wider uppercase transition-transform active:scale-95 border backdrop-blur-md shadow-xl select-none touch-none ${
              touchState.drift
                ? 'bg-amber-500 text-slate-950 border-amber-300 scale-95 shadow-amber-500/50'
                : 'bg-slate-900/90 text-amber-400 border-amber-500/40 hover:bg-slate-800'
            }`}
          >
            DRIFT
          </button>

          {/* ACCELERATE BUTTON */}
          <button
            onPointerDown={() => onTouchInput('forward', true)}
            onPointerUp={() => onTouchInput('forward', false)}
            onPointerLeave={() => onTouchInput('forward', false)}
            onPointerCancel={() => onTouchInput('forward', false)}
            className={`w-28 sm:w-32 h-16 rounded-2xl flex items-center justify-center font-bold text-base tracking-wider uppercase transition-transform active:scale-95 border backdrop-blur-md shadow-2xl select-none touch-none ${
              touchState.forward
                ? 'bg-emerald-500 text-white border-emerald-300 scale-95 shadow-emerald-500/50'
                : 'bg-slate-900/90 text-emerald-400 border-emerald-500/40 hover:bg-slate-800'
            }`}
          >
            GAS
          </button>
        </div>
      </div>
    </div>
  );
};
