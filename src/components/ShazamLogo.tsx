import React from 'react';

interface ShazamLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  isPulseSpeedFast?: boolean;
}

export const ShazamLogo: React.FC<ShazamLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  isPulseSpeedFast = false,
}) => {
  const dimensions = {
    sm: { box: 34, icon: 20, text: 'text-sm' },
    md: { box: 44, icon: 26, text: 'text-lg' },
    lg: { box: 64, icon: 38, text: 'text-2xl' },
    xl: { box: 100, icon: 60, text: 'text-4xl' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Dynamic Animated Logo Container */}
      <div 
        className="relative flex items-center justify-center select-none"
        style={{ width: dimensions.box, height: dimensions.box }}
      >
        {/* Ambient Pulsing Aura Glow */}
        <div 
          className={`absolute inset-0 rounded-full bg-[#00827c] opacity-35 blur-md animate-pulse ${
            isPulseSpeedFast ? 'duration-700' : 'duration-1500'
          }`}
        />

        {/* Outer Rotating Radar / Energy Scanning Ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite]"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dashed outer orbital ring */}
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#shazamRingGrad)"
            strokeWidth="2"
            strokeDasharray="14 8 4 8"
            strokeLinecap="round"
            className="opacity-90"
          />
          {/* Active scanning particle node 1 */}
          <circle cx="50" cy="6" r="3.5" fill="#cbfffc">
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Active scanning particle node 2 */}
          <circle cx="94" cy="50" r="2.5" fill="#ffd166">
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </circle>

          <defs>
            <linearGradient id="shazamRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbfffc" />
              <stop offset="50%" stopColor="#00827c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffd166" />
            </linearGradient>
          </defs>
        </svg>

        {/* Counter-rotating Inner Orbit */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_12s_linear_infinite_reverse] scale-75 opacity-60"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="#cbfffc"
            strokeWidth="1.5"
            strokeDasharray="6 12"
          />
        </svg>

        {/* Core Shield / Disc */}
        <div className="relative w-[76%] h-[76%] rounded-[10px] bg-gradient-to-b from-[#003734] via-[#012624] to-[#011d1c] border border-[#00827c]/60 shadow-[0_0_15px_rgba(203,255,252,0.3)] flex items-center justify-center overflow-hidden">
          {/* Subtle diagonal energy beam scan */}
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-[#cbfffc]/15 to-transparent -rotate-45 animate-[shazamBeam_3s_ease-in-out_infinite]" />

          {/* Shazam Electric Lightning Bolt SVG */}
          <svg
            className="w-[62%] h-[62%] drop-shadow-[0_0_8px_rgba(203,255,252,0.9)] text-[#cbfffc]"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Dynamic Electric Lightning Bolt Shape */}
            <path
              d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
              fill="url(#shazamBoltGrad)"
              stroke="#edfffe"
              strokeWidth="0.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <animate
                attributeName="filter"
                values="drop-shadow(0 0 2px #cbfffc);drop-shadow(0 0 8px #ffd166);drop-shadow(0 0 2px #cbfffc)"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </path>

            <defs>
              <linearGradient id="shazamBoltGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#cbfffc" />
                <stop offset="80%" stopColor="#79fbf5" />
                <stop offset="100%" stopColor="#ffd166" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Optional Animated Brand Wordmark */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-semibold tracking-tight text-[#ffffff] uppercase font-['DM_Sans',sans-serif] ${dimensions.text}`}>
              SHAZAM <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent">BUSCAS</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-[4px] bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 font-mono font-medium hidden sm:inline-block">
              INTELIGÊNCIA
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#bbc7c6] font-mono">
            Dossiês Cadastrais & Investigação
          </span>
        </div>
      )}

      {/* Inline Keyframes for Beam Sweep Animation */}
      <style>{`
        @keyframes shazamBeam {
          0% { transform: translateX(-100%) rotate(-45deg); }
          50% { transform: translateX(100%) rotate(-45deg); }
          100% { transform: translateX(-100%) rotate(-45deg); }
        }
      `}</style>
    </div>
  );
};
