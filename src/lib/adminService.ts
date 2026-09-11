import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import { db, UserProfileData, calculateAccountValidity } from './firebase';
import { CouponRecord, CouponType } from './couponService';

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  blockedUsers: number;
  trialUsers: number;
  totalRevenueRealized: number; // R$ faturamento confirmado
  projectedMonthlyRevenue: number; // R$ faturamento previsto baseado nos clientes ativos
  totalQueriesToday: number;
  totalQueriesAllTime: number;
  avgQueriesPerActiveUser: number;
}

export interface UserRankingItem {
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: string;
  queriesToday: number;
  queriesTotal: number;
  lastQueryAt?: string;
  userPhotoURL?: string;
}

export interface AdminConsultaItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  parametro: string;
  modulo: string;
  modulo_titulo: string;
  status: string;
  timestamp: string;
  tempo_resposta_ms: number;
  resultado_resumo?: string;
  resposta_bruta?: string;
  resultado_completo?: string;
  telegram_msg_id?: number | string | null;
  ip?: string;
  client_ip?: string;
  userPhotoURL?: string;
}

export interface AdminNotification {
  id: string;
  targetUserId: string;
  targetUserEmail?: string;
  targetUserName?: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  createdAt: string;
  read: boolean;
  sentBy: string;
  campaignId?: string;
  campaignName?: string;
}

/**
 * Valida se um registro corresponde a um usuário real cadastrado
 * (Filtra operadores demo, guests e a própria conta administradora master para a gestão de clientes)
 */
export function isRealUser(u: Partial<UserProfileData>, includeAdmin = false): boolean {
  if (!u) return false;
  const email = (u.email || '').trim().toLowerCase();
  
  // 1. Deve possuir e-mail válido com formato legítimo
  if (!email || !email.includes('@') || !email.includes('.')) return false;
  
  // 2. Não pode ser conta demo/guest/terminal
  if (email.includes('operador.demo') || email.includes('shazam.terminal')) return false;
  if (u.id && (u.id.startsWith('guest_') || u.id === 'demo_user' || u.id === 'mock_user')) return false;

  // 3. Exclui a conta do administrador master da lista de clientes a serem geridos
  if (!includeAdmin && email === 'wrbatata6@gmail.com') return false;

  return true;
}

/**
 * Busca todas as métricas gerais do sistema para a Dashboard do Administrador
 */
