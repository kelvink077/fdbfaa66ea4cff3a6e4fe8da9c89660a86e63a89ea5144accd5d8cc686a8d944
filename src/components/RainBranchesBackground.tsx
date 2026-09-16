import React, { useId } from 'react';

/**
 * RainBranchesBackground
 * An immersive, ambient nature backdrop matching the Shazam Buscas emerald/cyan liquid palette:
 * - Lush cascading tree branches & swaying leaves along the left margin (filling the left gutter completely)
 * - Upper canopy and right-side hanging foliage framing the workspace
 * - Slanted wind-driven rain streaks with droplets splashing on leaves and dripping down
 * - Distant thunderstorms with periodic lightning flashes and electric arcs illuminating the forest canopy
 */
export const RainBranchesBackground: React.FC = () => {
  const compId = useId().replace(/:/g, '');

  return (
    <div 
      id="rain-branches-ambient-backdrop"
      className="pointer-events-none sticky top-0 left-0 w-full h-screen -mb-[100vh] overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      <style>{`
        /* ================= LIGHTNING ATMOSPHERE ================= */
        @keyframes lightningSkyFlash_${compId} {
          0%, 80% { opacity: 0; }
          81% { opacity: 0.6; }
          81.5% { opacity: 0.15; }
          82.3% { opacity: 0.85; }
          83.2% { opacity: 0.25; }
          84.0% { opacity: 0.7; }
          85.5% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes lightningBolt_${compId} {
          0%, 81.8% { opacity: 0; }
          82.0% { opacity: 0.95; }
          82.5% { opacity: 0.2; }
          83.1% { opacity: 1; }
          83.8% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes leavesLightningGlow_${compId} {
          0%, 80% { filter: drop-shadow(0 0 0px transparent); }
          81.5% { filter: drop-shadow(0 0 18px rgba(121, 251, 245, 0.4)) brightness(1.35); }
          82.3% { filter: drop-shadow(0 0 28px rgba(203, 255, 252, 0.75)) brightness(1.65); }
          84.0% { filter: drop-shadow(0 0 12px rgba(121, 251, 245, 0.35)) brightness(1.25); }
          85.5% { filter: drop-shadow(0 0 0px transparent) brightness(1); }
          100% { filter: drop-shadow(0 0 0px transparent) brightness(1); }
        }

        /* ================= BRANCH & FOLIAGE SWAY MECHANICS ================= */
        @keyframes branchSwayLeftCol_${compId} {
          0%, 100% { transform: rotate(0deg) skewX(0deg) translate3d(0,0,0); }
          28% { transform: rotate(1.8deg) skewX(0.7deg) translate3d(2px, 1px, 0); }
          62% { transform: rotate(-1.5deg) skewX(-0.5deg) translate3d(-2px, -1px, 0); }
          84% { transform: rotate(0.9deg) skewX(0.3deg) translate3d(1px, 0, 0); }
        }

        @keyframes branchSwayLeftTop_${compId} {
          0%, 100% { transform: rotate(0deg) skewX(0deg); }
          30% { transform: rotate(2.4deg) skewX(0.8deg); }
          65% { transform: rotate(-1.8deg) skewX(-0.6deg); }
          85% { transform: rotate(1.1deg) skewX(0.3deg); }
        }

        @keyframes branchSwayRight_${compId} {
          0%, 100% { transform: rotate(0deg) skewX(0deg); }
          32% { transform: rotate(-2.6deg) skewX(-0.8deg); }
          68% { transform: rotate(1.9deg) skewX(0.6deg); }
          88% { transform: rotate(-1deg) skewX(-0.3deg); }
        }

        @keyframes leafFlutterA_${compId} {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(4.5deg) scale(1.02); }
          55% { transform: rotate(-4.2deg) scale(0.98); }
          80% { transform: rotate(2.2deg) scale(1.01); }
        }

        @keyframes leafFlutterB_${compId} {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-5.5deg) scale(1.03); }
          60% { transform: rotate(5deg) scale(0.97); }
          85% { transform: rotate(-2.5deg); }
        }

        @keyframes leafFlutterC_${compId} {
          0%, 100% { transform: rotate(0deg); }
          35% { transform: rotate(4.8deg); }
          70% { transform: rotate(-3.9deg); }
        }

        @keyframes leafFlutterD_${compId} {
          0%, 100% { transform: rotate(0deg) scale(1); }
          22% { transform: rotate(-3.5deg) scale(1.02); }
          50% { transform: rotate(3.2deg) scale(0.99); }
          78% { transform: rotate(-1.8deg) scale(1.01); }
        }

        /* ================= RAIN FALL & DROPLET SPLASH ================= */
        @keyframes rainFall_${compId} {
          0% { transform: translate3d(0, -180px, 0); }
          100% { transform: translate3d(-110px, 1200px, 0); }
        }

        @keyframes dropletSplash_${compId} {
          0% { transform: scale(0.2); opacity: 0; }
          40% { opacity: 0.95; }
          100% { transform: scale(2.4); opacity: 0; }
        }

        @keyframes waterDrip_${compId} {
          0% { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0; }
          15% { opacity: 0.85; transform: translate3d(0, 4px, 0) scale(1); }
          45% { opacity: 0.95; transform: translate3d(0, 12px, 0) scale(1.15); }
          100% { transform: translate3d(-12px, 95px, 0) scale(0.5); opacity: 0; }
        }

        /* Ambient animated classes */
        .ambient-left-col {
          transform-origin: 0% 0%;
          animation: branchSwayLeftCol_${compId} 9.2s ease-in-out infinite;
        }

        .ambient-left-top {
          transform-origin: 0% 0%;
          animation: branchSwayLeftTop_${compId} 8.2s ease-in-out infinite;
        }

        .ambient-right {
          transform-origin: 100% 0%;
          animation: branchSwayRight_${compId} 10.4s ease-in-out infinite;
        }

        .flutter-a {
          transform-box: fill-box;
          transform-origin: 15% 50%;
          animation: leafFlutterA_${compId} 4.1s ease-in-out infinite;
        }

        .flutter-b {
          transform-box: fill-box;
          transform-origin: 85% 50%;
          animation: leafFlutterB_${compId} 3.7s ease-in-out infinite;
        }

        .flutter-c {
          transform-box: fill-box;
          transform-origin: center;
          animation: leafFlutterC_${compId} 4.9s ease-in-out infinite;
        }

        .flutter-d {
          transform-box: fill-box;
          transform-origin: 20% 80%;
          animation: leafFlutterD_${compId} 3.4s ease-in-out infinite;
        }

        .rain-streak {
          animation: rainFall_${compId} linear infinite;
        }

        .splash-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: dropletSplash_${compId} 1.9s ease-out infinite;
        }

        .water-drop-bead {
          animation: waterDrip_${compId} 2.5s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite;
        }

        .lightning-sky-overlay {
          animation: lightningSkyFlash_${compId} 18s ease-out infinite;
        }

        .lightning-bolt-path {
          animation: lightningBolt_${compId} 18s ease-out infinite;
        }

        .foliage-lightning-glow {
          animation: leavesLightningGlow_${compId} 18s ease-out infinite;
        }
      `}</style>

      {/* --- LAYER 1: Deep Atmospheric Liquid Canvas Background Gradient --- */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#011a18]/70 via-[#012624]/30 to-[#012624]/90" />

      {/* --- LAYER 2: Thunderstorm Horizon Lightning Flash --- */}
      <div className="lightning-sky-overlay absolute inset-0 bg-gradient-to-br from-[#79fbf5]/25 via-[#00827c]/20 to-transparent mix-blend-screen pointer-events-none" />
      <div className="lightning-sky-overlay absolute -top-32 left-1/4 w-[750px] h-[750px] rounded-full bg-[#cbfffc]/15 blur-3xl pointer-events-none" />

      {/* --- LAYER 3: Distant Electric Lightning Bolt SVG --- */}
      <svg
        className="lightning-bolt-path absolute top-0 left-[22%] sm:left-[30%] w-80 h-[420px] opacity-0 pointer-events-none"
        viewBox="0 0 240 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 140 0 L 120 65 L 155 72 L 105 160 L 135 168 L 75 270 L 100 276 L 50 375"
          stroke="#edfffe"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lightningGlowShared)"
        />
        <path
          d="M 120 65 L 85 105 L 98 110 L 70 160"
          stroke="#79fbf5"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <path
          d="M 105 160 L 140 210 L 128 215 L 150 260"
          stroke="#79fbf5"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <defs>
          <filter id="lightningGlowShared" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* --- LAYER 4: Continuous Falling Rain Streaks (Dense, Multilayered) --- */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rainGradFine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#79fbf5" stopOpacity="0" />
            <stop offset="70%" stopColor="#79fbf5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#edfffe" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="rainGradTeal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00827c" stopOpacity="0" />
            <stop offset="80%" stopColor="#00b4aa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#79fbf5" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="rainGradBiolum" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00a89d" stopOpacity="0" />
            <stop offset="60%" stopColor="#79fbf5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#cbfffc" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Rain Layer 1 - Fine & Fast */}
        <g className="rain-streak" style={{ animationDuration: '1.15s' }}>
          <line x1="4%" y1="4%" x2="1%" y2="12%" stroke="url(#rainGradFine)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="15%" y1="18%" x2="12%" y2="28%" stroke="url(#rainGradTeal)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="26%" y1="2%" x2="23%" y2="11%" stroke="url(#rainGradFine)" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="39%" y1="20%" x2="36%" y2="30%" stroke="url(#rainGradBiolum)" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="52%" y1="8%" x2="49%" y2="18%" stroke="url(#rainGradFine)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="68%" y1="14%" x2="65%" y2="25%" stroke="url(#rainGradTeal)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="82%" y1="6%" x2="79%" y2="16%" stroke="url(#rainGradFine)" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="94%" y1="22%" x2="91%" y2="32%" stroke="url(#rainGradBiolum)" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Rain Layer 2 - Midground Offset */}
        <g className="rain-streak" style={{ animationDuration: '1.45s', animationDelay: '-0.45s' }}>
          <line x1="8%" y1="36%" x2="5%" y2="47%" stroke="url(#rainGradTeal)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="20%" y1="44%" x2="17%" y2="55%" stroke="url(#rainGradFine)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="34%" y1="30%" x2="31%" y2="41%" stroke="url(#rainGradBiolum)" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="48%" y1="48%" x2="45%" y2="59%" stroke="url(#rainGradTeal)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="62%" y1="38%" x2="59%" y2="49%" stroke="url(#rainGradFine)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="75%" y1="46%" x2="72%" y2="57%" stroke="url(#rainGradBiolum)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="89%" y1="34%" x2="86%" y2="45%" stroke="url(#rainGradTeal)" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Rain Layer 3 - Heavy & Lower Canopy Drops */}
        <g className="rain-streak" style={{ animationDuration: '1.35s', animationDelay: '-0.9s' }}>
          <line x1="2%" y1="65%" x2="0%" y2="77%" stroke="url(#rainGradFine)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12%" y1="58%" x2="9%" y2="70%" stroke="url(#rainGradBiolum)" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="24%" y1="72%" x2="21%" y2="84%" stroke="url(#rainGradTeal)" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="44%" y1="62%" x2="41%" y2="74%" stroke="url(#rainGradFine)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="58%" y1="70%" x2="55%" y2="82%" stroke="url(#rainGradBiolum)" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="72%" y1="56%" x2="69%" y2="68%" stroke="url(#rainGradTeal)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="86%" y1="68%" x2="83%" y2="80%" stroke="url(#rainGradFine)" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="97%" y1="60%" x2="94%" y2="72%" stroke="url(#rainGradBiolum)" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </svg>

      {/* --- LAYER 5: Natural Branches, Foliage & Swaying Leaves --- */}
      <div className="foliage-lightning-glow absolute inset-0 w-full h-full pointer-events-none">
        
        {/* SVG Gradient & Filter Definitions */}
        <svg className="absolute w-0 h-0" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="barkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#001817" />
              <stop offset="50%" stopColor="#003532" />
              <stop offset="100%" stopColor="#004d46" />
            </linearGradient>

            <linearGradient id="leafPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00a89d" />
              <stop offset="60%" stopColor="#006b63" />
              <stop offset="100%" stopColor="#003734" />
            </linearGradient>

            <linearGradient id="leafVibrant" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#79fbf5" />
              <stop offset="45%" stopColor="#00b4aa" />
              <stop offset="100%" stopColor="#004d46" />
            </linearGradient>

            <linearGradient id="leafDeep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#005e57" />
              <stop offset="70%" stopColor="#003834" />
              <stop offset="100%" stopColor="#011f1d" />
            </linearGradient>

            <linearGradient id="leafBrightHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbfffc" />
              <stop offset="40%" stopColor="#79fbf5" />
              <stop offset="100%" stopColor="#00827c" />
            </linearGradient>
          </defs>
        </svg>

        {/* ========================================================================= */}
        {/* === [CRITICAL REQUEST] VERTICAL LEFT-GUTTER BRANCH & FOLIAGE COLUMN ===== */}
        {/* Exactly in the red rectangle marked by user: down the entire left margin   */}
        {/* ========================================================================= */}
        <div 
          id="foliage-vertical-left-column"
          className="ambient-left-col absolute top-0 left-0 w-[180px] sm:w-[240px] md:w-[280px] lg:w-[320px] h-full max-h-screen z-10 pointer-events-none"
        >
          <svg
            className="w-full h-full drop-shadow-[0_12px_28px_rgba(0,18,17,0.85)]"
            viewBox="0 0 320 1000"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* --- Main Vertical Trunk / Vine descending along the left edge --- */}
            <path
              d="M -15 -10 
                 C 25 120, 60 210, 45 340 
                 C 30 470, 75 580, 50 720 
                 C 25 840, 65 920, 30 1020 
                 L -15 1020 Z"
              fill="url(#barkGrad)"
              stroke="#005b53"
              strokeWidth="1.5"
            />

            {/* Branch offshoots reaching out into the workspace gutter */}
            {/* Offshoot 1: Upper (Y: 110 - 220) */}
            <path
              d="M 50 150 C 95 160, 150 180, 205 210 C 150 195, 100 180, 45 170 Z"
              fill="url(#barkGrad)"
            />
            {/* Offshoot 2: Mid-Upper (Y: 310 - 430) */}
            <path
              d="M 45 350 C 110 365, 175 390, 230 425 C 170 410, 105 385, 40 370 Z"
              fill="url(#barkGrad)"
            />
            {/* Offshoot 3: Center Mid (Y: 520 - 640) */}
            <path
              d="M 50 550 C 105 560, 160 580, 215 620 C 155 600, 100 580, 45 570 Z"
              fill="url(#barkGrad)"
            />
            {/* Offshoot 4: Mid-Lower (Y: 710 - 820) */}
            <path
              d="M 45 740 C 95 750, 150 770, 195 810 C 145 790, 95 770, 40 760 Z"
              fill="url(#barkGrad)"
            />

            {/* --- BACKGROUND DEEP SHADOW LEAVES (Creates 3D forest depth) --- */}
            <g opacity="0.8">
              {/* Cluster Y: 60 - 180 */}
              <path className="flutter-d" d="M 40 80 Q 95 60 130 95 Q 105 135 40 80 Z" fill="url(#leafDeep)" />
              <path className="flutter-c" d="M 60 140 Q 120 125 155 160 Q 125 200 60 140 Z" fill="url(#leafDeep)" />

              {/* Cluster Y: 250 - 390 */}
              <path className="flutter-b" d="M 50 270 Q 115 250 150 285 Q 120 325 50 270 Z" fill="url(#leafDeep)" />
              <path className="flutter-d" d="M 70 340 Q 135 320 170 355 Q 140 395 70 340 Z" fill="url(#leafDeep)" />

              {/* Cluster Y: 460 - 600 */}
              <path className="flutter-c" d="M 55 480 Q 120 460 155 495 Q 125 535 55 480 Z" fill="url(#leafDeep)" />
              <path className="flutter-a" d="M 65 550 Q 130 535 165 570 Q 135 610 65 550 Z" fill="url(#leafDeep)" />

              {/* Cluster Y: 670 - 830 */}
              <path className="flutter-b" d="M 45 690 Q 105 670 140 705 Q 115 745 45 690 Z" fill="url(#leafDeep)" />
              <path className="flutter-d" d="M 60 760 Q 120 745 155 780 Q 125 820 60 760 Z" fill="url(#leafDeep)" />

              {/* Cluster Y: 850 - 980 */}
              <path className="flutter-c" d="M 40 880 Q 100 860 135 895 Q 110 935 40 880 Z" fill="url(#leafDeep)" />
              <path className="flutter-a" d="M 50 940 Q 115 925 150 960 Q 120 1000 50 940 Z" fill="url(#leafDeep)" />
            </g>

            {/* --- MIDGROUND RICH LEAVES & VIBRANT SWAYING FOLIAGE --- */}
            <g>
              {/* === TIER 1: UPPER CLUSTER (Y: 40 - 240) === */}
              <g className="flutter-a" style={{ animationDelay: '-0.3s' }}>
                <path d="M 35 60 Q 95 30 145 75 Q 115 125 35 60 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.8" />
                <path d="M 35 60 Q 95 60 145 75" stroke="#79fbf5" strokeWidth="1" opacity="0.6" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-1.1s' }}>
                <path d="M 85 100 Q 155 70 195 120 Q 155 170 85 100 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.9" />
                <path d="M 85 100 Q 150 100 195 120" stroke="#edfffe" strokeWidth="1.1" opacity="0.75" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-2.4s' }}>
                <path d="M 125 150 Q 195 130 235 180 Q 190 225 125 150 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.8" />
                <path d="M 125 150 Q 190 160 235 180" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
              </g>

              <g className="flutter-d" style={{ animationDelay: '-1.7s' }}>
                <path d="M 55 180 Q 115 170 160 215 Q 120 250 55 180 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
              </g>

              {/* === TIER 2: MID-UPPER CLUSTER (Y: 250 - 450) === */}
              <g className="flutter-a" style={{ animationDelay: '-0.8s' }}>
                <path d="M 45 270 Q 115 240 170 290 Q 130 340 45 270 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.8" />
                <path d="M 45 270 Q 115 270 170 290" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-1.9s' }}>
                <path d="M 95 320 Q 175 295 225 345 Q 175 395 95 320 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.9" />
                <path d="M 95 320 Q 165 325 225 345" stroke="#79fbf5" strokeWidth="1" opacity="0.6" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-3.1s' }}>
                <path d="M 145 370 Q 220 350 265 405 Q 215 450 145 370 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.9" />
                <path d="M 145 370 Q 210 380 265 405" stroke="#ffffff" strokeWidth="1.1" opacity="0.85" />
              </g>

              <g className="flutter-d" style={{ animationDelay: '-0.5s' }}>
                <path d="M 65 400 Q 125 400 175 445 Q 130 480 65 400 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.7" />
              </g>

              {/* === TIER 3: CENTER-MID CLUSTER (Y: 460 - 660) === */}
              <g className="flutter-a" style={{ animationDelay: '-1.4s' }}>
                <path d="M 45 470 Q 120 440 180 490 Q 135 540 45 470 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.8" />
                <path d="M 45 470 Q 120 470 180 490" stroke="#79fbf5" strokeWidth="1" opacity="0.65" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-2.6s' }}>
                <path d="M 90 520 Q 170 490 220 540 Q 170 590 90 520 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.9" />
                <path d="M 90 520 Q 160 520 220 540" stroke="#edfffe" strokeWidth="1.1" opacity="0.75" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-0.9s' }}>
                <path d="M 135 570 Q 210 550 250 605 Q 200 650 135 570 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.8" />
                <path d="M 135 570 Q 200 580 250 605" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
              </g>

              <g className="flutter-d" style={{ animationDelay: '-2.1s' }}>
                <path d="M 60 610 Q 120 600 165 645 Q 125 680 60 610 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
              </g>

              {/* === TIER 4: MID-LOWER CLUSTER (Y: 670 - 850) === */}
              <g className="flutter-a" style={{ animationDelay: '-2.8s' }}>
                <path d="M 40 680 Q 110 650 165 700 Q 125 750 40 680 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.8" />
                <path d="M 40 680 Q 110 680 165 700" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-0.6s' }}>
                <path d="M 85 730 Q 160 700 205 750 Q 160 800 85 730 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.9" />
                <path d="M 85 730 Q 150 730 205 750" stroke="#79fbf5" strokeWidth="1" opacity="0.6" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-1.8s' }}>
                <path d="M 125 780 Q 195 760 235 815 Q 185 860 125 780 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.8" />
                <path d="M 125 780 Q 190 790 235 815" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
              </g>

              {/* === TIER 5: BOTTOM GROUND-LEVEL CLUSTER (Y: 860 - 1000) === */}
              <g className="flutter-d" style={{ animationDelay: '-1.2s' }}>
                <path d="M 35 860 Q 105 830 155 880 Q 115 925 35 860 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.8" />
              </g>

              <g className="flutter-a" style={{ animationDelay: '-2.3s' }}>
                <path d="M 75 910 Q 145 880 190 930 Q 145 975 75 910 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.9" />
                <path d="M 75 910 Q 140 910 190 930" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-0.4s' }}>
                <path d="M 110 950 Q 175 930 215 985 Q 170 1025 110 950 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.8" />
              </g>
            </g>

            {/* --- RAIN SPLASHES & RIPPLES ON VERTICAL LEAVES --- */}
            {/* Splash 1 (Upper Tier Y: 120) */}
            <circle cx="195" cy="120" r="9" fill="none" stroke="#edfffe" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '0.3s' }} />
            <circle cx="195" cy="120" r="3" fill="#79fbf5" opacity="0.85" />

            {/* Splash 2 (Mid-Upper Tier Y: 345) */}
            <circle cx="225" cy="345" r="10" fill="none" stroke="#79fbf5" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '1.2s' }} />
            <circle cx="225" cy="345" r="3.5" fill="#edfffe" opacity="0.9" />

            {/* Splash 3 (Center-Mid Tier Y: 540) */}
            <circle cx="220" cy="540" r="11" fill="none" stroke="#edfffe" strokeWidth="1.3" className="splash-ring" style={{ animationDelay: '0.7s' }} />
            <circle cx="220" cy="540" r="3.8" fill="#cbfffc" opacity="0.9" />

            {/* Splash 4 (Mid-Lower Tier Y: 750) */}
            <circle cx="205" cy="750" r="9.5" fill="none" stroke="#79fbf5" strokeWidth="1.1" className="splash-ring" style={{ animationDelay: '1.6s' }} />
            <circle cx="205" cy="750" r="3.2" fill="#79fbf5" opacity="0.85" />

            {/* Splash 5 (Bottom Tier Y: 930) */}
            <circle cx="190" cy="930" r="10" fill="none" stroke="#cbfffc" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '1.0s' }} />

            {/* --- WATER DRIPPING DOWN THE VERTICAL COLUMN --- */}
            {/* Drip 1: from Leaf (235, 180) down */}
            <g transform="translate(235, 180)">
              <ellipse cx="0" cy="0" rx="2.5" ry="4.5" fill="#edfffe" className="water-drop-bead" style={{ animationDelay: '0.5s' }} />
            </g>

            {/* Drip 2: from Leaf (265, 405) down */}
            <g transform="translate(265, 405)">
              <ellipse cx="0" cy="0" rx="2.8" ry="5.2" fill="#cbfffc" className="water-drop-bead" style={{ animationDelay: '1.4s' }} />
            </g>

            {/* Drip 3: from Leaf (250, 605) down */}
            <g transform="translate(250, 605)">
              <ellipse cx="0" cy="0" rx="2.6" ry="4.8" fill="#79fbf5" className="water-drop-bead" style={{ animationDelay: '2.1s' }} />
            </g>

            {/* Drip 4: from Leaf (235, 815) down */}
            <g transform="translate(235, 815)">
              <ellipse cx="0" cy="0" rx="2.7" ry="5.0" fill="#edfffe" className="water-drop-bead" style={{ animationDelay: '0.9s' }} />
            </g>
          </svg>
        </div>


        {/* ========================================================================= */}
        {/* === TOP-LEFT HORIZONTAL OVERHEAD CANOPY ================================= */}
        {/* Reaches overhead across the top bar and title                             */}
        {/* ========================================================================= */}
        <div className="ambient-left-top absolute -top-10 -left-6 sm:-top-6 sm:-left-2 w-[380px] sm:w-[500px] md:w-[620px] h-[360px] sm:h-[450px]">
          <svg
            className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,18,17,0.8)]"
            viewBox="0 0 600 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Arching Branch */}
            <path
              d="M -20 -15 C 90 40, 200 30, 290 85 C 380 140, 450 180, 560 210 C 490 190, 360 135, 270 95 C 180 50, 70 40, -20 15 Z"
              fill="url(#barkGrad)"
              stroke="#005b53"
              strokeWidth="1.4"
            />
            {/* Secondary Twig Fork */}
            <path
              d="M 190 45 C 240 95, 290 135, 360 185 C 310 145, 260 105, 210 58 Z"
              fill="url(#barkGrad)"
            />
            <path
              d="M 310 95 C 370 65, 440 70, 500 80 C 440 75, 375 75, 320 100 Z"
              fill="url(#barkGrad)"
            />

            {/* Deep Background Canopy Leaves */}
            <g opacity="0.75">
              <path className="flutter-c" d="M 140 65 Q 180 40 215 70 Q 195 110 140 65 Z" fill="url(#leafDeep)" />
              <path className="flutter-a" d="M 250 85 Q 300 60 330 100 Q 295 135 250 85 Z" fill="url(#leafDeep)" />
              <path className="flutter-b" d="M 390 150 Q 440 130 480 170 Q 445 205 390 150 Z" fill="url(#leafDeep)" />
              <path className="flutter-c" d="M 330 55 Q 380 30 415 60 Q 385 95 330 55 Z" fill="url(#leafDeep)" />
            </g>

            {/* Midground Foliage Leaves */}
            <g>
              <g className="flutter-a" style={{ animationDelay: '-0.4s' }}>
                <path d="M 100 20 Q 150 -15 190 25 Q 160 70 100 20 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
                <path d="M 100 20 Q 150 15 190 25" stroke="#79fbf5" strokeWidth="0.9" opacity="0.6" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-1.3s' }}>
                <path d="M 160 45 Q 215 15 255 60 Q 220 105 160 45 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.8" />
                <path d="M 160 45 Q 215 45 255 60" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-2.5s' }}>
                <path d="M 260 80 Q 325 50 360 100 Q 315 145 260 80 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
                <path d="M 260 80 Q 320 80 360 100" stroke="#79fbf5" strokeWidth="0.9" opacity="0.6" />
              </g>

              <g className="flutter-a" style={{ animationDelay: '-0.8s' }}>
                <path d="M 330 115 Q 390 85 430 135 Q 385 180 330 115 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.8" />
                <path d="M 330 115 Q 390 120 430 135" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-1.9s' }}>
                <path d="M 420 160 Q 490 140 525 195 Q 475 240 420 160 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-3.2s' }}>
                <path d="M 480 195 Q 550 185 580 235 Q 530 270 480 195 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.9" />
                <path d="M 480 195 Q 540 210 580 235" stroke="#ffffff" strokeWidth="1.1" opacity="0.85" />
              </g>

              <g className="flutter-a" style={{ animationDelay: '-1.6s' }}>
                <path d="M 380 75 Q 440 35 490 75 Q 450 120 380 75 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.7" />
              </g>
            </g>

            {/* Droplet Splashes */}
            <circle cx="255" cy="60" r="9" fill="none" stroke="#edfffe" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '0.2s' }} />
            <circle cx="430" cy="135" r="11" fill="none" stroke="#79fbf5" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '1.1s' }} />
            <circle cx="580" cy="235" r="10" fill="none" stroke="#cbfffc" strokeWidth="1.3" className="splash-ring" style={{ animationDelay: '1.8s' }} />

            {/* Dripping Water */}
            <g transform="translate(255, 60)">
              <ellipse cx="0" cy="0" rx="2.4" ry="4.4" fill="#edfffe" className="water-drop-bead" style={{ animationDelay: '0.4s' }} />
            </g>
            <g transform="translate(430, 135)">
              <ellipse cx="0" cy="0" rx="2.7" ry="5.0" fill="#cbfffc" className="water-drop-bead" style={{ animationDelay: '1.3s' }} />
            </g>
            <g transform="translate(580, 235)">
              <ellipse cx="0" cy="0" rx="2.9" ry="5.4" fill="#79fbf5" className="water-drop-bead" style={{ animationDelay: '2.0s' }} />
            </g>
          </svg>
        </div>


        {/* ========================================================================= */}
        {/* === TOP-RIGHT HANGING BRANCH & CANOPY =================================== */}
        {/* Balances the canvas on the right side of the screen                       */}
        {/* ========================================================================= */}
        <div className="ambient-right absolute -top-10 -right-6 sm:-top-6 sm:-right-2 w-[340px] sm:w-[460px] md:w-[560px] h-[360px] sm:h-[480px]">
          <svg
            className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,18,17,0.8)]"
            viewBox="0 0 540 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Hanging Bough */}
            <path
              d="M 560 -15 C 470 30, 370 25, 290 80 C 210 130, 145 175, 45 205 C 115 185, 235 130, 310 90 C 385 45, 485 35, 560 15 Z"
              fill="url(#barkGrad)"
              stroke="#005b53"
              strokeWidth="1.4"
            />
            {/* Secondary Twig Fork */}
            <path
              d="M 370 45 C 325 95, 280 135, 215 185 C 260 145, 305 105, 350 55 Z"
              fill="url(#barkGrad)"
            />
            <path
              d="M 260 90 C 205 65, 140 70, 85 80 C 140 75, 200 75, 250 95 Z"
              fill="url(#barkGrad)"
            />

            {/* Deep Shadow Leaves */}
            <g opacity="0.75">
              <path className="flutter-b" d="M 420 65 Q 390 40 355 70 Q 375 105 420 65 Z" fill="url(#leafDeep)" />
              <path className="flutter-a" d="M 310 90 Q 265 65 235 105 Q 270 140 310 90 Z" fill="url(#leafDeep)" />
              <path className="flutter-c" d="M 190 160 Q 145 135 110 175 Q 145 210 190 160 Z" fill="url(#leafDeep)" />
            </g>

            {/* Midground Vibrant Leaves */}
            <g>
              <g className="flutter-b" style={{ animationDelay: '-0.6s' }}>
                <path d="M 450 15 Q 405 -15 365 20 Q 395 65 450 15 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
                <path d="M 450 15 Q 405 10 365 20" stroke="#79fbf5" strokeWidth="0.9" opacity="0.6" />
              </g>

              <g className="flutter-a" style={{ animationDelay: '-1.5s' }}>
                <path d="M 395 45 Q 345 15 305 60 Q 340 105 395 45 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.8" />
                <path d="M 395 45 Q 345 45 305 60" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-2.3s' }}>
                <path d="M 310 80 Q 250 50 215 100 Q 260 145 310 80 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
              </g>

              <g className="flutter-b" style={{ animationDelay: '-1.0s' }}>
                <path d="M 245 120 Q 190 90 150 140 Q 195 185 245 120 Z" fill="url(#leafVibrant)" stroke="#79fbf5" strokeWidth="0.8" />
                <path d="M 245 120 Q 190 125 150 140" stroke="#edfffe" strokeWidth="1" opacity="0.7" />
              </g>

              <g className="flutter-a" style={{ animationDelay: '-2.9s' }}>
                <path d="M 160 165 Q 95 140 60 195 Q 110 240 160 165 Z" fill="url(#leafPrimary)" stroke="#00b4aa" strokeWidth="0.7" />
              </g>

              <g className="flutter-c" style={{ animationDelay: '-1.7s' }}>
                <path d="M 100 200 Q 35 190 5 240 Q 55 275 100 200 Z" fill="url(#leafBrightHighlight)" stroke="#cbfffc" strokeWidth="0.9" />
                <path d="M 100 200 Q 45 215 5 240" stroke="#ffffff" strokeWidth="1.1" opacity="0.85" />
              </g>
            </g>

            {/* Droplet Splashes */}
            <circle cx="305" cy="60" r="10" fill="none" stroke="#79fbf5" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '0.6s' }} />
            <circle cx="150" cy="140" r="11" fill="none" stroke="#edfffe" strokeWidth="1.3" className="splash-ring" style={{ animationDelay: '1.4s' }} />
            <circle cx="5" cy="240" r="10.5" fill="none" stroke="#79fbf5" strokeWidth="1.2" className="splash-ring" style={{ animationDelay: '2.1s' }} />

            {/* Dripping Water */}
            <g transform="translate(305, 60)">
              <ellipse cx="0" cy="0" rx="2.4" ry="4.4" fill="#cbfffc" className="water-drop-bead" style={{ animationDelay: '0.8s' }} />
            </g>
            <g transform="translate(150, 140)">
              <ellipse cx="0" cy="0" rx="2.7" ry="4.9" fill="#edfffe" className="water-drop-bead" style={{ animationDelay: '1.6s' }} />
            </g>
            <g transform="translate(5, 240)">
              <ellipse cx="0" cy="0" rx="2.9" ry="5.3" fill="#79fbf5" className="water-drop-bead" style={{ animationDelay: '2.3s' }} />
            </g>
          </svg>
        </div>

      </div>

      {/* --- LAYER 6: Forest Ground Mist / Bio-luminescent Vapor at Bottom --- */}
      <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-[#012624] via-[#012624]/75 to-transparent pointer-events-none" />
    </div>
  );
};
