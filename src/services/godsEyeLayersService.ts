export interface ReconSatellite {
  id: string;
  name: string;
  noradId: number;
  lat: number;
  lng: number;
  altitudeKm: number;
  velocityKmS: number;
  periodMin: number;
  inclinationDeg: number;
  type: 'ISS' | 'STARLINK' | 'RECON_KH11' | 'EARTH_OBS';
}

export interface ReconFlight {
  icao24: string;
  callsign: string;
  lat: number;
  lng: number;
  altitudeFt: number;
  groundSpeedKt: number;
  headingDeg: number;
  aircraftType: string;
  origin: string;
  destination: string;
}

export interface ReconCCTV {
  id: string;
  name: string;
  lat: number;
  lng: number;
  headingDeg: number;
  fovDeg: number;
  status: 'ONLINE' | 'RECORDING';
  fps: number;
  locationDesc: string;
}

export interface ReconVessel {
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  speedKnots: number;
  headingDeg: number;
  vesselType: 'Cargo' | 'Patrol' | 'Tanker' | 'Tug';
}

// Generate realistic spatial signals in the vicinity of the active map view
export function generateReconLayers(centerLat: number, centerLng: number) {
  // 1. Orbital Satellites
  const satellites: ReconSatellite[] = [
    {
      id: 'sat-iss',
      name: 'ISS (ZARYA) // 25544',
      noradId: 25544,
      lat: centerLat + 1.8,
      lng: centerLng - 2.4,
      altitudeKm: 421.6,
      velocityKmS: 7.66,
      periodMin: 92.8,
      inclinationDeg: 51.6,
      type: 'ISS',
    },
    {
      id: 'sat-kh11',
      name: 'USA-290 // KH-11 CRYSTAL RECON',
      noradId: 44713,
      lat: centerLat - 0.9,
      lng: centerLng + 1.2,
      altitudeKm: 312.4,
      velocityKmS: 7.72,
      periodMin: 90.4,
      inclinationDeg: 97.9,
      type: 'RECON_KH11',
    },
    {
      id: 'sat-starlink',
      name: 'STARLINK-5219 // 53210',
      noradId: 53210,
      lat: centerLat + 2.5,
      lng: centerLng + 1.7,
      altitudeKm: 550.0,
      velocityKmS: 7.58,
      periodMin: 95.2,
      inclinationDeg: 53.2,
      type: 'STARLINK',
    },
  ];

  // 2. Air Traffic (ADS-B Flights)
  const flights: ReconFlight[] = [
    {
      icao24: 'e48a12',
      callsign: 'TAM3421',
      lat: centerLat + 0.045,
      lng: centerLng - 0.038,
      altitudeFt: 18400,
      groundSpeedKt: 385,
      headingDeg: 142,
      aircraftType: 'A320-214',
      origin: 'SBGR',
      destination: 'SBRJ',
    },
    {
      icao24: 'e49b88',
      callsign: 'GLO1280',
      lat: centerLat - 0.062,
      lng: centerLng + 0.051,
      altitudeFt: 8600,
      groundSpeedKt: 240,
      headingDeg: 310,
      aircraftType: 'B738',
      origin: 'SBSP',
      destination: 'SBBR',
    },
    {
      icao24: 'e47c05',
      callsign: 'AZU4419',
      lat: centerLat + 0.082,
      lng: centerLng + 0.024,
      altitudeFt: 29000,
      groundSpeedKt: 440,
      headingDeg: 220,
      aircraftType: 'E195',
      origin: 'SBKP',
      destination: 'SBPA',
    },
    {
      icao24: 'e40f99',
      callsign: 'PR-HSP (HELI)',
      lat: centerLat - 0.015,
      lng: centerLng - 0.018,
      altitudeFt: 2200,
      groundSpeedKt: 115,
      headingDeg: 85,
      aircraftType: 'EC30',
      origin: 'SBSP',
      destination: 'HELIPONTO AV. PAULISTA',
    },
  ];

  // 3. CCTV & Surveillance Cameras
  const cctvCameras: ReconCCTV[] = [
    {
      id: 'cam-01',
      name: 'CET-SP // RADAR & MONITORAMENTO 01',
      lat: centerLat + 0.0032,
      lng: centerLng - 0.0041,
      headingDeg: 120,
      fovDeg: 65,
      status: 'ONLINE',
      fps: 30,
      locationDesc: 'Cruzamento Principal • Vias Arteriais',
    },
    {
      id: 'cam-02',
      name: 'CET-SP // CÂMERA DE FLUXO E SEGURANÇA 02',
      lat: centerLat - 0.0045,
      lng: centerLng + 0.0038,
      headingDeg: 280,
      fovDeg: 75,
      status: 'RECORDING',
      fps: 30,
      locationDesc: 'Acesso Rodoviário / Perimetral Urbana',
    },
    {
      id: 'cam-03',
      name: 'SMART CITY // RECONHECIMENTO VEICULAR OCR',
      lat: centerLat + 0.0061,
      lng: centerLng + 0.0052,
      headingDeg: 45,
      fovDeg: 50,
      status: 'ONLINE',
      fps: 60,
      locationDesc: 'Leitura de Placas Automática (LPR)',
    },
  ];

  // 4. Maritime Vessels (if near coast or water)
  const vessels: ReconVessel[] = [
    {
      mmsi: '710001245',
      name: 'PATROL GUARDA COSTEIRA 04',
      lat: centerLat - 0.25,
      lng: centerLng + 0.35,
      speedKnots: 18.5,
      headingDeg: 195,
      vesselType: 'Patrol',
    },
  ];

  return { satellites, flights, cctvCameras, vessels };
}