export async function fetchAdminDashboardData(): Promise<{
  metrics: AdminMetrics;
  users: UserProfileData[];
  topUsersToday: UserRankingItem[];
  recentConsultas: AdminConsultaItem[];
  coupons: CouponRecord[];
}> {
  try {
    // 1. Carrega todos os usuários do Firestore
    let rawUsersList: UserProfileData[] = [];
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      rawUsersList = usersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as UserProfileData[];
    } catch (uErr) {
      console.warn('[AdminService] Aviso ao carregar coleção users:', uErr);
    }

    // Filtra estritamente para exibir SOMENTE usuários reais cadastrados
    const usersList: UserProfileData[] = rawUsersList
      .filter((u) => isRealUser(u, false))
      .map((u) => ({
        ...u,
        // Garante data de cadastro consistente para exibição
        createdAt: u.createdAt || u.trialStartedAt || u.lastLoginAt || new Date().toISOString(),
      }));

    // 2. Carrega pagamentos para faturamento
    let totalRevenue = 0;
    try {
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      paymentsSnap.docs.forEach((docSnap) => {
        const p = docSnap.data();
        if (p.status === 'completed' || p.status === 'paid' || p.status === 'approved') {
          const val = Number(p.amount) || Number(p.valor) || 0;
          totalRevenue += val;
        }
      });
    } catch (pErr) {
      console.warn('[AdminService] Aviso ao carregar coleção payments:', pErr);
    }

    // Soma pagamentos gravados diretamente nos perfis dos usuários
    usersList.forEach((u) => {
      if (Array.isArray(u.recentPayments)) {
        u.recentPayments.forEach((p) => {
          if (p.status === 'completed') {
            // Caso não tenha sido somado na coleção global
            if (p.amount && totalRevenue === 0) {
              totalRevenue += Number(p.amount);
            }
          }
        });
      }
    });

    // 3. Mapeia perfis de usuários para vincular fotos de contas Google e calcular métricas
    const userMap = new Map<string, UserProfileData>();
    usersList.forEach((u) => {
      if (u.id) userMap.set(u.id, u);
      if (u.email) {
        userMap.set(u.email, u);
        userMap.set(u.email.toLowerCase(), u);
      }
    });

    // 4. Carrega consultas para estatísticas do dia, feed em tempo real e ranking
    let consultas: AdminConsultaItem[] = [];
    try {
      const cQuery = query(collection(db, 'consultas'), orderBy('timestamp', 'desc'), limit(1500));
      const cSnap = await getDocs(cQuery);
      consultas = cSnap.docs.map((d) => {
        const data = d.data();
        const uid = data.userId || '';
        const email = (data.userEmail || '').toLowerCase();
        const matchedUser = userMap.get(uid) || (email ? userMap.get(email) : undefined);
        const userPhotoURL = data.userPhotoURL || matchedUser?.photoURL || '';

        return {
          id: d.id,
          ...data,
          userPhotoURL,
        };
      }) as AdminConsultaItem[];
    } catch (cErr) {
      console.warn('[AdminService] Aviso ao carregar coleção consultas:', cErr);
    }

    // Determina o início do dia de hoje (00:00:00)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Mapas de contagem por usuário
    const queriesTodayByUser: Record<string, number> = {};
    const queriesTotalByUser: Record<string, number> = {};
    const lastQueryByUser: Record<string, string> = {};

    let totalQueriesToday = 0;

    consultas.forEach((c) => {
      const cTime = new Date(c.timestamp || 0).getTime();
      const isToday = cTime >= startOfToday;
      const uid = c.userId || c.userEmail || 'desconhecido';

      queriesTotalByUser[uid] = (queriesTotalByUser[uid] || 0) + 1;
      if (isToday) {
        totalQueriesToday++;
        queriesTodayByUser[uid] = (queriesTodayByUser[uid] || 0) + 1;
      }

      if (!lastQueryByUser[uid] || new Date(lastQueryByUser[uid]).getTime() < cTime) {
        lastQueryByUser[uid] = c.timestamp;
      }
    });

    // 5. Analisa status de cada cliente (Ativo, Expirado, Bloqueado, Trial)
    let activeUsersCount = 0;
    let expiredUsersCount = 0;
    let blockedUsersCount = 0;
    let trialUsersCount = 0;
    let projectedMonthlyRevenue = 0;

    usersList.forEach((u) => {
      const validity = calculateAccountValidity(u);
      const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
      const isExpired = isBlocked || u.planStatus === 'expired' || validity.isExpired || !validity.isValid;

      if (isBlocked) {
        blockedUsersCount++;
      }
      
      if (isExpired) {
        expiredUsersCount++;
      } else if (validity.isValid) {
        activeUsersCount++;
        if (validity.isTrial) {
          trialUsersCount++;
        } else {
          // Calcula faturamento mensal projetado baseado no plano ativo
          if (u.plan === 'weekly') projectedMonthlyRevenue += 60; // ~4 semanas
          else if (u.plan === 'biweekly') projectedMonthlyRevenue += 44; // ~2 quinzenas
          else if (u.plan === 'monthly') projectedMonthlyRevenue += 35; // R$ 35 mensal
          else if (u.plan === 'premium' || u.plan === 'enterprise') projectedMonthlyRevenue += 50;
        }
      }
    });

    // 6. Monta ranking de usuários com mais consultas hoje
    const topUsersToday: UserRankingItem[] = Object.keys(queriesTodayByUser).map((uid) => {
      const userProfile = userMap.get(uid);
      const matchedConsulta = consultas.find((c) => c.userId === uid || c.userEmail === uid);

      return {
        userId: uid,
        userName: userProfile?.displayName || matchedConsulta?.userName || 'Operador',
        userEmail: userProfile?.email || matchedConsulta?.userEmail || uid,
        plan: userProfile?.planName || userProfile?.plan || 'Padrão',
        status: userProfile?.isBlocked ? 'Bloqueado' : (userProfile?.planStatus || 'Ativo'),
        queriesToday: queriesTodayByUser[uid] || 0,
        queriesTotal: queriesTotalByUser[uid] || 0,
        lastQueryAt: lastQueryByUser[uid],
        userPhotoURL: userProfile?.photoURL || matchedConsulta?.userPhotoURL || '',
      };
    }).sort((a, b) => b.queriesToday - a.queriesToday);

    // Se houver poucos hoje, adiciona os que mais consultaram no geral
    if (topUsersToday.length < 5) {
      Object.keys(queriesTotalByUser).forEach((uid) => {
        if (!topUsersToday.some((t) => t.userId === uid)) {
          const userProfile = userMap.get(uid);
          const matchedConsulta = consultas.find((c) => c.userId === uid || c.userEmail === uid);

          topUsersToday.push({
            userId: uid,
            userName: userProfile?.displayName || matchedConsulta?.userName || 'Operador',
            userEmail: userProfile?.email || matchedConsulta?.userEmail || uid,
            plan: userProfile?.planName || userProfile?.plan || 'Padrão',
            status: userProfile?.isBlocked ? 'Bloqueado' : (userProfile?.planStatus || 'Ativo'),
            queriesToday: queriesTodayByUser[uid] || 0,
            queriesTotal: queriesTotalByUser[uid] || 0,
            lastQueryAt: lastQueryByUser[uid],
            userPhotoURL: userProfile?.photoURL || matchedConsulta?.userPhotoURL || '',
          });
        }
      });
      topUsersToday.sort((a, b) => (b.queriesToday * 10 + b.queriesTotal) - (a.queriesToday * 10 + a.queriesTotal));
    }

    // 7. Carrega lista de cupons
    let coupons: CouponRecord[] = [];
    try {
      const couponsSnap = await getDocs(collection(db, 'coupons'));
      coupons = couponsSnap.docs.map((d) => ({
        ...d.data(),
      })) as CouponRecord[];
    } catch (cupErr) {
      console.warn('[AdminService] Aviso ao carregar coupons:', cupErr);
    }

    const avgQueries = activeUsersCount > 0 
      ? Math.round((totalQueriesToday / activeUsersCount) * 10) / 10 
      : 0;

    return {
      metrics: {
        totalUsers: usersList.length,
        activeUsers: activeUsersCount,
        expiredUsers: expiredUsersCount,
        blockedUsers: blockedUsersCount,
        trialUsers: trialUsersCount,
        totalRevenueRealized: totalRevenue,
        projectedMonthlyRevenue,
        totalQueriesToday,
        totalQueriesAllTime: consultas.length,
        avgQueriesPerActiveUser: avgQueries,
      },
      users: usersList,
      topUsersToday: topUsersToday.slice(0, 15),
      recentConsultas: consultas.slice(0, 50),
      coupons,
    };
  } catch (error) {
    console.error('[AdminService] Erro ao carregar dados do painel admin:', error);
    throw error;
  }
}

