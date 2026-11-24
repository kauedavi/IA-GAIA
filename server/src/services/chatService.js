import { gemini, geminiFallbackModel, geminiModel } from "../config/gemini.js";
import { systemInstruction } from "../agent/systemInstruction.js";
import { toolDeclarations, toolHandlers } from "../agent/tools/index.js";
import { performance } from "node:perf_hooks";

const MAX_ROUNDS = 4;
const MAX_RETRIES = 3;

export async function chatService(message, metrics) {
  let contents = [{ role: "user", parts: [{ text: message }] }];
  let action = { type: "NONE" };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    if (metrics) metrics.rounds += 1;
    const response = await generateWithFallback(contents, metrics);

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
      if (result.action) action = result.action;
      return { functionResponse: { name: call.name, response: result } };
    });
    contents.push({ role: "user", parts: functionParts });
  }

  throw new Error("Limite de chamadas de ferramentas excedido.");
}

async function generateWithFallback(contents, metrics) {
  const models = [geminiModel, geminiFallbackModel].filter(
    (model, index, list) => model && list.indexOf(model) === index
  );
  let lastError;

  for (const model of models) {
    if (metrics && model !== models[0]) metrics.fallback_attempted = true;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
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
            temperature: 0.2
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
        if (![429, 500, 503].includes(error.status) || attempt === MAX_RETRIES - 1) {
          break;
        }
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
      if (metrics) metrics.gemini_retry_delay_ms += retryDelay;
      await delay(retryDelay);
    }
  }

  throw lastError;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
