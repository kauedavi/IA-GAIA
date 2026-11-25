import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.GEMINI_API_KEY = "test-gemini-api-key";
process.env.GEMINI_MODEL = "test-primary-model";
process.env.GEMINI_FALLBACK_MODEL = "test-fallback-model";

const [{ app }, { gemini }, { toolHandlers }] = await Promise.all([
  import("../app.js"),
  import("../src/config/gemini.js"),
  import("../src/agent/tools/index.js"),
]);

let server;
let apiUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}/api/chat/stream`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("sends text chunks before the Gemini stream completes", async () => {
  const originalStream = gemini.models.generateContentStream;
  const originalLog = console.log;
  const logLines = [];
  console.log = (line) => logLines.push(line);
  let releaseStream;
  const continueStream = new Promise((resolve) => {
    releaseStream = resolve;
  });
  gemini.models.generateContentStream = async function* () {
    yield { text: "Bom " };
    await continueStream;
    yield { text: "dia." };
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Saudação" }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/event-stream/);
    const reader = response.body.getReader();
    const firstChunk = await reader.read();
    assert.match(new TextDecoder().decode(firstChunk.value), /event: chunk\ndata: {"text":"Bom "}/);
    releaseStream();

    let remaining = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      remaining += new TextDecoder().decode(value);
    }
    assert.match(remaining, /event: chunk\ndata: {"text":"dia."}/);
    assert.match(remaining, /event: done/);
  } finally {
    releaseStream();
    gemini.models.generateContentStream = originalStream;
    console.log = originalLog;
  }

  const metrics = logLines.map((line) => JSON.parse(line)).find((line) => line.event === "api_latency");
  assert.equal(metrics.route, "/api/chat/stream");
  assert.ok(metrics.response_bytes > 0);
});

test("resets provisional text before processing a tool call", async () => {
  const originalStream = gemini.models.generateContentStream;
  const originalRouteHandler = toolHandlers.consultar_rota;
  let calls = 0;
  toolHandlers.consultar_rota = () => ({
    action: { type: "NAVIGATE_TO_ROOM", roomId: "sala-304" },
    result: "ok",
  });
  gemini.models.generateContentStream = async function* () {
    calls += 1;
    if (calls === 1) {
      yield { text: "rascunho" };
      yield {
        functionCalls: [{ name: "consultar_rota", args: { destino: "sala 304" } }],
        candidates: [{
          content: {
            parts: [{
              functionCall: { name: "consultar_rota", args: { destino: "sala 304" } },
            }],
          },
        }],
      };
      return;
    }
    yield { text: "A sala fica no bloco A." };
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Onde fica a sala 304?" }),
    });
    const events = parseEvents(await response.text());
    assert.deepEqual(events.map(({ event }) => event), ["chunk", "reset", "chunk", "done"]);
    assert.equal(events[2].data.text, "A sala fica no bloco A.");
    assert.deepEqual(events[3].data.data.action, {
      type: "NAVIGATE_TO_ROOM",
      roomId: "sala-304",
    });
    assert.equal(calls, 2);
  } finally {
    gemini.models.generateContentStream = originalStream;
    toolHandlers.consultar_rota = originalRouteHandler;
  }
});

test("propagates a disconnected client cancellation to the Gemini stream", async () => {
  const originalStream = gemini.models.generateContentStream;
  let signal;
  let resolveAbort;
  const observedAbort = new Promise((resolve) => {
    resolveAbort = resolve;
  });
  gemini.models.generateContentStream = async function* ({ config }) {
    signal = config.abortSignal;
    try {
      yield { text: "Parcial" };
      await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
    } finally {
      resolveAbort(signal.aborted);
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Resposta longa" }),
    });
    const reader = response.body.getReader();
    await reader.read();
    await reader.cancel();
    assert.equal(await observedAbort, true);
  } finally {
    gemini.models.generateContentStream = originalStream;
  }
});

test("sends a structured SSE error when Gemini rejects a streamed request", async () => {
  const originalStream = gemini.models.generateContentStream;
  const originalError = console.error;
  gemini.models.generateContentStream = async () => {
    throw Object.assign(new Error("invalid provider request"), { status: 400 });
  };
  console.error = () => {};

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Pergunta inválida" }),
    });
    const events = parseEvents(await response.text());
    assert.equal(response.status, 200);
    assert.equal(events[0].event, "error");
    assert.equal(events[0].data.status, 400);
    assert.equal(events[0].data.error, "invalid provider request");
  } finally {
    gemini.models.generateContentStream = originalStream;
    console.error = originalError;
  }
});

function parseEvents(streamText) {
  return streamText.trim().split(/\r?\n\r?\n/).map((frame) => {
    const lines = frame.split(/\r?\n/);
    return {
      event: lines.find((line) => line.startsWith("event: "))?.slice(7),
      data: JSON.parse(lines.find((line) => line.startsWith("data: "))?.slice(6) || "null"),
    };
  });
}
