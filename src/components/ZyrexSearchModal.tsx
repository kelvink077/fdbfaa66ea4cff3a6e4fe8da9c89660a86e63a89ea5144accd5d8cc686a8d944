import React, { useState, useEffect } from 'react';
import {
  Zap,
  X,
  Search,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  Loader2,
  Bot,
  Radio,
  Clock,
  ExternalLink,
  FileDown,
  XCircle,
  FileText,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  ZYREX_MODULES_COL1,
  ZYREX_MODULES_COL2,
  ALL_ZYREX_MODULES,
  ZyrexModuleInfo,
} from '../utils/zyrexModulesData';
import { QueryRecord, QueryOption } from '../types';
import { UserProfileData, calculateAccountValidity } from '../lib/firebase';
import { getTelegramCommand } from '../utils/telegramCommandHelper';
import { OptionsSelectionCard } from './OptionsSelectionCard';

interface ZyrexSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfileData | null;
  onSearch: (moduleType: string, queryParam: string, isZyrex?: boolean) => Promise<void> | void;
  onRestartAndRetry?: (moduleType: string, queryParam: string, isZyrex?: boolean) => Promise<void> | void;
  isLoading: boolean;
  loadingStepText?: string;
  activeRecord?: QueryRecord | null;
  onOpenPricing: () => void;
  onOpenExpiredModal?: () => void;
  cooldownSeconds?: number;
  isAccountExpired?: boolean;
  activeOptionsData?: {
    requestId: string;
    prompt: string;
    queryParam: string;
    options: QueryOption[];
    selectedOption?: string;
  } | null;
  onSelectOption?: (optionText: string, rowIndex?: number, colIndex?: number) => void;
}

