import { ParsedIntelligenceReport, QueryModuleType } from '../types';
import { checkTelegramExactMatch, getTelegramCommand } from './telegramCommandHelper';
import { cleanTelegramRawResponse } from './cleanTelegramResponse';

export const SAMPLE_RESPONSES: Record<QueryModuleType, string> = {
  cpf_1: `📊 [DOSSIÊ CADASTRAL BÁSICO - RECEITA FEDERAL]
=========================================
CPF: 341.892.518-20
NOME: ROBERTO MENDONÇA DE OLIVEIRA
SITUAÇÃO: REGULAR (RFB)
DATA DE NASCIMENTO: 14/08/1984 (42 anos)
NOME DA MÃE: MARIA AUXILIADORA MENDONÇA
SEXO: MASCULINO
NACIONALIDADE: BRASILEIRA
UF DE EMISSÃO: SP - SÃO PAULO
DIGITO VERIFICADOR: VÁLIDO (OK)
PROTOCOLO CONSULTA: #BR-CAD-992014`,

  cpf_2: `📊 [DOSSIÊ INTERMEDIÁRIO & CRÉDITO - INTEL B2B]
=========================================
ALVO: 528.190.432-88
NOME: JULIANA BEATRIZ CARVALHO SANTOS
SITUAÇÃO RFB: REGULAR | TÍTULO ELEITOR: 2984.1029.0192 (SP)
DATA NASCIMENTO: 29/03/1991 (35 anos)
MÃE: REGINA CELIA CARVALHO SANTOS

💳 ANÁLISE DE SCORE & CRÉDITO:
- Score Estimado: 840/1000 (Excelente)
- Renda Presumida: R$ 14.850,00 / mês
- Faixa Salarial: A2
- Restrições SPC/Serasa: NADA CONSTA (Limpo)

📞 TELEFONES LOCALIZADOS:
1. (11) 98452-1920 (WhatsApp Ativo - TIM Móvel)
2. (11) 3218-4900 (Comercial Fixo - Vivo)

📍 ENDEREÇOS RECENTES:
- Av. Paulista, 1842, Conj 71 - Bela Vista, São Paulo/SP (CEP: 01310-923)
- Rua das Palmeiras, 410, Apto 52 - Santa Cecília, São Paulo/SP (CEP: 01226-010)

📧 E-MAILS VINCULADOS:
- j.carvalho.b@gmail.com
- juliana@carvalhoconsultoria.com.br`,

  cpf_3: `🕵️ [INVESTIGAÇÃO COMPLETA & PATRIMONIAL - B2B INTEL]
=========================================
ALVO: 912.445.871-04
NOME: FERNANDO HENRIQUE DE SOUZA GUIMARÃES
SITUAÇÃO RFB: REGULAR | CPF CONFIRMADO
ÓBITO: NÃO CONSTA | PEP (Pessoa Politicamente Exposta): NÃO

🏢 PARTICIPAÇÕES SOCIETÁRIAS & EMPRESAS (QSA):
1. GUIMARÃES LOGÍSTICA E TRANSPORTES LTDA (CNPJ: 24.891.032/0001-90)
   - Cargo: Sócio-Administrador (Quota: 65% - R$ 650.000,00)
   - Situação: ATIVA
2. FG INVESTIMENTOS IMOBILIÁRIOS S/A (CNPJ: 33.109.840/0001-12)
   - Cargo: Conselheiro / Acionista

🚗 VEÍCULOS REGISTRADOS (RENAVAM/DETRAN):
1. TOYOTA COROLLA CROSS XRE (Ano 2024/2024) - Placa: BRA9F22 - Gravame: QUITADO
2. VOLVO XC60 T8 INSCRIPTION (Ano 2023/2023) - Placa: SPG1A88 - Alienação Fiduciária: Itaú

⚖️ PROCESSOS JUDICIAIS / TRIBUNAIS (TJSP / TRF3):
- Total de Ações Localizadas: 1
- Proc nº 1009842-88.2023.8.26.0100 (Cível - Cumprimento de Contrato - Polo: Autor - Ativo)

👨‍👩‍👧 PARENTESCOS DE 1º GRAU:
- Mãe: HELENA SOUZA GUIMARÃES (CPF: 104.***.***-09)
- Cônjuge: MARIANA VAZ GUIMARÃES (CPF: 412.***.***-81)`,

  cnpj: `🏢 [DOSSIÊ EMPRESARIAL & FISCAL - CNPJ]
=========================================
CNPJ: 18.236.120/0001-58
RAZÃO SOCIAL: NEXUS BRASIL TECNOLOGIA E SERVICOS DE DADOS S/A
NOME FANTASIA: NEXUS INTELLIGENCE
SITUAÇÃO CADASTRAL: ATIVA (Desde 12/06/2013)
MATRIZ/FILIAL: MATRIZ
NATUREZA JURÍDICA: 205-4 - Sociedade Anônima Fechada

💰 DADOS FINANCEIROS:
- Capital Social: R$ 5.000.000,00
- Faixa de Faturamento: Acima de R$ 10.000.000/ano
- Porte: Demais (Grande Porte)
- Simples Nacional: NÃO OPTANTE

📌 ATIVIDADE ECONÔMICA (CNAE):
- Principal: 62.01-5-01 - Desenvolvimento de programas de computador sob encomenda
- Secundário: 63.11-9-00 - Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet

👥 QUADRO DE SÓCIOS E ADMINISTRADORES (QSA):
1. RICARDO ANTÔNIO VASCONCELLOS - Presidente (Entrada: 12/06/2013)
2. BEATRIZ HELENA MENDES ROCHA - Diretora Financeira (Entrada: 04/02/2018)

📍 ENDEREÇO SEDE:
Av. Brigadeiro Faria Lima, 3477, 14º Andar - Itaim Bibi, São Paulo/SP (CEP: 04538-133)`,

  nome: `🔎 [PESQUISA FONÉTICA & LOCALIZAÇÃO NACIONAL]
=========================================
PARÂMETRO: CARLOS EDUARDO DE ALMEIDA SILVA
TOTAL DE RESULTADOS ENCONTRADOS: 1 PRINCIPAL (Alta Correspondência)

👤 ALVO IDENTIFICADO:
- CPF: 219.840.192-34
- Nome Completo: CARLOS EDUARDO DE ALMEIDA SILVA
- Data de Nascimento: 19/11/1979 (46 anos)
- Nome da Mãe: TEREZINHA DE ALMEIDA SILVA
- Situação Cadastral: REGULAR (Receita Federal)
- Localidade Principal: Campinas/SP
- Endereço Recente: Rua Barão de Jaguara, 1200, Centro - Campinas/SP
- Telefone Principal: (19) 99124-7730`,

  email: `✉️ [INVESTIGAÇÃO DE E-MAIL & REPUTAÇÃO DIGITAL]
=========================================
E-MAIL: investigacoes.contato@nexuslog.com.br
DOMÍNIO: nexuslog.com.br (Servidor Ativo / MX Configurado)
REPUTAÇÃO / RISCO: BAIXO RISCO (Domínio Corporativo Verificado)

🌐 DADOS DO DOMÍNIO:
- Registrado em: Registro.br (Criado em 14/05/2011)
- Responsável: NEXUS LOGISTICA INTEGRADA LTDA
- CNPJ Vinculado: 14.882.901/0001-44

🛡️ VAZAMENTOS / BREACH DATA:
- Presença em Data Breaches Históricos: 1 vazamento antigo (LinkedIn 2021)
- Senhas Plaintext: NENHUMA ATIVA EXPOSTA
- Contas Sociais Detectadas: LinkedIn Empresa, Google Workspace`,

  placa: `🚗 [HISTÓRICO VEICULAR COMPLETO - DETRAN / SENATRAN]
=========================================
PLACA: BRA2E19 (Padrão Mercosul)
PLACA ANTERIOR: BRA-2419
CHASSI: 9BG11548K7C89****
RENAVAM: 00984712093
MUNICÍPIO / UF: SÃO PAULO / SP

📋 CARACTERÍSTICAS DO VEÍCULO:
- Marca / Modelo: BMW 320I ACTIVE FLEX
- Ano Fabricação / Modelo: 2022 / 2023
- Cor: PRETA | Combustível: ÁLCOOL / GASOLINA
- Espécie / Tipo: PASSAGEIRO / AUTOMÓVEL
- Potência / Cilindrada: 184 CV / 1998 cc

🚨 RESTRIÇÕES & SITUAÇÃO:
- Situação de Roubo / Furto: NADA CONSTA (Veículo Regular)
- Restrição Financeira (Gravame): ALIENADO (Banco BMW S.A.)
- IPVA / Licenciamento 2026: PAGO (Em Dia)
- Multas Renainf: NENHUMA PENDENTE`,

  telefone: `📱 [CONSULTA DE TELEFONIA & CADASTRO DE LINHA]
=========================================
NÚMERO: (11) 98452-1920
TIPO DE LINHA: MÓVEL (Celular)
OPERADORA ATUAL: TIM S.A.
OPERADORA ORIGINAL: VIVO (Portabilidade realizada em 14/10/2023)
STATUS: ATIVA / EM OPERAÇÃO
DDD / REGIÃO: 11 - São Paulo (Região Metropolitana)

👤 TITULARIDADE VINCULADA:
- Titular: JULIANA B. C. SANTOS
- CPF Parcial: 528.***.***-88
- Score de Confiança do Número: 96/100 (Uso Pessoal Ativo e Recorrente)
- WhatsApp: CONECTADO (Foto de perfil e Bio pública ativas)`,

  pro_cpf: `💎 [BUSCAS PRO - DOSSIÊ DE INTELIGÊNCIA CPF VIP]
=========================================
CPF: 021.575.756-42
NOME: MARCOS AURÉLIO BEZERRA DA COSTA
SITUAÇÃO RFB: REGULAR | DIGITO: VÁLIDO (OK)
DATA NASCIMENTO: 18/05/1982 (44 anos)
MÃE: FRANCISCA BEZERRA DA COSTA
PAI: JOSÉ AURÉLIO DA COSTA
RENDA PRESUMIDA: R$ 22.450,00 | SCORE: 915/1000
PODER AQUISITIVO: CLASSE A | RISCO: BAIXO
VÍNCULOS EMPREGATÍCIOS: ATIVO (CLT/DIRETORIA)
BENS DECLARADOS: 3 IMÓVEIS, 2 VEÍCULOS
PROCESSO JUDICIAL: NADA CONSTA (CÍVEL/CRIMINAL)`,

  pro_telefone: `💎 [BUSCAS PRO - TELEFONIA AVANÇADA VIP]
=========================================
NÚMERO: (11) 99874-1234
OPERADORA: CLARO S.A. (Rede 5G Ativa)
PORTABILIDADE: Realizada de TIM para CLARO em 2024
TITULAR: MARCOS AURÉLIO BEZERRA DA COSTA
CPF TITULAR: 021.575.756-42
ENDEREÇO DE COBRANÇA: Av. Brigadeiro Faria Lima, 1485, Pinheiros - SP
WHATSAPP STATUS: ATIVO COM FOTO SINCRONIZADA
GEOLOCALIZAÇÃO ESTIMADA: São Paulo / SP`,

  pro_nome: `💎 [BUSCAS PRO - VARREDURA NACIONAL POR NOME]
=========================================
ALVO: MARCOS AURÉLIO BEZERRA DA COSTA
HOMÔNIMOS LOCALIZADOS: 2
1. CPF: 021.575.756-42 | NASC: 18/05/1982 | MÃE: FRANCISCA BEZERRA | UF: SP
2. CPF: 894.120.332-15 | NASC: 04/11/1990 | MÃE: MARIA DE LOURDES | UF: CE
HISTÓRICO ELEITORAL: SÃO PAULO/SP - ZONA 001 SEÇÃO 0142
PARENTESCOS DIRETOS: 4 FAMILIARES IDENTIFICADOS`,

  pro_email: `💎 [BUSCAS PRO - INVESTIGAÇÃO DE E-MAIL & BREACHES]
=========================================
E-MAIL: m.aurelio.costa@empresa.com.br
DOMÍNIO: empresa.com.br (Ativo / MX Google Cloud)
TITULAR VINCULADO: Marcos Aurélio Bezerra da Costa
VAZAMENTOS CONFIRMADOS: 2 bases históricas
CHAVE HASH MD5/SHA256: Localizada
REDES SOCIAIS IDENTIFICADAS: LinkedIn, GitHub, X (Twitter)`,

  pro_endereco: `💎 [BUSCAS PRO - CRUZAMENTO DE ENDEREÇO & MORADORES]
=========================================
LOGRADOURO: Alameda Santos, 1200, Apto 114
BAIRRO: Cerqueira César | CIDADE: São Paulo - SP | CEP: 01418-100
TIPO: RESIDENCIAL MULTIFAMILIAR
MORADORES IDENTIFICADOS NO IMÓVEL:
1. MARCOS AURÉLIO BEZERRA DA COSTA (CPF: 021.***.***-42)
2. PATRICIA ALBUQUERQUE COSTA (CPF: 318.***.***-10)
LINHAS TELEFÔNICAS VINCULADAS AO ENDEREÇO: 2`,

  pro_cep: `💎 [BUSCAS PRO - GEO CEP & LOGRADOURO COMPLETO]
=========================================
CEP: 01418-100
LOGRADOURO: Alameda Santos
BAIRRO: Cerqueira César | ZONA: Central / Sul
CIDADE: São Paulo | UF: SP
CÓDIGO IBGE: 3550308 | DDD: 11
EMPRESAS ATIVAS NO CEP: 48 estabelecimentos
FIBRA / REDE MÓVEL: Cobertura total 5G`,

  pro_cnpj: `💎 [BUSCAS PRO - DOSSIÊ EMPRESARIAL QSA VIP]
=========================================
CNPJ: 14.882.901/0001-44
RAZÃO SOCIAL: COSTA & ALBUQUERQUE TECNOLOGIA LTDA
NOME FANTASIA: NEXUS INTEL CORP
SITUAÇÃO CADASTRAL: ATIVA (RFB)
DATA DE ABERTURA: 12/03/2018 (8 anos)
CAPITAL SOCIAL: R$ 1.500.000,00
CNAE: 62.01-5-01 - Desenvolvimento de programas de computador sob encomenda
QUADRO SOCIETÁRIO (QSA):
- Marcos Aurélio Bezerra da Costa (Sócio-Administrador - 70%)
- Patricia Albuquerque Costa (Sócia - 30%)
DÍVIDA ATIVA DA UNIÃO: NADA CONSTA (Certidão Negativa Emitida)`,

  pro_titulo: `💎 [BUSCAS PRO - TÍTULO DE ELEITOR & SITUAÇÃO]
=========================================
TÍTULO: 3418.9012.0142
NOME: MARCOS AURÉLIO BEZERRA DA COSTA
SITUAÇÃO ELEITORAL: REGULAR / APTO A VOTAR
BIOMETRIA: CADASTRADA (COLETADA)
ZONA ELEITORAL: 001 | SEÇÃO: 0142
MUNICÍPIO / UF: SÃO PAULO / SP
LOCAL DE VOTAÇÃO: COLÉGIO DANTE ALIGHIERI`,

  pro_mae: `💎 [BUSCAS PRO - FILIAÇÃO & VÍNCULO MATERNO CRUZADO]
=========================================
NOME DA MÃE: FRANCISCA BEZERRA DA COSTA
DATA NASCIMENTO ESTIMADA: 09/02/1958
CPF ESTIMADO: 119.***.***-00 | SITUAÇÃO: REGULAR
FILHOS REGISTRADOS VINCULADOS:
1. MARCOS AURÉLIO BEZERRA DA COSTA (CPF: 021.***.***-42)
2. RENATA BEZERRA DA COSTA (CPF: 248.***.***-91)
ÚLTIMO ENDEREÇO CONHECIDO: São Paulo/SP`,

  pro_foto: `💎 [BUSCAS PRO - BIOMETRIA FACIAL & REGISTRO FOTOGRÁFICO]
=========================================
ALVO: MARCOS AURÉLIO BEZERRA DA COSTA | CPF: 021.575.756-42
REGISTRO BIOMÉTRICO: LOCALIZADO NA BASE NACIONAL (DNI / CNH DIGITAL)
CONFORMIDADE FACIAL: 98.7% (MATCH CONFIRMADO)
ÓRGÃO EMISSOR: DETRAN-SP / SENATRAN
ÚLTIMA FOTO ATUALIZADA: 2024
STATUS: DOCUMENTO VÁLIDO E AUTENTICADO`,

  pro_placa: `💎 [BUSCAS PRO - HISTÓRICO VEICULAR PRO DETRAN]
=========================================
PLACA: RTO9F22 (Mercosul) | PLACA ANTERIOR: RTO-9522
MARCA / MODELO: PORSCHE MACAN 2.0 TURBO
ANO FABRICAÇÃO / MODELO: 2023 / 2024
CHASSI: WP1AA2954LLB9**** | RENAVAM: 01289471023
COR: CINZA VULCANO | POTÊNCIA: 265 CV
PROPRIETÁRIO ATUAL: COSTA & ALBUQUERQUE TECNOLOGIA LTDA
GRAVAME: QUITADO (SEM RESTRIÇÃO FINANCEIRA)
SITUAÇÃO ROUBO/FURTO: NADA CONSTA
DÉBITOS / MULTAS: NENHUM DÉBITO PENDENTE`,

  cep: `📍 [VARREDURA DE MORADORES & LOGRADOURO POR CEP]
=========================================
CEP CONSULTADO: 01419-002
LOGRADOURO: Alameda Santos, 1000 a 1400
BAIRRO: Cerqueira César | CIDADE/UF: São Paulo - SP
TIPO DE LOGRADOURO: Via Urbana Principal
POPULAÇÃO ESTIMADA NO RAIO: 4.820 pessoas

👥 MORADORES IDENTIFICADOS NESTE CEP:
1. CLAUDIO HENRIQUE VIEIRA (Apto 42)
   - CPF: 312.***.***-09 | Nascimento: 1982
   - Status: Residente Confirmado (Receita Federal / Concessionária)
2. MARIANA ALBUQUERQUE LIMA (Apto 71)
   - CPF: 429.***.***-81 | Nascimento: 1990
   - Status: Residente Confirmada (Bancário / Concessionária)
3. ROBERTO CARLOS MENEZES (Apto 114)
   - CPF: 188.***.***-34 | Nascimento: 1976
   - Status: Titular do Imóvel (IPTU / Cartório)

💡 DICA: Clique em "VARREDURA CEP" no menu para gerar dossiê profundo individual com até 7 minutos de mineração analítica passo a passo.`,

  endereco: `🏠 [CONSULTA DE ENDEREÇO & MORADORES ASSOCIADOS]
=========================================
ENDEREÇO: Avenida Paulista, 1578
BAIRRO: Bela Vista | CIDADE/UF: São Paulo - SP
CEP: 01310-200

🏢 DADOS DO IMÓVEL & HISTÓRICO:
- Tipo: Misto (Residencial / Comercial)
- Área Estimada: 142 m²
- Concessionária de Energia: Enel SP (Titular Ativo)
- Concessionária de Água: Sabesp (Ligação Regular)

👥 MORADORES & OCUPANTES RECENTES:
1. CARLOS EDUARDO NOBREGA (CPF: 219.***.***-45)
2. BEATRIZ HELENA FONSECA (CPF: 384.***.***-12)`
};

