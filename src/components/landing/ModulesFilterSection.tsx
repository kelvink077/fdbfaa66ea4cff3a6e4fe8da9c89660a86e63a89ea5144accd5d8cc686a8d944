import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Terminal, 
  Cpu, 
  ShieldCheck 
} from 'lucide-react';
import { QUERY_MODULES } from '../../utils/modulesData';
import { PRO_MODULES } from '../../utils/proModulesData';
import { ALL_KREX_MODULES } from '../../utils/krexModulesData';

export type SystemModuleTier = 'padrao' | 'pro' | 'krex';

export interface UnifiedSystemModule {
  id: string;
  name: string;
  commandOrId: string;
  tier: SystemModuleTier;
  tierLabel: string;
  category: string;
  iconName: string;
  description: string;
  inputHint: string;
  badge?: string;
  inDevelopment?: boolean;
}

// Consolidar estritamente os módulos reais existentes no sistema
const SYSTEM_MODULES: UnifiedSystemModule[] = [
  // 1. MÓDULOS PADRÃO (8)
  ...QUERY_MODULES.map((m) => ({
    id: `padrao_${m.id}`,
    name: `${m.title} ${m.subtitle || ''}`.trim(),
    commandOrId: `Padrão: ${m.title}`,
    tier: 'padrao' as SystemModuleTier,
    tierLabel: 'PADRÃO',
    category: m.category || 'Padrão',
    iconName: m.iconName,
    description: m.description,
    inputHint: m.placeholder,
    badge: m.badge,
  })),

  // 2. MÓDULOS PRO (11)
  ...PRO_MODULES.map((m) => ({
    id: `pro_${m.id}`,
    name: m.title,
    commandOrId: `Comando: ${m.command}`,
    tier: 'pro' as SystemModuleTier,
    tierLabel: 'PRO',
    category: 'Terminal Pro',
    iconName: m.iconName,
    description: m.description,
    inputHint: m.inputLabel || m.placeholder,
    badge: m.badge,
    inDevelopment: m.inDevelopment,
  })),

  // 3. MÓDULOS KREX (22)
  ...ALL_KREX_MODULES.map((m) => ({
    id: `krex_${m.id}`,
    name: m.title,
    commandOrId: `Comando: ${m.command}`,
    tier: 'krex' as SystemModuleTier,
    tierLabel: 'KREX',
    category: 'Barramento Krex',
    iconName: m.iconName,
    description: m.inputHelper || `Consulta direta no cluster KREX via ${m.command}`,
    inputHint: m.inputLabel || m.placeholder,
    badge: 'KREX ⚡',
  })),
];

interface ModulesFilterSectionProps {
  onSelectModule?: () => void;
}