export const ZyrexSearchModal: React.FC<ZyrexSearchModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSearch,
  onRestartAndRetry,
  isLoading,
  loadingStepText,
  activeRecord,
  onOpenPricing,
  onOpenExpiredModal,
  cooldownSeconds = 0,
  isAccountExpired = false,
  activeOptionsData,
  onSelectOption,
}) => {
  const [selectedModule, setSelectedModule] = useState<ZyrexModuleInfo>(ZYREX_MODULES_COL1[0]);
  const [inputVal, setInputVal] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw' | 'txt'>('parsed');
  const [isDownloadingTxt, setIsDownloadingTxt] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(10);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);

  const isCurrentActive = Boolean(
    activeRecord && (
      Boolean(activeRecord.isZyrex) ||
      Boolean((activeRecord as any).isKrex) ||
      String(activeRecord.moduleType).toLowerCase().startsWith('zyrex') ||
      String(activeRecord.moduleType).toLowerCase().startsWith('krex') ||
      String(activeRecord.moduleType).toLowerCase().includes('zyrex') ||
      String(activeRecord.moduleType).toLowerCase().includes('krex') ||
      activeRecord.moduleType === 'cep' ||
      Boolean(inputVal.trim() && activeRecord.queryParam?.replace(/\D/g, '') === inputVal.trim().replace(/\D/g, '')) ||
      Boolean(activeRecord.rawResponse)
    )
  );

  const isErrorState = Boolean(
    isCurrentActive && (
      activeRecord?.status === 'error' ||
      activeRecord?.hasInternalError ||
      activeRecord?.needsRestart ||
      /erro interno|use \/start/i.test(activeRecord?.rawResponse || '') ||
      /erro interno|use \/start/i.test(activeRecord?.errorMessage || '') ||
      (activeRecord?.rawResponse?.trim() === '🔍 Consultando...' && !isLoading) ||
      (activeRecord?.rawResponse?.trim() === 'Consultando...' && !isLoading) ||
      (activeRecord?.rawResponse?.trim() === '🔎 Consultando...' && !isLoading)
    )
  );

  // Inicia contagem regressiva de 10 segundos quando detecta erro
  useEffect(() => {
    if (isErrorState) {
      setRetryCountdown(10);
      const timer = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setRetryCountdown(10);
    }
  }, [isErrorState, activeRecord?.id]);

  // Sincroniza abas quando novos dados chegam
  useEffect(() => {
    if (activeRecord) {
      if (activeRecord.txtContent) {
        setActiveTab('txt');
      } else {
        setActiveTab('parsed');
      }
    }
  }, [activeRecord?.id, activeRecord?.txtContent]);

  const handleSelectModule = (mod: ZyrexModuleInfo) => {
    setSelectedModule(mod);
    setInputVal('');
  };

  const handleFillSample = () => {
    if (selectedModule.suspended) return;
    setInputVal(selectedModule.defaultSample);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedModule.suspended) return;
    const val = e.target.value;
    if (selectedModule.id === 'zyrex_cpf' || selectedModule.id === 'zyrex_score' || selectedModule.id === 'zyrex_renda' || selectedModule.id === 'zyrex_poder_aquis') {
      setInputVal(val.replace(/\D/g, '').slice(0, 11));
    } else if (selectedModule.id === 'zyrex_cnpj') {
      setInputVal(val.replace(/\D/g, '').slice(0, 14));
    } else if (selectedModule.id === 'zyrex_telefone') {
      setInputVal(val.replace(/\D/g, '').slice(0, 11));
    } else if (selectedModule.id === 'zyrex_cep') {
      setInputVal(val.replace(/\D/g, '').slice(0, 8));
    } else if (selectedModule.id === 'zyrex_placa') {
      setInputVal(val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase());
    } else {
      setInputVal(val);
    }
  };

  const handleTriggerSearch = () => {
    if (selectedModule.suspended) return;
    if (!inputVal.trim() || isLoading) return;

    // Bloqueio mandatário para contas expiradas
    const validity = calculateAccountValidity(userProfile);
    const expired = isAccountExpired || validity.isExpired || !validity.isValid || userProfile?.planStatus === 'expired';
    if (expired) {
      if (onOpenExpiredModal) {
        onOpenExpiredModal();
      } else {
        onOpenPricing();
      }
      return;
    }

    if (cooldownSeconds > 0) return;
    onSearch(selectedModule.id, inputVal.trim(), true);
  };

  const handleRestartAndRetryClick = async () => {
    const targetQuery = activeRecord?.queryParam || inputVal.trim();
    if (!targetQuery) return;

    // Bloqueio mandatário para contas expiradas
    const validity = calculateAccountValidity(userProfile);
    const expired = isAccountExpired || validity.isExpired || !validity.isValid || userProfile?.planStatus === 'expired';
    if (expired) {
      if (onOpenExpiredModal) {
        onOpenExpiredModal();
      } else {
        onOpenPricing();
      }
      return;
    }

    setIsRestarting(true);
    try {
      if (onRestartAndRetry) {
        await onRestartAndRetry(selectedModule.id, targetQuery, true);
      } else {
        await fetch('/api/telegram/restart-and-retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleType: selectedModule.id,
            queryParam: targetQuery,
            isZyrex: true,
          }),
        });
        await onSearch(selectedModule.id, targetQuery, true);
      }
    } catch (err) {
      console.error('Falha ao reiniciar robô com /start:', err);
    } finally {
      setIsRestarting(false);
    }
  };

  const handleCopyReport = () => {
    if (!activeRecord?.rawResponse) return;
    navigator.clipboard.writeText(activeRecord.rawResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!activeRecord?.txtContent && !activeRecord?.rawResponse) return;
    setIsDownloadingTxt(true);
    try {
      const content = activeRecord.txtContent || activeRecord.rawResponse || '';
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeRecord.txtFileName || `zyrex_${activeRecord.moduleType}_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao baixar TXT:', e);
    } finally {
      setIsDownloadingTxt(false);
    }
  };

  if (!isOpen) return null;

  const currentPreview = inputVal.trim() 
    ? getTelegramCommand(selectedModule.id, inputVal.trim())
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        id="zyrex-search-modal-card"
        className="bg-[#02181b] border-2 border-[#00d2ff]/40 rounded-[20px] w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl shadow-[#00d2ff]/15 text-[#edfffe] overflow-hidden my-auto"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#002b33] via-[#011d1c] to-[#02181b] border-b border-[#00d2ff]/25 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#00d2ff] via-[#3a7bd5] to-[#00f2fe] flex items-center justify-center shadow-lg shadow-[#00d2ff]/25 text-[#011d1c]">
              <Zap className="w-6 h-6 fill-[#011d1c]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black font-['DM_Sans',sans-serif] uppercase tracking-wide bg-gradient-to-r from-[#79fbf5] via-[#00d2ff] to-[#ffffff] bg-clip-text text-transparent">
                  BUSCAS KREX
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#00d2ff]/20 text-[#79fbf5] border border-[#00d2ff]/50 font-mono text-[10px] font-bold tracking-wider flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  @ZyrexBuscasBot
                </span>
                <span className="px-2 py-0.5 rounded bg-[#012624] text-[#cbfffc] border border-[#003734] font-mono text-[9px]">
                  ROTA DEDICADA
                </span>
              </div>
              <p className="text-xs text-[#9bb0af] font-mono mt-0.5">
                Barramento integrado com encaminhamento direto para <strong className="text-[#79fbf5]">@ZyrexBuscasBot</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#003734] hover:bg-[#004d49] text-[#bbc7c6] hover:text-[#ffffff] transition-colors cursor-pointer border border-[#00827c]/40"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two Columns on Large Screens */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Selector Panel (22 Buttons arranged in 2 columns exactly as in image) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#79fbf5] font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#00d2ff] animate-pulse" />
                Módulos de Busca KREX ({ALL_ZYREX_MODULES.length})
              </span>
              <span className="text-[10px] font-mono text-[#bbc7c6]">
                Destino: KREX
              </span>
            </div>

            {/* 2-Column Button Grid matching the user's uploaded image exactly */}
            <div className="bg-[#011417] p-3 rounded-xl border border-[#003734] grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto">
              
              {/* Coluna 1 da imagem */}
              <div className="flex flex-col gap-2">
                {ZYREX_MODULES_COL1.filter((mod) => !mod.hidden).map((mod) => {
                  const isSelected = selectedModule.id === mod.id;
                  const isSuspended = Boolean(mod.suspended || mod.isDevelopment);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectModule(mod)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex flex-col items-center justify-center text-center select-none shadow-sm ${
                        isSuspended
                          ? isSelected
                            ? 'bg-[#261e0c] text-[#ffd166] border-2 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                            : 'bg-[#141a18] hover:bg-[#1c2421] text-[#ffd166] border border-amber-500/50 hover:border-amber-400'
                          : isSelected
                          ? 'bg-gradient-to-r from-[#00d2ff] to-[#00827c] text-[#011d1c] font-bold shadow-md shadow-[#00d2ff]/20 border border-[#79fbf5] scale-[1.02]'
                          : 'bg-[#0a2328] hover:bg-[#0e3037] text-[#edfffe] border border-[#003734] hover:border-[#00827c]/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>{mod.title}</span>
                        {isSuspended && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      {isSuspended && (
                        <span className="text-[8.5px] font-mono uppercase tracking-wider text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/40 mt-1">
                          Em desenvolvimento
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Coluna 2 da imagem */}
              <div className="flex flex-col gap-2">
                {ZYREX_MODULES_COL2.filter((mod) => !mod.hidden).map((mod) => {
                  const isSelected = selectedModule.id === mod.id;
                  const isSuspended = Boolean(mod.suspended || mod.isDevelopment);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectModule(mod)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex flex-col items-center justify-center text-center select-none shadow-sm ${
                        isSuspended
                          ? isSelected
                            ? 'bg-[#261e0c] text-[#ffd166] border-2 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                            : 'bg-[#141a18] hover:bg-[#1c2421] text-[#ffd166] border border-amber-500/50 hover:border-amber-400'
                          : isSelected
                          ? 'bg-gradient-to-r from-[#00d2ff] to-[#00827c] text-[#011d1c] font-bold shadow-md shadow-[#00d2ff]/20 border border-[#79fbf5] scale-[1.02]'
                          : 'bg-[#0a2328] hover:bg-[#0e3037] text-[#edfffe] border border-[#003734] hover:border-[#00827c]/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>{mod.title}</span>
                        {isSuspended && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      {isSuspended && (
                        <span className="text-[8.5px] font-mono uppercase tracking-wider text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/40 mt-1">
                          Em desenvolvimento
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Module Info Card */}
            <div className={`p-3.5 rounded-xl flex items-center justify-between gap-3 ${
              selectedModule.suspended
                ? 'bg-amber-950/30 border border-amber-500/40'
                : 'bg-[#002b33]/60 border border-[#00d2ff]/30'
            }`}>
              <div>
                <span className={`text-[10px] font-mono uppercase block ${
                  selectedModule.suspended ? 'text-amber-400 font-bold flex items-center gap-1' : 'text-[#79fbf5]'
                }`}>
                  {selectedModule.suspended ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Módulo Suspenso (Em desenvolvimento)
                    </>
                  ) : (
                    'Módulo Selecionado'
                  )}
                </span>
                <span className="text-sm font-bold text-[#ffffff]">{selectedModule.title} ({selectedModule.command})</span>
                <p className={`text-[11px] mt-0.5 ${selectedModule.suspended ? 'text-amber-200' : 'text-[#9bb0af]'}`}>
                  {selectedModule.inputHelper}
                </p>
              </div>
              {!selectedModule.suspended && (
                <button
                  onClick={handleFillSample}
                  className="px-2.5 py-1.5 rounded bg-[#011d1c] hover:bg-[#003734] border border-[#00827c]/50 text-[#79fbf5] text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
                  title="Inserir dado de teste rápido"
                >
                  Inserir Exemplo
                </button>
              )}
            </div>
          </div>

          {/* Right / Input & Live Terminal Results Panel */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Input & Action Bar */}
            <div className="bg-[#01191d] border border-[#003734] p-4 sm:p-5 rounded-xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-[#cbfffc] font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#00d2ff]" />
                  {selectedModule.inputLabel}
                </label>
                <span className="text-[11px] font-mono text-[#9bb0af]">
                  Rota: <strong className="text-[#00d2ff]">KREX</strong>
                </span>
              </div>

              {/* Banner Informativo se o módulo estiver suspenso / em desenvolvimento */}
              {selectedModule.suspended && (
                <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 flex items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300 block text-xs">
                        Módulo {selectedModule.title} Suspenso
                      </span>
                      <span className="text-amber-100/85 text-[11px] font-mono">
                        Este módulo encontra-se em desenvolvimento e temporariamente suspenso para manutenção das bases.
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase whitespace-nowrap border border-amber-500/40">
                    Em desenvolvimento
                  </span>
                </div>
              )}

              {/* Banner Informativo de Cooldown (15s Obrigatórios) */}
              {cooldownSeconds > 0 && (
                <div className="p-3 rounded-[8px] bg-[#02181b] border border-[#ffd166]/40 text-[#ffd166] flex items-center justify-between gap-2 shadow-md animate-in fade-in duration-200 mb-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-[#ffd166] animate-pulse shrink-0" />
                    <span>
                      Aguarde <strong className="font-mono text-[#ffffff]">{cooldownSeconds}s</strong> para realizar uma nova consulta.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffd166]/20 font-bold">
                    {cooldownSeconds}s
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#79fbf5]" />
                  <input
                    type="text"
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleTriggerSearch()}
                    placeholder={selectedModule.suspended ? 'Módulo temporariamente suspenso (Em desenvolvimento)' : selectedModule.placeholder}
                    disabled={isLoading || Boolean(selectedModule.suspended)}
                    className={`w-full pl-10 pr-4 py-3 bg-[#02181b] border rounded-lg text-sm font-mono transition-all ${
                      selectedModule.suspended
                        ? 'border-amber-500/40 text-amber-300/60 placeholder:text-amber-500/40 cursor-not-allowed bg-[#0b1315]'
                        : 'border-[#003734] focus:border-[#00d2ff] text-[#ffffff] placeholder:text-[#456365] focus:outline-none focus:ring-1 focus:ring-[#00d2ff]'
                    }`}
                  />
                </div>
                <button
                  onClick={handleTriggerSearch}
                  disabled={isLoading || !inputVal.trim() || cooldownSeconds > 0 || Boolean(selectedModule.suspended)}
                  title={
                    selectedModule.suspended
                      ? 'Módulo temporariamente suspenso em desenvolvimento'
                      : cooldownSeconds > 0
                      ? `Aguarde ${cooldownSeconds}s para nova consulta.`
                      : undefined
                  }
                  className={`px-6 py-3 font-extrabold font-mono text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    selectedModule.suspended
                      ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300/80 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#00d2ff] via-[#00827c] to-[#00d2ff] hover:opacity-95 text-[#011d1c] cursor-pointer shadow-[#00d2ff]/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]'
                  }`}
                >
                  {selectedModule.suspended ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Em Desenvolvimento</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#011d1c]" />
                      <span>Processando...</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin text-[#011d1c]" />
                      <span>Aguarde ({cooldownSeconds}s)</span>
                    </>
                  ) : (
                    <>
                      <span>Consultar KREX</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Command preview */}
              <div className="flex items-center justify-between text-[11px] font-mono text-[#bbc7c6] pt-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[#707777]">Comando formatado:</span>
                  <code className="text-[#79fbf5] bg-[#02181b] px-2 py-0.5 rounded border border-[#003734]">
                    {currentPreview ? currentPreview.fullMessage : `${selectedModule.command} [ALVO]`}
                  </code>
                </div>
                <span className="text-[#00d2ff] font-semibold whitespace-nowrap">
                  ➔ KREX
                </span>
              </div>
            </div>

            {/* Results Viewer */}
            <div className="flex-1 bg-[#011417] border border-[#003734] rounded-xl flex flex-col overflow-hidden min-h-[350px]">
              {/* Tab Header */}
              <div className="px-4 py-2.5 bg-[#002227] border-b border-[#003734] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('parsed')}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                      activeTab === 'parsed'
                        ? 'bg-[#00d2ff] text-[#011d1c] font-bold'
                        : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
                    }`}
                  >
                    Dossiê Estruturado
                  </button>
                  <button
                    id="krex-tab-raw-response-btn"
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                      activeTab === 'raw'
                        ? 'bg-[#00d2ff] text-[#011d1c] font-bold'
                        : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
                    }`}
                  >
                    Resposta Servidor (Raw)
                  </button>
                  {isCurrentActive && activeRecord?.txtContent && (
                    <button
                      onClick={() => setActiveTab('txt')}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        activeTab === 'txt'
                          ? 'bg-[#00d2ff] text-[#011d1c] font-bold'
                          : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Arquivo TXT
                    </button>
                  )}
                </div>

                {isCurrentActive && activeRecord?.rawResponse && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyReport}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#003734] hover:bg-[#004d49] text-[#79fbf5] text-[11px] font-mono rounded cursor-pointer transition-colors border border-[#00827c]/40"
                      title="Copiar relatório completo"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <button
                      onClick={handleDownloadTxt}
                      disabled={isDownloadingTxt}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#003734] hover:bg-[#004d49] text-[#cbfffc] text-[11px] font-mono rounded cursor-pointer transition-colors border border-[#00827c]/40"
                      title="Baixar em formato TXT"
                    >
                      <FileDown className="w-3 h-3" />
                      <span>Baixar TXT</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs max-h-[380px]">
                {isLoading ? (
                  activeOptionsData && activeOptionsData.options.length > 0 && onSelectOption ? (
                    <OptionsSelectionCard
                      requestId={activeOptionsData.requestId}
                      promptText={activeOptionsData.prompt}
                      queryParam={activeOptionsData.queryParam || inputVal}
                      moduleType={selectedModule.id}
                      options={activeOptionsData.options}
                      selectedOption={activeOptionsData.selectedOption}
                      onSelectOption={onSelectOption}
                      autoSelectCountdownSeconds={25}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <Loader2 className="w-9 h-9 animate-spin text-[#00d2ff]" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#ffffff] font-['DM_Sans',sans-serif]">
                          Processando Consulta no KREX
                        </p>
                        <p className="text-xs text-[#79fbf5] font-mono">
                          {loadingStepText || `Disparando comando ${selectedModule.command} para KREX ➔ Aguardando base...`}
                        </p>
                      </div>
                    </div>
                  )
                ) : isCurrentActive && (activeRecord?.rawResponse || isErrorState) ? (
                  isErrorState ? (
                    <div className="space-y-4 text-[#edfffe]">
                      {/* Target Header */}
                      <div className="p-3 bg-[#18080a] rounded-lg border border-[#ff4757]/40 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#ff808f] block font-mono">ALVO DA BUSCA KREX</span>
                          <span className="text-base font-bold text-[#ffffff]">{activeRecord?.queryParam || inputVal}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-[#ff4757]/20 border border-[#ff4757]/60 text-[#ff6b81] text-[10px] rounded font-bold font-mono uppercase tracking-wide flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-[#ff4757]" />
                          ERRO NO SERVIDOR
                        </span>
                      </div>

                      {/* Prominent Error Notice Banner as requested */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-[#2a0b10] via-[#1f070b] to-[#2a0b10] border-2 border-[#ff4757] shadow-lg shadow-[#ff4757]/20 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-lg bg-[#ff4757]/25 border border-[#ff4757]/50 text-[#ff6b81] shrink-0">
                            <AlertTriangle className="w-6 h-6 animate-pulse text-[#ff4757]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-[#ffffff] font-['DM_Sans',sans-serif] leading-tight">
                              O servidor retornou erro, por favor tente novamente em 10 segundos
                            </h4>
                            <p className="text-xs text-[#ffc2c2] mt-1 font-mono leading-relaxed">
                              O robô KREX reportou instabilidade ou erro interno. Pressione o botão abaixo para enviar o comando <code className="text-[#ffd166] bg-[#000000]/60 px-1.5 py-0.5 rounded">/start</code>, restaurar a sessão e continuar a pesquisa automaticamente.
                            </p>
                          </div>
                        </div>

                        {/* Telegram Raw Response snippet */}
                        {activeRecord?.rawResponse && (
                          <div className="p-3 bg-[#110507] rounded-lg border border-[#ff4757]/30 text-xs font-mono text-[#ff99a8] whitespace-pre-wrap">
                            <span className="text-[#888888] text-[10px] block mb-1 uppercase font-semibold">Resposta da Central de Dados:</span>
                            {activeRecord.rawResponse}
                          </div>
                        )}

                        {/* Action Bar with Countdown and /start Retry Button */}
                        <div className="pt-3 border-t border-[#ff4757]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <Clock className="w-4 h-4 text-[#ffd166]" />
                            <span className="text-[#ffd166]">
                              {retryCountdown > 0 ? (
                                <>Aguarde: <strong className="text-white text-sm bg-[#ff4757]/30 px-1.5 py-0.5 rounded border border-[#ff4757]/50">{retryCountdown}s</strong> para tentar novamente</>
                              ) : (
                                <span className="text-emerald-400 font-bold">✓ Intervalo concluído. Pronto para reconectar e buscar!</span>
                              )}
                            </span>
                          </div>

                          <button
                            onClick={handleRestartAndRetryClick}
                            disabled={isLoading || isRestarting}
                            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-[#ff4757] via-[#ff6b81] to-[#00d2ff] hover:opacity-95 text-[#ffffff] font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#ff4757]/30 cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Chamar /start para atualizar o robô e continuar com a busca"
                          >
                            {isRestarting || isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>Chamando /start &amp; Continuando Busca...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 text-white animate-spin-slow" />
                                <span>
                                  {retryCountdown > 0 
                                    ? `Tentar novamente com /start (${retryCountdown}s)` 
                                    : 'Tentar novamente com /start'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'raw' ? (
                    <div className="space-y-3">
                      <pre className="text-[#cbfffc] whitespace-pre-wrap leading-relaxed font-mono">
                        {activeRecord.rawResponse}
                      </pre>
                    </div>
                  ) : activeTab === 'txt' && activeRecord.txtContent ? (
                    <div className="space-y-3">
                      <pre className="text-[#a4e5e0] whitespace-pre-wrap leading-relaxed font-mono bg-[#02181b] p-3 rounded border border-[#003734]">
                        {activeRecord.txtContent}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-4 text-[#edfffe]">
                      <div className="p-3 bg-[#02181b] rounded-lg border border-[#00d2ff]/30 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#79fbf5] block">ALVO DA BUSCA KREX</span>
                          <span className="text-base font-bold text-[#ffffff]">{activeRecord.queryParam}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#00d2ff]/20 border border-[#00d2ff]/50 text-[#79fbf5] text-[10px] rounded font-bold">
                          CONCLUÍDO
                        </span>
                      </div>
                      <pre className="text-[#d8f8f6] whitespace-pre-wrap leading-relaxed font-mono bg-[#02181b]/70 p-4 rounded-lg border border-[#003734]">
                        {activeRecord.rawResponse}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center text-[#707777] space-y-2">
                    <Bot className="w-10 h-10 text-[#003734]" />
                    <p className="text-sm font-['DM_Sans',sans-serif] text-[#bbc7c6]">
                      Nenhuma consulta KREX ativa no momento
                    </p>
                    <p className="text-xs max-w-sm text-[#456365]">
                      Selecione um dos 22 módulos à esquerda, informe o dado do alvo e clique em <strong>Consultar KREX</strong>. As mensagens serão roteadas exclusivamente para <strong>@ZyrexBuscasBot</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer info notice */}
        <div className="px-6 py-3 bg-[#011417] border-t border-[#003734] flex items-center justify-between text-xs text-[#bbc7c6]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse"></span>
            <span className="font-mono text-[11px]">
              banco de dados KREX
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#00d2ff] hidden sm:inline">
            CLUSTER BRDATA / KREX HIGH-SPEED
          </span>
        </div>
      </div>
    </div>
  );
};

export const KrexSearchModal = ZyrexSearchModal;
export type KrexSearchModalProps = ZyrexSearchModalProps;
