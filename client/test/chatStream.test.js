import assert from "node:assert/strict";
import { test } from "node:test";
import { readChatStream, requestChat } from "../src/features/chatStream.js";

test("renders streamed text and applies server reset events", async () => {
  const chunks = [
    'event: chunk\ndata: {"text":"Hello "}\n\n',
    'event: reset\ndata: {}\n\nevent: chunk\ndata: {"text":"Hi"}\n\n',
    'event: done\ndata: {"success":true,"data":{"message":"Hi","action":{"type":"NONE"}}}\n\n',
  ];
  const response = createStreamResponse(chunks);
  const visibleText = [];
  const result = await readChatStream(response, {
    onChunk: (text) => visibleText.push(text),
    onReset: () => visibleText.splice(0),
  });

  assert.deepEqual(visibleText, ["Hi"]);
  assert.deepEqual(result.data, { message: "Hi", action: { type: "NONE" } });
});

test("reports stream errors and incomplete responses", async () => {
  const errorResponse = createStreamResponse([
    'event: error\ndata: {"success":false,"error":"Serviço indisponível","status":503}\n\n',
  ]);
  await assert.rejects(
    readChatStream(errorResponse, { onChunk() {}, onReset() {} }),
    /Serviço indisponível/
  );

  const incompleteResponse = createStreamResponse(['event: chunk\ndata: {"text":"parcial"}\n\n']);
  await assert.rejects(
    readChatStream(incompleteResponse, { onChunk() {}, onReset() {} }),
    /sem uma resposta completa/
  );
});

test("falls back to the existing JSON endpoint when streaming is unsupported", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (requestedUrls.length === 1) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(
      JSON.stringify({ success: true, data: { message: "Resposta JSON", action: { type: "NONE" } } }),
      { headers: { "content-type": "application/json" } }
    );
  };

  try {
    const result = await requestChat({
      url: "https://example.test/api/chat",
      message: "Olá",
      onChunk() {},
      onReset() {},
    });
    assert.equal(result.data.message, "Resposta JSON");
    assert.equal(requestedUrls[0], "https://example.test/api/chat/stream");
    assert.equal(requestedUrls[1], "https://example.test/api/chat");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createStreamResponse(chunks) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }));
}
