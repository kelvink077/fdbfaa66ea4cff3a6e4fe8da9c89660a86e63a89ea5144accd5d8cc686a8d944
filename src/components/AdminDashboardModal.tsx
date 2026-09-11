import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserX,
  UserCheck,
  Plus,
  RefreshCw,
  Key,
  Check,
  Copy,
  Clock,
  Calendar,
  AlertTriangle,
  Crown,
  Sparkles,
  Filter,
  X,
  Flame,
  BarChart3,
  Activity,
  Award,
  ChevronDown,
  Trash2,
  Lock,
  Unlock,
  SlidersHorizontal,
  Tag,
  Bell,
  Send,
  CheckCircle2,
  MessageSquare,
  Eye,
  Radio
} from 'lucide-react';
import { 
  fetchAdminDashboardData, 
  adminToggleUserBlock, 
  adminUpdateUserPlan, 
  adminCreateCoupon, 
  adminDeleteCoupon,
  adminSendNotification,
  isRealUser,
  AdminMetrics, 
  UserRankingItem, 
  AdminConsultaItem 
} from '../lib/adminService';
import { UserProfileData, calculateAccountValidity } from '../lib/firebase';
import { CouponRecord, CouponType } from '../lib/couponService';
import { UserConsultasModal } from './UserConsultasModal';
import { SendDirectWebPushModal } from './SendDirectWebPushModal';
import { PushCampaignsTab } from './PushCampaignsTab';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

type AdminTab = 'kpis' | 'users' | 'coupons' | 'consultas' | 'campaigns';

