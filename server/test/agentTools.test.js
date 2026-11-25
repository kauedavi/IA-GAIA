import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import { after, before, test } from "node:test";
import { consultarRota } from "../src/agent/tools/gpsTool.js";
import { consultarHorarios } from "../src/agent/tools/horariosTool.js";
import { reloadSpreadsheet } from "../src/services/spreadsheetService.js";

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-agent-tools-"));
const spreadsheetPath = path.join(temporaryDirectory, "schedule.xlsx");

function writeSchedules(schedules) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(schedules), "Horarios");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([{
      id: "S-404",
      nome: "Sala 404",
      bloco: "Bloco A",
      andar: 2,
      x: 120,
      y: 240,
      tipo: "laboratorio",
      dica: "Ao lado da biblioteca.",
    }]),
    "Salas"
  );
  XLSX.writeFile(workbook, spreadsheetPath);
  reloadSpreadsheet(spreadsheetPath);
}

before(() => {
  const schedules = Array.from({ length: 40 }, (_, index) => ({
    turma: `T-${index + 1}`,
    dia: "Segunda",
    inicio: "08:00",
    fim: "09:00",
    disciplina: `Disciplina ${index + 1}`,
    professor: `Professor ${index + 1}`,
    sala: `Sala ${index + 1}`,
  }));
  writeSchedules(schedules);
});

after(() => {
  reloadSpreadsheet(path.join(temporaryDirectory, "missing.xlsx"));
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("returns every matching schedule with answer fields only", () => {
  const result = consultarHorarios();

  assert.equal(result.encontrados, 40);
  assert.equal(result.horarios.length, 40);
  assert.deepEqual(Object.keys(result.horarios[0]), [
    "turma",
    "dia",
    "inicio",
    "fim",
    "disciplina",
    "professor",
    "sala",
  ]);
  assert.equal(result.horarios[39].turma, "T-40");
  assert.ok(!("fonte" in result));

  const fullRowsPayload = JSON.stringify({
    encontrados: result.encontrados,
    horarios: result.horarios.map((horario, index) => ({
      id: `x-${index + 1}`,
      ...horario,
      tipo: "aula",
    })),
    fonte: "planilha_excel",
  });
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < Buffer.byteLength(fullRowsPayload));
});

test("returns an explicit empty schedule result without truncation metadata", () => {
  assert.deepEqual(consultarHorarios({ turma: "inexistente" }), {
    encontrados: 0,
    horarios: [],
  });
});

test("reuses repeated schedule results and invalidates them after a spreadsheet reload", () => {
  const metrics = {};
  const firstResult = consultarHorarios({ turma: "T-1" }, metrics);
  const cachedResult = consultarHorarios({ turma: "t-1" }, metrics);

  assert.deepEqual(cachedResult, firstResult);
  assert.equal(metrics.schedule_cache_misses, 1);
  assert.equal(metrics.schedule_cache_hits, 1);
  assert.ok(metrics.schedule_cache_miss_duration_ms >= 0);
  assert.ok(metrics.schedule_cache_hit_duration_ms >= 0);

  writeSchedules([{
    turma: "T-1",
    dia: "Segunda",
    inicio: "10:00",
    fim: "11:00",
    disciplina: "Disciplina atualizada",
    professor: "Professor atualizado",
    sala: "Sala 1",
  }]);

  const refreshedMetrics = {};
  const refreshedResult = consultarHorarios({ turma: "T-1" }, refreshedMetrics);
  assert.equal(refreshedResult.horarios[0].disciplina, "Disciplina atualizada");
  assert.ok(!refreshedResult.horarios.some(({ disciplina }) => disciplina === "Disciplina 1"));
  assert.equal(refreshedMetrics.schedule_cache_misses, 1);
  assert.equal(refreshedMetrics.schedule_cache_hits || 0, 0);
});

test("keeps the navigation action while returning only route details for the model", () => {
  const result = consultarRota({ destino: "S-404" });

  assert.deepEqual(result, {
    encontrado: true,
    sala: {
      nome: "Sala 404",
      bloco: "Bloco A",
      andar: 2,
      dica: "Ao lado da biblioteca.",
    },
    action: { type: "NAVIGATE_TO_ROOM", roomId: "S-404" },
  });
  assert.ok(!("x" in result.sala));
  assert.ok(!("tipo" in result.sala));
});

test("reports when a requested room is not found", () => {
  assert.deepEqual(consultarRota({ destino: "sala inexistente" }), {
    encontrado: false,
    mensagem: "Sala não encontrada na planilha atual.",
  });
});
