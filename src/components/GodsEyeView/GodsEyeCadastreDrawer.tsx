import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  UserCheck, 
  Users, 
  Phone, 
  Car, 
  Building2, 
  ShieldAlert, 
  Copy, 
  Check, 
  ArrowRight, 
  ExternalLink,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';
import { AddressLocation, AddressIntelligenceDossier } from '../../services/smartMapsService';
import { QueryModuleType } from '../../types';

interface GodsEyeCadastreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  address: AddressLocation | null;
  dossier: AddressIntelligenceDossier | null;
  isLoading: boolean;
  onExecuteDossier: (mod: QueryModuleType, query: string) => void;
  onRequestDossier: () => void;
}

export const GodsEyeCadastreDrawer: React.FC<GodsEyeCadastreDrawerProps> = ({
  isOpen,
  onClose,
  address,
  dossier,
  isLoading,
  onExecuteDossier,
  onRequestDossier,
}) => {
  const [activeTab, setActiveTab] = useState<'moradores' | 'veiculos' | 'empresas' | 'vizinhos'>('moradores');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !address) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[460px] md:w-[500px] bg-[#050b10]/95 border-l border-[#00d4ff]/30 shadow-2xl z-40 flex flex-col font-mono text-white backdrop-blur-xl transition-transform duration-300 select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/10 bg-black/40 flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-[#003734] border border-[#00827c] text-[#cbfffc] shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#00d4ff] uppercase">
                DOSSIÊ CADASTRAL TÁTICO
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                {address.propertyType}
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-white mt-0.5 line-clamp-1">
              {address.street}, {address.number}
            </h2>
            <p className="text-[10px] text-white/50">
              {address.neighborhood} • {address.city} - {address.state} • CEP: {address.cep}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Street View & Google Maps Fast Links */}
      <div className="px-4 py-2 bg-[#021820]/70 border-b border-white/10 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>COORD: {address.lat.toFixed(5)}, {address.lng.toFixed(5)}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${address.lat},${address.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#00d4ff] hover:text-white transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>STREET VIEW</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${address.lat},${address.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <span>MAPS</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* If dossier not generated yet: Big Call-to-Action Button */}
        {!dossier && !isLoading && (
          <div className="p-6 rounded-xl bg-gradient-to-b from-[#002422] to-[#011413] border border-[#00827c] text-center space-y-4 shadow-lg my-auto">
            <div className="w-12 h-12 rounded-full bg-[#00827c]/20 border border-[#00827c] flex items-center justify-center mx-auto text-[#cbfffc]">
              <UserCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#cbfffc] tracking-wider uppercase">
                Cruzamento Cadastral de Moradores
              </h3>
              <p className="text-[11px] text-[#edfffe]/70 mt-1 max-w-sm mx-auto">
                Realize a varredura das bases cadastrais da Receita, DETRAN, operadoras de telefonia e cartórios vinculados a este imóvel.
              </p>
            </div>

            <button
              type="button"
              onClick={onRequestDossier}
              className="w-full py-3 rounded-lg bg-[#00827c] hover:bg-[#009e97] text-[#011d1c] font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white">CONSULTAR MORADOR DESTE ENDEREÇO</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-bold text-[#00d4ff] tracking-wider uppercase">
              Cruzando bases cadastrais...
            </div>
            <p className="text-[10px] text-white/50">
              Varrendo CPF de moradores, veículos, telefones e registros empresariais...
            </p>
          </div>
        )}

        {/* Dossier Loaded */}
        {dossier && !isLoading && (
          <>
            {/* Primary Resident Card */}
            <div className="p-3.5 rounded-lg bg-[#011f1e] border border-[#00827c]/60 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#00827c]/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-[#00827c]/30 text-[#cbfffc] border border-[#00827c] font-bold uppercase tracking-wider">
                    {dossier.primaryResident.role}
                  </span>
                  <span className="text-[10px] text-white/60">
                    Idade: {dossier.primaryResident.age} anos
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onExecuteDossier('cpf_3', dossier.primaryResident.cpfClean)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#00827c] hover:bg-[#009b94] text-white text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                  title="Abrir Dossiê Completo no terminal de consultas"
                >
                  <span>ABRIR DOSSIÊ</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  {dossier.primaryResident.fullName}
                </h4>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#cbfffc]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span>CPF: {dossier.primaryResident.cpf}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(dossier.primaryResident.cpfClean, 'cpf_primary')}
                      className="text-white/40 hover:text-white"
                      title="Copiar CPF limpo"
                    >
                      {copiedField === 'cpf_primary' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                  <span className="text-white/60 text-[10px]">
                    Nasc: {dossier.primaryResident.birthDate}
                  </span>
                </div>
              </div>

              {/* Financial Presumed Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[10px]">
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-white/50 block text-[9px]">RENDA PRESUMIDA:</span>
                  <span className="font-bold text-emerald-400">{dossier.primaryResident.incomePresumed}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-white/50 block text-[9px]">SCORE CADASTRAL:</span>
                  <span className="font-bold text-cyan-300">{dossier.primaryResident.creditScore} pts</span>
                </div>
              </div>

              {/* Fast Terminal Queries */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onExecuteDossier('cpf_1', dossier.primaryResident.cpfClean)}
                  className="flex-1 py-1 rounded bg-black/60 hover:bg-black/90 border border-white/10 text-white/80 hover:text-white text-[9px] font-bold tracking-wider uppercase transition-colors"
                >
                  CONSULTAR CPF 1
                </button>
                <button
                  type="button"
                  onClick={() => onExecuteDossier('cpf_3', dossier.primaryResident.cpfClean)}
                  className="flex-1 py-1 rounded bg-[#003734] hover:bg-[#004d47] border border-[#00827c] text-[#cbfffc] text-[9px] font-bold tracking-wider uppercase transition-colors"
                >
                  DOSSIÊ CPF 3
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 text-[10px] uppercase font-bold tracking-wider">
              <button
                type="button"
                onClick={() => setActiveTab('moradores')}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  activeTab === 'moradores'
                    ? 'border-[#00d4ff] text-[#00d4ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                Cônjuge ({dossier.coResidents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('veiculos')}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  activeTab === 'veiculos'
                    ? 'border-[#00d4ff] text-[#00d4ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                Veículos ({dossier.vehiclesInGarage.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('empresas')}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  activeTab === 'empresas'
                    ? 'border-[#00d4ff] text-[#00d4ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                Empresas ({dossier.companiesAtAddress.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vizinhos')}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  activeTab === 'vizinhos'
                    ? 'border-[#00d4ff] text-[#00d4ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                Vizinhos ({dossier.neighboringProperties.length})
              </button>
            </div>

            {/* Tab: Co-Residents */}
            {activeTab === 'moradores' && (
              <div className="space-y-2">
                {dossier.coResidents.map((co, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-bold uppercase">
                        {co.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => onExecuteDossier('cpf_3', co.cpfClean)}
                        className="text-[10px] text-[#00d4ff] hover:underline flex items-center gap-0.5"
                      >
                        <span>Investigar</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-bold text-white">{co.fullName}</div>
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>CPF: {co.cpf}</span>
                      <span>Idade: {co.age} anos</span>
                    </div>
                  </div>
                ))}
                {dossier.coResidents.length === 0 && (
                  <p className="text-[11px] text-white/40 text-center py-4">
                    Nenhum co-morador ou cônjuge cadastrado neste número.
                  </p>
                )}
              </div>
            )}

            {/* Tab: Vehicles */}
            {activeTab === 'veiculos' && (
              <div className="space-y-2">
                {dossier.vehiclesInGarage.map((v, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold tracking-widest text-[10px]">
                          {v.plate}
                        </span>
                        <span className="text-[10px] text-white/60">{v.year} • {v.color}</span>
                      </div>
                      <div className="font-bold text-white mt-1">{v.model}</div>
                      <div className="text-[9px] text-white/40">Proprietário: {v.ownerName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onExecuteDossier('veiculos', v.plate.replace('-', ''))}
                      className="px-2.5 py-1 rounded bg-[#00827c]/40 hover:bg-[#00827c] text-white text-[9px] font-bold uppercase tracking-wider transition-colors"
                    >
                      CONSULTAR
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Companies */}
            {activeTab === 'empresas' && (
              <div className="space-y-2">
                {dossier.companiesAtAddress.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{c.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/60">CNPJ: {c.cnpj}</div>
                    <div className="flex items-center justify-between text-[9px] text-white/40 pt-1">
                      <span>Capital: {c.capital}</span>
                      <button
                        type="button"
                        onClick={() => onExecuteDossier('cnpj', c.cnpj.replace(/\D/g, ''))}
                        className="text-[#00d4ff] hover:underline"
                      >
                        Consultar CNPJ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Neighbors */}
            {activeTab === 'vizinhos' && (
              <div className="space-y-2">
                {dossier.neighboringProperties.map((n, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-bold text-white">Nº {n.number} • {n.type}</div>
                      <div className="text-[10px] text-white/60">{n.residentName}</div>
                    </div>
                    <span className="text-[10px] text-white/40">{n.phoneSample}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
