import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldAlert, 
  X, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  HelpCircle,
  Globe
} from 'lucide-react';

export interface AuthErrorDetails {
  code?: string;
  message?: string;
  domain?: string;
}

interface AuthErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorDetails: AuthErrorDetails | null;
  onRetryLogin: () => void;
  onContinueAsGuest?: () => void;
}

export const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  isOpen,
  onClose,
  errorDetails,
  onRetryLogin,
  onContinueAsGuest,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentDomain = errorDetails?.domain || 
    (typeof window !== 'undefined' ? window.location.hostname : 'dapper-seahorse-f49b35.netlify.app');

  const projectId = 'gen-lang-client-0622411022';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const handleCopyDomain = async () => {
    try {
      await navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = currentDomain;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isUnauthorizedDomain = 
    errorDetails?.code === 'auth/unauthorized-domain' || 
    errorDetails?.message?.includes('unauthorized-domain') ||
    errorDetails?.code === 'auth/popup-closed-by-user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#011413]/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-[#012624] border border-[#00827c]/50 rounded-[20px] shadow-2xl p-6 sm:p-8 my-8 text-[#bbc7c6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer border border-[#707777]/30"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Tag */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-300 text-[10px] font-mono font-medium uppercase tracking-wider border border-amber-500/40 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            AUTORIZAÇÃO DE DOMÍNIO NO FIREBASE
          </span>
          <span className="text-xs text-[#707777] font-mono">
            {errorDetails?.code || 'auth/unauthorized-domain'}
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-[#ffffff] font-['DM_Sans',sans-serif]">
          Por que a janela de login fecha automaticamente?
        </h3>
        
        <p className="text-xs sm:text-sm text-[#bbc7c6] mt-2 leading-relaxed">
          O Google Firebase possui uma política rigorosa de segurança: qualquer domínio onde a aplicação é hospedada (como <strong className="text-[#cbfffc]">{currentDomain}</strong> no Netlify) precisa ser adicionado explicitamente à lista de <strong className="text-[#ffffff]">Domínios Autorizados</strong> no Console do Firebase.
        </p>

        {/* Highlight Box: Detected Domain */}
        <div className="my-4 p-4 rounded-[12px] bg-[#00302d] border border-[#00827c]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#707777] block flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#cbfffc]" />
              Domínio a ser autorizado
            </span>
            <span className="text-sm font-mono font-bold text-[#ffffff] break-all select-all">
              {currentDomain}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyDomain}
            className="px-3.5 py-1.5 rounded-[6px] bg-[#00827c] hover:bg-[#009b94] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#011d1c]" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#011d1c]" />
                <span>Copiar Domínio</span>
              </>
            )}
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="my-5 space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#edfffe] flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#cbfffc]" />
            Como autorizar em menos de 1 minuto:
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-[10px] bg-[#011d1c] border border-[#003734] flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00827c]/30 text-[#cbfffc] font-mono font-bold flex items-center justify-center shrink-0 border border-[#00827c]/40">
                1
              </span>
              <div>
                <strong className="text-[#ffffff] block mb-0.5">Acesse o Firebase Console</strong>
                <span className="text-[#bbc7c6]">
                  Abra a aba de Configurações de Autenticação do projeto <code className="text-[#cbfffc]">{projectId}</code>.
                </span>
                <div className="mt-2">
                  <a
                    href={firebaseSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#003734] hover:bg-[#004743] text-[#cbfffc] font-mono text-xs border border-[#00827c]/60 transition-colors"
                  >
                    <span>Abrir Configurações no Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-[#011d1c] border border-[#003734] flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00827c]/30 text-[#cbfffc] font-mono font-bold flex items-center justify-center shrink-0 border border-[#00827c]/40">
                2
              </span>
              <div>
                <strong className="text-[#ffffff] block mb-0.5">Localize "Domínios autorizados"</strong>
                <span className="text-[#bbc7c6]">
                  Clique na aba <strong className="text-[#ffffff]">Configurações (Settings)</strong> no topo e role até a seção <strong className="text-[#ffffff]">Domínios autorizados (Authorized domains)</strong>.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-[#011d1c] border border-[#003734] flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00827c]/30 text-[#cbfffc] font-mono font-bold flex items-center justify-center shrink-0 border border-[#00827c]/40">
                3
              </span>
              <div>
                <strong className="text-[#ffffff] block mb-0.5">Adicione o domínio do Netlify</strong>
                <span className="text-[#bbc7c6]">
                  Clique no botão <strong className="text-[#cbfffc]">Adicionar domínio (Add domain)</strong>, cole <code className="text-[#cbfffc]">{currentDomain}</code> e clique em <strong className="text-[#ffffff]">Salvar</strong>. A liberação é imediata!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#003734] flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRetryLogin();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-[8px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
          >
            <span>Já Autorizei, Tentar Novamente</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onContinueAsGuest && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onContinueAsGuest();
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-[8px] bg-[#ffd166]/15 hover:bg-[#ffd166]/25 border border-[#ffd166]/40 text-[#ffd166] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Entrar imediatamente no painel para testar os módulos e relatórios"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Entrar como Operador Demo (Modo Teste)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 rounded-[8px] bg-[#003734] hover:bg-[#004743] border border-[#00827c]/40 text-[#edfffe] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
