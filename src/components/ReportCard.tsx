import React, { useState, useMemo, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Code, 
  User,
  Building,
  Car,
  Phone,
  Mail,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileDown,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  Database,
  Hash,
  Search,
  ExternalLink,
  Loader2,
  FileText,
  Download,
  Camera,
  X,
  Maximize2
} from 'lucide-react';
import { QueryRecord } from '../types';
import { cleanTelegramRawResponse } from '../utils/cleanTelegramResponse';

interface ReportCardProps {
  record: QueryRecord;
  onNewSearch?: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ record, onNewSearch }) => {
  const [copied, setCopied] = useState(false);
  // Default to showing the sanitized intelligence response, txt or photo if available
  const [activeView, setActiveView] = useState<'raw' | 'structured' | 'txt' | 'photo'>('raw');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFetchingTxt, setIsFetchingTxt] = useState(false);
  const [localTxt, setLocalTxt] = useState<string | undefined>(record.txtContent);
  const [localTxtName, setLocalTxtName] = useState<string | undefined>(record.txtFileName);

  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined>(record.photoUrl);
  const [localPhotos, setLocalPhotos] = useState<any[] | undefined>(record.photos);
  const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (record.txtContent) {
      setLocalTxt(record.txtContent);
      setLocalTxtName(record.txtFileName);
    }
  }, [record.txtContent, record.txtFileName]);

  useEffect(() => {
    if (record.photoUrl) {
      setLocalPhotoUrl(record.photoUrl);
      setLocalPhotos(record.photos);
      if (record.moduleType === 'pro_foto' || !record.txtContent) {
        setActiveView('photo');
      }
    }
  }, [record.photoUrl, record.photos, record.moduleType, record.txtContent]);

  const report = record.parsedReport;
  // Clean raw response, removing exclusively bot credit tags
  const sanitizedRawText = useMemo(() => {
    return cleanTelegramRawResponse(record.rawResponse || '');
  }, [record.rawResponse]);

  const exactMatch = report?.exactMatch || record.exactMatch;
  const dispatchCommand = report?.telegramCommand || record.telegramCommand;

  // Extract quick executive KPIs for the B2B dashboard header
  const summaryKpis = useMemo(() => {
    const raw = sanitizedRawText;
    
    // Status / Situation
    let status = 'REGULAR';
    let isNegative = false;
    let isPositive = true;

    const isNotFound = 
      record.isNotFound ||
      record.exactMatch?.status === 'not_found' ||
      record.exactMatch?.isNegativeReported ||
      /n[ãa]o encontrado|nao encontrado|nada consta|n[ãa]o localizado|nenhum registro|inexistente/i.test(raw);

    if (isNotFound) {
      status = 'NÃO ENCONTRADO';
      isNegative = true;
      isPositive = false;
    } else {
      const match = raw.match(/SITUAÇÃO(?:\s*CADASTRAL)?[:\s]+([^\n\r,]+)/i);
      if (match && match[1]) {
        status = match[1].trim();
        if (/IRREGULAR|SUSPENSO|CANCELADO|INAPTA|BLOQUEADO|ROUBO/i.test(status)) {
          isPositive = false;
          isNegative = true;
        }
      }
    }

    // Name / Company
    let name = '';
    const nameMatch = raw.match(/(?:NOME|RAZÃO SOCIAL|TITULAR|PROPRIETÁRIO)[:\s]+([^\n\r,]+)/i);
    if (nameMatch && nameMatch[1]) {
      name = nameMatch[1].trim();
    } else if (isNotFound) {
      name = 'Nenhum registro vinculado';
    }

    // Secondary detail (Nascimento, Município, Operadora, Modelo)
    let secondary = '';
    const secMatch = raw.match(/(?:NASCIMENTO|DATA DE NASCIMENTO|CIDADE\/UF|MUNICÍPIO|OPERADORA|MARCA\/MODELO)[:\s]+([^\n\r,]+)/i);
    if (secMatch && secMatch[1]) {
      secondary = secMatch[1].trim();
    } else if (isNotFound) {
      secondary = 'Alvo não consta na base';
    }

    return {
      status,
      isPositive,
      isNegative,
      name: name || record.queryParam,
      secondary,
    };
  }, [sanitizedRawText, record.queryParam, record.isNotFound, record.exactMatch]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sanitizedRawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = async () => {
    let content = localTxt || record.txtContent;
    let fileName = localTxtName || record.txtFileName || `dossie-pesquisa-${record.moduleType}-${record.id}.txt`;

    if (!content) {
      try {
        setIsFetchingTxt(true);
        const res = await fetch(`/api/query/${record.id}/fetch-txt`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.txtContent) {
            content = data.txtContent;
            record.txtContent = data.txtContent;
            setLocalTxt(data.txtContent);
            if (data.txtFileName) {
              fileName = data.txtFileName;
              record.txtFileName = data.txtFileName;
              setLocalTxtName(data.txtFileName);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar TXT:', err);
      } finally {
        setIsFetchingTxt(false);
      }
    }

    if (!content) {
      content = sanitizedRawText;
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

  const handleExportJson = () => {
    const payload = {
      id: record.id,
      moduleType: record.moduleType,
      moduleTitle: record.moduleTitle,
      queryParam: record.queryParam,
      commandExecuted: dispatchCommand,
      timestamp: record.timestamp,
      durationMs: record.durationMs,
      rawResponseSanitized: sanitizedRawText,
      parsedSections: record.parsedReport?.sections || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossie-intel-${record.moduleType}-${record.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPhoto = (photoUrl?: string, customName?: string) => {
    const targetUrl = photoUrl || localPhotoUrl || record.photoUrl || (localPhotos && localPhotos[0]?.url);
    if (!targetUrl) return;

    const defaultFileName = customName || (localPhotos && localPhotos[0]?.fileName) || `foto_${record.queryParam}_${record.id}.jpg`;

    if (targetUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = defaultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.location.href = `/api/query/${record.id}/photo?download=1`;
    }
  };

  const handleFetchPhoto = async () => {
    try {
      setIsFetchingPhoto(true);
      const res = await fetch(`/api/query/${record.id}/fetch-photo`, { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.photoUrl) {
        setLocalPhotoUrl(data.photoUrl);
        record.photoUrl = data.photoUrl;
        if (data.photos) {
          setLocalPhotos(data.photos);
          record.photos = data.photos;
        }
        setActiveView('photo');
      }
    } catch (e) {
      console.warn('Erro ao buscar foto sob demanda:', e);
    } finally {
      setIsFetchingPhoto(false);
    }
  };

  const getModuleIcon = () => {
    switch (record.moduleType) {
      case 'cnpj':
        return <Building className="w-5 h-5 text-[#cbfffc]" />;
      case 'placa':
        return <Car className="w-5 h-5 text-[#cbfffc]" />;
      case 'telefone':
        return <Phone className="w-5 h-5 text-[#cbfffc]" />;
      case 'email':
        return <Mail className="w-5 h-5 text-[#cbfffc]" />;
      default:
        return <User className="w-5 h-5 text-[#cbfffc]" />;
    }
  };

  const timestampIso = new Date(record.timestamp).toLocaleString('pt-BR');

  // Filtered lines for "Resultados da Pesquisa" with search highlighting
  const rawLines = useMemo(() => {
    return sanitizedRawText.split('\n');
  }, [sanitizedRawText]);

  // Syntax highlighter for intelligence response lines in B2B Refero aesthetic
  const renderHighlightedRawLine = (line: string, idx: number) => {
    const trimmed = line.trim();

    // Match search term filter if active
    const matchesSearch = searchTerm ? line.toLowerCase().includes(searchTerm.toLowerCase()) : false;

    // Divider lines
    if (trimmed.startsWith('===') || trimmed.startsWith('---')) {
      return (
        <div key={idx} className="text-[#707777] select-none py-1 font-mono text-[11px] opacity-40">
          {line}
        </div>
      );
    }

    // Main Headers like [DOSSIÊ ...]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return (
        <div key={idx} className="rf-results-line-row my-1.5">
          <span className="rf-results-line-number">{idx + 1}</span>
          <div className="rf-results-line-content">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#012624] text-[#cbfffc] font-medium border border-[#00827c]/40 font-mono text-xs">
              <Database className="w-3 h-3 text-[#00827c]" />
              {line}
            </span>
          </div>
        </div>
      );
    }

    // Section titles with emojis or ending with colon
    if (trimmed.endsWith(':') && (
      trimmed.includes('📊') || trimmed.includes('💳') || trimmed.includes('📞') || 
      trimmed.includes('📍') || trimmed.includes('🏢') || trimmed.includes('🚗') || 
      trimmed.includes('⚖️') || trimmed.includes('👤') || trimmed.includes('🌐') || 
      trimmed.includes('🚨') || trimmed.includes('📱') || trimmed.includes('💰')
    )) {
      return (
        <div key={idx} className="rf-results-line-row mt-3 mb-1">
          <span className="rf-results-line-number">{idx + 1}</span>
          <div className="rf-results-line-content flex items-center gap-2 text-[#edfffe] font-medium font-mono text-xs sm:text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00827c]"></span>
            <span>{line}</span>
          </div>
        </div>
      );
    }

    // Key: Value pattern
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && colonIndex < 35) {
      const keyPart = line.slice(0, colonIndex + 1);
      const valPart = line.slice(colonIndex + 1);

      const isRegular = /REGULAR|ATIV|LIMPO|NADA CONSTA|QUITADO|VÁLIDO|EXCELENTE/i.test(valPart);
      const isAlert = /ROUBO|FURTO|PROCESSO|IRREGULAR|SUSPENSO|CANCELADO|CRÍTICO|ALERTA/i.test(valPart);

      return (
        <div 
          key={idx} 
          className={`rf-results-line-row ${matchesSearch ? 'bg-[#00827c]/20 ring-1 ring-[#cbfffc]/30 rounded' : ''}`}
        >
          <span className="rf-results-line-number">{idx + 1}</span>
          <div className="rf-results-line-content flex flex-wrap items-baseline gap-x-2 text-xs sm:text-[13px]">
            <span className="text-[#8fa3a1] font-mono select-none">{keyPart}</span>
            <span className={
              isRegular
                ? 'text-[#cbfffc] font-medium font-mono'
                : isAlert
                ? 'text-[#fde9ff] font-medium font-mono'
                : 'text-[#ffffff] font-normal font-mono'
            }>
              {valPart}
            </span>
          </div>
        </div>
      );
    }

    // Regular list item or bullets
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
      return (
        <div 
          key={idx} 
          className={`rf-results-line-row ${matchesSearch ? 'bg-[#00827c]/20 ring-1 ring-[#cbfffc]/30 rounded' : ''}`}
        >
          <span className="rf-results-line-number">{idx + 1}</span>
          <div className="rf-results-line-content flex items-start gap-2 text-[#bbc7c6] text-xs sm:text-[13px] font-mono">
            <span className="text-[#00827c] select-none">•</span>
            <span>{trimmed.replace(/^[-*•]\s*/, '')}</span>
          </div>
        </div>
      );
    }

    // Empty lines
    if (!trimmed) {
      return <div key={idx} className="h-2"></div>;
    }

    // Fallback regular line
    return (
      <div 
        key={idx} 
        className={`rf-results-line-row ${matchesSearch ? 'bg-[#00827c]/20 ring-1 ring-[#cbfffc]/30 rounded' : ''}`}
      >
        <span className="rf-results-line-number">{idx + 1}</span>
        <div className="rf-results-line-content text-[#bbc7c6] font-mono text-xs sm:text-[13px]">
          {line}
        </div>
      </div>
    );
  };

  return (
    <div className="rf-report-dashboard print:bg-white print:text-black">
      
      {/* Top Header Payload Bar */}
      <div className="rf-header-toolbar">
        <div className="rf-header-meta-group">
          {/* Module badge */}
          <span className="rf-badge rf-badge-cyan">
            {record.moduleTitle}
          </span>

          {/* Base Selecionada */}
          {record.selectedOption && (
            <span className="rf-badge rf-badge-emerald flex items-center gap-1.5 font-bold">
              <Database className="w-3 h-3 text-[#10b981]" />
              BASE: {record.selectedOption.toUpperCase()}
            </span>
          )}

          {/* Target searched */}
          <div className="rf-badge rf-badge-surface flex items-center gap-2">
            <span className="text-[#8fa3a1]">ALVO:</span>
            <code className="text-[#ffffff] font-medium">{record.queryParam}</code>
          </div>

          {/* Execution Latency */}
          {record.durationMs && (
            <span className="rf-badge rf-badge-surface text-[#cbfffc]">
              ⚡ {(record.durationMs / 1000).toFixed(2)}s
            </span>
          )}

          {/* Security Protocol */}
          <span className="rf-badge rf-badge-surface text-[#8fa3a1] hidden sm:inline-flex">
            <Hash className="w-3 h-3 text-[#00827c]" />
            #INTEL-{record.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* View Mode Segmented Tabs */}
        <div className="rf-segmented-tabs">
          <button
            onClick={() => setActiveView('raw')}
            className={`rf-tab-button ${activeView === 'raw' ? 'active' : ''}`}
            title="Exibir os dados apurados e higienizados na íntegra"
          >
            <Code className="w-3.5 h-3.5" />
            <span>RESULTADOS DA PESQUISA</span>
          </button>

          <button
            onClick={() => setActiveView('structured')}
            className={`rf-tab-button ${activeView === 'structured' ? 'active' : ''}`}
            title="Exibir os dados organizados em painel analítico com cards"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>PAINEL ANALÍTICO</span>
          </button>

          {(localTxt || record.txtContent) && (
            <button
              onClick={() => setActiveView('txt')}
              className={`rf-tab-button ${activeView === 'txt' ? 'active' : ''}`}
              title="Exibir o dossiê TXT oficial recuperado do bot"
            >
              <FileText className="w-3.5 h-3.5 text-[#ffd166]" />
              <span className="text-[#ffd166]">DOSSIÊ TXT (OFICIAL)</span>
            </button>
          )}

          {(localPhotoUrl || record.photoUrl || record.moduleType === 'pro_foto' || (record.telegramCommand && record.telegramCommand.includes('foto'))) && (
            <button
              onClick={() => setActiveView('photo')}
              className={`rf-tab-button ${activeView === 'photo' ? 'active' : ''}`}
              title="Exibir a imagem / foto oficial retornada pelo bot"
            >
              <Camera className="w-3.5 h-3.5 text-[#ffd166]" />
              <span className="text-[#ffd166]">FOTO (OFICIAL)</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification / Audit Banner (White-labeled) */}
      {exactMatch && (
        <div className="rf-audit-card">
          <div className="rf-audit-icon-wrap">
            {exactMatch.status === 'not_found' || exactMatch.isNegativeReported ? (
              <XCircle className="w-5 h-5 text-[#f43f5e]" />
            ) : exactMatch.hasExactMatch ? (
              <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
            )}
          </div>

          <div className="rf-audit-content">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs uppercase tracking-[0.1em] font-semibold text-[#edfffe] flex items-center gap-2">
                {exactMatch.status === 'not_found' || exactMatch.isNegativeReported ? (
                  <>
                    <span className="rf-status-dot rf-status-dot-rose"></span>
                    NENHUM REGISTRO LOCALIZADO NA BASE DE DADOS
                  </>
                ) : exactMatch.hasExactMatch ? (
                  <>
                    <span className="rf-status-dot rf-status-dot-emerald"></span>
                    DOSSIÊ LOCALIZADO NA BASE DE DADOS
                  </>
                ) : (
                  <>
                    <span className="rf-status-dot rf-status-dot-cyan"></span>
                    RESPOSTA PROCESSADA COM SUCESSO
                  </>
                )}
              </span>

              <span className="rf-badge rf-badge-emerald">
                Auditoria Cadastral Verificada
              </span>
            </div>

            <p className="text-xs leading-relaxed text-[#bbc7c6] mt-0.5">
              {exactMatch.details}
            </p>
          </div>
        </div>
      )}

      {/* Executive Key Indicators Grid (B2B SaaS Dashboard Cards) */}
      <div className="rf-kpi-grid">
        {/* KPI 1: Situação Cadastral */}
        <div className="rf-kpi-card">
          <div className="rf-kpi-label">
            <span>SITUAÇÃO CADASTRAL</span>
            {summaryKpis.isPositive ? (
              <span className="rf-status-dot rf-status-dot-emerald"></span>
            ) : (
              <span className="rf-status-dot rf-status-dot-rose"></span>
            )}
          </div>
          <div className="rf-kpi-value">
            {summaryKpis.isPositive ? (
              <span className="rf-badge rf-badge-emerald">
                {summaryKpis.status}
              </span>
            ) : (
              <span className="rf-badge rf-badge-rose">
                {summaryKpis.status}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Titular / Identificação */}
        <div className="rf-kpi-card">
          <div className="rf-kpi-label">
            <span>TITULAR / RAZÃO SOCIAL</span>
            <User className="w-3.5 h-3.5 text-[#8fa3a1]" />
          </div>
          <div className="rf-kpi-value text-sm sm:text-base text-[#ffffff]">
            {summaryKpis.name}
          </div>
        </div>

        {/* KPI 3: Identificador Pesquisado */}
        <div className="rf-kpi-card">
          <div className="rf-kpi-label">
            <span>PARÂMETRO CONSULTADO</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#8fa3a1]" />
          </div>
          <div className="rf-kpi-value text-[#cbfffc]">
            {record.queryParam}
          </div>
        </div>

        {/* KPI 4: Auditoria / Tempo */}
        <div className="rf-kpi-card">
          <div className="rf-kpi-label">
            <span>CONFORMIDADE DE BASE</span>
            <Database className="w-3.5 h-3.5 text-[#8fa3a1]" />
          </div>
          <div className="rf-kpi-value text-[#ffffff] flex items-center justify-between">
            <span>100% AUDITADO</span>
            <span className="text-xs font-mono text-[#8fa3a1] font-normal">
              {record.durationMs ? `${(record.durationMs / 1000).toFixed(2)}s` : 'Tempo Real'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Destaque Biométrico quando a foto estiver disponível */}
      {(localPhotoUrl || record.photoUrl) && activeView !== 'photo' && (
        <div className="mb-4 p-3.5 rounded-[10px] bg-[#012624] border border-[#ffd166]/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => setLightboxPhotoUrl(localPhotoUrl || record.photoUrl || null)}
              className="relative w-14 h-14 rounded-[8px] bg-[#050c0c] border-2 border-[#ffd166] overflow-hidden cursor-pointer shrink-0 group shadow-md"
              title="Clique para ampliar a foto"
            >
              <img 
                src={localPhotoUrl || record.photoUrl} 
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
                  {localPhotos?.[0]?.fileName || record.photos?.[0]?.fileName || 'registro_fotografico.jpg'}
                </span>
              </div>
              <p className="text-xs text-[#edfffe] font-medium mt-0.5">
                Registro biométrico/fotográfico original do alvo retornado com sucesso.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('photo')}
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

      {/* Main Body Area */}
      {activeView === 'photo' ? (
        /* REGISTRO FOTOGRÁFICO OFICIAL */
        <div className="rf-results-panel">
          <div className="rf-results-panel-header bg-[#141208] border-b border-[#ffd166]/30">
            <div className="rf-results-panel-title">
              <Camera className="w-4 h-4 text-[#ffd166]" />
              <span className="text-[#ffd166] font-mono font-bold">Registro Fotográfico Oficial</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#ffd166]/10 text-[#ffd166] border border-[#ffd166]/30">
                {localPhotos?.[0]?.fileName || record.photos?.[0]?.fileName || 'foto_biometrica.jpg'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchPhoto}
                disabled={isFetchingPhoto}
                className="px-2.5 py-1 rounded-[6px] bg-[#012624] hover:bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                title="Tentar recuperar foto novamente das mensagens"
              >
                {isFetchingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                <span>{isFetchingPhoto ? 'Sincronizando...' : 'Recarregar'}</span>
              </button>

              {(localPhotoUrl || record.photoUrl) && (
                <button
                  onClick={() => handleDownloadPhoto()}
                  className="px-3 py-1.5 rounded-[6px] bg-[#ffd166] hover:bg-[#e6be5c] text-[#0f172a] font-bold text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                  title="Baixar imagem original no dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Foto (JPG)</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-6 bg-[#040909] flex flex-col md:flex-row items-center justify-center gap-6">
            {(localPhotoUrl || record.photoUrl) ? (
              <>
                <div 
                  onClick={() => setLightboxPhotoUrl(localPhotoUrl || record.photoUrl || null)}
                  className="relative max-w-sm max-h-96 rounded-[12px] overflow-hidden border-2 border-[#ffd166]/60 shadow-2xl bg-black cursor-pointer group"
                >
                  <img 
                    src={localPhotoUrl || record.photoUrl} 
                    alt={`Foto Oficial de ${record.queryParam}`} 
                    referrerPolicy="no-referrer"
                    className="max-h-80 w-auto object-contain transition-transform group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold">
                    <span>🔍 Clique para tela cheia</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-[8px] bg-[#012624] border border-[#003734]">
                    <span className="text-[#8fa3a1] block text-[10px] uppercase">Alvo Cadastral</span>
                    <span className="text-[#cbfffc] font-bold text-sm">{record.queryParam}</span>
                    <span className="text-[#ffd166] text-[11px] block mt-1">Status: Foto Autenticada e Vinculada</span>
                  </div>

                  {localPhotos && localPhotos.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-[#003734]">
                      <p className="text-[11px] text-[#ffd166] font-bold">Galeria ({localPhotos.length} fotos disponíveis):</p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {localPhotos.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => {
                              setLocalPhotoUrl(p.url);
                              record.photoUrl = p.url;
                              setLightboxPhotoUrl(p.url);
                            }}
                            className={`relative w-16 h-16 rounded-[6px] border cursor-pointer overflow-hidden shrink-0 ${localPhotoUrl === p.url ? 'border-[#ffd166] ring-2 ring-[#ffd166]/40' : 'border-[#003734]'}`}
                          >
                            <img src={p.url} alt={`Foto ${pIdx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-3">
                <Camera className="w-10 h-10 text-[#ffd166]/40 mx-auto" />
                <p className="text-sm font-bold text-[#ffffff] font-mono">Foto em processamento ou não anexada pelo bot</p>
                <p className="text-xs text-[#bbc7c6] font-mono max-w-md mx-auto">
                  Clique no botão abaixo para fazer uma checagem ativa nas respostas recentes da central.
                </p>
                <button
                  onClick={handleFetchPhoto}
                  disabled={isFetchingPhoto}
                  className="px-4 py-2 rounded-[6px] bg-[#ffd166] hover:bg-[#e6be5c] text-[#0f172a] font-bold text-xs font-mono transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  {isFetchingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span>{isFetchingPhoto ? 'Sincronizando Foto...' : 'Buscar Foto Agora'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeView === 'txt' ? (
        /* DOSSIÊ TXT OFICIAL */
        <div className="rf-results-panel">
          <div className="rf-results-panel-header bg-[#141208] border-b border-[#ffd166]/20">
            <div className="rf-results-panel-title">
              <FileText className="w-4 h-4 text-[#ffd166]" />
              <span className="text-[#ffd166] font-mono">Dossiê TXT Oficial</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#ffd166]/10 text-[#ffd166] border border-[#ffd166]/30">
                {localTxtName || record.txtFileName || 'relatorio.txt'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportTxt}
                className="px-3 py-1.5 rounded-[6px] bg-[#ffd166]/20 hover:bg-[#ffd166]/30 text-[#ffd166] border border-[#ffd166]/40 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Salvar arquivo TXT no dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Salvar Arquivo TXT</span>
              </button>
            </div>
          </div>

          <div className="rf-results-panel-body p-4 bg-[#040909] font-mono text-xs text-[#e6f1f0] leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[600px]">
            {localTxt || record.txtContent || 'Nenhum conteúdo no arquivo TXT.'}
          </div>
        </div>
      ) : activeView === 'raw' ? (
        /* RESULTADOS DA PESQUISA - SAAS DOSSIER PANEL */
        <div className="rf-results-panel">
          {/* Header of the Results Panel */}
          <div className="rf-results-panel-header">
            <div className="rf-results-panel-title">
              <Database className="w-4 h-4 text-[#cbfffc]" />
              <span>Resultados da Pesquisa</span>
              <span className="rf-badge rf-badge-cyan">
                {rawLines.length} registros
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Quick search input inside raw response */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#8fa3a1] absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar dados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#012624] border border-[#003734] rounded-[6px] pl-8 pr-2.5 py-1 text-xs font-mono text-[#ffffff] placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]/40 w-36 sm:w-48 transition-colors"
                />
              </div>

              {/* Bytes count telemetry */}
              <span className="text-[11px] font-mono text-[#707777] hidden sm:inline">
                {sanitizedRawText.length} bytes
              </span>

              {/* Instant Copy Button inside Toolbar */}
              <button
                onClick={handleCopy}
                className="rf-button rf-button-secondary text-[10px] py-1.5 px-2.5"
                title="Copiar dados para a área de transferência"
              >
                {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Dossier Code Body */}
          <div className="rf-results-panel-body">
            {summaryKpis.isNegative && (
              <div className="m-3 p-5 rounded-[10px] bg-[#1c0d12] border border-[#f43f5e]/30 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-full bg-[#f43f5e]/15 text-[#f43f5e] flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-[#ffffff] font-mono flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-[#f43f5e]">❌</span> REGISTRO NÃO ENCONTRADO
                  </h4>
                  <p className="text-xs text-[#fda4af] leading-relaxed">
                    A consulta ao alvo <span className="font-mono text-[#ffffff] font-semibold">{record.queryParam}</span> foi processada pelo barramento oficial, porém a base retornou que não constam registros vinculados ("❌ Não encontrado.").
                  </p>
                </div>
                {onNewSearch && (
                  <button
                    onClick={onNewSearch}
                    className="px-3 py-1.5 rounded-[6px] bg-[#012624] hover:bg-[#003734] border border-[#f43f5e]/40 text-[#ffffff] text-xs font-mono transition-colors shrink-0"
                  >
                    Nova Busca
                  </button>
                )}
              </div>
            )}
            {rawLines.map((line, idx) => renderHighlightedRawLine(line, idx))}
          </div>
        </div>
      ) : (
        /* STRUCTURED ANALYTIC VIEW - CARDS DASHBOARD */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-14 h-14 bg-[#011d1c] border border-[#003734] rounded-[12px] flex items-center justify-center flex-shrink-0">
              {getModuleIcon()}
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report?.sections[0]?.items.slice(0, 4).map((item, idx) => {
                const isRegular = /REGULAR|ATIV|LIMPO|NADA CONSTA|QUITADO/i.test(item.value);
                const isAlert = /IRREGULAR|SUSPENSO|CANCELADO|ROUBO|PROCESSO/i.test(item.value);

                return (
                  <div key={idx} className="rf-data-tile">
                    <p className="rf-data-tile-label">
                      {item.label}
                    </p>
                    {isRegular ? (
                      <p className="text-sm font-medium text-[#cbfffc] flex items-center gap-2 font-mono">
                        <span className="rf-status-dot rf-status-dot-emerald"></span>
                        {item.value}
                      </p>
                    ) : isAlert ? (
                      <p className="text-sm font-medium text-[#fde9ff] flex items-center gap-2 font-mono">
                        <span className="rf-status-dot rf-status-dot-rose"></span>
                        {item.value}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-[#ffffff] font-mono break-words">
                        {item.value}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subsequent Sections as B2B Intelligence Cards */}
          {report?.sections.slice(1).map((section, sIdx) => (
            <div key={sIdx} className="rf-section-container">
              <div className="rf-section-header">
                <h4 className="rf-section-title">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00827c]"></span>
                  {section.title}
                </h4>
                <span className="rf-badge rf-badge-surface text-[10px]">
                  {section.items.length} itens
                </span>
              </div>

              <div className="rf-data-grid">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="rf-data-tile">
                    <span className="rf-data-tile-label">
                      {item.label}
                    </span>
                    <span className="rf-data-tile-value">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Toolbar with Actions and Security Hash */}
      <div className="rf-footer-bar">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Copy Button */}
          <button
            onClick={handleCopy}
            className={`rf-button ${copied ? 'rf-button-secondary text-[#34d399]' : 'rf-button-primary'}`}
            title="Copiar dados para a área de transferência"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIADO' : 'COPIAR DADOS'}</span>
          </button>

          {/* Download Foto */}
          {(localPhotoUrl || record.photoUrl) && (
            <button
              onClick={() => handleDownloadPhoto()}
              className="rf-button bg-[#ffd166] hover:bg-[#e6be5c] text-[#0f172a] font-bold border-[#ffd166] flex items-center gap-1.5 cursor-pointer shadow"
              title="Baixar imagem original em alta resolução (JPG)"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>BAIXAR FOTO (OFICIAL)</span>
            </button>
          )}

          {/* Download TXT */}
          <button
            onClick={handleExportTxt}
            disabled={isFetchingTxt}
            className={`rf-button ${(localTxt || record.txtContent) ? 'bg-[#00827c] hover:bg-[#009b94] text-[#ffffff] border-[#cbfffc]/40' : 'rf-button-secondary'} flex items-center gap-1.5 cursor-pointer`}
            title={(localTxt || record.txtContent) ? "Baixar arquivo TXT oficial" : "Baixar dossiê em formato TXT"}
          >
            {isFetchingTxt ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#cbfffc]" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-[#cbfffc]" />
            )}
            <span>
              {isFetchingTxt
                ? 'BUSCANDO TXT...'
                : (localTxt || record.txtContent)
                ? 'BAIXAR TXT (OFICIAL)'
                : 'BAIXAR TXT'}
            </span>
          </button>

          {/* Download JSON */}
          <button
            onClick={handleExportJson}
            className="rf-button rf-button-secondary"
            title="Exportar dossiê estruturado em JSON"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span>JSON</span>
          </button>

          {onNewSearch && (
            <button
              onClick={onNewSearch}
              className="rf-button rf-button-secondary text-[#cbfffc]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>NOVA CONSULTA</span>
            </button>
          )}
        </div>

        <p className="text-[11px] font-mono text-[#8fa3a1] uppercase tracking-[0.1em] flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#cbfffc]" />
          AUDITORIA CADASTRAL: {timestampIso}
        </p>
      </div>

      {/* Lightbox Modal de Foto em Tela Cheia */}
      {lightboxPhotoUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxPhotoUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-[#050c0c] border-2 border-[#ffd166] rounded-[16px] overflow-hidden p-3 flex flex-col items-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#ffd166]/30 text-xs font-mono text-[#ffd166]">
              <span className="font-bold flex items-center gap-2">
                <Camera className="w-4 h-4" />
                FOTO OFICIAL • ALVO: {record.queryParam}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPhoto(lightboxPhotoUrl)}
                  className="px-3 py-1 bg-[#ffd166] text-[#0f172a] font-bold rounded-[4px] text-xs flex items-center gap-1.5 cursor-pointer shadow hover:bg-[#e6be5c]"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Baixar Imagem
                </button>
                <button
                  onClick={() => setLightboxPhotoUrl(null)}
                  className="p-1.5 rounded-[4px] hover:bg-white/10 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img 
                src={lightboxPhotoUrl} 
                alt="Foto em Resolução Original" 
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto rounded-[8px] object-contain shadow-2xl" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
