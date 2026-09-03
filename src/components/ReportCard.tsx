import React, { useState, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { QueryRecord } from '../types';
import { cleanTelegramRawResponse } from '../utils/cleanTelegramResponse';

interface ReportCardProps {
  record: QueryRecord;
  onNewSearch?: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ record, onNewSearch }) => {
  const [copied, setCopied] = useState(false);
  // Default to showing the sanitized intelligence response
  const [activeView, setActiveView] = useState<'raw' | 'structured'>('raw');
  const [searchTerm, setSearchTerm] = useState('');

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

    if (/NADA CONSTA|NÃO LOCALIZADO|NENHUM REGISTRO|INEXISTENTE/i.test(raw)) {
      status = 'NADA CONSTA';
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
    }

    // Secondary detail (Nascimento, Município, Operadora, Modelo)
    let secondary = '';
    const secMatch = raw.match(/(?:NASCIMENTO|DATA DE NASCIMENTO|CIDADE\/UF|MUNICÍPIO|OPERADORA|MARCA\/MODELO)[:\s]+([^\n\r,]+)/i);
    if (secMatch && secMatch[1]) {
      secondary = secMatch[1].trim();
    }

    return {
      status,
      isPositive,
      isNegative,
      name: name || record.queryParam,
      secondary,
    };
  }, [sanitizedRawText, record.queryParam]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sanitizedRawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    const blob = new Blob([sanitizedRawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossie-pesquisa-${record.moduleType}-${record.id}.txt`;
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

      {/* Main Body Area */}
      {activeView === 'raw' ? (
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

          {/* Download TXT */}
          <button
            onClick={handleExportTxt}
            className="rf-button rf-button-secondary"
            title="Baixar arquivo TXT puro dos dados"
          >
            <FileDown className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span>EXPORTAR TXT</span>
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
    </div>
  );
};
