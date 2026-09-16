import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QueryForm } from './components/QueryForm';
import { ReportCard } from './components/ReportCard';
import { StatsBar } from './components/StatsBar';
import { SetupInstructionsModal } from './components/SetupInstructionsModal';
import { SourceCodeViewerModal } from './components/SourceCodeViewerModal';
import { QueryHistoryList } from './components/QueryHistoryList';
import { ParticleSphereVisual } from './components/ParticleSphereVisual';
import { PricingModal } from './components/PricingModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PixCheckoutModal } from './components/PixCheckoutModal';
import { SaaSLandingLoginPage } from './components/SaaSLandingLoginPage';
import { captureReferralCodeFromUrl, trackNewUserReferral } from './lib/resellerService';
import { AuthErrorModal, AuthErrorDetails } from './components/AuthErrorModal';
import { ProSearchModal } from './components/ProSearchModal';
import { ZyrexSearchModal } from './components/ZyrexSearchModal';
import { SmartMapsModal } from './components/SmartMapsModal';
import { CepIntelligenceModal } from './components/CepIntelligenceModal';
import { MaintenanceModal } from './components/MaintenanceModal';
import { 
  QueryModuleType, 
  QueryRecord, 
  TelegramConfigState,
  QueryOption
} from './types';
import { OptionsSelectionCard } from './components/OptionsSelectionCard';
import { MobileModuleBar } from './components/MobileModuleBar';
import { MobileDrawer } from './components/MobileDrawer';
import { QUERY_MODULES } from './utils/modulesData';
import { parseIntelligenceResponse, SAMPLE_RESPONSES, getSampleResponseForQuery } from './utils/intelligenceTemplates';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  loginWithGoogle, 
  logoutFirebase, 
  onAuthUserChanged, 
  syncUserProfile,
  saveConsultaToFirestore, 
  fetchUserHistoryFromFirestore,
  createGuestOperatorUser,
  UserProfileData,
  deduzirConsulta,
  calculateAccountValidity,
  subscribeUserProfile,
  markNotificationAsRead
} from './lib/firebase';
import { ExpiredPlanModal } from './components/ExpiredPlanModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { playWebPushChime, triggerNativeWebPush } from './lib/pushNotificationService';
import { 
  CheckCircle2, 
  Radio,
  FileCode,
  Zap,
  Clock,
  X,
  Bell,
  Lock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  // Sistema de Cooldown de 15 Segundos entre Consultas
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [cooldownToast, setCooldownToast] = useState<{ message: string; remainingSeconds: number } | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCooldown = (seconds: number = 15, customMessage?: string) => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    const initial = Math.max(1, seconds);
    setCooldownSeconds(initial);
    setCooldownToast({
      remainingSeconds: initial,
      message: customMessage || `Aguarde ${initial} segundos para realizar uma nova consulta.`,
    });

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          setCooldownToast(null);
          return 0;
        }
        const next = prev - 1;
        setCooldownToast((curr) => (curr ? { ...curr, remainingSeconds: next } : null));
        return next;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const [selectedModule, setSelectedModule] = useState<QueryModuleType>('cpf_1');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Processando solicitação...');
  
  // Estado para opções interativas de bases recebidas do bot Telegram (ex: CREDILINK, ZYREX, SI-PNI, etc.)
  const [activeOptionsData, setActiveOptionsData] = useState<{
    requestId: string;
    prompt: string;
    queryParam: string;
    moduleType?: string;
    options: QueryOption[];
    selectedOption?: string;
  } | null>(null);
  
  const [currentActiveRecord, setCurrentActiveRecord] = useState<QueryRecord | null>(null);
  const [pendingQueries, setPendingQueries] = useState<QueryRecord[]>([]);
  const [history, setHistory] = useState<QueryRecord[]>([]);
  
  // Firebase Auth State: sistema restrito a usuários autenticados
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const currentUserRef = useRef<FirebaseUser | null>(null);
  currentUserRef.current = currentUser;
  
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isZyrexModalOpen, setIsZyrexModalOpen] = useState(false);
  const [isSmartMapsOpen, setIsSmartMapsOpen] = useState(false);
  const [isCepScanOpen, setIsCepScanOpen] = useState(false);
  const [cepScanTarget, setCepScanTarget] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [selectedPlanForPix, setSelectedPlanForPix] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [pixDiscountCode, setPixDiscountCode] = useState<string | undefined>(undefined);
  const [pixDiscountedPrice, setPixDiscountedPrice] = useState<number | undefined>(undefined);
  const [isExpiredPlanModalOpen, setIsExpiredPlanModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Checagem central de validade de conta e plano expirado
  const accountValidity = calculateAccountValidity(userProfile);
  const isAdminUser = Boolean(
    (currentUser?.email && ['wrbatata6@gmail.com'].includes(currentUser.email.toLowerCase())) ||
    userProfile?.role === 'admin' ||
    userProfile?.plan === 'lifetime' ||
    accountValidity.isLifetime
  );
  const isUserBlocked = !isAdminUser && Boolean(
    userProfile?.isBlocked || userProfile?.planStatus === 'blocked'
  );
  const isAccountExpired = !isAdminUser && (
    accountValidity.isExpired || 
    userProfile?.planStatus === 'expired' || 
    !accountValidity.isValid
  );

  // Sistema de Notificações Recebidas da Administração
  const [dismissedNotificationId, setDismissedNotificationId] = useState<string | null>(null);

  const activeNotification = useMemo(() => {
    if (!userProfile?.latestNotification) return null;
    if (!userProfile.hasUnreadNotification) return null;
    if (dismissedNotificationId === userProfile.latestNotification.id) return null;
    return userProfile.latestNotification;
  }, [userProfile, dismissedNotificationId]);

  const handleDismissNotification = async () => {
    if (userProfile?.latestNotification?.id) {
      setDismissedNotificationId(userProfile.latestNotification.id);
    }
    if (currentUser?.uid) {
      await markNotificationAsRead(currentUser.uid);
    }
  };

  // Dispara áudio e notificação nativa do sistema quando receber WebPush
  useEffect(() => {
    if (activeNotification && !isUserBlocked) {
      playWebPushChime();
      triggerNativeWebPush({
        title: activeNotification.title,
        message: activeNotification.message,
        imageUrl: activeNotification.imageUrl,
        linkUrl: activeNotification.linkUrl,
      });
    }
  }, [activeNotification?.id, isUserBlocked]);

  // Prompt de Permissão de Notificações WebPush (logo após login com Google)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    if (currentUser && userProfile) {
      const isGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      const isDeclinedSession = sessionStorage.getItem('shazam_push_prompt_dismissed') === 'true';

      if (!isGranted && !isDeclinedSession) {
        const timer = setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser?.uid, userProfile?.notificationsEnabled]);

  // Captura código de indicação do revendedor na URL (?ref=CODIGO) ao carregar
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  // Controle de erros de autenticação OAuth (ex: domínio não autorizado no Netlify)
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);
  const [isAuthErrorModalOpen, setIsAuthErrorModalOpen] = useState(false);

  // Auto-resposta desativada para forçar o uso real do Telegram configurado no Render
  const [autoSimulate, setAutoSimulate] = useState(false);
  const autoSimulateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPendingIdRef = useRef<string | null>(null);

  // Endereço IP do cliente detectado para auditoria e histórico de pesquisas
  const [clientIp, setClientIp] = useState<string>('');
  const clientIpRef = useRef<string>('');

  const [telegramConfig, setTelegramConfig] = useState<TelegramConfigState>({
    hasToken: false,
    hasChatId: false,
    isPollingOrWebhookActive: false,
    activeRequestsCount: 0,
  });

  // Flag indicando se o status do barramento/sessão já foi recebido ao menos uma vez
  const [isStatusLoaded, setIsStatusLoaded] = useState(false);

  // Current selected module information
  const currentModuleInfo = useMemo(() => {
    return QUERY_MODULES.find((m) => m.id === selectedModule) || QUERY_MODULES[0];
  }, [selectedModule]);

  const [isReconnectingTelegram, setIsReconnectingTelegram] = useState(false);

  const handleReconnectTelegram = async () => {
    try {
      setIsReconnectingTelegram(true);
      const token = currentUserRef.current ? await currentUserRef.current.getIdToken().catch(() => '') : '';
      const res = await fetch('/api/telegram/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        setTelegramConfig((prev) => ({
          ...prev,
          userbotStatus: 'connected',
          userName: data.profile?.firstName,
          phone: data.profile?.phone,
          botUsername: data.profile?.username || data.profile?.firstName,
          lastError: null,
        }));
      } else {
        setTelegramConfig((prev) => ({
          ...prev,
          userbotStatus: data.userbotStatus || 'error',
          lastError: data.error || 'Falha ao restabelecer conexão com a central.',
        }));
      }
    } catch (e: any) {
      console.error('Erro ao reconectar Telegram:', e);
      setTelegramConfig((prev) => ({
        ...prev,
        userbotStatus: 'error',
        lastError: e?.message || 'Falha de conexão com a API do servidor.',
      }));
    } finally {
      setIsReconnectingTelegram(false);
    }
  };

  // 1. Imediatamente faz fetch do status inicial para garantir sincronia instantânea
  const fetchSystemStatus = async () => {
    try {
      const token = currentUserRef.current ? await currentUserRef.current.getIdToken().catch(() => '') : '';
      const res = await fetch('/api/system/status', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConfig((prev) => ({
          ...prev,
          hasToken: data.apiIdConfigured || data.hasToken,
          hasChatId: data.hasChatId,
          botUsername: data.userbotProfile?.username || data.userbotProfile?.firstName || data.botUsername,
          isPollingOrWebhookActive: true,
          activeRequestsCount: data.totalActiveQueries || 0,
          isUserbot: true,
          userbotStatus: data.userbotStatus || 'disconnected',
          sessionConfigured: data.sessionConfigured,
          apiIdConfigured: data.apiIdConfigured,
          userName: data.userbotProfile?.firstName,
          phone: data.userbotProfile?.phone,
          lastError: data.lastError || data.lastUserbotError || null,
        }));
        setIsStatusLoaded(true);
      }
    } catch (err) {
      console.warn('Erro ao carregar status do sistema:', err);
    }
  };

  // Pop-in mandatário de manutenção: aparece SOMENTE se o usuário estiver logado e a conexão com a string session estiver encerrada
  const isMaintenanceActive = Boolean(currentUser) && isStatusLoaded && (telegramConfig.userbotStatus !== 'connected');

  // Monitoramento contínuo e acelerado enquanto em manutenção para auto-desabilitar a mensagem no instante em que a string for reativada
  useEffect(() => {
    if (!isMaintenanceActive) return;
    const fastPoll = setInterval(() => {
      fetchSystemStatus();
    }, 2500);
    return () => clearInterval(fastPoll);
  }, [isMaintenanceActive]);

  // Connect to Socket.io on mount and poll system status
  useEffect(() => {
    fetchSystemStatus();
    const statusInterval = setInterval(fetchSystemStatus, 6000);

    // Identificação do endereço IP do cliente para auditoria e histórico de pesquisas
    const fetchClientIp = async () => {
      try {
        const res = await fetch('/api/my-ip');
        if (res.ok) {
          const data = await res.json();
          if (data?.ip) {
            setClientIp(data.ip);
            clientIpRef.current = data.ip;
            return;
          }
        }
      } catch {}
      try {
        const res2 = await fetch('https://api.ipify.org?format=json');
        if (res2.ok) {
          const d2 = await res2.json();
          if (d2?.ip) {
            setClientIp(d2.ip);
            clientIpRef.current = d2.ip;
          }
        }
      } catch {}
    };
    fetchClientIp();

    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
    const backendUrl = import.meta.env.VITE_API_URL || (isNetlify ? 'https://shazam-ygad.onrender.com' : (typeof window !== 'undefined' ? window.location.origin : ''));
    const socketInstance: Socket = io(backendUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: async (cb: (data: { token?: string }) => void) => {
        try {
          const token = currentUserRef.current ? await currentUserRef.current.getIdToken().catch(() => '') : '';
          cb({ token });
        } catch {
          cb({});
        }
      },
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.io Client] Conectado:', socketInstance.id);
      setIsConnected(true);
      setSocketId(socketInstance.id || null);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket.io Client] Desconectado');
      setIsConnected(false);
      setSocketId(null);
    });

    socketInstance.on('system:status', (data) => {
      setIsStatusLoaded(true);
      setTelegramConfig({
        hasToken: data.apiIdConfigured || data.hasToken,
        hasChatId: data.hasChatId,
        botUsername: data.userbotProfile?.username || data.userbotProfile?.firstName || data.botUsername,
        isPollingOrWebhookActive: true,
        activeRequestsCount: data.totalActiveQueries || 0,
        isUserbot: true,
        userbotStatus: data.userbotStatus || 'disconnected',
        sessionConfigured: data.sessionConfigured,
        apiIdConfigured: data.apiIdConfigured,
        userName: data.userbotProfile?.firstName,
        phone: data.userbotProfile?.phone,
        lastError: data.lastError || data.lastUserbotError || null,
      });
    });

    socketInstance.on('userbot:status_change', (data) => {
      setIsStatusLoaded(true);
      setTelegramConfig((prev) => ({
        ...prev,
        userbotStatus: data.userbotStatus,
        sessionConfigured: data.sessionConfigured,
        userName: data.userbotProfile?.firstName,
        phone: data.userbotProfile?.phone,
        botUsername: data.userbotProfile?.username || data.userbotProfile?.firstName,
        lastError: data.lastError || null,
      }));
    });

    // When backend acknowledges the request
    socketInstance.on('query:ack', () => {
      setLoadingStepText('Despachado com sucesso! Aguardando retorno da consulta...');
    });

    // When intermediate progress / status is received (e.g. "⏳ Consultando Nome...")
    socketInstance.on('query:progress', (data: any) => {
      console.log('[Socket.io Client] Progresso intermediário:', data);
      if (data?.message) {
        setLoadingStepText(data.message);
      }
      if (data?.options && Array.isArray(data.options) && data.options.length > 0) {
        setActiveOptionsData({
          requestId: data.id,
          prompt: data.selectionPrompt || data.prompt || data.message || 'Selecione a base de dados desejada:',
          queryParam: data.queryParam || '',
          moduleType: data.moduleType,
          options: data.options,
          selectedOption: data.selectedOption,
        });
      }
    });

    // When interactive base options are explicitly received from Telegram
    socketInstance.on('query:options_available', (data: any) => {
      console.log('[Socket.io Client] 📋 Opções de base recebidas do bot:', data);
      if (data?.options && Array.isArray(data.options) && data.options.length > 0) {
        setActiveOptionsData({
          requestId: data.id,
          prompt: data.prompt || 'Selecione a base de dados desejada:',
          queryParam: data.queryParam || '',
          moduleType: data.moduleType,
          options: data.options,
          selectedOption: data.selectedOption,
        });
        setLoadingStepText('Opções de base recebidas! Selecione a base desejada...');
      }
    });

    // When backend delivers the response
    socketInstance.on('query:response', (data: any) => {
      console.log('[Socket.io Client] Resposta recebida:', data);
      setIsLoading(false);
      setActiveOptionsData(null);

      if (autoSimulateTimerRef.current) {
        clearTimeout(autoSimulateTimerRef.current);
        autoSimulateTimerRef.current = null;
      }
      currentPendingIdRef.current = null;

      const isNotFound = 
        Boolean(data.isNotFound) ||
        data.exactMatch?.status === 'not_found' ||
        data.exactMatch?.isNegativeReported ||
        /n[ãa]o encontrado|nao encontrado|nada consta|n[ãa]o localizado|nenhum registro|❌/i.test(data.rawResponse || '');

      const isInternalError = 
        Boolean(data.hasInternalError) ||
        data.status === 'error' ||
        Boolean(data.needsRestart) ||
        /erro interno|use \/start/i.test(data.rawResponse || '') ||
        /erro interno|use \/start/i.test(data.errorMessage || '') ||
        data.rawResponse?.trim() === '🔍 Consultando...' ||
        data.rawResponse?.trim() === 'Consultando...' ||
        data.rawResponse?.trim() === '🔎 Consultando...';

      const parsed = parseIntelligenceResponse(data.rawResponse || '', data.moduleType, data.queryParam);
      const isZyrex = Boolean(
        data.isZyrex || 
        (data as any).isKrex || 
        String(data.moduleType).toLowerCase().startsWith('zyrex') || 
        String(data.moduleType).toLowerCase().startsWith('krex') ||
        String(data.moduleType).toLowerCase().includes('zyrex') || 
        String(data.moduleType).toLowerCase().includes('krex') ||
        data.moduleType === 'cep'
      );
      const completeRecord: QueryRecord = {
        ...data,
        isZyrex,
        status: isInternalError ? 'error' : (data.status || 'completed'),
        hasInternalError: isInternalError,
        needsRestart: isInternalError,
        errorMessage: isInternalError ? (data.errorMessage || 'O servidor retornou erro, por favor tente novamente em 10 segundos') : undefined,
        isNotFound,
        parsedReport: parsed,
      };

      setCurrentActiveRecord(completeRecord);
      setHistory((prev) => [completeRecord, ...prev.filter((h) => h.id !== completeRecord.id)]);
      setPendingQueries((prev) => prev.filter((p) => p.id !== completeRecord.id));

      // Persistência automática no Firebase Firestore com detalhamento completo (pesquisa, resultado, data, hora, IP)
      const userIp = data.clientIp || (completeRecord as any).clientIp || clientIpRef.current || clientIp || '127.0.0.1';
      const fullResponse = completeRecord.rawResponse || completeRecord.txtContent || '';
      const summaryText = completeRecord.parsedReport?.summary || fullResponse.slice(0, 300) || 'Consulta processada';

      saveConsultaToFirestore({
        parametro: completeRecord.queryParam,
        modulo: completeRecord.moduleType,
        modulo_titulo: completeRecord.moduleTitle,
        status: completeRecord.status,
        tempo_resposta_ms: completeRecord.durationMs,
        resultado_resumo: summaryText,
        resposta_bruta: fullResponse,
        resultado_completo: fullResponse,
        telegram_msg_id: completeRecord.telegramMessageId,
        ip: userIp,
        client_ip: userIp,
      }, currentUserRef.current || (currentUser ? currentUser : { uid: 'guest_user', email: 'cliente@shazam.terminal', displayName: 'Operador Shazam' })).catch((err) => {
        console.warn('[Firestore] Falha ao persistir consulta:', err);
      });
    });

    // When a TXT file is downloaded / available for a query
    socketInstance.on('query:txt_available', (data: any) => {
      console.log('[Socket.io Client] Novo arquivo TXT disponível:', data);
      setCurrentActiveRecord((prev) => {
        if (prev && prev.id === data.id) {
          const updated = { ...prev, txtContent: data.txtContent, txtFileName: data.txtFileName };
          if (data.rawResponse && (!prev.rawResponse || prev.rawResponse.length < data.rawResponse.length)) {
            updated.rawResponse = data.rawResponse;
            updated.parsedReport = data.parsedReport || parseIntelligenceResponse(data.rawResponse, prev.moduleType, prev.queryParam);
          }
          return updated;
        }
        return prev;
      });
      setHistory((prev) =>
        prev.map((item) => {
          if (item.id === data.id) {
            const shouldUpdateResponse = Boolean(data.rawResponse && (!item.rawResponse || item.rawResponse.length < data.rawResponse.length));
            return {
              ...item,
              txtContent: data.txtContent,
              txtFileName: data.txtFileName,
              rawResponse: shouldUpdateResponse ? data.rawResponse : item.rawResponse,
              parsedReport: shouldUpdateResponse ? (data.parsedReport || parseIntelligenceResponse(data.rawResponse, item.moduleType, item.queryParam)) : item.parsedReport,
            };
          }
          return item;
        })
      );
    });

    socketInstance.on('query:photo_available', (data: { id: string; photoUrl: string; photos?: any[] }) => {
      console.log('[Socket.io Client] Nova foto/imagem disponível:', data);
      setCurrentActiveRecord((prev) => {
        if (prev && prev.id === data.id) {
          return { ...prev, photoUrl: data.photoUrl, photos: data.photos || prev.photos };
        }
        return prev;
      });
      setHistory((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? { ...item, photoUrl: data.photoUrl, photos: data.photos || item.photos }
            : item
        )
      );
    });

    // When any query is created (for queue and auto-response)
    socketInstance.on('telegram:query_created', (data: any) => {
      setPendingQueries((prev) => {
        if (prev.some((p) => p.id === data.id)) return prev;
        return [data, ...prev];
      });

      currentPendingIdRef.current = data.id;

      // Auto-responder rápido para testes interativos se habilitado
      if (autoSimulate) {
        if (autoSimulateTimerRef.current) clearTimeout(autoSimulateTimerRef.current);
        setLoadingStepText('Solicitação despachada! Processando retorno em 1.8s...');
        autoSimulateTimerRef.current = setTimeout(() => {
          socketInstance.emit('telegram:simulate_reply', {
            requestId: data.id,
            responseText: getSampleResponseForQuery(data.moduleType as QueryModuleType, data.queryParam),
            operatorName: 'Motor Shazam Buscas',
          });
        }, 1800);
      }
    });

    // When completed globally
    socketInstance.on('query:completed_broadcast', (data: any) => {
      console.log('[Socket.io Client] query:completed_broadcast recebido:', data);
      setPendingQueries((prev) => prev.filter((p) => p.id !== data.id));

      // Se a consulta concluída for a que estamos aguardando, encerra o carregamento e renderiza o dossiê
      if (!currentPendingIdRef.current || currentPendingIdRef.current === data.id) {
        setIsLoading(false);
        setActiveOptionsData(null);
        if (autoSimulateTimerRef.current) {
          clearTimeout(autoSimulateTimerRef.current);
          autoSimulateTimerRef.current = null;
        }
        currentPendingIdRef.current = null;

        const isNotFound = 
          Boolean(data.isNotFound) ||
          data.exactMatch?.status === 'not_found' ||
          data.exactMatch?.isNegativeReported ||
          /n[ãa]o encontrado|nao encontrado|nada consta|n[ãa]o localizado|nenhum registro|❌/i.test(data.rawResponse || '');

        const parsed = parseIntelligenceResponse(data.rawResponse || '', data.moduleType, data.queryParam);
        const isZyrex = Boolean(
          data.isZyrex || 
          (data as any).isKrex || 
          String(data.moduleType).toLowerCase().startsWith('zyrex') || 
          String(data.moduleType).toLowerCase().startsWith('krex') ||
          String(data.moduleType).toLowerCase().includes('zyrex') || 
          String(data.moduleType).toLowerCase().includes('krex') ||
          data.moduleType === 'cep'
        );
        const completeRecord: QueryRecord = {
          ...data,
          isZyrex,
          status: data.status || 'completed',
          isNotFound,
          parsedReport: parsed,
        };

        setCurrentActiveRecord(completeRecord);
        setHistory((prev) => [completeRecord, ...prev.filter((h) => h.id !== completeRecord.id)]);
      } else {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === data.id ? { ...item, ...data } : item
          )
        );
      }
    });

    // When PIX payment is confirmed via UP DEPIX webhook
    socketInstance.on('payment:confirmed', async (data: any) => {
      console.log('[Socket.io] Pagamento confirmado recebido em tempo real:', data);
      if (currentUserRef.current) {
        try {
          const profile = await syncUserProfile(currentUserRef.current);
          setUserProfile(profile);
        } catch (e) {
          console.error('Erro ao atualizar perfil após pagamento:', e);
        }
      }
    });

    // Error handling
    socketInstance.on('query:error', (err: any) => {
      setIsLoading(false);
      if (autoSimulateTimerRef.current) clearTimeout(autoSimulateTimerRef.current);
      console.warn('Aviso na consulta:', err?.error || err);
    });

    // Rate limit cooldown listener (15 segundos obrigatórios)
    socketInstance.on('query:rate_limit', (data: any) => {
      console.warn('[Socket.io Client] ⏱️ Limite de taxa (cooldown 15s):', data);
      setIsLoading(false);
      setLoadingStepText('');
      const remaining = data?.remainingSeconds || 15;
      triggerCooldown(remaining, data?.message);
    });

    setSocket(socketInstance);

    return () => {
      if (autoSimulateTimerRef.current) clearTimeout(autoSimulateTimerRef.current);
      socketInstance.disconnect();
    };
  }, [autoSimulate]);

  // Fetch initial history if available
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Escutar mudanças de autenticação do Firebase
    const unsubscribeAuth = onAuthUserChanged(async (user) => {
      setCurrentUser(user);
      currentUserRef.current = user;

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        console.log('[Firebase Auth] Usuário autenticado:', user.email);
        try {
          // Garante perfil com Plano Premium e teste gratuito de 24 horas (Trial)
          const profile = await syncUserProfile(user);
          setUserProfile(profile);

          // Escuta atualizações do perfil em tempo real (bloqueios, expiração, notificações enviadas pelo Admin)
          unsubscribeProfile = subscribeUserProfile(user.uid, (updatedProfile) => {
            console.log('[Firestore] Atualização em tempo real do perfil recebida:', updatedProfile);
            setUserProfile(updatedProfile);
          });

          const firestoreDocs = await fetchUserHistoryFromFirestore(user.uid);
          if (firestoreDocs && firestoreDocs.length > 0) {
            const mappedDocs: QueryRecord[] = firestoreDocs.map((d: any) => ({
              id: d.id || d.consultaId || `fs_${Date.now()}_${Math.random()}`,
              socketId: 'firebase_cloud',
              moduleType: d.modulo as QueryModuleType,
              moduleTitle: d.modulo_titulo || d.modulo,
              queryParam: d.parametro,
              status: d.status || 'completed',
              timestamp: d.timestamp ? new Date(d.timestamp).getTime() : Date.now(),
              durationMs: d.tempo_resposta_ms || 1800,
              rawResponse: d.resposta_bruta,
              parsedReport: d.resposta_bruta ? parseIntelligenceResponse(d.resposta_bruta, d.modulo, d.parametro) : undefined,
            }));

            setHistory((prev) => {
              const seen = new Set<string>();
              const combined = [...mappedDocs, ...prev];
              return combined.filter((item) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              });
            });
          }
        } catch (err) {
          console.warn('[Firestore] Erro ao carregar histórico inicial / perfil:', err);
        }
      } else {
        setUserProfile(null);
      }
    });

    const fetchInitialHistory = async () => {
      try {
        const token = currentUserRef.current ? await currentUserRef.current.getIdToken().catch(() => '') : '';
        const res = await fetch('/api/history', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.records && Array.isArray(data.records) && data.records.length > 0) {
            const parsedHistory = data.records.map((r: any) => ({
              ...r,
              parsedReport: r.rawResponse ? parseIntelligenceResponse(r.rawResponse, r.moduleType, r.queryParam) : undefined,
            }));
            setHistory((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const toAdd = parsedHistory.filter((ph: any) => !existingIds.has(ph.id));
              return [...toAdd, ...prev];
            });
            if (!currentActiveRecord && parsedHistory.length > 0) {
              setCurrentActiveRecord(parsedHistory[0]);
            }
          }
        }
      } catch {}
    };

    fetchInitialHistory();

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Handlers de Autenticação Firebase com Google
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { user, profile } = await loginWithGoogle();
      setCurrentUser(user);
      currentUserRef.current = user;
      setUserProfile(profile);
      console.log('[Firebase] Login realizado com sucesso via Google:', user.displayName || user.email, 'Plano:', profile.plan);

      // Se o usuário entrou por link de indicação de um revendedor (?ref=...), registra a indicação
      const activeRef = captureReferralCodeFromUrl();
      if (activeRef && user) {
        trackNewUserReferral(activeRef, user).catch((refErr) => {
          console.warn('[Referral] Erro ao registrar indicação:', refErr);
        });
      }
    } catch (err: any) {
      console.error('[Firebase] Erro ao autenticar via Google:', err);
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'dapper-seahorse-f49b35.netlify.app';
      setAuthError({
        code: err?.code || 'auth/unauthorized-domain',
        message: err?.friendlyMessage || err?.message || 'Domínio não autorizado para operações OAuth do Firebase.',
        domain: err?.detectedDomain || currentHost,
      });
      setIsAuthErrorModalOpen(true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    const { user, profile } = createGuestOperatorUser();
    setCurrentUser(user);
    currentUserRef.current = user;
    setUserProfile(profile);
    setIsAuthErrorModalOpen(false);
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutFirebase();
      setUserProfile(null);
      console.log('[Firebase] Sessão encerrada com sucesso');
    } catch (err) {
      console.error('[Firebase] Erro ao sair:', err);
    }
  };

  // Handler: Abre Varredura de Moradores por CEP (Até 1 min inicial + até 7 min dossiê profundo)
  const handleOpenCepScan = (targetCep?: string) => {
    if (isAccountExpired) {
      setIsExpiredPlanModalOpen(true);
      return;
    }
    if (targetCep) {
      setCepScanTarget(targetCep);
    }
    setIsCepScanOpen(true);
  };

  // Handler: Start a search with Cota Check (10 Consultas)
  const handleSearch = async (moduleType: QueryModuleType, queryParam: string, isProParam?: boolean, isZyrexParam?: boolean) => {
    // ==============================================================
    // 0. CHECAGEM DE BLOQUEIO DE CONTA PELO ADMINISTRADOR
    // ==============================================================
    if (isUserBlocked) {
      alert(`Sua conta foi suspensa pela administração do sistema. Motivo: ${userProfile?.blockedReason || 'Violação das diretrizes'}. Entre em contato com o suporte.`);
      return;
    }

    // ==============================================================
    // 0.1 CHECAGEM MANDATÁRIA DE STATUS EXPIRADO
    // ==============================================================
    if (isAccountExpired) {
      setIsExpiredPlanModalOpen(true);
      return;
    }

    // ==============================================================
    // 0.1 CHECAGEM DE COOLDOWN (INTERVALO OBRIGATÓRIO DE 15 SEGUNDOS)
    // ==============================================================
    if (cooldownSeconds > 0) {
      setCooldownToast({
        remainingSeconds: cooldownSeconds,
        message: `Por favor, aguarde ${cooldownSeconds} segundo${cooldownSeconds !== 1 ? 's' : ''} para realizar uma nova consulta.`,
      });
      return;
    }

    // ==============================================================
    // 1. CHECAGEM DE COTA (LIMITE DE 10 CONSULTAS GRÁTIS)
    // ==============================================================
    if (userProfile?.plan === 'trial') {
      const saldo = userProfile.consultasRestantes || 0;
      if (saldo <= 0) {
        // Se zerou, abre a tela de plano expirado e BLOQUEIA a busca!
        setIsExpiredPlanModalOpen(true);
        return; 
      }
    }

    setIsLoading(true);
    setActiveOptionsData(null);
    setLoadingStepText('Transmitindo solicitação via barramento em tempo real...');

    // Ativa imediatamente o cooldown de 15 segundos para proteger o sistema e informar o cliente
    triggerCooldown(15);

    const isZyrex = Boolean(
      isZyrexParam || 
      moduleType.startsWith('zyrex') || 
      moduleType.startsWith('krex') || 
      moduleType.includes('zyrex') || 
      moduleType.includes('krex')
    );
    const isPro = !isZyrex && Boolean(isProParam || isProMode || moduleType.startsWith('pro') || moduleType.includes('pro'));

    if (socket && isConnected) {
      socket.emit('query:request', {
        moduleType,
        queryParam,
        isPro,
        isZyrex,
        isKrex: isZyrex,
      });
    } else {
      // Fallback HTTP instantâneo caso o websocket esteja em processo de reconexão
      try {
        setLoadingStepText('Transmitindo via API HTTP segura...');
        const token = currentUserRef.current ? await currentUserRef.current.getIdToken().catch(() => '') : '';
        const res = await fetch('/api/query/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ moduleType, queryParam, isPro, isZyrex, isKrex: isZyrex }),
        });
        const data = await res.json();
        if (res.status === 429 || data.cooldown) {
          setIsLoading(false);
          const remaining = data.remainingSeconds || 15;
          triggerCooldown(remaining, data.error);
          return;
        }
        if (data.ok && data.record) {
          setCurrentActiveRecord(data.record);
          setHistory((prev) => [data.record, ...prev]);

          const userIp = data.record.clientIp || clientIpRef.current || clientIp || '127.0.0.1';
          const fullResp = data.record.rawResponse || '';
          const summaryText = data.record.parsedReport?.summary || fullResp.slice(0, 300) || 'Consulta processada';

          saveConsultaToFirestore({
            parametro: data.record.queryParam,
            modulo: data.record.moduleType,
            modulo_titulo: data.record.moduleTitle,
            status: data.record.status,
            tempo_resposta_ms: data.record.durationMs,
            resultado_resumo: summaryText,
            resposta_bruta: fullResp,
            resultado_completo: fullResp,
            telegram_msg_id: data.record.telegramMessageId,
            ip: userIp,
            client_ip: userIp,
          }, currentUserRef.current || (currentUser ? currentUser : { uid: 'guest_user', email: 'cliente@shazam.terminal', displayName: 'Operador Shazam' })).catch((err) => {
            console.warn('[Firestore] Falha ao persistir consulta HTTP:', err);
          });
        } else if (data.error) {
          console.warn('Erro na consulta HTTP:', data.error);
        }
      } catch (httpErr) {
        console.error('Falha no fallback HTTP:', httpErr);
      } finally {
        setIsLoading(false);
      }
    }

    // ==============================================================
    // 2. DESCONTA A CONSULTA NO BANCO DE DADOS EM TEMPO REAL
    // ==============================================================
    if (currentUser && userProfile?.plan === 'trial') {
      try {
        await deduzirConsulta(currentUser.uid);
        // Atualiza a tela instantaneamente (tira 1 do saldo visual sem recarregar a página)
        setUserProfile((prev) => 
          prev ? { ...prev, consultasRestantes: Math.max(0, (prev.consultasRestantes || 1) - 1) } : prev
        );
      } catch (err) {
        console.error('Erro ao deduzir consulta:', err);
      }
    }
  };

  // Handler para reiniciar robô com /start e imediatamente continuar a busca
  const handleRestartAndRetry = async (moduleType: string, queryParam: string, isZyrexParam?: boolean) => {
    if (isAccountExpired) {
      setIsExpiredPlanModalOpen(true);
      return;
    }

    setIsLoading(true);
    setActiveOptionsData(null);
    setLoadingStepText('Reiniciando conexão com o barramento de dados...');

    const isZyrex = Boolean(
      isZyrexParam || 
      moduleType.startsWith('zyrex') || 
      moduleType.startsWith('krex') || 
      moduleType.includes('zyrex') || 
      moduleType.includes('krex')
    );
    const isPro = !isZyrex && Boolean(isProMode || moduleType.startsWith('pro') || moduleType.includes('pro'));

    if (socket && isConnected) {
      socket.emit('query:restart_and_retry', {
        moduleType,
        queryParam,
        isPro,
        isZyrex,
        isKrex: isZyrex,
      });
    } else {
      try {
        setLoadingStepText('Reiniciando robô via API segura (/start)...');
        const res = await fetch('/api/telegram/restart-and-retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleType, queryParam, isPro, isZyrex, isKrex: isZyrex }),
        });
        const data = await res.json();
        if (data.ok && data.record) {
          setCurrentActiveRecord(data.record);
          setHistory((prev) => [data.record, ...prev]);
        }
      } catch (err) {
        console.error('Falha ao reiniciar robô com /start:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Immediate reply shortcut during loading
  const handleImmediateReply = () => {
    if (!socket) return;
    const targetId = currentPendingIdRef.current || pendingQueries[0]?.id;
    const targetMod = pendingQueries.find(q => q.id === targetId)?.moduleType || selectedModule;
    if (targetId) {
      if (autoSimulateTimerRef.current) clearTimeout(autoSimulateTimerRef.current);
      socket.emit('telegram:simulate_reply', {
        requestId: targetId,
        responseText: SAMPLE_RESPONSES[targetMod] || `Dossiê gerado com sucesso para a consulta.`,
        operatorName: 'Motor Shazam Buscas',
      });
    }
  };

  // Handler para quando o usuário seleciona uma base de dados interativa (CREDILINK, ZYREX, SI-PNI, etc.)
  const handleSelectOption = async (optionText: string, rowIndex?: number, colIndex?: number) => {
    if (!activeOptionsData) return;
    const { requestId } = activeOptionsData;
    setLoadingStepText(`Base "${optionText}" selecionada! Consultando dados cadastrais oficiais...`);
    setActiveOptionsData((prev) => prev ? { ...prev, selectedOption: optionText } : null);

    // 1. Emite via Socket.io
    if (socket && isConnected) {
      socket.emit('query:select_option', {
        requestId,
        optionText,
        rowIndex,
        colIndex,
      });
    }

    // 2. Dispara fallback HTTP para garantir resposta
    try {
      await fetch('/api/query/select-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, optionText, rowIndex, colIndex }),
      });
    } catch (e) {
      console.warn('[select-option] Falha na rota HTTP (o socket tratará o clique):', e);
    }
  };

  // Calculate pending by module for sidebar badges
  const pendingCountByModule = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of pendingQueries) {
      counts[q.moduleType] = (counts[q.moduleType] || 0) + 1;
    }
    return counts;
  }, [pendingQueries]);

  // Se o usuário NÃO estiver autenticado, o sistema NÃO abre:
  // Renderiza exclusivamente a Landing Page Shazam Buscas e modal de login/planos.
  if (!currentUser) {
    return (
      <>
        <SaaSLandingLoginPage
          onLoginGoogle={handleGoogleLogin}
          isAuthLoading={isAuthLoading}
          authError={authError}
          onOpenAuthHelp={() => setIsAuthErrorModalOpen(true)}
          onContinueAsGuest={handleContinueAsGuest}
        />
        <PricingModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          currentUser={currentUser}
          userProfile={userProfile}
          onLoginGoogle={handleGoogleLogin}
        />
        <AuthErrorModal
          isOpen={isAuthErrorModalOpen}
          onClose={() => setIsAuthErrorModalOpen(false)}
          errorDetails={authError}
          onRetryLogin={handleGoogleLogin}
          onContinueAsGuest={handleContinueAsGuest}
        />
      </>
    );
  }

  // Dashboard B2B Protegido — Apenas para usuários autenticados
  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col font-['DM_Sans',sans-serif] selection:bg-[#00827c]/40 selection:text-[#edfffe]">
      {/* Top Application Header */}
      <Header
        isConnected={isConnected}
        socketId={socketId}
        activeRequestsCount={pendingQueries.length}
        currentUser={currentUser}
        userProfile={userProfile}
        isAuthLoading={isAuthLoading}
        onLoginGoogle={handleGoogleLogin}
        onLogoutGoogle={handleGoogleLogout}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onOpenCode={() => setIsCodeModalOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenKrexModal={() => setIsZyrexModalOpen(true)}
        onOpenZyrexModal={() => setIsZyrexModalOpen(true)}
        onOpenSmartMaps={() => setIsSmartMapsOpen(true)}
        onOpenCepScan={() => handleOpenCepScan()}
        telegramConfig={telegramConfig}
        onReconnectTelegram={handleReconnectTelegram}
        isReconnectingTelegram={isReconnectingTelegram}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Horizontal Module Switcher */}
      <MobileModuleBar
        selectedModule={selectedModule}
        onSelectModule={(mod) => {
          setSelectedModule(mod);
        }}
        pendingCountByModule={pendingCountByModule}
        onOpenAllModules={() => setIsMobileMenuOpen(true)}
      />

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden mx-auto">
        {/* Left Sidebar with 8 Modules */}
        <Sidebar
          selectedModule={selectedModule}
          onSelectModule={(mod) => {
            setSelectedModule(mod);
          }}
          pendingCountByModule={pendingCountByModule}
        />

        {/* Central Workspace: Abyssal Liquid Canvas (#012624) */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-12 space-y-6 sm:space-y-8 overflow-y-auto bg-[#012624] min-h-[calc(100vh-5rem)] w-full max-w-full overflow-x-hidden">
          <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

            {/* Hero Ambient Banner with 3D Bioluminescent Data Orb */}
            <div className="p-4 sm:p-6 lg:p-8 rounded-[16px] bg-[#003734] border border-[#707777]/20 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 overflow-hidden relative">
              <div className="space-y-2 max-w-xl z-10 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#cbfffc] font-medium font-mono">
                    SHAZAM BUSCAS PROTOCOL
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#bbc7c6] font-mono">
                    / LIQUID ENGINE
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium tracking-[-0.04em] text-[#ffffff] leading-tight font-['DM_Sans',sans-serif]">
                  Inteligência Investigativa em Tempo Real
                </h2>
                <p className="text-[13px] sm:text-[14px] text-[#bbc7c6] leading-relaxed">
                  Inteligência cadastral e veicular de alta performance. Captura de dossiês completos com sanitização instantânea de dados brutos.
                </p>
              </div>

              {/* Defining Brand Visual: Bioluminescent Particle Sphere Orb */}
              <div className="relative flex items-center justify-center shrink-0 w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44">
                <ParticleSphereVisual size={150} dotCount={340} />
              </div>
            </div>

            {/* Top Quick Stats */}
            <StatsBar
              totalQueries={history.length}
              avgDurationMs={
                history.length > 0
                  ? history.reduce((acc, h) => acc + (h.durationMs || 1800), 0) / history.length
                  : 1800
              }
              telegramConfig={telegramConfig}
              activeRequestsCount={pendingQueries.length}
            />

            {/* Search Form Card (Surface Card: Liquid Kelp #003734) */}
            <QueryForm
              moduleInfo={currentModuleInfo}
              isLoading={isLoading}
              onSearch={handleSearch}
              isProMode={isProMode}
              onToggleProMode={setIsProMode}
              cooldownSeconds={cooldownSeconds}
              onOpenCepScan={handleOpenCepScan}
              isAccountExpired={isAccountExpired}
              onOpenExpiredModal={() => setIsExpiredPlanModalOpen(true)}
            />

            {/* Realtime Loading / Options Selection / Waiting State */}
            {isLoading && (
              <div className="space-y-4">
                {activeOptionsData && activeOptionsData.options.length > 0 ? (
                  <OptionsSelectionCard
                    requestId={activeOptionsData.requestId}
                    prompt={activeOptionsData.prompt}
                    options={activeOptionsData.options}
                    selectedOption={activeOptionsData.selectedOption}
                    onSelectOption={handleSelectOption}
                    autoSelectSeconds={25}
                  />
                ) : (
                  <div className="p-8 sm:p-12 rounded-[16px] bg-[#003734] border border-[#707777]/20 text-center space-y-4">
                    <div className="relative inline-block">
                      <div className="w-14 h-14 rounded-full border-2 border-[#011d1c] border-t-[#cbfffc] animate-spin mx-auto"></div>
                      <Radio className="w-6 h-6 text-[#cbfffc] absolute inset-0 m-auto" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-[#ffffff] tracking-tight font-['DM_Sans',sans-serif]">
                        {loadingStepText}
                      </h3>
                      <p className="text-xs text-[#bbc7c6] uppercase tracking-[0.08em] font-mono mt-1">
                        Conexão Segura ➔ Barramento Oficial ➔ Recepção de Opções / Dossiê
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleImmediateReply}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-aurora-gradient hover:opacity-90 text-[#012624] text-xs font-medium uppercase tracking-[0.08em] transition-opacity cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#012624]" />
                        <span>Concluir Imediatamente</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results: Report Card */}
            {currentActiveRecord && !isLoading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-[#edfffe] flex items-center gap-2 font-['DM_Sans',sans-serif]">
                    <CheckCircle2 className="w-4 h-4 text-[#cbfffc]" />
                    Dossiê de Inteligência Gerado (Tempo Real)
                  </h3>
                </div>
                <ReportCard 
                  record={currentActiveRecord} 
                  onNewSearch={() => {
                    setSelectedModule(currentActiveRecord.moduleType);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    const input = document.getElementById('query-input');
                    input?.focus();
                  }}
                />
              </div>
            )}

            {/* Query History Panel */}
            <QueryHistoryList
              history={history}
              activeRecordId={currentActiveRecord?.id}
              onSelectRecord={(rec) => setCurrentActiveRecord(rec)}
              onClearHistory={() => setHistory([])}
            />
          </div>
        </main>
      </div>

      {/* Setup Instructions Modal */}
      <SetupInstructionsModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        appUrl={window.location.origin}
        currentUser={currentUser}
        userProfile={userProfile}
        onLoginGoogle={handleGoogleLogin}
        onLogoutGoogle={handleGoogleLogout}
      />

      {/* Source Code Modal */}
      <SourceCodeViewerModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Subscription Pricing Plans Modal */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onLoginGoogle={handleGoogleLogin}
        onSelectPlanForPix={(planId, options) => {
          setSelectedPlanForPix(planId);
          setPixDiscountCode(options?.discountCode);
          setPixDiscountedPrice(options?.discountedPrice);
          setIsPixModalOpen(true);
        }}
        onProfileUpdated={(updated) => {
          setUserProfile(updated);
        }}
      />

      {/* User Profile & Account Validity Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onLogout={handleGoogleLogout}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        isAdmin={isAdminUser}
      />

      {/* Admin Master Dashboard Modal (Estatísticas, Usuários, Faturamento e Cupons) */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        currentUserEmail={currentUser?.email}
      />

      {/* UP DEPIX PIX Checkout Modal */}
      <PixCheckoutModal
        isOpen={isPixModalOpen}
        onClose={() => {
          setIsPixModalOpen(false);
          setPixDiscountCode(undefined);
          setPixDiscountedPrice(undefined);
        }}
        planId={selectedPlanForPix}
        currentUser={currentUser}
        userProfile={userProfile}
        initialDiscountCode={pixDiscountCode}
        initialDiscountedPrice={pixDiscountedPrice}
        socket={socket}
        onPaymentSuccess={(updated) => {
          setUserProfile(updated);
        }}
      />

      {/* Auth Error / Domain Authorization Guidance Modal */}
      <AuthErrorModal
        isOpen={isAuthErrorModalOpen}
        onClose={() => setIsAuthErrorModalOpen(false)}
        errorDetails={authError}
        onRetryLogin={handleGoogleLogin}
        onContinueAsGuest={handleContinueAsGuest}
      />

      {/* Ecossistema Paralelo BUSCAS PRO Modal */}
      <ProSearchModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        userProfile={userProfile}
        onSearch={(mod, query) => handleSearch(mod, query, true)}
        isLoading={isLoading}
        loadingStepText={loadingStepText}
        activeRecord={currentActiveRecord}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenExpiredModal={() => setIsExpiredPlanModalOpen(true)}
        cooldownSeconds={cooldownSeconds}
        isAccountExpired={isAccountExpired}
      />

      {/* Rota Paralela BUSCAS KREX (KREX) */}
      <ZyrexSearchModal
        isOpen={isZyrexModalOpen}
        onClose={() => setIsZyrexModalOpen(false)}
        userProfile={userProfile}
        onSearch={(mod, query) => handleSearch(mod, query, false, true)}
        onRestartAndRetry={(mod, query) => handleRestartAndRetry(mod, query, true)}
        isLoading={isLoading}
        loadingStepText={loadingStepText}
        activeRecord={currentActiveRecord}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenExpiredModal={() => setIsExpiredPlanModalOpen(true)}
        cooldownSeconds={cooldownSeconds}
        isAccountExpired={isAccountExpired}
        activeOptionsData={activeOptionsData}
        onSelectOption={handleSelectOption}
      />

      {/* Mobile Slide-over Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        selectedModule={selectedModule}
        onSelectModule={(mod) => setSelectedModule(mod)}
        pendingCountByModule={pendingCountByModule}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenKrexModal={() => setIsZyrexModalOpen(true)}
        onOpenSmartMaps={() => setIsSmartMapsOpen(true)}
        onOpenCepScan={() => handleOpenCepScan()}
      />

      {/* Smart Maps Modal - Geolocalização, Google Maps & Cruzamento Cadastral de Moradores */}
      <SmartMapsModal
        isOpen={isSmartMapsOpen}
        onClose={() => setIsSmartMapsOpen(false)}
        onExecuteDossier={(mod, query) => handleSearch(mod, query)}
        onOpenCepScan={handleOpenCepScan}
      />

      {/* Varredura Profunda de Moradores por CEP (Busca de até 1 min + Dossiê de até 7 min) */}
      <CepIntelligenceModal
        isOpen={isCepScanOpen}
        onClose={() => {
          setIsCepScanOpen(false);
          setCepScanTarget(undefined);
        }}
        initialCep={cepScanTarget}
        onExecuteModuleQuery={(mod, query) => handleSearch(mod, query)}
        isAccountExpired={isAccountExpired}
        onOpenExpiredModal={() => setIsExpiredPlanModalOpen(true)}
      />

      {/* Pop-up Mandatário de Plano Expirado */}
      <ExpiredPlanModal
        isOpen={isExpiredPlanModalOpen}
        onClose={() => setIsExpiredPlanModalOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onSelectPlanForPix={(planId) => {
          setSelectedPlanForPix(planId);
          setIsPixModalOpen(true);
        }}
      />

      {/* Pop-in Inviolável de Manutenção (Exibido somente quando o usuário estiver logado e a conexão com a String Session estiver encerrada) */}
      <MaintenanceModal
        isOpen={isMaintenanceActive}
        onLogout={handleGoogleLogout}
        isAdmin={isAdminUser}
        onOpenAdmin={() => setIsAdminDashboardOpen(true)}
      />

      {/* Floating Cooldown Notification Toast com Timer e Mensagem */}
      {cooldownToast && (
        <div 
          id="cooldown-notification-toast"
          role="alert"
          aria-live="assertive"
          className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] bg-[#011d1c] border border-[#ffd166]/60 rounded-[14px] p-4 shadow-2xl shadow-black/80 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-md"
        >
          <div className="w-10 h-10 rounded-full bg-[#ffd166]/15 border border-[#ffd166]/40 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#ffd166] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.08em] font-mono text-[#ffd166]">
                Intervalo de Consulta (15s)
              </span>
              <span className="text-xs font-extrabold font-mono px-2 py-0.5 rounded bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/30">
                {cooldownToast.remainingSeconds}s
              </span>
            </div>
            <p className="text-xs text-[#edfffe] mt-1.5 font-['DM_Sans',sans-serif] leading-relaxed">
              {cooldownToast.message}
            </p>
            {/* Barra de progresso regressiva */}
            <div className="w-full h-1.5 bg-[#003734] rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ffd166] to-[#f59e0b] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, ((15 - cooldownToast.remainingSeconds) / 15) * 100))}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => setCooldownToast(null)}
            className="text-[#707777] hover:text-[#ffffff] p-1 transition-colors cursor-pointer shrink-0"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* NOTIFICAÇÃO TRANSMITIDA PELA ADMINISTRAÇÃO EM TEMPO REAL */}
      {/* ============================================================== */}
      {activeNotification && !isUserBlocked && (
        <div 
          id="admin-notification-toast"
          role="alert"
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] bg-[#011d1c] border-2 border-[#00827c] rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/80 font-mono animate-in slide-in-from-top-4 fade-in duration-300 backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              activeNotification.type === 'urgent' 
                ? 'bg-red-950/60 border-red-500 text-red-400 animate-pulse'
                : activeNotification.type === 'warning'
                ? 'bg-amber-950/60 border-amber-500 text-amber-400'
                : activeNotification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                : 'bg-[#00827c]/20 border-[#00827c] text-[#00a8a0]'
            }`}>
              <Bell className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  {activeNotification.title}
                </span>
                <button
                  id="btn-dismiss-admin-notification"
                  onClick={handleDismissNotification}
                  className="text-[#707777] hover:text-white p-1 rounded transition-colors cursor-pointer"
                  title="Fechar notificação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#cbfffc] mt-1.5 font-sans leading-relaxed break-words">
                {activeNotification.message}
              </p>

              {/* Anexo de Imagem / Banner do WebPush */}
              {activeNotification.imageUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-[#00827c]/60 max-h-48 bg-black/40">
                  <img
                    src={activeNotification.imageUrl}
                    alt="Banner Notificação"
                    className="w-full max-h-48 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Link de Redirecionamento */}
              {activeNotification.linkUrl && (
                <div className="mt-2.5 pt-1 flex items-center justify-end">
                  <a
                    href={activeNotification.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleDismissNotification}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00827c] hover:bg-[#00a8a0] text-[#012624] font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Acessar Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-[#707777] mt-3 pt-2 border-t border-[#003734]">
                <span>{activeNotification.sentBy || 'Administração'}</span>
                <button
                  id="btn-mark-notification-read"
                  onClick={handleDismissNotification}
                  className="px-2.5 py-1 rounded bg-[#003734] hover:bg-[#00827c]/40 text-[#00a8a0] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Marcar como lida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE SOLICITAÇÃO DE PERMISSÃO WEBPUSH APÓS LOGIN */}
      {/* ============================================================== */}
      {currentUser && (
        <NotificationPermissionModal
          isOpen={showNotificationPrompt}
          onClose={() => {
            setShowNotificationPrompt(false);
            sessionStorage.setItem('shazam_push_prompt_dismissed', 'true');
          }}
          userId={currentUser.uid}
          userName={userProfile?.displayName || currentUser.displayName || undefined}
          onGranted={() => {
            setShowNotificationPrompt(false);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* TELA DE CONTA BLOQUEADA PELO ADMINISTRADOR (OVERLAY INVIOLÁVEL) */}
      {/* ============================================================== */}
      {isUserBlocked && (
        <div 
          id="account-blocked-overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#011d1c] border-2 border-red-500/80 shadow-2xl p-6 sm:p-8 text-center text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />
            
            <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400 mx-auto mb-5 shadow-lg shadow-red-950/50">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-white text-center mb-2 tracking-wide">
              ACESSO BLOQUEADO
            </h2>

            <p className="text-xs text-[#bbc7c6] text-center mb-5 font-sans">
              Seu acesso ao Terminal Shazam Buscas foi suspenso pela administração do sistema.
            </p>

            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200 text-left mb-6 space-y-1.5">
              <div className="font-bold text-red-400 flex items-center gap-1.5 uppercase text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Motivo da Suspensão:</span>
              </div>
              <div className="font-sans text-xs text-[#edfffe] leading-relaxed">
                {userProfile?.blockedReason || 'Suspensão preventiva aplicada pela moderação.'}
              </div>
              {userProfile?.blockedAt && (
                <div className="text-[10px] text-red-400/80 pt-1">
                  Data do bloqueio: {new Date(userProfile.blockedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href="https://t.me/shazambuscas"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
              >
                <span>Falar com o Suporte Oficial</span>
              </a>
              <button
                id="btn-blocked-logout"
                onClick={handleGoogleLogout}
                className="w-full py-2.5 rounded-xl bg-[#012624] hover:bg-[#003734] text-[#bbc7c6] text-xs font-semibold transition-colors cursor-pointer border border-[#003734]"
              >
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}