import { gemini, geminiFallbackModel, geminiModel } from "../config/gemini.js";
import { systemInstruction } from "../agent/systemInstruction.js";
import { toolDeclarations, toolHandlers } from "../agent/tools/index.js";

const MAX_ROUNDS = 4;
const MAX_RETRIES = 3;

export async function chatService(message) {
  let contents = [{ role: "user", parts: [{ text: message }] }];
  let action = { type: "NONE" };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const response = await generateWithFallback(contents);

    const calls = response.functionCalls || [];
    if (!calls.length) {
      return { message: response.text || "Não consegui gerar uma resposta.", action };
    }

    contents.push({ role: "model", parts: calls.map((call) => ({ functionCall: call })) });
    const functionParts = calls.map((call) => {
      const handler = toolHandlers[call.name];
      if (!handler) throw new Error(`Tool não registrada: ${call.name}`);
      const result = handler(call.args || {});
      if (result.action) action = result.action;
      return { functionResponse: { name: call.name, response: result } };
    });
    contents.push({ role: "user", parts: functionParts });
  }

  throw new Error("Limite de chamadas de ferramentas excedido.");
}

async function generateWithFallback(contents) {
  const models = [geminiModel, geminiFallbackModel].filter(
    (model, index, list) => model && list.indexOf(model) === index
  );
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        return await gemini.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: toolDeclarations,
            temperature: 0.2
          }
        });
      } catch (error) {
        lastError = error;
        if (![429, 500, 503].includes(error.status) || attempt === MAX_RETRIES - 1) {
          break;
        }
        await delay(1000 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
