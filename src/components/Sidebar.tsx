import React from 'react';
import { 
  ChevronRight,
  ShieldCheck,
  Terminal,
  Layers
} from 'lucide-react';
import { QueryModuleType } from '../types';
import { QUERY_MODULES } from '../utils/modulesData';

interface SidebarProps {
  selectedModule: QueryModuleType;
  onSelectModule: (module: QueryModuleType) => void;
  pendingCountByModule?: Record<string, number>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedModule,
  onSelectModule,
  pendingCountByModule = {},
}) => {
  const cpfModules = QUERY_MODULES.filter((m) => m.id.startsWith('cpf'));
  const otherModules = QUERY_MODULES.filter((m) => !m.id.startsWith('cpf'));

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

  return (
    <aside className="w-full lg:w-80 bg-[#011d1c] border-r border-[#003734] flex flex-col flex-shrink-0 justify-between">
      <div className="py-6 px-5 overflow-y-auto space-y-7">
        
        {/* Plan / Protocol Surface Card (Liquid Kelp #003734, 16px radius, no shadows) */}
        <div className="p-5 rounded-[16px] bg-[#003734] border border-[#707777]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#edfffe] font-medium flex items-center gap-2 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
              SHAZAM PROTOCOL
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-[6px] bg-[#012624] text-[#cbfffc] font-medium border border-[#00827c]/40 font-mono">
              PREMIUM
            </span>
          </div>
          <p className="text-[13px] text-[#bbc7c6] leading-relaxed">
            Ingestão e despacho de inteligência investigativa Shazam Buscas em tempo real e alta disponibilidade.
          </p>
        </div>

        {/* Section 1: Pessoas Físicas (CPF) */}
        <div className="space-y-2">
          <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium flex items-center justify-between">
            <span>Pessoas Físicas (CPF)</span>
            <span className="text-[#bbc7c6] text-[10px]">3 BASES</span>
          </div>

          <div className="space-y-1">
            {cpfModules.map((module) => {
              const isSelected = selectedModule === module.id;
              const pendingCount = pendingCountByModule[module.id] || 0;
              const cmd = getModuleCommand(module.id);

              return (
                <button
                  key={module.id}
                  id={`btn-module-${module.id}`}
                  onClick={() => onSelectModule(module.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[6px] transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#003734] text-[#ffffff]'
                      : 'text-[#bbc7c6] hover:bg-[#012624] hover:text-[#ffffff]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-[#cbfffc]' : 'bg-[#707777]'
                      }`}
                    />
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-[13px] font-medium tracking-tight">
                          {module.title}
                        </span>
                        {module.subtitle && (
                          <span className={`text-[11px] font-normal truncate ${isSelected ? 'text-[#cbfffc]' : 'text-[#79fbf5]/80'}`}>
                            {module.subtitle}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#bbc7c6] uppercase tracking-[0.08em]">
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

        {/* Section 2: Corporativo & Veicular */}
        <div className="space-y-2">
          <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium flex items-center justify-between">
            <span>Corporativo & Localização</span>
            <span className="text-[#bbc7c6] text-[10px]">5 BASES</span>
          </div>

          <div className="space-y-1">
            {otherModules.map((module) => {
              const isSelected = selectedModule === module.id;
              const pendingCount = pendingCountByModule[module.id] || 0;
              const cmd = getModuleCommand(module.id);

              return (
                <button
                  key={module.id}
                  id={`btn-module-${module.id}`}
                  onClick={() => onSelectModule(module.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[6px] transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#003734] text-[#ffffff]'
                      : 'text-[#bbc7c6] hover:bg-[#012624] hover:text-[#ffffff]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-[#cbfffc]' : 'bg-[#707777]'
                      }`}
                    />
                    <div className="flex flex-col truncate">
                      <span className="truncate text-[13px] font-medium tracking-tight">
                        {module.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#bbc7c6] uppercase tracking-[0.08em]">
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

      {/* Operator Identity Footer */}
      <div className="p-5 border-t border-[#003734] bg-[#011d1c]">
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
    </aside>
  );
};
