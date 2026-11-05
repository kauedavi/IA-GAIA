import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// O SDK autentica automaticamente usando a GEMINI_API_KEY do seu arquivo .env
const rl = readline.createInterface({ input, output });
const ai = new GoogleGenAI({});

entrada();

async function entrada() {
  const input = await rl.question("Digite: ");
  rl.close();
  
  const resposta = String(input);

  perguntarAoGemini(resposta);
}

async function perguntarAoGemini(resposta) {
  console.log("Pensando...\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: resposta,
    });

    console.log("Gemini respondeu:");
    console.log(response.text);
  } catch (error) {
    console.error("Erro ao conectar com o Gemini:", error);
  }
}
