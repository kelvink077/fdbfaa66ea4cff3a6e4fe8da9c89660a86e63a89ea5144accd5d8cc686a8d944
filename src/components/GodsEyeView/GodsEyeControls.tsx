import React from 'react';
import { 
  Orbit, 
  Crosshair, 
  Plane, 
  Satellite, 
  Video, 
  Ship, 
  Eye, 
  Key, 
  Layers, 
  Compass, 
  Flame, 
  Radio,
  Sliders,
  ChevronDown,
  Monitor
} from 'lucide-react';
import { ReconShaderStyle } from './GodsEyeHud';

export interface ActiveLayers {
  satellites: boolean;
  flights: boolean;
  cctv: boolean;
  vessels: boolean;
}

interface GodsEyeControlsProps {
  currentStyle: ReconShaderStyle;
  onSelectStyle: (style: ReconShaderStyle) => void;
  isOrbiting: boolean;
  onToggleOrbit: () => void;
  isTargetLocked: boolean;
  onLockTarget: () => void;
  onResetView: () => void;
  onStreetView: () => void;
  activeLayers: ActiveLayers;
  onToggleLayer: (layer: keyof ActiveLayers) => void;
  onOpenKeyConfig: () => void;
  hasGoogleMapsKey: boolean;
  onNadirView: () => void;
  onFlybyView: () => void;
}

export const GodsEyeControls: React.FC<GodsEyeControlsProps> = ({
  currentStyle,
  onSelectStyle,
  isOrbiting,
  onToggleOrbit,
  isTargetLocked,
  onLockTarget,
  onResetView,
  onStreetView,
  activeLayers,
  onToggleLayer,
  onOpenKeyConfig,
  hasGoogleMapsKey,
  onNadirView,
  onFlybyView,
}) => {
  return (
    <div className="absolute top-14 left-4 right-4 sm:left-auto sm:right-6 flex flex-wrap items-center justify-end gap-2 z-30 font-mono text-xs select-none">
      {/* Visual Shader Selector */}
      <div className="flex items-center bg-black/80 border border-white/15 rounded-md p-1 backdrop-blur-md shadow-lg">
        <span className="text-[9px] uppercase tracking-wider text-white/50 px-2 hidden md:inline">
          SHADER:
        </span>
        <button
          type="button"
          onClick={() => onSelectStyle('normal')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            currentStyle === 'normal'
              ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Modo Normal - Satélite HD Fotorrealista"
        >
          NORMAL
        </button>
        <button
          type="button"
          onClick={() => onSelectStyle('surveillance')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            currentStyle === 'surveillance'
              ? 'bg-[#33ff33]/20 text-[#33ff33] border border-[#33ff33]/50'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Modo Surveillance - Visão Noturna NVG Fósforo Verde Tático"
        >
          NVG (VERDE)
        </button>
        <button
          type="button"
          onClick={() => onSelectStyle('thermal')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            currentStyle === 'thermal'
              ? 'bg-white/25 text-white border border-white/60'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Modo FLIR / Thermal - Assinatura Térmica Infravermelha"
        >
          FLIR
        </button>
        <button
          type="button"
          onClick={() => onSelectStyle('retro')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            currentStyle === 'retro'
              ? 'bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/50'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Modo Retro - Monitor CRT com Scanlines e Fósforo Âmbar"
        >
          CRT (ÂMBAR)
        </button>
      </div>

      {/* Cinematics & Camera controls */}
      <div className="flex items-center bg-black/80 border border-white/15 rounded-md p-1 backdrop-blur-md shadow-lg">
        {/* Orbit Pass Toggle */}
        <button
          type="button"
          onClick={onToggleOrbit}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            isOrbiting
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400 animate-pulse'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Órbita 360° - Voo orbital cinematográfico contínuo em torno do alvo"
        >
          <Orbit className={`w-3.5 h-3.5 ${isOrbiting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">ÓRBITA 360°</span>
        </button>

        {/* Lock Target */}
        <button
          type="button"
          onClick={onLockTarget}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            isTargetLocked
              ? 'bg-amber-500/25 text-amber-300 border border-amber-400'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Travar Alvo no Retículo Militar"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">TRAVAR ALVO</span>
        </button>

        {/* Nadir / Top Down */}
        <button
          type="button"
          onClick={onNadirView}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="Visão Nadir (Top-Down 90° Perpendicular)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden md:inline">NADIR (90°)</span>
        </button>

        {/* Street View */}
        <button
          type="button"
          onClick={onStreetView}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="Abrir Street View para inspecionar a fachada do imóvel"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">FACHADA</span>
        </button>
      </div>

      {/* Layer Toggles (Satellites, Flights, CCTV) */}
      <div className="flex items-center bg-black/80 border border-white/15 rounded-md p-1 backdrop-blur-md shadow-lg">
        {/* Satellites */}
        <button
          type="button"
          onClick={() => onToggleLayer('satellites')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
            activeLayers.satellites
              ? 'bg-purple-500/25 text-purple-300 border border-purple-400/50'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title="Satélites Orbitais (ISS, Starlink, KH-11 Recon)"
        >
          <Satellite className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">SAT</span>
        </button>

        {/* Flights ADS-B */}
        <button
          type="button"
          onClick={() => onToggleLayer('flights')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
            activeLayers.flights
              ? 'bg-blue-500/25 text-blue-300 border border-blue-400/50'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title="Tráfego Aéreo ADS-B (Voos comerciais e helicópteros)"
        >
          <Plane className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">AÉREO</span>
        </button>

        {/* CCTV */}
        <button
          type="button"
          onClick={() => onToggleLayer('cctv')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
            activeLayers.cctv
              ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title="Câmeras Públicas e Tráfego Urbano"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">CCTV</span>
        </button>
      </div>

      {/* Google Maps Platform API Key Config Button */}
      <button
        type="button"
        onClick={onOpenKeyConfig}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all ${
          hasGoogleMapsKey
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 hover:bg-emerald-500/30'
            : 'bg-black/80 text-amber-300 border-amber-400/50 hover:bg-amber-500/20'
        }`}
        title="Configuração de Chave do Google Maps Platform (Map Tiles API, Maps JS)"
      >
        <Key className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {hasGoogleMapsKey ? 'GOOGLE MAPS 3D' : 'CONFIGURAR CHAVE MAPS'}
        </span>
      </button>
    </div>
  );
};
