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
  ArrowLeft,
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
  QrCode,
  Lock,
  Search,
  Filter,
  LogOut,
  Mail,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { ReferralLead, WithdrawalOrder, ResellerWallet } from '../types';
import { 
  generateResellerCode, 
  buildReferralUrl, 
  loadResellerDashboard, 
  requestWithdrawalOrder, 
  createSimulatedReferral,
  COMMISSION_PERCENT,
  PLAN_PRICING
} from '../lib/resellerService';
import { ShazamLogo } from './ShazamLogo';

interface ResellerPortalPageProps {
  currentUser: FirebaseUser | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onBackToTerminal: () => void;
}

export const ResellerPortalPage: React.FC<ResellerPortalPageProps> = ({
  currentUser,
  onLoginGoogle,
  onLogoutGoogle,
  onBackToTerminal,
}) => {
  const [activeTab, setActiveTab] = useState<'cadastros' | 'saque' | 'simular' | 'regras'>('cadastros');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

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
      
      if (!accountHolder && currentUser?.displayName) {
        setAccountHolder(currentUser.displayName);
      }
    } catch (err) {
      console.warn('[ResellerPortal] Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, resellerCode]);

  // Copiar link de indicação
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = referralUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `⚡ Olá! Conheça a plataforma Shazam Buscas B2B — inteligência cadastral e investigativa completa (CPF, CNPJ, Placa, Telefone, Dossiês e muito mais).\n\nExperimente o teste grátis acessando o meu link oficial:\n${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Solicitar saque
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!currentUser) {
      setWithdrawError('É necessário estar autenticado com o Google para emitir ordens de saque.');
      return;
    }

    const numAmount = parseFloat(withdrawalAmount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setWithdrawError('Informe um valor de saque válido.');
      return;
    }

    if (numAmount < 5.0) {
      setWithdrawError('O valor mínimo para solicitação de saque é de R$ 5,00.');
      return;
    }

    const available = wallet?.availableBalance || 0;
    if (numAmount > available) {
      setWithdrawError(`Saldo insuficiente. Seu saldo liberado para saque é de R$ ${available.toFixed(2)}.`);
      return;
    }

    if (!pixKey.trim()) {
      setWithdrawError('Informe a sua chave PIX para recebimento.');
      return;
    }

    if (!accountHolder.trim()) {
      setWithdrawError('Informe o nome completo do titular da conta bancária.');
      return;
    }

    try {
      setIsSubmittingWithdrawal(true);
      const order = await requestWithdrawalOrder({
        resellerId: currentUser.uid,
        resellerEmail: currentUser.email || '',
        resellerName: currentUser.displayName || accountHolder,
        amount: numAmount,
        pixKeyType,
        pixKey: pixKey.trim(),
        accountHolder: accountHolder.trim(),
      });

      setWithdrawSuccess(`Ordem #${order.id} emitida com sucesso! Prazo médio de liquidação via PIX: até 24 horas.`);
      setWithdrawalAmount('');
      setPixKey('');
      await loadData(true);
    } catch (err: any) {
      setWithdrawError(err?.message || 'Falha ao processar solicitação de saque. Tente novamente.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Simular indicação
  const handleSimulateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimSuccessMsg('');

    if (!simName.trim() || !simEmail.trim()) {
      alert('Preencha o nome e e-mail do lead simulado.');
      return;
    }

    const uid = currentUser?.uid || 'guest_operator';
    await createSimulatedReferral({
      resellerId: uid,
      resellerCode,
      referredName: simName.trim(),
      referredEmail: simEmail.trim(),
      planId: simPlan,
      isPaid: simIsPaid,
    });

    setSimSuccessMsg(
      simIsPaid
        ? `Lead "${simName}" registrado com pagamento confirmado! Comissão de 15% (R$ ${PLAN_PRICING[simPlan].commission.toFixed(2)}) creditada no seu Saldo Disponível!`
        : `Lead "${simName}" cadastrado no período de teste (sem pagamento)! Renda estimada de R$ ${PLAN_PRICING[simPlan].commission.toFixed(2)} adicionada como pendente.`
    );

    setSimName('');
    setSimEmail('');
    await loadData(true);
  };

  // Filtrar indicações
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'paid' ? r.status === 'paid' :
        r.status === 'pending';

      const matchesSearch = 
        !searchTerm.trim() ? true :
        (r.referredName && r.referredName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.referredEmail && r.referredEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [referrals, filterStatus, searchTerm]);

  return (
    <div className="min-h-screen bg-[#011d1c] text-[#bbc7c6] flex flex-col font-['DM_Sans',sans-serif] selection:bg-[#00827c]/40 selection:text-[#edfffe]">
      {/* 1. TOP PORTAL HEADER */}
      <header className="sticky top-0 z-40 bg-[#012624]/95 border-b border-[#003734] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand & Portal Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToTerminal}
              className="p-2 rounded-lg bg-[#003734]/80 hover:bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              title="Voltar ao Terminal de Buscas"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Terminal de Buscas</span>
            </button>

            <div className="flex items-center gap-2.5">
              <ShazamLogo size="sm" isPulseSpeedFast={false} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base sm:text-lg tracking-tight text-white uppercase">
                    SHAZAM <span className="text-[#cbfffc]">BUSCAS</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    REVENDEDOR: SUSPENSO (EM DESENVOLVIMENTO)
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/80 hidden sm:block font-mono">
                  ⚠️ Sistema temporariamente em manutenção técnica • Novas adesões pausadas
                </p>
              </div>
            </div>
          </div>

          {/* User Profile / Auth Status */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                    {currentUser.displayName || 'Operador Parceiro'}
                  </span>
                  <span className="text-[10px] font-mono text-[#cbfffc] truncate max-w-[160px]">
                    {currentUser.email}
                  </span>
                </div>

                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Revendedor'}
                    className="w-8 h-8 rounded-full border border-[#00827c]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#003734] border border-[#00827c] flex items-center justify-center font-mono font-bold text-xs text-[#cbfffc]">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'R'}
                  </div>
                )}

                <button
                  onClick={onLogoutGoogle}
                  className="p-2 rounded-lg bg-[#003734]/50 hover:bg-[#003734] text-[#707777] hover:text-white transition-colors cursor-pointer"
                  title="Desconectar conta Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#011d1c"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#011d1c"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#011d1c"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#011d1c"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Acessar com Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* AVISO GLOBAL: MODO REVENDEDOR SUSPENSO - EM DESENVOLVIMENTO */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#002422] to-amber-500/10 border-2 border-amber-500/50 p-5 sm:p-6 text-amber-200 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500 text-[#011d1c]">
                    MODO REVENDEDOR SUSPENSO
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" />
                    EM DESENVOLVIMENTO TÉCNICO
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Este módulo está temporariamente suspenso para aprimoramentos e manutenção do sistema.
                </h2>
                <p className="text-sm text-amber-100/80 leading-relaxed max-w-3xl">
                  Estamos aprimorando a infraestrutura de apuração de comissões (15%), a esteira antifraude e o motor de liquidação automática de ordens de saque via PIX com prazo médio de até 24 horas. Durante esta janela de desenvolvimento, a criação de novos vínculos de afiliados e solicitações de saque estão suspensas.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#011d1c]/80 border border-amber-500/30 text-amber-300">
                    ⏳ Previsão de Retorno: Em Breve
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#011d1c]/80 border border-amber-500/30 text-amber-300">
                    💰 Regras Mantidas: 15% de Comissão por Assinatura Paga & Saques via PIX
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onBackToTerminal}
              className="self-start md:self-center px-4 py-2.5 rounded-lg bg-[#003734] hover:bg-[#004743] text-[#cbfffc] border border-[#00827c]/60 font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Terminal</span>
            </button>
          </div>
        </div>

        {/* ACESSO SUSPENSO - EM DESENVOLVIMENTO */}
        <div className="py-8 sm:py-16 max-w-4xl mx-auto space-y-8 text-center">
          <div className="relative inline-block mb-2">
            <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative p-5 rounded-2xl bg-gradient-to-b from-[#003734] to-[#011d1c] border-2 border-amber-500/50 shadow-2xl flex items-center justify-center">
              <Lock className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
              <Wrench className="w-3.5 h-3.5" />
              <span>ACESSO SUSPENSO • EM DESENVOLVIMENTO</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Acesso à Área do Revendedor Suspenso
            </h1>
            <p className="text-base text-[#bbc7c6] max-w-2xl mx-auto leading-relaxed">
              O acesso a este módulo e às ferramentas do revendedor está temporariamente suspenso. O sistema encontra-se em desenvolvimento técnico pela equipe de engenharia para implantação de novos mecanismos de segurança, auditoria e liquidação automática via PIX.
            </p>
          </div>

          {/* 4 Cards Informativos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl mx-auto text-left font-mono">
            <div className="p-4 rounded-xl bg-[#002422] border border-amber-500/30 space-y-1">
              <span className="text-[10px] text-amber-400/80 uppercase block font-semibold">Status do Acesso</span>
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Suspenso
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#002422] border border-amber-500/30 space-y-1">
              <span className="text-[10px] text-amber-400/80 uppercase block font-semibold">Situação</span>
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Em Desenvolvimento
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#002422] border border-[#00827c]/40 space-y-1">
              <span className="text-[10px] text-[#707777] uppercase block font-semibold">Comissão Garantida</span>
              <p className="text-xs font-bold text-[#cbfffc]">
                15% por assinatura
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#002422] border border-[#00827c]/40 space-y-1">
              <span className="text-[10px] text-[#707777] uppercase block font-semibold">Previsão</span>
              <p className="text-xs font-bold text-white">
                Em Breve
              </p>
            </div>
          </div>

          {/* Regras Comerciais Preservadas */}
          <div className="w-full max-w-2xl mx-auto p-4 rounded-xl bg-[#002422]/90 border border-amber-500/30 text-xs text-[#bbc7c6] text-left flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-semibold font-mono">
                Regulamento de Afiliados Preservado:
              </strong>
              <p className="leading-relaxed">
                Todas as regras comissionadas de 15% por cliente pagante e saques via PIX em até 24 horas estão mantidas e serão reativadas integralmente assim que a homologação da nova esteira for concluída.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onBackToTerminal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Terminal de Buscas</span>
            </button>

            <a
              href="https://wa.me/5567999815045?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20Programa%20de%20Revendedores%20do%20Shazam%20Buscas"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#002b28] hover:bg-[#003734] border border-[#00827c]/60 text-[#cbfffc] font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Suporte no WhatsApp</span>
            </a>
          </div>
        </div>

        {/* TELAS ANTERIORES RETIDAS TEMPORARIAMENTE DURANTE O PERÍODO DE SUSPENSÃO */}
        {false && !currentUser ? (
          <div className="py-8 sm:py-16 max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003734] border border-[#00827c]/50 text-[#cbfffc] text-xs font-mono">
                <Share2 className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>PORTAL DO REVENDEDOR OFICIAL</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-medium text-white tracking-tight leading-[1.15]">
                Indique o Shazam Buscas e receba<br />
                <span className="bg-gradient-to-r from-[#ffd166] via-[#ffe08a] to-[#cbfffc] bg-clip-text text-transparent font-bold">
                  15% de comissão via PIX
                </span> em cada venda.
              </h1>
              <p className="text-base text-[#bbc7c6] max-w-2xl mx-auto leading-relaxed">
                Acesse com a sua conta Google para gerar seu link exclusivo, acompanhar em tempo real quem e qual e-mail se cadastrou, ver sua renda estimada e emitir ordens de saque via PIX com prazo médio de até 24 horas.
              </p>
            </div>

            {/* Caixa de Regras Claras */}
            <div className="p-5 rounded-xl bg-[#002422] border border-[#00827c]/40 max-w-2xl mx-auto space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#ffd166] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-semibold text-white uppercase font-mono tracking-wider">
                    Regras de Comissionamento & Saque
                  </h4>
                  <p className="text-[#bbc7c6] leading-relaxed">
                    <strong className="text-white">1. Comissão de 15%:</strong> Válida para todos os planos (Semanal R$ 5,25 | Quinzenal R$ 9,00 | Mensal R$ 14,85).<br />
                    <strong className="text-white">2. Condição de Pagamento:</strong> A comissão só é liberada para saque após o cliente indicado efetuar o pagamento do plano contratado via PIX. Cadastros em teste grátis (24h) ficam registrados como renda estimada pendente.<br />
                    <strong className="text-white">3. Prazo de Saque:</strong> As ordens de saque emitidas têm prazo médio de até <strong className="text-[#ffd166]">24 horas úteis</strong> para liquidação direta na sua chave PIX.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Login com o Google em Destaque */}
            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <button
                onClick={onLoginGoogle}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffc038] hover:opacity-95 text-[#012624] font-extrabold text-sm sm:text-base font-mono uppercase tracking-wider transition-all cursor-pointer shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#012624"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#012624"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#012624"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#012624"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Acessar com o Google & Gerar Meu Link</span>
              </button>

              <button
                onClick={onBackToTerminal}
                className="text-xs font-mono text-[#707777] hover:text-white transition-colors cursor-pointer flex items-center gap-1 mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retornar ao Terminal de Consultas</span>
              </button>
            </div>
          </div>
        ) : (
          /* SE ESTIVER LOGADO: DASHBOARD COMPLETO DO REVENDEDOR */
          <div className="space-y-6">
            {/* Top Partner Greeting & Affiliate Link Bar */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#003734] via-[#002b28] to-[#012624] border border-[#00827c]/60 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#011d1c] border border-[#00827c] flex items-center justify-center text-[#cbfffc] font-mono font-bold text-lg shadow-inner">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        {currentUser.displayName || 'Operador Parceiro'}
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        MODO SUSPENSO • EM DESENVOLVIMENTO
                      </span>
                    </div>
                    <p className="text-xs text-[#bbc7c6] font-mono">
                      Código de Afiliado: <span className="text-[#cbfffc] font-semibold">{resellerCode}</span> • Comissão Prevista: 15%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg bg-[#011d1c] border border-[#00827c]/40 text-[#cbfffc] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
                    title="Atualizar dados"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Atualizar</span>
                  </button>
                </div>
              </div>

              {/* Box do Link de Indicação */}
              <div className="pt-2 border-t border-[#00827c]/30">
                <div className="text-xs font-mono uppercase tracking-wider text-[#cbfffc] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span>Seu Link de Indicação Exclusivo (15% de Comissão)</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Adesões Pausadas Durante Manutenção
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 bg-[#011a19] rounded-xl border border-[#00827c]/40 px-3.5 py-2.5 flex items-center gap-2 text-xs font-mono text-white overflow-hidden">
                    <span className="truncate">{referralUrl}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#00827c] hover:bg-[#009b94] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-[#011d1c]" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-[#011d1c]" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleShareWhatsApp}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
                      title="Compartilhar no WhatsApp"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setShowQrCode((prev) => !prev)}
                      className="p-2.5 rounded-xl bg-[#003734] hover:bg-[#004743] border border-[#00827c]/60 text-[#cbfffc] transition-all cursor-pointer"
                      title="Exibir QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* QR Code Expansível */}
                {showQrCode && (
                  <div className="mt-3 p-4 rounded-xl bg-[#011a19] border border-[#00827c]/40 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralUrl)}`}
                      alt="QR Code do Link"
                      className="w-28 h-28 rounded-lg bg-white p-1.5 shrink-0"
                    />
                    <div className="text-xs space-y-1 text-center sm:text-left">
                      <h4 className="font-semibold text-white font-mono uppercase">
                        QR Code de Indicação Direta
                      </h4>
                      <p className="text-[#bbc7c6]">
                        Peça para seus clientes ou parceiros escanearem com a câmera do celular para abrir o link e garantir sua comissão de 15% no pagamento.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4 Cards de Métricas Financeiras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Saldo Disponível (Planos Pagos Confirmados) */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#003734] to-[#002725] border border-emerald-500/40 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                    Saldo Liberado (Saque PIX)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  R$ {wallet ? wallet.availableBalance.toFixed(2) : '0.00'}
                </div>
                <p className="text-[11px] text-emerald-400/90 leading-tight">
                  ✓ 15% de clientes com pagamento confirmado via PIX
                </p>
                <button
                  onClick={() => setActiveTab('saque')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow"
                >
                  Solicitar Saque
                </button>
              </div>

              {/* Card 2: Renda Estimada Pendente */}
              <div className="p-5 rounded-xl bg-[#002422] border border-[#ffd166]/40 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#ffd166] font-bold">
                    Renda Estimada Pendente
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#ffd166]/20 text-[#ffd166] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-[#ffd166]">
                  R$ {wallet ? wallet.estimatedPendingBalance.toFixed(2) : '0.00'}
                </div>
                <p className="text-[11px] text-[#bbc7c6] leading-tight">
                  ⏳ Cadastros em teste 24h (libera após efetuarem o pagamento)
                </p>
              </div>

              {/* Card 3: Total de Cadastros no seu Link */}
              <div className="p-5 rounded-xl bg-[#002422] border border-[#00827c]/40 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#cbfffc] font-bold">
                    Total de Cadastros
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#003734] text-[#cbfffc] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {wallet ? wallet.totalReferralsCount : 0}
                </div>
                <p className="text-[11px] text-[#bbc7c6] leading-tight">
                  {wallet?.paidReferralsCount || 0} com pagamento pago • {wallet?.pendingReferralsCount || 0} em teste
                </p>
              </div>

              {/* Card 4: Total Já Sacado */}
              <div className="p-5 rounded-xl bg-[#002422] border border-[#00827c]/40 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#bbc7c6] font-bold">
                    Total Já Sacado
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#003734] text-[#bbc7c6] flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  R$ {wallet ? wallet.totalWithdrawn.toFixed(2) : '0.00'}
                </div>
                <p className="text-[11px] text-[#bbc7c6] leading-tight">
                  Resgatado via PIX na sua conta bancária
                </p>
              </div>
            </div>

            {/* Navegação por Abas do Sistema de Revendedor */}
            <div className="border-b border-[#003734] flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('cadastros')}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'cadastros'
                    ? 'bg-[#003734] text-[#cbfffc] border border-[#00827c]'
                    : 'text-[#bbc7c6] hover:text-white hover:bg-[#002b28]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cadastros & Renda ({referrals.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('saque')}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'saque'
                    ? 'bg-[#003734] text-[#cbfffc] border border-[#00827c]'
                    : 'text-[#bbc7c6] hover:text-white hover:bg-[#002b28]'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Solicitar Saque PIX</span>
                {wallet && wallet.availableBalance > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    R$ {wallet.availableBalance.toFixed(2)}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('simular')}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'simular'
                    ? 'bg-[#003734] text-[#cbfffc] border border-[#00827c]'
                    : 'text-[#bbc7c6] hover:text-white hover:bg-[#002b28]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
                <span>Simulador de Teste</span>
              </button>

              <button
                onClick={() => setActiveTab('regras')}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'regras'
                    ? 'bg-[#003734] text-[#cbfffc] border border-[#00827c]'
                    : 'text-[#bbc7c6] hover:text-white hover:bg-[#002b28]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Regras & Material de Divulgação</span>
              </button>
            </div>

            {/* CONTEÚDO DA ABA 1: CADASTROS & INDICAÇÕES */}
            {activeTab === 'cadastros' && (
              <div className="space-y-4">
                {/* Barra de Filtros e Busca */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#002422] p-3.5 rounded-xl border border-[#00827c]/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#cbfffc] uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filtrar:</span>
                    </span>
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        filterStatus === 'all'
                          ? 'bg-[#003734] text-[#cbfffc] font-bold border border-[#00827c]/60'
                          : 'text-[#bbc7c6] hover:text-white'
                      }`}
                    >
                      Todos ({referrals.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('paid')}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        filterStatus === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                          : 'text-[#bbc7c6] hover:text-white'
                      }`}
                    >
                      Pagos ({referrals.filter((r) => r.status === 'paid').length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('pending')}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        filterStatus === 'pending'
                          ? 'bg-[#ffd166]/20 text-[#ffd166] font-bold border border-[#ffd166]/40'
                          : 'text-[#bbc7c6] hover:text-white'
                      }`}
                    >
                      Em Teste ({referrals.filter((r) => r.status === 'pending').length})
                    </button>
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#707777] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nome ou e-mail..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#011a19] border border-[#00827c]/40 text-xs text-white placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                    />
                  </div>
                </div>

                {/* Tabela de Leads Cadastrados */}
                <div className="bg-[#002422] rounded-2xl border border-[#00827c]/40 overflow-hidden shadow-xl">
                  {filteredReferrals.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#003734] text-[#cbfffc] flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-semibold text-white">
                        Nenhum cadastro encontrado neste filtro
                      </h4>
                      <p className="text-xs text-[#bbc7c6] max-w-md mx-auto">
                        Compartilhe o seu link exclusivo com parceiros, empresas e investigadores para começar a receber cadastros e comissões.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#001f1e] border-b border-[#003734] text-[#707777] uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Quem se Cadastrou</th>
                            <th className="py-3 px-4">E-mail Cadastrado</th>
                            <th className="py-3 px-4">Plano</th>
                            <th className="py-3 px-4">Data do Cadastro</th>
                            <th className="py-3 px-4">Status & Condição</th>
                            <th className="py-3 px-4 text-right">Comissão (15%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#003734]/50">
                          {filteredReferrals.map((item) => {
                            const isPaid = item.status === 'paid';
                            return (
                              <tr key={item.id} className="hover:bg-[#00302d]/60 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    {item.referredPhotoURL ? (
                                      <img
                                        src={item.referredPhotoURL}
                                        alt={item.referredName}
                                        className="w-7 h-7 rounded-full border border-[#00827c]/50"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-[#003734] text-[#cbfffc] flex items-center justify-center font-bold text-[11px]">
                                        {item.referredName ? item.referredName[0].toUpperCase() : 'U'}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-semibold text-white block">
                                        {item.referredName}
                                      </span>
                                      <span className="text-[10px] text-[#707777]">
                                        ID: {item.referredUserId ? `${item.referredUserId.slice(0, 8)}...` : item.id}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-[#edfffe]">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-[#cbfffc] shrink-0" />
                                    <span className="truncate max-w-[200px]">{item.referredEmail}</span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-[#bbc7c6]">
                                  <span className="text-white font-medium">{item.planName}</span>
                                  <span className="block text-[10px] text-[#707777]">
                                    R$ {item.planAmount.toFixed(2)}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 text-[#bbc7c6]">
                                  {new Date(item.createdAt).toLocaleDateString('pt-BR')} às{' '}
                                  {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </td>

                                <td className="py-3.5 px-4">
                                  {isPaid ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                        <CheckCircle2 className="w-3 h-3" />
                                        PAGAMENTO CONFIRMADO
                                      </span>
                                      <span className="block text-[10px] text-emerald-300">
                                        Comissão de 15% liberada no saldo
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ffd166]/20 text-[#ffd166] text-[10px] font-bold border border-[#ffd166]/30">
                                        <Clock className="w-3 h-3" />
                                        AGUARDANDO PAGAMENTO
                                      </span>
                                      <span className="block text-[10px] text-[#707777]">
                                        Em teste 24h • Libera ao pagar
                                      </span>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  {isPaid ? (
                                    <div>
                                      <span className="text-sm font-bold text-emerald-400">
                                        +R$ {item.commissionAmount.toFixed(2)}
                                      </span>
                                      <span className="block text-[10px] text-emerald-500/80">
                                        Liberado para Saque
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-sm font-bold text-[#ffd166]">
                                        R$ {item.commissionAmount.toFixed(2)}
                                      </span>
                                      <span className="block text-[10px] text-[#707777]">
                                        Renda Estimada
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 2: SOLICITAÇÃO DE SAQUE VIA PIX */}
            {activeTab === 'saque' && (
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                {/* Formulário de Saque */}
                <div className="lg:col-span-7 bg-[#002422] rounded-2xl border border-[#00827c]/40 p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#cbfffc]" />
                        <span>Emitir Ordem de Saque via PIX</span>
                      </h3>
                      <p className="text-xs text-[#bbc7c6] mt-1">
                        Prazo médio de processamento e pagamento em até <strong className="text-[#ffd166]">24 horas úteis</strong>.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-[#707777] uppercase block">
                        Saldo Disponível
                      </span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        R$ {wallet ? wallet.availableBalance.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Aviso de Suspensão do Saque */}
                  <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold mb-1">
                        EMISSÃO DE SAQUES TEMPORARIAMENTE SUSPENSA
                      </strong>
                      <p className="text-amber-100/80 leading-relaxed">
                        Durante a fase de desenvolvimento e atualização do sistema de liquidação financeira e segurança antifraude, as solicitações de saque estão pausadas. O saldo disponível acumulado permanece seguro e poderá ser resgatado assim que o sistema for reativado.
                      </p>
                    </div>
                  </div>

                  {/* Aviso de Regra Importante */}
                  <div className="p-4 rounded-xl bg-[#001f1e] border border-[#00827c]/40 flex items-start gap-3 text-xs">
                    <ShieldCheck className="w-5 h-5 text-[#cbfffc] shrink-0 mt-0.5" />
                    <p className="text-[#bbc7c6] leading-relaxed">
                      <strong className="text-white">Regra de Saque:</strong> O revendedor recebe 15% de comissão das assinaturas com pagamento confirmado via PIX. Solicitações de saque têm prazo médio de compensação de até 24 horas.
                    </p>
                  </div>

                  {withdrawError && (
                    <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{withdrawError}</span>
                    </div>
                  )}

                  {withdrawSuccess && (
                    <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{withdrawSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleRequestWithdrawal} className="space-y-4 text-xs font-mono">
                    <div>
                      <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                        Valor do Saque (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707777] font-bold">
                          R$
                        </span>
                        <input
                          type="text"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white font-bold text-base placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                        />
                      </div>
                      {wallet && wallet.availableBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setWithdrawalAmount(wallet.availableBalance.toFixed(2))}
                          className="text-[11px] text-[#cbfffc] hover:underline mt-1 cursor-pointer"
                        >
                          Sacar saldo total disponível (R$ {wallet.availableBalance.toFixed(2)})
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                          Tipo de Chave PIX *
                        </label>
                        <select
                          value={pixKeyType}
                          onChange={(e: any) => setPixKeyType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white focus:outline-none focus:border-[#cbfffc]"
                        >
                          <option value="cpf">CPF</option>
                          <option value="cnpj">CNPJ</option>
                          <option value="email">E-mail</option>
                          <option value="phone">Telefone / Celular</option>
                          <option value="random">Chave Aleatória (EVP)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                          Chave PIX *
                        </label>
                        <input
                          type="text"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : 'Sua chave PIX'}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                        Nome Completo do Titular da Conta *
                      </label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Nome como consta no banco"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={true}
                      className="w-full py-3.5 px-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Saques Temporariamente Suspensos (Em Desenvolvimento)</span>
                    </button>
                  </form>
                </div>

                {/* Histórico de Ordens de Saque */}
                <div className="lg:col-span-5 bg-[#002422] rounded-2xl border border-[#00827c]/40 p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#cbfffc]" />
                      <span>Histórico de Saques</span>
                    </h4>
                    <span className="text-[10px] font-mono text-[#707777]">
                      {withdrawals.length} ordens
                    </span>
                  </div>

                  {withdrawals.length === 0 ? (
                    <div className="p-8 text-center space-y-2 border border-dashed border-[#003734] rounded-xl">
                      <p className="text-xs text-[#707777] font-mono">
                        Nenhuma ordem de saque solicitada ainda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {withdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="p-3.5 rounded-xl bg-[#011a19] border border-[#003734] space-y-2 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">#{w.id}</span>
                            <span className="text-emerald-400 font-bold">
                              R$ {w.amount.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#bbc7c6]">
                            <span>Chave: {w.pixKey}</span>
                            <span className="text-[10px] text-[#707777]">
                              {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#003734]">
                            <span className="text-[10px] text-[#707777]">
                              Prazo: Até 24h úteis
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              {w.status === 'completed' ? 'PAGO' : 'PROCESSANDO'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 3: SIMULADOR DE TESTE */}
            {activeTab === 'simular' && (
              <div className="bg-[#002422] rounded-2xl border border-[#00827c]/40 p-6 shadow-xl max-w-2xl mx-auto space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#003734] text-[#ffd166] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                      Simulador de Indicações & Comissões
                    </h3>
                    <p className="text-xs text-[#bbc7c6]">
                      Teste em tempo real a entrada de leads no seu link e veja a diferença entre o período de teste e o pagamento confirmado.
                    </p>
                  </div>
                </div>

                {simSuccessMsg && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono leading-relaxed">
                    ✓ {simSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleSimulateLead} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                      Nome do Cliente / Indicado *
                    </label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      placeholder="Ex: Dr. Roberto Siqueira (Advogado)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                      E-mail do Cliente *
                    </label>
                    <input
                      type="email"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      placeholder="Ex: roberto.adv@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                        Plano de Interesse
                      </label>
                      <select
                        value={simPlan}
                        onChange={(e: any) => setSimPlan(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white focus:outline-none focus:border-[#cbfffc]"
                      >
                        <option value="weekly">Plano Semanal (R$ 35,00 • Comissão R$ 5,25)</option>
                        <option value="biweekly">Plano Quinzenal (R$ 60,00 • Comissão R$ 9,00)</option>
                        <option value="monthly">Plano Mensal (R$ 99,00 • Comissão R$ 14,85)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#bbc7c6] uppercase tracking-wider mb-1">
                        Condição do Lead
                      </label>
                      <select
                        value={simIsPaid ? 'paid' : 'pending'}
                        onChange={(e) => setSimIsPaid(e.target.value === 'paid')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#011a19] border border-[#00827c]/40 text-white focus:outline-none focus:border-[#cbfffc]"
                      >
                        <option value="paid">✓ Pagamento Confirmado (Comissão 15% Liberada)</option>
                        <option value="pending">⏳ Apenas Cadastrado / Teste 24h (Renda Estimada)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#00827c] hover:bg-[#009b94] text-[#011d1c] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                  >
                    Simular Entrada de Lead
                  </button>
                </form>
              </div>
            )}

            {/* CONTEÚDO DA ABA 4: REGRAS & MATERIAL */}
            {activeTab === 'regras' && (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-[#002422] rounded-2xl border border-[#00827c]/40 p-6 space-y-4 text-xs font-mono">
                  <h4 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#cbfffc]" />
                    <span>Regras do Programa de Revendedores</span>
                  </h4>
                  <ul className="space-y-3 text-[#bbc7c6]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#cbfffc] font-bold">1.</span>
                      <span><strong>15% de Comissão Fixa:</strong> Aplicada integralmente no valor de qualquer plano pago (R$ 35, R$ 60 ou R$ 99).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#cbfffc] font-bold">2.</span>
                      <span><strong>Condição de Pagamento do Cliente:</strong> O revendedor só recebe a comissão caso o indicado efetue o pagamento do plano contratado via PIX.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#cbfffc] font-bold">3.</span>
                      <span><strong>Prazo de Saque:</strong> Ordens de saque são liquidadas no prazo médio de até <strong>24 horas úteis</strong> via PIX.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#cbfffc] font-bold">4.</span>
                      <span><strong>Rastreamento de Leads:</strong> O revendedor tem visibilidade total de quem e qual e-mail se cadastrou no seu link exclusivo.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#002422] rounded-2xl border border-[#00827c]/40 p-6 space-y-4 text-xs font-mono">
                  <h4 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Mensagem Pronta para WhatsApp</span>
                  </h4>
                  <p className="text-[#bbc7c6]">
                    Copie e envie para clientes, empresas, advogados e investigadores:
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#011a19] border border-[#003734] text-[#edfffe] text-[11px] leading-relaxed whitespace-pre-wrap select-all">
{`⚡ Olá! Se você precisa consultar CPFs, CNPJs, Placas de Veículos, Telefones ou puxar Dossiês completos em segundos, recomendo a plataforma Shazam Buscas B2B.

Cadastre-se pelo meu link oficial para ativar 24 horas de teste grátis:
${referralUrl}`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `⚡ Olá! Se você precisa consultar CPFs, CNPJs, Placas de Veículos, Telefones ou puxar Dossiês completos em segundos, recomendo a plataforma Shazam Buscas B2B.\n\nCadastre-se pelo meu link oficial para ativar 24 horas de teste grátis:\n${referralUrl}`
                      );
                      alert('Mensagem copiada para a área de transferência!');
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#003734] hover:bg-[#004743] text-[#cbfffc] font-bold transition-colors cursor-pointer text-center"
                  >
                    Copiar Mensagem do WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
