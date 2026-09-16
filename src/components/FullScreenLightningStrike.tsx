import React, { useEffect, useState, useRef } from 'react';

interface FullScreenLightningStrikeProps {
  /** Incremented or changed whenever a strike should trigger */
  triggerKey: number | string;
  onFinished?: () => void;
}

/**
 * FullScreenLightningStrike
 * A high-intensity, cinematic electric thunderstorm strike that crosses the ENTIRE viewport
 * whenever search results are displayed or triggered:
 * - Massive jagged lightning bolts spanning corner-to-corner across the whole screen
 * - Branching secondary & tertiary plasma arcs reaching the edges
 * - Multi-stage blinding flashes with screen shake vibration
 * - Deep procedural thunder rumble using native Web Audio API (gracefully silent if audio restricted)
 */
export const FullScreenLightningStrike: React.FC<FullScreenLightningStrikeProps> = ({
  triggerKey,
  onFinished,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [strikePhase, setStrikePhase] = useState<'idle' | 'striking' | 'fading'>('idle');
  const lastKeyRef = useRef<number | string>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play procedural thunder sound (no external mp3 needed, works anywhere with Web Audio)
  const playThunderSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const duration = 2.2;
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate brown/pink filtered noise for heavy thunder rumble
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.025 * white)) / 1.025;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Lowpass filter that opens on lightning strike and closes into a deep rumble
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.6);
      filter.frequency.exponentialRampToValueAtTime(35, now + duration);

      // Master thunder gain envelope (sharp crack, then deep rolling decay)
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);
    } catch {
      // Graceful fallback: visuals continue unaffected
    }
  };

  useEffect(() => {
    // Only fire if triggerKey changed and is non-zero / non-empty
    if (!triggerKey || triggerKey === lastKeyRef.current) return;
    lastKeyRef.current = triggerKey;

    setIsActive(true);
    setStrikePhase('striking');

    // Trigger thunder sound
    playThunderSound();

    // After 750ms, begin smooth fade out
    const fadeTimer = setTimeout(() => {
      setStrikePhase('fading');
    }, 750);

    // After 1200ms, reset completely
    const resetTimer = setTimeout(() => {
      setIsActive(false);
      setStrikePhase('idle');
      onFinished?.();
    }, 1250);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(resetTimer);
    };
  }, [triggerKey, onFinished]);

  if (!isActive) return null;

  return (
    <div
      id="fullscreen-mega-lightning"
      className="fixed inset-0 w-screen h-screen z-50 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        /* --- Screen Shake & Flash Keyframes --- */
        @keyframes thunderScreenShake {
          0% { transform: translate3d(0, 0, 0); }
          15% { transform: translate3d(-5px, 4px, 0); }
          30% { transform: translate3d(6px, -3px, 0); }
          45% { transform: translate3d(-4px, 3px, 0); }
          60% { transform: translate3d(3px, -2px, 0); }
          75% { transform: translate3d(-2px, 1px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes blindingSkyFlash {
          0% { opacity: 0; }
          8% { opacity: 0.85; background-color: rgba(237, 255, 254, 0.95); }
          14% { opacity: 0.25; }
          22% { opacity: 1; background-color: rgba(255, 255, 255, 0.98); }
          32% { opacity: 0.7; background-color: rgba(121, 251, 245, 0.85); }
          42% { opacity: 0.95; background-color: rgba(203, 255, 252, 0.9); }
          55% { opacity: 0.4; }
          70% { opacity: 0.2; }
          100% { opacity: 0; }
        }

        @keyframes boltStrobeA {
          0% { opacity: 0; transform: scale(0.98); }
          5% { opacity: 1; transform: scale(1); }
          12% { opacity: 0.3; }
          18% { opacity: 1; }
          28% { opacity: 0.4; }
          35% { opacity: 0.95; }
          50% { opacity: 0.8; }
          75% { opacity: 0.3; }
          100% { opacity: 0; }
        }

        @keyframes boltStrobeB {
          0%, 15% { opacity: 0; }
          20% { opacity: 1; }
          30% { opacity: 0.2; }
          38% { opacity: 1; }
          55% { opacity: 0.6; }
          80% { opacity: 0.2; }
          100% { opacity: 0; }
        }

        .lightning-shake-container {
          animation: thunderScreenShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        .sky-strobe-flash {
          animation: blindingSkyFlash 1.1s ease-out both;
        }

        .bolt-primary {
          animation: boltStrobeA 0.95s ease-out both;
        }

        .bolt-secondary {
          animation: boltStrobeB 0.95s ease-out both;
        }
      `}</style>

      {/* Screen Shaker Wrapper */}
      <div className="lightning-shake-container relative w-full h-full">
        
        {/* --- 1. FULLSCREEN BLINDING SKY STROBE --- */}
        <div className="sky-strobe-flash absolute inset-0 mix-blend-screen" />

        {/* --- 2. MASSIVE PRIMARY BOLT: CROSSES ENTIRE SCREEN CORNER-TO-CORNER --- */}
        <svg
          className="bolt-primary absolute inset-0 w-full h-full drop-shadow-[0_0_25px_rgba(121,251,245,0.9)]"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="megaLightningGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blurGlow" />
              <feGaussianBlur stdDeviation="3" result="sharpGlow" />
              <feMerge>
                <feMergeNode in="blurGlow" />
                <feMergeNode in="sharpGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="boltGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#edfffe" />
              <stop offset="70%" stopColor="#79fbf5" />
              <stop offset="100%" stopColor="#00b4aa" />
            </linearGradient>
          </defs>

          {/* === AURA 1: Ultra-wide Outer Plasma Ionization (32px width) === */}
          <path
            d="M 320 0 
               L 410 95 L 360 160 L 480 250 L 590 320 L 510 400 L 690 490 
               L 610 580 L 820 670 L 960 740 L 910 820 L 1150 900 L 1280 970 L 1230 1010 L 1480 1080"
            stroke="#00827c"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />

          {/* === AURA 2: Cyan Plasma Sheath (14px width) === */}
          <path
            d="M 320 0 
               L 410 95 L 360 160 L 480 250 L 590 320 L 510 400 L 690 490 
               L 610 580 L 820 670 L 960 740 L 910 820 L 1150 900 L 1280 970 L 1230 1010 L 1480 1080"
            stroke="#79fbf5"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* === CORE 1: Blinding White Core Lightning Beam (5px width) === */}
          <path
            d="M 320 0 
               L 410 95 L 360 160 L 480 250 L 590 320 L 510 400 L 690 490 
               L 610 580 L 820 670 L 960 740 L 910 820 L 1150 900 L 1280 970 L 1230 1010 L 1480 1080"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#megaLightningGlow)"
          />

          {/* === BRANCH 1: Shoots from upper fork all the way across to the far left margin === */}
          <path
            d="M 480 250 L 330 310 L 220 280 L 110 380 L 40 450 L 0 520"
            stroke="#79fbf5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M 480 250 L 330 310 L 220 280 L 110 380 L 40 450 L 0 520"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* === BRANCH 2: Shoots from center fork across to the right margin === */}
          <path
            d="M 690 490 L 880 470 L 1050 510 L 1280 480 L 1520 540 L 1760 520 L 1920 590"
            stroke="#79fbf5"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M 690 490 L 880 470 L 1050 510 L 1280 480 L 1520 540 L 1760 520 L 1920 590"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* === BRANCH 3: Shoots from lower-mid fork down to bottom-left corner === */}
          <path
            d="M 820 670 L 680 760 L 520 830 L 390 940 L 210 1020 L 90 1080"
            stroke="#79fbf5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M 820 670 L 680 760 L 520 830 L 390 940 L 210 1020 L 90 1080"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* === BRANCH 4: Shoots from bottom fork into the bottom-right corner === */}
          <path
            d="M 1150 900 L 1380 940 L 1590 980 L 1800 1030 L 1920 1080"
            stroke="#79fbf5"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        </svg>

        {/* --- 3. COUNTER-LIGHTNING BOLT: CROSSES FROM TOP-RIGHT TO BOTTOM-LEFT --- */}
        <svg
          className="bolt-secondary absolute inset-0 w-full h-full drop-shadow-[0_0_28px_rgba(203,255,252,0.95)]"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Cyan Plasma Glow */}
          <path
            d="M 1550 0 
               L 1420 120 L 1480 190 L 1310 310 L 1180 410 L 1240 480 
               L 1020 600 L 890 690 L 940 760 L 710 880 L 560 970 L 380 1080"
            stroke="#79fbf5"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />

          {/* Intense White Arc */}
          <path
            d="M 1550 0 
               L 1420 120 L 1480 190 L 1310 310 L 1180 410 L 1240 480 
               L 1020 600 L 890 690 L 940 760 L 710 880 L 560 970 L 380 1080"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#megaLightningGlow)"
          />

          {/* Tertiary Fork reaching right-edge at middle height */}
          <path
            d="M 1310 310 L 1480 340 L 1650 310 L 1820 370 L 1920 390"
            stroke="#cbfffc"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Branch shooting straight down the middle */}
          <path
            d="M 1020 600 L 1050 720 L 1010 840 L 1060 960 L 1040 1080"
            stroke="#79fbf5"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        </svg>

        {/* --- 4. IONIZED AIR SPARK DISCHARGE BURSTS --- */}
        <div className="absolute top-[18%] left-[22%] w-60 h-60 rounded-full bg-[#cbfffc]/40 blur-2xl pointer-events-none" />
        <div className="absolute top-[48%] left-[48%] w-80 h-80 rounded-full bg-[#79fbf5]/45 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[14%] right-[22%] w-72 h-72 rounded-full bg-[#edfffe]/40 blur-2xl pointer-events-none" />

      </div>
    </div>
  );
};
