import React from 'react';
import { 
  Activity, 
  LogIn,
  LogOut,
  User as UserIcon,
  Crown,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  FileCode,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { calculateAccountValidity } from '../lib/firebase';
import { ShazamLogo } from './ShazamLogo';
import type { TelegramConfigState } from '../types';

interface HeaderProps {
  isConnected: boolean;
  socketId: string | null;
  activeRequestsCount: number;
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  isAuthLoading: boolean;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onOpenSetup?: () => void;
  onOpenPricing?: () => void;
  onOpenProfile?: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenCode?: () => void;
  onOpenProModal?: () => void;
  onOpenKrexModal?: () => void;
  onOpenZyrexModal?: () => void;
  onOpenSmartMaps?: () => void;
  onOpenCepScan?: () => void;
  telegramConfig?: TelegramConfigState;
  onReconnectTelegram?: () => void;
  isReconnectingTelegram?: boolean;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
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
  onOpenAdminDashboard,
  onOpenCode,
  onOpenProModal,
  onOpenKrexModal,
  onOpenZyrexModal,
  onOpenSmartMaps,
  onOpenCepScan,
  telegramConfig,
  onReconnectTelegram,
  isReconnectingTelegram,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const validity = calculateAccountValidity(userProfile);
  const isAdmin = Boolean(
    (currentUser?.email && ['wrbatata6@gmail.com'].includes(currentUser.email.toLowerCase())) ||
    userProfile?.role === 'admin' ||
    userProfile?.plan === 'lifetime' ||
    validity.isLifetime
  );

  return (
    <header className="h-16 sm:h-20 border-b border-[#003734] flex items-center justify-between px-3 sm:px-6 lg:px-12 bg-[#012624] sticky top-0 z-30 w-full max-w-full overflow-hidden">
      {/* Left: Brand / Shazam Buscas Mark with Dynamic Animated Logo */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
        {/* Mobile Menu Hamburger button */}
        {onToggleMobileMenu && (
          <button
            id="btn-mobile-menu"
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 sm:p-2 -ml-1 text-[#cbfffc] hover:text-[#ffffff] hover:bg-[#003734] active:bg-[#003734] rounded-[8px] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Menu de módulos"
            aria-label="Menu de módulos"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-[#cbfffc]" />
            ) : (
              <Menu className="w-5 h-5 text-[#cbfffc]" />
            )}
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Dynamic Animated Shazam Logo */}
          <div className="shrink-0">
            <ShazamLogo size="sm" isPulseSpeedFast={isConnected} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              <h1 className="font-semibold text-base sm:text-lg tracking-tight text-[#ffffff] uppercase font-['DM_Sans',sans-serif] truncate">
                SHAZAM <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent font-bold">BUSCAS</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] px-1.5 sm:px-2 py-0.5 rounded-[4px] bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 font-mono font-medium hidden sm:inline-block shrink-0">
                INTELIGÊNCIA
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
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Pricing button */}
        {onOpenPricing && (
          <button
            id="btn-header-pricing"
            onClick={onOpenPricing}
            className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 bg-[#003734] hover:bg-[#004743] border border-[#ffd166]/40 text-[#ffd166] rounded-[6px] text-xs font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] shrink-0"
            title="Ver Planos de Assinatura"
          >
            <Crown className="w-3.5 h-3.5 text-[#ffd166] shrink-0" />
            <span className="hidden md:inline">Planos</span>
          </button>
        )}

        {/* User Profile Pill */}
        {currentUser ? (
          <div 
            id="google-user-profile-pill"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-3 sm:py-1.5 bg-[#003734] hover:bg-[#004743] border border-[#00827c]/40 hover:border-[#cbfffc] rounded-[6px] text-xs text-[#edfffe] cursor-pointer transition-all shrink-0 group"
            title="Clique para ver Validade da Conta e Detalhes do Perfil"
          >
            <div className="relative shrink-0">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'Operador'} 
                  className="w-7 h-7 rounded-full border border-[#cbfffc] object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#012624] border border-[#00827c] flex items-center justify-center text-[#cbfffc] group-hover:scale-105 transition-transform">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#cbfffc] border border-[#012624] animate-pulse"></span>
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#ffffff] leading-tight max-w-[90px] md:max-w-[120px] truncate group-hover:text-[#cbfffc] transition-colors">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || (isAdmin ? 'Administrador' : 'Operador')}
                </span>
                <span className={`px-1.5 py-0.2 rounded-[4px] border text-[9px] font-mono font-bold tracking-tight flex items-center gap-0.5 ${
                  isAdmin || validity.isLifetime
                    ? 'bg-[#ffd166]/20 border-[#ffd166] text-[#ffd166]'
                    : 'bg-[#ffd166]/20 border-[#ffd166]/40 text-[#ffd166]'
                }`}>
                  <Crown className="w-2.5 h-2.5 text-[#ffd166]" />
                  {isAdmin || validity.isLifetime ? 'LIFETIME' : (userProfile?.plan ? userProfile.plan.toUpperCase() : 'PREMIUM')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono mt-0.5">
                {isAdmin || validity.isLifetime ? (
                  <span className="text-[#ffd166] uppercase tracking-wider flex items-center gap-1 leading-none font-bold">
                    <Sparkles className="w-2.5 h-2.5 text-[#ffd166]" />
                    ETERNO (VITALÍCIO)
                  </span>
                ) : (
                  <span className="text-[#cbfffc] uppercase tracking-wider flex items-center gap-1 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
                    {validity.daysRemaining}d restantes
                  </span>
                )}
                <span className="text-[#707777] hidden md:inline">• Perfil</span>
              </div>
            </div>
            <button
              id="btn-logout-google"
              onClick={(e) => {
                e.stopPropagation();
                onLogoutGoogle();
              }}
              className="hidden sm:block ml-1 p-1 text-[#bbc7c6] hover:text-[#fde9ff] hover:bg-[#012624]/80 rounded transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] rounded-[6px] text-xs font-semibold font-mono uppercase tracking-[0.05em] transition-all cursor-pointer shadow-sm hover:scale-[1.02] shrink-0"
            title="Entrar com conta Google"
          >
            {isAuthLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#011d1c]" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
            <span className="hidden sm:inline">Entrar com Google</span>
            <span className="sm:hidden text-[11px]">Entrar</span>
          </button>
        )}

        {/* BUSCAS PRO Animated Button */}
        <button
          id="btn-buscas-pro"
          onClick={onOpenProModal}
          className="relative group overflow-hidden flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[8px] bg-gradient-to-r from-[#ffd166] via-[#f59e0b] to-[#d97706] hover:from-[#ffe082] hover:to-[#f59e0b] text-[#0f172a] font-bold text-xs uppercase tracking-wider shadow-md shadow-[#ffd166]/20 border border-[#fef08a] transition-all cursor-pointer hover:scale-105 shrink-0"
          title="Acessar painel exclusivo BUSCAS PRO"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#0f172a] fill-[#0f172a] shrink-0" />
          <span className="font-extrabold tracking-wider font-mono text-[11px] sm:text-xs">
            <span className="hidden sm:inline">BUSCAS </span>PRO
          </span>
          <span className="hidden sm:inline-block text-[9px] bg-[#0f172a] text-[#ffd166] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">
            VIP
          </span>
        </button>

        {/* BUSCAS KREX Button */}
        <button
          id="btn-buscas-krex"
          onClick={onOpenKrexModal || onOpenZyrexModal}
          className="relative group overflow-hidden flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[8px] bg-gradient-to-r from-[#00d2ff] via-[#00a8cc] to-[#00827c] hover:from-[#79fbf5] hover:to-[#00d2ff] text-[#011d1c] font-bold text-xs uppercase tracking-wider shadow-md shadow-[#00d2ff]/20 border border-[#79fbf5] transition-all cursor-pointer hover:scale-105 shrink-0"
          title="Acessar painel exclusivo BUSCAS KREX (KREX)"
        >
          <Zap className="w-3.5 h-3.5 text-[#011d1c] fill-[#011d1c] shrink-0" />
          <span className="font-extrabold tracking-wider font-mono text-[11px] sm:text-xs">
            <span className="hidden sm:inline">BUSCAS </span>KREX
          </span>
          <span className="hidden sm:inline-block text-[9px] bg-[#011d1c] text-[#79fbf5] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">
            BOT
          </span>
        </button>

        {/* Admin Dashboard Button (Only for Administrator) */}
        {isAdmin && onOpenAdminDashboard && (
          <button
            id="btn-header-admin-dashboard"
            onClick={onOpenAdminDashboard}
            className="relative group overflow-hidden flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-[#ffd166]/20 via-[#ffd166]/10 to-[#ffd166]/20 hover:from-[#ffd166]/30 hover:to-[#ffd166]/20 border border-[#ffd166] text-[#ffd166] rounded-[8px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-105 shrink-0"
            title="Abrir Painel Administrativo Completo (Clientes, Faturamento, Consultas e Cupons)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#ffd166] shrink-0" />
            <span className="font-extrabold tracking-wider font-mono text-[11px] sm:text-xs">
              <span className="hidden sm:inline">PAINEL </span>ADMIN
            </span>
            <span className="hidden sm:inline-block text-[9px] bg-[#ffd166] text-[#011d1c] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">
              MASTER
            </span>
          </button>
        )}

        {/* Active Queue indicator */}
        {activeRequestsCount > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-2 bg-[#003734] text-[#fde9ff] rounded-[6px] text-[11px] uppercase tracking-[0.12em] font-medium font-mono shrink-0">
            <Activity className="w-3 h-3 text-[#fde9ff]" />
            <span>{activeRequestsCount} QUEUED</span>
          </div>
        )}
      </div>
    </header>
  );
};
