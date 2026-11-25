import assert from "node:assert/strict";
import test from "node:test";
import { casosDeContagem, casosDeFiltro, TOTAL_DE_AULAS } from "../src/database/consultasEsperadas.js";

// O gaia.db não é versionado: ele nasce de `npm run db:import` dentro de server/.
// Sem banco populado (ou sem better-sqlite3 compilado) os casos são pulados em vez
// de falhar, para que um clone novo rode `npm test` sem precisar da planilha.
async function carregarServico() {
  try {
    const [{ findSchedules }, { default: db }] = await Promise.all([
      import("../src/services/horariosService.js"),
      import("../src/database/database.js")
    ]);
    const { total } = db.prepare("SELECT COUNT(*) AS total FROM horarios").get();

    if (total === 0) {
      return { skip: "banco vazio: rode `npm run db:import` em server/ para popular o gaia.db" };
    }

    return { findSchedules, total };
  } catch (error) {
    return { skip: `banco indisponível (${error.code ?? error.message})` };
  }
}

const servico = await carregarServico();

test("consultas de horários no SQLite", { skip: servico.skip }, async (t) => {
  const { findSchedules } = servico;

  await t.test(`o banco tem ${TOTAL_DE_AULAS} aulas importadas`, () => {
    assert.equal(servico.total, TOTAL_DE_AULAS);
  });

  for (const { description, filters, expected } of casosDeContagem) {
    await t.test(description, () => {
      assert.equal(findSchedules(filters).length, expected);
    });
  }

  for (const { description, filters, check } of casosDeFiltro) {
    await t.test(description, () => {
      const schedules = findSchedules(filters);

      assert.ok(schedules.length > 0, "nenhum resultado");
      assert.ok(schedules.every(check), "há resultados fora do filtro");
    });
  }

  await t.test("dia inválido gera erro INVALID_WEEKDAY", () => {
    assert.throws(() => findSchedules({ dia: "xyz" }), { code: "INVALID_WEEKDAY" });
  });
});
