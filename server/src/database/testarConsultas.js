import assert from "node:assert/strict";
import { findSchedules } from "../services/horariosService.js";

function expectCount({ description, filters, expected }) {
  const total = findSchedules(filters).length;

  assert.equal(total, expected, `${description}: esperado ${expected}, obtido ${total}`);
  console.log(`✔ ${description}: ${total}`);
}

function expectAll({ description, filters, check }) {
  const schedules = findSchedules(filters);

  assert.ok(schedules.length > 0, `${description}: nenhum resultado`);
  assert.ok(schedules.every(check), `${description}: há resultados fora do filtro`);
  console.log(`✔ ${description}: ${schedules.length} (todos dentro do filtro)`);
}

expectCount({ description: "Sem filtros", filters: {}, expected: 348 });
expectCount({ description: "Turma 1DEVM-A", filters: { turma: "1DEVM-A" }, expected: 32 });
expectCount({ description: "Turma 1devm-a (minúsculas)", filters: { turma: "1devm-a" }, expected: 32 });
expectCount({ description: "1DEVM-A na segunda", filters: { turma: "1DEVM-A", dia: "segunda-feira" }, expected: 8 });
expectCount({ description: "Terça (todas as turmas)", filters: { dia: "Terça" }, expected: 96 });
expectCount({ description: "Turma por nome: eletronica", filters: { turma: "eletronica" }, expected: 72 });
expectCount({ description: "Sala: Lab.05", filters: { sala: "Lab.05" }, expected: 26 });
expectCount({ description: "Sala: lab 5", filters: { sala: "lab 5" }, expected: 26 });
expectCount({ description: "Sala: 5", filters: { sala: "5" }, expected: 26 });
expectCount({ description: "Sala: lab 1 (não pega Lab.10)", filters: { sala: "lab 1" }, expected: 18 });
expectCount({ description: "Sala: laboratório 3", filters: { sala: "laboratório 3" }, expected: 20 });
expectCount({ description: "Professor: Elias (não pega M. Elias)", filters: { professor: "Elias" }, expected: 15 });
expectCount({ description: "Professor: M. Elias", filters: { professor: "M. Elias" }, expected: 14 });
expectCount({ description: "Professor sem acento: claudio", filters: { professor: "claudio" }, expected: 14 });
expectCount({ description: "Professor sem acento: natalia", filters: { professor: "natalia" }, expected: 14 });
expectCount({ description: "Disciplina: ARI", filters: { disciplina: "ari" }, expected: 10 });
expectCount({ description: "Domingo (sem aulas)", filters: { dia: "domingo" }, expected: 0 });
expectAll({
  description: "Professor Elias só retorna Elias",
  filters: { professor: "Elias" },
  check: (item) => item.professor === "Elias"
});

assert.throws(() => findSchedules({ dia: "xyz" }), { code: "INVALID_WEEKDAY" });
console.log("✔ Dia inválido gera erro INVALID_WEEKDAY");

console.log("\nTodos os testes passaram!");