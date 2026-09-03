/**
 * Utilitário de sanitização para manter os dados cadastrais brutos e estruturados,
 * removendo tags de bots ou menções residuais:
 * - "• USUÁRIO: gencia_web"
 * - "🔛 BY: @SkynetBlackRobot"
 * - Referências a robôs ou canais externos
 */

export function cleanTelegramRawResponse(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = String(text);

  // 1. Remove linhas com menção de usuário (ex: "• USUÁRIO: gencia_web" ou variações)
  cleaned = cleaned.replace(/^[•\-\*]?\s*USU[AÁ]RIO:\s*gencia_web\s*$/gim, '');
  cleaned = cleaned.replace(/[•\-\*]?\s*USU[AÁ]RIO:\s*gencia_web/gim, '');

  // 2. Remove linhas com menção do bot (ex: "🔛 BY: @SkynetBlackRobot" ou variações)
  cleaned = cleaned.replace(/^[🔛\s\-\*]*BY:\s*@?SkynetBlackRobot\s*$/gim, '');
  cleaned = cleaned.replace(/[🔛\s\-\*]*BY:\s*@?SkynetBlackRobot/gim, '');
  cleaned = cleaned.replace(/@SkynetBlackRobot/gim, '');

  // 3. Remove menções a canais ou bots genéricos de mensagens
  cleaned = cleaned.replace(/@[a-zA-Z0-9_]+(?:bot|robot)/gim, '');
  cleaned = cleaned.replace(/telegram/gi, 'central');

  // 4. Normaliza quebras de linha para evitar lacunas gigantescas após a remoção
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

