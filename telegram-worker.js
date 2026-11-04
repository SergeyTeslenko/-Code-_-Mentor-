function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.SITE_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };

    if (!env.SITE_ORIGIN || origin !== env.SITE_ORIGIN) {
      return jsonResponse({ ok: false, error: "Origin is not allowed." }, 403, {});
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

    let telegramResponse;
    try {
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message }),
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch {
      return jsonResponse({ ok: false, error: "Could not reach Telegram." }, 502, corsHeaders);
    }

    let telegramResult;
    try {
      telegramResult = await telegramResponse.json();
    } catch {
      return jsonResponse({ ok: false, error: "Telegram returned an invalid response." }, 502, corsHeaders);
    }

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Telegram sendMessage failed:", telegramResult.description || telegramResponse.status);
      return jsonResponse({ ok: false, error: "Telegram could not deliver the message." }, 502, corsHeaders);
    }

    return jsonResponse({ ok: true }, 200, corsHeaders);
  },
};
