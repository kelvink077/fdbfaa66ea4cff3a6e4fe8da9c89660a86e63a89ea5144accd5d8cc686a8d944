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
- WhatsApp: CONECTADO (Foto de perfil e Bio pública ativas)`
};

/**
 * Retorna o template de exemplo adaptado dinamicamente com o alvo pesquisado em tempo de execução
 */
export function getSampleResponseForQuery(moduleType: QueryModuleType, queryParam: string): string {
  const base = SAMPLE_RESPONSES[moduleType] || `Dossiê cadastral gerado com sucesso para ${queryParam}`;
  const { cleanParam, formattedParam } = getTelegramCommand(moduleType, queryParam);

  let adapted = base;
  if (moduleType === 'cpf_1') {
    adapted = adapted.replace(/341\.892\.518-20/g, formattedParam || cleanParam);
  } else if (moduleType === 'cpf_2') {
    adapted = adapted.replace(/528\.190\.432-88/g, formattedParam || cleanParam);
  } else if (moduleType === 'cpf_3') {
    adapted = adapted.replace(/912\.445\.871-04/g, formattedParam || cleanParam);
  } else if (moduleType === 'cnpj') {
    adapted = adapted.replace(/18\.236\.120\/0001-58/g, formattedParam || cleanParam);
  } else if (moduleType === 'telefone') {
    adapted = adapted.replace(/\(11\) 98452-1920/g, formattedParam || cleanParam);
  } else if (moduleType === 'placa') {
    adapted = adapted.replace(/BRA9F22/g, cleanParam.toUpperCase());
  } else if (moduleType === 'email') {
    adapted = adapted.replace(/target\.user@corporativo\.com\.br/g, cleanParam);
  } else if (moduleType === 'nome') {
    adapted = adapted.replace(/MARCOS AURELIO DA SILVA PEREIRA/g, cleanParam.toUpperCase());
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
  
  let title = `Relatório de Inteligência - ${moduleType.toUpperCase()}`;
  let summary = exactMatch.details;
  let riskLevel: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | 'Regular' = 
    exactMatch.status === 'not_found' ? 'Crítico' : 'Regular';
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
