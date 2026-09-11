import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, UserProfileData, calculateAccountValidity } from './firebase';
import { AdminNotification, isRealUser } from './adminService';

export type PushCampaignFilter = 'all' | 'active' | 'expiring_7d' | 'expiring_3d' | 'expired';

export interface PushCampaignRecord {
  id: string;
  name: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  filter: PushCampaignFilter;
  targetCount: number;
  deliveredCount: number;
  createdAt: string;
  sentBy: string;
}

/**
 * Toca um som suave e de alta fidelidade via Web Audio API para alertar a chegada de notificação
 */
export function playWebPushChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tom 1 (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tom 2 (880 Hz - A5) para sensação de aviso elegante
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.38);
  } catch (err) {
    console.debug('[Push] Audio chime não disponível:', err);
  }
}

/**
 * Verifica o status de permissão de notificação do navegador
 */
export function checkWebPushPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita ao usuário a permissão para exibir notificações nativas da Web
 */
export async function requestWebPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Push] Erro ao solicitar permissão de WebPush:', err);
    return 'denied';
  }
}

/**
 * Dispara a notificação nativa do sistema operacional (Desktop, Windows, Mac, Android)
 */
export function triggerNativeWebPush(notification: {
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  icon?: string;
}): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notifOptions: NotificationOptions = {
      body: notification.message,
      icon: notification.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: notification.linkUrl || window.location.href,
      },
    };

    if (notification.imageUrl) {
      // Suporte a imagem/banner em navegadores modernos
      (notifOptions as unknown as { image?: string }).image = notification.imageUrl;
    }

    const notif = new Notification(notification.title, notifOptions);

    notif.onclick = function (event) {
      event.preventDefault();
      try {
        window.focus();
      } catch {
        // noop
      }
      if (notification.linkUrl) {
        if (notification.linkUrl.startsWith('http')) {
          window.open(notification.linkUrl, '_blank');
        } else {
          window.location.href = notification.linkUrl;
        }
      }
      notif.close();
    };
  } catch (err) {
    console.warn('[Push] Falha ao disparar Notification nativa:', err);
    // Fallback para Service Worker se aplicável
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(notification.title, {
          body: notification.message,
          icon: notification.icon || '/favicon.ico',
          data: { url: notification.linkUrl },
        });
      }).catch(console.warn);
    }
  }
}

/**
 * Filtra a lista de usuários de acordo com o critério da campanha
 */
export function filterUsersForPushCampaign(
  usersList: UserProfileData[],
  filter: PushCampaignFilter
): UserProfileData[] {
  const realUsers = usersList.filter((u) => isRealUser(u));

  switch (filter) {
    case 'active':
      return realUsers.filter((u) => {
        const validity = calculateAccountValidity(u);
        const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
        return validity.isValid && !validity.isExpired && !isBlocked;
      });

    case 'expiring_7d':
      return realUsers.filter((u) => {
        const validity = calculateAccountValidity(u);
        const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
        return (
          validity.isValid &&
          !isBlocked &&
          !validity.isLifetime &&
          validity.daysRemaining > 0 &&
          validity.daysRemaining <= 7
        );
      });

    case 'expiring_3d':
      return realUsers.filter((u) => {
        const validity = calculateAccountValidity(u);
        const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
        return (
          validity.isValid &&
          !isBlocked &&
          !validity.isLifetime &&
          validity.daysRemaining > 0 &&
          validity.daysRemaining <= 3
        );
      });

    case 'expired':
      return realUsers.filter((u) => {
        const validity = calculateAccountValidity(u);
        const isBlocked = Boolean(u.isBlocked || u.planStatus === 'blocked');
        return validity.isExpired || isBlocked || u.planStatus === 'expired';
      });

    case 'all':
    default:
      return realUsers;
  }
}

/**
 * Executa o disparo de uma Campanha WebPush em massa para os usuários filtrados
 */
