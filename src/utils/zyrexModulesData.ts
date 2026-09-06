export interface KrexModuleInfo {
  id: string;
  title: string;
  command: string;
  placeholder: string;
  inputLabel: string;
  inputHelper: string;
  defaultSample: string;
  category?: string;
  iconName: string;
}

export type ZyrexModuleInfo = KrexModuleInfo;

// 22 módulos organizados exatamente nas 2 colunas da imagem do usuário
export const KREX_MODULES_COL1: KrexModuleInfo[] = [
  {
    id: 'zyrex_cpf',
    title: 'CPF',
    command: '/cpf',
    placeholder: '12345678901',
    inputLabel: 'CPF do Alvo',
    inputHelper: 'Informe o CPF (11 dígitos numéricos)',
    defaultSample: '02157575642',
    iconName: 'UserCheck',
  },
  {
    id: 'zyrex_telefone',
    title: 'Telefone',
    command: '/telefone',
    placeholder: '11987654321',
    inputLabel: 'Número com DDD',
    inputHelper: 'Informe DDD + número de telefone',
    defaultSample: '11984521920',
    iconName: 'Phone',
  },
  {
    id: 'zyrex_pai',
    title: 'Pai',
    command: '/pai',
    placeholder: 'Nome Completo do Pai',
    inputLabel: 'Nome do Pai',
    inputHelper: 'Busca por filiação paterna',
    defaultSample: 'Jose Ferreira da Silva',
    iconName: 'User',
  },
  {
    id: 'zyrex_cin_nis',
    title: 'RG | CIN | NIS',
    command: '/cin',
    placeholder: 'Documento RG, CIN ou NIS',
    inputLabel: 'Documento (RG / CIN / NIS)',
    inputHelper: 'Consulta cruzada de novos documentos de identificação',
    defaultSample: '123456789',
    iconName: 'Shield',
  },
  {
    id: 'zyrex_placa',
    title: 'Placa',
    command: '/placa',
    placeholder: 'ABC1D23',
    inputLabel: 'Placa do Veículo',
    inputHelper: 'Placa padrão Mercosul ou convencional',
    defaultSample: 'RTO9F22',
    iconName: 'Car',
  },
  {
    id: 'zyrex_poder_aquis',
    title: 'Poder Aquis.',
    command: '/poderaquis',
    placeholder: '12345678901',
    inputLabel: 'CPF para Poder Aquisitivo',
    inputHelper: 'Análise de capacidade financeira e patrimonial estimada',
    defaultSample: '02157575642',
    iconName: 'TrendingUp',
  },
  {
    id: 'zyrex_endereco',
    title: 'Endereço',
    command: '/endereco',
    placeholder: 'Av Paulista, 1000, Sao Paulo SP',
    inputLabel: 'Logradouro / Endereço Completo',
    inputHelper: 'Pesquisa cadastral por logradouro ou CEP',
    defaultSample: 'Av Paulista, 1000',
    iconName: 'MapPin',
  },
  {
    id: 'zyrex_pix',
    title: 'Pix',
    command: '/pix',
    placeholder: 'Chave Pix (Telefone, CPF, Email ou EVP)',
    inputLabel: 'Chave Pix do Alvo',
    inputHelper: 'Localização de titular através da chave DICT Pix',
    defaultSample: '11984521920',
    iconName: 'Zap',
  },
  {
    id: 'zyrex_pis',
    title: 'PIS',
    command: '/pis',
    placeholder: '12345678901',
    inputLabel: 'Número do PIS/PASEP',
    inputHelper: 'Consulta de vínculo empregatício e NIT/PIS',
    defaultSample: '12345678901',
    iconName: 'Briefcase',
  },
  {
    id: 'zyrex_cnpj',
    title: 'CNPJ',
    command: '/cnpj',
    placeholder: '12345678000199',
    inputLabel: 'CNPJ da Empresa',
    inputHelper: '14 dígitos numéricos do CNPJ',
    defaultSample: '18236120000158',
    iconName: 'Building',
  },
  {
    id: 'zyrex_ip',
    title: 'IP',
    command: '/ip',
    placeholder: '189.40.12.34',
    inputLabel: 'Endereço IP (IPv4 ou IPv6)',
    inputHelper: 'Geolocalização, ASN, Provedor e Whois de IP',
    defaultSample: '189.40.12.34',
    iconName: 'Globe',
  },
];

