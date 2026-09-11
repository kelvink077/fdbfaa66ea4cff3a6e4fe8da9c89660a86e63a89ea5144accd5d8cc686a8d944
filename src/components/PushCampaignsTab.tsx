import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Radio,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Link as LinkIcon,
  Bell,
  Trash2,
  UploadCloud,
  ExternalLink,
  History,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { UserProfileData } from '../lib/firebase';
import {
  PushCampaignFilter,
  PushCampaignRecord,
  filterUsersForPushCampaign,
  broadcastPushCampaign,
  fetchPushCampaignHistory
} from '../lib/pushNotificationService';

export interface PushCampaignsTabProps {
  usersList: UserProfileData[];
  currentUserEmail?: string | null;
  onCampaignSent?: () => void;
}

export const PushCampaignsTab: React.FC<PushCampaignsTabProps> = ({
  usersList,
  currentUserEmail,
  onCampaignSent,
}) => {
  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [filter, setFilter] = useState<PushCampaignFilter>('expiring_3d');
  const [title, setTitle] = useState('⚠️ Atenção: Seu plano expira em breve!');
  const [message, setMessage] = useState(
    'Seu acesso ao terminal Shazam Buscas está próximo do vencimento. Renove agora para manter suas consultas ativas sem interrupção.'
  );
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'urgent' | 'success'>('warning');

  // Execution State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    deliveredCount: number;
    campaignName: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History State
  const [campaignsHistory, setCampaignsHistory] = useState<PushCampaignRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Carrega histórico de campanhas
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await fetchPushCampaignHistory();
      setCampaignsHistory(history);
    } catch (err) {
      console.warn('[PushCampaignsTab] Erro ao carregar histórico:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Calcula usuários para cada filtro em tempo real
  const countsByFilter = useMemo(() => {
    return {
      all: filterUsersForPushCampaign(usersList, 'all').length,
      active: filterUsersForPushCampaign(usersList, 'active').length,
      expiring_7d: filterUsersForPushCampaign(usersList, 'expiring_7d').length,
      expiring_3d: filterUsersForPushCampaign(usersList, 'expiring_3d').length,
      expired: filterUsersForPushCampaign(usersList, 'expired').length,
    };
  }, [usersList]);

  const targetUsersCount = countsByFilter[filter] || 0;

  // Sugestões de templates rápidos de campanha
  const handleApplyTemplate = (templateType: 'expiring_3d' | 'expiring_7d' | 'new_bases' | 'active_promo') => {
    if (templateType === 'expiring_3d') {
      setFilter('expiring_3d');
      setType('urgent');
      setCampaignName('Aviso de Vencimento em 3 Dias');
      setTitle('🚨 Atenção: Seu plano expira em 3 dias!');
      setMessage('Restam apenas 3 dias de acesso às buscas avançadas. Garanta a continuidade do seu trabalho renovando com condições especiais.');
    } else if (templateType === 'expiring_7d') {
      setFilter('expiring_7d');
      setType('warning');
      setCampaignName('Lembrete Preventivo de Renovação (7 Dias)');
      setTitle('⚡ Lembrete: Seu plano vence em 7 dias');
      setMessage('Aviso preventivo: seu plano entrará na última semana de vigência. Renove antecipadamente e continue consultando com velocidade máxima.');
    } else if (templateType === 'new_bases') {
      setFilter('active');
      setType('info');
      setCampaignName('Novas Bases e Módulos Disponíveis');
      setTitle('🎉 Novidade: Módulos Atualizados no Shazam!');
      setMessage('Novas bases de inteligência foram integradas hoje. Entre no sistema para conferir os novos dados disponíveis para suas consultas.');
    } else if (templateType === 'active_promo') {
      setFilter('all');
      setType('success');
      setCampaignName('Comunicado Geral do Sistema');
      setTitle('⚡ Comunicado da Equipe Técnica Shazam');
      setMessage('Todos os módulos e robôs de busca estão operando em velocidade máxima com latência reduzida.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 2MB.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMessage('Por favor preencha o título e a mensagem da campanha.');
      return;
    }

    if (targetUsersCount === 0) {
      setErrorMessage('Nenhum usuário encontrado para o filtro selecionado.');
      return;
    }

    const confirmed = window.confirm(
      `Confirma o disparo desta campanha WebPush para ${targetUsersCount} usuário(s)?`
    );
    if (!confirmed) return;

    setIsBroadcasting(true);
    setErrorMessage(null);
    setBroadcastResult(null);

    try {
      const finalName = campaignName.trim() || `Campanha - ${title.trim().slice(0, 30)}`;
      const res = await broadcastPushCampaign({
        name: finalName,
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        filter,
        type,
        sentBy: currentUserEmail || 'Administrador Master',
        usersList,
      });

      setBroadcastResult({
        success: true,
        deliveredCount: res.campaign.deliveredCount,
        campaignName: finalName,
      });

      // Recarrega o histórico
      await loadHistory();
      if (onCampaignSent) onCampaignSent();
    } catch (err) {
      console.error('[PushCampaignsTab] Erro ao disparar campanha:', err);
      setErrorMessage('Erro ao disparar campanha. Tente novamente.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header com Resumo de Segmentação */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#002b29] border border-[#003734] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#00827c]/20 border border-[#00827c] flex items-center justify-center text-[#79fbf5] shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#ffffff] tracking-wide flex items-center gap-2">
              Campanhas WebPush para Usuários
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00827c] text-[#012624] font-bold">
                PRO BROADCAST
              </span>
            </h2>
            <p className="text-xs text-[#899392] font-sans">
              Envio em lote de notificações WebPush com foto, texto e link diretamente no navegador dos clientes
            </p>
          </div>
        </div>

        {/* Templates Rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#707777] font-sans">Modelos prontos:</span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('expiring_3d')}
            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/50 text-rose-300 text-[11px] font-bold cursor-pointer transition-colors"
          >
            Expira em 3 Dias
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('expiring_7d')}
            className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-amber-300 text-[11px] font-bold cursor-pointer transition-colors"
          >
            Expira em 7 Dias
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('new_bases')}
            className="px-2.5 py-1 rounded-lg bg-[#003734] hover:bg-[#00827c]/30 border border-[#00827c]/50 text-[#79fbf5] text-[11px] font-bold cursor-pointer transition-colors"
          >
            Novas Bases
          </button>
        </div>
      </div>

      {/* Grid Principal: Formulário + Preview Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Criação (7 colunas) */}
        <div className="lg:col-span-7 bg-[#002b29] border border-[#003734] rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#003734] pb-3">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#79fbf5]" />
              Configurar Nova Campanha
            </h3>
            <span className="text-xs text-[#707777]">
              {targetUsersCount} usuário(s) no filtro
            </span>
          </div>

          {broadcastResult && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border-2 border-emerald-500 text-emerald-300 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Campanha disparada com sucesso!
              </div>
              <p className="font-sans">
                A campanha <strong>"{broadcastResult.campaignName}"</strong> foi entregue para{' '}
                <strong>{broadcastResult.deliveredCount}</strong> usuário(s) em tempo real.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitCampaign} className="space-y-4">
            {/* Nome da Campanha */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                Nome de Identificação da Campanha:
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Campanha Renovação Urgente 3 Dias"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#001716] border border-[#00827c] text-[#ffffff] placeholder-[#707777] text-xs focus:outline-none focus:border-[#79fbf5]"
              />
            </div>

            {/* SELEÇÃO DO FILTRO DE USUÁRIOS (REQUISITO FUNDAMENTAL) */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-2 flex items-center justify-between">
                <span>Segmentação de Usuários (Filtro): <span className="text-red-400">*</span></span>
                <span className="text-[11px] text-[#79fbf5]">
                  Alvo atual: {targetUsersCount} usuário(s)
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Ativos */}
                <button
                  type="button"
                  onClick={() => setFilter('active')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    filter === 'active'
                      ? 'bg-[#003734] border-[#79fbf5] text-[#ffffff] ring-1 ring-[#79fbf5]'
                      : 'bg-[#001716] border-[#003734] text-[#899392] hover:border-[#00827c]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <div>
                      <div className="text-xs font-bold text-[#ffffff]">Usuários Ativos</div>
                      <div className="text-[10px] text-[#707777] font-sans">Contas com plano válido</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-500/40">
                    {countsByFilter.active}
                  </span>
                </button>

                {/* 2. Expira em 7 dias */}
                <button
                  type="button"
                  onClick={() => setFilter('expiring_7d')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    filter === 'expiring_7d'
                      ? 'bg-[#003734] border-amber-400 text-[#ffffff] ring-1 ring-amber-400'
                      : 'bg-[#001716] border-[#003734] text-[#899392] hover:border-[#00827c]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <div>
                      <div className="text-xs font-bold text-[#ffffff]">Expira em 7 Dias</div>
                      <div className="text-[10px] text-[#707777] font-sans">Aviso preventivo</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 text-xs font-bold border border-amber-500/40">
                    {countsByFilter.expiring_7d}
                  </span>
                </button>

                {/* 3. Expira em 3 dias */}
                <button
                  type="button"
                  onClick={() => setFilter('expiring_3d')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    filter === 'expiring_3d'
                      ? 'bg-[#003734] border-rose-500 text-[#ffffff] ring-1 ring-rose-500'
                      : 'bg-[#001716] border-[#003734] text-[#899392] hover:border-[#00827c]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                    <div>
                      <div className="text-xs font-bold text-[#ffffff]">Expira em 3 Dias</div>
                      <div className="text-[10px] text-[#707777] font-sans">Urgência de renovação</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 text-xs font-bold border border-rose-500/40">
                    {countsByFilter.expiring_3d}
                  </span>
                </button>

                {/* 4. Expirados / Bloqueados */}
                <button
                  type="button"
                  onClick={() => setFilter('expired')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    filter === 'expired'
                      ? 'bg-[#003734] border-[#79fbf5] text-[#ffffff] ring-1 ring-[#79fbf5]'
                      : 'bg-[#001716] border-[#003734] text-[#899392] hover:border-[#00827c]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    <div>
                      <div className="text-xs font-bold text-[#ffffff]">Expirados / Bloqueados</div>
                      <div className="text-[10px] text-[#707777] font-sans">Recuperação de clientes</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-xs font-bold border border-slate-700">
                    {countsByFilter.expired}
                  </span>
                </button>

                {/* 5. Todos os Usuários */}
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 sm:col-span-2 ${
                    filter === 'all'
                      ? 'bg-[#003734] border-[#79fbf5] text-[#ffffff] ring-1 ring-[#79fbf5]'
                      : 'bg-[#001716] border-[#003734] text-[#899392] hover:border-[#00827c]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#79fbf5]" />
                    <div>
                      <div className="text-xs font-bold text-[#ffffff]">Todos os Usuários Cadastrados</div>
                      <div className="text-[10px] text-[#707777] font-sans">Broadcast global para todos os clientes</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-[#00827c]/40 text-[#79fbf5] text-xs font-bold border border-[#00827c]">
                    {countsByFilter.all}
                  </span>
                </button>
              </div>
            </div>

            {/* Título do WebPush */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                Título do WebPush: <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 🚨 Aviso de Renovação Shazam"
                maxLength={70}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#001716] border border-[#00827c] text-[#ffffff] placeholder-[#707777] text-xs focus:outline-none focus:border-[#79fbf5]"
              />
            </div>

            {/* Mensagem / Texto */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                Mensagem de Texto: <span className="text-red-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Texto da notificação que aparecerá para o usuário..."
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#001716] border border-[#00827c] text-[#ffffff] placeholder-[#707777] text-xs font-sans focus:outline-none focus:border-[#79fbf5] resize-y"
              />
            </div>

            {/* Anexar Foto / Banner */}
            <div className="p-3.5 rounded-xl bg-[#001716] border border-[#003734] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#bbc7c6] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#79fbf5]" />
                  Anexar Foto / Imagem / Banner (Opcional):
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover Foto
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="url"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Cole o link da imagem (URL)"
                  className="w-full px-3 py-2 rounded-lg bg-[#002b29] border border-[#00827c]/60 text-[#ffffff] placeholder-[#707777] text-xs focus:outline-none focus:border-[#79fbf5]"
                />
                <label className="px-3 py-2 rounded-lg bg-[#003734] hover:bg-[#00827c]/30 text-[#cbfffc] border border-[#00827c]/50 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <UploadCloud className="w-4 h-4 text-[#79fbf5]" />
                  <span>Carregar do Computador</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {imageUrl && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-[#00827c] max-h-36 bg-black/40 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Preview Anexo"
                    className="w-full max-h-36 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Link de Redirecionamento */}
            <div className="p-3.5 rounded-xl bg-[#001716] border border-[#003734] space-y-2">
              <label className="block text-xs font-semibold text-[#bbc7c6] flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-[#79fbf5]" />
                Link de Redirecionamento / Ação (Opcional):
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Ex: https://wa.me/55... ou link de pagamento PIX"
                className="w-full px-3 py-2 rounded-lg bg-[#002b29] border border-[#00827c]/60 text-[#ffffff] placeholder-[#707777] text-xs focus:outline-none focus:border-[#79fbf5]"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                <span className="text-[#707777]">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setLinkUrl('https://wa.me/')}
                  className="px-2 py-0.5 rounded bg-[#003734] hover:bg-[#00827c]/40 text-[#79fbf5] cursor-pointer"
                >
                  WhatsApp Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => setLinkUrl(window.location.origin)}
                  className="px-2 py-0.5 rounded bg-[#003734] hover:bg-[#00827c]/40 text-[#79fbf5] cursor-pointer"
                >
                  Terminal Shazam
                </button>
              </div>
            </div>

            {/* Botão de Disparo */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-broadcast-campaign"
                disabled={isBroadcasting || targetUsersCount === 0}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#00827c] via-[#00a8a0] to-[#79fbf5] hover:opacity-95 text-[#012624] font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-[#00827c]/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBroadcasting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#012624] border-t-transparent rounded-full animate-spin" />
                    <span>Disparando WebPush para {targetUsersCount} Usuários...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Disparar Campanha para {targetUsersCount} Usuário(s)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Coluna da Direita: Preview Interativo + Histórico (5 colunas) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card de Prévia Dinâmica do WebPush */}
          <div className="bg-[#002b29] border border-[#003734] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#003734] pb-2.5">
              <span className="text-xs font-bold text-[#ffffff] flex items-center gap-1.5 uppercase tracking-wider">
                <Bell className="w-4 h-4 text-[#79fbf5]" />
                Prévia do WebPush
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#003734] text-[#79fbf5]">
                Desktop & Mobile
              </span>
            </div>

            {/* Simulação da Notificação Nativa */}
            <div className="p-4 rounded-xl bg-[#001716] border-2 border-[#00827c] shadow-xl shadow-black/90 space-y-3 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00827c]/20 border border-[#00827c] flex items-center justify-center text-[#79fbf5] shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#ffffff] truncate">
                      {title || 'Título da Notificação'}
                    </span>
                    <span className="text-[10px] text-[#707777] shrink-0">agora</span>
                  </div>
                  <p className="text-xs text-[#cbfffc] font-sans mt-1 leading-relaxed break-words">
                    {message || 'O corpo da mensagem de WebPush será exibido aqui...'}
                  </p>
                </div>
              </div>

              {imageUrl && (
                <div className="rounded-lg overflow-hidden border border-[#003734] max-h-36">
                  <img
                    src={imageUrl}
                    alt="Preview Campanha"
                    className="w-full h-36 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {linkUrl && (
                <div className="pt-2 border-t border-[#003734] flex items-center justify-between text-[11px]">
                  <span className="text-[#707777]">shazam.buscas.app</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#79fbf5] hover:underline cursor-pointer">
                    Abrir Link <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#707777] font-sans leading-relaxed">
              * Quando disparado, os usuários com permissão concedida receberão esta notificação na área de trabalho e na tela do smartphone, além do toast em tempo real no sistema.
            </p>
          </div>

          {/* Histórico Recente de Campanhas */}
          <div className="bg-[#002b29] border border-[#003734] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#003734] pb-2.5">
              <span className="text-xs font-bold text-[#ffffff] flex items-center gap-1.5 uppercase tracking-wider">
                <History className="w-4 h-4 text-[#79fbf5]" />
                Histórico de Campanhas
              </span>
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="text-[11px] text-[#79fbf5] hover:underline cursor-pointer"
              >
                {isLoadingHistory ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            {campaignsHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#707777]">
                Nenhuma campanha registrada no histórico recente.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {campaignsHistory.slice(0, 8).map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3 rounded-xl bg-[#001716] border border-[#003734] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#ffffff] truncate">{camp.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#003734] text-[#79fbf5] font-semibold shrink-0">
                        {camp.deliveredCount} entregues
                      </span>
                    </div>

                    <p className="text-[#899392] font-sans text-[11px] line-clamp-2">
                      {camp.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#707777] pt-1">
                      <span>Filtro: <strong className="text-[#cbfffc]">{camp.filter}</strong></span>
                      <span>{new Date(camp.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
