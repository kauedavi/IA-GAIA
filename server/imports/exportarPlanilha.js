// Gera server/src/data/gaia.xlsx (aba "Horarios") a partir do banco gaia.db.
// O chat lê os horários dessa planilha; antes o arquivo não existia e a ferramenta
// consultar_horarios sempre respondia que não havia aulas cadastradas.
// Uso (na raiz do projeto): node server/imports/exportarPlanilha.js
import XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "../src/database/database.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(currentDirectory, "../src/data/gaia.xlsx");
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const rows = db.prepare(`
  SELECT t.nome AS turma, h.grupo, h.dia_semana, h.numero_aula, h.inicio, h.fim,
         COALESCE(d.nome, d.codigo, '') AS disciplina,
         COALESCE(p.nome, '') AS professor,
         COALESCE(a.nome, '') AS sala
  FROM horarios h
  JOIN turmas t ON t.id = h.turma_id
  LEFT JOIN disciplinas d ON d.id = h.disciplina_id
  LEFT JOIN professores p ON p.id = h.professor_id
  LEFT JOIN ambientes a ON a.id = h.ambiente_id
  ORDER BY t.nome, h.dia_semana, h.numero_aula, h.grupo
`).all();

const horarios = rows.map((row) => ({
  Turma: row.grupo && row.grupo !== "ALL" ? `${row.turma} ${row.grupo}` : row.turma,
  Dia: DIAS[row.dia_semana] || String(row.dia_semana),
  "Início": row.inicio,
  Fim: row.fim,
  Disciplina: row.disciplina,
  Professor: row.professor,
  Sala: row.sala,
}));

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(horarios), "Horarios");
XLSX.writeFile(workbook, OUTPUT_PATH);
console.log(`Planilha gerada: ${OUTPUT_PATH} (${horarios.length} aulas)`);