export const ZYREX_MODULES_COL1 = KREX_MODULES_COL1;

export const KREX_MODULES_COL2: KrexModuleInfo[] = [
  {
    id: 'zyrex_nome',
    title: 'Nome',
    command: '/nome',
    placeholder: 'Carlos Eduardo da Silva',
    inputLabel: 'Nome Completo',
    inputHelper: 'Varredura fonética nacional por nome',
    defaultSample: 'Carlos Eduardo da Silva',
    iconName: 'Users',
  },
  {
    id: 'zyrex_mae',
    title: 'Mãe',
    command: '/mae',
    placeholder: 'Maria de Souza Silva',
    inputLabel: 'Nome da Mãe',
    inputHelper: 'Vínculos maternos e filiação cruzada',
    defaultSample: 'Maria de Souza Silva',
    iconName: 'Heart',
  },
  {
    id: 'zyrex_rg',
    title: 'RG',
    command: '/rg',
    placeholder: '123456789',
    inputLabel: 'Número do RG',
    inputHelper: 'Registro Geral estadual com dígito',
    defaultSample: '123456789',
    iconName: 'FileText',
  },
  {
    id: 'zyrex_email',
    title: 'Email',
    command: '/email',
    placeholder: 'usuario@email.com',
    inputLabel: 'Endereço de E-mail',
    inputHelper: 'Vínculos cadastrais associados ao e-mail',
    defaultSample: 'carlos.silva@gmail.com',
    iconName: 'Mail',
  },
  {
    id: 'zyrex_renda',
    title: 'Renda',
    command: '/renda',
    placeholder: '12345678901',
    inputLabel: 'CPF para Análise de Renda',
    inputHelper: 'Faixa salarial presumida e capacidade financeira',
    defaultSample: '02157575642',
    iconName: 'DollarSign',
  },
  {
    id: 'zyrex_score',
    title: 'Score',
    command: '/score',
    placeholder: '12345678901',
    inputLabel: 'CPF para Score de Crédito',
    inputHelper: 'Pontuação Serasa/Boa Vista e propensão de crédito',
    defaultSample: '02157575642',
    iconName: 'Activity',
  },
  {
    id: 'zyrex_parentes',
    title: 'Parentes',
    command: '/parentes',
    placeholder: '12345678901 ou Nome',
    inputLabel: 'CPF ou Nome para Parentesco',
    inputHelper: 'Árvore genealógica de 1º e 2º grau',
    defaultSample: '02157575642',
    iconName: 'Users2',
  },
  {
    id: 'zyrex_nome_nasc',
    title: 'Nome+Nasc',
    command: '/nomenasc',
    placeholder: 'Carlos Silva 15/04/1985',
    inputLabel: 'Nome e Data de Nascimento',
    inputHelper: 'Filtro de homônimos por data de nascimento (DD/MM/AAAA)',
    defaultSample: 'Carlos Silva 15/04/1985',
    iconName: 'Calendar',
  },
  {
    id: 'zyrex_nome_uf',
    title: 'Nome+UF',
    command: '/nomeuf',
    placeholder: 'Carlos Silva SP',
    inputLabel: 'Nome e Sigla do Estado',
    inputHelper: 'Filtro geográfico estadual (ex: Nome SP / Nome RJ)',
    defaultSample: 'Carlos Silva SP',
    iconName: 'Compass',
  },
  {
    id: 'zyrex_cep',
    title: 'CEP',
    command: '/cep',
    placeholder: '01310923',
    inputLabel: 'CEP (8 dígitos)',
    inputHelper: 'Consulta de logradouro, bairro e moradores do CEP',
    defaultSample: '01310923',
    iconName: 'Navigation',
  },
  {
    id: 'zyrex_cnh',
    title: 'CNH',
    command: '/cnh',
    placeholder: '12345678901',
    inputLabel: 'Número do Registro da CNH',
    inputHelper: 'Categoria, validade, prontuário e espelho de CNH',
    defaultSample: '04981294821',
    iconName: 'Award',
  },
];

export const ZYREX_MODULES_COL2 = KREX_MODULES_COL2;

export const ALL_KREX_MODULES: KrexModuleInfo[] = [
  ...KREX_MODULES_COL1,
  ...KREX_MODULES_COL2,
];

export const ALL_ZYREX_MODULES: KrexModuleInfo[] = ALL_KREX_MODULES;
