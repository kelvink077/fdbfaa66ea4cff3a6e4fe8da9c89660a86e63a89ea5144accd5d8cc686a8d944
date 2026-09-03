import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  Terminal,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { QueryModuleInfo, QueryModuleType } from '../types';
import { applyInputMask, validateInput } from '../utils/masks';
import { getTelegramCommand } from '../utils/telegramCommandHelper';

interface QueryFormProps {
  moduleInfo: QueryModuleInfo;
  isLoading: boolean;
  onSearch: (moduleType: QueryModuleType, queryParam: string) => void;
}

export const QueryForm: React.FC<QueryFormProps> = ({
  moduleInfo,
  isLoading,
  onSearch,
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
    const validation = validateInput(inputValue, moduleInfo.id);
    if (!validation.isValid) {
      setErrorMessage(validation.message || 'Dado inválido para a consulta selecionada.');
      return;
    }
    setErrorMessage(null);
    onSearch(moduleInfo.id, inputValue.trim());
  };

  const currentPreview = inputValue ? getTelegramCommand(moduleInfo.id, inputValue) : null;

  return (
    <div className="p-8 rounded-[16px] bg-[#003734] border border-[#707777]/20 space-y-6">
      {/* Eyebrow & Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.15em] text-[#edfffe] font-medium font-['DM_Sans',sans-serif]">
              TERMINAL INGESTION
            </span>
            <span className="text-[10px] text-[#bbc7c6] uppercase tracking-[0.1em]">
              / REALTIME DISPATCH
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-[-0.03em] font-['DM_Sans',sans-serif]">
              {moduleInfo.title}
            </h2>
            {moduleInfo.subtitle && (
              <span className="text-base sm:text-lg text-[#cbfffc] font-normal font-mono">
                {moduleInfo.subtitle}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-[4px] bg-[#011d1c] border border-[#00827c]/40 text-[#ffd166] font-mono">
              {moduleInfo.badge}
            </span>
          </div>
        </div>

        {/* Action button to load sample */}
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-[6px] bg-[#011d1c] hover:bg-[#012624] text-[#edfffe] text-[12px] uppercase tracking-[0.08em] font-medium transition-colors cursor-pointer border border-[#003734]"
        >
          <span>Exemplo Válido</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#cbfffc]" />
        </button>
      </div>

      {/* Query Search Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            id="query-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={moduleInfo.placeholder.toUpperCase()}
            disabled={isLoading}
            className={`w-full bg-[#011d1c] border rounded-[6px] p-4 sm:p-5 pr-36 sm:pr-48 text-base sm:text-xl font-mono tracking-wider transition-colors outline-none text-[#ffffff] placeholder:text-[#707777] ${
              errorMessage
                ? 'border-[#fde9ff] focus:border-[#fde9ff]'
                : 'border-[#003734] focus:border-[#cbfffc]'
            }`}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Signature CTA: Gradient Pill Button with Aurora Gradient (Cyan -> White -> Pink) */}
          <button
            type="submit"
            id="btn-submit-search"
            disabled={isLoading || !inputValue}
            className={`absolute right-2 sm:right-2.5 top-2 sm:top-2.5 bottom-2 sm:bottom-2.5 px-5 sm:px-8 rounded-[6px] flex items-center justify-center gap-2 transition-opacity text-xs sm:text-sm font-medium uppercase tracking-[0.08em] cursor-pointer ${
              isLoading || !inputValue
                ? 'bg-[#003734] text-[#707777] cursor-not-allowed border border-[#707777]/20'
                : 'bg-aurora-gradient text-[#012624] hover:opacity-90'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#012624]" />
                <span className="hidden sm:inline">PROCESSANDO</span>
              </>
            ) : (
              <>
                <span>CONSULTAR</span>
                <Search className="w-4 h-4 text-[#012624]" />
              </>
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-[#fde9ff] bg-[#011d1c] border border-[#707777]/40 px-4 py-3 rounded-[6px] font-mono">
            <AlertCircle className="w-4 h-4 text-[#fde9ff] flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Command Syntax Preview & Latency Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#bbc7c6] font-mono pt-1">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span className="uppercase text-[11px] tracking-[0.08em]">Comando:</span>
            <code className="text-[#edfffe] font-medium bg-[#011d1c] px-2.5 py-1 rounded-[6px] border border-[#003734]">
              {currentPreview ? `${currentPreview.command} ${currentPreview.cleanParam}` : `${getTelegramCommand(moduleInfo.id, '').command} [ALVO]`}
            </code>
          </div>

          <div className="flex items-center gap-2 text-[#bbc7c6] text-[11px] uppercase tracking-[0.08em]">
            <Clock className="w-3.5 h-3.5 text-[#707777]" />
            <span>Latência Est.:</span>
            <span className="text-[#edfffe] font-medium">~1.5s</span>
          </div>
        </div>
      </form>
    </div>
  );
};