/**
 * Bloqueia ou desbloqueia um usuário de forma 100% funcional e persistente no Firestore
 * Quando bloqueado, o status é alterado imediatamente para 'expired'
 */
export async function adminToggleUserBlock(
  userId: string, 
  shouldBlock: boolean, 
  reason = 'Acesso bloqueado e expirado pela administração'
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  const pastExpiredDate = '2000-01-01T00:00:00.000Z';
  const reactivatedDate = new Date(Date.now() + 7 * 86400000).toISOString();

  if (shouldBlock) {
    await setDoc(userRef, {
      isBlocked: true,
      planStatus: 'expired',
      validUntil: pastExpiredDate,
      trialEndsAt: pastExpiredDate,
      consultasRestantes: 0,
      blockedReason: reason,
      blockedAt: now,
      updatedAt: now,
    }, { merge: true });
  } else {
    await setDoc(userRef, {
      isBlocked: false,
      planStatus: 'active',
      validUntil: reactivatedDate,
      trialEndsAt: reactivatedDate,
      consultasRestantes: 50,
      blockedReason: null,
      blockedAt: null,
      updatedAt: now,
    }, { merge: true });
  }

  // Envia notificação imediata sobre o status
  try {
    const notifId = 'status_' + Date.now();
    const notifRef = doc(db, 'users', userId, 'notifications', notifId);
    const notification: AdminNotification = {
      id: notifId,
      targetUserId: userId,
      title: shouldBlock ? '🚨 Acesso Expirado' : '✅ Acesso Reativado',
      message: shouldBlock 
        ? `Seu acesso foi marcado como expirado pela administração.`
        : 'Sua conta foi reativada com sucesso pela administração do sistema.',
      type: shouldBlock ? 'urgent' : 'success',
      createdAt: now,
      read: false,
      sentBy: 'Administração Shazam Master',
    };
    await setDoc(notifRef, notification);
    await setDoc(userRef, {
      latestNotification: notification,
      hasUnreadNotification: true,
      updatedAt: now,
    }, { merge: true });
  } catch (nErr) {
    console.warn('[AdminService] Aviso ao gravar notificação de bloqueio/desbloqueio:', nErr);
  }
}

/**
 * Envia uma notificação direta a um usuário específico ou em broadcast
 */