export const GoogleBadgeIcon: React.FC<{ className?: string }> = ({ className = "w-2.5 h-2.5" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

export interface OperatorAvatarProps {
  photoURL?: string;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  idKey?: string;
}

export const OperatorAvatar: React.FC<OperatorAvatarProps> = ({ 
  photoURL, 
  name, 
  email, 
  size = 'md' 
}) => {
  const [imgError, setImgError] = useState(false);
  const emailLower = (email || '').toLowerCase();
  const isGoogle = emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com') || Boolean(photoURL?.includes('googleusercontent.com'));
  const initial = (name || email || 'O').trim()[0]?.toUpperCase() || 'O';

  const sizeClasses = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textClasses = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs';
  const badgeClasses = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const badgeSvg = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2.5 h-2.5';

  return (
    <div className="relative shrink-0 select-none">
      {photoURL && !imgError ? (
        <img
          src={photoURL}
          alt={name || 'Foto do Operador'}
          className={`${sizeClasses} rounded-full object-cover border border-[#00827c] ring-1 ring-[#00a8a0]/40 shadow-sm bg-[#003734]`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-gradient-to-br from-[#003734] to-[#012624] border border-[#00827c] flex items-center justify-center text-[#cbfffc] font-bold ${textClasses} shadow-sm`}
        >
          {initial}
        </div>
      )}
      {isGoogle && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 ${badgeClasses} rounded-full bg-[#011413] border border-[#00827c] flex items-center justify-center shadow-xs`}
          title="Conta Google Vinculada"
        >
          <GoogleBadgeIcon className={badgeSvg} />
        </div>
      )}
    </div>
  );
};

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('kpis');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dados carregados do Firestore
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    expiredUsers: 0,
    blockedUsers: 0,
    trialUsers: 0,
    totalRevenueRealized: 0,
    projectedMonthlyRevenue: 0,
    totalQueriesToday: 0,
    totalQueriesAllTime: 0,
    avgQueriesPerActiveUser: 0,
  });
  const [usersList, setUsersList] = useState<UserProfileData[]>([]);
  const [topUsersToday, setTopUsersToday] = useState<UserRankingItem[]>([]);
  const [recentConsultas, setRecentConsultas] = useState<AdminConsultaItem[]>([]);
  const [couponsList, setCouponsList] = useState<CouponRecord[]>([]);

  // Mapeamento rápido e memoizado para foto de perfil do Google por ID ou email
  const usersPhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    usersList.forEach((u) => {
      if (u.photoURL) {
        if (u.id) map.set(u.id, u.photoURL);
        if (u.email) {
          map.set(u.email, u.photoURL);
          map.set(u.email.toLowerCase(), u.photoURL);
        }
      }
    });
    return map;
  }, [usersList]);

  // Filtros de Usuários
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'active' | 'expired' | 'blocked' | 'trial'>('all');

  // Filtros de Cupons
  const [couponSearchTerm, setCouponSearchTerm] = useState('');
  const [couponFilterStatus, setCouponFilterStatus] = useState<'all' | 'available' | 'used'>('all');

  // Estado para Criar Novo Cupom
  const [newCouponType, setNewCouponType] = useState<CouponType>('activation');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDays, setNewCouponDays] = useState(30);
  const [newCouponPrice, setNewCouponPrice] = useState(11.0);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  // Ações em usuários
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);
  const [planDropdownUserId, setPlanDropdownUserId] = useState<string | null>(null);
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notificações para Usuários
  const [notificationModalTarget, setNotificationModalTarget] = useState<UserProfileData | 'all' | null>(null);
  const [notificationTitle, setNotificationTitle] = useState('Aviso da Administração');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationSuccessMsg, setNotificationSuccessMsg] = useState<string | null>(null);

  // Modal de Visualização Organizada de Consultas do Usuário
  const [userConsultasTarget, setUserConsultasTarget] = useState<{
    userId: string;
    userEmail: string;
    userName: string;
    plan?: string;
    status?: string;
    photoURL?: string;
  } | null>(null);

  // Modal de Disparo Direto de WebPush (Imagem, Texto, Link por Usuário)
  const [directPushUserTarget, setDirectPushUserTarget] = useState<{
    userId: string;
    userEmail: string;
    userName: string;
    plan?: string;
    status?: string;
    photoURL?: string;
  } | null>(null);

  const handleOpenUserConsultas = (
    userId: string,
    userEmail: string,
    userName: string,
    plan?: string,
    status?: string,
    photoURL?: string
  ) => {
    setUserConsultasTarget({
      userId,
      userEmail,
      userName,
      plan,
      status,
      photoURL: photoURL || usersPhotoMap.get(userId) || (userEmail ? usersPhotoMap.get(userEmail.toLowerCase()) : undefined),
    });
  };

  // Formatador de Data de Cadastro com data e tempo relativo
  const formatRegistrationDate = (dateIso?: string) => {
    if (!dateIso) return { full: 'Data não informada', relative: 'Recente' };
    try {
      const d = new Date(dateIso);
      if (isNaN(d.getTime())) return { full: 'Data não informada', relative: 'Recente' };
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const diffMs = Date.now() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      let relative = '';
      if (diffHours < 1) relative = 'Agora há pouco';
      else if (diffHours < 24) relative = `Hoje às ${timeStr}`;
      else if (diffHours < 48) relative = 'Ontem';
      else {
        const diffDays = Math.floor(diffHours / 24);
        relative = `há ${diffDays} dias`;
      }

      return {
        full: `${dateStr}, ${timeStr}`,
        relative,
      };
    } catch {
      return { full: 'Data não informada', relative: 'Recente' };
    }
  };

  // Carrega dados
  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      const data = await fetchAdminDashboardData();
      setMetrics(data.metrics);
      setUsersList(data.users);
      setTopUsersToday(data.topUsersToday);
      setRecentConsultas(data.recentConsultas);
      setCouponsList(data.coupons);
    } catch (err: any) {
      console.error('Erro ao carregar dados do admin:', err);
      setErrorMsg(err?.message || 'Falha ao conectar com o banco de dados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
    }
  }, [isOpen]);

  // Gerador de código aleatório para cupom
  const handleGenerateRandomCode = () => {
    const prefix = newCouponType === 'activation' ? 'ATIV' : 'DESC';
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const num = Math.floor(100 + Math.random() * 900);
    setNewCouponCode(`${prefix}-${rand}-${num}`);
  };

  // Criação de cupom
  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCouponCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Digite ou gere um código para o cupom.');
      return;
    }

    try {
      setIsCreatingCoupon(true);
      setErrorMsg(null);
      const created = await adminCreateCoupon({
        code: cleanCode,
        type: newCouponType,
        days: newCouponDays,
        discountedPrice: newCouponType === 'activation' ? 0 : newCouponPrice,
        originalPrice: 35.0,
      });

      setCouponsList((prev) => [created, ...prev.filter((c) => c.code !== cleanCode)]);
      setNewCouponCode('');
      setCouponSuccessMessage(`Cupom ${created.code} criado com sucesso e pronto para uso!`);
      setTimeout(() => setCouponSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao criar cupom.');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  // Copiar código
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    setTimeout(() => setCopiedCouponCode(null), 2500);
  };

  // Excluir cupom
  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Deseja realmente excluir o cupom "${code}"?`)) return;
    try {
      await adminDeleteCoupon(code);
      setCouponsList((prev) => prev.filter((c) => c.code !== code));
    } catch (err: any) {
      alert('Erro ao excluir cupom: ' + err?.message);
    }
  };

  // Abrir Modal de Notificação
  const handleOpenNotificationModal = (target: UserProfileData | 'all') => {
    setNotificationModalTarget(target);
    setNotificationSuccessMsg(null);
    if (target === 'all') {
      setNotificationTitle('Aviso Geral da Administração');
      setNotificationMessage('');
      setNotificationType('info');
    } else {
      setNotificationTitle('Comunicado ao Cliente');
      setNotificationMessage('');
      setNotificationType('info');
    }
  };

  // Enviar Notificação Direta para Cliente ou Todos
  const handleSendNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationModalTarget) return;
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      alert('Por favor informe o título e a mensagem da notificação.');
      return;
    }

    try {
      setIsSendingNotification(true);
      const isAll = notificationModalTarget === 'all';
      const targetUserId = isAll ? 'all' : notificationModalTarget.id;
      const targetUserEmail = isAll ? undefined : notificationModalTarget.email;
      const targetUserName = isAll ? undefined : (notificationModalTarget.displayName || notificationModalTarget.email);

      await adminSendNotification({
        targetUserId,
        targetUserEmail,
        targetUserName,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        sentBy: 'Administração Shazam Master',
      });

      setNotificationSuccessMsg(
        isAll 
          ? 'Notificação global transmitida com sucesso para todos os clientes!' 
          : `Notificação enviada com sucesso para ${targetUserName}!`
      );
      setTimeout(() => {
        setNotificationSuccessMsg(null);
        setNotificationModalTarget(null);
        setNotificationTitle('Aviso da Administração');
        setNotificationMessage('');
      }, 2200);
    } catch (err: any) {
      alert('Erro ao enviar notificação: ' + err?.message);
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Bloquear / Desbloquear Usuário (100% funcional sem prompt/alert no iframe, altera status para Expirado)
  const handleToggleBlock = async (user: UserProfileData) => {
    const isCurrentlyExpiredOrBlocked = Boolean(
      user.isBlocked || user.planStatus === 'blocked' || user.planStatus === 'expired'
    );
    const shouldBlock = !isCurrentlyExpiredOrBlocked;

    try {
      setActionLoadingUserId(user.id);
      await adminToggleUserBlock(
        user.id, 
        shouldBlock, 
        shouldBlock ? 'Acesso bloqueado e expirado pela administração' : undefined
      );

      const pastExpiredDate = '2000-01-01T00:00:00.000Z';
      const reactivatedDate = new Date(Date.now() + 7 * 86400000).toISOString();

      setUsersList((prev) => prev.map((u) => {
        if (u.id === user.id) {
          return {
            ...u,
            isBlocked: shouldBlock,
            planStatus: shouldBlock ? 'expired' : 'active',
            validUntil: shouldBlock ? pastExpiredDate : reactivatedDate,
            trialEndsAt: shouldBlock ? pastExpiredDate : reactivatedDate,
            consultasRestantes: shouldBlock ? 0 : 50,
            blockedReason: shouldBlock ? 'Acesso bloqueado e expirado pela administração' : undefined,
            blockedAt: shouldBlock ? new Date().toISOString() : undefined,
          };
        }
        return u;
      }));

      setMetrics((prev) => ({
        ...prev,
        expiredUsers: shouldBlock ? prev.expiredUsers + 1 : Math.max(0, prev.expiredUsers - 1),
        activeUsers: shouldBlock ? Math.max(0, prev.activeUsers - 1) : prev.activeUsers + 1,
        blockedUsers: shouldBlock ? prev.blockedUsers + 1 : Math.max(0, prev.blockedUsers - 1),
      }));

      setActionFeedbackMsg({
        type: 'success',
        text: shouldBlock
          ? `Status de ${user.displayName || user.email} alterado para EXPIRADO com sucesso!`
          : `Acesso de ${user.displayName || user.email} REATIVADO com sucesso (7 dias concedidos)!`
      });
      setTimeout(() => setActionFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Erro ao alternar status do usuário:', err);
      setActionFeedbackMsg({
        type: 'error',
        text: `Erro ao alterar status: ${err?.message || 'Falha de comunicação com Firestore'}`
      });
      setTimeout(() => setActionFeedbackMsg(null), 5000);
    } finally {
      setActionLoadingUserId(null);
    }
  };

  // Alterar Plano / Adicionar Dias
  const handleUpdatePlan = async (
    userId: string, 
    plan: 'weekly' | 'biweekly' | 'monthly' | 'lifetime', 
    days?: number
  ) => {
    try {
      setActionLoadingUserId(userId);
      await adminUpdateUserPlan(userId, plan, days);
      
      const now = new Date();
      const validUntil = plan === 'lifetime' 
        ? '2099-12-31T23:59:59.999Z'
        : new Date(now.getTime() + (days || 30) * 86400000).toISOString();

      setUsersList((prev) => prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            plan,
            planStatus: 'active',
            isBlocked: false,
            validUntil,
            trialEndsAt: validUntil,
          };
        }
        return u;
      }));

      setPlanDropdownUserId(null);
    } catch (err: any) {
      alert('Erro ao atualizar plano: ' + err?.message);
    } finally {
      setActionLoadingUserId(null);
    }
  };

  // Filtragem de Usuários
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const validity = calculateAccountValidity(u);
      const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
      const isExpired = isBlocked || u.planStatus === 'expired' || validity.isExpired || !validity.isValid;

      // Filtro de texto
      const search = userSearchTerm.toLowerCase();
      const matchesSearch = !search || 
        (u.displayName && u.displayName.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.id && u.id.toLowerCase().includes(search)) ||
        (u.plan && u.plan.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      // Filtro de status
      if (userFilterStatus === 'active') return validity.isValid && !isBlocked && u.planStatus !== 'expired';
      if (userFilterStatus === 'expired') return isExpired;
      if (userFilterStatus === 'blocked') return isBlocked;
      if (userFilterStatus === 'trial') return validity.isTrial && !isBlocked && u.planStatus !== 'expired';

      return true;
    });
  }, [usersList, userSearchTerm, userFilterStatus]);

  // Filtragem de Cupons
  const filteredCoupons = useMemo(() => {
    return couponsList.filter((c) => {
      const search = couponSearchTerm.toLowerCase();
      const matchesSearch = !search || 
        c.code.toLowerCase().includes(search) ||
        (c.usedByEmail && c.usedByEmail.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      if (couponFilterStatus === 'available') return !c.used;
      if (couponFilterStatus === 'used') return c.used;

      return true;
    });
  }, [couponsList, couponSearchTerm, couponFilterStatus]);

  if (!isOpen) return null;

  return (
    <div 
      id="admin-dashboard-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
    >
      <div 
        id="admin-dashboard-container"
        className="bg-[#012624] border border-[#00827c]/60 w-full max-w-7xl max-h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#edfffe]"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#003734] bg-[#011d1c]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ffd166] via-[#f59e0b] to-[#d97706] p-0.5 flex items-center justify-center shadow-lg shadow-[#ffd166]/20">
              <div className="w-full h-full bg-[#012624] rounded-[7px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#ffd166]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#ffffff] uppercase tracking-wide font-mono">
                  PAINEL ADMINISTRATIVO <span className="text-[#cbfffc]">SHAZAM</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40 uppercase">
                  LIFETIME INFINITO
                </span>
              </div>
              <p className="text-xs text-[#707777] font-mono">
                Logado como: <span className="text-[#cbfffc] font-medium">{currentUserEmail || 'wrbatata6@gmail.com'}</span> • Acesso Vitalício Total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-admin-refresh"
              onClick={() => loadDashboardData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003734] hover:bg-[#004d49] text-xs font-mono text-[#cbfffc] border border-[#00827c]/40 transition-all cursor-pointer"
              title="Recarregar dados do banco"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              id="btn-admin-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734] transition-colors cursor-pointer"
              title="Fechar painel administrativo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 border-b border-[#003734] bg-[#012624] overflow-x-auto">
          <button
            id="tab-admin-kpis"
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'kpis'
                ? 'bg-[#00827c] text-[#011d1c] shadow-sm'
                : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visão Geral & Faturamento</span>
          </button>

          <button
            id="tab-admin-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'bg-[#00827c] text-[#011d1c] shadow-sm'
                : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Clientes</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#011d1c]/40 text-[10px]">
              {usersList.length}
            </span>
          </button>

          <button
            id="tab-admin-coupons"
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'coupons'
                ? 'bg-[#00827c] text-[#011d1c] shadow-sm'
                : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Gerador de Cupons</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#011d1c]/40 text-[10px]">
              {couponsList.length}
            </span>
          </button>

          <button
            id="tab-admin-consultas"
            onClick={() => setActiveTab('consultas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'consultas'
                ? 'bg-[#00827c] text-[#011d1c] shadow-sm'
                : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Consultas em Tempo Real</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#011d1c]/40 text-[10px]">
              {metrics.totalQueriesToday} hoje
            </span>
          </button>

          <button
            id="tab-admin-campaigns"
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'campaigns'
                ? 'bg-[#00827c] text-[#011d1c] shadow-sm'
                : 'text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734]'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Campanhas WebPush</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#011d1c]/40 text-[10px] text-[#79fbf5]">
              Broadcast
            </span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-900/40 border border-red-500/50 flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body / Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <RefreshCw className="w-8 h-8 text-[#cbfffc] animate-spin mb-3" />
              <p className="text-sm font-mono text-[#bbc7c6]">Carregando estatísticas e clientes do sistema...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: VISÃO GERAL & FATURAMENTO */}
              {activeTab === 'kpis' && (
                <div className="space-y-6">
                  {/* Grid de KPIs Principais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Faturamento Confirmado */}
                    <div className="p-4 rounded-xl bg-[#011d1c] border border-[#003734] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-[#bbc7c6] uppercase tracking-wider">
                          Faturamento Confirmado
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#00827c]/20 flex items-center justify-center text-[#79fbf5]">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#79fbf5]">
                          R$ {metrics.totalRevenueRealized.toFixed(2).replace('.', ',')}
                        </div>
                        <p className="text-[11px] text-[#707777] font-mono mt-1">
                          Soma de todos os pagamentos via PIX
                        </p>
                      </div>
                    </div>

                    {/* Lucro / Faturamento Previsto Mensal */}
                    <div className="p-4 rounded-xl bg-[#011d1c] border border-[#003734] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-[#bbc7c6] uppercase tracking-wider">
                          Lucro Previsto Mensal
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#ffd166]/20 flex items-center justify-center text-[#ffd166]">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#ffd166]">
                          R$ {metrics.projectedMonthlyRevenue.toFixed(2).replace('.', ',')}
                        </div>
                        <p className="text-[11px] text-[#707777] font-mono mt-1">
                          Projeção baseada em clientes ativos
                        </p>
                      </div>
                    </div>

                    {/* Clientes Cadastrados & Ativos */}
                    <div className="p-4 rounded-xl bg-[#011d1c] border border-[#003734] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-[#bbc7c6] uppercase tracking-wider">
                          Total de Clientes
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-bold font-mono text-[#ffffff]">
                            {metrics.totalUsers}
                          </span>
                          <span className="text-xs font-mono text-[#cbfffc] bg-[#003734] px-2 py-0.5 rounded">
                            {metrics.activeUsers} ativos
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#707777] font-mono mt-1">
                          <span>{metrics.expiredUsers} expirados</span>
                          <span>•</span>
                          <span className="text-red-400">{metrics.blockedUsers} bloqueados</span>
                        </div>
                      </div>
                    </div>

                    {/* Consultas Hoje */}
                    <div className="p-4 rounded-xl bg-[#011d1c] border border-[#003734] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-[#bbc7c6] uppercase tracking-wider">
                          Consultas Realizadas Hoje
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                          <Activity className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#cbfffc]">
                          {metrics.totalQueriesToday}
                        </div>
                        <p className="text-[11px] text-[#707777] font-mono mt-1">
                          Total acumulado: {metrics.totalQueriesAllTime} consultas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Ranking: Contas que Mais Realizaram Consultas no Dia */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#011d1c] border border-[#003734]">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-[#ffd166]" />
                        <h3 className="text-sm sm:text-base font-bold text-[#ffffff] font-mono uppercase">
                          Contas que mais realizaram consultas hoje
                        </h3>
                      </div>
                      <span className="text-xs text-[#707777] font-mono">
                        Média: {metrics.avgQueriesPerActiveUser} consultas/usuário ativo
                      </span>
                    </div>

                    {topUsersToday.length === 0 ? (
                      <div className="py-8 text-center text-xs font-mono text-[#707777]">
                        Nenhuma consulta registrada hoje ainda. As consultas aparecem aqui em tempo real.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-[#003734] text-[#bbc7c6] uppercase tracking-wider">
                              <th className="pb-2.5 pl-2 font-semibold">Posição</th>
                              <th className="pb-2.5 font-semibold">Usuário / Operador</th>
                              <th className="pb-2.5 font-semibold">Plano</th>
                              <th className="pb-2.5 font-semibold text-center">Consultas Hoje</th>
                              <th className="pb-2.5 font-semibold text-center">Disparar WebPush</th>
                              <th className="pb-2.5 font-semibold text-center">Consultas Detalhadas</th>
                              <th className="pb-2.5 font-semibold text-center">Total Histórico</th>
                              <th className="pb-2.5 font-semibold text-right pr-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#003734]/50">
                            {topUsersToday.map((item, index) => {
                              const isTop1 = index === 0;
                              const isTop2 = index === 1;
                              const isTop3 = index === 2;

                              return (
                                <tr key={item.userId + index} className="hover:bg-[#003734]/20 transition-colors">
                                  <td className="py-3 pl-2">
                                    <div className="flex items-center gap-1.5">
                                      {isTop1 ? (
                                        <span className="w-6 h-6 rounded-full bg-[#ffd166]/20 border border-[#ffd166] text-[#ffd166] flex items-center justify-center font-bold">
                                          1º
                                        </span>
                                      ) : isTop2 ? (
                                        <span className="w-6 h-6 rounded-full bg-[#79fbf5]/20 border border-[#79fbf5] text-[#79fbf5] flex items-center justify-center font-bold">
                                          2º
                                        </span>
                                      ) : isTop3 ? (
                                        <span className="w-6 h-6 rounded-full bg-[#00827c]/20 border border-[#00827c] text-[#cbfffc] flex items-center justify-center font-bold">
                                          3º
                                        </span>
                                      ) : (
                                        <span className="w-6 h-6 text-[#707777] flex items-center justify-center">
                                          {index + 1}º
                                        </span>
                                      )}
                                    </div>
                                   </td>
                                  <td className="py-3">
                                    {(() => {
                                      const emailLower = (item.userEmail || '').toLowerCase();
                                      const rankPhoto = item.userPhotoURL || (item.userId ? usersPhotoMap.get(item.userId) : undefined) || (emailLower ? usersPhotoMap.get(emailLower) : undefined);
                                      return (
                                        <div className="flex items-center gap-3">
                                          <OperatorAvatar
                                            photoURL={rankPhoto}
                                            name={item.userName}
                                            email={item.userEmail}
                                            size="sm"
                                            idKey={item.userId}
                                          />
                                          <div className="min-w-0">
                                            <div className="font-semibold text-[#ffffff] text-xs leading-tight truncate">{item.userName}</div>
                                            <div className="text-[11px] text-[#707777] font-mono leading-tight mt-0.5 truncate">{item.userEmail}</div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-3">
                                    <span className="px-2 py-0.5 rounded bg-[#003734] text-[#cbfffc] text-[10px]">
                                      {item.plan}
                                    </span>
                                  </td>
                                  <td className="py-3 text-center">
                                    <span className="px-2.5 py-1 rounded bg-[#00827c]/20 border border-[#00827c]/40 text-[#cbfffc] font-bold text-xs">
                                      {item.queriesToday}
                                    </span>
                                  </td>
                                  <td className="py-3 text-center">
                                    <button
                                      id={`btn-ranking-send-push-${item.userId}`}
                                      onClick={() => {
                                        const emailLower = (item.userEmail || '').toLowerCase();
                                        const rankPhoto = item.userPhotoURL || (item.userId ? usersPhotoMap.get(item.userId) : undefined) || (emailLower ? usersPhotoMap.get(emailLower) : undefined);
                                        setDirectPushUserTarget({
                                          userId: item.userId,
                                          userEmail: item.userEmail,
                                          userName: item.userName,
                                          plan: item.plan,
                                          status: item.status,
                                          photoURL: rankPhoto,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00827c]/30 to-[#00a8a0]/30 hover:from-[#00827c]/60 hover:to-[#00a8a0]/60 text-[#cbfffc] hover:text-[#ffffff] border border-[#00827c] hover:border-[#79fbf5] text-xs font-semibold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                      title={`Enviar imagem e texto via WebPush para ${item.userName}`}
                                    >
                                      <Send className="w-3.5 h-3.5 text-[#79fbf5] shrink-0" />
                                      <span>Enviar Mensagem</span>
                                    </button>
                                  </td>
                                  <td className="py-3 text-center">
                                    <button
                                      id={`btn-ranking-view-queries-${item.userId}`}
                                      onClick={() => {
                                        const emailLower = (item.userEmail || '').toLowerCase();
                                        const rankPhoto = item.userPhotoURL || (item.userId ? usersPhotoMap.get(item.userId) : undefined) || (emailLower ? usersPhotoMap.get(emailLower) : undefined);
                                        handleOpenUserConsultas(item.userId, item.userEmail, item.userName, item.plan, item.status, rankPhoto);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00827c]/20 hover:bg-[#00827c]/40 text-[#79fbf5] border border-[#00827c]/60 hover:border-[#79fbf5] text-xs font-semibold font-mono transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                      title={`Visualizar todas as consultas pesquisadas por ${item.userName}`}
                                    >
                                      <Eye className="w-3.5 h-3.5 shrink-0" />
                                      <span>Visualizar Consultas</span>
                                    </button>
                                  </td>
                                  <td className="py-3 text-center text-[#bbc7c6]">
                                    {item.queriesTotal}
                                  </td>
                                  <td className="py-3 text-right pr-2">
                                    {item.status === 'Bloqueado' ? (
                                      <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/40 text-[10px]">
                                        Bloqueado
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/40 text-[10px]">
                                        Ativo
                                      </span>
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

              {/* TAB 2: GESTÃO DE CLIENTES */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Barra de Filtros e Busca */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-[#011d1c] border border-[#003734]">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#707777] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-search-users"
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, e-mail ou plano..."
                        className="w-full pl-9 pr-4 py-2 bg-[#012624] border border-[#003734] focus:border-[#cbfffc] rounded-lg text-xs font-mono text-[#ffffff] placeholder-[#707777] outline-none transition-colors"
                      />
                    </div>

                    {/* Chips de Status */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                      <button
                        onClick={() => setUserFilterStatus('all')}
                        className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          userFilterStatus === 'all'
                            ? 'bg-[#00827c] border-[#00827c] text-[#011d1c] font-bold'
                            : 'bg-[#012624] border-[#003734] text-[#bbc7c6] hover:text-[#ffffff]'
                        }`}
                      >
                        Todos ({usersList.length})
                      </button>
                      <button
                        onClick={() => setUserFilterStatus('active')}
                        className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          userFilterStatus === 'active'
                            ? 'bg-[#00827c] border-[#00827c] text-[#011d1c] font-bold'
                            : 'bg-[#012624] border-[#003734] text-[#bbc7c6] hover:text-[#ffffff]'
                        }`}
                      >
                        Ativos ({metrics.activeUsers})
                      </button>
                      <button
                        onClick={() => setUserFilterStatus('expired')}
                        className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          userFilterStatus === 'expired'
                            ? 'bg-[#00827c] border-[#00827c] text-[#011d1c] font-bold'
                            : 'bg-[#012624] border-[#003734] text-[#bbc7c6] hover:text-[#ffffff]'
                        }`}
                      >
                        Expirados ({metrics.expiredUsers})
                      </button>
                      <button
                        onClick={() => setUserFilterStatus('blocked')}
                        className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          userFilterStatus === 'blocked'
                            ? 'bg-red-500 border-red-500 text-white font-bold'
                            : 'bg-[#012624] border-[#003734] text-red-400 hover:text-red-300'
                        }`}
                      >
                        Bloqueados ({metrics.blockedUsers})
                      </button>

                      {/* Botão Campanhas WebPush */}
                      <button
                        id="btn-global-notification"
                        type="button"
                        onClick={() => setActiveTab('campaigns')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-90 text-[#011d1c] font-bold text-xs transition-all cursor-pointer shrink-0 ml-auto shadow-sm"
                        title="Criar e disparar campanha WebPush segmentada para usuários"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Campanhas WebPush</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback de Ações (Bloqueio/Expirado/Reativação) */}
                  {actionFeedbackMsg && (
                    <div className={`p-3 rounded-xl mb-3 text-xs flex items-center gap-2 border font-mono animate-in fade-in duration-200 ${
                      actionFeedbackMsg.type === 'success' 
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' 
                        : 'bg-red-950/70 border-red-500/50 text-red-300'
                    }`}>
                      {actionFeedbackMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span className="font-semibold">{actionFeedbackMsg.text}</span>
                    </div>
                  )}

                  {/* Tabela de Clientes */}
                  <div className="rounded-xl bg-[#011d1c] border border-[#003734] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[#003734] bg-[#012624] text-[#bbc7c6] uppercase tracking-wider">
                            <th className="py-3 px-4 font-semibold">Cliente</th>
                            <th className="py-3 px-4 font-semibold">Data de Cadastro</th>
                            <th className="py-3 px-4 font-semibold">Plano Atual</th>
                            <th className="py-3 px-4 font-semibold">Validade</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold text-right">Ações Rápidas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#003734]/50">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-[#707777]">
                                Nenhum cliente encontrado com os filtros selecionados.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((u) => {
                              const validity = calculateAccountValidity(u);
                              const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
                              const isExpiredOrBlocked = isBlocked || u.planStatus === 'expired' || validity.isExpired || !validity.isValid;
                              const isThisAdmin = u.email === 'wrbatata6@gmail.com';
                              const isLoadingAction = actionLoadingUserId === u.id;

                              return (
                                <tr key={u.id} className="hover:bg-[#003734]/20 transition-colors">
                                  {/* Info Usuário */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <OperatorAvatar
                                        photoURL={u.photoURL}
                                        name={u.displayName}
                                        email={u.email}
                                        size="sm"
                                        idKey={u.id}
                                      />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-[#ffffff]">
                                            {u.displayName || 'Operador'}
                                          </span>
                                          {isThisAdmin && (
                                            <span className="px-1.5 py-0.2 rounded bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166] text-[9px] font-bold">
                                              ADMIN MASTER
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-[#707777]">{u.email}</div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Data de Cadastro */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    {(() => {
                                      const regDate = formatRegistrationDate(u.createdAt);
                                      return (
                                        <div>
                                          <div className="flex items-center gap-1.5 text-xs text-[#cbfffc]">
                                            <Calendar className="w-3.5 h-3.5 text-[#00827c] shrink-0" />
                                            <span>{regDate.full}</span>
                                          </div>
                                          <div className="text-[10px] text-[#707777] ml-5">
                                            {regDate.relative}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  {/* Plano */}
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                      isThisAdmin || u.plan === 'lifetime'
                                        ? 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40'
                                        : 'bg-[#003734] text-[#cbfffc]'
                                    }`}>
                                      {validity.planDisplayName}
                                    </span>
                                  </td>

                                   {/* Validade */}
                                  <td className="py-3.5 px-4">
                                    <div className="text-[11px]">
                                      {isThisAdmin || validity.isLifetime ? (
                                        <span className="text-[#ffd166] font-bold flex items-center gap-1">
                                          <Sparkles className="w-3 h-3" />
                                          Vitalício (Sem expiração)
                                        </span>
                                      ) : isExpiredOrBlocked ? (
                                        <span className="text-red-400 font-bold">Expirado</span>
                                      ) : validity.isQuotaExhausted ? (
                                        <span className="text-amber-400 font-medium">Cota esgotada (0 restantes)</span>
                                      ) : (
                                        <span className="text-[#cbfffc]">
                                          {validity.daysRemaining}d restantes ({validity.expirationDateFormatted})
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-3.5 px-4">
                                    {isExpiredOrBlocked ? (
                                      <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/40 text-[10px] font-bold">
                                        Expirado
                                      </span>
                                    ) : validity.isValid ? (
                                      <span className="px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                                        Ativo
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/40 text-[10px] font-bold">
                                        Expirado
                                      </span>
                                    )}
                                  </td>

                                  {/* Ações */}
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2 relative">
                                      {/* Botão Visualizar Consultas */}
                                      <button
                                        id={`btn-client-view-queries-${u.id}`}
                                        onClick={() => handleOpenUserConsultas(
                                          u.id, 
                                          u.email, 
                                          u.displayName, 
                                          u.planName || u.plan,
                                          isExpiredOrBlocked ? 'Expirado' : (validity.isValid ? 'Ativo' : 'Expirado'),
                                          u.photoURL
                                        )}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00827c]/20 hover:bg-[#00827c]/40 text-[#79fbf5] border border-[#00827c]/50 hover:border-[#79fbf5] text-xs transition-all cursor-pointer font-medium whitespace-nowrap"
                                        title="Visualizar todas as consultas pesquisadas por este cliente de forma organizada"
                                      >
                                        <Eye className="w-3 h-3 text-[#79fbf5]" />
                                        <span>Visualizar Consultas</span>
                                      </button>

                                      {/* Não permite bloquear o próprio admin master */}
                                      {!isThisAdmin && (
                                        <>
                                          {/* Botão Enviar WebPush / Mensagem Direta */}
                                          <button
                                            id={`btn-notify-user-${u.id}`}
                                            onClick={() => setDirectPushUserTarget({
                                              userId: u.id,
                                              userEmail: u.email,
                                              userName: u.displayName || u.email,
                                              plan: u.plan,
                                              status: u.planStatus,
                                              photoURL: u.photoURL,
                                            })}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00827c]/20 hover:bg-[#00827c]/40 text-[#cbfffc] border border-[#00827c]/40 text-xs transition-all cursor-pointer"
                                            title="Enviar mensagem com foto e link via WebPush para este cliente"
                                          >
                                            <Send className="w-3 h-3 text-[#79fbf5]" />
                                            <span>WebPush</span>
                                          </button>

                                          {/* Botão Bloquear / Desbloquear / Reativar */}
                                          <button
                                            id={`btn-block-user-${u.id}`}
                                            onClick={() => handleToggleBlock(u)}
                                            disabled={isLoadingAction}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                                              isExpiredOrBlocked
                                                ? 'bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                                                : 'bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-500/40'
                                            }`}
                                            title={
                                              isExpiredOrBlocked 
                                                ? 'Reativar acesso deste cliente' 
                                                : 'Bloquear usuário e alterar status para Expirado'
                                            }
                                          >
                                            {isLoadingAction ? (
                                              <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : isExpiredOrBlocked ? (
                                              <>
                                                <Unlock className="w-3 h-3" />
                                                <span>Reativar</span>
                                              </>
                                            ) : (
                                              <>
                                                <Lock className="w-3 h-3" />
                                                <span>Bloquear</span>
                                              </>
                                            )}
                                          </button>

                                          {/* Dropdown de Estender Plano */}
                                          <div className="relative">
                                            <button
                                              id={`btn-plan-dropdown-${u.id}`}
                                              onClick={() => setPlanDropdownUserId(planDropdownUserId === u.id ? null : u.id)}
                                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#003734] hover:bg-[#004743] text-[#cbfffc] border border-[#00827c]/40 text-xs transition-all cursor-pointer"
                                            >
                                              <span>Alterar Plano</span>
                                              <ChevronDown className="w-3 h-3" />
                                            </button>

                                            {planDropdownUserId === u.id && (
                                              <div className="absolute right-0 mt-1 w-44 rounded-lg bg-[#011d1c] border border-[#00827c] shadow-xl z-20 p-1 flex flex-col gap-1 text-left animate-in fade-in">
                                                <button
                                                  onClick={() => handleUpdatePlan(u.id, 'weekly', 7)}
                                                  className="px-2.5 py-1.5 rounded text-[11px] text-[#ffffff] hover:bg-[#003734] text-left transition-colors cursor-pointer"
                                                >
                                                  +7 Dias (Semanal)
                                                </button>
                                                <button
                                                  onClick={() => handleUpdatePlan(u.id, 'biweekly', 15)}
                                                  className="px-2.5 py-1.5 rounded text-[11px] text-[#ffffff] hover:bg-[#003734] text-left transition-colors cursor-pointer"
                                                >
                                                  +15 Dias (Quinzenal)
                                                </button>
                                                <button
                                                  onClick={() => handleUpdatePlan(u.id, 'monthly', 30)}
                                                  className="px-2.5 py-1.5 rounded text-[11px] text-[#ffffff] hover:bg-[#003734] text-left transition-colors cursor-pointer"
                                                >
                                                  +30 Dias (Mensal)
                                                </button>
                                                <div className="border-t border-[#003734] my-0.5"></div>
                                                <button
                                                  onClick={() => handleUpdatePlan(u.id, 'lifetime')}
                                                  className="px-2.5 py-1.5 rounded text-[11px] text-[#ffd166] hover:bg-[#003734] text-left font-bold transition-colors cursor-pointer flex items-center gap-1"
                                                >
                                                  <Crown className="w-3 h-3" />
                                                  Tornar Lifetime Eterno
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GERADOR DE CUPONS */}
              {activeTab === 'coupons' && (
                <div className="space-y-6">
                  {/* Formulário de Criação de Cupom */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#011d1c] border border-[#00827c]/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-4 h-4 text-[#ffd166]" />
                      <h3 className="text-sm sm:text-base font-bold text-[#ffffff] font-mono uppercase">
                        Criar Novo Cupom de Ativação ou Desconto
                      </h3>
                    </div>

                    {couponSuccessMessage && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{couponSuccessMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateCouponSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tipo de Cupom */}
                        <div>
                          <label className="block text-xs font-mono text-[#bbc7c6] mb-1.5">
                            Tipo de Cupom:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewCouponType('activation');
                                setNewCouponPrice(0);
                              }}
                              className={`px-3 py-2 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer text-center ${
                                newCouponType === 'activation'
                                  ? 'bg-[#00827c] border-[#00827c] text-[#011d1c] font-bold shadow-sm'
                                  : 'bg-[#012624] border-[#003734] text-[#bbc7c6] hover:text-[#ffffff]'
                              }`}
                            >
                              Ativação 100% Grátis
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewCouponType('discount');
                                setNewCouponPrice(11.0);
                              }}
                              className={`px-3 py-2 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer text-center ${
                                newCouponType === 'discount'
                                  ? 'bg-[#00827c] border-[#00827c] text-[#011d1c] font-bold shadow-sm'
                                  : 'bg-[#012624] border-[#003734] text-[#bbc7c6] hover:text-[#ffffff]'
                              }`}
                            >
                              Desconto Novo Usuário
                            </button>
                          </div>
                        </div>

                        {/* Código do Cupom */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-mono text-[#bbc7c6]">
                              Código Único:
                            </label>
                            <button
                              type="button"
                              onClick={handleGenerateRandomCode}
                              className="text-[11px] text-[#cbfffc] hover:underline font-mono cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-[#ffd166]" />
                              Gerar Aleatório
                            </button>
                          </div>
                          <input
                            type="text"
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                            placeholder="Ex: PROMO-2026 ou ATIV-9988"
                            className="w-full px-3 py-2 bg-[#012624] border border-[#003734] focus:border-[#cbfffc] rounded-lg text-xs font-mono text-[#ffffff] uppercase placeholder-[#707777] outline-none"
                            required
                          />
                        </div>

                        {/* Benefício / Valor */}
                        <div>
                          <label className="block text-xs font-mono text-[#bbc7c6] mb-1.5">
                            {newCouponType === 'activation' ? 'Dias de Ativação Grátis:' : 'Preço com Desconto (R$):'}
                          </label>
                          {newCouponType === 'activation' ? (
                            <input
                              type="number"
                              value={newCouponDays}
                              onChange={(e) => setNewCouponDays(Number(e.target.value))}
                              min={1}
                              max={365}
                              className="w-full px-3 py-2 bg-[#012624] border border-[#003734] focus:border-[#cbfffc] rounded-lg text-xs font-mono text-[#ffffff] outline-none"
                            />
                          ) : (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#707777]">
                                R$
                              </span>
                              <input
                                type="number"
                                step="0.50"
                                value={newCouponPrice}
                                onChange={(e) => setNewCouponPrice(Number(e.target.value))}
                                min={1}
                                max={35}
                                className="w-full pl-9 pr-3 py-2 bg-[#012624] border border-[#003734] focus:border-[#cbfffc] rounded-lg text-xs font-mono text-[#ffffff] outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-[#707777] font-mono">
                          {newCouponType === 'activation'
                            ? 'O cliente digita o código no checkout do plano R$ 35 e a conta é ativada por 30 dias sem cobrar nada.'
                            : 'O plano mensal cai de R$ 35,00 para R$ 11,00 para novos clientes (queima o código antes do pagamento).'}
                        </p>

                        <button
                          type="submit"
                          disabled={isCreatingCoupon}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00827c] to-[#00a8a0] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isCreatingCoupon ? 'Salvando...' : 'Criar e Salvar Cupom'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Listagem de Cupons */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-mono text-[#bbc7c6] uppercase tracking-wider">
                        Lista de Cupons Registrados ({filteredCoupons.length})
                      </h4>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={couponSearchTerm}
                          onChange={(e) => setCouponSearchTerm(e.target.value)}
                          placeholder="Buscar código ou e-mail..."
                          className="px-3 py-1.5 bg-[#011d1c] border border-[#003734] rounded-lg text-xs font-mono text-[#ffffff] placeholder-[#707777] outline-none"
                        />
                        <button
                          onClick={() => setCouponFilterStatus('all')}
                          className={`px-2.5 py-1 rounded text-xs font-mono ${
                            couponFilterStatus === 'all' ? 'bg-[#00827c] text-[#011d1c] font-bold' : 'text-[#bbc7c6]'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setCouponFilterStatus('available')}
                          className={`px-2.5 py-1 rounded text-xs font-mono ${
                            couponFilterStatus === 'available' ? 'bg-[#00827c] text-[#011d1c] font-bold' : 'text-[#bbc7c6]'
                          }`}
                        >
                          Disponíveis
                        </button>
                        <button
                          onClick={() => setCouponFilterStatus('used')}
                          className={`px-2.5 py-1 rounded text-xs font-mono ${
                            couponFilterStatus === 'used' ? 'bg-[#00827c] text-[#011d1c] font-bold' : 'text-[#bbc7c6]'
                          }`}
                        >
                          Já Usados
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#011d1c] border border-[#003734] overflow-hidden">
                      <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="sticky top-0 bg-[#012624] border-b border-[#003734]">
                            <tr className="text-[#bbc7c6] uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-semibold">Código</th>
                              <th className="py-2.5 px-4 font-semibold">Tipo</th>
                              <th className="py-2.5 px-4 font-semibold">Benefício</th>
                              <th className="py-2.5 px-4 font-semibold">Status de Uso</th>
                              <th className="py-2.5 px-4 font-semibold text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#003734]/50">
                            {filteredCoupons.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-[#707777]">
                                  Nenhum cupom encontrado.
                                </td>
                              </tr>
                            ) : (
                              filteredCoupons.map((c) => {
                                const isCopied = copiedCouponCode === c.code;

                                return (
                                  <tr key={c.code} className="hover:bg-[#003734]/20 transition-colors">
                                    <td className="py-3 px-4 font-bold text-[#ffffff]">
                                      <div className="flex items-center gap-2">
                                        <span>{c.code}</span>
                                        <button
                                          onClick={() => handleCopyCode(c.code)}
                                          className="p-1 hover:text-[#cbfffc] text-[#707777] rounded transition-colors cursor-pointer"
                                          title="Copiar código"
                                        >
                                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                                        c.type === 'activation'
                                          ? 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40'
                                          : 'bg-[#003734] text-[#cbfffc]'
                                      }`}>
                                        {c.type === 'activation' ? 'Ativação Direta (Grátis)' : 'Desconto R$ 35 -> R$ 11'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-[#bbc7c6]">
                                      {c.type === 'activation' 
                                        ? `${c.days || 30} dias grátis` 
                                        : `R$ ${(c.discountedPrice || 11).toFixed(2).replace('.', ',')}`}
                                    </td>
                                    <td className="py-3 px-4">
                                      {c.used ? (
                                        <div>
                                          <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/40 text-[10px] font-bold">
                                            Utilizado
                                          </span>
                                          {c.usedByEmail && (
                                            <div className="text-[10px] text-[#707777] mt-0.5">
                                              Por: {c.usedByEmail}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                                          Disponível para uso
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <button
                                        onClick={() => handleDeleteCoupon(c.code)}
                                        className="p-1 text-[#707777] hover:text-red-400 rounded transition-colors cursor-pointer"
                                        title="Excluir cupom"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CONSULTAS EM TEMPO REAL */}
              {activeTab === 'consultas' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#ffffff] font-mono uppercase">
                        Feed de Consultas Recentes do Dia
                      </h3>
                      <p className="text-xs text-[#707777] font-mono">
                        Últimas 50 consultas processadas pelos operadores no sistema
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded bg-[#003734] text-[#cbfffc] font-mono text-xs">
                      {metrics.totalQueriesToday} realizadas hoje
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#011d1c] border border-[#003734] overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="sticky top-0 bg-[#012624] border-b border-[#003734]">
                          <tr className="text-[#bbc7c6] uppercase tracking-wider">
                            <th className="py-2.5 px-4 font-semibold">Data / Hora</th>
                            <th className="py-2.5 px-4 font-semibold">Operador</th>
                            <th className="py-2.5 px-4 font-semibold">Módulo</th>
                            <th className="py-2.5 px-4 font-semibold">Parâmetro Consultado</th>
                            <th className="py-2.5 px-4 font-semibold">Tempo</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#003734]/50">
                          {recentConsultas.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-[#707777]">
                                Nenhuma consulta registrada recentemente.
                              </td>
                            </tr>
                          ) : (
                            recentConsultas.map((c) => {
                              const date = new Date(c.timestamp);
                              const formattedTime = !isNaN(date.getTime())
                                ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : '--:--';

                              const emailLower = (c.userEmail || '').toLowerCase();
                              const operatorPhoto = c.userPhotoURL || (c.userId ? usersPhotoMap.get(c.userId) : undefined) || (emailLower ? usersPhotoMap.get(emailLower) : undefined);

                              return (
                                <tr key={c.id} className="hover:bg-[#003734]/20 transition-colors">
                                  <td className="py-2.5 px-4 text-[#707777] whitespace-nowrap">
                                    {formattedTime}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <OperatorAvatar
                                        photoURL={operatorPhoto}
                                        name={c.userName}
                                        email={c.userEmail}
                                        size="md"
                                        idKey={c.id}
                                      />
                                      <div className="min-w-0">
                                        <div className="font-semibold text-[#ffffff] text-xs leading-tight truncate">
                                          {c.userName || 'Operador'}
                                        </div>
                                        <div className="text-[10px] text-[#707777] font-mono leading-tight mt-0.5 truncate">
                                          {c.userEmail}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="px-2 py-0.5 rounded bg-[#003734] text-[#cbfffc] text-[10px]">
                                      {c.modulo_titulo || c.modulo}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 font-bold text-[#79fbf5]">
                                    {c.parametro}
                                  </td>
                                  <td className="py-2.5 px-4 text-[#707777]">
                                    {c.tempo_resposta_ms ? `${c.tempo_resposta_ms}ms` : '--'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                                      c.status === 'concluida' || c.status === 'sucesso'
                                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-900/30 text-amber-400 border border-amber-500/30'
                                    }`}>
                                      {c.status || 'OK'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CAMPANHAS WEBPUSH */}
              {activeTab === 'campaigns' && (
                <PushCampaignsTab
                  usersList={usersList}
                  currentUserEmail={currentUserEmail}
                  onCampaignSent={loadDashboardData}
                />
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#003734] bg-[#011d1c] flex items-center justify-between text-xs font-mono text-[#707777]">
          <span>
            Painel Administrativo Shazam Buscas Core • Versão 2.5
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#003734] hover:bg-[#004743] text-[#ffffff] transition-colors cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>

        {/* Modal Interativo para Envio de Notificação Direta / Global */}
        {notificationModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-[#011d1c] border border-[#00827c] shadow-2xl p-6 text-left relative font-mono">
              {/* Botão Fechar */}
              <button
                type="button"
                onClick={() => {
                  if (!isSendingNotification) {
                    setNotificationModalTarget(null);
                    setNotificationSuccessMsg(null);
                  }
                }}
                className="absolute top-4 right-4 p-1.5 text-[#707777] hover:text-[#ffffff] rounded-lg hover:bg-[#003734] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00827c]/20 border border-[#00827c] flex items-center justify-center text-[#00a8a0] shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#ffffff]">
                    {notificationModalTarget === 'all' 
                      ? 'Enviar Notificação Global' 
                      : 'Enviar Notificação para Cliente'}
                  </h3>
                  <p className="text-xs text-[#707777] mt-0.5">
                    {notificationModalTarget === 'all'
                      ? 'Aviso será transmitido em tempo real para todos os clientes reais.'
                      : `Destinatário: ${notificationModalTarget.displayName || 'Cliente'} (${notificationModalTarget.email})`}
                  </p>
                </div>
              </div>

              {notificationSuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 my-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{notificationSuccessMsg}</span>
                </div>
              ) : (
                <form onSubmit={handleSendNotificationSubmit} className="space-y-4">
                  {/* Tipo de Notificação */}
                  <div>
                    <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                      Tipo de Alerta
                    </label>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setNotificationType('info')}
                        className={`px-2 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          notificationType === 'info'
                            ? 'bg-[#00827c] border-[#00827c] text-[#011d1c] font-bold'
                            : 'bg-[#012624] border-[#003734] text-[#bbc7c6] hover:text-white'
                        }`}
                      >
                        Informativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationType('warning')}
                        className={`px-2 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          notificationType === 'warning'
                            ? 'bg-amber-500 border-amber-500 text-black font-bold'
                            : 'bg-[#012624] border-[#003734] text-amber-300 hover:text-white'
                        }`}
                      >
                        Aviso
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationType('success')}
                        className={`px-2 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          notificationType === 'success'
                            ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                            : 'bg-[#012624] border-[#003734] text-emerald-300 hover:text-white'
                        }`}
                      >
                        Sucesso / Bônus
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationType('urgent')}
                        className={`px-2 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          notificationType === 'urgent'
                            ? 'bg-red-500 border-red-500 text-white font-bold'
                            : 'bg-[#012624] border-[#003734] text-red-300 hover:text-white'
                        }`}
                      >
                        Urgente
                      </button>
                    </div>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                      Título da Notificação
                    </label>
                    <input
                      type="text"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder="Ex: Aviso Importante da Administração"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#012624] border border-[#003734] text-[#ffffff] text-xs focus:border-[#00827c] focus:outline-none placeholder-[#707777]"
                    />
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                      Mensagem do Comunicado
                    </label>
                    <textarea
                      rows={4}
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="Escreva a mensagem que será exibida para o usuário em tempo real..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#012624] border border-[#003734] text-[#ffffff] text-xs focus:border-[#00827c] focus:outline-none placeholder-[#707777] resize-none"
                    />
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSendingNotification}
                      onClick={() => setNotificationModalTarget(null)}
                      className="px-4 py-2 rounded-lg bg-[#012624] hover:bg-[#003734] text-[#bbc7c6] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingNotification}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-90 text-[#011d1c] text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSendingNotification ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Transmitindo...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Notificação</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal Organizado de Visualização de Consultas do Usuário */}
        <UserConsultasModal
          isOpen={Boolean(userConsultasTarget)}
          onClose={() => setUserConsultasTarget(null)}
          user={userConsultasTarget}
          preloadedConsultas={recentConsultas}
        />

        {/* Modal de Disparo Direto de WebPush (Foto, Texto, Link por Usuário) */}
        <SendDirectWebPushModal
          isOpen={Boolean(directPushUserTarget)}
          onClose={() => setDirectPushUserTarget(null)}
          targetUser={directPushUserTarget}
          onSuccess={loadDashboardData}
        />
      </div>
    </div>
  );
};
