import { gemini, geminiFallbackModel, geminiModel } from "../config/gemini.js";
import { systemInstruction } from "../agent/systemInstruction.js";
import { toolDeclarations, toolHandlers } from "../agent/tools/index.js";
import { performance } from "node:perf_hooks";

const MAX_ROUNDS = 4;
const MAX_RETRIES = 3;
const CHAT_DEADLINE_MS = 25_000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export async function chatService(message, metrics) {
  const deadline = performance.now() + CHAT_DEADLINE_MS;
  let contents = [{ role: "user", parts: [{ text: message }] }];
  let action = { type: "NONE" };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    if (metrics) metrics.rounds += 1;
    const response = await generateWithFallback(contents, metrics, deadline);

    const calls = response.functionCalls || [];
    if (!calls.length) {
      return { message: response.text || "Não consegui gerar uma resposta.", action };
    }

    const modelParts = response.candidates?.[0]?.content?.parts;
    contents.push({
      role: "model",
      parts: modelParts?.length
        ? modelParts
        : calls.map((call) => ({ functionCall: call }))
    });
    const functionParts = calls.map((call) => {
      const handler = toolHandlers[call.name];
      if (!handler) throw new Error(`Tool não registrada: ${call.name}`);
      const startedAt = performance.now();
      let result;
      try {
        result = handler(call.args || {});
      } finally {
        if (metrics) {
          metrics.tools_called.push(call.name);
          metrics.tool_duration_ms += performance.now() - startedAt;
        }
      }
      const { action: resultAction, ...toolResponse } = result;
      if (resultAction) action = resultAction;
      if (metrics) {
        metrics.tool_response_bytes += Buffer.byteLength(JSON.stringify(toolResponse), "utf8");
      }
      return { functionResponse: { name: call.name, response: toolResponse } };
    });
    contents.push({ role: "user", parts: functionParts });
  }

  throw new Error("Limite de chamadas de ferramentas excedido.");
}

async function generateWithFallback(contents, metrics, deadline) {
  const models = [geminiModel, geminiFallbackModel].filter(
    (model, index, list) => model && list.indexOf(model) === index
  );
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const remainingMs = Math.floor(deadline - performance.now());
      if (remainingMs <= 0) throw createDeadlineError();
      if (attempt === 0 && metrics && model !== models[0]) {
        metrics.fallback_attempted = true;
      }

      const startedAt = performance.now();
      if (metrics) {
        metrics.gemini_attempts += 1;
        if (attempt > 0) metrics.gemini_retries += 1;
        if (!metrics.models_used.includes(model)) metrics.models_used.push(model);
      }
      let outcome = "failure";
      let errorStatus = null;
      try {
        const response = await gemini.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: toolDeclarations,
            temperature: 0.2,
            httpOptions: {
              timeout: remainingMs,
              retryOptions: { attempts: 1 },
            },
          }
        });
        outcome = "success";
        if (metrics) {
          metrics.selected_model = model;
          if (model !== models[0]) metrics.fallback_used = true;
        }
        return response;
      } catch (error) {
        lastError = error;
        errorStatus = Number.isInteger(error?.status) ? error.status : null;
        if (metrics) metrics.gemini_failures += 1;
        if (!isTransientError(error)) throw error;
        if (attempt === MAX_RETRIES - 1) break;
      } finally {
        const duration = performance.now() - startedAt;
        if (metrics) {
          metrics.gemini_duration_ms += duration;
          metrics.gemini_calls.push({
            round: metrics.rounds,
            model,
            attempt: attempt + 1,
            duration_ms: Math.round(duration),
            outcome,
            status: errorStatus,
          });
        }
      }
      const retryDelay = 1000 * (attempt + 1);
      const delayMs = Math.min(retryDelay, deadline - performance.now());
      if (delayMs <= 0) throw createDeadlineError();
      if (metrics) metrics.gemini_retry_delay_ms += delayMs;
      await delay(delayMs);
    }
  }

  throw lastError;
}

function isTransientError(error) {
  if (RETRYABLE_STATUSES.has(error?.status)) return true;
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return true;
  const codes = [error?.code, error?.cause?.code];
  return codes.some((code) => RETRYABLE_ERROR_CODES.has(code));
}

function createDeadlineError() {
  const error = new Error("Tempo limite de processamento excedido.");
  error.status = 503;
  return error;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
