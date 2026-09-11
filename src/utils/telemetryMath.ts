/**
 * Utilitários matemáticos e de telemetria tática para o módulo God's Eye View / Smart Maps
 */

/**
 * Converte latitude e longitude decimal para graus, minutos e segundos (DMS)
 */
export function toDMS(coordinate: number, isLatitude: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = isLatitude
    ? coordinate >= 0
      ? 'N'
      : 'S'
    : coordinate >= 0
    ? 'E'
    : 'W';

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * Simula a conversão aproximada para MGRS (Military Grid Reference System)
 */
export function toMGRS(lat: number, lng: number): string {
  const zoneNumber = Math.floor((lng + 180) / 6) + 1;
  const letters = 'CDEFGHJKLMNPQRSTUVWX';
  const latIndex = Math.min(Math.max(Math.floor((lat + 80) / 8), 0), letters.length - 1);
  const zoneLetter = letters[latIndex];

  // Letras de quadrado de 100km
  const colLetter = String.fromCharCode(65 + (Math.abs(Math.floor(lng * 10)) % 24));
  const rowLetter = String.fromCharCode(65 + (Math.abs(Math.floor(lat * 10)) % 20));

  const easting = Math.abs(Math.round(lng * 10000) % 100000)
    .toString()
    .padStart(5, '0');
  const northing = Math.abs(Math.round(lat * 10000) % 100000)
    .toString()
    .padStart(5, '0');

  return `${zoneNumber}${zoneLetter} ${colLetter}${rowLetter} ${easting.slice(0, 4)} ${northing.slice(0, 4)}`;
}

/**
 * Calcula o GSD (Ground Sampling Distance) em metros por pixel a partir do nível de zoom e latitude
 */
export function calculateGSD(zoom: number, lat: number): number {
  const earthCircumference = 40075016.686; // metros no equador
  const latRad = (lat * Math.PI) / 180;
  const metersPerPixel = (earthCircumference * Math.cos(latRad)) / Math.pow(2, zoom + 8);
  return Math.round(metersPerPixel * 100) / 100;
}

/**
 * Determina o índice NIIRS (National Imagery Interpretability Rating Scale: 0 a 9)
 * baseado no GSD
 */
export function calculateNIIRS(gsd: number): number {
  if (gsd < 0.1) return 8.9;
  if (gsd < 0.2) return 7.8;
  if (gsd < 0.4) return 6.5;
  if (gsd < 0.75) return 5.4;
  if (gsd < 1.2) return 4.2;
  if (gsd < 2.5) return 3.1;
  if (gsd < 5.0) return 2.0;
  return 1.2;
}

/**
 * Gera altitude estimada de satélite em órbita baixa (LEO)
 */
export function estimateSatelliteAltitude(zoom: number): number {
  // Simula altitude orbital de 420km a 550km com base em telemetria simulada
  const baseAlt = 485;
  const drift = ((zoom * 17) % 35) - 17;
  return baseAlt + drift;
}
