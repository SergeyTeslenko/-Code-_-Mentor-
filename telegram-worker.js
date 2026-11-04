function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function telegramCall(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram ${method} failed.`);
  }

  return result.result;
}

function getCorsHeaders(env, origin) {
  if (!env.SITE_ORIGIN || origin !== env.SITE_ORIGIN) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": env.SITE_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function handleLead(request, env) {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(env, origin);

  if (!corsHeaders) {
    return jsonResponse({ ok: false, error: "Origin is not allowed." }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405, corsHeaders);
  }

  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return jsonResponse({ ok: false, error: "Expected JSON." }, 415, corsHeaders);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4096) {
    return jsonResponse({ ok: false, error: "Request is too large." }, 413, corsHeaders);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON." }, 400, corsHeaders);
  }

  const fields = ["name", "contact", "age", "interest"];
  if (
    !data ||
    typeof data !== "object" ||
    fields.some((field) => typeof data[field] !== "string") ||
    data.name.trim().length < 2 ||
    data.name.length > 100 ||
    data.contact.trim().length < 5 ||
    data.contact.length > 100 ||
    data.age.length > 30 ||
    data.interest.length > 300
  ) {
    return jsonResponse({ ok: false, error: "Please check the form fields." }, 400, corsHeaders);
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return jsonResponse({ ok: false, error: "Telegram is not configured." }, 500, corsHeaders);
  }

  const message = [
    "Новая заявка с сайта Code Mentor",
    "",
    `Имя родителя: ${data.name.trim()}`,
    `Телефон / Telegram: ${data.contact.trim()}`,
    `Возраст ребёнка: ${data.age.trim()}`,
    `Интерес: ${data.interest.trim() || "не указан"}`,
  ].join("\n");

  try {
    await telegramCall(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: message });
  } catch (error) {
    console.error("Could not send website lead to Telegram:", error.message);
    return jsonResponse({ ok: false, error: "Telegram could not deliver the message." }, 502, corsHeaders);
  }

  return jsonResponse({ ok: true }, 200, corsHeaders);
}

async function handleWebhook(request, env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, error: "Telegram webhook is not configured." }, 503);
  }

  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON." }, 400);
  }

  const message = update?.message;
  if (!message?.chat?.id || typeof message.text !== "string" || message.from?.is_bot) {
    return jsonResponse({ ok: true }, 200);
  }

  const chatId = String(message.chat.id);
  const ownerChatId = String(env.TELEGRAM_CHAT_ID);
  const text = message.text.trim();

  if (chatId === ownerChatId) {
    if (text.startsWith("/start")) {
      await telegramCall(env, "sendMessage", {
        chat_id: chatId,
        text: "Бот подключён. Новые заявки с сайта и сообщения посетителей будут приходить сюда. Чтобы ответить посетителю, используйте «Ответить» на его пересланном сообщении.",
      });
      return jsonResponse({ ok: true }, 200);
    }

    const repliedMessageId = message.reply_to_message?.message_id;
    if (!repliedMessageId) {
      await telegramCall(env, "sendMessage", {
        chat_id: chatId,
        text: "Чтобы ответить посетителю, отправьте ответ через функцию «Ответить» на пересланном сообщении от него.",
      });
      return jsonResponse({ ok: true }, 200);
    }

    if (!env.CHAT_MAPPINGS) {
      console.error("CHAT_MAPPINGS KV binding is not configured.");
      return jsonResponse({ ok: false, error: "Reply routing is not configured." }, 503);
    }

    const visitorChatId = await env.CHAT_MAPPINGS.get(`reply:${repliedMessageId}`);
    if (!visitorChatId) {
      await telegramCall(env, "sendMessage", {
        chat_id: chatId,
        text: "Не нашёл чат посетителя для этого сообщения. Ответьте именно на пересланное сообщение от посетителя.",
      });
      return jsonResponse({ ok: true }, 200);
    }

    await telegramCall(env, "sendMessage", { chat_id: visitorChatId, text });
    await telegramCall(env, "sendMessage", {
      chat_id: chatId,
      text: "Ответ отправлен посетителю.",
      reply_to_message_id: message.message_id,
    });
    return jsonResponse({ ok: true }, 200);
  }

  if (!env.TELEGRAM_CHAT_ID) {
    return jsonResponse({ ok: false, error: "Owner chat is not configured." }, 503);
  }

  if (text.startsWith("/start")) {
    await telegramCall(env, "sendMessage", {
      chat_id: chatId,
      text: "Здравствуйте! Это Code Mentor. Напишите ваш вопрос — наставник получит сообщение и ответит здесь. Чтобы записаться на бесплатное занятие, заполните форму на сайте.",
    });
    return jsonResponse({ ok: true }, 200);
  }

  if (!env.CHAT_MAPPINGS) {
    console.error("CHAT_MAPPINGS KV binding is not configured.");
    return jsonResponse({ ok: false, error: "Message forwarding is not configured." }, 503);
  }

  const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
  const senderHandle = message.from?.username ? `@${message.from.username}` : "username не указан";

  try {
    const forwarded = await telegramCall(env, "sendMessage", {
      chat_id: ownerChatId,
      text: [
        "Новое сообщение посетителя боту Code Mentor",
        `Имя: ${senderName || "не указано"}`,
        `Telegram: ${senderHandle}`,
        `Chat ID: ${chatId}`,
        "",
        text,
        "",
        "Ответьте на это сообщение через функцию «Ответить», и бот перешлёт ваш ответ посетителю.",
      ].join("\n"),
    });

    await env.CHAT_MAPPINGS.put(`reply:${forwarded.message_id}`, chatId, {
      expirationTtl: 60 * 60 * 24 * 30,
    });

    await telegramCall(env, "sendMessage", {
      chat_id: chatId,
      text: "Спасибо, сообщение передано наставнику. Ответ придёт сюда.",
    });
  } catch (error) {
    console.error("Could not relay visitor message:", error.message);
    return jsonResponse({ ok: false, error: "Could not relay visitor message." }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}

async function registerWebhook(request, env) {
  const authorization = request.headers.get("Authorization");
  if (
    !env.WEBHOOK_SETUP_SECRET ||
    authorization !== `Bearer ${env.WEBHOOK_SETUP_SECRET}`
  ) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, error: "Telegram secrets are not configured." }, 503);
  }

  const webhookUrl = `${new URL(request.url).origin}/telegram/webhook`;

  try {
    const result = await telegramCall(env, "setWebhook", {
      url: webhookUrl,
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });
    return jsonResponse({ ok: true, webhookUrl, telegramResult: result }, 200);
  } catch (error) {
    console.error("Could not register Telegram webhook:", error.message);
    return jsonResponse({ ok: false, error: "Telegram webhook registration failed." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    if (path === "/telegram/webhook") {
      return handleWebhook(request, env);
    }

    if (path === "/admin/set-webhook") {
      return registerWebhook(request, env);
    }

    if (path === "/" || path === "/api/lead") {
      return handleLead(request, env);
    }

    return jsonResponse({ ok: false, error: "Not found." }, 404);
  },
};