/**
 * Retorna o template de exemplo adaptado dinamicamente com o alvo pesquisado em tempo de execução
 */
export function getSampleResponseForQuery(moduleType: QueryModuleType, queryParam: string): string {
  const base = SAMPLE_RESPONSES[moduleType] || `Dossiê cadastral gerado com sucesso para ${queryParam}`;
  const { cleanParam, formattedParam } = getTelegramCommand(moduleType, queryParam);

  let adapted = base;
  if (moduleType === 'cpf_1' || moduleType === 'pro_cpf') {
    adapted = adapted.replace(/341\.892\.518-20/g, formattedParam || cleanParam)
                     .replace(/021\.575\.756-42/g, formattedParam || cleanParam);
  } else if (moduleType === 'cpf_2') {
    adapted = adapted.replace(/528\.190\.432-88/g, formattedParam || cleanParam);
  } else if (moduleType === 'cpf_3') {
    adapted = adapted.replace(/912\.445\.871-04/g, formattedParam || cleanParam);
  } else if (moduleType === 'cnpj' || moduleType === 'pro_cnpj') {
    adapted = adapted.replace(/18\.236\.120\/0001-58/g, formattedParam || cleanParam)
                     .replace(/14\.882\.901\/0001-44/g, formattedParam || cleanParam);
  } else if (moduleType === 'telefone' || moduleType === 'pro_telefone') {
    adapted = adapted.replace(/\(11\) 98452-1920/g, formattedParam || cleanParam)
                     .replace(/\(11\) 99874-1234/g, formattedParam || cleanParam);
  } else if (moduleType === 'placa' || moduleType === 'pro_placa') {
    adapted = adapted.replace(/BRA9F22/g, cleanParam.toUpperCase())
                     .replace(/RTO9F22/g, cleanParam.toUpperCase());
  } else if (moduleType === 'email' || moduleType === 'pro_email') {
    adapted = adapted.replace(/target\.user@corporativo\.com\.br/g, cleanParam)
                     .replace(/m\.aurelio\.costa@empresa\.com\.br/g, cleanParam);
  } else if (moduleType === 'nome' || moduleType === 'pro_nome') {
    adapted = adapted.replace(/MARCOS AURELIO DA SILVA PEREIRA/g, cleanParam.toUpperCase())
                     .replace(/MARCOS AURÉLIO BEZERRA DA COSTA/g, cleanParam.toUpperCase());
  } else if (moduleType === 'pro_cep') {
    adapted = adapted.replace(/01418-100/g, formattedParam || cleanParam);
  } else if (moduleType === 'pro_endereco') {
    adapted = adapted.replace(/Alameda Santos, 1200, Apto 114/g, cleanParam);
  } else if (moduleType === 'pro_titulo') {
    adapted = adapted.replace(/3418\.9012\.0142/g, cleanParam);
  } else if (moduleType === 'pro_mae') {
    adapted = adapted.replace(/FRANCISCA BEZERRA DA COSTA/g, cleanParam.toUpperCase());
  } else if (moduleType === 'pro_foto') {
    adapted = adapted.replace(/021\.575\.756-42/g, formattedParam || cleanParam);
  }

  // Geração dinâmica inteligente para qualquer módulo KREX (KREX)
  if (String(moduleType).startsWith('zyrex') || String(moduleType).startsWith('krex')) {
    const cleanMod = String(moduleType).replace(/^(zyrex_|krex_)/, '');
    return `⚡ [DOSSIÊ KREX BUSCAS - KREX]
=========================================
MÓDULO: ${cleanMod.toUpperCase()}
COMANDO: /${cleanMod} ${formattedParam || cleanParam}
ALVO CONSULTADO: ${formattedParam || cleanParam}
SITUAÇÃO NA BASE: REGULAR (CONFIRMADO)
ROTA TELEGRAM: KREX
ORIGEM: CLUSTER KREX INTEL B2B

📋 DADOS DE IDENTIFICAÇÃO:
- Parâmetro Pesquisado: ${formattedParam || cleanParam}
- Nome Associado: MARCOS AURÉLIO BEZERRA DA COSTA
- Situação Cadastral: ATIVA / REGULAR
- Data de Nascimento: 14/08/1984 (42 anos)
- Nome da Mãe: MARIA AUXILIADORA MENDONÇA
- Nome do Pai: ANTONIO CARLOS BEZERRA DA COSTA

🏢 VÍNCULOS & SCORE:
- Score Estimado: 865/1000 (Excelente)
- Renda Estimada: R$ 12.800,00 / mês
- Ocupação Presumida: Empresário / Administrador
- Contato Principal: (11) 98452-1920 (WhatsApp Ativo)
- E-mail: m.aurelio.costa@gmail.com
- Endereço Atual: Av. Paulista, 1000 - Bela Vista, São Paulo/SP

PROTOCOLO KREX: #KRX-${Date.now().toString().slice(-6)}`;
  }

  return adapted;
}

