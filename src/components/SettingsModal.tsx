import React from 'react';
import { CameraView, WeatherType } from '../types';
import { X, Sun, Cloud, Sunset, Moon, CloudRain, Volume2, VolumeX, Eye } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeather: WeatherType;
  onChangeWeather: (w: WeatherType) => void;
  autoWeather: boolean;
  onToggleAutoWeather: () => void;
  gameTimeHours: number;
  onChangeGameTime: (hours: number) => void;
  autoCycleTime: boolean;
  onToggleAutoCycleTime: () => void;
  cameraView: CameraView;
  onChangeCamera: (c: CameraView) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetCar: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentWeather,
  onChangeWeather,
  autoWeather,
  onToggleAutoWeather,
  gameTimeHours,
  onChangeGameTime,
  autoCycleTime,
  onToggleAutoCycleTime,
  cameraView,
  onChangeCamera,
  isMuted,
  onToggleMute,
  onResetCar,
}) => {
  if (!isOpen) return null;

  const weatherOptions: { type: WeatherType; label: string; icon: React.ReactNode }[] = [
    { type: 'sunny', label: 'Sunny', icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { type: 'cloudy', label: 'Cloudy', icon: <Cloud className="w-4 h-4 text-slate-300" /> },
    { type: 'sunset', label: 'Sunset', icon: <Sunset className="w-4 h-4 text-orange-400" /> },
    { type: 'night', label: 'Night', icon: <Moon className="w-4 h-4 text-indigo-300" /> },
    { type: 'rain', label: 'Rain', icon: <CloudRain className="w-4 h-4 text-sky-400" /> },
  ];

  const cameraOptions: { type: CameraView; label: string }[] = [
    { type: 'chase', label: 'Chase Cam' },
    { type: 'close', label: 'Close Cam' },
    { type: 'hood', label: 'Hood Cam' },
    { type: 'top', label: 'Top-Down' },
  ];

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.floor((h - hrs) * 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-speedo">Simulation Controls</h2>
            <p className="text-xs text-slate-400 mt-0.5">Customize environment, weather cycle, and vehicle camera</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weather Selector */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Weather State</label>
            <button
              onClick={onToggleAutoWeather}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                autoWeather ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Auto-Cycle: {autoWeather ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weatherOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => onChangeWeather(opt.type)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  currentWeather === opt.type
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-white/5 hover:bg-slate-800'
                }`}
              >
                {opt.icon}
                <span className="capitalize">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time of Day */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Time of Day ({formatHours(gameTimeHours)})
            </label>
            <button
              onClick={onToggleAutoCycleTime}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                autoCycleTime ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Time Flow: {autoCycleTime ? 'ON' : 'PAUSED'}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="23.9"
            step="0.25"
            value={gameTimeHours}
            onChange={(e) => onChangeGameTime(parseFloat(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>00:00 Night</span>
            <span>06:00 Dawn</span>
            <span>12:00 Noon</span>
            <span>18:00 Sunset</span>
            <span>23:59</span>
          </div>
        </div>

        {/* Camera Views */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            Camera Perspective
          </label>
          <div className="grid grid-cols-4 gap-2">
            {cameraOptions.map((c) => (
              <button
                key={c.type}
                onClick={() => onChangeCamera(c.type)}
                className={`py-2 px-1 text-center rounded-xl border text-xs font-medium transition-all ${
                  cameraView === c.type
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-white/5 hover:bg-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions & Sound */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onToggleMute}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            <span>{isMuted ? 'Unmute Audio' : 'Mute Engine Sounds'}</span>
          </button>

          <button
            onClick={() => {
              onResetCar();
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white flex items-center justify-center gap-2 text-xs font-semibold transition-colors shadow-lg"
          >
            <span>Reset Car to Road</span>
          </button>
        </div>
      </div>
    </div>
  );
};
