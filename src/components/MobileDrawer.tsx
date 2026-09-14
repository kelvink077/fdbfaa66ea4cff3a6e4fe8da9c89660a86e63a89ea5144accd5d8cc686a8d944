import React, { useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  UserCheck, 
  ShieldAlert, 
  Fingerprint, 
  Building2, 
  Users, 
  Mail, 
  Car, 
  Phone,
  MapPin
} from 'lucide-react';
import { QueryModuleType } from '../types';
import { QUERY_MODULES } from '../utils/modulesData';
import { ShazamLogo } from './ShazamLogo';
import { AuroraCurtainCanvas } from './AuroraCurtainCanvas';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModule: QueryModuleType;
  onSelectModule: (module: QueryModuleType) => void;
  pendingCountByModule?: Record<string, number>;
  onOpenProModal?: () => void;
  onOpenKrexModal?: () => void;
  onOpenResellerPortal?: () => void;
  onOpenSmartMaps?: () => void;
  onOpenCepScan?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  selectedModule,
  onSelectModule,
  pendingCountByModule = {},
  onOpenProModal,
  onOpenKrexModal,
  onOpenResellerPortal,
  onOpenSmartMaps,
  onOpenCepScan,
}) => {
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cpfModules = QUERY_MODULES.filter((m) => m.id.startsWith('cpf'));
  const otherModules = QUERY_MODULES.filter((m) => !m.id.startsWith('cpf'));

  const getModuleIcon = (id: string, isSelected: boolean) => {
    const iconClass = `w-4 h-4 shrink-0 ${isSelected ? 'text-[#cbfffc]' : 'text-[#707777]'}`;
    switch (id) {
      case 'cpf_1': return <UserCheck className={iconClass} />;
      case 'cpf_2': return <ShieldAlert className={iconClass} />;
      case 'cpf_3': return <Fingerprint className={iconClass} />;
      case 'cnpj': return <Building2 className={iconClass} />;
      case 'nome': return <Users className={iconClass} />;
      case 'email': return <Mail className={iconClass} />;
      case 'placa': return <Car className={iconClass} />;
      case 'telefone': return <Phone className={iconClass} />;
      case 'cep': return <MapPin className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  const getModuleCommand = (id: string) => {
    switch (id) {
      case 'cpf_1': return '/cpf1';
      case 'cpf_2': return '/cpf2';
      case 'cpf_3': return '/cpf3';
      case 'cnpj': return '/cnpj';
      case 'nome': return '/nome';
      case 'placa': return '/placa';
      case 'telefone': return '/telefone';
      case 'email': return '/email';
      default: return `/${id}`;
    }
  };

  const handleSelect = (moduleId: QueryModuleType) => {
    onSelectModule(moduleId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer content with Desktop Column Style & Aurora Canvas */}
      <div className="relative w-full max-w-[320px] bg-[#011d1c] border-r border-[#003734] h-full flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200 overflow-hidden">
        {/* Dynamic 60fps Silk Aurora Curtains Canvas Engine */}
        <AuroraCurtainCanvas />

        {/* Header */}
        <div className="relative z-10 p-4 border-b border-[#003734] flex items-center justify-between bg-[#012624]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <ShazamLogo size="sm" isPulseSpeedFast={true} />
            <div>
              <h2 className="text-sm font-bold text-[#ffffff] uppercase font-mono tracking-tight">
                Módulos de Busca
              </h2>
              <span className="text-[10px] text-[#cbfffc] font-mono">
                8 BASES ATIVAS
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734] transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick VIP Actions */}
        <div className="relative z-10 p-3 border-b border-[#003734] space-y-2 bg-[#011d1c]/80 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-2">
            {onOpenProModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenProModal();
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-[8px] bg-gradient-to-r from-[#ffd166] to-[#f59e0b] text-[#0f172a] font-bold text-xs shadow-md border border-[#fef08a]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-[#0f172a]" />
                <span>BUSCAS PRO</span>
              </button>
            )}

            {onOpenKrexModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenKrexModal();
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-[8px] bg-gradient-to-r from-[#00d2ff] to-[#00827c] text-[#011d1c] font-bold text-xs shadow-md border border-[#79fbf5]"
              >
                <Zap className="w-3.5 h-3.5 fill-[#011d1c]" />
                <span>BUSCAS KREX</span>
              </button>
            )}
          </div>
        </div>

        {/* Module lists (Desktop Column Style) */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-6">
          {/* Plan / Protocol Surface Card (Liquid Kelp #003734, matching Desktop Sidebar) */}
          <div className="p-4 rounded-[14px] bg-[#003734]/90 backdrop-blur-[4px] border border-[#707777]/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#edfffe] font-medium flex items-center gap-2 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
                SHAZAM PROTOCOL
              </span>
              <span className="text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-[6px] bg-[#012624] text-[#cbfffc] font-medium border border-[#00827c]/40 font-mono">
                PREMIUM
              </span>
            </div>
            <p className="text-xs text-[#bbc7c6] leading-relaxed">
              Ingestão e despacho de inteligência investigativa Shazam Buscas em tempo real e alta disponibilidade.
            </p>
          </div>

          {/* Section 1: Pessoas Físicas (CPF) */}
          <div className="space-y-2">
            <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium flex items-center justify-between">
              <span>Pessoas Físicas (CPF)</span>
              <span className="text-[#bbc7c6] text-[10px]">3 BASES</span>
            </div>

            <div className="space-y-1.5">
              {cpfModules.map((module) => {
                const isSelected = selectedModule === module.id;
                const pendingCount = pendingCountByModule[module.id] || 0;
                const cmd = getModuleCommand(module.id);

                return (
                  <button
                    key={module.id}
                    id={`mobile-btn-module-${module.id}`}
                    type="button"
                    onClick={() => handleSelect(module.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[8px] transition-all duration-150 cursor-pointer text-left border ${
                      isSelected
                        ? 'bg-[#003734] border-[#00ffa2]/40 text-[#ffffff] shadow-[0_0_12px_rgba(0,255,162,0.15)]'
                        : 'bg-[#011d1c]/80 hover:bg-[#003734]/70 border-[#003734]/80 hover:border-[#00827c]/60 text-[#bbc7c6] hover:text-[#ffffff] backdrop-blur-[6px]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isSelected ? 'bg-[#cbfffc] ring-2 ring-[#00ffa2]/40' : 'bg-[#707777]'
                        }`}
                      />
                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`truncate text-[13px] font-medium tracking-tight ${isSelected ? 'text-[#ffffff] font-semibold' : 'text-[#e5eceb]'}`}>
                            {module.title}
                          </span>
                          {module.subtitle && (
                            <span className={`text-[11px] font-normal truncate ${isSelected ? 'text-[#cbfffc]' : 'text-[#79fbf5]/90'}`}>
                              {module.subtitle}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-[0.08em] ${isSelected ? 'text-[#a3e5df]' : 'text-[#8ea3a1]'}`}>
                          {cmd}
                        </span>
                      </div>
                    </div>

                    {pendingCount > 0 ? (
                      <span className="flex h-5 px-1.5 items-center justify-center rounded-[6px] bg-[#00827c] text-[#edfffe] text-[10px] font-mono font-medium">
                        {pendingCount}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#cbfffc]' : 'text-[#707777]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Corporativo & Localização */}
          <div className="space-y-2">
            <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium flex items-center justify-between">
              <span>Corporativo & Localização</span>
              <span className="text-[#bbc7c6] text-[10px]">5 BASES</span>
            </div>

            <div className="space-y-1.5">
              {otherModules.map((module) => {
                const isSelected = selectedModule === module.id;
                const pendingCount = pendingCountByModule[module.id] || 0;
                const cmd = getModuleCommand(module.id);

                return (
                  <button
                    key={module.id}
                    id={`mobile-btn-module-${module.id}`}
                    type="button"
                    onClick={() => handleSelect(module.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[8px] transition-all duration-150 cursor-pointer text-left border ${
                      isSelected
                        ? 'bg-[#003734] border-[#00ffa2]/40 text-[#ffffff] shadow-[0_0_12px_rgba(0,255,162,0.15)]'
                        : 'bg-[#011d1c]/80 hover:bg-[#003734]/70 border-[#003734]/80 hover:border-[#00827c]/60 text-[#bbc7c6] hover:text-[#ffffff] backdrop-blur-[6px]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isSelected ? 'bg-[#cbfffc] ring-2 ring-[#00ffa2]/40' : 'bg-[#707777]'
                        }`}
                      />
                      <div className="flex flex-col truncate">
                        <span className={`truncate text-[13px] font-medium tracking-tight ${isSelected ? 'text-[#ffffff] font-semibold' : 'text-[#e5eceb]'}`}>
                          {module.title}
                        </span>
                        <span className={`text-[10px] font-mono uppercase tracking-[0.08em] ${isSelected ? 'text-[#a3e5df]' : 'text-[#8ea3a1]'}`}>
                          {cmd}
                        </span>
                      </div>
                    </div>

                    {pendingCount > 0 ? (
                      <span className="flex h-5 px-1.5 items-center justify-center rounded-[6px] bg-[#00827c] text-[#edfffe] text-[10px] font-mono font-medium">
                        {pendingCount}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#cbfffc]' : 'text-[#707777]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Operator Identity Footer (matching Desktop Sidebar) */}
        <div className="relative z-10 p-4 border-t border-[#003734] bg-[#011d1c]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#003734] border border-[#00827c]/40 flex items-center justify-center text-xs font-mono font-bold text-[#cbfffc]">
              ⚡
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[13px] font-medium text-[#ffffff] truncate">Operador Shazam Buscas</p>
              <p className="text-[10px] text-[#bbc7c6] uppercase tracking-[0.1em] flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
                Sessão Autenticada
              </p>
            </div>
            <ShieldCheck className="w-4 h-4 text-[#cbfffc] shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};
