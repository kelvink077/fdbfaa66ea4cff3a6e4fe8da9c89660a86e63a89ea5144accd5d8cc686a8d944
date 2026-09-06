export type ExactMatchStatus = 'exact_match_found' | 'not_found' | 'partial_or_unconfirmed';

export interface ExactMatchResult {
  hasExactMatch: boolean;
  status: ExactMatchStatus;
  targetSearched: string;
  cleanedTarget: string;
  formattedTarget: string;
  telegramCommand: string;
  statusLabel: string;
  statusBadgeColor: 'green' | 'red' | 'amber';
  details: string;
  matchedTextFound?: string;
  isNegativeReported: boolean;
}

/**
 * Retorna o comando exato e o parâmetro higienizado para envio ao Telegram.
 * Exemplo:
 * /cpf1 00000000000
 * /cpf2 00000000000
 * /cpf3 00000000000
 * /cnpj 00000000000000
 * /telefone 51955555555
 * /placa ABC0000
 * /email usuario@dominio.com
 * /nome Nome Completo
 */
export function getTelegramCommand(moduleType: string, queryParam: string): {
  command: string;
  cleanParam: string;
  formattedParam: string;
  fullMessage: string;
} {
  const rawMod = (moduleType || '').toLowerCase().trim();
  const isPro = rawMod.startsWith('pro');
  // Remove categoricamente qualquer prefixo pro_ ou pro do identificador do módulo
  const mod = rawMod.replace(/^pro_?/, '').replace(/[^a-z0-9_]/g, '');
  let command = '/cpf1';
  let cleanParam = (queryParam || '').trim();
  let formattedParam = cleanParam;

  // 1. 🆔 /cpf1, /cpf2, /cpf3 (Módulos Padrão de CPF) e /cpf (Módulo Pro VIP)
  if (rawMod === 'cpf_1' || rawMod === 'cpf1' || (!isPro && (mod === 'cpf1' || mod === 'cpf_1'))) {
    command = '/cpf1';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  } else if (rawMod === 'cpf_2' || rawMod === 'cpf2' || (!isPro && (mod === 'cpf2' || mod === 'cpf_2'))) {
    command = '/cpf2';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  } else if (rawMod === 'cpf_3' || rawMod === 'cpf3' || (!isPro && (mod === 'cpf3' || mod === 'cpf_3'))) {
    command = '/cpf3';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  } else if (isPro && mod.includes('cpf')) {
    command = '/cpf';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  } else if (mod.includes('cpf')) {
    command = '/cpf1';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  }
  // 2. 📸 /foto 12345678901 (Foto cadastral)
  else if (mod.includes('foto')) {
    command = '/foto';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  }
  // 3. 📱 /telefone 11999887766 (Vínculos do telefone com pessoas)
  else if (mod.includes('telefone') || mod.includes('tel')) {
    command = '/telefone';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  }
  // 4. 👤 /nome Joao Silva Ramos (Busca pessoas pelo nome)
  else if (mod.includes('nome')) {
    command = '/nome';
    cleanParam = cleanParam.replace(/\s+/g, ' ').trim();
    formattedParam = cleanParam;
  }
  // 5. 📧 /email usuario@dominio.com (Vínculos do email + Score de qualidade)
  else if (mod.includes('email') || mod.includes('mail')) {
    command = '/email';
    cleanParam = cleanParam.toLowerCase().trim();
    formattedParam = cleanParam;
  }
  // 6. 📍 /endereco 01310100 ou /endereco SAO PAULO SP (Moradores do endereço/CEP)
  else if (mod.includes('endereco')) {
    command = '/endereco';
    const trimmed = cleanParam.trim();
    if (/^\d{5}-?\d{3}$/.test(trimmed)) {
      cleanParam = trimmed.replace(/\D/g, '');
    } else {
      cleanParam = trimmed;
    }
    formattedParam = cleanParam;
  }
  // 7. 📍 /cep 01310100 (Logradouro, bairro, cidade, UF)
  else if (mod.includes('cep')) {
    command = '/cep';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  }
  // 8. 🏢 /cnpj 12345678000190 (Razão social, sócios, situação)
  else if (mod.includes('cnpj')) {
    command = '/cnpj';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  }
  // 9. 🗳️ /titulo 123456780191 (Dados do título de eleitor)
  else if (mod.includes('titulo')) {
    command = '/titulo';
    cleanParam = cleanParam.replace(/\D/g, '');
    formattedParam = cleanParam;
  }
  // 10. 👩👧👦 /mae Maria Silva Santos (Busca pelo nome da mãe)
  else if (mod.includes('mae')) {
    command = '/mae';
    cleanParam = cleanParam.replace(/\s+/g, ' ').trim();
    formattedParam = cleanParam;
  }
  // 11. 🚗 /placa AAA9999 (Relatório veicular completo)
  else if (mod.includes('placa')) {
    command = '/placa';
    cleanParam = cleanParam.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    formattedParam = cleanParam;
  } else {
    // Fallback absoluto: garante que NUNCA começa com pro
    const base = mod.replace(/^pro_?/, '');
    command = `/${base || 'cpf'}`;
    cleanParam = cleanParam.trim();
    formattedParam = cleanParam;
  }

  // Vacina final absoluta: NUNCA permitir comandos com /pro_, /pro ou /pro[espaço]
  command = command.replace(/^\/pro[_\s]*/i, '/');
  if (command === '/' || !command) {
    command = '/cpf';
  }

  // A mensagem disparada ao Telegram deve ser EXCLUSIVAMENTE o comando e o alvo limpo
  // Ex: /cpf 12345678901 ou /foto 12345678901 ou /telefone 11999887766
  const fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;

  return {
    command,
    cleanParam,
    formattedParam,
    fullMessage,
  };
}

