import React from 'react';

export const ProgrammerMaintenanceAnimation: React.FC = () => {
  return (
    <div
      id="programmer-maintenance-visual"
      className="relative w-52 h-44 mx-auto flex items-center justify-center select-none"
    >
      <style>{`
        @keyframes progFloatingBadge {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes progHandWave {
          0%, 100% { transform: rotate(-16deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes progArmSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes progLaptopOpen {
          0% { transform: scaleY(0.08); opacity: 0.8; }
          70% { transform: scaleY(1.02); opacity: 1; }
          85% { transform: scaleY(0.98); opacity: 1; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes progTypingHand {
          0%, 100% { transform: translateY(0px); }
          25% { transform: translateY(-2px); }
          50% { transform: translateY(0px); }
          75% { transform: translateY(-1.5px); }
        }
        @keyframes progHeadBob {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-1.5px) rotate(1deg); }
        }
        @keyframes progBlink {
          0%, 45%, 100% { opacity: 1; }
          50%, 90% { opacity: 0; }
        }
        @keyframes progWaveArc {
          0%, 100% { opacity: 0.2; transform: translateX(0px); }
          50% { opacity: 1; transform: translateX(2.5px); }
        }
        @keyframes progHandTilt {
          0%, 100% { transform: rotate(-14deg); }
          50% { transform: rotate(14deg); }
        }

        .anim-prog-badge {
          animation: progFloatingBadge 2.4s ease-in-out infinite;
        }
        .anim-prog-hand-tilt {
          display: inline-block;
          transform-origin: bottom center;
          animation: progHandTilt 1.2s ease-in-out infinite;
        }
        .anim-prog-laptop-lid {
          transform-origin: 114px 163px;
          animation: progLaptopOpen 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-prog-arm-sway {
          transform-origin: 148px 136px;
          animation: progArmSway 2.2s ease-in-out infinite;
        }
        .anim-prog-hand-wave {
          transform-origin: 174px 82px;
          animation: progHandWave 1.1s ease-in-out infinite;
        }
        .anim-prog-typing {
          animation: progTypingHand 0.8s ease-in-out infinite;
        }
        .anim-prog-head {
          transform-origin: 120px 88px;
          animation: progHeadBob 3s ease-in-out infinite;
        }
        .anim-prog-cursor {
          animation: progBlink 0.8s infinite;
        }
        .anim-prog-arc1 {
          animation: progWaveArc 1.1s ease-in-out infinite;
        }
        .anim-prog-arc2 {
          animation: progWaveArc 1.1s ease-in-out infinite 0.15s;
        }
      `}</style>

      {/* Background ambient glow behind programmer */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#00d2ff]/15 via-[#ffd166]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Floating "Aguarde um momento" badge */}
      <div className="anim-prog-badge absolute -top-1 right-2 sm:right-6 z-20 px-2.5 py-1 rounded-full bg-[#002b28]/95 border border-[#00d2ff]/60 shadow-lg shadow-[#002b28]/80 text-[#79fbf5] text-[10px] font-mono font-bold flex items-center gap-1.5 pointer-events-none">
        <span className="anim-prog-hand-tilt text-xs">✋</span>
        <span>Aguarde um momento...</span>
      </div>

      {/* SVG Canvas for the Programmer & Laptop Animation */}
      <svg
        viewBox="0 0 240 190"
        className="w-full h-full overflow-visible drop-shadow-xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="progDeskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#003734" stopOpacity="0.2" />
            <stop offset="30%" stopColor="#00827c" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#00d2ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#003734" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="progScreenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#002b33" />
          </linearGradient>

          <linearGradient id="progHoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#004d49" />
            <stop offset="100%" stopColor="#012220" />
          </linearGradient>

          <linearGradient id="progSkinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd8b3" />
            <stop offset="100%" stopColor="#f5b88f" />
          </linearGradient>

          <linearGradient id="progHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c3e50" />
            <stop offset="100%" stopColor="#182533" />
          </linearGradient>
        </defs>

        {/* 1. DESK BASE */}
        <ellipse cx="120" cy="168" rx="90" ry="10" fill="#011b1a" />
        <rect x="25" y="160" width="190" height="3" rx="1.5" fill="url(#progDeskGrad)" />
        <line x1="25" y1="161.5" x2="215" y2="161.5" stroke="#79fbf5" strokeWidth="1" strokeOpacity="0.7" />

        {/* 2. PROGRAMMER CHARACTER */}
        <g id="programmer-character">
          {/* Body / Hoodie */}
          <path
            d="M86 160 C86 130 96 112 120 112 C144 112 154 130 154 160 Z"
            fill="url(#progHoodieGrad)"
            stroke="#00827c"
            strokeWidth="1.5"
          />

          {/* Hoodie Collar & Zipper */}
          <path d="M112 112 L120 126 L128 112" stroke="#79fbf5" strokeWidth="1.5" fill="none" />
          <line x1="120" y1="126" x2="120" y2="148" stroke="#00d2ff" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* Neck */}
          <rect x="114" y="98" width="12" height="15" rx="3" fill="url(#progSkinGrad)" />

          {/* Head & Face */}
          <g className="anim-prog-head">
            {/* Ears */}
            <circle cx="103" cy="80" r="4.5" fill="url(#progSkinGrad)" />
            <circle cx="137" cy="80" r="4.5" fill="url(#progSkinGrad)" />

            {/* Head oval */}
            <ellipse cx="120" cy="78" rx="17" ry="20" fill="url(#progSkinGrad)" />

            {/* Hair */}
            <path
              d="M102 75 C102 60 110 52 120 52 C130 52 138 60 138 75 C134 70 126 69 120 71 C114 69 106 70 102 75 Z"
              fill="url(#progHairGrad)"
            />
            {/* Front hair fringe */}
            <path
              d="M104 68 C110 63 118 64 122 67 C126 64 133 64 136 70 C131 66 123 66 120 68 C117 66 109 66 104 68 Z"
              fill="#34495e"
            />

            {/* Glasses frame */}
            <rect x="108" y="73" width="10" height="7" rx="2" stroke="#00d2ff" strokeWidth="1.4" fill="#002b33" fillOpacity="0.4" />
            <rect x="122" y="73" width="10" height="7" rx="2" stroke="#00d2ff" strokeWidth="1.4" fill="#002b33" fillOpacity="0.4" />
            <line x1="118" y1="76" x2="122" y2="76" stroke="#00d2ff" strokeWidth="1.4" />
            <line x1="104" y1="76" x2="108" y2="76" stroke="#00d2ff" strokeWidth="1.4" />
            <line x1="132" y1="76" x2="136" y2="76" stroke="#00d2ff" strokeWidth="1.4" />

            {/* Eyes behind glasses */}
            <circle cx="113" cy="76.5" r="1.5" fill="#ffffff" />
            <circle cx="127" cy="76.5" r="1.5" fill="#ffffff" />
            <circle cx="113.5" cy="76.5" r="0.8" fill="#1e272e" />
            <circle cx="127.5" cy="76.5" r="0.8" fill="#1e272e" />

            {/* Friendly smile */}
            <path d="M116 88 Q120 91 124 88" stroke="#d35400" strokeWidth="1.2" strokeLinecap="round" fill="none" />

            {/* Headphones band */}
            <path d="M103 80 C100 55 140 55 137 80" stroke="#ffd166" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Ear cups */}
            <rect x="99" y="74" width="5" height="12" rx="2.5" fill="#ffd166" stroke="#e67e22" strokeWidth="0.8" />
            <rect x="136" y="74" width="5" height="12" rx="2.5" fill="#ffd166" stroke="#e67e22" strokeWidth="0.8" />
          </g>

          {/* Left Arm: Resting and typing on notebook keyboard */}
          <g id="left-arm-typing">
            <path d="M92 135 C88 145 92 156 102 157" stroke="#004d49" strokeWidth="7" strokeLinecap="round" />
            {/* Hand typing */}
            <circle
              className="anim-prog-typing"
              cx="103"
              cy="157"
              r="4"
              fill="url(#progSkinGrad)"
            />
          </g>

          {/* Right Arm: Raising hand & Waving to person ("Espere / Aguarde!") */}
          <g id="right-arm-waving" className="anim-prog-arm-sway">
            {/* Bicep & Forearm rising up beside the laptop */}
            <path
              d="M148 136 Q162 128 166 110 Q168 96 172 84"
              stroke="#004d49"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            {/* Sleeve cuff */}
            <rect x="168" y="82" width="8" height="4" rx="2" fill="#00827c" transform="rotate(-15 168 82)" />

            {/* Waving Hand (Palm open: ✋ gesture to WAIT) */}
            <g className="anim-prog-hand-wave">
              {/* Palm */}
              <circle cx="174" cy="74" r="6" fill="url(#progSkinGrad)" />

              {/* Fingers extended in open-hand "Wait/Hold on" gesture */}
              {/* Thumb */}
              <line x1="169" y1="76" x2="164" y2="73" stroke="#f5b88f" strokeWidth="2.4" strokeLinecap="round" />
              {/* Index finger */}
              <line x1="171" y1="70" x2="170" y2="62" stroke="#f5b88f" strokeWidth="2.2" strokeLinecap="round" />
              {/* Middle finger */}
              <line x1="174" y1="69" x2="174" y2="60" stroke="#f5b88f" strokeWidth="2.2" strokeLinecap="round" />
              {/* Ring finger */}
              <line x1="177" y1="70" x2="178" y2="62" stroke="#f5b88f" strokeWidth="2.2" strokeLinecap="round" />
              {/* Pinky finger */}
              <line x1="180" y1="72" x2="182" y2="65" stroke="#f5b88f" strokeWidth="2" strokeLinecap="round" />

              {/* Hand Palm highlight */}
              <circle cx="174" cy="74" r="3.5" fill="#ffd8b3" />

              {/* Gentle motion wave wind arcs near waving hand */}
              <path
                className="anim-prog-arc1"
                d="M188 64 C191 68 191 74 188 78"
                stroke="#00d2ff"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                className="anim-prog-arc2"
                d="M192 61 C196 66 196 76 192 81"
                stroke="#79fbf5"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>
        </g>

        {/* 3. NOTEBOOK (LAPTOP) OPENING ANIMATION */}
        <g id="laptop-group">
          {/* Laptop Base on Desk */}
          <path
            d="M82 163 L146 163 L141 167 L87 167 Z"
            fill="#012b29"
            stroke="#00d2ff"
            strokeWidth="1"
          />
          {/* Trackpad */}
          <rect x="109" y="164" width="10" height="2" rx="0.5" fill="#004d46" />
          {/* Keyboard keys glow */}
          <line x1="89" y1="164" x2="105" y2="164" stroke="#00827c" strokeWidth="1" strokeDasharray="1.5 1" />
          <line x1="123" y1="164" x2="139" y2="164" stroke="#00827c" strokeWidth="1" strokeDasharray="1.5 1" />

          {/* Animated Laptop Screen Lid (Opens up from flat to standing working position) */}
          <g id="laptop-screen-lid" className="anim-prog-laptop-lid">
            {/* Screen Lid Outer Shell */}
            <rect
              x="86"
              y="118"
              width="56"
              height="45"
              rx="3"
              fill="#011e1c"
              stroke="#00d2ff"
              strokeWidth="1.6"
            />

            {/* Illuminated Display Screen */}
            <rect
              x="89"
              y="121"
              width="50"
              height="39"
              rx="1.5"
              fill="url(#progScreenGlow)"
              fillOpacity="0.9"
            />

            {/* Glowing Screen Light Reflection on programmer */}
            <ellipse cx="114" cy="140" rx="22" ry="16" fill="#79fbf5" fillOpacity="0.12" />

            {/* Terminal Window Header Bar */}
            <rect x="89" y="121" width="50" height="6" fill="#012624" />
            <circle cx="93" cy="124" r="1.2" fill="#ff4757" />
            <circle cx="97" cy="124" r="1.2" fill="#ffd166" />
            <circle cx="101" cy="124" r="1.2" fill="#2ed573" />
            <line x1="105" y1="124" x2="128" y2="124" stroke="#00827c" strokeWidth="0.8" />

            {/* Animated Code Lines in Terminal */}
            <g id="screen-code-lines">
              {/* Code line 1 */}
              <line
                x1="93"
                y1="131"
                x2="125"
                y2="131"
                stroke="#ffd166"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              {/* Code line 2 */}
              <line x1="97" y1="135" x2="132" y2="135" stroke="#79fbf5" strokeWidth="1.2" strokeLinecap="round" />
              {/* Code line 3 */}
              <line x1="97" y1="139" x2="120" y2="139" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
              {/* Code line 4 */}
              <line x1="93" y1="143" x2="135" y2="143" stroke="#2ed573" strokeWidth="1.2" strokeLinecap="round" />
              {/* Code line 5 with blinking cursor */}
              <line x1="93" y1="147" x2="108" y2="147" stroke="#00d2ff" strokeWidth="1.2" strokeLinecap="round" />
              <rect
                className="anim-prog-cursor"
                x="110"
                y="145.5"
                width="2"
                height="3"
                fill="#ffd166"
              />

              {/* Maintenance status indicator on screen */}
              <rect x="92" y="152" width="44" height="6" rx="1.5" fill="#003734" />
              <circle cx="96" cy="155" r="1.2" fill="#ffd166" />
              <line x1="100" y1="155" x2="132" y2="155" stroke="#ffd166" strokeWidth="1" strokeDasharray="3 1" />
            </g>
          </g>

          {/* Little Tech Accent on lid edge */}
          <line x1="112" y1="163" x2="116" y2="163" stroke="#ffd166" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
