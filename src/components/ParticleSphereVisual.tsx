import React, { useEffect, useRef } from 'react';

interface ParticleSphereVisualProps {
  size?: number;
  className?: string;
  dotCount?: number;
}

export const ParticleSphereVisual: React.FC<ParticleSphereVisualProps> = ({
  size = 180,
  className = '',
  dotCount = 420,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleX = 0.002;
    let angleY = 0.004;

    // Generate points on sphere using Fibonacci sphere distribution
    const points: Array<{ x: number; y: number; z: number; color: string; size: number }> = [];
    const radius = size * 0.42;

    const colors = [
      'rgba(203, 255, 252, 0.95)', // pale aqua / teal-cyan
      'rgba(0, 130, 124, 0.85)',   // deep cyan teal
      'rgba(255, 255, 255, 0.95)',  // platinum white
      'rgba(250, 209, 255, 0.75)',  // lavender pink accent
      'rgba(237, 255, 254, 0.85)',  // liquid mist
    ];

    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const color = colors[i % colors.length];
      const dotSize = Math.random() < 0.15 ? 2.0 : 1.2;

      points.push({ x, y, z, color, size: dotSize });
    }

    let rotX = 0;
    let rotY = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      rotX += angleX;
      rotY += angleY;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Sort points by z for depth
      const projected = points.map(p => {
        // Rotate around Y
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotate around X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Perspective
        const fov = 400;
        const scale = fov / (fov + z2);
        const x2d = cx + x1 * scale;
        const y2d = cy + y2 * scale;
        const alpha = Math.max(0.12, (z2 + radius) / (2 * radius));

        return {
          x: x2d,
          y: y2d,
          scale,
          alpha,
          color: p.color,
          dotSize: p.size,
          z: z2,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.dotSize * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, dotCount]);

  return (
    <div className={`relative flex items-center justify-center pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full"
      />
    </div>
  );
};
