import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { summarizeLatencyRecords } from "../src/observability/latencySummary.js";

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
  apiUrl = `http://127.0.0.1:${server.address().port}/api/chat`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("logs chat latency without sensitive content and summarizes latency percentiles", async () => {
  const originalGenerateContent = gemini.models.generateContent;
  const originalRouteHandler = toolHandlers.consultar_rota;
  const originalLog = console.log;
  const logLines = [];
  const geminiRequests = [];
  let generateCalls = 0;

  toolHandlers.consultar_rota = () => ({
    action: { type: "NAVIGATE_TO_ROOM", roomId: "sala-304" },
    result: "ok",
  });
  gemini.models.generateContent = async (request) => {
    generateCalls += 1;
    geminiRequests.push(request);
    if (generateCalls <= 3) {
      throw Object.assign(new Error("temporary provider error"), { status: 503 });
    }
    if (generateCalls === 4) {
      return {
        functionCalls: [{ name: "consultar_rota", args: { destination: "sala 304" } }],
      };
    }
    return { text: "Resposta de teste" };
  };
  console.log = (line) => logLines.push(line);

  try {
    const successResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "PROMPT_MUST_NOT_BE_LOGGED" }),
    });
    const successBody = await successResponse.json();
    assert.equal(successResponse.status, 200);
    assert.equal(successBody.data.message, "Resposta de teste");
    assert.deepEqual(successBody.data.action, {
      type: "NAVIGATE_TO_ROOM",
      roomId: "sala-304",
    });

    const invalidResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    assert.equal(invalidResponse.status, 400);

    const healthResponse = await fetch(apiUrl.replace("/api/chat", "/health"));
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { success: true, data: { status: "ok" } });
  } finally {
    console.log = originalLog;
    gemini.models.generateContent = originalGenerateContent;
    toolHandlers.consultar_rota = originalRouteHandler;
  }

  const metrics = logLines.map((line) => JSON.parse(line));
  assert.equal(metrics.length, 2);
  assert.equal(metrics[0].event, "api_latency");
  assert.equal(metrics[0].status, 200);
  assert.equal(metrics[0].service_activity, "first");
  assert.equal(metrics[0].rounds, 2);
  assert.equal(metrics[0].gemini_attempts, 5);
  assert.equal(metrics[0].gemini_retries, 2);
  assert.equal(metrics[0].gemini_failures, 3);
  assert.equal(metrics[0].models_used.length, 2);
  assert.equal(metrics[0].selected_model, "test-primary-model");
  assert.equal(metrics[0].fallback_attempted, true);
  assert.equal(metrics[0].fallback_used, true);
  assert.deepEqual(
    metrics[0].gemini_calls.map(({ model, round, outcome }) => [model, round, outcome]),
    [
      ["test-primary-model", 1, "failure"],
      ["test-primary-model", 1, "failure"],
      ["test-primary-model", 1, "failure"],
      ["test-fallback-model", 1, "success"],
      ["test-primary-model", 2, "success"],
    ]
  );
  assert.deepEqual(metrics[0].tools_called, ["consultar_rota"]);
  assert.equal(metrics[0].tool_response_bytes, Buffer.byteLength('{"result":"ok"}'));
  const forwardedFunctionResponse = geminiRequests[4].contents
    .flatMap((content) => content.parts || [])
    .find((part) => part.functionResponse);
  assert.deepEqual(forwardedFunctionResponse.functionResponse.response, { result: "ok" });
  assert.ok(!JSON.stringify(forwardedFunctionResponse).includes("NAVIGATE_TO_ROOM"));
  assert.ok(metrics[0].duration_ms >= metrics[0].gemini_duration_ms);
  assert.ok(metrics[0].response_bytes > 0);
  assert.equal(metrics[1].status, 400);
  assert.equal(metrics[1].service_activity, "active");
  assert.equal(metrics[1].gemini_attempts, 0);
  assert.ok(metrics.every((record) => !JSON.stringify(record).includes("PROMPT_MUST_NOT_BE_LOGGED")));
  assert.ok(metrics.every((record) => !JSON.stringify(record).includes("test-gemini-api-key")));
  assert.ok(metrics.every((record) => !JSON.stringify(record).includes("private provider error")));

  const summary = summarizeLatencyRecords([
    { ...metrics[0], duration_ms: 10, gemini_duration_ms: 4 },
    { ...metrics[1], duration_ms: 20, gemini_duration_ms: 0 },
    { ...metrics[1], duration_ms: 30, gemini_duration_ms: 0 },
    { ...metrics[1], duration_ms: 40, gemini_duration_ms: 0 },
  ]);
  assert.deepEqual(summary.overall.duration_ms, { p50: 20, p95: 40 });
  assert.deepEqual(summary.overall.gemini_duration_ms, { p50: 0, p95: 4 });
  assert.equal(summary.overall.mean_tool_response_bytes, 3.75);
  assert.equal(summary.overall.error_rate_percent, 75);
  assert.equal(summary.overall.fallback_attempt_rate_percent, 25);
  assert.equal(summary.by_service_activity.active.requests, 3);
});

