import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  FileText, 
  Car, 
  Phone, 
  Building2, 
  User as UserIcon, 
  CreditCard, 
  Database, 
  Clock, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Globe,
  Calendar
} from 'lucide-react';
import { AdminConsultaItem, fetchUserConsultas } from '../lib/adminService';
import { OperatorAvatar } from './AdminDashboardModal';

export interface UserConsultasModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    userId: string;
    userEmail: string;
    userName: string;
    plan?: string;
    status?: string;
    photoURL?: string;
  } | null;
  preloadedConsultas?: AdminConsultaItem[];
}

export const UserConsultasModal: React.FC<UserConsultasModalProps> = ({
  isOpen,
  onClose,
  user,
  preloadedConsultas = [],
}) => {
  const [consultas, setConsultas] = useState<AdminConsultaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedParamId, setCopiedParamId] = useState<string | null>(null);
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);
  const [copiedIpId, setCopiedIpId] = useState<string | null>(null);

  // Carrega consultas do usuário selecionado
  const loadUserConsultas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await fetchUserConsultas(user.userId, user.userEmail, preloadedConsultas);
      setConsultas(items);
    } catch (err) {
      console.error('Erro ao buscar consultas do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      setSearchTerm('');
      setSelectedModule('all');
      setSelectedStatus('all');
      setExpandedId(null);
      loadUserConsultas();
    }
  }, [isOpen, user?.userId, user?.userEmail]);

  // Lista de módulos disponíveis nas consultas deste usuário
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    consultas.forEach((c) => {
      if (c.modulo_titulo) set.add(c.modulo_titulo);
      else if (c.modulo) set.add(c.modulo);
    });
    return Array.from(set).sort();
  }, [consultas]);

  // Consultas filtradas
  const filteredConsultas = useMemo(() => {
    return consultas.filter((c) => {
      // Filtro de texto por parâmetro, módulo, IP ou conteúdo do resultado
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesParam = (c.parametro || '').toLowerCase().includes(term);
        const matchesModule = (c.modulo_titulo || c.modulo || '').toLowerCase().includes(term);
        const matchesSummary = (c.resultado_resumo || '').toLowerCase().includes(term);
        const matchesRaw = (c.resposta_bruta || '').toLowerCase().includes(term);
        const matchesFull = (c.resultado_completo || '').toLowerCase().includes(term);
        const matchesIp = (c.ip || c.client_ip || '').toLowerCase().includes(term);
        if (!matchesParam && !matchesModule && !matchesSummary && !matchesRaw && !matchesFull && !matchesIp) return false;
      }

      // Filtro de módulo
      if (selectedModule !== 'all') {
        const currentMod = c.modulo_titulo || c.modulo;
        if (currentMod !== selectedModule) return false;
      }

      // Filtro de status
      if (selectedStatus !== 'all') {
        const isSuccess = c.status === 'concluida' || c.status === 'sucesso';
        if (selectedStatus === 'success' && !isSuccess) return false;
        if (selectedStatus === 'failed' && isSuccess) return false;
      }

      return true;
    });
  }, [consultas, searchTerm, selectedModule, selectedStatus]);

  // Métricas do usuário
  const metrics = useMemo(() => {
    const total = consultas.length;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    let todayCount = 0;
    let totalTime = 0;
    let successCount = 0;
    const moduleCounts: Record<string, number> = {};

    consultas.forEach((c) => {
      const time = new Date(c.timestamp || 0).getTime();
      if (time >= startOfToday) todayCount++;
      if (c.tempo_resposta_ms) totalTime += c.tempo_resposta_ms;
      if (c.status === 'concluida' || c.status === 'sucesso') successCount++;

      const m = c.modulo_titulo || c.modulo || 'Outro';
      moduleCounts[m] = (moduleCounts[m] || 0) + 1;
    });

    let topModule = 'Nenhum';
    let maxModCount = 0;
    Object.entries(moduleCounts).forEach(([m, count]) => {
      if (count > maxModCount) {
        maxModCount = count;
        topModule = m;
      }
    });

    const avgTimeMs = total > 0 && totalTime > 0 ? Math.round(totalTime / total) : 0;

    return {
      total,
      todayCount,
      topModule,
      avgTimeMs,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
    };
  }, [consultas]);

  if (!isOpen || !user) return null;

  // Formatações de data e hora
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '--/--/----';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '--/--/----';
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '--:--:--';
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--:--';
    }
  };

  const formatFullDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDateTime = (iso: string) => formatFullDateTime(iso);

  // Ícone por módulo
  const getModuleIcon = (modulo: string) => {
    const m = (modulo || '').toLowerCase();
    if (m.includes('cpf')) return <UserIcon className="w-3.5 h-3.5 text-[#79fbf5]" />;
    if (m.includes('placa') || m.includes('veic') || m.includes('veículo') || m.includes('cnh')) {
      return <Car className="w-3.5 h-3.5 text-[#ffd166]" />;
    }
    if (m.includes('tel') || m.includes('fone') || m.includes('cel')) {
      return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (m.includes('cnpj') || m.includes('empresa')) {
      return <Building2 className="w-3.5 h-3.5 text-cyan-400" />;
    }
    if (m.includes('score') || m.includes('cred') || m.includes('banco')) {
      return <CreditCard className="w-3.5 h-3.5 text-amber-300" />;
    }
    return <FileText className="w-3.5 h-3.5 text-[#cbfffc]" />;
  };

  // Copiar parâmetro
  const handleCopyParam = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedParamId(id);
    setTimeout(() => setCopiedParamId(null), 2000);
  };

  // Copiar resultado
  const handleCopyResult = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResultId(id);
    setTimeout(() => setCopiedResultId(null), 2000);
  };

  // Copiar IP
  const handleCopyIp = (id: string, ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIpId(id);
    setTimeout(() => setCopiedIpId(null), 2000);
  };

  // Download do dossiê completo em arquivo .txt
  const handleDownloadResultTxt = (c: AdminConsultaItem) => {
    const text = c.resultado_completo || c.resposta_bruta || c.resultado_resumo || 'Nenhum resultado registrado.';
    const ip = c.ip || c.client_ip || '127.0.0.1';
    const content = 
      `======================================================\n` +
      `SHAZAM BUSCAS - RELATÓRIO OFICIAL DE CONSULTA\n` +
      `======================================================\n` +
      `ID DA CONSULTA: ${c.id}\n` +
      `CLIENTE / OPERADOR: ${c.userName || user.userName} (${c.userEmail || user.userEmail})\n` +
      `ENDEREÇO IP AUDITADO: ${ip}\n` +
      `DATA DA PESQUISA: ${formatDate(c.timestamp)}\n` +
      `HORA DA PESQUISA: ${formatTime(c.timestamp)}\n` +
      `MÓDULO: ${c.modulo_titulo || c.modulo}\n` +
      `PARÂMETRO CONSULTADO: ${c.parametro}\n` +
      `TEMPO DE PROCESSAMENTO: ${c.tempo_resposta_ms || 0}ms\n` +
      `STATUS: ${c.status || 'OK'}\n` +
      `======================================================\n\n` +
      `DETALHAMENTO COMPLETO DO RESULTADO:\n\n` +
      text + `\n\n` +
      `======================================================\n` +
      `Fim do relatório emitido pela plataforma Shazam Buscas.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta_${(c.modulo || 'geral')}_${c.parametro.replace(/\W+/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar para CSV com IP e detalhamento
  const handleExportCSV = () => {
    if (consultas.length === 0) return;
    const header = ['ID', 'Data', 'Hora', 'IP_Cliente', 'Operador', 'Email', 'Modulo', 'Parametro', 'Status', 'Tempo_ms', 'Resultado'];
    const rows = consultas.map((c) => [
      `"${c.id}"`,
      `"${formatDate(c.timestamp)}"`,
      `"${formatTime(c.timestamp)}"`,
      `"${c.ip || c.client_ip || '127.0.0.1'}"`,
      `"${c.userName || user.userName}"`,
      `"${c.userEmail || user.userEmail}"`,
      `"${c.modulo_titulo || c.modulo}"`,
      `"${c.parametro}"`,
      `"${c.status || 'OK'}"`,
      `"${c.tempo_resposta_ms || 0}"`,
      `"${(c.resultado_completo || c.resposta_bruta || c.resultado_resumo || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `consultas_${user.userName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#011413] border border-[#00827c] shadow-2xl overflow-hidden font-mono">
        
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#003734] bg-[#011d1c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <OperatorAvatar
              photoURL={user.photoURL}
              name={user.userName}
              email={user.userEmail}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[#ffffff] tracking-wide">
                  Consultas de {user.userName}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#003734] text-[#cbfffc] font-semibold">
                  {user.plan || 'Plano Padrão'}
                </span>
                {user.status && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    user.status.toLowerCase().includes('ativo') 
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-red-900/40 text-red-300 border border-red-500/40'
                  }`}>
                    {user.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#707777] mt-0.5">
                {user.userEmail} • {consultas.length} consultas registradas no histórico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Botão Exportar CSV */}
            <button
              onClick={handleExportCSV}
              disabled={consultas.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003734] hover:bg-[#004d49] disabled:opacity-50 text-[#cbfffc] text-xs font-semibold transition-all cursor-pointer border border-[#005a55]"
              title="Baixar planilha CSV com histórico completo"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* Botão Atualizar */}
            <button
              onClick={loadUserConsultas}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#003734] hover:bg-[#004d49] text-[#cbfffc] text-xs transition-all cursor-pointer border border-[#005a55]"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734] transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#011d1c] border border-[#003734]">
              <span className="text-[10px] text-[#707777] uppercase tracking-wider block mb-1">
                Total Histórico
              </span>
              <div className="text-xl font-bold text-[#ffffff]">
                {metrics.total}
              </div>
              <span className="text-[10px] text-[#707777]">consultas processadas</span>
            </div>

            <div className="p-3 rounded-xl bg-[#011d1c] border border-[#003734]">
              <span className="text-[10px] text-[#707777] uppercase tracking-wider block mb-1">
                Realizadas Hoje
              </span>
              <div className="text-xl font-bold text-[#79fbf5]">
                {metrics.todayCount}
              </div>
              <span className="text-[10px] text-[#707777]">no dia atual</span>
            </div>

            <div className="p-3 rounded-xl bg-[#011d1c] border border-[#003734]">
              <span className="text-[10px] text-[#707777] uppercase tracking-wider block mb-1">
                Módulo Mais Usado
              </span>
              <div className="text-sm font-bold text-[#ffd166] truncate" title={metrics.topModule}>
                {metrics.topModule}
              </div>
              <span className="text-[10px] text-[#707777]">preferência do cliente</span>
            </div>

            <div className="p-3 rounded-xl bg-[#011d1c] border border-[#003734]">
              <span className="text-[10px] text-[#707777] uppercase tracking-wider block mb-1">
                Tempo Médio
              </span>
              <div className="text-xl font-bold text-emerald-400">
                {metrics.avgTimeMs > 0 ? `${metrics.avgTimeMs}ms` : '--'}
              </div>
              <span className="text-[10px] text-[#707777]">{metrics.successRate}% concluídas</span>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#011d1c] border border-[#003734]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#707777] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por CPF, placa, telefone, IP, módulo ou dados do resultado..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#012624] border border-[#003734] text-xs text-[#ffffff] placeholder-[#707777] outline-none focus:border-[#79fbf5] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro de Módulo */}
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#012624] border border-[#003734] text-xs text-[#cbfffc] outline-none cursor-pointer"
              >
                <option value="all">Todos os Módulos ({consultas.length})</option>
                {availableModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Filtro de Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#012624] border border-[#003734] text-xs text-[#cbfffc] outline-none cursor-pointer"
              >
                <option value="all">Status: Todos</option>
                <option value="success">Sucesso / Concluídas</option>
                <option value="failed">Sem Retorno / Erros</option>
              </select>
            </div>
          </div>

          {/* Tabela de Consultas Organizada */}
          <div className="rounded-xl bg-[#011d1c] border border-[#003734] overflow-hidden">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#012624] border-b border-[#003734] z-10">
                  <tr className="text-[#bbc7c6] uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5 font-semibold">Data / Hora</th>
                    <th className="py-2.5 px-3 font-semibold">IP do Cliente</th>
                    <th className="py-2.5 px-3.5 font-semibold">Módulo</th>
                    <th className="py-2.5 px-3.5 font-semibold">Parâmetro Consultado</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tempo</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">Detalhamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#003734]/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#bbc7c6]">
                        <RefreshCw className="w-6 h-6 text-[#79fbf5] animate-spin mx-auto mb-2" />
                        <span>Carregando consultas realizadas pelo cliente...</span>
                      </td>
                    </tr>
                  ) : filteredConsultas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#707777]">
                        <AlertCircle className="w-8 h-8 text-[#707777] mx-auto mb-2 opacity-60" />
                        <p className="font-semibold text-sm text-[#bbc7c6]">
                          {consultas.length === 0 
                            ? 'Nenhuma consulta encontrada para este usuário.' 
                            : 'Nenhuma consulta corresponde aos filtros aplicados.'}
                        </p>
                        <p className="text-xs mt-1">
                          {consultas.length === 0 
                            ? 'Quando este cliente pesquisar no terminal Shazam, os registros aparecerão aqui em tempo real.'
                            : 'Tente limpar os termos de busca ou filtros de módulo.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredConsultas.map((c, index) => {
                      const isExpanded = expandedId === c.id;
                      const isParamCopied = copiedParamId === c.id;
                      const isResultCopied = copiedResultId === c.id;
                      const isIpCopied = copiedIpId === c.id;
                      const moduleName = c.modulo_titulo || c.modulo || 'Geral';
                      const clientIp = c.ip || c.client_ip || '127.0.0.1';
                      const fullResultText = c.resultado_completo || c.resposta_bruta || c.resultado_resumo || 'Nenhum resultado registrado.';

                      return (
                        <React.Fragment key={c.id || index}>
                          <tr className="hover:bg-[#003734]/25 transition-colors">
                            {/* Data e Hora */}
                            <td className="py-3 px-3.5 text-[#bbc7c6] whitespace-nowrap">
                              <div className="flex flex-col text-[11px] leading-tight">
                                <span className="font-bold text-[#ffffff] flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#79fbf5]" />
                                  {formatDate(c.timestamp)}
                                </span>
                                <span className="text-[#707777] flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-[#00827c]" />
                                  {formatTime(c.timestamp)}
                                </span>
                              </div>
                            </td>

                            {/* Endereço IP do Cliente */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <button
                                onClick={() => handleCopyIp(c.id, clientIp)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#012624] hover:bg-[#003734] border border-[#003734] hover:border-[#79fbf5]/50 transition-colors cursor-pointer group"
                                title="Clique para copiar o IP"
                              >
                                <Globe className="w-3 h-3 text-[#79fbf5] group-hover:scale-110 transition-transform" />
                                <span className="font-mono text-[11px] text-[#cbfffc]">
                                  {clientIp}
                                </span>
                                {isIpCopied ? (
                                  <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-[#707777] group-hover:text-[#cbfffc] ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </td>

                            {/* Módulo */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 rounded bg-[#012624] border border-[#003734] shrink-0">
                                  {getModuleIcon(moduleName)}
                                </span>
                                <span className="font-semibold text-[#ffffff] whitespace-nowrap">
                                  {moduleName}
                                </span>
                              </div>
                            </td>

                            {/* Parâmetro Consultado com botão Copiar */}
                            <td className="py-3 px-3.5">
                              <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-[#012624] border border-[#003734] group">
                                <span className="font-bold text-[#79fbf5] select-all">
                                  {c.parametro}
                                </span>
                                <button
                                  onClick={() => handleCopyParam(c.id, c.parametro)}
                                  className="p-0.5 text-[#707777] hover:text-[#cbfffc] transition-colors cursor-pointer"
                                  title="Copiar parâmetro"
                                >
                                  {isParamCopied ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Tempo de Resposta */}
                            <td className="py-3 px-3 text-center text-[#707777] whitespace-nowrap">
                              {c.tempo_resposta_ms ? `${c.tempo_resposta_ms}ms` : '--'}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'concluida' || c.status === 'sucesso'
                                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-900/30 text-amber-400 border border-amber-500/30'
                              }`}>
                                {c.status === 'concluida' ? 'Sucesso' : (c.status || 'OK')}
                              </span>
                            </td>

                            {/* Ações / Detalhes */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-medium ${
                                  isExpanded
                                    ? 'bg-[#00827c] text-[#011d1c] font-bold'
                                    : 'bg-[#003734]/60 hover:bg-[#003734] text-[#cbfffc] border border-[#005a55]'
                                }`}
                              >
                                <span>{isExpanded ? 'Ocultar' : 'Ver Detalhes'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Gaveta Expandida com o DETALHAMENTO COMPLETO da Pesquisa */}
                          {isExpanded && (
                            <tr className="bg-[#002725]/60 border-y border-[#00827c]/40">
                              <td colSpan={7} className="p-4 sm:p-5">
                                <div className="space-y-4">
                                  {/* Barra Superior da Consulta com Chips de Auditoria */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#003734]/80">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2.5 py-1 rounded-md bg-[#00827c]/20 border border-[#00827c]/40 text-[#79fbf5] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-[#79fbf5]" />
                                        Detalhamento da Consulta #{c.id.slice(0, 8)}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-[#012624] border border-[#003734] text-[11px] text-[#cbfffc] flex items-center gap-1">
                                        <Globe className="w-3 h-3 text-[#79fbf5]" />
                                        IP: <strong className="font-mono">{clientIp}</strong>
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-[#012624] border border-[#003734] text-[11px] text-[#cbfffc] flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-[#79fbf5]" />
                                        {formatDate(c.timestamp)} às {formatTime(c.timestamp)}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-[#012624] border border-[#003734] text-[11px] text-[#ffd166] flex items-center gap-1 font-bold">
                                        {moduleName}: {c.parametro}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        onClick={() => handleCopyIp(c.id, clientIp)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#012624] hover:bg-[#003734] text-[11px] text-[#cbfffc] border border-[#003734] transition-colors cursor-pointer"
                                        title="Copiar endereço IP"
                                      >
                                        {isIpCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Globe className="w-3 h-3 text-[#79fbf5]" />}
                                        <span>{isIpCopied ? 'IP Copiado' : 'Copiar IP'}</span>
                                      </button>

                                      <button
                                        onClick={() => handleCopyResult(c.id, fullResultText)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#012624] hover:bg-[#003734] text-[11px] text-[#cbfffc] border border-[#003734] transition-colors cursor-pointer"
                                        title="Copiar todo o resultado da pesquisa"
                                      >
                                        {isResultCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>{isResultCopied ? 'Resultado Copiado' : 'Copiar Resultado'}</span>
                                      </button>

                                      <button
                                        onClick={() => handleDownloadResultTxt(c)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00827c] hover:bg-[#009b94] text-[11px] text-[#011413] font-bold transition-colors cursor-pointer"
                                        title="Baixar dossiê em arquivo .txt"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Baixar TXT</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Resumo Executivo / Alerta se aplicável */}
                                  {c.resultado_resumo && c.resultado_resumo !== fullResultText && (
                                    <div className="p-3 rounded-lg bg-[#002725] border border-[#005a55] text-xs text-[#cbfffc] flex items-start gap-2.5">
                                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-bold text-[#ffffff] block text-[11px] uppercase tracking-wide mb-0.5">
                                          Resumo Executivo da Consulta
                                        </span>
                                        <span className="leading-relaxed">{c.resultado_resumo}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* RESULTADO COMPLETO DA PESQUISA */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-[#bbc7c6]">
                                      <span className="font-bold uppercase tracking-wider text-[#79fbf5] flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-[#79fbf5]" />
                                        Resultado Completo da Pesquisa
                                      </span>
                                      <span className="text-[#707777]">
                                        {fullResultText ? `${fullResultText.length} caracteres` : 'Sem dados'}
                                      </span>
                                    </div>

                                    <div className="p-4 rounded-xl bg-[#00100f] border border-[#004d49] text-xs text-[#e6fbfb] whitespace-pre-wrap font-mono leading-relaxed max-h-[380px] overflow-y-auto select-all shadow-inner scrollbar-thin">
                                      {fullResultText}
                                    </div>
                                  </div>

                                  {/* Metadados e Auditoria Técnica Completa */}
                                  <div className="p-3 rounded-xl bg-[#011918] border border-[#003734] grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                                    <div>
                                      <span className="text-[10px] text-[#707777] block">Endereço IP</span>
                                      <span className="font-bold text-[#79fbf5] font-mono">{clientIp}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-[#707777] block">Data & Hora</span>
                                      <span className="font-semibold text-[#ffffff]">{formatFullDateTime(c.timestamp)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-[#707777] block">Tempo de Resposta</span>
                                      <span className="font-semibold text-emerald-400">{c.tempo_resposta_ms || 0}ms</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-[#707777] block">Operador / Cliente</span>
                                      <span className="font-semibold text-[#bbc7c6] truncate block" title={c.userName || user.userName}>
                                        {c.userName || user.userName}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-[#707777] block">ID do Registro</span>
                                      <span className="font-mono text-[#707777] text-[10px] truncate block" title={c.id}>
                                        {c.id}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer do Modal */}
        <div className="p-3.5 border-t border-[#003734] bg-[#011d1c] flex items-center justify-between text-xs text-[#707777] shrink-0">
          <span>
            Visualizando {filteredConsultas.length} de {consultas.length} consultas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#003734] hover:bg-[#004d49] text-[#ffffff] font-semibold transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
