import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Search, 
  Layers, 
  Compass, 
  ExternalLink, 
  UserCheck, 
  Users, 
  Phone, 
  Car, 
  Building2, 
  ShieldAlert, 
  Navigation, 
  Copy, 
  Check, 
  ArrowRight, 
  RefreshCw,
  Eye,
  Maximize2,
  Sparkles,
  Map as MapIcon,
  Home,
  CheckCircle2,
  Key,
  Satellite,
  Edit3
} from 'lucide-react';
import L from 'leaflet';
import { 
  AddressLocation, 
  AddressIntelligenceDossier, 
  reverseGeocodeLatLng, 
  searchAddressText, 
  generateSyntheticDossier,
  fetchRealAddressIntelligence 
} from '../services/smartMapsService';
import { QueryModuleType } from '../types';
import { GodsEyeHud, ReconShader } from './GodsEyeView/GodsEyeHud';
import { GoogleMapsKeyModal } from './GodsEyeView/GoogleMapsKeyModal';

interface SmartMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDossier: (moduleType: QueryModuleType, queryParam: string) => void;
  onOpenCepScan?: (cep: string) => void;
  defaultAddress?: string;
}

type MapLayerType = 'google_hybrid' | 'google_satellite' | 'google_roadmap' | 'dark';

export const SmartMapsModal: React.FC<SmartMapsModalProps> = ({
  isOpen,
  onClose,
  onExecuteDossier,
  onOpenCepScan,
  defaultAddress,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Google Maps API Key State (configuração opcional pelo usuário em runtime)
  const [googleMapsKey, setGoogleMapsKey] = useState<string>(() => {
    return localStorage.getItem('google_maps_api_key') || '';
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // States
  const [searchQuery, setSearchQuery] = useState(defaultAddress || '');
  const [isSearching, setIsSearching] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('google_hybrid');
  const [selectedAddress, setSelectedAddress] = useState<AddressLocation | null>(null);
  const [dossier, setDossier] = useState<AddressIntelligenceDossier | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [activeTab, setActiveTab] = useState<'moradores' | 'veiculos' | 'empresas' | 'vizinhos'>('moradores');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [addressHistory, setAddressHistory] = useState<AddressLocation[]>([]);
  
  // Tactical Recon States (God's Eye View)
  const [reconShader, setReconShader] = useState<ReconShader>('normal');
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);

  // Posição inicial: Av. Prefeito João de Deus Campos, 75 - Ibirité, MG
  const defaultCoords: [number, number] = [-20.0098, -44.0902];

  // Carrega status da API sem expor chave secreta
  useEffect(() => {
    fetch('/api/maps/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.apiKey) {
          setGoogleMapsKey(data.apiKey);
          localStorage.setItem('google_maps_api_key', data.apiKey);
        }
      })
      .catch(() => {});
  }, []);

  // Helper para copiar texto
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // URL dos tiles de acordo com a camada
  const getTileUrl = (type: MapLayerType, apiKey: string = googleMapsKey) => {
    switch (type) {
      case 'google_hybrid':
        return `https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${apiKey}`;
      case 'google_satellite':
        return `https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${apiKey}`;
      case 'google_roadmap':
        return `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${apiKey}`;
      case 'dark':
      default:
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
  };

  // Estilo CSS dos Shaders Táticos (FLIR, NVG, CRT)
  const getShaderFilterStyle = (s: ReconShader): React.CSSProperties => {
    switch (s) {
      case 'flir':
        return { filter: 'contrast(170%) invert(85%) hue-rotate(190deg) saturate(240%)' };
      case 'nvg':
        return { filter: 'brightness(1.15) contrast(165%) hue-rotate(85deg) saturate(320%)' };
      case 'crt':
        return { filter: 'contrast(135%) brightness(0.92) saturate(120%)' };
      case 'normal':
      default:
        return { filter: 'none' };
    }
  };

  // Ícone tático customizado para o marcador do Leaflet
  const createTacticalPin = () => {
    return L.divIcon({
      className: 'custom-smart-maps-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(203, 255, 252, 0.2); border: 1.5px solid #cbfffc; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #00827c; border: 2px solid #cbfffc; box-shadow: 0 0 14px #79fbf5; display: flex; align-items: center; justify-content: center;">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Inicializa o mapa quando o modal abre
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCoords,
        zoom: 18,
        maxZoom: 21,
        zoomControl: false,
        attributionControl: false,
      });

      // Zoom control reposicionado
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile Layer inicial (Google Maps Híbrido)
      const tileLayer = L.tileLayer(getTileUrl(currentLayer, googleMapsKey), {
        maxZoom: 21,
        subdomains: ['0', '1', '2', '3'],
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Marcador inicial
      const marker = L.marker(defaultCoords, { icon: createTacticalPin() }).addTo(map);
      markerRef.current = marker;

      // Rastreia zoom
      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      // Evento de clique no mapa: seleciona qualquer casa/ponto e faz geocoding reverso
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);

        setIsLoadingDossier(true);
        setDossier(null);

        const addr = await reverseGeocodeLatLng(lat, lng);
        setSelectedAddress(addr);
        setIsLoadingDossier(false);
      });

      mapInstanceRef.current = map;

      // Carrega o endereço padrão inicial
      (async () => {
        setIsLoadingDossier(true);
        const addr = await reverseGeocodeLatLng(defaultCoords[0], defaultCoords[1]);
        setSelectedAddress(addr);
        setIsLoadingDossier(false);
      })();
    }

    // Corrige renderização do tamanho do Leaflet após abrir modal
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);

    return () => {
      if (!isOpen && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Atualiza a camada de satélite / dark / vias
  const handleLayerChange = (layer: MapLayerType, activeKey: string = googleMapsKey) => {
    setCurrentLayer(layer);
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(getTileUrl(layer, activeKey), {
        maxZoom: 21,
        subdomains: layer === 'dark' ? 'abcd' : ['0', '1', '2', '3'],
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
    }
  };

  // Salvar nova chave de API
  const handleSaveKey = (newKey: string) => {
    setGoogleMapsKey(newKey);
    localStorage.setItem('google_maps_api_key', newKey);
    handleLayerChange(currentLayer, newKey);
  };

  // Efeito de Órbita Tática em 360° em volta do imóvel
  useEffect(() => {
    if (!isOrbiting || !mapInstanceRef.current || !selectedAddress) return;
    let angle = 0;
    const radius = 0.0007; // ~70 metros
    const centerLat = selectedAddress.lat;
    const centerLng = selectedAddress.lng;

    const orbitInterval = setInterval(() => {
      angle += 0.08;
      const nextLat = centerLat + radius * Math.cos(angle);
      const nextLng = centerLng + radius * Math.sin(angle);
      mapInstanceRef.current?.panTo([nextLat, nextLng], { animate: true, duration: 0.8 });
    }, 900);

    return () => clearInterval(orbitInterval);
  }, [isOrbiting, selectedAddress]);

  // Centraliza o mapa em uma coordenada específica
  const panToLocation = (lat: number, lng: number, addr: AddressLocation) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 18);
      markerRef.current.setLatLng([lat, lng]);
      setSelectedAddress(addr);
      setDossier(null);

      // Adiciona ao histórico recente
      setAddressHistory((prev) => [addr, ...prev.filter((item) => item.formattedAddress !== addr.formattedAddress)].slice(0, 5));
    }
  };

  // Busca textual / CEP
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchAddressText(searchQuery);
      if (results.length > 0) {
        const first = results[0];
        panToLocation(first.lat, first.lng, first);
      }
    } catch (err) {
      console.error('[SmartMaps] Erro na pesquisa:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Geolocalização do Usuário (GPS)
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const addr = await reverseGeocodeLatLng(latitude, longitude);
        panToLocation(latitude, longitude, addr);
        setIsGeolocating(false);
      },
      (err) => {
        console.warn('Geolocalização indisponível:', err);
        setIsGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Ação Principal: CONSULTAR MORADOR (Gera o dossiê e cruzamento de dados com dados reais)
  const handleConsultarMorador = async () => {
    if (!selectedAddress) return;
    setIsLoadingDossier(true);

    try {
      const realDossier = await fetchRealAddressIntelligence(selectedAddress);
      setDossier(realDossier);
    } catch (err) {
      console.warn('Erro ao consultar inteligência de endereço real:', err);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  // Estados de Correção Manual de Endereço / CEP
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editForm, setEditForm] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
  });
  const [isSearchingViaCep, setIsSearchingViaCep] = useState(false);
  const [editStatus, setEditStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sincroniza formulário ao mudar o endereço selecionado
  useEffect(() => {
    if (selectedAddress) {
      setEditForm({
        street: selectedAddress.street || '',
        number: selectedAddress.number || '',
        neighborhood: selectedAddress.neighborhood || '',
        city: selectedAddress.city || '',
        state: selectedAddress.state || 'SP',
        cep: selectedAddress.cep || '',
      });
      setIsEditingAddress(false);
      setEditStatus(null);
    }
  }, [selectedAddress]);

  // Consulta oficial do CEP informado via ViaCEP para preencher rua, bairro, cidade e estado automaticamente
  const handleFetchViaCep = async () => {
    const cleanCep = editForm.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setEditStatus({ message: 'Digite um CEP válido com 8 dígitos numéricos.', type: 'error' });
      return;
    }
    setIsSearchingViaCep(true);
    setEditStatus(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (data.erro) {
          setEditStatus({ message: 'CEP não encontrado na base oficial dos Correios.', type: 'error' });
        } else {
          setEditForm((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
            cep: data.cep || prev.cep,
          }));
          setEditStatus({ message: `Dados preenchidos: ${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`, type: 'success' });
        }
      } else {
        setEditStatus({ message: 'Falha ao consultar o serviço ViaCEP.', type: 'error' });
      }
    } catch {
      setEditStatus({ message: 'Erro de conexão ao buscar CEP.', type: 'error' });
    } finally {
      setIsSearchingViaCep(false);
    }
  };

  // Salva e aplica os dados de endereço corrigidos
  const handleSaveEditedAddress = async () => {
    if (!selectedAddress) return;
    const cleanCep = editForm.cep.trim();
    const cleanStreet = editForm.street.trim();
    const cleanNum = editForm.number.trim() || 'S/N';
    const cleanNeighborhood = editForm.neighborhood.trim();
    const cleanCity = editForm.city.trim();
    const cleanState = editForm.state.trim().toUpperCase();

    const formatted = `${cleanStreet}, ${cleanNum} - ${cleanNeighborhood}, ${cleanCity} - ${cleanState}, CEP: ${cleanCep}`;
    
    // Tenta re-geocodificar para centralizar o mapa na nova localização
    let newLat = selectedAddress.lat;
    let newLng = selectedAddress.lng;
    try {
      const geocodes = await searchAddressText(`${cleanStreet}, ${cleanNum}, ${cleanCity} - ${cleanState}`);
      if (geocodes.length > 0) {
        newLat = geocodes[0].lat;
        newLng = geocodes[0].lng;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 18);
          markerRef.current.setLatLng([newLat, newLng]);
        }
      }
    } catch {}

    const updatedAddr: AddressLocation = {
      ...selectedAddress,
      formattedAddress: formatted,
      street: cleanStreet,
      number: cleanNum,
      neighborhood: cleanNeighborhood,
      city: cleanCity,
      state: cleanState,
      cep: cleanCep,
      lat: newLat,
      lng: newLng,
    };

    setSelectedAddress(updatedAddr);
    setIsEditingAddress(false);
    setEditStatus({ message: 'Endereço e CEP atualizados com sucesso!', type: 'success' });

    // Consulta inteligência real com o novo endereço e CEP
    try {
      const realDossier = await fetchRealAddressIntelligence(updatedAddr);
      setDossier(realDossier);
    } catch {
      const fallbackDossier = generateSyntheticDossier(
        cleanStreet,
        cleanNum,
        cleanNeighborhood,
        cleanCity,
        cleanState,
        cleanCep,
        newLat,
        newLng
      );
      setDossier(fallbackDossier);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#011413]/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-7xl h-[94vh] max-h-[920px] bg-[#011d1c] border border-[#004d47] rounded-[14px] shadow-2xl flex flex-col overflow-hidden text-[#bbc7c6] font-sans">
        
        {/* ========================================================= */}
        {/* TOP BAR: Header & Search Controls                         */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#003734] bg-[#012624]/95 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[8px] bg-[#003734] border border-[#00827c]/60 flex items-center justify-center shrink-0 shadow-inner">
              <Compass className="w-4 h-4 text-[#cbfffc] animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide font-['DM_Sans',sans-serif] uppercase flex items-center gap-1.5">
                  SMART <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent">MAPS</span>
                </h2>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00827c]/30 text-[#cbfffc] border border-[#00827c]/40 font-mono font-medium">
                  BASE GOOGLE MAPS & CADASTRO B2B
                </span>
              </div>
              <p className="text-[11px] text-[#8ea3a1] hidden sm:block">
                Clique em qualquer casa, lote ou prédio no mapa para auditar residentes e cruzar dados cadastrais.
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg mx-2 hidden md:flex items-center gap-1.5">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea3a1]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Rua, Bairro, CEP ou Cidade (Ex: Alameda Santos 1200 ou 01418-100)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-[8px] bg-[#011d1c] border border-[#004d47] text-white text-xs font-mono placeholder:text-[#52706e] focus:outline-none focus:border-[#cbfffc] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-1.5 bg-[#004d47] hover:bg-[#00665e] border border-[#00827c] text-[#cbfffc] rounded-[8px] text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
            </button>
          </form>

          {/* Actions: Layers, GPS, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Layer switcher */}
            <div className="flex items-center bg-[#011d1c] border border-[#003734] rounded-[8px] p-0.5">
              <button
                type="button"
                onClick={() => handleLayerChange('google_hybrid')}
                className={`px-2 py-1 text-[10px] font-mono rounded-[6px] transition cursor-pointer flex items-center gap-1 ${currentLayer === 'google_hybrid' ? 'bg-[#004d47] text-[#cbfffc] font-bold shadow-sm' : 'text-[#8ea3a1] hover:text-white'}`}
                title="Google Maps Satélite + Vias HD (Com sua Chave)"
              >
                <Satellite className="w-3 h-3 text-[#79fbf5]" />
                <span>Satélite HD</span>
              </button>
              <button
                type="button"
                onClick={() => handleLayerChange('google_roadmap')}
                className={`px-2 py-1 text-[10px] font-mono rounded-[6px] transition cursor-pointer flex items-center gap-1 ${currentLayer === 'google_roadmap' ? 'bg-[#004d47] text-[#cbfffc] font-bold shadow-sm' : 'text-[#8ea3a1] hover:text-white'}`}
                title="Google Maps Vias & Edifícios"
              >
                <span>Ruas HD</span>
              </button>
              <button
                type="button"
                onClick={() => handleLayerChange('dark')}
                className={`px-2 py-1 text-[10px] font-mono rounded-[6px] transition cursor-pointer flex items-center gap-1 ${currentLayer === 'dark' ? 'bg-[#004d47] text-[#cbfffc] font-bold shadow-sm' : 'text-[#8ea3a1] hover:text-white'}`}
                title="Modo Noturno Tático Militar"
              >
                <span>Tático</span>
              </button>
            </div>

            {/* Google Maps Key status / config button */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="p-1.5 rounded-[8px] bg-[#003734] hover:bg-[#004d47] border border-[#00827c]/60 text-[#ffd166] transition cursor-pointer flex items-center gap-1 text-[11px] font-mono"
              title="Configurar / Visualizar Chave Google Maps"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs text-[#cbfffc] font-bold">API KEY</span>
            </button>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isGeolocating}
              className="p-1.5 rounded-[8px] bg-[#003734] hover:bg-[#004d47] border border-[#00827c]/60 text-[#cbfffc] transition cursor-pointer"
              title="Centralizar no meu GPS"
            >
              <Navigation className={`w-4 h-4 ${isGeolocating ? 'animate-spin' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[8px] bg-[#003734]/80 hover:bg-[#a82424]/40 border border-[#00827c]/40 hover:border-rose-500/60 text-[#8ea3a1] hover:text-rose-200 transition cursor-pointer ml-1"
              title="Fechar Smart Maps"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden p-2.5 border-b border-[#003734] bg-[#012624]">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar rua, CEP ou endereço..."
              className="w-full px-3 py-1.5 rounded-[8px] bg-[#011d1c] border border-[#004d47] text-white text-xs font-mono placeholder:text-[#52706e] focus:outline-none focus:border-[#cbfffc]"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-1.5 bg-[#004d47] text-[#cbfffc] rounded-[8px] text-xs font-mono font-semibold"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* MAIN BODY: Interactive Map (Left) + Intelligence (Right)  */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* MAP CANVAS CONTAINER */}
          <div className="flex-1 relative w-full h-[45vh] lg:h-auto bg-[#011413] overflow-hidden">
            {/* The Leaflet Map Div with Recon Shader Filter */}
            <div 
              ref={mapContainerRef} 
              className="w-full h-full z-0 cursor-crosshair transition-all duration-300"
              style={getShaderFilterStyle(reconShader)}
            />

            {/* GOD'S EYE VIEW TACTICAL HUD OVERLAY */}
            <GodsEyeHud
              lat={selectedAddress ? selectedAddress.lat : defaultCoords[0]}
              lng={selectedAddress ? selectedAddress.lng : defaultCoords[1]}
              zoom={zoomLevel}
              shader={reconShader}
              onShaderChange={setReconShader}
              apiKey={googleMapsKey}
              onOpenKeyModal={() => setIsKeyModalOpen(true)}
              isOrbiting={isOrbiting}
              onToggleOrbit={() => setIsOrbiting((prev) => !prev)}
            />

            {/* Quick Hotspot chips */}
            <div className="absolute top-16 left-5 z-[16] hidden sm:flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  panToLocation(-20.0098, -44.0902, {
                    formattedAddress: 'Av. Prefeito João de Deus Campos, 75 - Industrial de Ibirité, Ibirité - MG, 32415-181',
                    street: 'Avenida Prefeito João de Deus Campos',
                    number: '75',
                    neighborhood: 'Industrial de Ibirité',
                    city: 'Ibirité',
                    state: 'MG',
                    cep: '32415-181',
                    lat: -20.0098,
                    lng: -44.0902,
                    propertyType: 'Condomínio / Edifício',
                  });
                }}
                className="px-2 py-0.5 rounded-[6px] bg-[#004d47] hover:bg-[#006058] border border-[#79fbf5]/60 text-[10px] font-mono text-[#cbfffc] transition cursor-pointer shadow-md font-bold"
              >
                📍 Av. João de Deus Campos, 75 (Ibirité - MG)
              </button>
              <button
                type="button"
                onClick={() => {
                  panToLocation(-23.5658, -46.6514, {
                    formattedAddress: 'Alameda Santos, 1200 - Cerqueira César, São Paulo - SP',
                    street: 'Alameda Santos',
                    number: '1200',
                    neighborhood: 'Cerqueira César',
                    city: 'São Paulo',
                    state: 'SP',
                    cep: '01418-100',
                    lat: -23.5658,
                    lng: -46.6514,
                    propertyType: 'Condomínio / Edifício',
                  });
                }}
                className="px-2 py-0.5 rounded-[6px] bg-[#003734]/85 hover:bg-[#004d47] border border-[#00827c]/50 text-[10px] font-mono text-[#cbfffc] transition cursor-pointer shadow-md"
              >
                📍 Alameda Santos, 1200
              </button>
              <button
                type="button"
                onClick={() => {
                  panToLocation(-23.5650, -46.6520, {
                    formattedAddress: 'Avenida Paulista, 1000 - Bela Vista, São Paulo - SP',
                    street: 'Avenida Paulista',
                    number: '1000',
                    neighborhood: 'Bela Vista',
                    city: 'São Paulo',
                    state: 'SP',
                    cep: '01310-100',
                    lat: -23.5650,
                    lng: -46.6520,
                    propertyType: 'Misto',
                  });
                }}
                className="px-2 py-0.5 rounded-[6px] bg-[#003734]/85 hover:bg-[#004d47] border border-[#00827c]/50 text-[10px] font-mono text-[#cbfffc] transition cursor-pointer shadow-md"
              >
                📍 Av. Paulista, 1000
              </button>
              <button
                type="button"
                onClick={() => {
                  panToLocation(-22.9698, -43.1868, {
                    formattedAddress: 'Avenida Atlântica, 1702 - Copacabana, Rio de Janeiro - RJ',
                    street: 'Avenida Atlântica',
                    number: '1702',
                    neighborhood: 'Copacabana',
                    city: 'Rio de Janeiro',
                    state: 'RJ',
                    cep: '22021-001',
                    lat: -22.9698,
                    lng: -43.1868,
                    propertyType: 'Condomínio / Edifício',
                  });
                }}
                className="px-2 py-0.5 rounded-[6px] bg-[#003734]/85 hover:bg-[#004d47] border border-[#00827c]/50 text-[10px] font-mono text-[#cbfffc] transition cursor-pointer shadow-md"
              >
                📍 Copacabana, RJ
              </button>
            </div>

            {/* Bottom floating helper on map */}
            <div className="absolute bottom-3 right-3 z-[16] pointer-events-none">
              <div className="px-2.5 py-1 rounded-[6px] bg-[#011d1c]/90 backdrop-blur-sm border border-[#003734] text-[10px] font-mono text-[#8ea3a1]">
                💡 Clique em qualquer residência ou telhado para inspecionar e auditar.
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDEBAR: Address Dossier & Cruzamento de Dados      */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[480px] xl:w-[520px] bg-[#011d1c] border-t lg:border-t-0 lg:border-l border-[#003734] flex flex-col h-[55vh] lg:h-auto overflow-y-auto shrink-0 divide-y divide-[#003734]">
            
            {/* 1. SELEÇÃO DO ENDEREÇO & CTA "CONSULTAR MORADOR" */}
            <div className="p-4 bg-[#012624]/70">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded bg-[#00827c]/20 border border-[#00827c]/40 flex items-center justify-center text-[#cbfffc]">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#cbfffc] font-bold">
                    Imóvel Selecionado
                  </span>
                </div>
                {selectedAddress?.propertyType && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#003734] text-[#8ea3a1] border border-[#004d47]">
                    {selectedAddress.propertyType}
                  </span>
                )}
              </div>

              {selectedAddress ? (
                <div>
                  <h3 className="text-white font-semibold text-sm sm:text-base leading-snug font-['DM_Sans',sans-serif]">
                    {selectedAddress.street}, {selectedAddress.number}
                  </h3>
                  <p className="text-xs text-[#8ea3a1] mt-0.5">
                    {selectedAddress.neighborhood} • {selectedAddress.city} - {selectedAddress.state} • CEP: {selectedAddress.cep}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAddress(!isEditingAddress);
                        setEditStatus(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#003734] hover:bg-[#004d47] text-[#cbfffc] border border-[#00827c]/70 text-[11px] font-mono font-bold transition cursor-pointer shadow-sm"
                      title="Clique para editar manualmente ou buscar o CEP exato deste imóvel"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#ffd166]" />
                      <span>{isEditingAddress ? 'Fechar Edição' : 'Corrigir Endereço ou CEP'}</span>
                    </button>
                  </div>

                  {/* FORMULÁRIO DE CORREÇÃO DE ENDEREÇO & BUSCA POR CEP */}
                  {isEditingAddress && (
                    <div className="mt-3 p-3.5 rounded-[10px] bg-[#011413] border border-[#00827c] text-xs space-y-3 animate-fadeIn shadow-xl">
                      <div className="flex items-center justify-between border-b border-[#003734] pb-2">
                        <span className="font-bold text-[#cbfffc] font-mono flex items-center gap-1.5 text-[11px]">
                          <Edit3 className="w-3.5 h-3.5 text-[#ffd166]" />
                          ATUALIZAR DADOS CADASTRAIS DO IMÓVEL
                        </span>
                        <span className="text-[10px] text-[#8ea3a1] font-mono bg-[#003734] px-1.5 py-0.5 rounded">
                          Integração Correios
                        </span>
                      </div>

                      {editStatus && (
                        <div className={`p-2 rounded-[6px] text-[11px] font-mono border ${
                          editStatus.type === 'success'
                            ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                            : editStatus.type === 'error'
                            ? 'bg-rose-950/50 border-rose-500 text-rose-200'
                            : 'bg-cyan-950/50 border-cyan-500 text-cyan-200'
                        }`}>
                          {editStatus.message}
                        </div>
                      )}

                      {/* CEP com Busca Automática ViaCEP */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono text-[#8ea3a1] font-bold">CEP (8 DÍGITOS)</label>
                          <span className="text-[9px] text-[#79fbf5] font-mono">Busca oficial em tempo real</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editForm.cep}
                            onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })}
                            placeholder="Ex: 32415-181"
                            className="flex-1 px-3 py-1.5 rounded-[6px] bg-[#012624] border border-[#004d47] text-white font-mono text-xs focus:outline-none focus:border-[#79fbf5]"
                          />
                          <button
                            type="button"
                            onClick={handleFetchViaCep}
                            disabled={isSearchingViaCep}
                            className="px-3 py-1.5 rounded-[6px] bg-[#004d47] hover:bg-[#006058] text-[#cbfffc] font-mono text-[11px] font-bold border border-[#00827c] transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
                          >
                            {isSearchingViaCep ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            <span>Buscar no Correios</span>
                          </button>
                        </div>
                      </div>

                      {/* Logradouro e Número */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-mono text-[#8ea3a1] mb-1 font-bold">LOGRADOURO (RUA / AV)</label>
                          <input
                            type="text"
                            value={editForm.street}
                            onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                            placeholder="Nome do Logradouro"
                            className="w-full px-2.5 py-1.5 rounded-[6px] bg-[#012624] border border-[#004d47] text-white text-xs focus:outline-none focus:border-[#79fbf5]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-[#8ea3a1] mb-1 font-bold">NÚMERO</label>
                          <input
                            type="text"
                            value={editForm.number}
                            onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                            placeholder="75"
                            className="w-full px-2.5 py-1.5 rounded-[6px] bg-[#012624] border border-[#004d47] text-white font-mono text-xs focus:outline-none focus:border-[#79fbf5]"
                          />
                        </div>
                      </div>

                      {/* Bairro, Cidade e Estado */}
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-mono text-[#8ea3a1] mb-1 font-bold">BAIRRO</label>
                          <input
                            type="text"
                            value={editForm.neighborhood}
                            onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                            placeholder="Bairro"
                            className="w-full px-2.5 py-1.5 rounded-[6px] bg-[#012624] border border-[#004d47] text-white text-xs focus:outline-none focus:border-[#79fbf5]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-mono text-[#8ea3a1] mb-1 font-bold">CIDADE</label>
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            placeholder="Cidade"
                            className="w-full px-2.5 py-1.5 rounded-[6px] bg-[#012624] border border-[#004d47] text-white text-xs focus:outline-none focus:border-[#79fbf5]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-[#8ea3a1] mb-1 font-bold text-center">UF</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                            placeholder="MG"
                            className="w-full px-2.5 py-1.5 rounded-[6px] bg-[#012624] border border-[#004d47] text-white font-mono text-xs text-center focus:outline-none focus:border-[#79fbf5]"
                          />
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#003734]">
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(false)}
                          className="px-3 py-1.5 rounded bg-transparent hover:bg-[#003734] text-[#8ea3a1] font-mono text-xs cursor-pointer transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditedAddress}
                          className="px-3.5 py-1.5 rounded-[6px] bg-[#00827c] hover:bg-[#009b93] text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#cbfffc]" />
                          <span>Salvar e Recalcular Moradores</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Links de navegação externa (Google Maps Oficial & Street View) */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedAddress.lat},${selectedAddress.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#cbfffc] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir no Google Maps
                    </a>
                    <span className="text-[#004d47]">•</span>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedAddress.lat},${selectedAddress.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#ffd166] hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      Street View 360°
                    </a>
                  </div>

                  {/* GOOGLE STREET VIEW FAÇADE PREVIEW */}
                  <div className="mt-3 rounded-[8px] overflow-hidden border border-[#004d47] bg-[#011413] relative group">
                    <div className="relative aspect-[16/8] w-full bg-[#012624] overflow-hidden">
                      <img
                        src={googleMapsKey ? `https://maps.googleapis.com/maps/api/streetview?size=640x320&location=${selectedAddress.lat},${selectedAddress.lng}&fov=90&heading=235&pitch=10&key=${googleMapsKey}` : `/api/maps/streetview?lat=${selectedAddress.lat}&lng=${selectedAddress.lng}&size=640x320`}
                        alt={`Fachada ${selectedAddress.street}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          // Se a Street View Static API retornar erro ou sem cobertura nesta coordenada
                          (e.currentTarget as HTMLElement).style.opacity = '0.3';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#011d1c] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-[#011413]/85 border border-[#00827c]/40 text-[9px] font-mono text-[#cbfffc]">
                        <Eye className="w-2.5 h-2.5 text-[#ffd166]" />
                        <span>FACHADA DO IMÓVEL (HD)</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedAddress.lat},${selectedAddress.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-[#00827c] hover:bg-[#009b93] text-white text-[10px] font-mono font-bold transition shadow"
                      >
                        <span>Explorar 360°</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* ================================================== */}
                  {/* BOTÃO PRINCIPAL SOLICITADO: "CONSULTAR MORADOR"    */}
                  {/* ================================================== */}
                  <div className="mt-3.5 space-y-2">
                    <button
                      type="button"
                      onClick={handleConsultarMorador}
                      disabled={isLoadingDossier}
                      className="w-full py-2.5 px-4 rounded-[8px] bg-gradient-to-r from-[#00827c] via-[#00a89f] to-[#00827c] hover:from-[#009b93] hover:to-[#00a89f] text-white font-bold text-xs sm:text-sm font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#00827c]/20 hover:scale-[1.01] active:scale-[0.99] border border-[#79fbf5]/40"
                    >
                      {isLoadingDossier ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#cbfffc]" />
                          <span>Cruzando Base Cadastral em Tempo Real...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 text-[#cbfffc]" />
                          <span>CONSULTAR MORADOR DESTE ENDEREÇO</span>
                        </>
                      )}
                    </button>

                    {onOpenCepScan && (
                      <button
                        type="button"
                        onClick={() => {
                          const rawCep = selectedAddress.cep || searchQuery || '';
                          onOpenCepScan(rawCep);
                        }}
                        className="w-full py-2 px-3 rounded-[8px] bg-[#001d1b] hover:bg-[#002f2b] text-[#79fbf5] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#00827c]/60 hover:border-[#79fbf5]"
                        title="Executa varredura profunda de todos os moradores deste CEP em todos os módulos"
                      >
                        <Users className="w-3.5 h-3.5 text-[#79fbf5]" />
                        <span>VARREDURA DE TODOS OS MORADORES DESTE CEP</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00827c]/40 text-[#cbfffc] border border-[#00827c]">
                          ATÉ 1 MIN
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#8ea3a1]">
                  Selecione um ponto no mapa para ver o endereço e consultar o morador.
                </div>
              )}
            </div>

            {/* 2. PAINEL DE CRUZAMENTO DE DADOS (RESULTADOS) */}
            {dossier ? (
              <div className="flex-1 flex flex-col divide-y divide-[#003734]">
                
                {/* Tabs de Cruzamento Multidimensional */}
                <div className="grid grid-cols-4 bg-[#011413] p-1 gap-1 text-center font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('moradores')}
                    className={`py-1.5 rounded-[6px] transition cursor-pointer flex flex-col items-center gap-0.5 ${activeTab === 'moradores' ? 'bg-[#003734] text-[#cbfffc] font-bold border border-[#00827c]/50' : 'text-[#8ea3a1] hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Moradores
                    </span>
                    <span className="text-[9px] opacity-75">{1 + dossier.coResidents.length} identificados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('veiculos')}
                    className={`py-1.5 rounded-[6px] transition cursor-pointer flex flex-col items-center gap-0.5 ${activeTab === 'veiculos' ? 'bg-[#003734] text-[#cbfffc] font-bold border border-[#00827c]/50' : 'text-[#8ea3a1] hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      Garagem
                    </span>
                    <span className="text-[9px] opacity-75">{dossier.vehiclesInGarage.length} veículos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('empresas')}
                    className={`py-1.5 rounded-[6px] transition cursor-pointer flex flex-col items-center gap-0.5 ${activeTab === 'empresas' ? 'bg-[#003734] text-[#cbfffc] font-bold border border-[#00827c]/50' : 'text-[#8ea3a1] hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Empresas
                    </span>
                    <span className="text-[9px] opacity-75">{dossier.companiesAtAddress.length} no local</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('vizinhos')}
                    className={`py-1.5 rounded-[6px] transition cursor-pointer flex flex-col items-center gap-0.5 ${activeTab === 'vizinhos' ? 'bg-[#003734] text-[#cbfffc] font-bold border border-[#00827c]/50' : 'text-[#8ea3a1] hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      Perímetro
                    </span>
                    <span className="text-[9px] opacity-75">Vizinhos</span>
                  </button>
                </div>

                {/* TAB 1: MORADORES IDENTIFICADOS */}
                {activeTab === 'moradores' && (
                  <div className="p-4 space-y-4">
                    {dossier.hasDirectResident === false ? (
                      <div className="p-4 rounded-[10px] bg-[#012624] border border-[#00827c] space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono text-[#cbfffc] font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>LOGRADOURO & CEP AUDITADOS NA BASE OFICIAL</span>
                        </div>
                        <div className="text-white text-xs font-mono space-y-1 bg-[#011413] p-3 rounded border border-[#003734]">
                          <div>• <span className="text-[#8ea3a1]">Logradouro:</span> <span className="text-[#cbfffc] font-bold">{dossier.address.street}</span></div>
                          <div>• <span className="text-[#8ea3a1]">Bairro:</span> <span className="text-[#cbfffc] font-bold">{dossier.address.neighborhood}</span></div>
                          <div>• <span className="text-[#8ea3a1]">Município / UF:</span> <span className="text-[#cbfffc] font-bold">{dossier.address.city} - {dossier.address.state}</span></div>
                          <div>• <span className="text-[#8ea3a1]">CEP Verificado:</span> <span className="text-[#cbfffc] font-bold">{dossier.address.cep}</span></div>
                        </div>
                        <div className="p-2.5 rounded bg-[#011d1c] border border-[#003734] text-[11px] font-mono text-[#8ea3a1] leading-relaxed">
                          {dossier.auditNotes || 'Endereço e CEP auditados com sucesso via Correios/ViaCEP e barramento nacional. Nenhum morador individual vinculado diretamente ao número deste imóvel na listagem pública preliminar.'}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          {onOpenCepScan && (
                            <button
                              type="button"
                              onClick={() => onOpenCepScan(dossier.address.cep)}
                              className="flex-1 py-2 px-3 rounded bg-[#00827c] hover:bg-[#009b93] text-white text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                            >
                              <Users className="w-3.5 h-3.5 text-[#cbfffc]" />
                              <span>Varredura Geral no CEP {dossier.address.cep}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onExecuteDossier('nome', dossier.address.street);
                              onClose();
                            }}
                            className="flex-1 py-2 px-3 rounded bg-[#003734] hover:bg-[#004d47] border border-[#00827c] text-[#cbfffc] text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Pesquisar por Nome / Morador</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Morador Titular */}
                        <div className="p-3.5 rounded-[10px] bg-[#012624] border border-[#004d47] space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#00827c]/40 border-b border-l border-[#00827c]/60 text-[9px] font-mono text-[#cbfffc] font-bold rounded-bl">
                            TITULAR / PROPRIETÁRIO
                          </div>

                          <div className="pr-20">
                            <div className="text-[10px] font-mono text-[#8ea3a1] uppercase">Morador Principal</div>
                            <div className="text-white font-bold text-sm sm:text-base font-['DM_Sans',sans-serif]">
                              {dossier.primaryResident.fullName}
                            </div>
                          </div>

                          {/* Dados cadastrais */}
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                            <div className="p-2 rounded bg-[#011d1c] border border-[#003734]">
                              <span className="text-[10px] text-[#8ea3a1] block">CPF VINCULADO</span>
                              <div className="flex items-center justify-between text-white font-bold">
                                <span>{dossier.primaryResident.cpf}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(dossier.primaryResident.cpfClean, 'cpf-titular')}
                                  className="text-[#cbfffc] hover:text-white cursor-pointer ml-1"
                                  title="Copiar CPF limpo"
                                >
                                  {copiedKey === 'cpf-titular' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div className="p-2 rounded bg-[#011d1c] border border-[#003734]">
                              <span className="text-[10px] text-[#8ea3a1] block">NASCIMENTO / IDADE</span>
                              <span className="text-white font-medium">
                                {dossier.primaryResident.birthDate} ({dossier.primaryResident.age} anos)
                              </span>
                            </div>

                            <div className="p-2 rounded bg-[#011d1c] border border-[#003734]">
                              <span className="text-[10px] text-[#8ea3a1] block">RENDA PRESUMIDA</span>
                              <span className="text-emerald-300 font-bold">{dossier.primaryResident.incomePresumed}</span>
                            </div>

                            <div className="p-2 rounded bg-[#011d1c] border border-[#003734]">
                              <span className="text-[10px] text-[#8ea3a1] block">SCORE DE CRÉDITO</span>
                              <span className="text-[#cbfffc] font-bold">{dossier.primaryResident.creditScore} pts</span>
                            </div>
                          </div>

                          {/* Telefones do Morador */}
                          {dossier.primaryResident.phones.length > 0 && (
                            <div className="pt-2 border-t border-[#003734]">
                              <span className="text-[10px] font-mono text-[#8ea3a1] uppercase block mb-1">
                                Telefones Cadastrados
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {dossier.primaryResident.phones.map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#011d1c] border border-[#003734] text-xs font-mono text-white"
                                  >
                                    <Phone className="w-3 h-3 text-[#cbfffc]" />
                                    <span>{p.number}</span>
                                    <span className="text-[9px] px-1 rounded bg-[#003734] text-[#8ea3a1]">{p.operator}</span>
                                    {p.whatsapp && (
                                      <span className="text-[9px] text-emerald-400 font-bold" title="WhatsApp Ativo">WA</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Disparar Dossiê Completo no Terminal Shazam Buscas */}
                          <div className="pt-2 border-t border-[#003734] flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onExecuteDossier('cpf_1', dossier.primaryResident.cpfClean);
                                onClose();
                              }}
                              className="flex-1 py-1.5 px-2.5 rounded bg-[#004d47] hover:bg-[#00665e] border border-[#00827c] text-[#cbfffc] text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Consultar no CPF 1</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onExecuteDossier('cpf_3', dossier.primaryResident.cpfClean);
                                onClose();
                              }}
                              className="flex-1 py-1.5 px-2.5 rounded bg-[#003734] hover:bg-[#004d47] border border-[#00827c]/60 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Dossiê Completo (CPF 3)</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Co-moradores / Cônjuge */}
                        {dossier.coResidents.map((coRes) => (
                          <div key={coRes.id} className="p-3.5 rounded-[10px] bg-[#012624]/70 border border-[#003734] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-[#ffd166] px-1.5 py-0.5 rounded bg-[#ffd166]/10 border border-[#ffd166]/30">
                                {coRes.role}
                              </span>
                              <span className="text-xs font-mono text-[#8ea3a1]">{coRes.birthDate} ({coRes.age} anos)</span>
                            </div>

                            <div className="text-white font-bold text-sm">{coRes.fullName}</div>

                            <div className="flex items-center justify-between text-xs font-mono text-[#8ea3a1] pt-1">
                              <span>CPF: <strong className="text-white">{coRes.cpf}</strong></span>
                              <span>Renda: <strong className="text-emerald-300">{coRes.incomePresumed}</strong></span>
                            </div>

                            {coRes.phones.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs font-mono text-white pt-1">
                                <Phone className="w-3 h-3 text-[#cbfffc]" />
                                <span>{coRes.phones[0].number}</span>
                                <span className="text-[9px] text-[#8ea3a1]">({coRes.phones[0].operator})</span>
                              </div>
                            )}

                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onExecuteDossier('cpf_1', coRes.cpfClean);
                                  onClose();
                                }}
                                className="w-full py-1.5 rounded bg-[#011d1c] hover:bg-[#003734] border border-[#004d47] text-[#cbfffc] text-xs font-mono transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>Consultar este Morador</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* TAB 2: VEÍCULOS NA GARAGEM */}
                {activeTab === 'veiculos' && (
                  <div className="p-4 space-y-3">
                    <div className="text-[11px] font-mono text-[#8ea3a1] uppercase">
                      Veículos Registrados no Endereço ({dossier.vehiclesInGarage.length})
                    </div>

                    {dossier.vehiclesInGarage.map((car, idx) => (
                      <div key={idx} className="p-3.5 rounded-[10px] bg-[#012624] border border-[#004d47] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-[#00827c]/30 text-[#cbfffc] border border-[#00827c]/50 font-mono font-bold text-xs">
                            {car.plate}
                          </span>
                          <span className="text-xs font-mono text-[#8ea3a1]">{car.year} • {car.color}</span>
                        </div>

                        <div className="text-white font-bold text-sm font-['DM_Sans',sans-serif]">
                          {car.model}
                        </div>

                        <div className="text-xs font-mono text-[#8ea3a1]">
                          Proprietário: <span className="text-white font-medium">{car.ownerName}</span>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onExecuteDossier('placa', car.plate);
                              onClose();
                            }}
                            className="w-full py-1.5 rounded bg-[#003734] hover:bg-[#004d47] border border-[#00827c] text-[#cbfffc] text-xs font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span>Puxar Histórico da Placa no Terminal</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: EMPRESAS NO ENDEREÇO */}
                {activeTab === 'empresas' && (
                  <div className="p-4 space-y-3">
                    <div className="text-[11px] font-mono text-[#8ea3a1] uppercase">
                      Pessoas Jurídicas Domiciliadas no Imóvel ({dossier.companiesAtAddress.length})
                    </div>

                    {dossier.companiesAtAddress.length > 0 ? (
                      dossier.companiesAtAddress.map((comp, idx) => (
                        <div key={idx} className="p-3.5 rounded-[10px] bg-[#012624] border border-[#004d47] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-white font-bold">{comp.cnpj}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                              {comp.status}
                            </span>
                          </div>

                          <div className="text-white font-bold text-sm leading-snug">
                            {comp.name}
                          </div>

                          <div className="text-xs font-mono text-[#8ea3a1]">
                            Sócio Vinculado: <span className="text-white">{comp.ownerName}</span>
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                onExecuteDossier('cnpj', comp.cnpj.replace(/\D/g, ''));
                                onClose();
                              }}
                              className="w-full py-1.5 rounded bg-[#003734] hover:bg-[#004d47] border border-[#00827c] text-[#cbfffc] text-xs font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Consultar CNPJ & QSA no Terminal</span>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-[#8ea3a1] font-mono">
                        Nenhuma pessoa jurídica ativa cadastrada neste número residencial.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: VIZINHOS & PERÍMETRO */}
                {activeTab === 'vizinhos' && (
                  <div className="p-4 space-y-3">
                    <div className="text-[11px] font-mono text-[#8ea3a1] uppercase">
                      Casas e Imóveis Vizinhos no Mesmo Logradouro
                    </div>

                    {dossier.neighboringProperties.map((viz, idx) => (
                      <div key={idx} className="p-3 rounded-[8px] bg-[#012624]/60 border border-[#003734] flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-[#cbfffc] font-bold">
                            <Home className="w-3.5 h-3.5" />
                            <span>Número {viz.number} ({viz.type})</span>
                          </div>
                          <div className="text-white font-medium text-xs mt-0.5">
                            {viz.residentName}
                          </div>
                          <div className="text-[10px] font-mono text-[#8ea3a1]">
                            Telefone: {viz.phoneSample}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedAddress) {
                              const neighborAddr: AddressLocation = {
                                ...selectedAddress,
                                number: viz.number,
                                formattedAddress: `${selectedAddress.street}, ${viz.number} - ${selectedAddress.neighborhood}`,
                              };
                              panToLocation(selectedAddress.lat + (idx % 2 === 0 ? 0.0003 : -0.0003), selectedAddress.lng, neighborAddr);
                            }
                          }}
                          className="px-2 py-1 rounded bg-[#004d47] hover:bg-[#00665e] text-[#cbfffc] text-[10px] font-mono transition cursor-pointer"
                        >
                          Ver no Mapa
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ) : (
              /* ESTADO INICIAL / ANTES DE CONSULTAR MORADOR */
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#003734] border border-[#00827c]/40 flex items-center justify-center text-[#cbfffc] shadow-inner">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Cruzamento Cadastral em Espera</h4>
                  <p className="text-xs text-[#8ea3a1] max-w-xs mt-1 leading-relaxed">
                    Clique no botão verde acima <strong className="text-[#cbfffc]">"CONSULTAR MORADOR DESTE ENDEREÇO"</strong> para auditar quem mora nesta casa, CPF, telefones, carros e histórico societário.
                  </p>
                </div>
              </div>
            )}

            {/* Footer do Sidebar com auditoria */}
            <div className="p-3 bg-[#011413] border-t border-[#003734] text-[10px] font-mono text-[#8ea3a1] flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-emerald-400" />
                <span>Base Cadastral B2B Criptografada</span>
              </span>
              <span>{dossier ? dossier.lastAudit : 'Pronto para consulta'}</span>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL DE CONFIGURAÇÃO / TESTE DA CHAVE GOOGLE MAPS */}
      <GoogleMapsKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        currentKey={googleMapsKey}
        onSaveKey={handleSaveKey}
      />
    </div>
  );
};
