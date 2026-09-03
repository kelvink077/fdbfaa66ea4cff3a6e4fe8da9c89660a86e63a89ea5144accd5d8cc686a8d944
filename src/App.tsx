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
import { TrialBanner } from './components/TrialBanner';
import { PricingModal } from './components/PricingModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PixCheckoutModal } from './components/PixCheckoutModal';
import { SaaSLandingLoginPage } from './components/SaaSLandingLoginPage';
import { AuthErrorModal, AuthErrorDetails } from './components/AuthErrorModal';
import { 
  QueryModuleType, 
  QueryRecord, 
  TelegramConfigState 
} from './types';
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
  UserProfileData
} from './lib/firebase';
import { 
  CheckCircle2, 
  Radio,
  FileCode,
  Zap
} from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  const [selectedModule, setSelectedModule] = useState<QueryModuleType>('cpf_1');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Processando solicitação...');
  
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
  const [selectedPlanForPix, setSelectedPlanForPix] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');

  // Controle de erros de autenticação OAuth (ex: domínio não autorizado no Netlify)
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);
  const [isAuthErrorModalOpen, setIsAuthErrorModalOpen] = useState(false);

  // Auto-resposta desativada para forçar o uso real do Telegram configurado no Render
  const [autoSimulate, setAutoSimulate] = useState(false);
  const autoSimulateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPendingIdRef = useRef<string | null>(null);

  const [telegramConfig, setTelegramConfig] = useState<TelegramConfigState>({
    hasToken: false,
    hasChatId: false,
    isPollingOrWebhookActive: false,
    activeRequestsCount: 0,
  });

  // Current selected module information
  const currentModuleInfo = useMemo(() => {
    return QUERY_MODULES.find((m) => m.id === selectedModule) || QUERY_MODULES[0];
  }, [selectedModule]);

  // Connect to Socket.io on mount
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://shazam-ygad.onrender.com';
    const socketInstance: Socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
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
      });
    });

    socketInstance.on('userbot:status_change', (data) => {
      setTelegramConfig((prev) => ({
        ...prev,
        userbotStatus: data.userbotStatus,
        sessionConfigured: data.sessionConfigured,
        userName: data.userbotProfile?.firstName,
        phone: data.userbotProfile?.phone,
        botUsername: data.userbotProfile?.username || data.userbotProfile?.firstName,
      }));
    });

    // When backend acknowledges the request
    socketInstance.on('query:ack', () => {
      setLoadingStepText('Despachado com sucesso! Aguardando retorno da consulta...');
    });

    // When backend delivers the response
    socketInstance.on('query:response', (data: any) => {
      console.log('[Socket.io Client] Resposta recebida:', data);
      setIsLoading(false);

      if (autoSimulateTimerRef.current) {
        clearTimeout(autoSimulateTimerRef.current);
        autoSimulateTimerRef.current = null;
      }
      currentPendingIdRef.current = null;

      const parsed = parseIntelligenceResponse(data.rawResponse || '', data.moduleType, data.queryParam);
      const completeRecord: QueryRecord = {
        ...data,
        status: 'completed',
        parsedReport: parsed,
      };

      setCurrentActiveRecord(completeRecord);
      setHistory((prev) => [completeRecord, ...prev.filter((h) => h.id !== completeRecord.id)]);
      setPendingQueries((prev) => prev.filter((p) => p.id !== completeRecord.id));

      // Persistência automática no Firebase Firestore quando autenticado
      if (currentUserRef.current) {
        saveConsultaToFirestore({
          parametro: completeRecord.queryParam,
          modulo: completeRecord.moduleType,
          modulo_titulo: completeRecord.moduleTitle,
          status: completeRecord.status,
          tempo_resposta_ms: completeRecord.durationMs,
          resultado_resumo: completeRecord.parsedReport?.summary?.slice(0, 300) || completeRecord.rawResponse?.slice(0, 300),
          resposta_bruta: completeRecord.rawResponse,
          telegram_msg_id: completeRecord.telegramMessageId,
        }, currentUserRef.current).catch((err) => {
          console.warn('[Firestore] Falha ao persistir consulta:', err);
        });
      }
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
      setPendingQueries((prev) => prev.filter((p) => p.id !== data.id));
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
      console.error('Erro ao realizar consulta:', err);
    });

    setSocket(socketInstance);

    return () => {
      if (autoSimulateTimerRef.current) clearTimeout(autoSimulateTimerRef.current);
      socketInstance.disconnect();
    };
  }, [autoSimulate]);

  // Fetch initial history if available
  useEffect(() => {
    // Escutar mudanças de autenticação do Firebase
    const unsubscribeAuth = onAuthUserChanged(async (user) => {
      setCurrentUser(user);
      currentUserRef.current = user;

      if (user) {
        console.log('[Firebase Auth] Usuário autenticado:', user.email);
        try {
          // Garante perfil com Plano Premium e teste de 7 dias
          const profile = await syncUserProfile(user);
          setUserProfile(profile);

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

    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
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
      })
      .catch(() => {});

    return () => {
      unsubscribeAuth();
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

  // Handler: Start a search
  const handleSearch = (moduleType: QueryModuleType, queryParam: string) => {
    if (!socket || !isConnected) {
      return;
    }

    setIsLoading(true);
    setLoadingStepText('Transmitindo solicitação via barramento em tempo real...');

    socket.emit('query:request', {
      moduleType,
      queryParam,
    });
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
      {/* Top Premium 7-Day Trial Notification Banner */}
      <TrialBanner
        currentUser={currentUser}
        userProfile={userProfile}
        onLoginGoogle={handleGoogleLogin}
        isAuthLoading={isAuthLoading}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

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
        onOpenCode={() => setIsCodeModalOpen(true)}
      />

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col lg:flex-row w-full mx-auto">
        {/* Left Sidebar with 8 Modules */}
        <Sidebar
          selectedModule={selectedModule}
          onSelectModule={(mod) => {
            setSelectedModule(mod);
          }}
          pendingCountByModule={pendingCountByModule}
        />

        {/* Central Workspace: Abyssal Liquid Canvas (#012624) */}
        <main className="flex-1 p-6 sm:p-8 lg:p-12 space-y-8 overflow-y-auto bg-[#012624] min-h-[calc(100vh-5rem)]">
          <div className="max-w-5xl mx-auto space-y-8">

            {/* Hero Ambient Banner with 3D Bioluminescent Data Orb */}
            <div className="p-6 sm:p-8 rounded-[16px] bg-[#003734] border border-[#707777]/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
              <div className="space-y-2.5 max-w-xl z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#cbfffc] font-medium font-mono">
                    SHAZAM BUSCAS PROTOCOL
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#bbc7c6] font-mono">
                    / LIQUID ENGINE
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.04em] text-[#ffffff] leading-tight font-['DM_Sans',sans-serif]">
                  Inteligência Investigativa em Tempo Real
                </h2>
                <p className="text-[14px] text-[#bbc7c6] leading-relaxed">
                  Inteligência cadastral e veicular de alta performance. Captura de dossiês completos com sanitização instantânea de dados brutos.
                </p>
              </div>

              {/* Defining Brand Visual: Bioluminescent Particle Sphere Orb */}
              <div className="relative flex items-center justify-center shrink-0 w-36 h-36 md:w-44 md:h-44">
                <ParticleSphereVisual size={170} dotCount={380} />
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
            />

            {/* Realtime Loading / Waiting State */}
            {isLoading && (
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
                    WebSocket ➔ Gateway Shazam Buscas ➔ Barramento de Consultas ➔ Retorno Sanitizado
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
        onSelectPlanForPix={(planId) => {
          setSelectedPlanForPix(planId);
          setIsPixModalOpen(true);
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
      />

      {/* UP DEPIX PIX Checkout Modal */}
      <PixCheckoutModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        planId={selectedPlanForPix}
        currentUser={currentUser}
        userProfile={userProfile}
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
    </div>
  );
}