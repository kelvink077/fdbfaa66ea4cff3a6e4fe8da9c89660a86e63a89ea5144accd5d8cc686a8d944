export const STANDALONE_CODES = {
  serverJs: `// ==========================================
// BACKEND: server.js (Node.js + Express + Socket.io + GramJS MTProto Gateway)
// Roteamento Dual: Base Padrão (-5561626311) e MODO PRO (@Hgliopk00bot)
// ==========================================
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const TELEGRAM_API_ID = Number(process.env.TELEGRAM_API_ID) || 0;
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
const TELEGRAM_STRING_SESSION = process.env.TELEGRAM_STRING_SESSION || '';
const TELEGRAM_CHAT_ID_OLD = process.env.TELEGRAM_CHAT_ID || '-5561626311';
const TELEGRAM_CHAT_ID_PRO = '@Hgliopk00bot';
const TARGET_BOT_PRO_ID_NUM = '7565502829';

app.use(cors());
app.use(express.json());

const activeQueries = new Map();
const queryByTelegramMsgId = new Map();
let userbotClient = null;
let cachedProBotPeer = null;

// Sanitização estrita de comandos: NUNCA envia /procpf ou /protelefone, sempre /cpf ou /telefone
function sanitizeCommand(moduleType, queryParam) {
  const raw = (moduleType || '').toLowerCase();
  const isPro = raw.startsWith('pro');
  const mod = raw.replace(/^pro_?/, '').replace(/[^a-z0-9_]/g, '');
  let cmd = '/cpf1';
  let clean = (queryParam || '').trim();

  if (raw === 'cpf_1' || raw === 'cpf1' || (!isPro && mod === 'cpf1')) { cmd = '/cpf1'; clean = clean.replace(/\\D/g, ''); }
  else if (raw === 'cpf_2' || raw === 'cpf2' || (!isPro && mod === 'cpf2')) { cmd = '/cpf2'; clean = clean.replace(/\\D/g, ''); }
  else if (raw === 'cpf_3' || raw === 'cpf3' || (!isPro && mod === 'cpf3')) { cmd = '/cpf3'; clean = clean.replace(/\\D/g, ''); }
  else if (isPro && mod.includes('cpf')) { cmd = '/cpf'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('cpf')) { cmd = '/cpf1'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('foto')) { cmd = '/foto'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('telefone') || mod.includes('tel')) { cmd = '/telefone'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('nome')) { cmd = '/nome'; clean = clean.replace(/\\s+/g, ' ').trim(); }
  else if (mod.includes('email') || mod.includes('mail')) { cmd = '/email'; clean = clean.toLowerCase().trim(); }
  else if (mod.includes('endereco')) { cmd = '/endereco'; clean = clean.trim(); }
  else if (mod.includes('cep')) { cmd = '/cep'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('cnpj')) { cmd = '/cnpj'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('titulo')) { cmd = '/titulo'; clean = clean.replace(/\\D/g, ''); }
  else if (mod.includes('mae')) { cmd = '/mae'; clean = clean.replace(/\\s+/g, ' ').trim(); }
  else if (mod.includes('placa')) { cmd = '/placa'; clean = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); }
  else { cmd = \`/\${mod || 'cpf'}\`; }

  // Vacina absoluta anti-pro
  cmd = cmd.replace(/^\\/pro[_\\s]*/i, '/');
  if (cmd === '/' || !cmd) cmd = '/cpf';

  const full = clean ? \`\${cmd} \${clean}\`.trim() : cmd;
  return { command: cmd, cleanParam: clean, fullMessage: full };
}

async function resolvePeer(client, targetId) {
  const clean = targetId.trim();
  const isPro = clean === '@Hgliopk00bot' || clean === TARGET_BOT_PRO_ID_NUM || clean.toLowerCase().includes('hgliopk00bot');

  if (isPro) {
    if (cachedProBotPeer) return cachedProBotPeer;
    try {
      const res = await client.invoke(new Api.contacts.ResolveUsername({ username: 'Hgliopk00bot' }));
      if (res?.users?.[0]) {
        const u = res.users[0];
        cachedProBotPeer = new Api.InputPeerUser({ userId: u.id, accessHash: u.accessHash });
        return cachedProBotPeer;
      }
    } catch (err) {
      console.warn('ResolveUsername RPC @Hgliopk00bot:', err.message);
    }
    try {
      const p = await client.getInputEntity(TARGET_BOT_PRO_ID_NUM);
      if (p) { cachedProBotPeer = p; return p; }
    } catch {}
    return '@Hgliopk00bot';
  }

  if (clean.startsWith('@')) {
    try {
      const res = await client.invoke(new Api.contacts.ResolveUsername({ username: clean.replace('@', '') }));
      if (res?.users?.[0]) return res.users[0];
    } catch {}
  }
  return clean;
}

// Inicializa Userbot GramJS
async function startUserbot() {
  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_STRING_SESSION) {
    console.log('[GramJS] Credenciais do Telegram ausentes nas variáveis de ambiente.');
    return;
  }
  const session = new StringSession(TELEGRAM_STRING_SESSION);
  userbotClient = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 5 });
  await userbotClient.connect();
  const me = await userbotClient.getMe();
  console.log(\`[GramJS] Userbot conectado com sucesso como @\${me.username || me.firstName} (ID: \${me.id})\`);

  // Pré-resolve @Hgliopk00bot
  try {
    const proRes = await userbotClient.invoke(new Api.contacts.ResolveUsername({ username: 'Hgliopk00bot' }));
    if (proRes?.users?.[0]) {
      cachedProBotPeer = new Api.InputPeerUser({ userId: proRes.users[0].id, accessHash: proRes.users[0].accessHash });
      console.log('[GramJS] @Hgliopk00bot pré-resolvido:', proRes.users[0].id);
    }
  } catch {}

  // Listener para capturar respostas dos bots
  userbotClient.addEventHandler(async (event) => {
    const msg = event.message;
    if (!msg || msg.out) return;
    const text = (msg.message || msg.text || '').trim();
    if (!text) return;

    const replyToId = msg.replyTo?.replyToMsgId || msg.replyToMsgId;
    let reqId = replyToId ? queryByTelegramMsgId.get(replyToId) : null;

    if (!reqId) {
      for (const [id, q] of activeQueries.entries()) {
        if (q.cleanedTarget && text.includes(q.cleanedTarget)) { reqId = id; break; }
      }
    }

    if (reqId && activeQueries.has(reqId)) {
      const q = activeQueries.get(reqId);
      io.to(q.socketId).emit('query:response', {
        id: reqId,
        moduleType: q.moduleType,
        moduleTitle: q.moduleTitle,
        queryParam: q.queryParam,
        rawResponse: text,
        timestamp: Date.now()
      });
      activeQueries.delete(reqId);
    }
  });
}

startUserbot().catch(console.error);

io.on('connection', (socket) => {
  socket.on('query:request', async (payload) => {
    const { moduleType, queryParam } = payload;
    const isPro = Boolean(payload.isPro || String(moduleType).toLowerCase().startsWith('pro'));
    const requestId = \`REQ-\${Date.now().toString().slice(-4)}-\${Math.random().toString(36).substring(2, 6).toUpperCase()}\`;

    const { command, cleanParam, fullMessage } = sanitizeCommand(moduleType, queryParam);
    const targetChat = isPro ? TELEGRAM_CHAT_ID_PRO : TELEGRAM_CHAT_ID_OLD;

    const record = {
      id: requestId,
      socketId: socket.id,
      moduleType,
      queryParam,
      cleanedTarget: cleanParam,
      telegramCommand: fullMessage,
      isPro,
      timestamp: Date.now()
    };
    activeQueries.set(requestId, record);
    socket.emit('query:ack', { requestId, status: 'pending', telegramCommand: fullMessage, isPro });

    if (userbotClient) {
      try {
        const peer = await resolvePeer(userbotClient, targetChat);
        const sent = await userbotClient.sendMessage(peer, { message: fullMessage });
        queryByTelegramMsgId.set(sent.id, requestId);
        console.log(\`[Despacho] Enviado para \${targetChat} com comando "\${fullMessage}". Msg ID: \${sent.id}\`);
      } catch (err) {
        console.error(\`[Despacho] Falha ao enviar para \${targetChat}:\`, err.message);
      }
    }
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

server.listen(PORT, '0.0.0.0', () => {
  console.log(\`Servidor rodando em http://localhost:\${PORT}\`);
});`,

  indexHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntelSaaS - Sistema de Consultas B2B</title>
  <link rel="stylesheet" href="style.css">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <script src="/socket.io/socket.io.js"></script>
</head>
<body class="dark-theme">
  <!-- Top Navigation Bar -->
  <header class="navbar">
    <div class="brand">
      <div class="logo-badge">🛡️</div>
      <h1>INTEL<span>SAAS</span> <small>B2B Intelligence</small></h1>
    </div>
    <div class="connection-status" id="connectionStatus">
      <span class="status-dot"></span>
      <span id="statusText">Conectando...</span>
    </div>
  </header>

  <div class="main-container">
    <!-- Sidebar com os 8 Módulos Obrigatórios -->
    <aside class="sidebar">
      <div class="sidebar-header">MÓDULOS DE CONSULTA</div>
      <nav class="module-nav">
        <button class="module-btn active" data-module="cpf_1">🔘 CPF 1 (Básica)</button>
        <button class="module-btn" data-module="cpf_2">🔘 CPF 2 (Intermediária)</button>
        <button class="module-btn" data-module="cpf_3">🔘 CPF 3 (Avançada)</button>
        <button class="module-btn" data-module="cnpj">🔘 CNPJ</button>
        <button class="module-btn" data-module="nome">🔘 NOME</button>
        <button class="module-btn" data-module="email">🔘 E-MAIL</button>
        <button class="module-btn" data-module="placa">🔘 PLACA</button>
        <button class="module-btn" data-module="telefone">🔘 TELEFONE</button>
      </nav>
    </aside>

    <!-- Main Content Area -->
    <main class="content-area">
      <!-- Input Search Section -->
      <section class="search-card">
        <h2 id="moduleTitle">CPF 1 (Consulta Básica)</h2>
        <p id="moduleDesc">Validação cadastral na Receita Federal e dados fundamentais.</p>

        <form id="searchForm" class="search-form">
          <div class="input-group">
            <input type="text" id="queryInput" placeholder="000.000.000-00" required autocomplete="off">
            <button type="submit" id="btnSearch" class="btn-search">
              <span>Pesquisar</span>
            </button>
          </div>
        </form>
      </section>

      <!-- Loading State -->
      <div id="loadingState" class="loading-box hidden">
        <div class="spinner"></div>
        <p>Aguardando resposta do operador no Telegram...</p>
        <span class="pulse-text">Requisição despachada via WebSocket</span>
      </div>

      <!-- Results Report Card Section -->
      <section id="resultsSection" class="results-section hidden">
        <div class="report-card">
          <div class="report-header">
            <div>
              <span class="report-badge" id="reportBadge">DOSSIÊ CONCLUÍDO</span>
              <h3 id="reportTarget">Alvo: 000.000.000-00</h3>
            </div>
            <div class="report-meta" id="reportMeta">⚡ Retorno em tempo real</div>
          </div>
          <div class="report-body">
            <pre id="reportContent" class="report-raw"></pre>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="app.js"></script>
</body>
</html>`,

  styleCss: `/* ==========================================
   ESTILO: style.css (Dark Mode Tecnológico / Neon)
   ========================================== */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

body.dark-theme {
  background-color: #030712;
  color: #f3f4f6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #0b0f19;
  border-bottom: 1px solid #1f2937;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand h1 {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.brand h1 span {
  color: #06b6d4;
}

.brand small {
  font-size: 0.65rem;
  color: #9ca3af;
  text-transform: uppercase;
  margin-left: 0.5rem;
  border: 1px solid #0891b2;
  padding: 2px 6px;
  border-radius: 4px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  background: #111827;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #374151;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

/* Layout */
.main-container {
  display: flex;
  flex: 1;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: #080d1a;
  border-right: 1px solid #1f2937;
  padding: 1.5rem 1rem;
}

.sidebar-header {
  font-size: 0.7rem;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  padding-left: 0.5rem;
}

.module-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.module-btn {
  text-align: left;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 1px solid #1e293b;
  color: #94a3b8;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.module-btn:hover {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #06b6d4;
}

.module-btn.active {
  background: linear-gradient(90deg, #083344 0%, #0c4a6e 100%);
  border-color: #06b6d4;
  color: #38bdf8;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
}

/* Content Area */
.content-area {
  flex: 1;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Search Card */
.search-card {
  background: #0b1329;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.search-card h2 {
  font-size: 1.25rem;
  color: #f8fafc;
  margin-bottom: 0.25rem;
}

.search-card p {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 1.5rem;
}

.search-form .input-group {
  display: flex;
  gap: 0.75rem;
}

.search-form input {
  flex: 1;
  padding: 0.9rem 1.2rem;
  background: #030712;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #f8fafc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
}

.search-form input:focus {
  outline: none;
  border-color: #06b6d4;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
}

.btn-search {
  padding: 0 1.75rem;
  background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%);
  border: none;
  border-radius: 10px;
  color: #030712;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-search:hover {
  opacity: 0.9;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
}

/* Loading Box */
.loading-box {
  text-align: center;
  padding: 3rem 2rem;
  background: #080e1e;
  border: 1px dashed #0284c7;
  border-radius: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #1e293b;
  border-top-color: #06b6d4;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pulse-text {
  display: block;
  margin-top: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: #38bdf8;
}

/* Report Card */
.report-card {
  background: #080e22;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.report-badge {
  background: #022c22;
  color: #34d399;
  border: 1px solid #059669;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.report-target {
  font-size: 1.15rem;
  margin-top: 0.25rem;
}

.report-raw {
  background: #030712;
  border: 1px solid #1f2937;
  padding: 1.5rem;
  border-radius: 12px;
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.hidden {
  display: none !important;
}`,

  appJs: `// ==========================================
// LÓGICA CLIENTE: app.js (Vanilla JS + Socket.io Client)
// ==========================================
const socket = io();

// Elementos da Interface
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const moduleButtons = document.querySelectorAll('.module-btn');
const moduleTitle = document.getElementById('moduleTitle');
const moduleDesc = document.getElementById('moduleDesc');
const queryInput = document.getElementById('queryInput');
const searchForm = document.getElementById('searchForm');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const reportTarget = document.getElementById('reportTarget');
const reportMeta = document.getElementById('reportMeta');
const reportContent = document.getElementById('reportContent');

let currentModule = 'cpf_1';

// Módulos e placeholders
const MODULE_CONFIG = {
  cpf_1: { title: 'CPF 1 (Consulta Básica)', desc: 'Validação cadastral na Receita Federal.', placeholder: '000.000.000-00' },
  cpf_2: { title: 'CPF 2 (Consulta Intermediária)', desc: 'Score de crédito, telefones e endereços.', placeholder: '000.000.000-00' },
  cpf_3: { title: 'CPF 3 (Consulta Avançada)', desc: 'Dossiê completo, empresas, processos e bens.', placeholder: '000.000.000-00' },
  cnpj: { title: 'CNPJ (Dados Empresariais & QSA)', desc: 'Quadro societário, faturamento e situação fiscal.', placeholder: '00.000.000/0000-00' },
  nome: { title: 'NOME (Localização)', desc: 'Pesquisa fonética e localização nacional.', placeholder: 'Digite o nome completo...' },
  email: { title: 'E-MAIL (Vínculos & Breaches)', desc: 'Reputação digital, vazamentos e vínculos.', placeholder: 'nome@empresa.com.br' },
  placa: { title: 'PLACA (Histórico Veicular)', desc: 'Detran, gravame, multas e proprietário.', placeholder: 'ABC1D23 ou ABC-1234' },
  telefone: { title: 'TELEFONE (Operadora & Titular)', desc: 'Operadora, portabilidade e titularidade.', placeholder: '(11) 98765-4321' }
};

// 1. Monitoramento da Conexão WebSocket
socket.on('connect', () => {
  statusText.innerText = 'CONECTADO (' + socket.id.slice(0, 6) + ')';
  connectionStatus.querySelector('.status-dot').classList.add('online');
});

socket.on('disconnect', () => {
  statusText.innerText = 'DESCONECTADO';
  connectionStatus.querySelector('.status-dot').classList.remove('online');
});

// 2. Troca de Módulos na Sidebar
moduleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    moduleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentModule = btn.getAttribute('data-module');
    const config = MODULE_CONFIG[currentModule];
    
    moduleTitle.innerText = config.title;
    moduleDesc.innerText = config.desc;
    queryInput.placeholder = config.placeholder;
    queryInput.value = '';
    queryInput.focus();
  });
});

// 3. Envio da Consulta via WebSocket
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const queryParam = queryInput.value.trim();
  if (!queryParam) return;

  // Mostra Loading
  loadingState.classList.remove('hidden');
  resultsSection.classList.add('hidden');

  // Emite evento para o Backend
  socket.emit('query:request', {
    moduleType: currentModule,
    queryParam: queryParam
  });
});

// 4. Recebimento da Confirmação (ACK)
socket.on('query:ack', (data) => {
  console.log('[ACK Recebido]', data);
});

// 5. Recebimento da Resposta em Tempo Real
socket.on('query:response', (data) => {
  console.log('[Dossiê Recebido]', data);

  // Esconde Loading e Renderiza Card
  loadingState.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  reportTarget.innerText = 'Alvo: ' + data.queryParam + ' (' + data.moduleTitle + ')';
  reportMeta.innerText = '⚡ Retorno em ' + (data.durationMs / 1000).toFixed(2) + 's | ID: #' + data.id;
  reportContent.innerText = data.rawResponse;

  // Rola até o resultado suavemente
  resultsSection.scrollIntoView({ behavior: 'smooth' });
});`
};
