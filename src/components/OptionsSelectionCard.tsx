import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  ShieldAlert, 
  Radio, 
  ExternalLink,
  ChevronRight,
  Server
} from 'lucide-react';
import { QueryOption } from '../types';

interface OptionsSelectionCardProps {
  requestId: string;
  promptText?: string;
  queryParam: string;
  moduleType?: string;
  options: QueryOption[];
  onSelectOption: (optionText: string, rowIndex?: number, colIndex?: number) => void;
  isLoading?: boolean;
  selectedOption?: string;
  autoSelectCountdownSeconds?: number;
}

export const OptionsSelectionCard: React.FC<OptionsSelectionCardProps> = ({
  requestId,
  promptText,
  queryParam,
  moduleType,
  options,
  onSelectOption,
  isLoading = false,
  selectedOption,
  autoSelectCountdownSeconds = 25,
}) => {
  const [activeSelection, setActiveSelection] = useState<string | null>(selectedOption || null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(autoSelectCountdownSeconds);

  // Contagem regressiva para auto-seleção padrão caso o usuário não clique
  useEffect(() => {
    if (activeSelection || isLoading) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto seleciona a primeira opção recomendada (ex: CREDILINK ou a primeira)
          const defaultOpt = options.find((o) => /credilink|nacional|serpro|krex|zyrex/i.test(o.text)) || options[0];
          if (defaultOpt) {
            handleChoose(defaultOpt.text, defaultOpt.rowIndex, defaultOpt.colIndex);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [options, activeSelection, isLoading]);

  const handleChoose = (text: string, rowIndex?: number, colIndex?: number) => {
    setActiveSelection(text);
    onSelectOption(text, rowIndex, colIndex);
  };

  const getOptionBadge = (text: string) => {
    const t = text.toUpperCase();
    if (t.includes('CREDILINK')) return { label: 'Recomendada', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (t.includes('KREX') || t.includes('ZYREX')) return { label: 'Big Data', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    if (t.includes('SI-PNI') || t.includes('SIPNI')) return { label: 'SUS / Vacinas', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    if (t.includes('CARTÓRIO') || t.includes('CARTORIO')) return { label: 'Registros Civis', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    if (t.includes('DEVIL')) return { label: 'Complementar', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    if (t.includes('NACIONAL')) return { label: 'Base Oficial', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (t.includes('RADAR') || t.includes('CORTÉX')) return { label: 'OCR Rodovias', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    if (t.includes('SERPRO')) return { label: 'Governo Federal', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    return { label: 'Base Oficial', color: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
  };

  const getOptionDescription = (text: string) => {
    const t = text.toUpperCase();
    if (t.includes('CREDILINK')) return 'Dossiê cadastral completo: telefones, endereços, filiação e situação cadastral.';
    if (t.includes('KREX') || t.includes('ZYREX')) return 'Big Data KREX: histórico profissional, empresas vinculadas e score.';
    if (t.includes('SI-PNI') || t.includes('SIPNI')) return 'Base Nacional de Imunização e registros de atendimento do SUS.';
    if (t.includes('CARTÓRIO') || t.includes('CARTORIO')) return 'Registros de nascimento, casamento, certidões públicas e óbitos.';
    if (t.includes('DEVIL')) return 'Base cadastral alternativa com contatos atualizados e vínculos.';
    if (t.includes('NACIONAL')) return 'Base oficial do Denatran com chassi, renavam, proprietário e multas.';
    if (t.includes('RADAR')) return 'Câmeras OCR e histórico de passagens em rodovias estaduais e federais.';
    return 'Consulta em tempo real através da base de dados do bot Telegram.';
  };

  return (
    <div 
      id="options-selection-panel"
      className="p-6 sm:p-8 rounded-[16px] bg-[#003734] border-2 border-[#79fbf5]/40 shadow-2xl space-y-6 relative overflow-hidden animate-fadeIn"
    >
      {/* Background glow visual */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#00d2ff]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#707777]/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#012624] border border-[#79fbf5]/40 flex items-center justify-center text-[#79fbf5] shadow-inner shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#79fbf5] font-semibold">
                Menu de Seleção Detectado
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#011d1c] text-[#bbc7c6] border border-[#707777]/20">
                {options.length} BASES DISPONÍVEIS
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#ffffff] font-['DM_Sans',sans-serif] tracking-tight">
              Selecione a Base de Consulta Desejada
            </h3>
          </div>
        </div>

        {/* Target and countdown */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-lg bg-[#012624] border border-[#707777]/30 text-right">
            <span className="text-[10px] font-mono text-[#bbc7c6] block">ALVO:</span>
            <span className="text-xs font-mono font-bold text-[#cbfffc]">{queryParam}</span>
          </div>

          {!activeSelection && secondsRemaining > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#012624]/80 border border-[#79fbf5]/20 text-xs text-[#79fbf5] font-mono">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{secondsRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Prompt message from the bot */}
      <div className="p-3.5 rounded-xl bg-[#012624]/90 border border-[#707777]/20 flex items-start gap-3 text-xs font-mono text-[#bbc7c6]">
        <Radio className="w-4 h-4 text-[#79fbf5] shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="text-[#cbfffc] font-semibold">Mensagem do Bot: </span>
          <span className="text-[#edfffe]">{promptText || '📋 Clique em um botão abaixo para selecionar a base de dados:'}</span>
        </div>
      </div>

      {/* Grid of Interactive Buttons matching Telegram keyboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((opt, idx) => {
          const badge = getOptionBadge(opt.text);
          const desc = getOptionDescription(opt.text);
          const isSelected = activeSelection === opt.text;
          const isPrimary = /credilink|nacional|serpro|krex|zyrex/i.test(opt.text);

          return (
            <button
              key={`${opt.text}-${idx}`}
              type="button"
              disabled={isLoading && !isSelected}
              onClick={() => handleChoose(opt.text, opt.rowIndex, opt.colIndex)}
              className={`p-4 rounded-xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group border ${
                isSelected
                  ? 'bg-gradient-to-br from-[#01353a] to-[#014e4b] border-[#79fbf5] shadow-lg shadow-[#00d2ff]/20 scale-[1.02]'
                  : isPrimary
                  ? 'bg-[#012a2a] hover:bg-[#013838] border-[#79fbf5]/30 hover:border-[#79fbf5]/60 hover:shadow-md'
                  : 'bg-[#012222] hover:bg-[#012e2e] border-[#707777]/20 hover:border-[#707777]/40'
              } ${isLoading && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badge.color}`}>
                    {badge.label}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#79fbf5] font-bold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Consultando...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Server className={`w-4 h-4 ${isSelected ? 'text-[#79fbf5]' : 'text-[#bbc7c6]'}`} />
                  <h4 className="text-base font-bold text-[#ffffff] font-['DM_Sans',sans-serif] tracking-wide">
                    {opt.text}
                  </h4>
                </div>

                <p className="text-[11px] text-[#bbc7c6] mt-1.5 leading-relaxed">
                  {desc}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#707777]/10 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#707777] group-hover:text-[#cbfffc] transition-colors">
                  Clique para selecionar
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${
                  isSelected ? 'text-[#79fbf5]' : 'text-[#707777]'
                }`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress / Selected status feedback */}
      {activeSelection && (
        <div className="p-3.5 rounded-xl bg-[#011d1c] border border-[#79fbf5]/40 flex items-center justify-between text-xs font-mono text-[#cbfffc] animate-fadeIn">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#79fbf5]" />
            <span>
              Base <strong>{activeSelection}</strong> selecionada. Disparando callback no Telegram e aguardando retorno dos dados...
            </span>
          </div>
          <span className="text-[10px] text-[#707777] uppercase">Aguardando resposta do Bot</span>
        </div>
      )}
    </div>
  );
};
