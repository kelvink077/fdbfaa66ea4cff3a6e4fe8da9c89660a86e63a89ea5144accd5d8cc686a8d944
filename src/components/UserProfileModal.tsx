import React from 'react';
import { 
  User as UserIcon, 
  Crown, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  LogOut, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  ArrowUpRight,
  Zap,
  Layers
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { calculateAccountValidity } from '../lib/firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onOpenPricing: () => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onOpenPricing,
  onLogout,
}) => {
  if (!isOpen || !currentUser) return null;

  const validity = calculateAccountValidity(userProfile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#011413]/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-xl bg-[#012624] border border-[#00827c]/40 rounded-[20px] shadow-2xl p-6 sm:p-8 my-8 text-[#bbc7c6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer border border-[#707777]/30"
          aria-label="Fechar perfil"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 pb-6 border-b border-[#003734]">
          <div className="relative">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'Operador'}
                className="w-16 h-16 rounded-full border-2 border-[#cbfffc] shadow-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#003734] border-2 border-[#cbfffc] flex items-center justify-center text-[#cbfffc]">
                <UserIcon className="w-8 h-8" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#012624] border border-[#00827c]">
              <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
            </div>
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#ffffff] truncate">
                {currentUser.displayName || 'Operador Shazam'}
              </h3>
              <span className="px-2 py-0.5 rounded-[4px] bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3 text-[#ffd166]" />
                {validity.planDisplayName}
              </span>
            </div>
            <p className="text-xs text-[#bbc7c6] truncate mt-0.5 font-mono">
              {currentUser.email}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-[11px] font-mono text-[#707777]">
              <span>ID: <code className="text-[#cbfffc]">{currentUser.uid.slice(0, 8)}...</code></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Autenticado via Google
              </span>
            </div>
          </div>
        </div>

        {/* ACCOUNT VALIDITY HIGHLIGHT CARD (VALIDADE DA CONTA) */}
        <div className="mb-6 rounded-[16px] bg-gradient-to-b from-[#003734] to-[#011d1c] border border-[#00827c]/60 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#cbfffc]/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#cbfffc]" />
              <span className="text-xs font-mono font-semibold text-[#cbfffc] uppercase tracking-wider">
                Validade da Conta
              </span>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
              validity.isValid 
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
            }`}>
              {validity.isValid ? '● Acesso Liberado' : '● Expirado'}
            </span>
          </div>

          {/* Big countdown display */}
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-[#ffffff] tracking-tight">
                {validity.daysRemaining}
              </span>
              <span className="text-sm font-mono text-[#cbfffc] uppercase tracking-wider">
                {validity.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
              </span>
            </div>

            {/* Visual progress bar */}
            <div className="w-full h-2 rounded-full bg-[#012624] border border-[#00827c]/40 mt-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00827c] via-[#79fbf5] to-[#cbfffc] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, (validity.daysRemaining / 30) * 100))}%` }}
              ></div>
            </div>
          </div>

          {/* Details list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-[#00827c]/30 font-mono">
            <div>
              <span className="text-[#707777] block text-[10px] uppercase">Data Exata de Expiração</span>
              <span className="text-[#ffffff] font-semibold flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-[#cbfffc]" />
                {validity.expirationDateFormatted}
              </span>
            </div>

            <div>
              <span className="text-[#707777] block text-[10px] uppercase">Status Atual</span>
              <span className="text-[#edfffe] font-medium flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ffd166]" />
                {validity.statusText}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Payments History if any */}
        {userProfile?.recentPayments && userProfile.recentPayments.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#cbfffc] uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Histórico de Créditos PIX</span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {userProfile.recentPayments.map((p, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-[8px] bg-[#00302d]/70 border border-[#00827c]/30 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <span className="text-[#ffffff] font-medium">{p.planName}</span>
                      <span className="text-[#707777] text-[10px] block">
                        {new Date(p.paidAt).toLocaleDateString('pt-BR')} às {new Date(p.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-300 font-bold">+{p.daysAdded} dias</span>
                    <span className="text-[#707777] text-[10px] block">R$ {p.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPricing();
            }}
            className="w-full py-3 px-4 rounded-[8px] bg-gradient-to-r from-[#ffd166] to-[#ffdc85] hover:opacity-95 text-[#012624] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
          >
            <Zap className="w-4 h-4 text-[#012624]" />
            <span>Renovar ou Adicionar Mais Dias (Via PIX)</span>
            <ArrowUpRight className="w-4 h-4 text-[#012624]" />
          </button>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-[8px] bg-[#003734] hover:bg-[#004743] border border-[#00827c]/40 text-[#edfffe] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="px-4 py-2.5 rounded-[8px] bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/40 text-rose-300 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
