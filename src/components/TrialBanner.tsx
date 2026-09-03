import React, { useState, useEffect } from 'react';
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
  Crown
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

  const formattedExpirationDate = userProfile?.trialEndsAt
    ? new Date(userProfile.trialEndsAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (isDismissed) {
    return (
      <div className="bg-[#002826] border-b border-[#003734] px-4 py-1.5 flex items-center justify-between text-[11px] text-[#bbc7c6]">
        <div className="flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
          <span>
            {currentUser 
              ? `${validity.planDisplayName}: ${validity.daysRemaining} dias de acesso restantes (Válido até ${validity.expirationDateFormatted})`
              : 'Novos clientes: Cadastre-se com o Google e ganhe 7 dias de teste no Plano Premium!'}
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

  // Se o usuário estiver autenticado
  if (currentUser) {
    return (
      <aside 
        id="trial-premium-top-banner"
        aria-label="Aviso de Validade da Conta"
        className="relative bg-gradient-to-r from-[#00302d] via-[#004743] to-[#002e2b] border-b border-[#00827c]/40 text-[#edfffe] px-4 sm:px-6 py-2.5 z-40 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Lado Esquerdo: Tag do Plano e Validade */}
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

          {/* Lado Direito: Vantagens Ativas & Fechar */}
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

  // Se o usuário ainda NÃO estiver autenticado:
  // Chama a atenção de novos clientes para se cadastrarem e ganharem o teste de 7 dias
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
            Registre-se com o Google e ganhe o <strong className="text-[#ffd166]">Plano Premium</strong> com <strong className="text-[#cbfffc] underline decoration-[#00827c]">teste grátis válido por 7 dias</strong>!
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
            <span>Ativar Teste de 7 Dias</span>
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
