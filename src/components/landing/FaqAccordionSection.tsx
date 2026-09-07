import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  num: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'f1',
    num: '01',
    question: 'As consultas são legais e estão em conformidade com a LGPD?',
    answer: 'Sim. O sistema opera com consolidação de bases públicas, dados cadastrais e fontes amplamente disponíveis para checagem profissional e prevenção a fraudes. O usuário operador é responsável pela finalidade de uso de acordo com as diretrizes da LGPD.',
  },
  {
    id: 'f2',
    num: '02',
    question: 'Preciso comprovar profissão regulamentada (OAB, CRECI, etc)?',
    answer: 'Não é obrigatório apresentar carteira de classe. Basta se autenticar com sua conta corporativa Google. O operador se autodeclara responsável ético e legal pela finalidade das pesquisas realizadas.',
  },
  {
    id: 'f3',
    num: '03',
    question: 'Quanto tempo demora uma consulta no terminal?',
    answer: 'Em média entre 2 e 4 segundos por consulta na maioria dos módulos. Módulos leves (como CPF cadastral ou placa simples) respondem em menos de 2 segundos.',
  },
  {
    id: 'f4',
    num: '04',
    question: 'Como funciona a renovação dos planos?',
    answer: 'Não existe renovação automática nem dados de cartão de crédito gravados. Você realiza o pagamento único via PIX para o período desejado (Semanal, 15 Dias ou Mensal). Quando seu período expirar, você renova somente se e quando quiser.',
  },
  {
    id: 'f5',
    num: '05',
    question: 'A plataforma possui API para integração com meus sistemas?',
    answer: 'O plano de API está em fase final de homologação. Contará com mais de 40 endpoints REST, retornos padronizados em JSON, autenticação por chave de API e webhooks.',
  },
  {
    id: 'f6',
    num: '06',
    question: 'Como funciona o suporte técnico aos operadores?',
    answer: 'Disponibilizamos suporte direto via Telegram e e-mail. Você fala diretamente com operadores humanos para sanar dúvidas sobre módulos ou pagamentos.',
  },
  {
    id: 'f7',
    num: '07',
    question: 'Com que frequência as bases de dados são atualizadas?',
    answer: 'Bases integradas a órgãos oficiais (Receita, DETRANs, cadastros de CNPJ) são sincronizadas diariamente. Bases agregadas e cadastrais possuem rotina mensal de refresh.',
  },
];

export const FaqAccordionSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('f1');

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-[#01201e] border-b border-[#003734] relative">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003734] border border-[#00827c]/50 text-[#cbfffc] text-xs font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span>PERGUNTAS FREQUENTES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium text-[#ffffff] tracking-tight leading-[1.1]">
            Tem alguma dúvida?<br />
            <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent">
              Nós esclarecemos tudo.
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#bbc7c6]">
            Confira as principais dúvidas sobre acesso, segurança, conformidade e planos.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-[14px] border transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-[#002825] border-[#00827c]/60 shadow-md'
                    : 'bg-[#002422] border-[#003734] hover:border-[#00827c]/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[#cbfffc] font-bold">
                      {item.num}
                    </span>
                    <span className="font-medium text-sm sm:text-base text-[#ffffff]">
                      {item.question}
                    </span>
                  </span>
                  <span
                    className={`w-7 h-7 rounded-full bg-[#003734] border border-[#00827c]/40 flex items-center justify-center text-[#cbfffc] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#00827c] text-[#011d1c]' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-[#bbc7c6] leading-relaxed border-t border-[#003734]/60">
                    <p className="pl-6">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