export function formatCpf(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  return digits;
}

export function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
  return digits;
}

export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  return digits;
}

export function formatPlaca(str: string): string {
  const clean = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Padrões que indicam resposta negativa ("Nada Consta", "Não Encontrado", etc.)
 */
const NEGATIVE_PATTERNS = [
  /nenhum registro encontrado/i,
  /nada consta/i,
  /n[ãa]o (foi )?localizado/i,
  /n[ãa]o encontrado/i,
  /nao encontrado/i,
  /❌\s*n[ãa]o encontrado/i,
  /cpf n[ãa]o cadastrado/i,
  /documento n[ãa]o encontrado/i,
  /sem dados dispon[íi]veis/i,
  /inexistente/i,
  /sem ocorr[êe]ncias/i,
  /registro n[ãa]o localizado/i,
  /sem resultados/i,
  /nenhum dado retornado/i,
  /placa n[ãa]o encontrada/i,
  /cnpj n[ãa]o localizado/i,
  /telefone n[ãa]o encontrado/i,
  /nome n[ãa]o encontrado/i,
];

export function isNegativeResponse(text: string): boolean {
  if (!text) return false;
  return NEGATIVE_PATTERNS.some((regex) => regex.test(text));
}

/**
 * Consulta e verifica no texto retornado do Telegram se houve resposta exata ao dado buscado ou não.
 */
export function checkTelegramExactMatch(
  queryParam: string,
  moduleType: string,
  telegramText: string,
  customCommand?: string
): ExactMatchResult {
  const { command, cleanParam, formattedParam } = getTelegramCommand(moduleType, queryParam);
  const telegramCommand = customCommand || `${command} ${cleanParam}`;
  const rawText = telegramText || '';

  const isNeg = isNegativeResponse(rawText);

  // Procura ocorrência do dado buscado no texto do Telegram
  let matchedTextFound: string | undefined = undefined;

  // 1. Busca dígitos limpos se for numérico (CPF, CNPJ, Telefone)
  if (cleanParam && cleanParam.length >= 7 && /^\d+$/.test(cleanParam)) {
    if (rawText.includes(cleanParam)) {
      matchedTextFound = cleanParam;
    }
  }

  // 2. Busca o formato com máscara (ex: 021.575.756-42 ou (51) 95555-5555)
  if (!matchedTextFound && formattedParam && formattedParam !== cleanParam) {
    if (rawText.includes(formattedParam)) {
      matchedTextFound = formattedParam;
    }
  }

  // 3. Busca termo original
  if (!matchedTextFound && queryParam.trim()) {
    const rawTarget = queryParam.trim();
    if (rawText.toLowerCase().includes(rawTarget.toLowerCase())) {
      matchedTextFound = rawTarget;
    }
  }

  // 4. Caso placa veicular: checar formatos ABC0000 e ABC-0000
  if (!matchedTextFound && moduleType.toLowerCase().includes('placa')) {
    const upperClean = cleanParam.toUpperCase();
    const upperHyphen = formatPlaca(upperClean);
    if (rawText.toUpperCase().includes(upperClean)) {
      matchedTextFound = upperClean;
    } else if (rawText.toUpperCase().includes(upperHyphen)) {
      matchedTextFound = upperHyphen;
    }
  }

  // Avaliação do status exato
  if (isNeg) {
    const rawNote = rawText.includes('❌') ? '❌ Não encontrado.' : 'Nenhum registro localizado.';
    return {
      hasExactMatch: false,
      status: 'not_found',
      targetSearched: queryParam,
      cleanedTarget: cleanParam,
      formattedTarget: formattedParam,
      telegramCommand,
      statusLabel: 'Nenhum Registro Encontrado (Nada Consta)',
      statusBadgeColor: 'red',
      details: `A central de inteligência retornou "${rawNote}". Não constam registros cadastrados para o parâmetro "${cleanParam || queryParam}".`,
      matchedTextFound,
      isNegativeReported: true,
    };
  }

  if (matchedTextFound) {
    return {
      hasExactMatch: true,
      status: 'exact_match_found',
      targetSearched: queryParam,
      cleanedTarget: cleanParam,
      formattedTarget: formattedParam,
      telegramCommand,
      statusLabel: 'Resposta Exata Confirmada',
      statusBadgeColor: 'green',
      details: `Resposta exata validada na central Shazam Buscas: os dados apurados correspondem formalmente ao alvo "${matchedTextFound}".`,
      matchedTextFound,
      isNegativeReported: false,
    };
  }

  // Se tem dados cadastrais ou veiculares estruturados (ex: Nome, Situação, Chassi, Renavam, Marca) retornados em resposta à mensagem
  if (
    /NOME:|SITUAÇÃO:|DATA DE NASCIMENTO:|RAZÃO SOCIAL:|PROPRIETÁRIO:|OPERADORA:|CHASSI:|RENAVAM:|MARCA[\/:]|MODELO:|PLACA:|VE[ÍI]CULO:|ANO\s*(?:FAB|MODELO)|COMBUST[ÍI]VEL:/i.test(rawText)
  ) {
    return {
      hasExactMatch: true,
      status: 'exact_match_found',
      targetSearched: queryParam,
      cleanedTarget: cleanParam,
      formattedTarget: formattedParam,
      telegramCommand,
      statusLabel: 'Resposta Confirmada via Central',
      statusBadgeColor: 'green',
      details: `Dossiê cadastral recebido diretamente da central Shazam Buscas referente ao comando disparado (${telegramCommand}).`,
      matchedTextFound: cleanParam,
      isNegativeReported: false,
    };
  }

  // Resposta não correlacionada com precisão numérica
  return {
    hasExactMatch: false,
    status: 'partial_or_unconfirmed',
    targetSearched: queryParam,
    cleanedTarget: cleanParam,
    formattedTarget: formattedParam,
    telegramCommand,
    statusLabel: 'Resposta sem Conferência Exata',
    statusBadgeColor: 'amber',
    details: `Dossiê recebido da central Shazam Buscas, porém sem confirmação explícita do identificador pesquisado (${cleanParam}).`,
    isNegativeReported: false,
  };
}

/**
 * Gera mensagem de teste simulando resposta negativa da central Shazam Buscas
 */
export function getNegativeResponseTemplate(moduleType: string, queryParam: string): string {
  const { command, cleanParam } = getTelegramCommand(moduleType, queryParam);
  return `⚠️ [CENTRAL SHAZAM BUSCAS - RESPOSTA À CONSULTA]
=========================================
Comando: ${command} ${cleanParam}
Alvo Pesquisado: ${cleanParam}
Resultado: NADA CONSTA / NENHUM REGISTRO ENCONTRADO
Status: Não foram localizadas ocorrências ativas ou vínculos válidos para este documento na base consultada.
Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
}
