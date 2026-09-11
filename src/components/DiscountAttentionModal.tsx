import React from 'react';
import { AlertTriangle, Clock, ArrowRight, X, ShieldAlert } from 'lucide-react';

interface DiscountAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: () => void;
  discountCode: string;
  originalPrice?: string;
  discountedPrice?: string;
  isProcessing?: boolean;
}

export const DiscountAttentionModal: React.FC<DiscountAttentionModalProps> = ({
  isOpen,
  onClose,
  onConfirmPayment,
  discountCode,
  originalPrice = '35,00',
  discountedPrice = '11,00',
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#011413]/90 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discount-attention-title"
    >
      <div 
        className="relative w-full max-w-md bg-[#012624] border-2 border-[#ffd166] rounded-[20px] shadow-2xl p-6 sm:p-7 text-[#bbc7c6] shadow-[#ffd166]/10 ring-1 ring-[#ffd166]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar / Cancelar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer border border-[#707777]/30"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ícone de Alerta */}
        <div className="flex flex-col items-center text-center space-y-3 mb-5">
          <div className="w-14 h-14 rounded-full bg-[#ffd166]/20 border-2 border-[#ffd166] flex items-center justify-center text-[#ffd166] shadow-lg shadow-[#ffd166]/20 animate-pulse">
            <AlertTriangle className="w-7 h-7 text-[#ffd166]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-[11px] font-mono font-bold uppercase tracking-wider">
            <span>Atenção • Código Único</span>
          </div>

          <h3 
            id="discount-attention-title"
            className="text-lg sm:text-xl font-bold text-[#ffffff] font-['DM_Sans',sans-serif] tracking-tight"
          >
            Atenção antes de efetuar o pagamento
          </h3>
        </div>

        {/* Mensagem exata exigida */}
        <div className="p-4 rounded-[12px] bg-[#221013]/90 border border-rose-500/50 mb-5">
          <p className="text-xs sm:text-sm text-[#ffffff] font-medium leading-relaxed text-center">
            Antes de clicar no botão pagar tenha atenção pois caso o pagamento não seja concluído esse código de desconto será perdido. Deseja efetuar o pagamento agora ou em outro momento?
          </p>

          <div className="mt-3 pt-3 border-t border-rose-500/30 flex items-center justify-between text-[11px] font-mono">
            <span className="text-rose-300">Cupom de Novo Usuário:</span>
            <span className="font-bold text-[#ffd166] bg-[#011d1c] px-2 py-0.5 rounded border border-[#ffd166]/40">
              {discountCode}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#bbc7c6]">Valor com desconto:</span>
            <span className="font-bold text-emerald-400">
              De R$ {originalPrice} por apenas R$ {discountedPrice}
            </span>
          </div>
        </div>

        {/* Botões de Decisão */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onConfirmPayment}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-[10px] bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#fb923c] hover:to-[#f97316] text-[#ffffff] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 hover:scale-[1.01] disabled:opacity-50"
          >
            <span>Efetuar Pagamento Agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 rounded-[8px] bg-[#003734] hover:bg-[#004743] border border-[#00827c]/60 text-[#edfffe] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Clock className="w-3.5 h-3.5 text-[#707777]" />
            <span>Em Outro Momento</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-[#707777] font-mono mt-4">
          Ao escolher pagar agora, a chave PIX de R$ {discountedPrice} será gerada.
        </p>
      </div>
    </div>
  );
};
