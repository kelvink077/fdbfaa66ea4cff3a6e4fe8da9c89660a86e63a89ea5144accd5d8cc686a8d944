import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Search,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  Loader2,
  Crown,
  Radio,
  Clock,
  ExternalLink,
  UserCheck,
  PhoneCall,
  Users,
  Mail,
  MapPin,
  Compass,
  Building2,
  Vote,
  HeartHandshake,
  Camera,
  CarFront,
  Zap,
  FileDown,
  XCircle,
  FileText,
} from 'lucide-react';
import { PRO_MODULES, ProModuleInfo } from '../utils/proModulesData';
import { QueryModuleType, QueryRecord } from '../types';
import { UserProfileData } from '../lib/firebase';
import { formatCpf, formatCnpj, formatPhone, formatPlaca } from '../utils/telegramCommandHelper';

interface ProSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfileData | null;
  onSearch: (moduleType: QueryModuleType, queryParam: string, isPro?: boolean) => Promise<void> | void;
  isLoading: boolean;
  loadingStepText?: string;
  activeRecord?: QueryRecord | null;
  onOpenPricing: () => void;
}

export const ProSearchModal: React.FC<ProSearchModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSearch,
  isLoading,
  loadingStepText,
  activeRecord,
  onOpenPricing,
}) => {
  const defaultAvailableModule = PRO_MODULES.find((m) => !m.inDevelopment) || PRO_MODULES[1] || PRO_MODULES[0];
  const [selectedModule, setSelectedModule] = useState<ProModuleInfo>(defaultAvailableModule);
  const [inputVal, setInputVal] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw' | 'txt' | 'photo'>('parsed');
  const [isDownloadingTxt, setIsDownloadingTxt] = useState<boolean>(false);
  const [isFetchingPhoto, setIsFetchingPhoto] = useState<boolean>(false);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  // Auto switch tab if photo is received or query is pro_foto
  useEffect(() => {
    if (activeRecord) {
      if (activeRecord.photoUrl || (activeRecord.photos && activeRecord.photos.length > 0)) {
        if (activeRecord.moduleType === 'pro_foto' || !activeRecord.txtContent) {
          setActiveTab('photo');
        }
      } else if (activeRecord.txtContent) {
        setActiveTab('txt');
      } else {
        setActiveTab('parsed');
      }
    }
  }, [activeRecord?.id, activeRecord?.photoUrl, activeRecord?.txtContent]);

  // Set default sample when switching module if input is empty
  const handleSelectModule = (mod: ProModuleInfo) => {
    if (mod.inDevelopment) return;
    setSelectedModule(mod);
    setInputVal('');
  };

  const handleFillSample = () => {
    setInputVal(selectedModule.defaultSample);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (selectedModule.id === 'pro_cpf' || selectedModule.id === 'pro_foto') {
      setInputVal(val.replace(/\D/g, '').slice(0, 11));
    } else if (selectedModule.id === 'pro_cnpj') {
      setInputVal(val.replace(/\D/g, '').slice(0, 14));
    } else if (selectedModule.id === 'pro_telefone') {
      setInputVal(val.replace(/\D/g, '').slice(0, 11));
    } else if (selectedModule.id === 'pro_cep') {
      setInputVal(val.replace(/\D/g, '').slice(0, 8));
    } else if (selectedModule.id === 'pro_titulo') {
      setInputVal(val.replace(/\D/g, '').slice(0, 12));
    } else if (selectedModule.id === 'pro_placa') {
      setInputVal(val.toUpperCase().replace(/[^a-zA-Z0-9]/g, '').slice(0, 7));
    } else {
      setInputVal(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query || isLoading || selectedModule.inDevelopment) return;

    // Quota check
    if (userProfile?.plan === 'trial' && (userProfile.consultasRestantes || 0) <= 0) {
      onOpenPricing();
      return;
    }

    onSearch(selectedModule.id, query, true);
  };

  const handleCopyResult = () => {
    const textToCopy = activeRecord?.rawResponse || activeRecord?.parsedReport?.summary || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = async () => {
    if (!activeRecord) return;
    let content = activeRecord.txtContent;
    let fileName = activeRecord.txtFileName || `dossie-pro-${activeRecord.moduleType}-${activeRecord.id}.txt`;

    if (!content) {
      try {
        setIsDownloadingTxt(true);
        const res = await fetch(`/api/query/${activeRecord.id}/fetch-txt`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.txtContent) {
            content = data.txtContent;
            activeRecord.txtContent = data.txtContent;
            if (data.txtFileName) {
              fileName = data.txtFileName;
              activeRecord.txtFileName = data.txtFileName;
            }
            setActiveTab('txt');
          }
        }
      } catch (err) {
        console.warn('Erro ao baixar TXT Pro:', err);
      } finally {
        setIsDownloadingTxt(false);
      }
    }

    if (!content) {
      content = activeRecord.rawResponse || 'Nenhum dado retornado.';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPhoto = (photoUrl?: string, customName?: string) => {
    if (!activeRecord) return;
    const targetUrl = photoUrl || activeRecord.photoUrl || (activeRecord.photos && activeRecord.photos[0]?.url);
    if (!targetUrl) return;

    const defaultFileName = customName || (activeRecord.photos && activeRecord.photos[0]?.fileName) || `foto_${activeRecord.queryParam}_${activeRecord.id}.jpg`;

    // Se for data URL
    if (targetUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = defaultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Usa rota da API com Content-Disposition attachment
      window.location.href = `/api/query/${activeRecord.id}/photo?download=1`;
    }
  };

  const handleFetchPhoto = async () => {
    if (!activeRecord) return;
    try {
      setIsFetchingPhoto(true);
      const res = await fetch(`/api/query/${activeRecord.id}/fetch-photo`, { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.photoUrl) {
        activeRecord.photoUrl = data.photoUrl;
        if (data.photos) activeRecord.photos = data.photos;
        setActiveTab('photo');
      }
    } catch (e) {
      console.warn('Erro ao solicitar busca de foto:', e);
    } finally {
      setIsFetchingPhoto(false);
    }
  };

  // Icon mapping
  const renderModuleIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'UserCheck': return <UserCheck className={className} />;
      case 'PhoneCall': return <PhoneCall className={className} />;
      case 'Users': return <Users className={className} />;
      case 'Mail': return <Mail className={className} />;
      case 'MapPin': return <MapPin className={className} />;
      case 'Compass': return <Compass className={className} />;
      case 'Building2': return <Building2 className={className} />;
      case 'Vote': return <Vote className={className} />;
      case 'HeartHandshake': return <HeartHandshake className={className} />;
      case 'Camera': return <Camera className={className} />;
      case 'CarFront': return <CarFront className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  if (!isOpen) return null;

  const isProRecord = activeRecord?.moduleType?.startsWith('pro_');
  const saldoRestante = userProfile?.consultasRestantes ?? 10;
  const isTrial = userProfile?.plan === 'trial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl my-auto rounded-[20px] bg-[#011d1c] border border-[#ffd166]/30 shadow-2xl shadow-[#ffd166]/10 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-[#003734] bg-gradient-to-r from-[#012624] via-[#011d1c] to-[#012624] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#ffd166] to-[#d97706] flex items-center justify-center text-[#0f172a] shadow-md shadow-[#ffd166]/25">
              <Sparkles className="w-5 h-5 fill-[#0f172a]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#ffffff] font-['DM_Sans',sans-serif]">
                  BUSCAS PRO
                </h2>
                <span className="px-2.5 py-0.5 rounded-[4px] bg-gradient-to-r from-[#ffd166] to-[#f59e0b] text-[#0f172a] text-[10px] sm:text-[11px] font-extrabold uppercase font-mono tracking-wider">
                  Sistema de busca avançada BRDATA
                </span>
              </div>
              <p className="text-xs text-[#bbc7c6] mt-0.5">
                Ecossistema paralelo de consultas com 11 módulos avançados de inteligência.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quota Counter */}
            <div 
              onClick={() => isTrial && onOpenPricing()}
              className={`px-3 py-1.5 rounded-[8px] border flex items-center gap-2 cursor-pointer transition-colors ${
                isTrial 
                  ? saldoRestante > 2 
                    ? 'bg-[#003734] border-[#00827c]/40 text-[#cbfffc]' 
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-[#ffd166]/10 border-[#ffd166]/30 text-[#ffd166]'
              }`}
              title="Clique para ver planos de recarga"
            >
              <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-wider font-mono font-medium">
                  {isTrial ? 'Cota Trial' : 'Plano Ilimitado'}
                </span>
                <span className="text-xs font-mono font-bold">
                  {isTrial ? `${saldoRestante} / 10 rest.` : 'ATIVO'}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-[8px] bg-[#003734] hover:bg-[#004743] text-[#bbc7c6] hover:text-[#ffffff] transition-colors cursor-pointer border border-[#00827c]/30"
              title="Fechar painel Pro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Module Grid (11 Pro Modules) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-[0.12em] font-mono text-[#cbfffc] font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ffd166]" />
                Selecione o Módulo Pro ({PRO_MODULES.length} Bases Disponíveis):
              </span>
              <span className="text-[11px] font-mono text-[#707777]">
                Disparo direto no canal VIP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {PRO_MODULES.map((mod) => {
                const isSelected = selectedModule.id === mod.id;
                const isInDev = Boolean(mod.inDevelopment);

                return (
                  <button
                    key={mod.id}
                    id={`btn-pro-mod-${mod.id}`}
                    type="button"
                    disabled={isInDev}
                    aria-disabled={isInDev}
                    title={isInDev ? 'Módulo em desenvolvimento - Indisponível no momento' : undefined}
                    onClick={() => !isInDev && handleSelectModule(mod)}
                    className={`p-3 rounded-[12px] text-left transition-all border relative flex flex-col justify-between select-none ${
                      isInDev
                        ? 'opacity-65 bg-[#011413]/90 border-dashed border-amber-500/30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gradient-to-br from-[#003734] to-[#012624] border-[#ffd166] shadow-md shadow-[#ffd166]/15 scale-[1.02] cursor-pointer'
                        : 'bg-[#003734]/50 hover:bg-[#003734] border-[#00827c]/25 text-[#bbc7c6] hover:border-[#00827c]/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className={`p-1.5 rounded-[6px] ${
                        isInDev
                          ? 'bg-[#011d1c] text-[#707777] border border-[#707777]/30'
                          : isSelected 
                          ? 'bg-[#ffd166] text-[#0f172a]' 
                          : 'bg-[#011d1c] text-[#cbfffc] border border-[#00827c]/30'
                      }`}>
                        {renderModuleIcon(mod.iconName, 'w-4 h-4')}
                      </div>

                      {isInDev ? (
                        <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 text-right">
                          EM DESENVOLVIMENTO
                        </span>
                      ) : (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isSelected
                            ? 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40'
                            : 'bg-[#011d1c] text-[#707777]'
                        }`}>
                          {mod.command}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold leading-snug truncate ${
                        isInDev ? 'text-[#8c9a99]' : isSelected ? 'text-[#ffffff]' : 'text-[#edfffe]'
                      }`}>
                        {mod.title}
                      </h4>
                      <p className={`text-[10px] truncate mt-0.5 ${
                        isInDev ? 'text-amber-400/90 font-medium' : 'text-[#bbc7c6]'
                      }`}>
                        {isInDev ? 'EM DESENVOLVIMENTO' : mod.subtitle}
                      </p>
                    </div>

                    {isSelected && !isInDev && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#ffd166] animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Module Input Form */}
          <div className="p-5 sm:p-6 rounded-[16px] bg-[#003734] border border-[#ffd166]/25 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#00827c]/25">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#ffd166] text-[#0f172a] flex items-center justify-center font-bold">
                  {renderModuleIcon(selectedModule.iconName, 'w-4 h-4')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#ffffff]">
                      {selectedModule.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#011d1c] text-[#ffd166] border border-[#ffd166]/30">
                      Comando: {selectedModule.command} [alvo]
                    </span>
                  </div>
                  <p className="text-xs text-[#bbc7c6] mt-0.5">
                    {selectedModule.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFillSample}
                className="px-3 py-1.5 rounded-[6px] bg-[#012624] hover:bg-[#011d1c] border border-[#00827c]/40 text-[#cbfffc] text-xs font-mono transition-colors cursor-pointer self-start md:self-auto flex items-center gap-1.5"
                title="Inserir alvo de teste realista"
              >
                <span>Usar Exemplo</span>
                <span className="text-[#ffd166] text-[11px]">({selectedModule.defaultSample})</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-[0.08em] text-[#cbfffc] mb-1.5">
                  {selectedModule.inputLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707777]">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="pro-search-input"
                    value={inputVal}
                    onChange={handleInputChange}
                    placeholder={selectedModule.placeholder}
                    disabled={isLoading}
                    autoFocus
                    className="w-full pl-10 pr-32 py-3 rounded-[10px] bg-[#011d1c] border border-[#00827c]/40 focus:border-[#ffd166] text-sm text-[#ffffff] placeholder-[#707777] font-mono focus:outline-none transition-colors shadow-inner"
                  />
                  <div className="absolute inset-y-0 right-1.5 flex items-center">
                    <button
                      type="submit"
                      disabled={isLoading || !inputVal.trim()}
                      className="px-4 py-2 rounded-[8px] bg-gradient-to-r from-[#ffd166] via-[#f59e0b] to-[#d97706] hover:brightness-110 disabled:opacity-50 text-[#0f172a] font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2 cursor-pointer shadow-md shadow-[#ffd166]/20 transition-all disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <span>Disparar Pro</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-[#bbc7c6]">
                  <span>{selectedModule.inputHelper}</span>
                  <span className="font-mono text-[#ffd166]">
                    Desconto: 1 consulta por disparo
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Loading State Animation */}
          {isLoading && (
            <div className="p-8 rounded-[16px] bg-[#003734] border border-[#ffd166]/30 text-center space-y-4 animate-in fade-in">
              <div className="relative inline-block">
                <div className="w-14 h-14 rounded-full border-2 border-[#011d1c] border-t-[#ffd166] animate-spin mx-auto"></div>
                <Radio className="w-6 h-6 text-[#ffd166] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#ffffff] font-['DM_Sans',sans-serif]">
                  Processando Consulta no Ecossistema BUSCAS PRO
                </h3>
                <p className="text-xs text-[#cbfffc] font-mono mt-1 max-w-xl mx-auto">
                  {loadingStepText || `Despachando comando ${selectedModule.command} para o Bot @Hgliopk00bot ➔ Aguardando retorno da base...`}
                </p>
                {loadingStepText && (loadingStepText.toLowerCase().includes('base') || loadingStepText.toLowerCase().includes('veicular')) && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 animate-in fade-in">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40 flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#ffd166] animate-ping" />
                      <span>🇧🇷</span> Base Nacional (Ativa)
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] text-[#86a5a3] bg-[#011d1c]/80 border border-[#00827c]/30">
                      📡 Radar (Cortéx)
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] text-[#86a5a3] bg-[#011d1c]/80 border border-[#00827c]/30">
                      🏛️ SERPRO (Oficial)
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] text-[#86a5a3] bg-[#011d1c]/80 border border-[#00827c]/30">
                      🔍 Base Premium
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Dossier Panel (if this is a pro search record or completed) */}
          {!isLoading && isProRecord && activeRecord && (
            <div className="p-5 sm:p-6 rounded-[16px] bg-[#003734] border border-[#ffd166]/40 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#00827c]/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[6px] bg-[#ffd166] text-[#0f172a] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4 fill-[#0f172a]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#ffffff]">
                        Retorno de Inteligência Pro: {activeRecord.queryParam}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded bg-[#011d1c] text-[#ffd166] text-[10px] font-mono border border-[#ffd166]/30">
                        {activeRecord.telegramCommand}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#bbc7c6] font-mono mt-0.5">
                      Tempo de resposta: {activeRecord.durationMs ? `${(activeRecord.durationMs / 1000).toFixed(2)}s` : '1.80s'} • Status: Concluído
                    </p>
                  </div>
                </div>

                  <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-[#011d1c] rounded-[6px] p-0.5 border border-[#00827c]/30 text-xs font-mono">
                    <button
                      onClick={() => setActiveTab('parsed')}
                      className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                        activeTab === 'parsed' ? 'bg-[#003734] text-[#ffffff]' : 'text-[#bbc7c6]'
                      }`}
                    >
                      Dossiê Formatado
                    </button>
                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                        activeTab === 'raw' ? 'bg-[#003734] text-[#ffffff]' : 'text-[#bbc7c6]'
                      }`}
                    >
                      Texto Bruto
                    </button>
                    {activeRecord.txtContent && (
                      <button
                        onClick={() => setActiveTab('txt')}
                        className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1 ${
                          activeTab === 'txt' ? 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40' : 'text-[#ffd166]'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        TXT Oficial
                      </button>
                    )}
                    {(activeRecord.photoUrl || (activeRecord.photos && activeRecord.photos.length > 0) || activeRecord.moduleType === 'pro_foto') && (
                      <button
                        onClick={() => setActiveTab('photo')}
                        className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1 font-bold ${
                          activeTab === 'photo' ? 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40 shadow-sm' : 'text-[#ffd166]'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        Foto Oficial
                      </button>
                    )}
                  </div>

                  {activeRecord.photoUrl && (
                    <button
                      onClick={() => handleDownloadPhoto()}
                      className="px-2.5 py-1.5 rounded-[6px] bg-[#ffd166] hover:bg-[#e6be5c] text-[#0f172a] font-bold text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 shadow"
                      title="Baixar a imagem / foto original retornada pelo Telegram"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Baixar Foto (JPG)</span>
                    </button>
                  )}

                  <button
                    onClick={handleDownloadTxt}
                    disabled={isDownloadingTxt}
                    className="px-2.5 py-1.5 rounded-[6px] bg-[#011d1c] hover:bg-[#004743] text-[#ffd166] border border-[#ffd166]/40 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Baixar arquivo TXT retornado pelo Telegram"
                  >
                    {isDownloadingTxt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>{isDownloadingTxt ? 'Baixando...' : activeRecord.txtContent ? 'Baixar TXT (Oficial)' : 'Baixar TXT'}</span>
                  </button>

                  <button
                    onClick={handleCopyResult}
                    className="p-2 rounded-[6px] bg-[#011d1c] hover:bg-[#004743] text-[#cbfffc] border border-[#00827c]/40 transition-colors cursor-pointer"
                    title="Copiar relatório"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Card Destaque Biométrico quando a foto estiver disponível */}
              {activeRecord.photoUrl && activeTab !== 'photo' && (
                <div className="p-3.5 rounded-[12px] bg-[#012624] border border-[#ffd166]/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div 
                      onClick={() => setLightboxPhotoUrl(activeRecord.photoUrl || null)}
                      className="relative w-14 h-14 rounded-[8px] bg-[#050c0c] border-2 border-[#ffd166] overflow-hidden cursor-pointer shrink-0 group shadow-md"
                      title="Clique para ampliar a foto"
                    >
                      <img 
                        src={activeRecord.photoUrl} 
                        alt="Foto do Alvo" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-4 h-4 text-[#ffd166]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#ffd166]/20 text-[#ffd166] text-[10px] font-mono font-bold uppercase border border-[#ffd166]/30 flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Foto Oficial Disponível
                        </span>
                        <span className="text-[11px] text-[#bbc7c6] font-mono">
                          {activeRecord.photos?.[0]?.fileName || 'foto_biometrica.jpg'}
                        </span>
                      </div>
                      <p className="text-xs text-[#edfffe] font-medium mt-0.5">
                        Registro fotográfico oficial localizado e importado com sucesso.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('photo')}
                      className="px-3 py-1.5 rounded-[6px] bg-[#011d1c] hover:bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 text-xs font-mono transition-colors cursor-pointer"
                    >
                      Visualizar
                    </button>
                    <button
                      onClick={() => handleDownloadPhoto()}
                      className="px-3 py-1.5 rounded-[6px] bg-[#ffd166] hover:bg-[#e6be5c] text-[#0f172a] font-bold text-xs font-mono transition-colors cursor-pointer"
                    >
                      Baixar Foto
                    </button>
                  </div>
                </div>
              )}

              {/* Not Found Banner */}
              {(activeRecord.isNotFound || activeRecord.exactMatch?.status === 'not_found' || activeRecord.rawResponse?.includes('Não encontrado')) && (
                <div className="p-3.5 rounded-[10px] bg-[#1a0f14] border border-[#f43f5e]/40 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-[#f43f5e] shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-[#ffffff] font-mono">
                      ❌ Nenhum registro localizado
                    </p>
                    <p className="text-[#fda4af] mt-0.5">
                      A pesquisa no bot oficial retornou "❌ Não encontrado." Não constam dados cadastrados para o parâmetro consultado.
                    </p>
                  </div>
                </div>
              )}

              {/* Views: Photo / TXT / Parsed / Raw */}
              {activeTab === 'photo' ? (
                <div className="p-5 rounded-[12px] bg-[#050c0c] border border-[#ffd166]/40 space-y-4 font-mono">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#ffd166]/20 text-xs text-[#ffd166]">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#ffd166]" />
                      <span className="font-bold uppercase tracking-wider">REGISTRO FOTOGRÁFICO OFICIAL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleFetchPhoto}
                        disabled={isFetchingPhoto}
                        className="px-2.5 py-1 rounded-[4px] bg-[#011d1c] hover:bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Tentar recuperar foto novamente das mensagens recentes"
                      >
                        {isFetchingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        <span>{isFetchingPhoto ? 'Buscando...' : 'Recarregar Foto'}</span>
                      </button>
                      {activeRecord.photoUrl && (
                        <button
                          onClick={() => handleDownloadPhoto()}
                          className="px-3 py-1 rounded-[4px] bg-[#ffd166] text-[#0f172a] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow hover:bg-[#e6be5c] transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Baixar Arquivo JPG</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {activeRecord.photoUrl ? (
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4 rounded-[10px] bg-[#011d1c]/60 border border-[#003734]">
                        <div 
                          onClick={() => setLightboxPhotoUrl(activeRecord.photoUrl || null)}
                          className="relative max-w-sm max-h-96 rounded-[12px] overflow-hidden border-2 border-[#ffd166]/60 shadow-2xl bg-black cursor-pointer group"
                        >
                          <img 
                            src={activeRecord.photoUrl} 
                            alt={`Foto Oficial de ${activeRecord.queryParam}`}
                            referrerPolicy="no-referrer"
                            className="max-h-80 w-auto object-contain transition-transform group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-2">
                            <span>🔍 Clique para tela cheia</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-3 text-xs">
                          <div className="p-3 rounded-[8px] bg-[#012624] border border-[#003734] space-y-1.5">
                            <p className="text-[#8fa3a1] uppercase text-[10px] tracking-wider">Status Biométrico</p>
                            <p className="text-[#cbfffc] font-bold text-sm flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              IMAGEM VINCULADA COM SUCESSO
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 rounded-[6px] bg-[#011d1c] border border-[#003734]">
                              <span className="text-[#8fa3a1] block">Alvo Consultado:</span>
                              <span className="text-[#ffffff] font-bold">{activeRecord.queryParam}</span>
                            </div>
                            <div className="p-2.5 rounded-[6px] bg-[#011d1c] border border-[#003734]">
                              <span className="text-[#8fa3a1] block">Arquivo:</span>
                              <span className="text-[#ffd166] truncate block">{activeRecord.photos?.[0]?.fileName || 'foto.jpg'}</span>
                            </div>
                          </div>

                          {activeRecord.photos && activeRecord.photos.length > 1 && (
                            <div className="space-y-2 pt-2 border-t border-[#003734]">
                              <p className="text-[11px] text-[#ffd166] font-bold">Galeria ({activeRecord.photos.length} fotos recebidas):</p>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {activeRecord.photos.map((p, pIdx) => (
                                  <div
                                    key={pIdx}
                                    onClick={() => {
                                      activeRecord.photoUrl = p.url;
                                      setLightboxPhotoUrl(p.url);
                                    }}
                                    className={`relative w-16 h-16 rounded-[6px] border cursor-pointer overflow-hidden shrink-0 ${activeRecord.photoUrl === p.url ? 'border-[#ffd166] ring-2 ring-[#ffd166]/40' : 'border-[#003734]'}`}
                                  >
                                    <img src={p.url} alt={`Foto ${pIdx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-3 rounded-[10px] bg-[#011d1c]/40 border border-[#003734]">
                      <Camera className="w-10 h-10 text-[#ffd166]/40 mx-auto" />
                      <p className="text-sm font-bold text-[#ffffff]">Foto em processamento ou não anexada pelo bot</p>
                      <p className="text-xs text-[#bbc7c6] max-w-md mx-auto">
                        Se o bot de pesquisa retornou um registro de foto via botão "Baixar Originais", clique no botão abaixo para forçar a sincronização imediata.
                      </p>
                      <button
                        onClick={handleFetchPhoto}
                        disabled={isFetchingPhoto}
                        className="px-4 py-2 rounded-[6px] bg-[#ffd166] hover:bg-[#e6be5c] text-[#0f172a] font-bold text-xs font-mono transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        {isFetchingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        <span>{isFetchingPhoto ? 'Sincronizando Foto...' : 'Buscar Foto do Bot Agora'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : activeTab === 'txt' && activeRecord.txtContent ? (
                <div className="p-4 rounded-[10px] bg-[#050c0c] border border-[#ffd166]/30 font-mono text-xs text-[#e6f1f0] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap selection:bg-[#ffd166]/30">
                  <div className="mb-2 pb-2 border-b border-[#ffd166]/20 flex items-center justify-between text-[11px] text-[#ffd166]">
                    <span>Arquivo: {activeRecord.txtFileName || 'dossie.txt'}</span>
                    <span>Recuperado via GramJS</span>
                  </div>
                  {activeRecord.txtContent}
                </div>
              ) : activeTab === 'parsed' ? (
                <div className="p-4 rounded-[10px] bg-[#011d1c] border border-[#003734] space-y-3 font-mono text-xs text-[#edfffe] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap selection:bg-[#ffd166]/30">
                  {activeRecord.rawResponse || activeRecord.parsedReport?.summary || 'Nenhum texto retornado para esta consulta.'}
                </div>
              ) : (
                <pre className="p-4 rounded-[10px] bg-[#011d1c] border border-[#003734] font-mono text-[11px] text-[#bbc7c6] overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap">
                  {activeRecord.rawResponse || 'Nenhum dado bruto registrado.'}
                </pre>
              )}
            </div>
          )}

          {/* Modal Lightbox para visualização de Foto em Tamanho Real */}
          {lightboxPhotoUrl && (
            <div 
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
              onClick={() => setLightboxPhotoUrl(null)}
            >
              <div 
                className="relative max-w-4xl max-h-[90vh] bg-[#050c0c] border-2 border-[#ffd166] rounded-[16px] overflow-hidden p-2 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full flex items-center justify-between p-2 border-b border-[#ffd166]/30 text-xs font-mono text-[#ffd166]">
                  <span className="font-bold">📸 REGISTRO FOTOGRÁFICO - ALVO: {activeRecord?.queryParam}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadPhoto(lightboxPhotoUrl)}
                      className="px-3 py-1 bg-[#ffd166] text-[#0f172a] font-bold rounded-[4px] text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Baixar Imagem
                    </button>
                    <button
                      onClick={() => setLightboxPhotoUrl(null)}
                      className="p-1 rounded-[4px] hover:bg-white/10 text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-center max-h-[80vh] overflow-auto">
                  <img 
                    src={lightboxPhotoUrl} 
                    alt="Foto em Alta Resolução" 
                    referrerPolicy="no-referrer"
                    className="max-h-[75vh] w-auto rounded-[8px] object-contain shadow-2xl" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Instructions Footer banner */}
          <div className="p-4 rounded-[12px] bg-[#012624] border border-[#003734] flex items-start gap-3 text-xs text-[#bbc7c6]">
            <ShieldCheck className="w-4 h-4 text-[#ffd166] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[#edfffe] font-medium">
                Como Funciona a Rota Paralela do BUSCAS PRO?
              </p>
              <p className="leading-relaxed">
                As consultas disparadas no modal Pro são encaminhadas ao servidor BRDATA sem interferir nas consultas convencionais.
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#003734] bg-[#012624] flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#707777] hidden sm:inline">
            SHAZAM BUSCAS VIP PROTOCOL • V3.2
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] bg-[#003734] hover:bg-[#004743] text-[#edfffe] text-xs font-mono transition-colors cursor-pointer border border-[#00827c]/30"
            >
              Fechar Painel Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
