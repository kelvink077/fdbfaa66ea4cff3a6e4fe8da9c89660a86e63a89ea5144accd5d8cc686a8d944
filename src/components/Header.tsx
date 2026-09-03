import React from 'react';
import { 
  Activity, 
  HelpCircle,
  LogIn,
  LogOut,
  User as UserIcon,
  Crown,
  Loader2,
  ShieldCheck,
  Zap,
  FileCode
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { calculateAccountValidity } from '../lib/firebase';
import { ShazamLogo } from './ShazamLogo';

interface HeaderProps {
  isConnected: boolean;
  socketId: string | null;
  activeRequestsCount: number;
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  isAuthLoading: boolean;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onOpenSetup: () => void;
  onOpenPricing?: () => void;
  onOpenProfile?: () => void;
  onOpenCode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  socketId,
  activeRequestsCount,
  currentUser,
  userProfile,
  isAuthLoading,
  onLoginGoogle,
  onLogoutGoogle,
  onOpenSetup,
  onOpenPricing,
  onOpenProfile,
  onOpenCode,
}) => {
  const validity = calculateAccountValidity(userProfile);
  return (
    <header className="h-20 border-b border-[#003734] flex items-center justify-between px-6 lg:px-12 bg-[#012624] sticky top-0 z-30">
      {/* Left: Brand / Shazam Buscas Mark with Dynamic Animated Logo */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {/* Dynamic Animated Shazam Logo */}
          <ShazamLogo size="sm" isPulseSpeedFast={isConnected} />

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-semibold text-lg tracking-tight text-[#ffffff] uppercase font-['DM_Sans',sans-serif]">
                SHAZAM <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent font-bold">BUSCAS</span>
              </h1>
              <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-[4px] bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 font-mono font-medium hidden sm:inline-block">
                INTELIGÊNCIA
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-[4px] bg-[#011d1c] text-[#edfffe] border border-[#003734] font-medium hidden md:inline-block font-mono">
                B2B EM TEMPO REAL
              </span>
            </div>
          </div>
        </div>

        <span className="hidden xl:inline-block w-px h-6 bg-[#003734]"></span>

        {/* Server Node Indicator */}
        <div className="hidden xl:flex items-center gap-3 text-xs tracking-[0.08em] text-[#bbc7c6]">
          <span className="uppercase text-[11px] font-mono">
            CLUSTER: <span className="text-[#ffffff] font-medium">{socketId ? `SHAZAM_${socketId.slice(0, 6).toUpperCase()}` : 'SHAZAM_CORE_01'}</span>
          </span>
          <span className="w-px h-3.5 bg-[#003734]"></span>
          <span className="uppercase text-[11px] text-[#cbfffc] flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc]"></span>
            STREAM ATIVO
          </span>
        </div>
      </div>

      {/* Right: Telemetry, Pricing & User Actions */}
      <div className="flex items-center gap-3">
        {/* Pricing button */}
        {onOpenPricing && (
          <button
            id="btn-header-pricing"
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003734] hover:bg-[#004743] border border-[#ffd166]/40 text-[#ffd166] rounded-[6px] text-xs font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            title="Ver Planos de Assinatura (Semanal R$11, 15 Dias R$19,90, Mensal R$35)"
          >
            <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
            <span className="hidden sm:inline">Planos & Preços</span>
          </button>
        )}

        {/* User Profile Pill */}
        {currentUser ? (
          <div 
            id="google-user-profile-pill"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-[#003734] hover:bg-[#004743] border border-[#00827c]/40 hover:border-[#cbfffc] rounded-[6px] text-xs text-[#edfffe] cursor-pointer transition-all shadow-sm group"
            title="Clique para ver Validade da Conta e Detalhes do Perfil"
          >
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'Operador'} 
                className="w-7 h-7 rounded-full border border-[#cbfffc] object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#012624] flex items-center justify-center text-[#cbfffc] group-hover:scale-105 transition-transform">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#ffffff] leading-tight max-w-[120px] truncate group-hover:text-[#cbfffc] transition-colors">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'Operador'}
                </span>
                <span className="px-1.5 py-0.2 rounded-[4px] bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166] text-[9px] font-mono font-medium tracking-tight flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5 text-[#ffd166]" />
                  {userProfile?.plan ? userProfile.plan.toUpperCase() : 'PREMIUM'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono mt-0.5">
                <span className="text-[#cbfffc] uppercase tracking-wider flex items-center gap-1 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
                  {validity.daysRemaining}d restantes
                </span>
                <span className="text-[#707777] hidden sm:inline">• Perfil</span>
              </div>
            </div>
            <button
              id="btn-logout-google"
              onClick={(e) => {
                e.stopPropagation();
                onLogoutGoogle();
              }}
              className="ml-1.5 p-1.5 text-[#bbc7c6] hover:text-[#fde9ff] hover:bg-[#012624]/80 rounded transition-colors cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            id="btn-login-google"
            onClick={onLoginGoogle}
            disabled={isAuthLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] rounded-[6px] text-xs font-semibold font-mono uppercase tracking-[0.05em] transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            title="Entrar com conta Google"
          >
            {isAuthLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#011d1c]" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#011d1c"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#011d1c"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#011d1c"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#011d1c"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Entrar com Google</span>
          </button>
        )}

        {/* Engine Status */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#003734] rounded-[6px] border border-[#00827c]/30 text-[11px] font-mono uppercase tracking-[0.1em] text-[#cbfffc]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#cbfffc]" />
          <span className="hidden sm:inline">MOTOR SHAZAM BUSCAS ONLINE</span>
          <span className="sm:hidden">ONLINE</span>
        </div>

        {/* WebSocket Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#011d1c] rounded-[6px] border border-[#003734] text-[11px] uppercase tracking-[0.12em] text-[#bbc7c6] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#cbfffc]' : 'bg-[#707777]'}`}></span>
          <span className="hidden md:inline">WS:</span>
          <span className="text-[#ffffff] font-medium">{isConnected ? 'LIVE' : 'IDLE'}</span>
        </div>

        {/* Active Queue indicator */}
        {activeRequestsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#003734] text-[#fde9ff] rounded-[6px] text-[11px] uppercase tracking-[0.12em] font-medium font-mono">
            <Activity className="w-3 h-3 text-[#fde9ff]" />
            <span>{activeRequestsCount} QUEUED</span>
          </div>
        )}

        {/* Architecture Button */}
        {onOpenCode && (
          <button
            onClick={onOpenCode}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-[6px] bg-[#003734] hover:bg-[#004743] text-[#edfffe] text-xs font-mono transition-colors cursor-pointer border border-[#00827c]/20"
            title="Ver Arquitetura do Sistema Shazam Buscas"
          >
            <FileCode className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span className="hidden lg:inline">Arquitetura</span>
          </button>
        )}

        {/* Help / Setup Guide Icon Button */}
        <button
          onClick={onOpenSetup}
          className="w-9 h-9 rounded-[6px] bg-[#003734] hover:bg-[#004743] flex items-center justify-center text-[#edfffe] transition-colors cursor-pointer border border-[#00827c]/20"
          title="Painel de Protocolos Shazam Buscas"
        >
          <HelpCircle className="w-4 h-4 text-[#cbfffc]" />
        </button>
      </div>
    </header>
  );
};
