import React from 'react';
import { Crown, Search, FileDown, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="como" className="py-20 lg:py-28 bg-[#011d1c] border-b border-[#003734] relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: 'radial-gradient(#cbfffc 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      ></div>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-8 mb-14 items-end">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003734] border border-[#00827c]/50 text-[#cbfffc] text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
              COMO FUNCIONA
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#ffffff] tracking-tight leading-[1.1]">
              Assine uma vez,<br />
              <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent">
                pesquise à vontade
              </span>.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[#bbc7c6] text-base leading-relaxed">
              O acesso ao <strong className="text-[#ffffff]">Shazam Buscas</strong> é por <strong className="text-[#cbfffc]">assinatura</strong>: 
              você paga no PIX e utiliza todos os módulos liberados. 
              <strong className="text-[#ffd166] block mt-1 font-medium">Nada é cobrado por consulta individual.</strong>
            </p>
          </div>
        </div>

        {/* 3 Step Cards with Mockups */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* ETAPA 1 */}
          <div className="rounded-[18px] bg-[#002422] border border-[#00827c]/40 p-6 flex flex-col justify-between hover:border-[#00827c]/80 transition-all shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#00827c] text-[#011d1c] font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#cbfffc]">
                    Etapa 01
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#003734] border border-[#00827c]/40 text-[#cbfffc] text-[10px] font-mono">
                  Assinatura PIX
                </span>
              </div>

              <h3 className="text-xl font-medium text-[#ffffff] mb-2">
                Você escolhe seu plano
              </h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed mb-6">
                Pagamento <strong>único</strong> via PIX com liberação imediata. <strong>Sem cobranças automáticas</strong> no seu cartão.
              </p>
            </div>

            {/* Mockup Subscription Box */}
            <div className="bg-[#011a19] rounded-xl border border-[#003734] p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#003734] border border-[#00827c]/50 flex items-center justify-center text-[#ffd166]">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#cbfffc]">
                    Status no Terminal
                  </div>
                  <div className="text-sm font-semibold text-[#ffffff]">
                    Plano Ativo • Imediato
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#003734] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#bbc7c6]/70">Ativação</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Na hora via PIX
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#bbc7c6]/70">Renovação</span>
                <span className="text-[#ffd166]">Sem cobrança surpresa</span>
              </div>
            </div>
          </div>

          {/* ETAPA 2 */}
          <div className="rounded-[18px] bg-[#002422] border border-[#00827c]/40 p-6 flex flex-col justify-between hover:border-[#00827c]/80 transition-all shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#00827c] text-[#011d1c] font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#cbfffc]">
                    Etapa 02
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#003734] border border-[#00827c]/40 text-[#cbfffc] text-[10px] font-mono">
                  Sem custo extra
                </span>
              </div>

              <h3 className="text-xl font-medium text-[#ffffff] mb-2">
                Acesse o painel completo
              </h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed mb-6">
                Todos os 37 módulos liberados. Busque por CPF, nome, placa, CNPJ, telefone, e-mail ou CEP.
              </p>
            </div>

            {/* Mockup Search Bar */}
            <div className="bg-[#011a19] rounded-xl border border-[#003734] p-3 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#002422] border border-[#00827c]/40">
                <Search className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span className="font-mono text-xs text-[#ffffff]">142.███.███-08</span>
                <span className="w-1.5 h-3.5 bg-[#cbfffc] animate-pulse"></span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#00827c] text-[#011d1c] font-bold">
                  CPF
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#002422] text-[#cbfffc] border border-[#003734]">
                  Parentes
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#002422] text-[#cbfffc] border border-[#003734]">
                  Score
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#002422] text-[#cbfffc] border border-[#003734]">
                  Veículos
                </span>
              </div>
            </div>
          </div>

          {/* ETAPA 3 */}
          <div className="rounded-[18px] bg-gradient-to-b from-[#00302d] to-[#002422] border border-[#00827c]/50 p-6 flex flex-col justify-between hover:border-[#cbfffc]/70 transition-all shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#cbfffc] text-[#011d1c] font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#cbfffc]">
                    Etapa 03
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#003734] border border-[#00827c]/40 text-[#ffd166] text-[10px] font-mono font-bold">
                  2 a 4s
                </span>
              </div>

              <h3 className="text-xl font-medium text-[#ffffff] mb-2">
                Emita dossiês estruturados
              </h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed mb-6">
                Consultas rápidas e completas com fontes oficiais e privadas cruzadas. Copie e exporte relatórios.
              </p>
            </div>

            {/* Mockup Report Lines */}
            <div className="bg-[#011a19]/90 rounded-xl border border-[#003734] p-3 space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Nome</span>
                <span className="text-[#ffffff] flex items-center gap-1">
                  E█████ da Silva <span className="text-emerald-400">●</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Endereços</span>
                <span className="text-[#ffffff] flex items-center gap-1">
                  12 históricos <span className="text-emerald-400">●</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Telefones</span>
                <span className="text-[#ffffff] flex items-center gap-1">
                  7 vinculados <span className="text-emerald-400">●</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Veículos</span>
                <span className="text-[#ffffff] flex items-center gap-1">
                  3 registros <span className="text-emerald-400">●</span>
                </span>
              </div>
              <div className="pt-2 mt-1 border-t border-[#003734] flex items-center justify-between text-[10px] text-[#cbfffc]">
                <span className="flex items-center gap-1 font-semibold">
                  <FileDown className="w-3 h-3" /> Exportação Estruturada
                </span>
                <span className="text-[#707777]">37 módulos ativos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
