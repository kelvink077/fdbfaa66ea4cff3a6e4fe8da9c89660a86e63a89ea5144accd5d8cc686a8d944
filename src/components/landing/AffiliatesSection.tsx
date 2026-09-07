import React, { useState } from 'react';
import { Share2, DollarSign, BarChart3, CheckCircle2, Copy, Check, Clock, Users, ArrowUpRight, ShieldCheck, AlertTriangle } from 'lucide-react';

interface AffiliatesSectionProps {
  onOpenResellerPortal?: () => void;
}

export const AffiliatesSection: React.FC<AffiliatesSectionProps> = ({
  onOpenResellerPortal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://shazambuscas.com/?ref=operador');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="afiliados" className="py-20 lg:py-28 bg-[#011d1c] border-b border-[#003734] relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#00827c]/10 blur-[120px] pointer-events-none"></div>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>SISTEMA DE REVENDEDORES • SUSPENSO (EM DESENVOLVIMENTO)</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium text-[#ffffff] tracking-tight leading-[1.1]">
              Programa de Revendedores<br />
              <span className="bg-gradient-to-r from-amber-300 via-[#ffd166] to-[#cbfffc] bg-clip-text text-transparent">
                temporariamente suspenso.
              </span>
            </h2>

            {/* Aviso de Desenvolvimento */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-mono uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Em Desenvolvimento Técnico & Aprimoramento</span>
              </div>
              <p className="text-amber-100/80">
                O módulo de afiliados e revenda está em fase de manutenção e auditoria para integração de liquidação instantânea via PIX e novas camadas de segurança. As comissões de 15% por assinatura e saques em até 24h serão reativadas em breve.
              </p>
            </div>

            <p className="text-[#bbc7c6] text-sm leading-relaxed max-w-xl">
              Quando restabelecido, o sistema permitirá acompanhar em tempo real quem se cadastrou no seu link, verificar renda estimada e emitir ordens de saque direto para sua chave PIX.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-[12px] bg-[#002422] border border-[#00827c]/30 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#003734] flex items-center justify-center text-[#ffd166] mb-2">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-[#ffffff]">15% em Cada Plano</h4>
                <p className="text-[11px] text-[#bbc7c6] leading-snug">
                  Comissão por cada assinatura paga via PIX pelos seus indicados.
                </p>
              </div>

              <div className="p-4 rounded-[12px] bg-[#002422] border border-[#00827c]/30 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#003734] flex items-center justify-center text-[#cbfffc] mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-[#ffffff]">Quem se Cadastrou</h4>
                <p className="text-[11px] text-[#bbc7c6] leading-snug">
                  Lista com nome, e-mail cadastrado e renda estimada de cada lead indicado.
                </p>
              </div>

              <div className="p-4 rounded-[12px] bg-[#002422] border border-[#00827c]/30 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#003734] flex items-center justify-center text-emerald-400 mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-[#ffffff]">Saques em até 24h</h4>
                <p className="text-[11px] text-[#bbc7c6] leading-snug">
                  Liquidação direta na chave PIX do revendedor após validação.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenResellerPortal}
                className="px-6 py-3.5 rounded-[8px] bg-gradient-to-r from-amber-500 to-[#ffd166] hover:opacity-95 text-[#012624] font-extrabold text-xs font-mono uppercase tracking-wider transition-all shadow-xl hover:scale-[1.02] cursor-pointer flex items-center gap-2"
              >
                <span>Acessar Portal (Em Desenvolvimento)</span>
                <ArrowUpRight className="w-4 h-4 text-[#012624]" />
              </button>
              <span className="text-xs text-amber-300/80 font-mono">
                ⏳ Retorno em breve
              </span>
            </div>
          </div>

          {/* Right Column: Mockup Affiliate Panel */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-[#002422] border border-[#00827c]/40 shadow-2xl p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#003734] border border-[#00827c]/50 flex items-center justify-center font-mono font-bold text-[#cbfffc]">
                    R
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#cbfffc]">
                      Painel do Revendedor
                    </div>
                    <div className="font-semibold text-sm text-[#ffffff]">
                      Ricardo S. • Operador Parceiro
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  SUSPENSO (EM DEV)
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                <div className="bg-[#011a19] rounded-xl p-3 border border-[#003734]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#707777]">
                    Cliques
                  </div>
                  <div className="text-lg font-bold font-mono text-[#ffffff] mt-0.5">
                    1.847
                  </div>
                </div>

                <div className="bg-[#011a19] rounded-xl p-3 border border-[#003734]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#707777]">
                    Vendas
                  </div>
                  <div className="text-lg font-bold font-mono text-[#cbfffc] mt-0.5">
                    42
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#003734] to-[#004d49] rounded-xl p-3 border border-[#00827c]/50">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#ffd166]">
                    Saldo
                  </div>
                  <div className="text-lg font-bold font-mono text-[#ffd166] mt-0.5">
                    R$ 2.8k
                  </div>
                </div>
              </div>

              {/* Referral Link Box */}
              <div className="bg-[#011a19] rounded-xl border border-[#003734] p-3 flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#edfffe] truncate">
                  shazambuscas.com/<strong className="text-[#cbfffc]">?ref=ricardo</strong>
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#004d49] text-[#cbfffc] border border-[#00827c]/40 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              {/* Withdrawal Status */}
              <div className="mt-4 pt-3 border-t border-[#003734] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#bbc7c6]/70">Saque Automático</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Liberado via PIX
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
