import React from 'react';
import { LogOut } from 'lucide-react';
import { ProgrammerMaintenanceAnimation } from './ProgrammerMaintenanceAnimation';

interface MaintenanceModalProps {
  isOpen: boolean;
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onLogout,
  isAdmin = false,
  onOpenAdmin,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="system-maintenance-modal-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#011413]/95 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
    >
      <div
        id="system-maintenance-modal-card"
        className="w-full max-w-lg bg-gradient-to-b from-[#012624] to-[#011c1b] border-2 border-[#00827c]/60 rounded-2xl shadow-2xl shadow-[#000000]/80 p-6 sm:p-8 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00d2ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffd166]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Programmer opening notebook and waving to wait */}
        <div id="programmer-animation-container" className="mb-2">
          <ProgrammerMaintenanceAnimation />
        </div>

        {/* Title */}
        <h2
          id="maintenance-modal-title"
          className="text-xl sm:text-2xl font-black font-['DM_Sans',sans-serif] uppercase tracking-wide text-[#ffffff] mb-3"
        >
          Sistema em Manutenção
        </h2>

        {/* Official User-Requested Maintenance Notice */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#011716] border border-[#004d46] text-[#e0f2f1] text-sm sm:text-base leading-relaxed mb-6 font-semibold shadow-inner">
          No momento estamos em manutenção, por favor aguarde.
        </div>

        {/* Action Button: Sair (Sign out) */}
        <div className="flex flex-col items-center gap-3">
          <button
            id="btn-maintenance-logout"
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto min-w-[200px] px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff4757] to-[#e84118] hover:from-[#ff6b81] hover:to-[#ff4757] text-[#ffffff] font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#ff4757]/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>

          {/* Fallback for Administrator to access control panel without closing the modal for regular users */}
          {isAdmin && onOpenAdmin && (
            <button
              id="btn-maintenance-admin"
              type="button"
              onClick={onOpenAdmin}
              className="text-[11px] font-mono text-[#9bb0af] hover:text-[#ffd166] underline underline-offset-4 mt-2 transition-colors cursor-pointer"
            >
              Painel Administrativo (Gerenciar Sessão)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