test("separates Gemini retry backoff from provider-call duration", async () => {
  const originalGenerateContent = gemini.models.generateContent;
  const originalLog = console.log;
  const logLines = [];
  let generateCalls = 0;

  gemini.models.generateContent = async () => {
    generateCalls += 1;
    if (generateCalls === 1) {
      throw Object.assign(new Error("temporary provider error"), { status: 503 });
    }
    return { text: "Resposta após retry" };
  };
  console.log = (line) => logLines.push(line);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "RETRY_PROMPT_MUST_NOT_BE_LOGGED" }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.message, "Resposta após retry");
  } finally {
    console.log = originalLog;
    gemini.models.generateContent = originalGenerateContent;
  }

  const metrics = JSON.parse(logLines[0]);
  assert.equal(metrics.service_activity, "active");
  assert.equal(metrics.gemini_attempts, 2);
  assert.equal(metrics.gemini_retries, 1);
  assert.equal(metrics.gemini_failures, 1);
  assert.equal(metrics.gemini_retry_delay_ms, 1000);
  assert.equal(metrics.gemini_calls[0].status, 503);
  assert.equal(metrics.gemini_calls[1].outcome, "success");
  assert.ok(metrics.duration_ms - metrics.gemini_duration_ms >= 900);
  assert.ok(!JSON.stringify(metrics).includes("RETRY_PROMPT_MUST_NOT_BE_LOGGED"));
});

test("does not retry or use fallback for permanent Gemini validation errors", async () => {
  const originalGenerateContent = gemini.models.generateContent;
  const originalLog = console.log;
  const originalError = console.error;
  const logLines = [];
  const loggedErrors = [];
  let generateCalls = 0;
  let requestOptions;

  gemini.models.generateContent = async ({ config }) => {
    generateCalls += 1;
    requestOptions = config.httpOptions;
    throw Object.assign(new Error("invalid provider request"), { status: 400 });
  };
  console.log = (line) => logLines.push(line);
  console.error = (error) => loggedErrors.push(error);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "VALIDATION_PROMPT_MUST_NOT_BE_LOGGED" }),
    });
    assert.equal(response.status, 400);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    gemini.models.generateContent = originalGenerateContent;
  }

  const metrics = JSON.parse(logLines[0]);
  assert.equal(generateCalls, 1);
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedErrors[0].status, 400);
  assert.equal(metrics.gemini_attempts, 1);
  assert.equal(metrics.gemini_retries, 0);
  assert.equal(metrics.fallback_attempted, false);
  assert.equal(metrics.fallback_used, false);
  assert.ok(requestOptions.timeout > 0 && requestOptions.timeout <= 25_000);
  assert.deepEqual(requestOptions.retryOptions, { attempts: 1 });
  assert.ok(!JSON.stringify(metrics).includes("VALIDATION_PROMPT_MUST_NOT_BE_LOGGED"));
});
