import React, { useEffect, useRef } from 'react';

/**
 * AuroraCurtainCanvas
 * Smooth 60fps HTML5 Canvas implementation of the flowing emerald aurora / silk
 * curtains rotated at a 45-degree angle.
 *
 * Configured with balanced ambient luminance (max 0.28-0.35 opacity and gentle highlights)
 * so that foreground buttons, commands, icons, and text maintain 100% crystal-clear contrast
 * and readable hierarchy without blinding glare or washed-out backgrounds.
 */
export const AuroraCurtainCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);

    // Diagonal Aurora curtain ribbons definition
    // Adjusted with sophisticated atmospheric opacities to preserve text contrast
    const ribbons = [
      {
        baseX: -0.35,
        width: 0.34,
        speed: 0.00065,
        freq: 1.8,
        phase: 0.2,
        amp: 24,
        colorCore: 'rgba(0, 255, 170, 0.26)',
        colorMid: 'rgba(16, 185, 129, 0.16)',
        colorEdge: 'rgba(1, 46, 42, 0.01)',
        highlightX: 0.45,
        glow: 20,
      },
      {
        baseX: -0.05,
        width: 0.28,
        speed: 0.0009,
        freq: 2.2,
        phase: 1.7,
        amp: 20,
        colorCore: 'rgba(121, 251, 245, 0.32)',
        colorMid: 'rgba(5, 150, 105, 0.20)',
        colorEdge: 'rgba(0, 30, 26, 0.01)',
        highlightX: 0.5,
        glow: 24,
      },
      // Silky needle ray with refined luminous balance
      {
        baseX: 0.02,
        width: 0.09,
        speed: 0.0013,
        freq: 3.0,
        phase: 2.4,
        amp: 14,
        colorCore: 'rgba(210, 255, 248, 0.45)',
        colorMid: 'rgba(0, 255, 179, 0.28)',
        colorEdge: 'rgba(0, 0, 0, 0)',
        highlightX: 0.5,
        glow: 26,
      },
      {
        baseX: 0.25,
        width: 0.36,
        speed: 0.0006,
        freq: 1.6,
        phase: 3.1,
        amp: 26,
        colorCore: 'rgba(52, 211, 153, 0.28)',
        colorMid: 'rgba(4, 120, 87, 0.18)',
        colorEdge: 'rgba(1, 35, 32, 0.01)',
        highlightX: 0.42,
        glow: 22,
      },
      {
        baseX: 0.55,
        width: 0.30,
        speed: 0.0008,
        freq: 2.4,
        phase: 4.8,
        amp: 18,
        colorCore: 'rgba(0, 255, 200, 0.25)',
        colorMid: 'rgba(13, 148, 136, 0.15)',
        colorEdge: 'rgba(0, 25, 22, 0.01)',
        highlightX: 0.55,
        glow: 18,
      },
    ];

    // Floating micro-energy embers
    const motes = Array.from({ length: 20 }, () => ({
      x: (Math.random() - 0.5) * 1.6,
      y: (Math.random() - 0.5) * 1.6,
      radius: Math.random() * 1.6 + 0.5,
      speedY: -(Math.random() * 0.0003 + 0.00012),
      speedX: -(Math.random() * 0.00018 + 0.00008),
      alpha: Math.random() * 0.45 + 0.15,
      pulseSpeed: Math.random() * 0.002 + 0.001,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = (timestamp: number) => {
      time = timestamp;

      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric baseline gradient
      const baseGrad = ctx.createLinearGradient(0, 0, width, height);
      baseGrad.addColorStop(0, 'rgba(0, 18, 17, 0.94)');
      baseGrad.addColorStop(0.5, 'rgba(1, 29, 28, 0.96)');
      baseGrad.addColorStop(1, 'rgba(0, 15, 14, 0.98)');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // Diagonal 45° Coordinate System
      const diagonal = Math.sqrt(width * width + height * height);
      const span = diagonal * 1.4;

      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.rotate(Math.PI / 4); // 45° angle

      ctx.globalCompositeOperation = 'screen';

      // 1. Draw 45° flowing silk ribbons
      ribbons.forEach((ribbon) => {
        const segs = 36;
        const segHeight = span / segs;
        const startY = -span * 0.5;

        const leftPoints: { x: number; y: number }[] = [];
        const rightPoints: { x: number; y: number }[] = [];

        const t = time * ribbon.speed + ribbon.phase;
        const rWidth = ribbon.width * span;
        const rCenterX = ribbon.baseX * span;

        for (let i = 0; i <= segs; i++) {
          const y = startY + i * segHeight;
          const normY = (y - startY) / span;

          const wave1 = Math.sin(normY * Math.PI * ribbon.freq + t) * ribbon.amp;
          const wave2 = Math.cos(normY * Math.PI * (ribbon.freq * 1.7) - t * 0.7) * (ribbon.amp * 0.45);
          const cx = rCenterX + wave1 + wave2;

          leftPoints.push({ x: cx - rWidth * 0.5, y });
          rightPoints.push({ x: cx + rWidth * 0.5, y });
        }

        ctx.beginPath();
        ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
        for (let i = 1; i < leftPoints.length; i++) {
          const xc = (leftPoints[i - 1].x + leftPoints[i].x) / 2;
          const yc = (leftPoints[i - 1].y + leftPoints[i].y) / 2;
          ctx.quadraticCurveTo(leftPoints[i - 1].x, leftPoints[i - 1].y, xc, yc);
        }
        ctx.lineTo(leftPoints[leftPoints.length - 1].x, leftPoints[leftPoints.length - 1].y);
        ctx.lineTo(rightPoints[rightPoints.length - 1].x, rightPoints[rightPoints.length - 1].y);

        for (let i = rightPoints.length - 2; i >= 0; i--) {
          const xc = (rightPoints[i + 1].x + rightPoints[i].x) / 2;
          const yc = (rightPoints[i + 1].y + rightPoints[i].y) / 2;
          ctx.quadraticCurveTo(rightPoints[i + 1].x, rightPoints[i + 1].y, xc, yc);
        }
        ctx.closePath();

        const ribbonGrad = ctx.createLinearGradient(
          rCenterX - rWidth * 0.5,
          0,
          rCenterX + rWidth * 0.5,
          0
        );
        ribbonGrad.addColorStop(0, ribbon.colorEdge);
        ribbonGrad.addColorStop(Math.max(0.1, ribbon.highlightX - 0.2), ribbon.colorMid);
        ribbonGrad.addColorStop(ribbon.highlightX, ribbon.colorCore);
        ribbonGrad.addColorStop(Math.min(0.9, ribbon.highlightX + 0.2), ribbon.colorMid);
        ribbonGrad.addColorStop(1, ribbon.colorEdge);

        ctx.fillStyle = ribbonGrad;
        ctx.shadowColor = ribbon.colorCore;
        ctx.shadowBlur = ribbon.glow;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 2. 45° silky fiber streaks
      const streakCount = 12;
      for (let s = 0; s < streakCount; s++) {
        const sxNorm = (s / streakCount) * 1.2 - 0.6;
        const st = time * 0.0011 + s * 1.35;
        const wave = Math.sin(st) * 12;
        const sx = sxNorm * span + wave;

        const streakGrad = ctx.createLinearGradient(0, -span * 0.5, 0, span * 0.5);
        streakGrad.addColorStop(0, 'rgba(0, 255, 200, 0)');
        streakGrad.addColorStop(0.2, 'rgba(0, 255, 180, 0.08)');
        streakGrad.addColorStop(0.5, 'rgba(180, 255, 245, 0.22)');
        streakGrad.addColorStop(0.8, 'rgba(16, 185, 129, 0.12)');
        streakGrad.addColorStop(1, 'rgba(0, 255, 180, 0)');

        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = s % 3 === 0 ? 1.8 : 1;
        ctx.beginPath();
        ctx.moveTo(sx, -span * 0.5);
        ctx.bezierCurveTo(
          sx + Math.sin(st + 1) * 20,
          -span * 0.15,
          sx - Math.cos(st + 2) * 20,
          span * 0.2,
          sx + Math.sin(st + 3) * 15,
          span * 0.5
        );
        ctx.stroke();
      }

      // 3. Floating energy motes
      motes.forEach((mote) => {
        mote.y += mote.speedY;
        mote.x += mote.speedX;
        if (mote.y < -0.8) mote.y = 0.8;
        if (mote.x < -0.8) mote.x = 0.8;
        if (mote.x > 0.8) mote.x = -0.8;

        const pulse = Math.sin(time * mote.pulseSpeed + mote.pulsePhase);
        const currentAlpha = Math.max(0.1, mote.alpha + pulse * 0.2);

        ctx.fillStyle = `rgba(180, 255, 240, ${currentAlpha.toFixed(2)})`;
        ctx.shadowColor = 'rgba(0, 255, 170, 0.7)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(mote.x * span, mote.y * span, mote.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // 4. Subtle corner vignette
      const cornerGlow = ctx.createRadialGradient(
        width * 0.15,
        height * 0.85,
        15,
        width * 0.15,
        height * 0.85,
        width * 0.8
      );
      cornerGlow.addColorStop(0, 'rgba(0, 255, 162, 0.14)');
      cornerGlow.addColorStop(0.5, 'rgba(0, 130, 124, 0.05)');
      cornerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cornerGlow;
      ctx.fillRect(0, 0, width, height);

      // 5. Subtle tech grid
      ctx.strokeStyle = 'rgba(0, 255, 162, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 28;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
