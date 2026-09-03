import React, { useState } from 'react';
import { 
  X, 
  Server, 
  ShieldCheck, 
  Sparkles, 
  Terminal, 
  Cloud, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Database, 
  Crown, 
  Zap,
  Check,
  Copy,
  Layers,
  Activity,
  Car,
  FileText,
  Phone,
  Building
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';

interface SetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
}

export const SetupInstructionsModal: React.FC<SetupInstructionsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onLoginGoogle,
  onLogoutGoogle,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'firebase' | 'modules'>('architecture');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#012624]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#011d1c] border border-[#003734] w-full max-w-3xl rounded-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#012624] px-7 py-5 border-b border-[#003734] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-[6px] bg-[#003734] text-[#cbfffc]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-medium text-[#ffffff] font-['DM_Sans',sans-serif]">
                  Painel de Engenharia & Protocolos Shazam Buscas
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-[4px] bg-[#003734] border border-[#00827c]/40 text-[#cbfffc] font-mono font-medium">
                  SHAZAM BUSCAS
                </span>
              </div>
              <p className="text-xs text-[#bbc7c6] uppercase tracking-[0.1em] mt-0.5 font-mono">
                Arquitetura de barramento de alta velocidade, segurança e isolamento na nuvem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#003734] bg-[#012624]/70 px-7">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'border-[#cbfffc] text-[#cbfffc] font-medium'
                : 'border-transparent text-[#bbc7c6] hover:text-[#ffffff]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Arquitetura de Ingestão</span>
          </button>

          <button
            onClick={() => setActiveTab('firebase')}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'firebase'
                ? 'border-[#cbfffc] text-[#cbfffc] font-medium'
                : 'border-transparent text-[#bbc7c6] hover:text-[#ffffff]'
            }`}
          >
            <Database className="w-4 h-4 text-[#ffd166]" />
            <span>Autenticação & Nuvem</span>
          </button>

          <button
            onClick={() => setActiveTab('modules')}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'modules'
                ? 'border-[#cbfffc] text-[#cbfffc] font-medium'
                : 'border-transparent text-[#bbc7c6] hover:text-[#ffffff]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Bases & Módulos</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-7 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="p-5 rounded-[12px] bg-[#003734] border border-[#00827c]/30 space-y-3">
                <div className="flex items-center gap-2 text-[#cbfffc]">
                  <Zap className="w-4 h-4" />
                  <h4 className="font-medium text-sm text-[#ffffff]">
                    Barramento em Tempo Real Shazam Buscas
                  </h4>
                </div>
                <p className="text-xs text-[#bbc7c6] leading-relaxed">
                  A plataforma Shazam Buscas utiliza um motor reativo conectado por WebSockets bidirecionais de ultra-baixa latência.
                  Ao submeter qualquer consulta, os dados passam por pré-validação sintática com máscaras algorítmicas, 
                  despacho prioritário para as fontes credenciadas e sanitização instantânea para formatação do dossiê final.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-[10px] bg-[#012624] border border-[#003734] space-y-2">
                  <div className="flex items-center gap-2 text-[#cbfffc] text-xs font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    <span>CRIPTOGRAFIA & ISOLAMENTO</span>
                  </div>
                  <p className="text-xs text-[#bbc7c6]">
                    Nenhum histórico é exposto publicamente. Apenas operadores autenticados com credenciais válidas possuem acesso aos relatórios.
                  </p>
                </div>

                <div className="p-4 rounded-[10px] bg-[#012624] border border-[#003734] space-y-2">
                  <div className="flex items-center gap-2 text-[#cbfffc] text-xs font-mono">
                    <Terminal className="w-4 h-4" />
                    <span>LATÊNCIA TÍPICA: ~1.5S</span>
                  </div>
                  <p className="text-xs text-[#bbc7c6]">
                    Processamento otimizado com cache inteligente e balanceamento de conexões para resposta ágil durante investigações críticas.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-[10px] bg-[#012624] border border-[#003734] space-y-2 font-mono text-xs">
                <span className="text-[#bbc7c6]">Endpoint WebSocket Local / Nuvem:</span>
                <div className="flex items-center justify-between p-2.5 rounded bg-[#011d1c] border border-[#003734] text-[#edfffe]">
                  <code>wss://{window.location.host}/socket.io</code>
                  <button
                    onClick={() => copyEndpoint(`wss://${window.location.host}/socket.io`)}
                    className="flex items-center gap-1 text-[11px] text-[#cbfffc] hover:text-[#ffffff] cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#cbfffc]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-6">
              <div className="p-5 rounded-[12px] bg-[#003734] border border-[#00827c]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Cloud className="w-5 h-5 text-[#cbfffc]" />
                    <h4 className="text-sm font-medium text-[#ffffff]">
                      Estado da Sessão Corporativa
                    </h4>
                  </div>
                  {currentUser && (
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166] text-[10px] font-mono font-medium">
                      PLANO PREMIUM ATIVO (7 DIAS)
                    </span>
                  )}
                </div>

                {currentUser ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[#012624] border border-[#003734]">
                      {currentUser.photoURL ? (
                        <img 
                          src={currentUser.photoURL} 
                          alt={currentUser.displayName || ''} 
                          className="w-10 h-10 rounded-full border border-[#cbfffc]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-[#ffffff] truncate">
                          {currentUser.displayName || 'Operador Conectado'}
                        </p>
                        <p className="text-xs text-[#bbc7c6] font-mono truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <button
                        onClick={onLogoutGoogle}
                        className="px-3 py-1.5 rounded-[6px] bg-[#011d1c] hover:bg-[#003734] text-xs text-[#bbc7c6] hover:text-[#ffffff] border border-[#003734] cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Desconectar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-[8px] bg-[#012624] border border-[#003734]">
                        <span className="text-[#707777]">ID DO OPERADOR:</span>
                        <p className="text-[#edfffe] truncate mt-0.5">{currentUser.uid}</p>
                      </div>
                      <div className="p-3 rounded-[8px] bg-[#012624] border border-[#003734]">
                        <span className="text-[#707777]">BANCO DE DADOS:</span>
                        <p className="text-[#cbfffc] truncate mt-0.5">Google Cloud Firestore (Criptografado)</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-[#bbc7c6] max-w-md mx-auto">
                      Autentique-se com sua conta Google para liberar o teste gratuito de 7 dias do Plano Premium e salvar seu histórico de forma confidencial.
                    </p>
                    <button
                      onClick={onLoginGoogle}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[6px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] text-[#011d1c] font-medium text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Entrar com Google</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-4">
              <p className="text-xs text-[#bbc7c6]">
                Conheça os módulos integrados disponíveis para consulta imediata na plataforma Shazam Buscas:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-[10px] bg-[#00302d] border border-[#00827c]/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#cbfffc]">
                    <Car className="w-4 h-4" />
                    <h5 className="font-medium text-xs text-[#ffffff]">Veículos & Frotas</h5>
                  </div>
                  <p className="text-[11px] text-[#bbc7c6] leading-relaxed">
                    Placas Mercosul e antigas. Retorna marca, modelo, ano, chassi, dados do motor e restrições.
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#00302d] border border-[#00827c]/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#cbfffc]">
                    <FileText className="w-4 h-4" />
                    <h5 className="font-medium text-xs text-[#ffffff]">CPF (3 Vias Especializadas)</h5>
                  </div>
                  <p className="text-[11px] text-[#bbc7c6] leading-relaxed">
                    Dados cadastrais na Receita Federal, vínculos familiares, score e endereços associados.
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#00302d] border border-[#00827c]/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#cbfffc]">
                    <Building className="w-4 h-4" />
                    <h5 className="font-medium text-xs text-[#ffffff]">CNPJ & Sociedades (QSA)</h5>
                  </div>
                  <p className="text-[11px] text-[#bbc7c6] leading-relaxed">
                    Quadro societário, capital, filiais, CNAEs, situação cadastral e sócios administradores.
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#00302d] border border-[#00827c]/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#cbfffc]">
                    <Phone className="w-4 h-4" />
                    <h5 className="font-medium text-xs text-[#ffffff]">Telefonia & Portabilidade</h5>
                  </div>
                  <p className="text-[11px] text-[#bbc7c6] leading-relaxed">
                    Identificação de operadora, histórico de portabilidade, status da linha e titularidade vinculada.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#012624] px-7 py-4 border-t border-[#003734] flex items-center justify-between text-xs text-[#707777] font-mono">
          <span>Shazam Buscas • Inteligência Cadastral B2B</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
