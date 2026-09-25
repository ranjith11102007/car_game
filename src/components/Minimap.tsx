import React, { useEffect, useRef } from 'react';
import { TrafficManager } from '../game/TrafficManager';
import { CITY_CONFIG } from '../constants';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  trafficManager: TrafficManager | null;
  className?: string;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerHeading,
  trafficManager,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 4;
    const scale = 0.42; // pixels per world meter

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Circular radar clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    // Radar background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, size, size);

    // Subtle radar range circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.35, 0, Math.PI * 2);
    ctx.arc(center, center, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Rotate context so minimap is oriented either North-Up or Vehicle-Up. Vehicle-up makes driving much more intuitive!
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(playerHeading);

    // Draw Roads (Grid Avenues)
    const step = CITY_CONFIG.BLOCK_SIZE;
    const half = CITY_CONFIG.GRID_HALF_EXTENT;
    const roadW = CITY_CONFIG.ROAD_WIDTH * scale;

    ctx.fillStyle = 'rgba(71, 85, 105, 0.75)';

    // Roads along X
    for (let i = -half; i <= half; i++) {
      const worldZ = i * step;
      const relZ = (worldZ - playerZ) * scale;
      if (Math.abs(relZ) < radius + 30) {
        ctx.fillRect(-radius - 30, relZ - roadW / 2, (radius + 30) * 2, roadW);
      }
    }

    // Roads along Z
    for (let i = -half; i <= half; i++) {
      const worldX = i * step;
      const relX = (worldX - playerX) * scale;
      if (Math.abs(relX) < radius + 30) {
        ctx.fillRect(relX - roadW / 2, -radius - 30, roadW, (radius + 30) * 2);
      }
    }

    // Center yellow road lines on nearby roads
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 1;
    for (let i = -half; i <= half; i++) {
      const worldZ = i * step;
      const relZ = (worldZ - playerZ) * scale;
      if (Math.abs(relZ) < radius) {
        ctx.beginPath();
        ctx.moveTo(-radius, relZ);
        ctx.lineTo(radius, relZ);
        ctx.stroke();
      }

      const worldX = i * step;
      const relX = (worldX - playerX) * scale;
      if (Math.abs(relX) < radius) {
        ctx.beginPath();
        ctx.moveTo(relX, -radius);
        ctx.lineTo(relX, radius);
        ctx.stroke();
      }
    }

    // Draw Traffic Cars
    if (trafficManager) {
      for (const car of trafficManager.cars) {
        const relX = (car.pos.x - playerX) * scale;
        const relZ = (car.pos.z - playerZ) * scale;
        const dist = Math.hypot(relX, relZ);
        if (dist < radius - 4) {
          ctx.fillStyle = '#f59e0b'; // amber blip
          ctx.beginPath();
          ctx.arc(relX, relZ, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore(); // Restore car rotation

    // Draw Player marker in the center (always points UP because of rotation)
    ctx.fillStyle = '#38bdf8'; // Electric cyan
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(center, center - 8);
    ctx.lineTo(center + 5, center + 6);
    ctx.lineTo(center, center + 3);
    ctx.lineTo(center - 5, center + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // Restore circular clip

    // Radar Glass Outer Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // North Indicator 'N'
    const northAngle = -playerHeading - Math.PI / 2;
    const nx = center + Math.cos(northAngle) * (radius - 10);
    const ny = center + Math.sin(northAngle) * (radius - 10);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);
  }, [playerX, playerZ, playerHeading, trafficManager]);

  return (
    <div className={`relative rounded-full shadow-2xl backdrop-blur-md border border-white/10 ${className}`}>
      <canvas ref={canvasRef} width={150} height={150} className="w-[150px] h-[150px] rounded-full" />
    </div>
  );
};
