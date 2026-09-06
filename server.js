// server.ts
import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { TelegramClient, sessions, Api } from "telegram";
import { NewMessage } from "telegram/events/index.js";

// src/utils/telegramCommandHelper.ts
function getTelegramCommand(moduleType, queryParam) {
  const rawMod = (moduleType || "").toLowerCase().trim();
  const mod = rawMod.replace(/^pro_?/, "").replace(/[^a-z0-9_]/g, "");
  let command = "/cpf";
  let cleanParam = (queryParam || "").trim();
  let formattedParam = cleanParam;
  if (mod.includes("cpf")) {
    command = "/cpf";
    cleanParam = cleanParam.replace(/\D/g, "");
    formattedParam = cleanParam;
  } else if (mod.includes("foto")) {
    command = "/foto";
    cleanParam = cleanParam.replace(/\D/g, "");
    formattedParam = cleanParam;
  } else if (mod.includes("telefone") || mod.includes("tel")) {
    command = "/telefone";
    cleanParam = cleanParam.replace(/\D/g, "");
    formattedParam = cleanParam;
  } else if (mod.includes("nome")) {
    command = "/nome";
    cleanParam = cleanParam.replace(/\s+/g, " ").trim();
    formattedParam = cleanParam;
  } else if (mod.includes("email") || mod.includes("mail")) {
    command = "/email";
    cleanParam = cleanParam.toLowerCase().trim();
    formattedParam = cleanParam;
  } else if (mod.includes("endereco")) {
    command = "/endereco";
    const trimmed = cleanParam.trim();
    if (/^\d{5}-?\d{3}$/.test(trimmed)) {
      cleanParam = trimmed.replace(/\D/g, "");
    } else {
      cleanParam = trimmed;
    }
    formattedParam = cleanParam;
  } else if (mod.includes("cep")) {
    command = "/cep";
    cleanParam = cleanParam.replace(/\D/g, "");
    formattedParam = cleanParam;
  } else if (mod.includes("cnpj")) {
    command = "/cnpj";
    cleanParam = cleanParam.replace(/\D/g, "");
    formattedParam = cleanParam;
  } else if (mod.includes("titulo")) {
    command = "/titulo";
    cleanParam = cleanParam.replace(/\D/g, "");
    formattedParam = cleanParam;
  } else if (mod.includes("mae")) {
    command = "/mae";
    cleanParam = cleanParam.replace(/\s+/g, " ").trim();
    formattedParam = cleanParam;
  } else if (mod.includes("placa")) {
    command = "/placa";
    cleanParam = cleanParam.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    formattedParam = cleanParam;
  } else {
    const base = mod.replace(/^pro_?/, "");
    command = `/${base || "cpf"}`;
    cleanParam = cleanParam.trim();
    formattedParam = cleanParam;
  }
  command = command.replace(/^\/pro[_\s]*/i, "/");
  if (command === "/" || !command) {
    command = "/cpf";
  }
  const fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;
  return {
    command,
    cleanParam,
    formattedParam,
    fullMessage
  };
}
function formatPlaca(str) {
  const clean = str.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}
