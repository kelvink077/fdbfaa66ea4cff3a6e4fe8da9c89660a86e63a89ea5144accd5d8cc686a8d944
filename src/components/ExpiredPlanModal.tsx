import React from 'react';
import { 
  AlertTriangle, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Clock, 
  CreditCard, 
  ShieldAlert,
  Zap,
  Lock
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { calculateAccountValidity } from '../lib/firebase';

interface ExpiredPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onOpenPricing: () => void;
  onSelectPlanForPix: (planId: 'weekly' | 'biweekly' | 'monthly') => void;
}

export const ExpiredPlanModal: React.FC<ExpiredPlanModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onOpenPricing,
  onSelectPlanForPix,
}) => {
  if (!isOpen) return null;

  const validity = calculateAccountValidity(userProfile);
  const isTrial = userProfile?.plan === 'trial';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#011413]/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expired-plan-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-[#012624] border border-[#ffd166]/40 rounded-[20px] shadow-2xl p-6 sm:p-8 my-8 text-[#bbc7c6] ring-1 ring-[#ffd166]/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          id="btn-close-expired-plan-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer border border-[#707777]/30"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Topo com Ícone e Badge */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffd166]/20 to-[#ef4444]/20 border-2 border-[#ffd166] flex items-center justify-center text-[#ffd166] shadow-lg shadow-[#ffd166]/20">
              <Lock className="w-8 h-8 text-[#ffd166]" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#ef4444] text-white border-2 border-[#012624]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-xs font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
            <span>Consultas Bloqueadas • Plano Expirado</span>
          </div>

          <h2 
            id="expired-plan-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ffffff] font-['DM_Sans',sans-serif]"
          >
            O seu plano está expirado
          </h2>

          <p className="text-sm sm:text-base text-[#edfffe] max-w-lg leading-relaxed">
            Contrate um plano para continuar realizando consultas e emitindo dossiês completos no sistema.
          </p>
        </div>

        {/* Card Informativo da Conta Atual */}
        <div className="p-4 rounded-[14px] bg-[#011d1c] border border-[#003734] mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#003734] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#707777] font-mono">OPERADOR:</span>
              <span className="font-semibold text-[#ffffff] truncate max-w-[200px]">
                {currentUser?.displayName || userProfile?.displayName || 'Usuário Cadastrado'}
              </span>
              <span className="text-[#8c9a99] truncate max-w-[220px]">
                ({currentUser?.email || userProfile?.email || 'email@exemplo.com'})
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-bold self-start sm:self-auto">
              {validity.statusText}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#707777] block text-[11px] font-mono uppercase">Data de Expiração</span>
              <span className="font-mono text-[#ffd166] font-medium">
                {validity.expirationDateFormatted || 'Período esgotado'}
              </span>
            </div>
            <div>
              <span className="text-[#707777] block text-[11px] font-mono uppercase">Status do Barramento</span>
              <span className="text-[#ef4444] font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Novas consultas pausadas até a renovação
              </span>
            </div>
          </div>
        </div>

        {/* Opções Rápidas de Planos com Ativação Imediata via PIX */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.08em] font-mono text-[#cbfffc]">
              Escolha seu plano para liberação instantânea:
            </span>
            <span className="text-[11px] font-mono text-[#707777]">
              Ativação via PIX Automático
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Plano Semanal */}
            <div 
              onClick={() => {
                onClose();
                onSelectPlanForPix('weekly');
              }}
              className="p-4 rounded-[14px] bg-[#003734]/70 hover:bg-[#003734] border border-[#00827c]/40 hover:border-[#cbfffc] transition-all cursor-pointer flex flex-col justify-between group text-left"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#edfffe] font-['DM_Sans',sans-serif]">Semanal</span>
                  <span className="text-[10px] font-mono text-[#707777]">7 Dias</span>
                </div>
                <div className="text-lg font-bold text-[#ffffff] font-mono">
                  R$ 11,00
                </div>
                <p className="text-[11px] text-[#bbc7c6] mt-1 line-clamp-2">
                  Flexibilidade para checagens e demandas pontuais.
                </p>
              </div>
              <button
                type="button"
                className="mt-3 w-full py-1.5 rounded-[6px] bg-[#011d1c] group-hover:bg-[#00827c] text-[#cbfffc] group-hover:text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Escolher</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Plano 15 Dias - Destaque */}
            <div 
              onClick={() => {
                onClose();
                onSelectPlanForPix('biweekly');
              }}
              className="p-4 rounded-[14px] bg-gradient-to-b from-[#003734] to-[#012624] border-2 border-[#ffd166] shadow-lg shadow-[#ffd166]/10 transition-all cursor-pointer flex flex-col justify-between group text-left relative"
            >
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#ffd166] text-[#012624] text-[9px] font-mono font-extrabold uppercase tracking-wider shadow">
                Mais Popular
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#ffd166] font-['DM_Sans',sans-serif]">15 Dias</span>
                  <span className="text-[10px] font-mono text-[#ffd166]">15 Dias</span>
                </div>
                <div className="text-lg font-bold text-[#ffffff] font-mono">
                  R$ 19,90
                </div>
                <p className="text-[11px] text-[#bbc7c6] mt-1 line-clamp-2">
                  Melhor equilíbrio de custo-benefício para autônomos.
                </p>
              </div>
              <button
                type="button"
                className="mt-3 w-full py-1.5 rounded-[6px] bg-[#ffd166] text-[#012624] text-xs font-mono font-extrabold transition-opacity hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Contratar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Plano Mensal */}
            <div 
              onClick={() => {
                onClose();
                onSelectPlanForPix('monthly');
              }}
              className="p-4 rounded-[14px] bg-[#003734]/70 hover:bg-[#003734] border border-[#00827c]/40 hover:border-[#cbfffc] transition-all cursor-pointer flex flex-col justify-between group text-left"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#edfffe] font-['DM_Sans',sans-serif]">Mensal</span>
                  <span className="text-[10px] font-mono text-[#ffd166]">30 Dias</span>
                </div>
                <div className="text-lg font-bold text-[#ffffff] font-mono">
                  R$ 35,00
                </div>
                <p className="text-[11px] text-[#bbc7c6] mt-1 line-clamp-2">
                  Aceita código de ativação ou desconto de novo usuário.
                </p>
              </div>
              <button
                type="button"
                className="mt-3 w-full py-1.5 rounded-[6px] bg-[#011d1c] group-hover:bg-[#00827c] text-[#cbfffc] group-hover:text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Escolher</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#003734]">
          <button
            id="btn-expired-modal-close"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-[8px] bg-[#011d1c] hover:bg-[#003734] border border-[#707777]/30 text-[#bbc7c6] hover:text-[#ffffff] text-xs font-mono transition-colors cursor-pointer text-center"
          >
            Fechar
          </button>

          <button
            id="btn-expired-modal-open-pricing"
            type="button"
            onClick={() => {
              onClose();
              onOpenPricing();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-[8px] bg-gradient-to-r from-[#ffd166] to-[#f59e0b] hover:opacity-95 text-[#012624] text-xs font-extrabold uppercase tracking-[0.08em] shadow-lg shadow-[#ffd166]/20 transition-all flex items-center justify-center gap-2 cursor-pointer font-['DM_Sans',sans-serif]"
          >
            <Crown className="w-4 h-4 text-[#012624]" />
            <span>Contratar Plano para Continuar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
