import React, { useState } from 'react';
import {
  X,
  Send,
  Image as ImageIcon,
  Link as LinkIcon,
  Bell,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Trash2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { OperatorAvatar } from './AdminDashboardModal';
import { adminSendNotification } from '../lib/adminService';

export interface SendDirectWebPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    userId: string;
    userEmail: string;
    userName: string;
    plan?: string;
    status?: string;
    photoURL?: string;
  } | null;
  onSuccess?: () => void;
}

export const SendDirectWebPushModal: React.FC<SendDirectWebPushModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const [title, setTitle] = useState('⚡ Comunicado Oficial Shazam');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [type, setType] = useState<'info' | 'urgent' | 'warning' | 'success'>('info');
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 2MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('O título do WebPush é obrigatório.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('A mensagem de texto é obrigatória.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    try {
      await adminSendNotification({
        targetUserId: targetUser.userId,
        targetUserEmail: targetUser.userEmail || undefined,
        targetUserName: targetUser.userName || undefined,
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        type,
        sentBy: 'Administração Shazam Master',
      });

      setSuccessMsg(`WebPush enviado com sucesso para ${targetUser.userName}!`);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error('[SendPush] Erro ao disparar WebPush:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao disparar notificação. Verifique as permissões.';
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      id="send-direct-webpush-modal-overlay"
      className="fixed inset-0 z-[9995] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm font-mono animate-in fade-in"
    >
      <div
        id="send-direct-webpush-modal"
        className="w-full max-w-2xl bg-[#011d1c] border-2 border-[#00827c] rounded-2xl shadow-2xl shadow-black/90 flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#003734] bg-[#002b29] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#00827c]/20 border border-[#00827c] flex items-center justify-center text-[#79fbf5] shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#ffffff] tracking-wide truncate">
                Disparar WebPush Individual
              </h2>
              <p className="text-xs text-[#899392] truncate">
                Envio direto de mensagem, foto e link para o navegador do cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-direct-webpush-modal"
            className="text-[#707777] hover:text-[#ffffff] p-1.5 rounded-lg hover:bg-[#003734] transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card do Destinatário */}
        <div className="px-4 sm:px-6 py-3 bg-[#012624] border-b border-[#003734] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <OperatorAvatar
              photoURL={targetUser.photoURL}
              name={targetUser.userName}
              email={targetUser.userEmail}
              size="md"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#ffffff] truncate">{targetUser.userName}</div>
              <div className="text-[11px] text-[#707777] font-mono truncate">{targetUser.userEmail}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {targetUser.plan && (
              <span className="px-2 py-0.5 rounded bg-[#003734] text-[#cbfffc] text-[10px] font-medium border border-[#00827c]/40">
                {targetUser.plan}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-[10px] font-bold border border-emerald-500/50">
              {targetUser.status || 'Cliente'}
            </span>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            {/* Tipo de Alerta */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                Tipo da Notificação:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setType('info')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'info'
                      ? 'bg-[#00827c] border-[#79fbf5] text-[#012624] font-bold shadow-sm'
                      : 'bg-[#003734]/40 border-[#003734] text-[#899392] hover:text-[#cbfffc]'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Informativo
                </button>
                <button
                  type="button"
                  onClick={() => setType('warning')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'warning'
                      ? 'bg-amber-600 border-amber-300 text-black font-bold shadow-sm'
                      : 'bg-[#003734]/40 border-[#003734] text-[#899392] hover:text-amber-300'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Alerta
                </button>
                <button
                  type="button"
                  onClick={() => setType('urgent')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'urgent'
                      ? 'bg-rose-600 border-rose-300 text-white font-bold shadow-sm'
                      : 'bg-[#003734]/40 border-[#003734] text-[#899392] hover:text-rose-400'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Urgente
                </button>
                <button
                  type="button"
                  onClick={() => setType('success')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'success'
                      ? 'bg-emerald-600 border-emerald-300 text-black font-bold shadow-sm'
                      : 'bg-[#003734]/40 border-[#003734] text-[#899392] hover:text-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sucesso
                </button>
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                Título do WebPush: <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="input-direct-push-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: ⚡ Atualização de Acesso Shazam"
                maxLength={65}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#003734]/50 border border-[#00827c] text-[#ffffff] placeholder-[#707777] text-sm focus:outline-none focus:border-[#79fbf5] focus:ring-1 focus:ring-[#79fbf5] transition-all"
              />
            </div>

            {/* Mensagem */}
            <div>
              <label className="block text-xs font-semibold text-[#bbc7c6] mb-1.5">
                Mensagem de Texto: <span className="text-red-400">*</span>
              </label>
              <textarea
                id="input-direct-push-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite a mensagem completa que aparecerá na tela do cliente..."
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#003734]/50 border border-[#00827c] text-[#ffffff] placeholder-[#707777] text-xs font-sans focus:outline-none focus:border-[#79fbf5] focus:ring-1 focus:ring-[#79fbf5] transition-all resize-y"
              />
            </div>

            {/* Anexar Foto / Imagem */}
            <div className="p-3.5 rounded-xl bg-[#012624] border border-[#003734] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#bbc7c6] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#79fbf5]" />
                  Anexar Foto / Banner (Opcional):
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
                  placeholder="https://exemplo.com/banner.jpg"
                  className="w-full px-3 py-2 rounded-lg bg-[#003734]/40 border border-[#00827c]/60 text-[#ffffff] placeholder-[#707777] text-xs focus:outline-none focus:border-[#79fbf5]"
                />
                <label className="px-3 py-2 rounded-lg bg-[#003734] hover:bg-[#00827c]/30 text-[#cbfffc] border border-[#00827c]/50 hover:border-[#79fbf5] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
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

            {/* Link de Ação */}
            <div className="p-3.5 rounded-xl bg-[#012624] border border-[#003734] space-y-2">
              <label className="block text-xs font-semibold text-[#bbc7c6] flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-[#79fbf5]" />
                Link de Redirecionamento (Opcional):
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Ex: https://wa.me/55... ou /planos"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#003734]/50 border border-[#00827c]/60 text-[#ffffff] placeholder-[#707777] text-xs focus:outline-none focus:border-[#79fbf5]"
              />

              {/* Sugestões Rápidas de Link */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                <span className="text-[#707777]">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => setLinkUrl('https://wa.me/')}
                  className="px-2 py-0.5 rounded bg-[#003734] hover:bg-[#00827c]/40 text-[#79fbf5] cursor-pointer"
                >
                  WhatsApp Suporte
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

            {/* Pré-visualização em Tempo Real do WebPush */}
            <div className="pt-2">
              <div className="text-xs font-bold text-[#899392] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#79fbf5]" />
                Prévia do WebPush como o cliente verá:
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-[#001716] border-2 border-[#00827c] shadow-lg shadow-black/80 space-y-2 relative overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#00827c]/30 border border-[#00827c] flex items-center justify-center text-[#79fbf5] shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#ffffff] truncate">
                        {title || 'Título da Notificação'}
                      </span>
                      <span className="text-[10px] text-[#707777] shrink-0">agora</span>
                    </div>
                    <p className="text-xs text-[#cbfffc] font-sans mt-1 leading-relaxed break-words line-clamp-3">
                      {message || 'O texto da mensagem de WebPush aparecerá aqui...'}
                    </p>
                  </div>
                </div>

                {imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-[#003734] max-h-28 mt-2">
                    <img
                      src={imageUrl}
                      alt="Banner Preview"
                      className="w-full h-28 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {linkUrl && (
                  <div className="pt-1 flex justify-end">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#79fbf5] hover:underline">
                      Abrir link <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botão de Disparo */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2.5 rounded-xl bg-[#003734] hover:bg-[#003734]/80 text-[#bbc7c6] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-send-direct-push"
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:from-[#00a8a0] hover:to-[#79fbf5] text-[#012624] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#00827c]/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#012624] border-t-transparent rounded-full animate-spin" />
                    <span>Disparando WebPush...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Disparar WebPush Agora</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
