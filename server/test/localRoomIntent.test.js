import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import { after, before, test } from "node:test";

process.env.GEMINI_API_KEY = "test-gemini-api-key";

const [{ chatService }, { gemini }, { reloadSpreadsheet }] = await Promise.all([
  import("../src/services/chatService.js"),
  import("../src/config/gemini.js"),
  import("../src/services/spreadsheetService.js"),
]);

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-local-room-"));
const spreadsheetPath = path.join(temporaryDirectory, "rooms.xlsx");
const room = {
  id: "S-404",
  nome: "Sala 404",
  bloco: "Bloco A",
  andar: 2,
  x: 120,
  y: 240,
  tipo: "laboratorio",
  dica: "Ao lado da biblioteca.",
};

function writeRooms(rooms) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rooms), "Salas");
  XLSX.writeFile(workbook, spreadsheetPath);
  reloadSpreadsheet(spreadsheetPath);
}

before(() => writeRooms([room]));

after(() => {
  gemini.models.generateContent = originalGenerateContent;
  reloadSpreadsheet(path.join(temporaryDirectory, "missing.xlsx"));
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

const originalGenerateContent = gemini.models.generateContent;

test("answers an exact room-location request locally and preserves its navigation action", async () => {
  let generateCalls = 0;
  gemini.models.generateContent = async () => {
    generateCalls += 1;
    return { text: "Resposta do Gemini" };
  };
  const metrics = { rounds: 0, gemini_attempts: 0 };

  const response = await chatService("Onde fica a sala 404?", metrics);

  assert.deepEqual(response, {
    message: "Sala 404 fica no Bloco A, no 2º andar. Ao lado da biblioteca.",
    action: { type: "NAVIGATE_TO_ROOM", roomId: "S-404" },
  });
  assert.equal(generateCalls, 0);
  assert.equal(metrics.gemini_attempts, 0);
});

test("uses Gemini for ambiguous or open-ended room questions", async () => {
  let generateCalls = 0;
  gemini.models.generateContent = async () => {
    generateCalls += 1;
    return { text: "Resposta interpretada pelo Gemini" };
  };

  const responses = await Promise.all([
    chatService("Qual sala fica perto do laboratório?"),
    chatService("Onde fica a sala 404 e qual laboratório fica próximo?"),
  ]);

  assert.deepEqual(responses[0], {
    message: "Resposta interpretada pelo Gemini",
    action: { type: "NONE" },
  });
  assert.deepEqual(responses[1], {
    message: "Resposta interpretada pelo Gemini",
    action: { type: "NONE" },
  });
  assert.equal(generateCalls, 2);
});

test("uses Gemini when the requested room is absent from local data", async () => {
  let generateCalls = 0;
  gemini.models.generateContent = async () => {
    generateCalls += 1;
    return { text: "Não encontrei esse local." };
  };
  reloadSpreadsheet(path.join(temporaryDirectory, "missing.xlsx"));

  const response = await chatService("Onde fica a sala 404?");

  assert.equal(response.message, "Não encontrei esse local.");
  assert.equal(generateCalls, 1);
});

test("uses Gemini when local room data has multiple exact matches", async () => {
  let generateCalls = 0;
  gemini.models.generateContent = async () => {
    generateCalls += 1;
    return { text: "Preciso de mais detalhes sobre a sala." };
  };
  writeRooms([room, { ...room, id: "S-404-2" }]);

  const response = await chatService("Onde fica a sala 404?");

  assert.equal(response.message, "Preciso de mais detalhes sobre a sala.");
  assert.equal(generateCalls, 1);
});
