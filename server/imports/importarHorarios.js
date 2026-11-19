import db from "../src/database/database.js";
import XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const arquivo = path.join(__dirname, "Horários Tarde.xlsx");

const workbook = XLSX.readFile(arquivo);

console.log("Abas encontradas:");
console.log(workbook.SheetNames);

const planilha = workbook.Sheets["HorárioTARDE"];

if (!planilha) {
  throw new Error("A aba HorárioTARDE não foi encontrada.");
}

const linhas = XLSX.utils.sheet_to_json(planilha, {
  header: 1,
  defval: "",
  blankrows: false
});

console.log("\nPrimeiras 15 linhas da planilha:");

console.table(
  linhas.slice(0, 35).map((linha, indice) => ({
    linha: indice + 1,
    turma: linha[0],
    aula: linha[1],
    horario: linha[2],
    segunda_T1: linha[4],
    segunda_T2: linha[5],
    terca_T1: linha[7],
    terca_T2: linha[8]
  }))
);

console.log("\nTotal de linhas lidas:", linhas.length);


const turmas = [];

for (let i = 0; i < linhas.length; i++) {
  const turma = String(linhas[i][0] ?? "").trim();
  const aula = String(linhas[i][1] ?? "").trim();

  // Identifica o início do bloco de cada turma
  if (turma && /^Aula1$/i.test(aula)) {
    turmas.push({
      linha: i + 1,
      turma
    });
  }
}

console.log("\nTurmas identificadas:");
console.table(turmas);

console.log("\nTotal de turmas:", turmas.length);


const aulasExtraidas = [];

const dias = [
  { nome: "Segunda", numero: 1, colunas: [4, 5] },
  { nome: "Terça", numero: 2, colunas: [7, 8] },
  { nome: "Quarta", numero: 3, colunas: [10, 11] },
  { nome: "Quinta", numero: 4, colunas: [13, 14] },
  { nome: "Sexta", numero: 5, colunas: [16, 17] }
];

const texto = (valor) => String(valor ?? "").trim();

for (let t = 0; t < turmas.length; t++) {
  const turmaAtual = turmas[t];
  const inicio = turmaAtual.linha - 1;

  const fim = t + 1 < turmas.length
    ? turmas[t + 1].linha - 1
    : linhas.length;

  for (let i = inicio; i < fim; i++) {
    const numeroAula = texto(linhas[i]?.[1]);
    const horario = texto(linhas[i]?.[2]);

    if (!/^Aula[1-5]$/i.test(numeroAula)) {
      continue;
    }

    for (const dia of dias) {
      for (let grupoIndex = 0; grupoIndex < 2; grupoIndex++) {
        const coluna = dia.colunas[grupoIndex];

        const disciplina = texto(linhas[i]?.[coluna]);
        const professor = texto(linhas[i + 1]?.[coluna]);
        const ambiente = texto(linhas[i + 2]?.[coluna]);

        if (!disciplina) continue;

        aulasExtraidas.push({
          turma: turmaAtual.turma,
          dia: dia.nome,
          dia_semana: dia.numero,
          aula: numeroAula,
          grupo: grupoIndex === 0 ? "T1" : "T2",
          horario,
          disciplina,
          professor,
          ambiente
        });
      }
    }
  }
}

console.log("\nTotal de registros extraídos:", aulasExtraidas.length);

console.log("\nPrimeiros 15 registros:");
console.table(aulasExtraidas.slice(0, 15));

console.log("\nAulas da turma 1DEVM-A:");
console.table(
  aulasExtraidas
    .filter((aula) => aula.turma.includes("(1DEVM-A)"))
    .slice(0, 15)
);