export async function broadcastPushCampaign(params: {
  name: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  filter: PushCampaignFilter;
  type?: 'info' | 'warning' | 'success' | 'urgent';
  sentBy?: string;
  usersList: UserProfileData[];
}): Promise<{ campaign: PushCampaignRecord; targetUsers: UserProfileData[] }> {
  const targetUsers = filterUsersForPushCampaign(params.usersList, params.filter);
  const campaignId = 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  let deliveredCount = 0;

  // Dispara a notificação para cada usuário elegível
  const promises = targetUsers.map(async (user) => {
    try {
      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const notification: AdminNotification = {
        id: notifId,
        targetUserId: user.id,
        title: params.title.trim(),
        message: params.message.trim(),
        type: params.type || 'info',
        createdAt: now,
        read: false,
        sentBy: params.sentBy || 'Administração Shazam Master',
        campaignId,
        campaignName: params.name.trim(),
      };

      if (user.email) notification.targetUserEmail = user.email;
      if (user.displayName || user.email) notification.targetUserName = user.displayName || user.email;
      if (params.imageUrl && params.imageUrl.trim()) notification.imageUrl = params.imageUrl.trim();
      if (params.linkUrl && params.linkUrl.trim()) notification.linkUrl = params.linkUrl.trim();

      // 1. Grava na subcoleção do usuário
      const userNotifRef = doc(db, 'users', user.id, 'notifications', notifId);
      await setDoc(userNotifRef, notification);

      // 2. Atualiza documento do usuário com latestNotification para despertar em tempo real
      const userDocRef = doc(db, 'users', user.id);
      await setDoc(
        userDocRef,
        {
          latestNotification: notification,
          hasUnreadNotification: true,
          updatedAt: now,
        },
        { merge: true }
      );

      deliveredCount++;
    } catch (err) {
      console.warn(`[PushCampaign] Erro ao entregar para usuário ${user.id}:`, err);
    }
  });

  await Promise.all(promises);

  // Também grava na coleção global notifications para consulta
  const globalNotifRef = doc(db, 'notifications', campaignId);
  const globalNotifData: Record<string, any> = {
    id: campaignId,
    targetUserId: params.filter,
    title: params.title.trim(),
    message: params.message.trim(),
    type: params.type || 'info',
    createdAt: now,
    sentBy: params.sentBy || 'Administração Shazam Master',
  };
  if (params.imageUrl && params.imageUrl.trim()) globalNotifData.imageUrl = params.imageUrl.trim();
  if (params.linkUrl && params.linkUrl.trim()) globalNotifData.linkUrl = params.linkUrl.trim();
  await setDoc(globalNotifRef, globalNotifData);

  // Grava o registro da campanha na coleção push_campaigns sem campos undefined
  const campaignRecord: PushCampaignRecord = {
    id: campaignId,
    name: params.name.trim() || params.title.trim(),
    title: params.title.trim(),
    message: params.message.trim(),
    filter: params.filter,
    targetCount: targetUsers.length,
    deliveredCount,
    createdAt: now,
    sentBy: params.sentBy || 'Administração Shazam Master',
  };

  if (params.imageUrl && params.imageUrl.trim()) campaignRecord.imageUrl = params.imageUrl.trim();
  if (params.linkUrl && params.linkUrl.trim()) campaignRecord.linkUrl = params.linkUrl.trim();

  try {
    const campaignDocRef = doc(db, 'push_campaigns', campaignId);
    await setDoc(campaignDocRef, campaignRecord);
  } catch (err) {
    console.warn('[PushCampaign] Erro ao salvar histórico da campanha:', err);
  }

  return {
    campaign: campaignRecord,
    targetUsers,
  };
}

/**
 * Busca o histórico de campanhas já enviadas
 */
export async function fetchPushCampaignHistory(): Promise<PushCampaignRecord[]> {
  try {
    const campaignsQuery = query(
      collection(db, 'push_campaigns'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(campaignsQuery);
    return snap.docs.map((d) => d.data() as PushCampaignRecord);
  } catch (err) {
    console.warn('[PushCampaign] Erro ao carregar histórico de campanhas:', err);
    return [];
  }
}
