const LEGACY_FALLBACK_STATUSES = new Set([404, 405, 501]);

// Quando há sessão do Supabase, manda o access_token para o servidor saber
// quem está perguntando (middleware autenticacaoOpcional). Sem sessão — o
// caso do visitante — vai sem Authorization e a API atende do mesmo jeito.
async function authHeaders() {
  const auth = globalThis.GAIA_AUTH;

  if (!auth?.configurado?.()) return {};

  try {
    const token = await auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function requestChat({ url, message, signal, onChunk, onReset }) {
  if (typeof ReadableStream === "undefined") {
    return requestNonStream({ url, message, signal });
  }

  const streamUrl = new URL(url, globalThis.location?.href || "http://localhost/");
  streamUrl.pathname = `${streamUrl.pathname.replace(/\/+$/, "")}/stream`;

  const response = await fetch(streamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (LEGACY_FALLBACK_STATUSES.has(response.status)) {
    return requestNonStream({ url, message, signal });
  }
  if (!response.ok) throw await getResponseError(response);
  if (!response.body?.getReader) {
    throw new Error("O servidor iniciou streaming sem disponibilizar o corpo da resposta.");
  }

  return readChatStream(response, { onChunk, onReset });
}

export async function readChatStream(response, { onChunk, onReset }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      let boundary = findEventBoundary(buffer);
      while (boundary) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        const event = parseEvent(frame);
        if (event) {
          if (event.type === "chunk") onChunk(event.data.text);
          if (event.type === "reset") onReset();
          if (event.type === "done") result = event.data;
          if (event.type === "error") throw new Error(event.data.error || "Falha ao gerar a resposta.");
        }
        boundary = findEventBoundary(buffer);
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  if (!result?.success || !result.data) {
    throw new Error("O fluxo terminou sem uma resposta completa.");
  }
  return result;
}

async function requestNonStream({ url, message, signal }) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ message }),
    signal,
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  if (!payload.success || !payload.data) {
    throw new Error(payload.error || "Resposta inválida.");
  }
  return payload;
}

async function getResponseError(response) {
  try {
    const payload = await response.json();
    return new Error(payload.error || `HTTP ${response.status}`);
  } catch {
    return new Error(`HTTP ${response.status}`);
  }
}

function findEventBoundary(buffer) {
  const match = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
  return match ? { index: match.index, length: match[0].length } : null;
}

function parseEvent(frame) {
  let type = "message";
  const data = [];
  for (const line of frame.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") type = value;
    if (field === "data") data.push(value);
  }
  if (!data.length) return null;
  return { type, data: JSON.parse(data.join("\n")) };
}