/**
 * Retorna uma resposta simulada de "Nada Consta" / Registro não encontrado no Telegram
 */
export function getNadaConstaResponseForQuery(moduleType: QueryModuleType, queryParam: string): string {
  const { command, cleanParam } = getTelegramCommand(moduleType, queryParam);
  return `⚠️ [CENTRAL DE INTELIGÊNCIA - CONSULTA NÃO LOCALIZADA]
=========================================
COMANDO: ${command} ${cleanParam}
ALVO PESQUISADO: ${cleanParam}
STATUS: NADA CONSTA NA BASE DE DADOS
RESULTADO: Nenhum registro ativo ou cadastrado foi localizado para o parâmetro informado nos servidores consultados.
PROTOCOLO: #SB-NC-${Date.now().toString().slice(-6)}`;
}

// Parser to turn raw plain text or structured text into formatted investigation components
export function parseIntelligenceResponse(
  rawText: string,
  moduleType: QueryModuleType,
  queryParam: string
): ParsedIntelligenceReport {
  const sanitizedText = cleanTelegramRawResponse(rawText);
  const { command, cleanParam } = getTelegramCommand(moduleType, queryParam);
  const telegramCommand = `${command} ${cleanParam}`;
  const exactMatch = checkTelegramExactMatch(queryParam, moduleType, sanitizedText, telegramCommand);

  const lines = sanitizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  
  const isNotFound = 
    exactMatch.status === 'not_found' ||
    exactMatch.isNegativeReported === true ||
    /n[ãa]o encontrado|nao encontrado|nada consta|n[ãa]o localizado|nenhum registro|❌/i.test(sanitizedText);

  if (isNotFound) {
    const notFoundSections: ParsedIntelligenceReport['sections'] = [{
      title: 'Resultado Oficial da Base',
      items: [
        { label: 'Status da Pesquisa', value: '❌ NÃO ENCONTRADO', highlight: true, status: 'danger' },
        { label: 'Parâmetro Consultado', value: queryParam, highlight: true },
        { label: 'Comando Telegram', value: telegramCommand },
        { label: 'Retorno da Base', value: '❌ Não encontrado.', status: 'danger' },
        { label: 'Diagnóstico', value: 'O alvo consultado não possui vínculos, registros ativos ou histórico cadastrado nas bases consultadas.' },
      ],
    }];

    return {
      title: `Consulta Concluída - Registro Não Encontrado (${moduleType.toUpperCase()})`,
      target: queryParam,
      module: moduleType.toUpperCase(),
      telegramCommand,
      exactMatch: {
        ...exactMatch,
        hasExactMatch: false,
        status: 'not_found',
        statusLabel: 'Nenhum Registro Encontrado (❌ Não encontrado.)',
        statusBadgeColor: 'red',
        isNegativeReported: true,
      },
      riskLevel: 'Crítico',
      summary: `A central de inteligência respondeu "❌ Não encontrado." Não constam registros cadastrados nos órgãos oficiais para o alvo informado.`,
      sections: notFoundSections,
      alerts: ['A pesquisa retornou "❌ Não encontrado." Não constam dados para o alvo informado.'],
      rawText,
    };
  }

  let title = `Relatório de Inteligência - ${moduleType.toUpperCase()}`;
  let summary = exactMatch.details;
  let riskLevel: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | 'Regular' = 'Regular';
  let score: number | undefined = undefined;
  const alerts: string[] = [];
  const sections: ParsedIntelligenceReport['sections'] = [];

  let currentSectionTitle = 'Informações Principais';
  let currentItems: Array<{ label: string; value: string; highlight?: boolean; status?: 'success' | 'warning' | 'danger' | 'info' }> = [];

  for (const line of lines) {
    if (line.startsWith('===') || line.startsWith('---')) continue;

    // Header matching
    if (line.startsWith('[') && line.endsWith(']')) {
      title = line.replace(/[\[\]]/g, '').trim();
      continue;
    }

    // Section title matching (emoji or ends with colon or uppercase category)
    if (line.endsWith(':') && !line.includes(' - ') && line.length < 50 && (line.includes('📊') || line.includes('💳') || line.includes('📞') || line.includes('📍') || line.includes('🏢') || line.includes('🚗') || line.includes('⚖️') || line.includes('👤') || line.includes('🌐') || line.includes('🚨') || line.includes('📱') || line.includes('💰') || line.includes('📌') || line.includes('👥'))) {
      if (currentItems.length > 0) {
        sections.push({ title: currentSectionTitle, items: [...currentItems] });
        currentItems = [];
      }
      currentSectionTitle = line.replace(':', '').trim();
      continue;
    }

    // Score detection
    if (/score/i.test(line) && /\d+/.test(line)) {
      const match = line.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > 0 && num <= 1000) {
          score = num;
          if (score >= 750) riskLevel = 'Baixo';
          else if (score >= 500) riskLevel = 'Médio';
          else riskLevel = 'Alto';
        }
      }
    }

    // Risk / Status alerts
    if (/ROUBO|FURTO|PROCESSO|IRREGULAR|SUSPENSO|CANCELADO|CRÍTICO/i.test(line) && !/NADA CONSTA|NÃO CONSTA/i.test(line)) {
      riskLevel = 'Alto';
      alerts.push(line);
    } else if (/REGULAR|EM DIA|LIMPO|NADA CONSTA|QUITADO/i.test(line)) {
      if (riskLevel === 'Regular') riskLevel = 'Baixo';
    }

    // Key: Value matching
    const colonIdx = line.indexOf(':');
    if (colonIdx > 1 && colonIdx < 35) {
      const label = line.slice(0, colonIdx).replace(/^[-*•1-9.]+\s*/, '').trim();
      const value = line.slice(colonIdx + 1).trim();

      let status: 'success' | 'warning' | 'danger' | 'info' | undefined = undefined;
      if (/REGULAR|ATIVA|QUITADO|LIMPO|EXCELENTE|VÁLIDO/i.test(value)) status = 'success';
      else if (/ALERTA|MÉDIO|ALIENADO|PORTABILIDADE/i.test(value)) status = 'warning';
      else if (/ROUBO|FURTO|IRREGULAR|SUSPENSO|INAPTA|CRÍTICO/i.test(value)) status = 'danger';

      currentItems.push({
        label,
        value,
        highlight: /CPF|CNPJ|NOME|SITUAÇÃO|SCORE|PLACA|OPERADORA|RAZÃO SOCIAL/i.test(label),
        status,
      });
    } else if (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)) {
      const cleanItem = line.replace(/^[-*•1-9.]+\s*/, '');
      currentItems.push({
        label: 'Registro',
        value: cleanItem,
      });
    }
  }

  if (currentItems.length > 0) {
    sections.push({ title: currentSectionTitle, items: currentItems });
  }

  // Fallback if unstructured
  if (sections.length === 0) {
    sections.push({
      title: 'Resultado da Consulta',
      items: [{ label: 'Retorno', value: rawText }],
    });
  }

  return {
    title,
    target: queryParam,
    module: moduleType.toUpperCase(),
    telegramCommand,
    exactMatch,
    riskLevel,
    score,
    summary,
    sections,
    alerts: alerts.length > 0 ? alerts : undefined,
    rawText,
  };
}
