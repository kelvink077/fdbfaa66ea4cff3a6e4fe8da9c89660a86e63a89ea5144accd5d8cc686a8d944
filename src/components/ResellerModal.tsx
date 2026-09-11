import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowUpRight, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Wallet,
  Coins,
  RefreshCw,
  HelpCircle,
  QrCode
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { ReferralLead, WithdrawalOrder, ResellerWallet } from '../types';
import { 
  generateResellerCode, 
  buildReferralUrl, 
  loadResellerDashboard, 
  requestWithdrawalOrder, 
  createSimulatedReferral 
} from '../lib/resellerService';

interface ResellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onLoginGoogle?: () => void;
}

export const ResellerModal: React.FC<ResellerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginGoogle,
}) => {
  const [activeTab, setActiveTab] = useState<'cadastros' | 'saque' | 'simular'>('cadastros');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dados do revendedor
  const [wallet, setWallet] = useState<ResellerWallet | null>(null);
  const [referrals, setReferrals] = useState<ReferralLead[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalOrder[]>([]);

  // Filtro de indicações
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulário de ordem de saque
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [pixKey, setPixKey] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<string>('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // Simulador de indicação
  const [simName, setSimName] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [simPlan, setSimPlan] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [simIsPaid, setSimIsPaid] = useState<boolean>(true);
  const [simSuccessMsg, setSimSuccessMsg] = useState('');

  // Código de indicação do revendedor
  const resellerCode = useMemo(() => {
    if (!currentUser) return 'operador';
    return generateResellerCode(currentUser.uid, currentUser.email || undefined);
  }, [currentUser]);

  const referralUrl = useMemo(() => {
    return buildReferralUrl(resellerCode);
  }, [resellerCode]);

  // Carregar dados da carteira e indicações
  const loadData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const uid = currentUser?.uid || 'guest_operator';
      const data = await loadResellerDashboard(uid, resellerCode);
      setWallet(data.wallet);
      setReferrals(data.referrals);
      setWithdrawals(data.withdrawals);
      
      // Auto-preencher titular se vazio
      if (!accountHolder && currentUser?.displayName) {
        setAccountHolder(currentUser.displayName);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do revendedor:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setWithdrawError('');
      setWithdrawSuccess('');
    }
  }, [isOpen, currentUser, resellerCode]);

  // Copiar link de indicação
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Enviar ordem de saque
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!currentUser) {
      setWithdrawError('Você precisa estar autenticado para emitir ordem de saque.');
      return;
    }

    const amountNum = parseFloat(withdrawalAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Informe um valor de saque válido acima de R$ 0,00.');
      return;
    }

    if (!wallet || amountNum > wallet.availableBalance) {
      setWithdrawError(
        `Saldo insuficiente para este valor. Disponível para saque: R$ ${(wallet?.availableBalance || 0)
          .toFixed(2)
          .replace('.', ',')}`
      );
      return;
    }

    if (!pixKey.trim()) {
      setWithdrawError('Por favor informe a sua chave PIX de recebimento.');
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const order = await requestWithdrawalOrder({
        resellerId: currentUser.uid,
        resellerEmail: currentUser.email || '',
        resellerName: currentUser.displayName || resellerCode,
        amount: amountNum,
        pixKeyType,
        pixKey: pixKey.trim(),
        accountHolder: accountHolder.trim() || currentUser.displayName || 'Titular',
      });

      if (order && order.id) {
        setWithdrawSuccess(
          `Ordem de saque nº ${order.id} emitida com sucesso! O pagamento tem até 24 horas no prazo médio para ser creditado na sua chave PIX.`
        );
        setWithdrawalAmount('');
        // Recarrega os dados imediatamente
        await loadData(true);
      } else {
        setWithdrawError('Falha ao processar ordem de saque.');
      }
    } catch (err: any) {
      setWithdrawError(err?.message || 'Erro ao registrar ordem de saque.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Criar lead de teste no simulador
  const handleSimulateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim() || !simEmail.trim()) return;

    const uid = currentUser?.uid || 'guest_operator';
    await createSimulatedReferral({
      resellerId: uid,
      resellerCode,
      referredName: simName.trim(),
      referredEmail: simEmail.trim(),
      isPaid: simIsPaid,
      planId: simPlan,
    });

    setSimSuccessMsg(
      simIsPaid
        ? `Cadastro simulado com pagamento confirmado! Comissão de 15% creditada no saldo disponível.`
        : `Cadastro simulado registrado! Como está em teste 24h sem pagamento, a comissão permanece como renda estimada pendente.`
    );
    setSimName('');
    setSimEmail('');
    await loadData(true);
    setTimeout(() => setSimSuccessMsg(''), 6000);
  };

  // Filtragem de indicações
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesFilter =
        filterStatus === 'all'
          ? true
          : filterStatus === 'paid'
          ? r.status === 'paid'
          : r.status === 'pending_payment';

      if (!matchesFilter) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        (r.planName && r.planName.toLowerCase().includes(term))
      );
    });
  }, [referrals, filterStatus, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        id="modal-area-revendedor"
        className="relative w-full max-w-5xl bg-[#011d1c] border border-[#003734] rounded-[16px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        {/* Top Header */}
        <div className="px-6 py-5 bg-[#002422] border-b border-[#003734] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00827c] to-[#004d49] border border-[#cbfffc]/30 flex items-center justify-center text-[#cbfffc] shadow-md shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-[#ffffff] tracking-tight">
                  Área do Revendedor & Afiliados
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166] text-[10px] font-mono font-bold uppercase">
                  15% de Comissão
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#003734] text-[#cbfffc] text-[10px] font-mono">
                  Saque em até 24h
                </span>
              </div>
              <p className="text-xs text-[#bbc7c6] mt-0.5">
                Indique o Shazam Buscas, acompanhe quem se cadastrou no seu link e receba 15% de cada plano pago.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[#003734] hover:bg-[#004d49] text-[#cbfffc] transition-colors cursor-pointer border border-[#00827c]/40"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="btn-fechar-modal-revendedor"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#003734] hover:bg-[#004d49] text-[#bbc7c6] hover:text-[#ffffff] transition-colors cursor-pointer border border-[#00827c]/40"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body with Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Se não autenticado: aviso amigável */}
          {!currentUser && (
            <div className="p-4 rounded-xl bg-[#ffd166]/10 border border-[#ffd166]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[#ffd166] shrink-0" />
                <div className="text-xs text-[#edfffe]">
                  <strong className="text-[#ffd166]">Acesso no modo demonstração.</strong> Entre com a sua conta Google para vincular seu link oficial exclusivo e salvar suas ordens de saque na nuvem.
                </div>
              </div>
              {onLoginGoogle && (
                <button
                  onClick={onLoginGoogle}
                  className="px-4 py-2 rounded-lg bg-[#ffd166] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider shrink-0 cursor-pointer shadow hover:opacity-95"
                >
                  Entrar com Google
                </button>
              )}
            </div>
          )}

          {/* Link Exclusivo do Revendedor */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#002422] border border-[#00827c]/50 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#cbfffc] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#cbfffc] animate-pulse"></span>
                    Seu Link de Indicação Oficial
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#011a19] text-[#ffd166] border border-[#ffd166]/30">
                    Comissão de 15%
                  </span>
                </div>
                <p className="text-xs text-[#bbc7c6]">
                  Envie este link para clientes, grupos, escritórios e parceiros. Quem se cadastrar através dele será vinculado à sua conta.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-lg bg-[#011a19] border border-[#003734] font-mono text-xs text-[#cbfffc] max-w-xs truncate select-all">
                  {referralUrl}
                </div>
                <button
                  id="btn-copiar-link-revendedor"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-mono font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Sub-info sobre regra mandatória de pagamento */}
            <div className="mt-3 pt-3 border-t border-[#003734] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#bbc7c6]/80">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Rastreamento automático via Cookie e Firestore</span>
              </div>
              <div className="text-[#ffd166]">
                ▸ A comissão de 15% é creditada após o pagamento do plano
              </div>
            </div>
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Saldo Disponível para Saque */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#003734] to-[#002422] border border-[#00827c]/60 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#ffd166] font-bold">
                  Saldo Disponível
                </span>
                <Wallet className="w-4 h-4 text-[#ffd166]" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#ffffff]">
                R$ {wallet ? wallet.availableBalance.toFixed(2).replace('.', ',') : '0,00'}
              </div>
              <div className="mt-2 text-[10px] font-mono text-[#cbfffc] flex items-center justify-between">
                <span>Liberado para PIX</span>
                <button
                  onClick={() => {
                    setActiveTab('saque');
                    if (wallet && wallet.availableBalance > 0) {
                      setWithdrawalAmount(wallet.availableBalance.toFixed(2));
                    }
                  }}
                  className="underline hover:text-white cursor-pointer"
                >
                  Sacar agora →
                </button>
              </div>
            </div>

            {/* Renda Estimada / Pendente */}
            <div className="p-4 rounded-xl bg-[#002422] border border-[#003734]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#bbc7c6]">
                  Renda Estimada
                </span>
                <TrendingUp className="w-4 h-4 text-[#cbfffc]" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#cbfffc]">
                R$ {wallet ? wallet.pendingIncome.toFixed(2).replace('.', ',') : '0,00'}
              </div>
              <div className="mt-2 text-[10px] font-mono text-[#bbc7c6]/70">
                Pendente de pagamento do indicado
              </div>
            </div>

            {/* Total de Cadastros */}
            <div className="p-4 rounded-xl bg-[#002422] border border-[#003734]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#bbc7c6]">
                  Cadastros no Link
                </span>
                <Users className="w-4 h-4 text-[#cbfffc]" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#ffffff]">
                {wallet ? wallet.totalReferrals : 0}
              </div>
              <div className="mt-2 text-[10px] font-mono text-[#bbc7c6]/70">
                {wallet ? wallet.paidReferrals : 0} pagos • {(wallet ? wallet.totalReferrals - wallet.paidReferrals : 0)} em teste
              </div>
            </div>

            {/* Total Sacado */}
            <div className="p-4 rounded-xl bg-[#002422] border border-[#003734]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#bbc7c6]">
                  Total Já Sacado
                </span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                R$ {wallet ? wallet.totalWithdrawn.toFixed(2).replace('.', ',') : '0,00'}
              </div>
              <div className="mt-2 text-[10px] font-mono text-emerald-400/80 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Prazo: até 24h
              </div>
            </div>
          </div>

          {/* Banner de Regra Obrigatória de Negócio */}
          <div className="p-3.5 rounded-xl bg-[#003734]/50 border border-[#00827c]/40 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#ffd166] mt-0.5 shrink-0" />
            <div className="text-xs text-[#bbc7c6] leading-relaxed">
              <strong className="text-[#ffffff]">Condição de Pagamento de Comissão:</strong> Cada recomendação vale exatamente{' '}
              <span className="text-[#ffd166] font-bold">15% do valor do plano contratado</span>. Para que você receba a comissão, o usuário cadastrado no seu link{' '}
              <strong className="text-[#cbfffc]">deve ter efetuado o pagamento via PIX</strong> do plano. Usuários que apenas se cadastraram e estão em período de teste gratuito de 24 horas não geram comissão liberada para saque até que realizem o pagamento.
            </div>
          </div>

          {/* Tabs de Navegação */}
          <div className="flex items-center justify-between border-b border-[#003734] pt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setActiveTab('cadastros')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'cadastros'
                    ? 'bg-[#00827c] text-[#011d1c] font-bold shadow'
                    : 'bg-[#002422] text-[#bbc7c6] hover:text-[#cbfffc]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cadastros no seu Link ({referrals.length})</span>
              </button>

              <button
                id="tab-saque-revendedor"
                onClick={() => setActiveTab('saque')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'saque'
                    ? 'bg-[#00827c] text-[#011d1c] font-bold shadow'
                    : 'bg-[#002422] text-[#bbc7c6] hover:text-[#cbfffc]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Emitir Ordem de Saque</span>
                {wallet && wallet.availableBalance > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ffd166] text-[#011d1c] font-bold">
                    R$ {wallet.availableBalance.toFixed(0)}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('simular')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'simular'
                    ? 'bg-[#00827c] text-[#011d1c] font-bold shadow'
                    : 'bg-[#002422] text-[#bbc7c6] hover:text-[#cbfffc]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
                <span>Simulador de Teste</span>
              </button>
            </div>

            <div className="text-xs font-mono text-[#bbc7c6]/70 hidden sm:block">
              Atualização automática
            </div>
          </div>

          {/* TAB 1: LISTA DE QUEM SE CADASTROU NO LINK */}
          {activeTab === 'cadastros' && (
            <div className="space-y-4">
              {/* Filtros e Busca */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-[#003734] text-[#cbfffc] border border-[#00827c]'
                        : 'bg-[#011a19] text-[#bbc7c6] hover:text-white'
                    }`}
                  >
                    Todos ({referrals.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('paid')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1 ${
                      filterStatus === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-[#011a19] text-[#bbc7c6] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Pagos ({referrals.filter((r) => r.status === 'paid').length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1 ${
                      filterStatus === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-[#011a19] text-[#bbc7c6] hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    Aguardando Pagamento ({referrals.filter((r) => r.status === 'pending_payment').length})
                  </button>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                    className="w-full bg-[#011a19] border border-[#003734] focus:border-[#00827c] rounded-lg px-3 py-1.5 text-xs text-[#cbfffc] placeholder-[#707777] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Tabela de Indicações */}
              <div className="rounded-xl border border-[#003734] bg-[#002422] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#011a19] border-b border-[#003734] text-[#bbc7c6] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Indicado (Nome & E-mail)</th>
                        <th className="py-3 px-4">Data do Cadastro</th>
                        <th className="py-3 px-4">Plano / Valor</th>
                        <th className="py-3 px-4">Status de Pagamento</th>
                        <th className="py-3 px-4 text-right">Renda / Comissão (15%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003734]/60">
                      {filteredReferrals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-[#bbc7c6]">
                            Nenhum cadastro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        filteredReferrals.map((lead) => {
                          const isPaid = lead.status === 'paid';
                          return (
                            <tr key={lead.id} className="hover:bg-[#003734]/30 transition-colors">
                              {/* Nome e E-mail */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-sm text-[#ffffff]">
                                  {lead.name}
                                </div>
                                <div className="text-[11px] text-[#cbfffc]/80 mt-0.5 select-all">
                                  {lead.email}
                                </div>
                              </td>

                              {/* Data */}
                              <td className="py-3.5 px-4 text-[#bbc7c6]">
                                {new Date(lead.registeredAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>

                              {/* Plano */}
                              <td className="py-3.5 px-4">
                                <span className="text-[#ffffff] font-medium">
                                  {lead.planName || 'Teste Grátis 24h'}
                                </span>
                                {lead.planAmount && lead.planAmount > 0 ? (
                                  <div className="text-[10px] text-[#ffd166]">
                                    R$ {lead.planAmount.toFixed(2).replace('.', ',')}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[#707777]">
                                    Sem pagamento ainda
                                  </div>
                                )}
                              </td>

                              {/* Status do Pagamento */}
                              <td className="py-3.5 px-4">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    PAGAMENTO EFETUADO
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    Aguardando Pagamento
                                  </span>
                                )}
                              </td>

                              {/* Renda Estimada / Comissão de 15% */}
                              <td className="py-3.5 px-4 text-right">
                                {isPaid ? (
                                  <div>
                                    <span className="text-sm font-bold text-emerald-400">
                                      + R$ {lead.commissionValue.toFixed(2).replace('.', ',')}
                                    </span>
                                    <div className="text-[9px] text-[#cbfffc] uppercase">
                                      Liberado no Saldo
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-xs font-semibold text-amber-400">
                                      ~ R$ {lead.estimatedIncome.toFixed(2).replace('.', ',')}
                                    </span>
                                    <div className="text-[9px] text-[#707777] uppercase">
                                      Renda Estimada Pendente
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dica explicativa */}
              <div className="p-3 rounded-lg bg-[#011a19] border border-[#003734] text-[11px] font-mono text-[#bbc7c6] flex items-center justify-between">
                <span>
                  💡 <strong>Informações Transparentes:</strong> Você visualiza em tempo real quem e qual e-mail se cadastrou no seu link, permitindo fazer follow-up para ajudá-los a escolher um plano.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: EMISSÃO E HISTÓRICO DE ORDENS DE SAQUE */}
          {activeTab === 'saque' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Formulário de Saque (7 colunas) */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-[#002422] border border-[#003734] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#ffffff] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#ffd166]" />
                    Emitir Ordem de Saque
                  </h3>
                  <div className="text-xs font-mono text-[#cbfffc]">
                    Disponível: <strong>R$ {wallet ? wallet.availableBalance.toFixed(2).replace('.', ',') : '0,00'}</strong>
                  </div>
                </div>

                {/* Prazo Obrigatório em Destaque */}
                <div className="p-3 rounded-xl bg-[#003734]/70 border border-[#00827c]/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#cbfffc]">
                    <Clock className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span>PRAZO MÉDIO DE COMPENSAÇÃO: EM ATÉ 24 HORAS</span>
                  </div>
                  <p className="text-[11px] text-[#bbc7c6] leading-snug">
                    Após a emissão, nossa tesouraria processa o repasse diretamente na sua chave PIX no prazo médio de até 24 horas.
                  </p>
                </div>

                {withdrawError && (
                  <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {withdrawSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{withdrawSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleRequestWithdrawal} className="space-y-4 text-xs font-mono">
                  {/* Valor do Saque */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[#bbc7c6] uppercase tracking-wider text-[10px]">
                        Valor a Sacar (R$)
                      </label>
                      {wallet && wallet.availableBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setWithdrawalAmount(wallet.availableBalance.toFixed(2))}
                          className="text-[10px] text-[#ffd166] hover:underline cursor-pointer"
                        >
                          Sacar Saldo Total (R$ {wallet.availableBalance.toFixed(2).replace('.', ',')})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707777] font-bold">
                        R$
                      </span>
                      <input
                        type="text"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Ex: 50,00"
                        className="w-full bg-[#011a19] border border-[#003734] focus:border-[#00827c] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#ffffff] font-bold outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Tipo de Chave PIX */}
                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1.5">
                      Tipo de Chave PIX
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['cpf', 'cnpj', 'email', 'phone', 'random'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPixKeyType(type)}
                          className={`py-1.5 px-2 rounded-md text-[10px] font-mono uppercase transition-colors ${
                            pixKeyType === type
                              ? 'bg-[#00827c] text-[#011d1c] font-bold'
                              : 'bg-[#011a19] text-[#bbc7c6] border border-[#003734]'
                          }`}
                        >
                          {type === 'phone' ? 'Celular' : type === 'random' ? 'Aleatória' : type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chave PIX */}
                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1.5">
                      Chave PIX de Destino
                    </label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder={
                        pixKeyType === 'cpf'
                          ? '000.000.000-00'
                          : pixKeyType === 'email'
                          ? 'seu.pix@banco.com'
                          : pixKeyType === 'phone'
                          ? '(11) 99999-9999'
                          : 'Chave PIX'
                      }
                      className="w-full bg-[#011a19] border border-[#003734] focus:border-[#00827c] rounded-lg px-3 py-2.5 text-xs text-[#cbfffc] outline-none font-mono"
                      required
                    />
                  </div>

                  {/* Titular da Conta */}
                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1.5">
                      Nome do Titular da Conta
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Nome completo do titular"
                      className="w-full bg-[#011a19] border border-[#003734] focus:border-[#00827c] rounded-lg px-3 py-2 text-xs text-[#ffffff] outline-none font-mono"
                      required
                    />
                  </div>

                  <button
                    id="btn-confirmar-ordem-saque"
                    type="submit"
                    disabled={isSubmittingWithdrawal || !wallet || wallet.availableBalance <= 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00827c] via-[#00a8a0] to-[#ffd166] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmittingWithdrawal
                        ? 'Registrando Ordem...'
                        : wallet && wallet.availableBalance > 0
                        ? 'Confirmar Ordem de Saque (Prazo: até 24h)'
                        : 'Saldo Insuficiente para Saque'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Histórico de Saques (5 colunas) */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-[#002422] border border-[#003734] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#ffffff] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#cbfffc]" />
                    Histórico de Saques Solicitados
                  </h3>
                  <span className="text-[10px] font-mono text-[#bbc7c6]">
                    {withdrawals.length} ordens registradas
                  </span>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {withdrawals.length === 0 ? (
                    <div className="py-12 text-center text-xs font-mono text-[#bbc7c6]/70 border border-dashed border-[#003734] rounded-xl">
                      Nenhuma ordem de saque emitida ainda.<br />
                      Assim que atingir saldo disponível em comissões, você poderá solicitar resgates via PIX.
                    </div>
                  ) : (
                    withdrawals.map((order) => (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-xl bg-[#011a19] border border-[#003734] space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[#cbfffc] font-bold">
                            {order.id}
                          </span>
                          <span className="text-base font-bold text-[#ffffff]">
                            R$ {order.amount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#bbc7c6]">
                          <span className="truncate max-w-[200px]">
                            Chave {order.pixKeyType.toUpperCase()}: <strong className="text-white">{order.pixKey}</strong>
                          </span>
                          <span>
                            {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-[#003734] flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {order.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PAGO VIA PIX
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> EM PROCESSAMENTO
                              </span>
                            )}
                          </div>
                          <span className="text-[#ffd166] font-mono">
                            Prazo: {order.estimatedPaymentTime || 'Em até 24 horas'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SIMULADOR DE TESTE (Para validação rápida do usuário) */}
          {activeTab === 'simular' && (
            <div className="p-5 rounded-2xl bg-[#002422] border border-[#003734] space-y-4 max-w-2xl mx-auto">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ffd166]" />
                  Simulador de Novos Cadastros & Comissões
                </h3>
                <p className="text-xs text-[#bbc7c6] mt-1">
                  Use esta ferramenta para testar o comportamento em tempo real: simule um cliente que se cadastrou no seu link, escolha se ele já pagou o plano ou se ainda está em teste de 24h sem pagar, e veja como a comissão de 15% e o saldo disponível se comportam.
                </p>
              </div>

              {simSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{simSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSimulateLead} className="space-y-4 text-xs font-mono">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1">
                      Nome do Novo Indicado
                    </label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      placeholder="Ex: Gabriel Santos"
                      className="w-full bg-[#011a19] border border-[#003734] rounded-lg px-3 py-2 text-xs text-white outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1">
                      E-mail do Novo Indicado
                    </label>
                    <input
                      type="email"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      placeholder="Ex: gabriel.santos@email.com"
                      className="w-full bg-[#011a19] border border-[#003734] rounded-lg px-3 py-2 text-xs text-white outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1">
                      Plano de Referência
                    </label>
                    <select
                      value={simPlan}
                      onChange={(e) => setSimPlan(e.target.value as any)}
                      className="w-full bg-[#011a19] border border-[#003734] rounded-lg px-3 py-2 text-xs text-[#cbfffc] outline-none"
                    >
                      <option value="weekly">Plano Semanal (R$ 11,00 • Comissão R$ 1,65)</option>
                      <option value="biweekly">Plano 15 Dias (R$ 19,90 • Comissão R$ 2,98)</option>
                      <option value="monthly">Plano Mensal (R$ 35,00 • Comissão R$ 5,25)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider text-[10px] mb-1">
                      Status do Pagamento
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-white">
                        <input
                          type="radio"
                          name="isPaid"
                          checked={simIsPaid}
                          onChange={() => setSimIsPaid(true)}
                        />
                        <span>Pagamento Efetuado (Libera 15%)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-amber-300">
                        <input
                          type="radio"
                          name="isPaid"
                          checked={!simIsPaid}
                          onChange={() => setSimIsPaid(false)}
                        />
                        <span>Em Teste (Sem Pagamento)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#00827c] hover:bg-[#009b94] text-[#011d1c] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Simular Entrada de Novo Cadastro
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#002422] border-t border-[#003734] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#bbc7c6]/70 flex items-center gap-2">
            <span>Suporte do Revendedor:</span>
            <a
              href="https://t.me/mind7painel"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#cbfffc] hover:underline flex items-center gap-1"
            >
              Telegram Oficial <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[#003734] hover:bg-[#004d49] text-[#cbfffc] font-bold transition-colors cursor-pointer"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