export async function adminSendNotification(params: {
  targetUserId: string; // 'all' ou o userId específico
  targetUserEmail?: string;
  targetUserName?: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  type?: 'info' | 'warning' | 'success' | 'urgent';
  sentBy?: string;
  campaignId?: string;
  campaignName?: string;
}): Promise<AdminNotification> {
  const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  
  // Cria o objeto sem campos 'undefined' para compatibilidade total com o Firestore
  const notification: AdminNotification = {
    id: notifId,
    targetUserId: params.targetUserId,
    title: params.title.trim(),
    message: params.message.trim(),
    type: params.type || 'info',
    createdAt: now,
    read: false,
    sentBy: params.sentBy || 'Administração Shazam Master',
  };

  if (params.targetUserEmail) notification.targetUserEmail = params.targetUserEmail;
  if (params.targetUserName) notification.targetUserName = params.targetUserName;
  if (params.imageUrl && params.imageUrl.trim()) notification.imageUrl = params.imageUrl.trim();
  if (params.linkUrl && params.linkUrl.trim()) notification.linkUrl = params.linkUrl.trim();
  if (params.campaignId) notification.campaignId = params.campaignId;
  if (params.campaignName) notification.campaignName = params.campaignName;

  if (params.targetUserId === 'all') {
    const globalRef = doc(db, 'notifications', notifId);
    await setDoc(globalRef, notification);
  } else {
    // 1. Grava na subcoleção do usuário para histórico
    const userNotifRef = doc(db, 'users', params.targetUserId, 'notifications', notifId);
    await setDoc(userNotifRef, notification);

    // 2. Grava no documento principal do usuário para engatilhar o alerta em tempo real
    const userRef = doc(db, 'users', params.targetUserId);
    await setDoc(userRef, {
      latestNotification: notification,
      hasUnreadNotification: true,
      updatedAt: now,
    }, { merge: true });
  }

  return notification;
}

/**
 * Altera ou estende o plano de um usuário
 */
export async function adminUpdateUserPlan(
  userId: string,
  plan: 'weekly' | 'biweekly' | 'monthly' | 'lifetime' | 'trial',
  daysToAdd?: number
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date();

  let validUntil: string;
  let planName: string;
  let trialDaysTotal = 30;

  if (plan === 'lifetime') {
    validUntil = '2099-12-31T23:59:59.999Z';
    planName = 'Acesso Lifetime Eterno (Concedido por Admin)';
    trialDaysTotal = 99999;
  } else {
    const days = daysToAdd || (plan === 'weekly' ? 7 : plan === 'biweekly' ? 15 : 30);
    validUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    planName = plan === 'weekly' 
      ? 'Plano Semanal (7 Dias)' 
      : plan === 'biweekly' 
      ? 'Plano 15 Dias' 
      : 'Plano Mensal (30 Dias)';
    trialDaysTotal = days;
  }

  await updateDoc(userRef, {
    plan,
    planName,
    planStatus: 'active',
    isBlocked: false,
    validUntil,
    trialEndsAt: validUntil,
    trialDaysTotal,
    consultasRestantes: 9999,
  });
}

/**
 * Cria um novo Cupom de Ativação ou Desconto no Firestore
 */
export async function adminCreateCoupon(data: {
  code: string;
  type: CouponType;
  days: number;
  discountedPrice?: number;
  originalPrice?: number;
  description?: string;
}): Promise<CouponRecord> {
  const cleanCode = (data.code || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('O código do cupom não pode estar vazio.');
  }

  const newCoupon: CouponRecord = {
    code: cleanCode,
    type: data.type,
    planTarget: 'monthly',
    originalPrice: data.originalPrice || 35.0,
    discountedPrice: data.type === 'activation' ? 0 : (data.discountedPrice !== undefined ? data.discountedPrice : 11.0),
    days: data.days || 30,
    used: false,
    description: data.description || (data.type === 'activation' 
      ? 'Código de ativação direta sem pagamento (30 Dias)' 
      : 'Cupom de desconto especial no plano mensal'),
    createdAt: new Date().toISOString(),
  };

  const couponRef = doc(db, 'coupons', cleanCode);
  await setDoc(couponRef, newCoupon);
  return newCoupon;
}

/**
 * Deleta ou revoga um cupom do sistema
 */
export async function adminDeleteCoupon(code: string): Promise<void> {
  const cleanCode = (code || '').trim().toUpperCase();
  const couponRef = doc(db, 'coupons', cleanCode);
  await deleteDoc(couponRef);
}

/**
 * Busca todas as consultas realizadas por um usuário específico no Firestore
 * Utiliza busca por userId, userEmail e subcoleção com fallback seguro em memória
 */
