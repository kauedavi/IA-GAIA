import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.GEMINI_API_KEY = "test-gemini-api-key";

const { app } = await import("../app.js");
const { reloadSpreadsheet, getHorarios } = await import("../src/services/spreadsheetService.js");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  delete process.env.GAIA_ADMIN_TOKEN;
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("bloqueia envio e recarga da planilha quando GAIA_ADMIN_TOKEN não está configurado", async () => {
  delete process.env.GAIA_ADMIN_TOKEN;
  const response = await fetch(`${baseUrl}/api/planilha/recarregar`, { method: "POST" });
  assert.equal(response.status, 403);
  const upload = await fetch(`${baseUrl}/api/planilha/upload`, { method: "POST" });
  assert.equal(upload.status, 403);
});

test("recusa token errado e aceita o token configurado", async () => {
  process.env.GAIA_ADMIN_TOKEN = "segredo-de-teste";
  const wrong = await fetch(`${baseUrl}/api/planilha/recarregar`, {
    method: "POST",
    headers: { Authorization: "Bearer outro" },
  });
  assert.equal(wrong.status, 401);
  const right = await fetch(`${baseUrl}/api/planilha/recarregar`, {
    method: "POST",
    headers: { Authorization: "Bearer segredo-de-teste" },
  });
  assert.equal(right.status, 200);
});

test("consulta de status continua pública", async () => {
  const response = await fetch(`${baseUrl}/api/planilha/status`);
  assert.equal(response.status, 200);
});

test("a planilha padrão server/src/data/gaia.xlsx tem a grade real da tarde", () => {
  const data = reloadSpreadsheet();
  assert.equal(data.source, "gaia.xlsx");
  assert.ok(data.horarios.length > 300);
  const segunda = getHorarios({ turma: "2EA", dia: "segunda" });
  assert.ok(segunda.length > 0);
  assert.match(segunda[0].inicio, /^\d{2}:\d{2}$/);
});
