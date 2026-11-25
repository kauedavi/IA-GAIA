// Script manual de conferência das consultas (saída legível no terminal).
// Os mesmos casos rodam no `npm test` via server/test/horariosDatabase.test.js.
// Uso: node server/src/database/testarConsultas.js
import assert from "node:assert/strict";
import { findSchedules } from "../services/horariosService.js";
import { casosDeContagem, casosDeFiltro } from "./consultasEsperadas.js";

for (const { description, filters, expected } of casosDeContagem) {
  const total = findSchedules(filters).length;

  assert.equal(total, expected, `${description}: esperado ${expected}, obtido ${total}`);
  console.log(`✔ ${description}: ${total}`);
}

for (const { description, filters, check } of casosDeFiltro) {
  const schedules = findSchedules(filters);

  assert.ok(schedules.length > 0, `${description}: nenhum resultado`);
  assert.ok(schedules.every(check), `${description}: há resultados fora do filtro`);
  console.log(`✔ ${description}: ${schedules.length} (todos dentro do filtro)`);
}

assert.throws(() => findSchedules({ dia: "xyz" }), { code: "INVALID_WEEKDAY" });
console.log("✔ Dia inválido gera erro INVALID_WEEKDAY");

console.log("\nTodos os testes passaram!");
