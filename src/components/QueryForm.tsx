import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  Terminal, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  Bot
} from 'lucide-react';
import { QueryModuleInfo, QueryModuleType } from '../types';
import { applyInputMask, validateInput } from '../utils/masks';
import { getTelegramCommand } from '../utils/telegramCommandHelper';

interface QueryFormProps {
  moduleInfo: QueryModuleInfo;
  isLoading: boolean;
  onSearch: (moduleType: QueryModuleType, queryParam: string, isPro?: boolean) => void;
  isProMode?: boolean;
  onToggleProMode?: (isPro: boolean) => void;
  cooldownSeconds?: number;
}

export const QueryForm: React.FC<QueryFormProps> = ({
  moduleInfo,
  isLoading,
  onSearch,
  isProMode = false,
  onToggleProMode,
  cooldownSeconds = 0,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When module changes, reset input & errors
  useEffect(() => {
    setInputValue('');
    setErrorMessage(null);
  }, [moduleInfo.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const masked = applyInputMask(rawVal, moduleInfo.id);
    setInputValue(masked);
    if (errorMessage) setErrorMessage(null);
  };

  const handleLoadSample = () => {
    setInputValue(moduleInfo.defaultSample);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) {
      setErrorMessage(`Aguarde ${cooldownSeconds} segundo${cooldownSeconds !== 1 ? 's' : ''} para realizar uma nova consulta.`);
      return;
    }
    const validation = validateInput(inputValue, moduleInfo.id);
    if (!validation.isValid) {
      setErrorMessage(validation.message || 'Dado inválido para a consulta selecionada.');
      return;
    }
    setErrorMessage(null);
    onSearch(moduleInfo.id, inputValue.trim(), isProMode);
  };

  const currentPreview = inputValue ? getTelegramCommand(moduleInfo.id, inputValue) : null;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 rounded-[16px] bg-[#003734] border transition-all space-y-4 sm:space-y-6 ${
      isProMode 
        ? 'border-[#ffd166]/50 shadow-xl shadow-[#ffd166]/10 ring-1 ring-[#ffd166]/30' 
        : 'border-[#707777]/20'
    }`}>
      {/* Roteamento Engine Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-[10px] bg-[#011d1c] border border-[#003734]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onToggleProMode?.(false)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[6px] text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              !isProMode
                ? 'bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 shadow-sm'
                : 'text-[#707777] hover:text-[#bbc7c6]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${!isProMode ? 'bg-[#cbfffc]' : 'bg-[#707777]'}`} />
            <span>Telegram Bot</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleProMode?.(true)}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-[6px] text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isProMode
                ? 'bg-gradient-to-r from-[#ffd166] to-[#f59e0b] text-[#0f172a] shadow-md shadow-[#ffd166]/25 border border-[#fef08a]'
                : 'text-[#ffd166]/80 hover:text-[#ffd166] hover:bg-[#003734]/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SkynetbrDATA</span>
            <span className="text-[9px] bg-[#0f172a] text-[#ffd166] px-1 rounded font-mono">VIP</span>
          </button>
        </div>

        <div className="text-[11px] font-mono flex items-center gap-1.5 text-[#bbc7c6]">
          <span>Rota:</span>
          <code className={`px-2 py-0.5 rounded font-bold flex items-center gap-1.5 ${
            isProMode 
              ? 'bg-[#ffd166]/15 text-[#ffd166] border border-[#ffd166]/40' 
              : 'bg-[#003734] text-[#cbfffc] border border-[#00827c]/30'
          }`}>
            <Bot className="w-3 h-3" />
            <span>{isProMode ? 'SkynetbrDATA' : 'Base Padrão'}</span>
          </code>
        </div>
      </div>

      {/* Eyebrow & Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-[#edfffe] font-medium font-['DM_Sans',sans-serif]">
              TERMINAL INGESTION
            </span>
            <span className="text-[10px] text-[#bbc7c6] uppercase tracking-[0.1em]">
              / REALTIME DISPATCH
            </span>
            {isProMode && (
              <span className="text-[9px] sm:text-[10px] bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40 px-2 py-0.5 rounded font-mono font-bold">
                👑 MODO PRO ATIVO
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 sm:gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-3xl font-medium text-[#ffffff] tracking-[-0.03em] font-['DM_Sans',sans-serif]">
              {moduleInfo.title}
            </h2>
            {moduleInfo.subtitle && (
              <span className="text-sm sm:text-lg text-[#cbfffc] font-normal font-mono">
                {moduleInfo.subtitle}
              </span>
            )}
            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-[4px] bg-[#011d1c] border border-[#00827c]/40 text-[#ffd166] font-mono">
              {moduleInfo.badge}
            </span>
          </div>
        </div>

        {/* Action button to load sample */}
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-[6px] bg-[#011d1c] hover:bg-[#012624] text-[#edfffe] text-[11px] sm:text-[12px] uppercase tracking-[0.08em] font-medium transition-colors cursor-pointer border border-[#003734]"
        >
          <span>Exemplo Válido</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#cbfffc]" />
        </button>
      </div>

      {/* Banner Informativo de Cooldown (15 Segundos Obrigatórios) */}
      {cooldownSeconds > 0 && (
        <div className="p-3.5 sm:p-4 rounded-[12px] bg-[#011d1c] border border-[#ffd166]/50 text-[#ffd166] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-[#ffd166]/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#ffd166]/15 border border-[#ffd166]/40 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#ffd166] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-[#ffffff] font-['DM_Sans',sans-serif]">
                  Aguarde para Nova Consulta
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ffd166]/20 text-[#ffd166] font-mono font-bold">
                  INTERVALO DE 15S
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#bbc7c6] mt-0.5">
                Por favor, aguarde <strong className="text-[#ffd166] font-mono text-xs sm:text-sm">{cooldownSeconds} segundo{cooldownSeconds !== 1 ? 's' : ''}</strong> para realizar uma nova consulta.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-44 flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center justify-between w-full text-[11px] font-mono">
              <span className="text-[#bbc7c6]">Disponível em:</span>
              <span className="text-[#ffd166] font-bold text-sm">{cooldownSeconds}s</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#003734] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#ffd166] to-[#f59e0b] transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, ((15 - cooldownSeconds) / 15) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Query Search Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="relative">
          <input
            id="query-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={moduleInfo.placeholder.toUpperCase()}
            disabled={isLoading}
            className={`w-full bg-[#011d1c] border rounded-[8px] p-3.5 sm:p-5 pr-28 sm:pr-48 text-sm sm:text-xl font-mono tracking-wider transition-colors outline-none text-[#ffffff] placeholder:text-[#707777] ${
              errorMessage
                ? 'border-[#fde9ff] focus:border-[#fde9ff]'
                : isProMode
                ? 'border-[#ffd166]/50 focus:border-[#ffd166]'
                : 'border-[#003734] focus:border-[#cbfffc]'
            }`}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Signature CTA: Gradient Pill Button with Aurora Gradient (Cyan -> White -> Pink) */}
          <button
            type="submit"
            id="btn-submit-search"
            disabled={isLoading || !inputValue || cooldownSeconds > 0}
            title={
              cooldownSeconds > 0
                ? `Aguarde ${cooldownSeconds} segundos para realizar uma nova consulta.`
                : undefined
            }
            className={`absolute right-1.5 sm:right-2.5 top-1.5 sm:top-2.5 bottom-1.5 sm:bottom-2.5 px-3.5 sm:px-8 rounded-[6px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-xs sm:text-sm font-medium uppercase tracking-[0.08em] ${
              isLoading || !inputValue
                ? 'bg-[#003734] text-[#707777] cursor-not-allowed border border-[#707777]/20'
                : cooldownSeconds > 0
                ? 'bg-[#003734] border border-[#ffd166]/40 text-[#ffd166] cursor-not-allowed shadow-inner'
                : isProMode
                ? 'bg-gradient-to-r from-[#ffd166] via-[#f59e0b] to-[#d97706] hover:brightness-110 text-[#0f172a] font-bold shadow-md shadow-[#ffd166]/20 cursor-pointer'
                : 'bg-aurora-gradient text-[#012624] hover:opacity-90 cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-[#012624]" />
                <span className="hidden sm:inline">PROCESSANDO</span>
                <span className="sm:hidden text-[11px]">BUSCANDO</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffd166] animate-spin" />
                <span className="hidden sm:inline text-[#ffd166] font-mono">AGUARDE ({cooldownSeconds}s)</span>
                <span className="sm:hidden text-[11px] text-[#ffd166] font-mono">{cooldownSeconds}s</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{isProMode ? 'CONSULTAR PRO' : 'CONSULTAR'}</span>
                <span className="sm:hidden text-[11px] font-bold">{isProMode ? 'PRO' : 'BUSCAR'}</span>
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#012624]" />
              </>
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-[#fde9ff] bg-[#011d1c] border border-[#707777]/40 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[6px] font-mono">
            <AlertCircle className="w-4 h-4 text-[#fde9ff] flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Command Syntax Preview & Latency Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#bbc7c6] font-mono pt-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Terminal className="w-3.5 h-3.5 text-[#cbfffc] shrink-0" />
            <span className="uppercase text-[10px] sm:text-[11px] tracking-[0.08em] shrink-0">Comando:</span>
            <code className="text-[#edfffe] font-medium bg-[#011d1c] px-2 py-0.5 rounded-[4px] border border-[#003734] truncate max-w-[200px] sm:max-w-none text-[11px]">
              {currentPreview ? `${currentPreview.command} ${currentPreview.cleanParam}` : `${getTelegramCommand(moduleInfo.id, '').command} [ALVO]`}
            </code>
            <span className="text-[10px] text-[#707777] shrink-0">
              ➔ {isProMode ? 'SkynetbrDATA' : 'Base Padrão'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[#bbc7c6] text-[10px] sm:text-[11px] uppercase tracking-[0.08em]">
            <Clock className="w-3.5 h-3.5 text-[#707777] shrink-0" />
            <span>Latência:</span>
            <span className="text-[#edfffe] font-medium">~1.5s</span>
          </div>
        </div>
      </form>
    </div>
  );
};
