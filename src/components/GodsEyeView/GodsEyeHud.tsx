import React from 'react';
import { 
  Crosshair, 
  Satellite, 
  Eye, 
  Zap, 
  Key, 
  ShieldCheck, 
  Compass, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { toDMS, toMGRS, calculateGSD, calculateNIIRS, estimateSatelliteAltitude } from '../../utils/telemetryMath';

export type ReconShader = 'normal' | 'flir' | 'nvg' | 'crt';
export type ReconShaderStyle = ReconShader;

interface GodsEyeHudProps {
  lat: number;
  lng: number;
  zoom: number;
  shader: ReconShader;
  onShaderChange: (shader: ReconShader) => void;
  apiKey: string;
  onOpenKeyModal: () => void;
  isOrbiting: boolean;
  onToggleOrbit: () => void;
}

export const GodsEyeHud: React.FC<GodsEyeHudProps> = ({
  lat,
  lng,
  zoom,
  shader,
  onShaderChange,
  apiKey,
  onOpenKeyModal,
  isOrbiting,
  onToggleOrbit,
}) => {
  const gsd = calculateGSD(zoom, lat);
  const niirs = calculateNIIRS(gsd);
  const satAlt = estimateSatelliteAltitude(zoom);
  const mgrs = toMGRS(lat, lng);
  const dmsLat = toDMS(lat, true);
  const dmsLng = toDMS(lng, false);

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NÃO CONFIGURADA';

  return (
    <div className="absolute inset-0 pointer-events-none z-[15] overflow-hidden select-none">
      
      {/* 1. MILITARY CORNER BRACKETS */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#cbfffc]/60" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#cbfffc]/60" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#cbfffc]/60" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#cbfffc]/60" />

      {/* 2. CENTRAL TARGETING RETICLE (God's Eye View Crosshair) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Outer circle */}
          <div className="absolute w-28 h-28 rounded-full border border-[#cbfffc]/30 animate-spin-slow" />
          {/* Inner circle with dashed border */}
          <div className="absolute w-16 h-16 rounded-full border border-dashed border-[#79fbf5]/50" />
          {/* Crosshair lines */}
          <div className="absolute w-36 h-[1px] bg-[#cbfffc]/40" />
          <div className="absolute h-36 w-[1px] bg-[#cbfffc]/40" />
          {/* Center ping */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#cbfffc]/80 shadow-[0_0_8px_#cbfffc]" />
          {/* Target lock label */}
          <div className="absolute -bottom-6 text-[9px] font-mono uppercase tracking-[0.2em] text-[#cbfffc]/80 bg-[#011413]/80 px-1.5 py-0.5 rounded border border-[#00827c]/40">
            TARGET LOCK // GSD: {gsd}m
          </div>
        </div>
      </div>

      {/* 3. TOP TELEMETRY STRIP (Left) */}
      <div className="absolute top-4 left-5 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#011d1c]/90 backdrop-blur-md border border-[#004d47] text-[10px] sm:text-[11px] font-mono text-[#cbfffc] shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider">GOD&apos;S EYE VIEW</span>
          <span className="text-[#52706e]">|</span>
          <span className="text-[#8ea3a1]">OPTICAL RECON SAT-04</span>
          <span className="text-[#52706e]">|</span>
          <span className="text-white font-medium">NIIRS: {niirs.toFixed(1)}</span>
        </div>

        {/* Coordinates badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[#011413]/85 backdrop-blur-sm border border-[#003734] text-[10px] font-mono text-[#8ea3a1]">
          <span className="text-[#cbfffc] font-semibold">{dmsLat} {dmsLng}</span>
          <span className="text-[#52706e]">•</span>
          <span>MGRS: <strong className="text-white">{mgrs}</strong></span>
        </div>
      </div>

      {/* 4. TOP CONTROLS STRIP (Right): Shaders & Google Maps Key */}
      <div className="absolute top-4 right-5 flex items-center gap-2 pointer-events-auto">
        {/* Google Maps Key status badge */}
        <button
          type="button"
          onClick={onOpenKeyModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#012624]/90 hover:bg-[#003734] border border-[#00827c] text-[#cbfffc] text-[10px] font-mono transition cursor-pointer shadow-sm hover:scale-[1.02]"
          title="Gerenciar Chave da API Google Maps"
        >
          <Key className="w-3 h-3 text-[#ffd166]" />
          <span className="font-bold">GOOGLE MAPS:</span>
          <span className="text-emerald-300">{maskedKey}</span>
        </button>

        {/* Orbit Recon toggle */}
        <button
          type="button"
          onClick={onToggleOrbit}
          className={`flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-mono border transition cursor-pointer ${
            isOrbiting
              ? 'bg-[#00827c] text-white border-[#cbfffc] shadow-[0_0_10px_#00827c]'
              : 'bg-[#011d1c]/80 text-[#8ea3a1] border-[#003734] hover:text-white'
          }`}
          title="Órbita Tática Automática em 360°"
        >
          <Satellite className={`w-3 h-3 ${isOrbiting ? 'animate-spin' : ''}`} />
          <span>{isOrbiting ? 'ORBITANDO' : 'ÓRBITA'}</span>
        </button>

        {/* Tactical Shaders */}
        <div className="hidden sm:flex items-center bg-[#011d1c]/90 border border-[#003734] rounded-[6px] p-0.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => onShaderChange('normal')}
            className={`px-2 py-0.5 text-[9px] font-mono rounded-[4px] transition cursor-pointer ${
              shader === 'normal' ? 'bg-[#004d47] text-[#cbfffc] font-bold' : 'text-[#8ea3a1] hover:text-white'
            }`}
            title="Visão Normal Satélite RGB"
          >
            RGB
          </button>
          <button
            type="button"
            onClick={() => onShaderChange('flir')}
            className={`px-2 py-0.5 text-[9px] font-mono rounded-[4px] transition cursor-pointer ${
              shader === 'flir' ? 'bg-amber-600 text-amber-100 font-bold' : 'text-[#8ea3a1] hover:text-white'
            }`}
            title="Térmico FLIR / Sensor Infravermelho"
          >
            FLIR
          </button>
          <button
            type="button"
            onClick={() => onShaderChange('nvg')}
            className={`px-2 py-0.5 text-[9px] font-mono rounded-[4px] transition cursor-pointer ${
              shader === 'nvg' ? 'bg-emerald-600 text-emerald-100 font-bold' : 'text-[#8ea3a1] hover:text-white'
            }`}
            title="Night Vision Goggles / Visão Noturna Militar"
          >
            NVG
          </button>
          <button
            type="button"
            onClick={() => onShaderChange('crt')}
            className={`px-2 py-0.5 text-[9px] font-mono rounded-[4px] transition cursor-pointer ${
              shader === 'crt' ? 'bg-cyan-700 text-cyan-100 font-bold' : 'text-[#8ea3a1] hover:text-white'
            }`}
            title="Radar Tático CRT / Linhas de Varredura"
          >
            CRT
          </button>
        </div>
      </div>

      {/* 5. BOTTOM TELEMETRY BAR (Left) */}
      <div className="absolute bottom-4 left-5 flex items-center gap-2 pointer-events-auto">
        <div className="px-3 py-1 rounded-[6px] bg-[#011413]/90 backdrop-blur-md border border-[#003734] text-[10px] font-mono text-[#8ea3a1] flex items-center gap-3">
          <span>ALT: <strong className="text-white">{satAlt} KM</strong></span>
          <span className="text-[#004d47]">|</span>
          <span>ZOOM: <strong className="text-[#cbfffc]">{zoom}x</strong></span>
          <span className="text-[#004d47]">|</span>
          <span>SENSOR: <strong className="text-white">WORLDVIEW-4 HD</strong></span>
        </div>
      </div>

    </div>
  );
};
