import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  LogIn, 
  ChevronRight, 
  X,
  Flame,
  Crown,
  AlertTriangle,
  Search
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { calculateAccountValidity } from '../lib/firebase';

interface TrialBannerProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfileData | null;
  onLoginGoogle: () => void;
  isAuthLoading?: boolean;
  onOpenPricing?: () => void;
  onOpenProfile?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  currentUser,
  userProfile,
  onLoginGoogle,
  isAuthLoading = false,
  onOpenPricing,
  onOpenProfile,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const validity = calculateAccountValidity(userProfile);
  
  const isTrial = userProfile?.plan === 'trial';
  const isAccountExpired = validity.isExpired || !validity.isValid || userProfile?.planStatus === 'expired';

  if (isDismissed) {
    return (
      <div className="bg-[#002826] border-b border-[#003734] px-4 py-1.5 flex items-center justify-between text-[11px] text-[#bbc7c6]">
        <div className="flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
          <span>
            {currentUser 
              ? (isAccountExpired
                  ? '⚠️ O seu plano está expirado. Contrate um plano para continuar realizando consultas.'
                  : isTrial 
                  ? `Teste Grátis (24h): ${validity.isValid ? (validity.hoursRemaining > 1 ? `${validity.hoursRemaining} horas restantes` : `${validity.hoursRemaining === 1 ? '1 hora restante' : 'menos de 1 hora restante'}`) : 'Expirado'}` 
                  : `${validity.planDisplayName}: ${validity.daysRemaining} dias de acesso restantes (Válido até ${validity.expirationDateFormatted})`)
              : 'Novos clientes: Cadastre-se com o Google e ganhe teste gratuito de 24 horas no Plano Premium!'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="text-[#ffd166] hover:underline cursor-pointer uppercase tracking-wider text-[10px] font-mono"
            >
              Ver Validade / Perfil
            </button>
          )}
          <button
            onClick={() => setIsDismissed(false)}
            className="text-[#cbfffc] hover:underline cursor-pointer uppercase tracking-wider text-[10px]"
          >
            Expandir Aviso
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // USUÁRIO AUTENTICADO
  // =========================================================
  if (currentUser) {
    // CENÁRIO 1: CONTA EXPIRADA (Banner de Bloqueio em Vermelho com Ação Imediata)
    if (isAccountExpired) {
      return (
        <aside 
          className="relative bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#450a0a] border-b border-[#ef4444]/60 text-white px-4 sm:px-6 py-2.5 z-40 shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#ef4444]/30 border border-[#ef4444] flex items-center justify-center shrink-0 text-[#ffd166]">
                <AlertTriangle className="w-4 h-4 animate-pulse text-[#ffd166]" />
              </div>
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#ffffff]">
                <strong className="text-[#ffd166]">O seu plano está expirado!</strong> Contrate um plano para continuar realizando consultas e emitindo dossiês.
              </span>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {onOpenPricing && (
                <button 
                  onClick={onOpenPricing} 
                  className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-[#ffd166] to-[#f59e0b] hover:brightness-110 text-[#012624] px-4 py-1.5 rounded-[6px] font-bold tracking-wide uppercase transition-all cursor-pointer shadow-md"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Contratar Plano para Continuar</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      );
    }

    // CENÁRIO 2: TESTE GRÁTIS ATIVO (Banner Amarelo 24 Horas)
    if (isTrial) {
      return (
        <aside 
          className="relative bg-gradient-to-r from-[#012624] via-[#013531] to-[#012624] border-b border-[#ffd166]/40 text-[#edfffe] px-4 sm:px-6 py-2.5 z-40 shadow-sm"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-medium tracking-wide">
                <Clock className="w-3.5 h-3.5 text-[#ffd166] animate-pulse" />
                <span>TESTE GRÁTIS ATIVO (24 HORAS)</span>
              </div>
              <span className="font-medium text-xs sm:text-sm text-[#ffffff] tracking-tight">
                Seu período de teste de 24 horas está liberado: restam <strong className="text-[#ffd166] font-mono">{validity.hoursRemaining > 1 ? `${validity.hoursRemaining} horas` : `${validity.hoursRemaining === 1 ? '1 hora' : 'menos de 1 hora'}`}</strong> (válido até {validity.expirationDateFormatted}).
              </span>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {onOpenPricing && (
                <button 
                  onClick={onOpenPricing} 
                  className="flex items-center gap-1.5 text-xs bg-[#ffd166] hover:bg-[#ffc233] text-[#011d1c] px-3 py-1.5 rounded-[6px] font-bold uppercase transition-colors cursor-pointer shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Assinar Plano Completo</span>
                </button>
              )}
              <button
                onClick={() => setIsDismissed(true)}
                className="text-[#bbc7c6] hover:text-[#ffffff] p-1 rounded hover:bg-[#003734] transition-colors cursor-pointer"
                title="Ocultar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      );
    }

    // CENÁRIO 3: PLANO PAGO (Banner Verde Original)
    return (
      <aside 
        id="trial-premium-top-banner"
        aria-label="Aviso de Validade da Conta"
        className="relative bg-gradient-to-r from-[#00302d] via-[#004743] to-[#002e2b] border-b border-[#00827c]/40 text-[#edfffe] px-4 sm:px-6 py-2.5 z-40 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-medium tracking-wide">
              <Crown className="w-3.5 h-3.5 text-[#ffd166] animate-pulse" />
              <span>{validity.planDisplayName.toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-xs sm:text-sm text-[#ffffff] tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Validade da Conta:</span>
              </span>
              <button
                onClick={onOpenProfile}
                className="text-xs text-[#cbfffc] hover:text-[#ffffff] font-semibold bg-[#011d1c]/80 hover:bg-[#011d1c] px-2 py-0.5 rounded border border-[#00827c]/40 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                title="Ver detalhes de validade da conta no perfil"
              >
                {!validity.isValid
                  ? 'Expirado'
                  : `${validity.daysRemaining} ${validity.daysRemaining === 1 ? 'dia' : 'dias'} restantes`}
              </button>
            </div>

            <span className="text-[11px] text-[#bbc7c6] hidden lg:inline-flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-[#707777]" />
              <span>Até: <strong className="text-[#ffffff]">{validity.expirationDateFormatted}</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end text-xs">
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#edfffe] font-mono">
              <span className="flex items-center gap-1 text-[#cbfffc]">
                <Zap className="w-3 h-3" />
                <span>8 Módulos Liberados</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-[#00827c]"></span>
              <span className="flex items-center gap-1 text-[#cbfffc]">
                <ShieldCheck className="w-3 h-3" />
                <span>Histórico em Nuvem</span>
              </span>
            </div>

            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-[#ffd166]/15 hover:bg-[#ffd166]/25 border border-[#ffd166]/40 text-[#ffd166] text-[11px] font-mono transition-colors cursor-pointer"
              >
                <Crown className="w-3 h-3 text-[#ffd166]" />
                <span>Renovar / Adicionar Dias</span>
              </button>
            )}

            <button
              onClick={() => setIsDismissed(true)}
              className="text-[#bbc7c6] hover:text-[#ffffff] p-1 rounded hover:bg-[#003734] transition-colors cursor-pointer ml-2"
              title="Ocultar aviso temporariamente"
              aria-label="Ocultar aviso temporariamente"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================
  // USUÁRIO DESLOGADO (Promoção para Cadastro)
  // =========================================================
  return (
    <aside 
      id="trial-premium-registration-banner"
      aria-label="Aviso de Registro de Novos Clientes"
      className="relative bg-gradient-to-r from-[#003431] via-[#01423e] to-[#002f2c] border-b border-[#cbfffc]/30 text-[#edfffe] px-4 sm:px-6 py-2.5 z-40 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap text-center sm:text-left">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-medium tracking-wide">
            <Flame className="w-3.5 h-3.5 text-[#ffd166]" />
            <span>NOVO CLIENTE</span>
          </div>

          <p className="text-xs sm:text-sm text-[#ffffff]">
            Registre-se com o Google e ganhe o <strong className="text-[#ffd166]">Plano Premium</strong> com <strong className="text-[#cbfffc] underline decoration-[#00827c]">teste gratuito de 24 horas</strong>!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-banner-activate-trial"
            onClick={onLoginGoogle}
            disabled={isAuthLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#cbfffc] hover:bg-[#a5fbf8] text-[#012624] font-medium text-xs tracking-wide uppercase font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ativar Teste Grátis (24 Horas)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-[#bbc7c6] hover:text-[#ffffff] p-1 rounded hover:bg-[#003734] transition-colors cursor-pointer"
            title="Ocultar aviso temporariamente"
            aria-label="Ocultar aviso temporariamente"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};