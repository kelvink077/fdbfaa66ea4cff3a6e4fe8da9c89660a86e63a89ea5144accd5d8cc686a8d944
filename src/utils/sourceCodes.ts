export const STANDALONE_CODES = {
  serverJs: `// ==========================================
// BACKEND: server.js (Node.js + Express + Socket.io + Shazam Buscas Gateway)
// ==========================================
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mapa para associar Requisições com Socket IDs
const activeRequests = new Map();
const msgToRequestMap = new Map(); // key: telegramMessageId, value: requestId

// Nomes amigáveis dos módulos
const MODULES = {
  cpf_1: 'CPF 1 (Consulta Básica)',
  cpf_2: 'CPF 2 (Consulta Intermediária)',
  cpf_3: 'CPF 3 (Consulta Avançada)',
  cnpj: 'CNPJ',
  nome: 'NOME',
  email: 'E-MAIL',
  placa: 'PLACA',
  telefone: 'TELEFONE'
};

// Conexões WebSocket
io.on('connection', (socket) => {
  console.log(\`[Socket] Cliente conectado: \${socket.id}\`);

  // 1. Cliente envia requisição de consulta
  socket.on('query:request', async (payload) => {
    const { moduleType, queryParam } = payload;
    const requestId = \`REQ-\${Date.now().toString().slice(-5)}-\${moduleType.toUpperCase()}\`;

    const requestData = {
      id: requestId,
      socketId: socket.id,
      moduleType,
      moduleTitle: MODULES[moduleType] || moduleType,
      queryParam,
      timestamp: Date.now()
    };

    activeRequests.set(requestId, requestData);

    // Confirma recebimento para o Frontend
    socket.emit('query:ack', { requestId, message: 'Enviando para central Telegram...' });

    // 2. Enviar dados para o grupo do Telegram
    if (bot && TELEGRAM_CHAT_ID) {
      try {
        const text = \`🔍 <b>[INTEL-SAAS] NOVA CONSULTA #\${requestId}</b>\\n\\n\` +
          \`📋 <b>Módulo:</b> \${requestData.moduleTitle}\\n\` +
          \`🎯 <b>Alvo:</b> <code>\${queryParam}</code>\\n\` +
          \`🆔 <b>Socket:</b> <code>\${socket.id}</code>\\n\\n\` +
          \`👉 <i>Responda (Reply) a esta mensagem com os dados apurados.</i>\`;

        const sent = await bot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: 'HTML' });
        requestData.telegramMsgId = sent.message_id;
        msgToRequestMap.set(sent.message_id, requestId);
        console.log(\`[Telegram] Mensagem enviada para o chat. ID: \${sent.message_id}\`);
      } catch (err) {
        console.error('[Telegram] Erro ao enviar mensagem:', err.message);
      }
    } else {
      console.log(\`[Simulação] Consulta \${requestId} aguardando resposta no webhook.\`);
    }
  });

  socket.on('disconnect', () => {
    console.log(\`[Socket] Cliente desconectado: \${socket.id}\`);
  });
});

// 3. Webhook POST: Recebe respostas do Telegram
app.post('/api/telegram/webhook', (req, res) => {
  const update = req.body;
  const message = update.message || update.edited_message;

  if (!message) {
    return res.status(200).json({ ok: true, note: 'Sem mensagem' });
  }

  const replyTo = message.reply_to_message;
  const responseText = message.text || message.caption || '';
  let targetRequestId = null;

  // Localiza o Request ID pela mensagem respondida
  if (replyTo && replyTo.message_id) {
    targetRequestId = msgToRequestMap.get(replyTo.message_id);
  }

  if (!targetRequestId && replyTo && replyTo.text) {
    const match = replyTo.text.match(/#(REQ-[A-Z0-9-]+)/i);
    if (match) targetRequestId = match[1];
  }

  if (!targetRequestId && responseText) {
    const match = responseText.match(/#(REQ-[A-Z0-9-]+)/i);
    if (match) targetRequestId = match[1];
  }

  if (targetRequestId && activeRequests.has(targetRequestId)) {
    const record = activeRequests.get(targetRequestId);
    const durationMs = Date.now() - record.timestamp;

    // 4. Devolve em tempo real para o cliente correto via Socket ID
    io.to(record.socketId).emit('query:response', {
      id: record.id,
      moduleType: record.moduleType,
      moduleTitle: record.moduleTitle,
      queryParam: record.queryParam,
      rawResponse: responseText,
      durationMs,
      timestamp: Date.now()
    });

    console.log(\`[Webhook] Resposta emitida para socket \${record.socketId} em \${durationMs}ms\`);
    activeRequests.delete(targetRequestId);
    return res.status(200).json({ ok: true, requestId: targetRequestId });
  }

  res.status(200).json({ ok: true, note: 'Mensagem recebida' });
});

server.listen(PORT, () => {
  console.log(\`Servidor rodando na porta \${PORT}\`);
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
  nome: { title: 'NOME (Localização & Homônimos)', desc: 'Pesquisa fonética e localização nacional.', placeholder: 'Digite o nome completo...' },
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