export const ModulesFilterSection: React.FC<ModulesFilterSectionProps> = ({ onSelectModule }) => {
  const [activeTier, setActiveTier] = useState<'padrao' | 'pro' | 'krex'>('padrao');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => ({
    todos: SYSTEM_MODULES.length,
    padrao: SYSTEM_MODULES.filter((m) => m.tier === 'padrao').length,
    pro: SYSTEM_MODULES.filter((m) => m.tier === 'pro').length,
    krex: SYSTEM_MODULES.filter((m) => m.tier === 'krex').length,
  }), []);

  const filteredModules = useMemo(() => {
    return SYSTEM_MODULES.filter((mod) => {
      const matchesTier = mod.tier === activeTier;
      if (!matchesTier) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        mod.name.toLowerCase().includes(q) ||
        mod.commandOrId.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.inputHint.toLowerCase().includes(q)
      );
    });
  }, [activeTier, searchQuery]);

  const tierTabs = [
    { id: 'padrao', label: 'Padrão', count: counts.padrao, icon: ShieldCheck },
    { id: 'pro', label: 'Pro', count: counts.pro, icon: Sparkles },
    { id: 'krex', label: 'Krex', count: counts.krex, icon: Cpu },
  ] as const;

  return (
    <section id="modulos" className="py-20 lg:py-28 bg-[#011d1c] border-b border-[#003734] relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003734] border border-[#00827c]/50 text-[#cbfffc] text-xs font-mono">
              <Terminal className="w-3.5 h-3.5 text-[#cbfffc]" />
              <span>{counts.todos} MÓDULOS OPERACIONAIS • PADRÃO ({counts.padrao}) • PRO ({counts.pro}) • KREX ({counts.krex})</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#ffffff] tracking-tight leading-[1.1]">
              Tudo o que você precisa investigar,<br />
              <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent">
                em um único terminal
              </span>.
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm text-[#bbc7c6] leading-relaxed">
            Catálogo completo e integrado com apenas os módulos reais existentes no sistema:
            a consistência do <strong>Terminal Padrão</strong>, o aprofundamento do <strong>Terminal Pro</strong> e a velocidade de resposta do <strong>Barramento Krex</strong>.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          {/* Tier Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {tierTabs.map((tab) => {
              const isActive = activeTier === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-modulo-${tab.id}`}
                  onClick={() => setActiveTier(tab.id)}
                  className={`px-3.5 py-2 rounded-[8px] text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#00827c] text-[#011d1c] font-bold shadow-sm'
                      : 'bg-[#002422] text-[#bbc7c6] hover:text-[#cbfffc] border border-[#003734]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#011d1c]/20 text-[#011d1c]' : 'bg-[#011a19] text-[#707777]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#707777]" />
            <input
              id="input-busca-modulos-landing"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por nome ou comando..."
              className="w-full bg-[#002422] border border-[#003734] focus:border-[#00827c] rounded-[8px] pl-8 pr-3 py-1.5 text-xs text-[#cbfffc] placeholder-[#707777] outline-none font-mono transition-all"
            />
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredModules.map((mod) => {
            // Resolver ícone dinamicamente a partir de Lucide
            const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[mod.iconName] || Terminal;

            // Cores e estilos por tipo de tier
            const tierBadgeStyle = mod.tier === 'padrao'
              ? 'bg-[#00827c]/20 text-[#cbfffc] border-[#00827c]/40'
              : mod.tier === 'pro'
              ? 'bg-[#ffd166]/15 text-[#ffd166] border-[#ffd166]/40'
              : 'bg-[#00d2ff]/15 text-[#79fbf5] border-[#00d2ff]/40';

            const tierBorderHover = mod.tier === 'padrao'
              ? 'hover:border-[#00827c]'
              : mod.tier === 'pro'
              ? 'hover:border-[#ffd166]/70'
              : 'hover:border-[#00d2ff]/70';

            return (
              <div
                key={mod.id}
                id={`card-modulo-${mod.id}`}
                onClick={onSelectModule}
                className={`group rounded-[14px] bg-[#002422] border border-[#003734] ${tierBorderHover} p-4 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between cursor-pointer`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#003734] border border-[#00827c]/40 flex items-center justify-center text-[#cbfffc] group-hover:bg-[#00827c] group-hover:text-[#011d1c] transition-colors">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${tierBadgeStyle}`}>
                        {mod.tierLabel}
                      </span>
                      {mod.badge && mod.badge !== mod.tierLabel && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#011a19] text-[#bbc7c6] border border-[#003734]">
                          {mod.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-medium text-sm text-[#ffffff] group-hover:text-[#cbfffc] transition-colors">
                    {mod.name}
                  </h3>
                  
                  <p className="text-[11px] text-[#bbc7c6] mt-1.5 leading-snug line-clamp-2">
                    {mod.description}
                  </p>

                  <div className="mt-2 text-[10px] font-mono text-[#707777] bg-[#011a19]/60 px-2 py-1 rounded border border-[#003734]/50 flex items-center gap-1">
                    <span className="text-[#00827c]">Alvo:</span>
                    <span className="text-[#bbc7c6] truncate">{mod.inputHint}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#003734]/60 text-[10px] font-mono">
                  <span className="text-[#00d2ff]/80">{mod.commandOrId}</span>
                  <span className="text-[#cbfffc] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Consultar <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredModules.length === 0 && (
          <div className="text-center py-12 text-sm text-[#bbc7c6] font-mono">
            Nenhum módulo encontrado para o filtro informado.
          </div>
        )}

        {/* Footnote */}
        <div className="mt-10 text-center text-xs font-mono text-[#bbc7c6]/70 flex flex-wrap items-center justify-center gap-2">
          <span>▸ {counts.todos} módulos oficiais integrados:</span>
          <span className="text-[#cbfffc] font-semibold">{counts.padrao} Padrão</span>
          <span>•</span>
          <span className="text-[#ffd166] font-semibold">{counts.pro} Pro</span>
          <span>•</span>
          <span className="text-[#79fbf5] font-semibold">{counts.krex} Krex</span>
          <span>no terminal <strong className="text-[#ffffff]">Shazam Buscas</strong></span>
        </div>
      </div>
    </section>
  );
};