function converterHorario(horario) {
  const resultado = String(horario).trim().match(
    /^(\d{1,2})h(\d{0,2})\s*[-–]\s*(\d{1,2})h(\d{0,2})$/
  );

  if (!resultado) {
    return null;
  }

  const formatar = (hora, minuto) => {
    const h = Number(hora);
    const m = minuto === "" ? 0 : Number(minuto);

    if (h > 23 || m > 59) {
      return null;
    }

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const inicio = formatar(resultado[1], resultado[2]);
  const fim = formatar(resultado[3], resultado[4]);

  if (!inicio || !fim || inicio >= fim) {
    return null;
  }

  return { inicio, fim };
}


const registrosValidados = [];
const registrosInvalidos = [];

for (const aula of aulasExtraidas) {
  const horario = converterHorario(aula.horario);

  if (!horario) {
    registrosInvalidos.push({
      turma: aula.turma,
      dia: aula.dia,
      aula: aula.aula,
      horario: aula.horario
    });

    continue;
  }

  registrosValidados.push({
    ...aula,
    inicio: horario.inicio,
    fim: horario.fim,
    numero_aula: Number(aula.aula.replace("Aula", ""))
  });
}

console.log("\nRegistros válidos:", registrosValidados.length);
console.log("Registros com problemas:", registrosInvalidos.length);

if (registrosInvalidos.length > 0) {
  console.table(registrosInvalidos);
}

console.log("\nAmostra dos registros preparados:");
console.table(registrosValidados.slice(0, 10));


if (registrosInvalidos.length > 0) {
  throw new Error("Importação cancelada: existem horários inválidos.");
}

const inserirTurma = db.prepare(`
  INSERT OR IGNORE INTO turmas (codigo, nome)
  VALUES (?, ?)
`);

const inserirDisciplina = db.prepare(`
  INSERT OR IGNORE INTO disciplinas (codigo, nome)
  VALUES (?, ?)
`);

const inserirProfessor = db.prepare(`
  INSERT OR IGNORE INTO professores (nome)
  VALUES (?)
`);

const inserirAmbiente = db.prepare(`
  INSERT OR IGNORE INTO ambientes (nome)
  VALUES (?)
`);

const buscarTurma = db.prepare(
  "SELECT id FROM turmas WHERE codigo = ?"
);

const buscarDisciplina = db.prepare(
  "SELECT id FROM disciplinas WHERE codigo = ?"
);

const buscarProfessor = db.prepare(
  "SELECT id FROM professores WHERE nome = ?"
);

const buscarAmbiente = db.prepare(
  "SELECT id FROM ambientes WHERE nome = ?"
);

const inserirHorario = db.prepare(`
  INSERT INTO horarios (
    turma_id,
    disciplina_id,
    professor_id,
    ambiente_id,
    dia_semana,
    numero_aula,
    grupo,
    inicio,
    fim
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(turma_id, dia_semana, numero_aula, grupo)
  DO UPDATE SET
    disciplina_id = excluded.disciplina_id,
    professor_id = excluded.professor_id,
    ambiente_id = excluded.ambiente_id,
    inicio = excluded.inicio,
    fim = excluded.fim
`);

const importar = db.transaction(() => {
  for (const aula of registrosValidados) {
    const codigoTurma =
      aula.turma.match(/\(([^)]+)\)/)?.[1];

    if (!codigoTurma) {
      throw new Error(`Código da turma não encontrado: ${aula.turma}`);
    }

    inserirTurma.run(codigoTurma, aula.turma);
    inserirDisciplina.run(aula.disciplina, aula.disciplina);

    const turmaId = buscarTurma.get(codigoTurma).id;
    const disciplinaId = buscarDisciplina.get(aula.disciplina).id;

    let professorId = null;
    let ambienteId = null;

    if (aula.professor) {
      inserirProfessor.run(aula.professor);
      professorId = buscarProfessor.get(aula.professor).id;
    }

    if (aula.ambiente) {
      inserirAmbiente.run(aula.ambiente);
      ambienteId = buscarAmbiente.get(aula.ambiente).id;
    }

    inserirHorario.run(
      turmaId,
      disciplinaId,
      professorId,
      ambienteId,
      aula.dia_semana,
      aula.numero_aula,
      aula.grupo,
      aula.inicio,
      aula.fim
    );
  }
});

importar();

console.log("\nImportação concluída!");

console.table({
  turmas: db.prepare("SELECT COUNT(*) AS total FROM turmas").get().total,
  disciplinas: db.prepare("SELECT COUNT(*) AS total FROM disciplinas").get().total,
  professores: db.prepare("SELECT COUNT(*) AS total FROM professores").get().total,
  ambientes: db.prepare("SELECT COUNT(*) AS total FROM ambientes").get().total,
  horarios: db.prepare("SELECT COUNT(*) AS total FROM horarios").get().total
});