import React, { useState } from 'react';
import { Bell, BellRing, CheckCircle2, AlertTriangle, ShieldCheck, Zap, MessageSquare, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { requestWebPushPermission, playWebPushChime, triggerNativeWebPush } from '../lib/pushNotificationService';

export interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  userName?: string | null;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'denied' | 'unsupported'>('idle');

  if (!isOpen) return null;

  const handleEnableNotifications = async () => {
    setIsProcessing(true);

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setStatus('unsupported');
      setIsProcessing(false);
      return;
    }

    try {
      const permission = await requestWebPushPermission();

      if (permission === 'granted') {
        setStatus('success');
        playWebPushChime();

        // Grava no Firestore que o usuário habilitou notificações
        if (userId) {
          try {
            const userRef = doc(db, 'users', userId);
            await setDoc(
              userRef,
              {
                notificationsEnabled: true,
                notificationsGrantedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (dbErr) {
            console.warn('[PushModal] Erro ao salvar status de notificação no banco:', dbErr);
          }
        }

        // Dispara uma notificação nativa de teste e boas-vindas
        triggerNativeWebPush({
          title: '⚡ Shazam Buscas • Notificações Ativadas',
          message: `Olá, ${userName || 'Operador'}! As notificações do sistema foram ativadas com sucesso.`,
          linkUrl: window.location.href,
        });

        // Fecha automaticamente após 1.2 segundos
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (permission === 'denied') {
        setStatus('denied');
      } else {
        // 'default' (usuário fechou a caixinha do navegador sem clicar em aceitar ou negar)
        setStatus('idle');
      }
    } catch (err) {
      console.warn('[PushModal] Erro na solicitação de permissão:', err);
      setStatus('denied');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="notification-permission-modal-overlay"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono animate-in fade-in duration-200"
    >
      <div
        id="notification-permission-modal"
        className="w-full max-w-lg bg-[#011d1c] border-2 border-[#00827c] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 relative overflow-hidden text-center"
      >
        {/* Barra superior de destaque com pulso */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00827c] via-[#79fbf5] to-[#00827c] animate-pulse" />

        {/* Botão sutil para fechar caso o usuário já tenha visto */}
        <button
          onClick={onClose}
          id="btn-close-notification-popin"
          className="absolute top-4 right-4 text-[#707777] hover:text-[#cbfffc] p-1.5 rounded-lg hover:bg-[#003734] transition-colors cursor-pointer"
          title="Fechar e continuar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone com brilho e animação */}
        <div className="w-20 h-20 rounded-2xl bg-[#00827c]/20 border-2 border-[#00a8a0]/60 flex items-center justify-center text-[#79fbf5] mx-auto mb-5 shadow-lg shadow-[#00827c]/30 relative">
          <BellRing className="w-10 h-10 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#79fbf5] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00a8a0]"></span>
          </span>
        </div>

        {/* Título & Mensagem Central Solicitada */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#ffffff] tracking-wide mb-3">
          Habilitar Notificações do Sistema
        </h2>

        <div className="p-3.5 rounded-xl bg-[#003734]/40 border border-[#00827c]/40 text-[#cbfffc] text-sm sm:text-base font-medium leading-relaxed mb-5">
          Para continuar, precisamos que habilite as notificações para receber atualizações e suporte do sistema.
        </div>

        {/* Lista de Benefícios */}
        <div className="text-left space-y-2.5 mb-6 text-xs sm:text-sm">
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#012624] border border-[#003734]">
            <div className="p-1.5 rounded-md bg-[#00827c]/20 text-[#79fbf5] shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#ffffff]">Atualizações e Novidades:</span>
              <p className="text-[#899392] font-sans text-xs mt-0.5">
                Receba comunicados imediatos sobre novas bases de busca e manutenções programadas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#012624] border border-[#003734]">
            <div className="p-1.5 rounded-md bg-[#ffd166]/20 text-[#ffd166] shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#ffffff]">Avisos Prévios de Expiração:</span>
              <p className="text-[#899392] font-sans text-xs mt-0.5">
                Alertas automáticos com 7 dias e 3 dias antes do vencimento do seu plano ativo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#012624] border border-[#003734]">
            <div className="p-1.5 rounded-md bg-[#00827c]/20 text-[#79fbf5] shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#ffffff]">Suporte Direto e VIP:</span>
              <p className="text-[#899392] font-sans text-xs mt-0.5">
                Mensagens com link direto para falar com a equipe de suporte e plantão técnico.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback de Estados */}
        {status === 'success' && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-sm flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">Notificações habilitadas com sucesso! Entrando no sistema...</span>
          </div>
        )}

        {status === 'denied' && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500 text-amber-200 text-xs text-left animate-in fade-in">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              Notificações bloqueadas pelo navegador
            </div>
            <p className="font-sans leading-relaxed text-[#bbc7c6]">
              Para habilitar, clique no ícone de cadeado ou configurações ao lado do link na barra de endereços do seu navegador e altere a permissão de <strong>Notificações</strong> para <strong>Permitir</strong>.
            </p>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500 text-red-300 text-xs">
            Seu navegador atual não possui suporte para WebPush.
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            id="btn-enable-notifications-action"
            onClick={handleEnableNotifications}
            disabled={isProcessing || status === 'success'}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:from-[#00a8a0] hover:to-[#79fbf5] text-[#012624] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#00827c]/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-[#012624] border-t-transparent rounded-full animate-spin" />
                <span>Solicitando permissão...</span>
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                <span>Habilitar Notificações Agora</span>
              </>
            )}
          </button>

          {status === 'denied' ? (
            <button
              onClick={onClose}
              id="btn-continue-anyway"
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#003734] hover:bg-[#00827c]/30 text-[#bbc7c6] hover:text-[#ffffff] text-xs font-semibold transition-colors cursor-pointer"
            >
              Continuar Mesmo Assim
            </button>
          ) : (
            <button
              onClick={onClose}
              id="btn-remind-later"
              className="text-xs text-[#707777] hover:text-[#cbfffc] py-2 px-3 transition-colors cursor-pointer"
            >
              Lembrar mais tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
