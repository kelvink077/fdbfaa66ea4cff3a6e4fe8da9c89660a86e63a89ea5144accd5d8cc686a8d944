import React from 'react';
import { 
  UserCheck, 
  ShieldAlert, 
  Fingerprint, 
  Building2, 
  Users, 
  Mail, 
  Car, 
  Phone,
  Layers,
  Sparkles
} from 'lucide-react';
import { QueryModuleType } from '../types';
import { QUERY_MODULES } from '../utils/modulesData';

interface MobileModuleBarProps {
  selectedModule: QueryModuleType;
  onSelectModule: (module: QueryModuleType) => void;
  pendingCountByModule?: Record<string, number>;
  onOpenAllModules?: () => void;
}

export const MobileModuleBar: React.FC<MobileModuleBarProps> = ({
  selectedModule,
  onSelectModule,
  pendingCountByModule = {},
  onOpenAllModules,
}) => {
  const getModuleIcon = (id: string, isSelected: boolean) => {
    const iconClass = `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#011d1c]' : 'text-[#cbfffc]'}`;
    switch (id) {
      case 'cpf_1': return <UserCheck className={iconClass} />;
      case 'cpf_2': return <ShieldAlert className={iconClass} />;
      case 'cpf_3': return <Fingerprint className={iconClass} />;
      case 'cnpj': return <Building2 className={iconClass} />;
      case 'nome': return <Users className={iconClass} />;
      case 'email': return <Mail className={iconClass} />;
      case 'placa': return <Car className={iconClass} />;
      case 'telefone': return <Phone className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  const getModuleShortName = (id: string) => {
    switch (id) {
      case 'cpf_1': return 'CPF 1 (Básica)';
      case 'cpf_2': return 'CPF 2 (Interm.)';
      case 'cpf_3': return 'CPF 3 (Avanç.)';
      case 'cnpj': return 'CNPJ';
      case 'nome': return 'NOME';
      case 'placa': return 'PLACA';
      case 'telefone': return 'TELEFONE';
      case 'email': return 'E-MAIL';
      default: return id.toUpperCase();
    }
  };

  return (
    <div className="lg:hidden w-full bg-[#011d1c] border-b border-[#003734] px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
        {QUERY_MODULES.map((module) => {
          const isSelected = selectedModule === module.id;
          const pendingCount = pendingCountByModule[module.id] || 0;

          return (
            <button
              key={module.id}
              id={`mobile-tab-${module.id}`}
              type="button"
              onClick={() => onSelectModule(module.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] text-[#011d1c] font-bold shadow-md shadow-[#00827c]/20 ring-1 ring-[#ffffff]/40'
                  : 'bg-[#003734]/80 hover:bg-[#003734] text-[#bbc7c6] hover:text-[#ffffff] border border-[#00827c]/30'
              }`}
            >
              {getModuleIcon(module.id, isSelected)}
              <span>{getModuleShortName(module.id)}</span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold leading-none ${
                  isSelected ? 'bg-[#011d1c] text-[#cbfffc]' : 'bg-[#00827c] text-[#ffffff]'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}

        {onOpenAllModules && (
          <button
            type="button"
            onClick={onOpenAllModules}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-mono bg-[#012624] text-[#cbfffc] border border-[#00827c]/40 hover:bg-[#003734] whitespace-nowrap shrink-0 cursor-pointer"
            title="Ver todos os módulos"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Bases</span>
          </button>
        )}
      </div>
    </div>
  );
};