var NEGATIVE_PATTERNS = [
  /nenhum registro encontrado/i,
  /nada consta/i,
  /n[ãa]o (foi )?localizado/i,
  /n[ãa]o encontrado/i,
  /cpf n[ãa]o cadastrado/i,
  /documento n[ãa]o encontrado/i,
  /sem dados dispon[íi]veis/i,
  /inexistente/i,
  /sem ocorr[êe]ncias/i,
  /registro n[ãa]o localizado/i,
  /sem resultados/i,
  /nenhum dado retornado/i,
  /placa n[ãa]o encontrada/i,
  /cnpj n[ãa]o localizado/i
];
function isNegativeResponse(text) {
  if (!text) return false;
  return NEGATIVE_PATTERNS.some((regex) => regex.test(text));
}
function checkTelegramExactMatch(queryParam, moduleType, telegramText, customCommand) {
  const { command, cleanParam, formattedParam } = getTelegramCommand(moduleType, queryParam);
  const telegramCommand = customCommand || `${command} ${cleanParam}`;
  const rawText = telegramText || "";
  const isNeg = isNegativeResponse(rawText);
  let matchedTextFound = void 0;
  if (cleanParam && cleanParam.length >= 7 && /^\d+$/.test(cleanParam)) {
    if (rawText.includes(cleanParam)) {
      matchedTextFound = cleanParam;
    }
  }
  if (!matchedTextFound && formattedParam && formattedParam !== cleanParam) {
    if (rawText.includes(formattedParam)) {
      matchedTextFound = formattedParam;
    }
  }
  if (!matchedTextFound && queryParam.trim()) {
    const rawTarget = queryParam.trim();
    if (rawText.toLowerCase().includes(rawTarget.toLowerCase())) {
      matchedTextFound = rawTarget;
    }
  }
  if (!matchedTextFound && moduleType.toLowerCase().includes("placa")) {
    const upperClean = cleanParam.toUpperCase();
    const upperHyphen = formatPlaca(upperClean);
    if (rawText.toUpperCase().includes(upperClean)) {
      matchedTextFound = upperClean;
    } else if (rawText.toUpperCase().includes(upperHyphen)) {
      matchedTextFound = upperHyphen;
    }
  }
  if (isNeg) {
    return {
      hasExactMatch: false,
      status: "not_found",
      targetSearched: queryParam,
      cleanedTarget: cleanParam,
      formattedTarget: formattedParam,
      telegramCommand,
      statusLabel: "Nenhum Registro Encontrado (Nada Consta)",
      statusBadgeColor: "red",
      details: `A central de intelig\xEAncia Shazam Buscas respondeu \xE0 busca indicando que N\xC3O CONSTAM dados ou registros cadastrados para o alvo "${cleanParam}".`,
      matchedTextFound,
      isNegativeReported: true
    };
  }
  if (matchedTextFound) {
    return {
      hasExactMatch: true,
      status: "exact_match_found",
      targetSearched: queryParam,
      cleanedTarget: cleanParam,
      formattedTarget: formattedParam,
      telegramCommand,
      statusLabel: "Resposta Exata Confirmada",
      statusBadgeColor: "green",
      details: `Resposta exata validada na central Shazam Buscas: os dados apurados correspondem formalmente ao alvo "${matchedTextFound}".`,
      matchedTextFound,
      isNegativeReported: false
    };
  }
  if (/NOME:|SITUAÇÃO:|DATA DE NASCIMENTO:|RAZÃO SOCIAL:|PROPRIETÁRIO:|OPERADORA:/i.test(rawText)) {
    return {
      hasExactMatch: true,
      status: "exact_match_found",
      targetSearched: queryParam,
      cleanedTarget: cleanParam,
      formattedTarget: formattedParam,
      telegramCommand,
      statusLabel: "Resposta Confirmada via Central",
      statusBadgeColor: "green",
      details: `Dossi\xEA cadastral recebido diretamente da central Shazam Buscas referente ao comando disparado (${telegramCommand}).`,
      matchedTextFound: cleanParam,
      isNegativeReported: false
    };
  }
  return {
    hasExactMatch: false,
    status: "partial_or_unconfirmed",
    targetSearched: queryParam,
    cleanedTarget: cleanParam,
    formattedTarget: formattedParam,
    telegramCommand,
    statusLabel: "Resposta sem Confer\xEAncia Exata",
    statusBadgeColor: "amber",
    details: `Dossi\xEA recebido da central Shazam Buscas, por\xE9m sem confirma\xE7\xE3o expl\xEDcita do identificador pesquisado (${cleanParam}).`,
    isNegativeReported: false
  };
}