export async function fetchUserConsultas(
  userId: string,
  userEmail?: string,
  preloadedConsultas: AdminConsultaItem[] = []
): Promise<AdminConsultaItem[]> {
  const map = new Map<string, AdminConsultaItem>();

  // 1. Inclui imediatamente as que já foram pré-carregadas
  preloadedConsultas.forEach((c) => {
    if (c.userId === userId || (userEmail && c.userEmail === userEmail)) {
      map.set(c.id, c);
    }
  });

  // 2. Busca por userId na coleção consultas
  try {
    const qUser = query(
      collection(db, 'consultas'),
      where('userId', '==', userId),
      limit(200)
    );
    const snapUser = await getDocs(qUser);
    snapUser.docs.forEach((d) => {
      const data = d.data();
      map.set(d.id, {
        id: d.id,
        userId: data.userId || userId,
        userEmail: data.userEmail || userEmail || '',
        userName: data.userName || 'Operador',
        parametro: data.parametro || '',
        modulo: data.modulo || '',
        modulo_titulo: data.modulo_titulo || data.modulo || 'Consulta',
        status: data.status || 'OK',
        timestamp: data.timestamp || new Date().toISOString(),
        tempo_resposta_ms: data.tempo_resposta_ms || 0,
        resultado_resumo: data.resultado_resumo || '',
        resposta_bruta: data.resposta_bruta || '',
        resultado_completo: data.resultado_completo || data.resposta_bruta || data.resultado_resumo || '',
        telegram_msg_id: data.telegram_msg_id || null,
        ip: data.ip || data.client_ip || '',
        client_ip: data.client_ip || data.ip || '',
        userPhotoURL: data.userPhotoURL || '',
      });
    });
  } catch (err) {
    console.warn('[AdminService] Busca por userId falhou ou requer índice:', err);
  }

  // 3. Busca por userEmail se houver e for diferente do userId
  if (userEmail && userEmail !== userId) {
    try {
      const qEmail = query(
        collection(db, 'consultas'),
        where('userEmail', '==', userEmail),
        limit(200)
      );
      const snapEmail = await getDocs(qEmail);
      snapEmail.docs.forEach((d) => {
        const data = d.data();
        map.set(d.id, {
          id: d.id,
          userId: data.userId || userId,
          userEmail: data.userEmail || userEmail,
          userName: data.userName || 'Operador',
          parametro: data.parametro || '',
          modulo: data.modulo || '',
          modulo_titulo: data.modulo_titulo || data.modulo || 'Consulta',
          status: data.status || 'OK',
          timestamp: data.timestamp || new Date().toISOString(),
          tempo_resposta_ms: data.tempo_resposta_ms || 0,
          resultado_resumo: data.resultado_resumo || '',
          resposta_bruta: data.resposta_bruta || '',
          resultado_completo: data.resultado_completo || data.resposta_bruta || data.resultado_resumo || '',
          telegram_msg_id: data.telegram_msg_id || null,
          ip: data.ip || data.client_ip || '',
          client_ip: data.client_ip || data.ip || '',
          userPhotoURL: data.userPhotoURL || '',
        });
      });
    } catch (err) {
      console.warn('[AdminService] Busca por userEmail falhou:', err);
    }
  }

  // 4. Busca na subcoleção do usuário
  try {
    const qSub = query(
      collection(db, 'users', userId, 'consultas'),
      limit(200)
    );
    const snapSub = await getDocs(qSub);
    snapSub.docs.forEach((d) => {
      const data = d.data();
      const id = data.consultaId || d.id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          userId: data.userId || userId,
          userEmail: data.userEmail || userEmail || '',
          userName: data.userName || 'Operador',
          parametro: data.parametro || '',
          modulo: data.modulo || '',
          modulo_titulo: data.modulo_titulo || data.modulo || 'Consulta',
          status: data.status || 'OK',
          timestamp: data.timestamp || new Date().toISOString(),
          tempo_resposta_ms: data.tempo_resposta_ms || 0,
          resultado_resumo: data.resultado_resumo || '',
          resposta_bruta: data.resposta_bruta || '',
          resultado_completo: data.resultado_completo || data.resposta_bruta || data.resultado_resumo || '',
          telegram_msg_id: data.telegram_msg_id || null,
          ip: data.ip || data.client_ip || '',
          client_ip: data.client_ip || data.ip || '',
          userPhotoURL: data.userPhotoURL || '',
        });
      }
    });
  } catch (err) {
    // Subcoleção opcional
  }

  const result = Array.from(map.values());
  // Ordena da mais recente para a mais antiga
  return result.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
}

