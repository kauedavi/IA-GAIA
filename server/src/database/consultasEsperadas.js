// Casos esperados das consultas de horários, compartilhados entre
// server/src/database/testarConsultas.js (script manual) e
// server/test/horariosDatabase.test.js (roda no `npm test`).
//
// Os números refletem a importação de "Horários Tarde.xlsx":
// 13 turmas, 35 disciplinas, 22 professores, 24 ambientes, 348 aulas.
// Sexta-feira tem 0 aulas porque a planilha só traz o cabeçalho do dia.

// Casos que conferem a QUANTIDADE de resultados.
export const casosDeContagem = [
  { description: "Sem filtros", filters: {}, expected: 348 },
  { description: "Turma 1DEVM-A", filters: { turma: "1DEVM-A" }, expected: 32 },
  { description: "Turma 1devm-a (minúsculas)", filters: { turma: "1devm-a" }, expected: 32 },
  { description: "1DEVM-A na segunda", filters: { turma: "1DEVM-A", dia: "segunda-feira" }, expected: 8 },
  { description: "Terça (todas as turmas)", filters: { dia: "Terça" }, expected: 96 },
  { description: "Turma por nome: eletronica", filters: { turma: "eletronica" }, expected: 72 },
  { description: "Sala: Lab.05", filters: { sala: "Lab.05" }, expected: 26 },
  { description: "Sala: lab 5", filters: { sala: "lab 5" }, expected: 26 },
  { description: "Sala: 5", filters: { sala: "5" }, expected: 26 },
  { description: "Sala: lab 1 (não pega Lab.10)", filters: { sala: "lab 1" }, expected: 18 },
  { description: "Sala: laboratório 3", filters: { sala: "laboratório 3" }, expected: 20 },
  { description: "Professor: Elias (não pega M. Elias)", filters: { professor: "Elias" }, expected: 15 },
  { description: "Professor: M. Elias", filters: { professor: "M. Elias" }, expected: 14 },
  { description: "Professor sem acento: claudio", filters: { professor: "claudio" }, expected: 14 },
  { description: "Professor sem acento: natalia", filters: { professor: "natalia" }, expected: 14 },
  { description: "Disciplina: ARI", filters: { disciplina: "ari" }, expected: 10 },
  { description: "Domingo (sem aulas)", filters: { dia: "domingo" }, expected: 0 }
];

// Casos que conferem que TODO resultado respeita o filtro.
export const casosDeFiltro = [
  {
    description: "Professor Elias só retorna Elias",
    filters: { professor: "Elias" },
    check: (item) => item.professor === "Elias"
  }
];

// O total de aulas esperado quando o banco está populado.
export const TOTAL_DE_AULAS = 348;