// src/utils/cleanTelegramResponse.ts
function cleanTelegramRawResponse(text) {
  if (!text) return "";
  let cleaned = String(text);
  cleaned = cleaned.replace(/^[•\-\*]?\s*USU[AÁ]RIO:\s*gencia_web\s*$/gim, "");
  cleaned = cleaned.replace(/[•\-\*]?\s*USU[AÁ]RIO:\s*gencia_web/gim, "");
  cleaned = cleaned.replace(/^[🔛\s\-\*]*BY:\s*@?SkynetBlackRobot\s*$/gim, "");
  cleaned = cleaned.replace(/[🔛\s\-\*]*BY:\s*@?SkynetBlackRobot/gim, "");
  cleaned = cleaned.replace(/@SkynetBlackRobot/gim, "");
  cleaned = cleaned.replace(/@[a-zA-Z0-9_]+(?:bot|robot)/gim, "");
  cleaned = cleaned.replace(/telegram/gi, "central");
  cleaned = cleaned.replace(/\r\n/g, "\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

// server.ts
var { StringSession } = sessions;
dotenv.config();
var PORT = process.env.APPLET_ID ? 3e3 : process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var app = express();
var server = http.createServer(app);
var TELEGRAM_API_ID = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 0;
var TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || "";
var TELEGRAM_STRING_SESSION = process.env.TELEGRAM_STRING_SESSION || "";
var TELEGRAM_PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER || "";
var TELEGRAM_CHAT_ID_OLD = process.env.TELEGRAM_CHAT_ID || "";
var TELEGRAM_CHAT_ID_PRO = "@Hgliopk00bot";
var TARGET_BOT_PRO_ID_NUM = "7565502829";
var FRONTEND_URL = process.env.FRONTEND_URL || "";
var ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || "";
var configuredAllowedOrigins = [FRONTEND_URL, ...ALLOWED_ORIGINS_ENV.split(",")].map((url) => url.trim().replace(/\/$/, "")).filter(Boolean);
function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (configuredAllowedOrigins.includes(normalizedOrigin)) return true;
  if (/^https:\/\/[a-zA-Z0-9-_.]+\.netlify\.app$/.test(normalizedOrigin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return true;
  if (normalizedOrigin.endsWith(".run.app")) return true;
  return false;
}
var corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error(`Bloqueado pelo CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with", "Accept"]
};
app.use(cors(corsOptions));
app.use(express.json());
var io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error("Origem n\xE3o autorizada via CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});
var activeQueries = /* @__PURE__ */ new Map();
var queryByTelegramMsgId = /* @__PURE__ */ new Map();
var queryHistory = [];
var userbotClient = null;
var userbotProfile = null;
var userbotStatus = "disconnected";
var isEventHandlerRegistered = false;
var cachedProBotPeer = null;
var pendingAuthClient = null;
var pendingAuthPhoneCodeHash = null;
var pendingAuthPhoneNumber = null;
var MODULE_NAMES = {
  cpf_1: "CPF 1 (Consulta B\xE1sica)",
  cpf_2: "CPF 2 (Consulta Intermedi\xE1ria)",
  cpf_3: "CPF 3 (Consulta Avan\xE7ada)",
  cnpj: "CNPJ (Dados Cadastrais & QSA)",
  nome: "NOME (Localiza\xE7\xE3o & Hom\xF4nimos)",
  email: "E-MAIL (V\xEDnculos & Vazamentos)",
  placa: "PLACA (Hist\xF3rico Veicular & Detran)",
  telefone: "TELEFONE (Operadora & Titularidade)",
  pro_cpf: "BUSCAS PRO - CPF Completo & Score",
  pro_telefone: "BUSCAS PRO - Telefone & Titularidade",
  pro_nome: "BUSCAS PRO - Nome & Hom\xF4nimos",
  pro_email: "BUSCAS PRO - E-mail & Vazamentos",
  pro_endereco: "BUSCAS PRO - Endere\xE7o & Moradores",
  pro_cep: "BUSCAS PRO - CEP & Logradouro",
  pro_cnpj: "BUSCAS PRO - CNPJ & Quadro Societ\xE1rio",
  pro_titulo: "BUSCAS PRO - T\xEDtulo de Eleitor",
  pro_mae: "BUSCAS PRO - Nome da M\xE3e & V\xEDnculos",
  pro_foto: "BUSCAS PRO - Foto & Biometria",
  pro_placa: "BUSCAS PRO - Placa Veicular Detran"
};
function formatTelegramCommandMessage(record) {
  let { command, cleanParam, fullMessage } = getTelegramCommand(record.moduleType, record.queryParam);
  command = command.replace(/^\/pro[_\s]*/i, "/");
  if (command === "/" || !command) {
    command = "/cpf";
  }
  fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;
  return fullMessage;
}
async function resolveTelegramPeer(client, targetId) {
  const clean = targetId.trim();
  const isProTarget = clean === "@Hgliopk00bot" || clean === "Hgliopk00bot" || clean === TARGET_BOT_PRO_ID_NUM || clean.toLowerCase().includes("hgliopk00bot");
  if (isProTarget) {
    if (cachedProBotPeer) {
      return cachedProBotPeer;
    }
    try {
      const res = await client.invoke(new Api.contacts.ResolveUsername({ username: "Hgliopk00bot" }));
      if (res && res.users && res.users.length > 0) {
        const u = res.users[0];
        console.log(`[GramJS] @Hgliopk00bot resolvido via RPC nos servidores do Telegram. User ID: ${u.id}`);
        cachedProBotPeer = new Api.InputPeerUser({
          userId: u.id,
          accessHash: u.accessHash
        });
        return cachedProBotPeer;
      }
    } catch (rpcErr) {
      console.warn("[GramJS] ResolveUsername RPC @Hgliopk00bot:", rpcErr?.message);
    }
    try {
      const entity = await client.getEntity("@Hgliopk00bot");
      if (entity) {
        cachedProBotPeer = entity;
        return entity;
      }
    } catch {
    }
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        const entity = d.entity;
        if (entity && (String(entity.id) === TARGET_BOT_PRO_ID_NUM || entity.username?.toLowerCase() === "hgliopk00bot")) {
          cachedProBotPeer = d.inputEntity || entity;
          return cachedProBotPeer;
        }
      }
    } catch {
    }
    try {
      const inPeer = await client.getInputEntity(TARGET_BOT_PRO_ID_NUM);
      if (inPeer) {
        cachedProBotPeer = inPeer;
        return inPeer;
      }
    } catch {
    }
    return "@Hgliopk00bot";
  }
  if (clean.startsWith("@")) {
    try {
      const uName = clean.replace("@", "");
      const res = await client.invoke(new Api.contacts.ResolveUsername({ username: uName }));
      if (res && res.users && res.users.length > 0) return res.users[0];
      if (res && res.peer) return res.peer;
    } catch {
    }
    try {
      return await client.getEntity(clean);
    } catch {
    }
  }
  if (/^-?\d+$/.test(clean)) {
    try {
      return await client.getInputEntity(clean);
    } catch {
    }
    try {
      return await client.getEntity(Number(clean));
    } catch {
    }
    try {
      return await client.getEntity(clean);
    } catch {
    }
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        const entity = d.entity;
        if (entity && (String(entity.id) === clean || String(entity.userId) === clean)) {
          return d.inputEntity || entity;
        }
      }
    } catch {
    }
  }
  try {
    return await client.getEntity(clean);
  } catch {
  }
  return clean;
}
async function handleUserbotIncomingMessage(event) {
  try {
    const message = event.message;
    if (!message || message.out) return;
    const incomingText = (message.message || message.text || "").trim();
    if (!incomingText) return;
    const replyToMsgId = message.replyTo?.replyToMsgId || message.replyToMsgId;
    const messageId = message.id;
    const senderId = message.senderId ? String(message.senderId) : message.fromId?.userId ? String(message.fromId.userId) : "";
    const chatId = message.chatId ? String(message.chatId) : "";
    const peerUserId = message.peerId?.userId ? String(message.peerId.userId) : "";
    const oldBotCleanId = TELEGRAM_CHAT_ID_OLD.replace("@", "");
    const isFromOldBot = oldBotCleanId && (senderId.includes(oldBotCleanId) || chatId.includes(oldBotCleanId) || peerUserId.includes(oldBotCleanId));
    const isFromProBot = [TARGET_BOT_PRO_ID_NUM, "hgliopk00bot"].some(
      (id) => senderId.includes(id) || chatId.includes(id) || peerUserId.includes(id)
    );
    if (!isFromOldBot && !isFromProBot) {
      return;
    }
    let targetRequestId = null;
    if (replyToMsgId && queryByTelegramMsgId.has(replyToMsgId)) {
      targetRequestId = queryByTelegramMsgId.get(replyToMsgId);
    }
    if (!targetRequestId && replyToMsgId) {
      for (const [reqId, q] of activeQueries.entries()) {
        if (q.telegramMessageId === replyToMsgId) {
          targetRequestId = reqId;
          break;
        }
      }
    }
    if (!targetRequestId && incomingText) {
      for (const [reqId, q] of activeQueries.entries()) {
        const clean = q.cleanedTarget || q.queryParam.replace(/\D/g, "");
        if (clean && clean.length >= 5 && incomingText.includes(clean)) {
          targetRequestId = reqId;
          break;
        }
        if (q.telegramCommand && incomingText.includes(q.telegramCommand)) {
          targetRequestId = reqId;
          break;
        }
      }
    }
    if (!targetRequestId) {
      for (const [reqId, q] of activeQueries.entries()) {
        const isProQuery = q.moduleType.startsWith("pro");
        if (isProQuery && isFromProBot) {
          targetRequestId = reqId;
          break;
        }
        if (!isProQuery && isFromOldBot) {
          targetRequestId = reqId;
          break;
        }
      }
    }
    if (targetRequestId && activeQueries.has(targetRequestId)) {
      const q = activeQueries.get(targetRequestId);
      console.log(`[GramJS] Resposta recebida para ${targetRequestId} (${q?.moduleType}) | Veio do bot PRO? ${isFromProBot}`);
      handleIncomingTelegramResponse(targetRequestId, incomingText, {
        messageId,
        simulated: false,
        isPro: q?.moduleType.startsWith("pro"),
        fromProBot: isFromProBot
      });
    }
  } catch (err) {
    console.warn("[GramJS] Erro ao processar mensagem recebida:", err?.message || err);
  }
}
function attachUserbotListener(client) {
  if (isEventHandlerRegistered) return;
  try {
    client.addEventHandler(handleUserbotIncomingMessage, new NewMessage({ incoming: true }));
    isEventHandlerRegistered = true;
  } catch (err) {
  }
}
async function initUserbot() {
  if (userbotClient) {
    try {
      await userbotClient.disconnect();
    } catch {
    }
    userbotClient = null;
  }
  isEventHandlerRegistered = false;
  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_STRING_SESSION) {
    userbotStatus = "disconnected";
    return;
  }
  try {
    userbotStatus = "connecting";
    const session = new StringSession(TELEGRAM_STRING_SESSION);
    const client = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 3 });
    try {
      client.setLogLevel("none");
    } catch {
    }
    await client.connect();
    if (await client.checkAuthorization()) {
      userbotClient = client;
      const me = await client.getMe();
      userbotProfile = { id: String(me.id), firstName: me.firstName, username: me.username };
      userbotStatus = "connected";
      console.log(`[GramJS] Conectado com sucesso como: ${me.firstName || ""} (@${me.username || ""}) - ID: ${me.id}`);
      try {
        console.log("[GramJS] Pr\xE9-carregando entidades de di\xE1logos...");
        await client.getDialogs({ limit: 100 });
      } catch (dErr) {
      }
      try {
        console.log("[GramJS] Pr\xE9-resolvendo @Hgliopk00bot via RPC nos servidores do Telegram...");
        const proRes = await client.invoke(new Api.contacts.ResolveUsername({ username: "Hgliopk00bot" }));
        if (proRes?.users?.[0]) {
          const u = proRes.users[0];
          console.log(`[GramJS] @Hgliopk00bot pr\xE9-resolvido com sucesso! ID: ${u.id}`);
          cachedProBotPeer = new Api.InputPeerUser({
            userId: u.id,
            accessHash: u.accessHash
          });
        }
      } catch (pErr) {
        console.warn("[GramJS] Aviso ao pr\xE9-resolver @Hgliopk00bot:", pErr?.message);
      }
      attachUserbotListener(client);
    } else {
      userbotStatus = "disconnected";
    }
  } catch (err) {
    userbotStatus = "error";
  }
}
initUserbot();
async function dispatchToTelegram(record) {
  const isPro = Boolean(
    record.isPro === true || String(record.moduleType).toLowerCase().startsWith("pro") || String(record.moduleType).toLowerCase().includes("pro")
  );
  record.isPro = isPro;
  if (!record.queryParam || !record.queryParam.trim()) {
    return { sent: false, commandText: "", error: "Par\xE2metro de busca n\xE3o pode ser vazio.", isPro, targetChatId: isPro ? TELEGRAM_CHAT_ID_PRO : TELEGRAM_CHAT_ID_OLD };
  }
  const commandText = formatTelegramCommandMessage(record);
  record.telegramCommand = commandText;
  const targetChatId = isPro ? TELEGRAM_CHAT_ID_PRO : TELEGRAM_CHAT_ID_OLD;
  if (isPro) {
    console.log(`[ROTEAMENTO PRO] \u{1F48E} Direcionando busca avan\xE7ada PRO (${record.moduleType}) EXCLUSIVAMENTE para -> ${targetChatId} (${TARGET_BOT_PRO_ID_NUM}) com comando: "${commandText}"`);
  } else {
    console.log(`[ROTEAMENTO PADR\xC3O] \u26A1 Direcionando busca NORMAL (${record.moduleType}) para -> ${targetChatId} com comando: "${commandText}"`);
  }
  if (!targetChatId) {
    console.error(`[ROTEAMENTO] Erro: Chat ID de destino vazio para isPro=${isPro}`);
    return { sent: false, commandText, error: "Destino Telegram n\xE3o configurado.", isPro, targetChatId };
  }
  if (userbotClient && userbotStatus === "connected") {
    try {
      const peer = await resolveTelegramPeer(userbotClient, targetChatId);
      const sentMsg = await userbotClient.sendMessage(peer, { message: commandText });
      console.log(`[GramJS] Sucesso. Despachado para ${targetChatId}. Mensagem ID: ${sentMsg.id}`);
      return { sent: true, messageId: sentMsg.id, commandText, targetChatId, isPro };
    } catch (err) {
      console.error(`[GramJS] Falha ao despachar para ${targetChatId}:`, err?.message || err);
      if (isPro) {
        try {
          console.log(`[GramJS] Tentando fallback para ID num\xE9rico ${TARGET_BOT_PRO_ID_NUM}...`);
          const numPeer = await userbotClient.getInputEntity(TARGET_BOT_PRO_ID_NUM);
          const retryMsg = await userbotClient.sendMessage(numPeer, { message: commandText });
          console.log(`[GramJS] Sucesso no fallback num\xE9rico para ${TARGET_BOT_PRO_ID_NUM}. ID: ${retryMsg.id}`);
          return { sent: true, messageId: retryMsg.id, commandText, targetChatId: TARGET_BOT_PRO_ID_NUM, isPro };
        } catch (retryErr) {
          console.error(`[GramJS] Falha tamb\xE9m no fallback num\xE9rico:`, retryErr?.message);
        }
      }
      return { sent: false, commandText, error: err?.message, isPro, targetChatId };
    }
  }
  return { sent: false, commandText, isPro, targetChatId: "Desconectado" };
}
io.on("connection", (socket) => {
  socket.on("query:request", async (payload) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) return;
    const isPro = Boolean(
      payload.isPro === true || String(moduleType).toLowerCase().startsWith("pro") || String(moduleType).toLowerCase().includes("pro")
    );
    const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    let { command, cleanParam, fullMessage } = getTelegramCommand(moduleType, queryParam);
    command = command.replace(/^\/pro[_\s]*/i, "/");
    if (command === "/" || !command) {
      command = "/cpf";
    }
    fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;
    const record = {
      id: requestId,
      socketId: socket.id,
      moduleType,
      moduleTitle: MODULE_NAMES[moduleType] || (isPro ? `BUSCAS PRO - ${moduleType}` : moduleType),
      queryParam: queryParam.trim(),
      cleanedTarget: cleanParam,
      telegramCommand: fullMessage,
      timestamp: Date.now(),
      status: "pending",
      isPro
    };
    activeQueries.set(requestId, record);
    socket.emit("query:ack", { requestId, status: "pending", record, telegramCommand: fullMessage, isPro });
    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      record.telegramMessageId = dispatchResult.messageId;
      record.status = "processing";
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);
    }
    io.emit("telegram:query_created", { ...record, dispatchResult, userbotStatus, isPro });
  });
  socket.on("telegram:simulate_reply", async (payload) => {
    let targetRequestId = payload.requestId || (payload.telegramMessageId ? queryByTelegramMsgId.get(payload.telegramMessageId) : null);
    if (targetRequestId && activeQueries.has(targetRequestId)) {
      handleIncomingTelegramResponse(targetRequestId, payload.responseText, { simulated: true });
    }
  });
});
function handleIncomingTelegramResponse(requestId, rawText, meta) {
  const record = activeQueries.get(requestId);
  if (!record) return null;
  const now = Date.now();
  record.status = "completed";
  record.durationMs = now - record.timestamp;
  record.rawResponse = cleanTelegramRawResponse(rawText);
  record.exactMatch = checkTelegramExactMatch(record.queryParam, record.moduleType, record.rawResponse, record.telegramCommand);
  queryHistory.unshift({ ...record });
  if (queryHistory.length > 200) queryHistory.pop();
  activeQueries.delete(requestId);
  if (record.telegramMessageId) queryByTelegramMsgId.delete(record.telegramMessageId);
  io.to(record.socketId).emit("query:response", { ...record, meta });
  io.emit("query:completed_broadcast", { ...record, meta });
  return record;
}
app.post("/api/telegram/auth/send-code", async (req, res) => {
  const phone = (req.body.phoneNumber || TELEGRAM_PHONE_NUMBER || "").trim();
  if (!phone || !TELEGRAM_API_ID) return res.status(400).json({ error: "Faltam chaves ou telefone" });
  try {
    userbotStatus = "connecting";
    const tempClient = new TelegramClient(new StringSession(""), TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 3 });
    await tempClient.connect();
    const result = await tempClient.sendCode({ apiId: TELEGRAM_API_ID, apiHash: TELEGRAM_API_HASH }, phone);
    pendingAuthClient = tempClient;
    pendingAuthPhoneNumber = phone;
    pendingAuthPhoneCodeHash = result.phoneCodeHash;
    userbotStatus = "awaiting_code";
    return res.json({ ok: true, phoneCodeHash: result.phoneCodeHash });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/telegram/auth/sign-in", async (req, res) => {
  const code = (req.body.phoneCode || "").trim();
  if (!code || !pendingAuthClient) return res.status(400).json({ error: "Fluxo expirado ou c\xF3digo ausente." });
  try {
    await pendingAuthClient.invoke(new Api.auth.SignIn({ phoneNumber: pendingAuthPhoneNumber, phoneCodeHash: pendingAuthPhoneCodeHash, phoneCode: code }));
    TELEGRAM_STRING_SESSION = pendingAuthClient.session.save();
    userbotClient = pendingAuthClient;
    userbotStatus = "connected";
    attachUserbotListener(userbotClient);
    return res.json({ ok: true, sessionString: TELEGRAM_STRING_SESSION });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var UPDEPIX_API_KEY = process.env.UPDEPIX_API_KEY || "upx_c80bff3643dc294eaca31915d11408cfc7869402bc159a3b0e349ab1447f8e8f";
var UPDEPIX_BASE_URL = (process.env.UPDEPIX_BASE_URL || "https://updepix.cc/api/v1").replace(/\/$/, "");
var PLAN_DEFINITIONS = {
  weekly: { amount: 11, days: 7, name: "Plano Semanal" },
  biweekly: { amount: 19.9, days: 15, name: "Plano 15 Dias" },
  monthly: { amount: 35, days: 30, name: "Plano Mensal" }
};
var localDeposits = /* @__PURE__ */ new Map();
app.get("/api/payment/plans", (req, res) => {
  res.json({ success: true, plans: PLAN_DEFINITIONS });
});
app.post("/api/payment/create-pix", async (req, res) => {
  try {
    const { planId, userId, userEmail, userName, payerDocument } = req.body;
    const planConfig = PLAN_DEFINITIONS[planId];
    if (!planConfig) {
      return res.status(400).json({ success: false, error: "Plano inv\xE1lido." });
    }
    const cleanDoc = (payerDocument || "").replace(/\D/g, "");
    if (cleanDoc.length < 11) {
      return res.status(422).json({ success: false, error: "CPF ou CNPJ do pagador \xE9 obrigat\xF3rio (m\xEDnimo 11 d\xEDgitos)." });
    }
    const externalId = `szm-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanName = (userName || userEmail?.split("@")[0] || "Cliente Shazam").trim();
    const webhookUrl = "https://shazam-ygad.onrender.com/api/payment/webhook";
    try {
      const upDepixRes = await fetch(`${UPDEPIX_BASE_URL}/deposits`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${UPDEPIX_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "PostmanRuntime/7.36.1"
        },
        body: JSON.stringify({
          amount: planConfig.amount,
          external_id: externalId,
          webhook_url: webhookUrl,
          payer_name: cleanName,
          payer_document: cleanDoc,
          pass_fees_to_payer: false,
          wallet_id: null
        })
      });
      const textResponse = await upDepixRes.text();
      let responseData = null;
      try {
        responseData = JSON.parse(textResponse);
      } catch (e) {
        return res.status(502).json({
          success: false,
          error: `O servidor de pagamentos recusou a conex\xE3o. Verifique no Render se UPDEPIX_API_KEY est\xE1 configurado.`
        });
      }
      if (upDepixRes.ok && responseData?.data?.id) {
        const depData = responseData.data;
        localDeposits.set(depData.id, {
          id: depData.id,
          planId,
          userId,
          amount: planConfig.amount,
          daysAdded: planConfig.days,
          status: "pending"
        });
        return res.json({
          success: true,
          data: {
            id: depData.id,
            planId,
            amount: planConfig.amount,
            qrCopyPaste: depData.qr_copy_paste,
            qrImageUrl: depData.qr_image_url,
            status: "pending"
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: responseData?.detail || responseData?.message || "A operadora recusou a transa\xE7\xE3o. Verifique os dados."
        });
      }
    } catch (fetchErr) {
      return res.status(500).json({ success: false, error: "Falha de comunica\xE7\xE3o com o servidor financeiro." });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: "Falha interna do servidor backend." });
  }
});
app.all(["/api/payment/check-status/:id", "/api/payment/deposits/:id"], async (req, res) => {
  const depositId = req.params.id;
  if (!depositId) return res.status(400).json({ success: false, error: "ID \xE9 obrigat\xF3rio." });
  const localRecord = localDeposits.get(depositId);
  if (localRecord && localRecord.status === "completed") {
    return res.json({
      success: true,
      data: {
        id: depositId,
        status: "completed",
        isPaid: true,
        planId: localRecord.planId,
        daysAdded: localRecord.daysAdded,
        amount: localRecord.amount,
        completedAt: localRecord.completedAt
      }
    });
  }
  if (localRecord && ["refunded", "failed", "canceled"].includes(localRecord.status)) {
    return res.json({ success: true, data: { id: depositId, status: localRecord.status, isPaid: false } });
  }
  try {
    const getRes = await fetch(`${UPDEPIX_BASE_URL}/deposits/${depositId}`, {
      headers: { "Authorization": `Bearer ${UPDEPIX_API_KEY}`, "User-Agent": "PostmanRuntime/7.36.1" }
    });
    const getJson = await getRes.json();
    let currentStatus = getJson?.data?.status;
    if (["completed", "approved", "depix_sent"].includes(currentStatus)) {
      if (localRecord) {
        localRecord.status = "completed";
        localRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      return res.json({
        success: true,
        data: {
          id: depositId,
          status: "completed",
          isPaid: true,
          planId: localRecord?.planId || "biweekly",
          daysAdded: localRecord?.daysAdded || 15,
          amount: localRecord?.amount || 19.9,
          completedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
    if (["refunded", "error", "canceled", "failed"].includes(currentStatus)) {
      if (localRecord) localRecord.status = currentStatus;
    }
    return res.json({
      success: true,
      data: {
        id: depositId,
        status: currentStatus || "pending",
        isPaid: false,
        planId: localRecord?.planId,
        daysAdded: localRecord?.daysAdded,
        amount: localRecord?.amount
      }
    });
  } catch (err) {
  }
  return res.json({
    success: true,
    data: { id: depositId, status: localRecord?.status || "pending", isPaid: localRecord?.status === "completed" }
  });
});
app.post("/api/payment/simulate-confirm/:id", (req, res) => {
  const depositId = req.params.id;
  const localRecord = localDeposits.get(depositId);
  if (localRecord) {
    localRecord.status = "completed";
    localRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    io.emit("payment:confirmed", { depositId, userId: localRecord.userId, planId: localRecord.planId, daysAdded: localRecord.daysAdded });
    return res.json({ success: true, message: "Simula\xE7\xE3o conclu\xEDda", data: { id: depositId, status: "completed", isPaid: true } });
  }
  return res.status(404).json({ success: false, error: "Dep\xF3sito n\xE3o encontrado." });
});
app.post("/api/payment/webhook", (req, res) => {
  try {
    const data = req.body?.data;
    const event = req.body?.event;
    if (!data) return res.status(200).json({ success: true, message: "Sem payload" });
    let matchedRecord = localDeposits.get(data.id);
    if (!matchedRecord && data.external_id) {
      for (const rec of localDeposits.values()) {
        if (rec.externalId === data.external_id) {
          matchedRecord = rec;
          break;
        }
      }
    }
    if (matchedRecord) {
      if (event === "deposit.completed" || data.status === "completed" || data.status === "approved") {
        matchedRecord.status = "completed";
        matchedRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
        io.emit("payment:confirmed", { depositId: matchedRecord.id, userId: matchedRecord.userId, planId: matchedRecord.planId, daysAdded: matchedRecord.daysAdded });
      } else if (event === "deposit.refunded" || data.status === "refunded") {
        matchedRecord.status = "refunded";
      } else if (["error", "canceled", "failed"].includes(data.status)) {
        matchedRecord.status = "failed";
      }
    }
    return res.status(200).json({ success: true, message: "Webhook processado" });
  } catch (err) {
    return res.status(200).json({ success: false, error: err?.message });
  }
});
app.get("/api/history", (req, res) => {
  res.json({ records: queryHistory });
});
app.get("/api/system/status", (req, res) => {
  res.json({
    status: "ok",
    userbotStatus,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size
  });
});
app.get("/api/health", (req, res) => res.json({ status: "ok", time: Date.now() }));
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[IntelSaaS Backend] Servidor rodando em http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.js.map
