import db from "../src/database/database.js";
import XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const SPREADSHEET_PATH = path.join(currentDirectory, "Horários Tarde.xlsx");
const SCHEDULE_SHEET_NAME = "HorárioTARDE";
const LISTS_SHEET_NAME = "Listas";
const LESSON_LABEL_PATTERN = /^Aula[1-5]$/i;
const FIRST_LESSON_LABEL_PATTERN = /^Aula1$/i;
const TIME_RANGE_PATTERN = /^(\d{1,2})h(\d{0,2})\s*[-–]\s*(\d{1,2})h(\d{0,2})$/;
const CLASS_CODE_PATTERN = /\(([^)]+)\)/;
const GROUP_NAMES = ["T1", "T2"];

// Colunas (base 0) de T1 e T2 de cada dia da semana (1 = segunda ... 5 = sexta)
const WEEKDAY_COLUMNS = [
  { weekday: 1, columns: [4, 5] },
  { weekday: 2, columns: [7, 8] },
  { weekday: 3, columns: [10, 11] },
  { weekday: 4, columns: [13, 14] },
  { weekday: 5, columns: [16, 17] }
];

// Ordem importa: tabelas "filhas" (horarios) primeiro ao apagar
const IMPORTED_TABLES = ["horarios", "turmas", "disciplinas", "professores", "ambientes"];

function readText(value) {
  return String(value ?? "").trim();
}

function readSheetRows({ workbook, sheetName }) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`A aba ${sheetName} não foi encontrada.`);
  }

  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });
}

// Lê uma coluna da aba Listas pelo nome do cabeçalho (primeira linha), sem repetições
function readListColumn({ rows, headerName }) {
  const columnIndex = (rows[0] ?? []).findIndex((header) => readText(header) === headerName);

  if (columnIndex === -1) {
    throw new Error(`A coluna ${headerName} não foi encontrada na aba ${LISTS_SHEET_NAME}.`);
  }

  const values = rows.slice(1).map((row) => readText(row[columnIndex])).filter(Boolean);

  return [...new Set(values)];
}

function extractCatalog(rows) {
  return {
    rooms: readListColumn({ rows, headerName: "Ambientes" }),
    teachers: readListColumn({ rows, headerName: "Docentes" })
  };
}

function findClassBlocks(rows) {
  const blocks = [];

  rows.forEach((row, rowIndex) => {
    const className = readText(row[0]);
    const lessonLabel = readText(row[1]);

    if (className && FIRST_LESSON_LABEL_PATTERN.test(lessonLabel)) {
      blocks.push({ rowIndex, className });
    }
  });

  return blocks;
}

function formatTime(hourText, minuteText) {
  const hour = Number(hourText);
  const minute = minuteText === "" ? 0 : Number(minuteText);

  if (hour > 23 || minute > 59) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeRange(text) {
  const match = text.match(TIME_RANGE_PATTERN);

  if (!match) return null;

  const startTime = formatTime(match[1], match[2]);
  const endTime = formatTime(match[3], match[4]);

  if (!startTime || !endTime || startTime >= endTime) return null;

  return { startTime, endTime };
}

// Cada aula ocupa 3 linhas: disciplina, professor e ambiente
function extractLessonsFromRow({ rows, rowIndex, className }) {
  const lessonLabel = readText(rows[rowIndex]?.[1]);

  if (!LESSON_LABEL_PATTERN.test(lessonLabel)) return [];

  const rawTime = readText(rows[rowIndex][2]);
  const timeRange = parseTimeRange(rawTime);

  if (!timeRange) {
    throw new Error(`Horário inválido (${rawTime}) na turma ${className}, linha ${rowIndex + 1}.`);
  }

  const lessons = [];

  for (const { weekday, columns } of WEEKDAY_COLUMNS) {
    columns.forEach((column, groupIndex) => {
      const subject = readText(rows[rowIndex][column]);

      if (!subject) return;

      lessons.push({
        className,
        weekday,
        lessonNumber: Number(lessonLabel.slice(4)),
        groupName: GROUP_NAMES[groupIndex],
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        subject,
        teacher: readText(rows[rowIndex + 1]?.[column]),
        room: readText(rows[rowIndex + 2]?.[column])
      });
    });
  }

  return lessons;
}

function extractLessons(rows) {
  const classBlocks = findClassBlocks(rows);
  const lessons = [];

  classBlocks.forEach((block, blockIndex) => {
    const endIndex = classBlocks[blockIndex + 1]?.rowIndex ?? rows.length;

    for (let rowIndex = block.rowIndex; rowIndex < endIndex; rowIndex += 1) {
      lessons.push(...extractLessonsFromRow({ rows, rowIndex, className: block.className }));
    }
  });

  return lessons;
}

function extractClassCode(className) {
  const classCode = className.match(CLASS_CODE_PATTERN)?.[1];

  if (!classCode) {
    throw new Error(`Código da turma não encontrado: ${className}`);
  }

  return classCode;
}

function clearImportedTables() {
  for (const tableName of IMPORTED_TABLES) {
    db.prepare(`DELETE FROM ${tableName}`).run();
  }

  const placeholders = IMPORTED_TABLES.map(() => "?").join(", ");
  db.prepare(`DELETE FROM sqlite_sequence WHERE name IN (${placeholders})`).run(...IMPORTED_TABLES);
}

// Busca o id pela chave única; só insere se ainda não existir (evita "buracos" nos ids)
function createIdResolver({ selectSql, insertSql }) {
  const selectStatement = db.prepare(selectSql);
  const insertStatement = db.prepare(insertSql);

  return (...values) => {
    const existingRow = selectStatement.get(values[0]);

    if (existingRow) return existingRow.id;

    return Number(insertStatement.run(...values).lastInsertRowid);
  };
}

function createResolvers() {
  return {
    classId: createIdResolver({
      selectSql: "SELECT id FROM turmas WHERE codigo = ?",
      insertSql: "INSERT INTO turmas (codigo, nome) VALUES (?, ?)"
    }),
    subjectId: createIdResolver({
      selectSql: "SELECT id FROM disciplinas WHERE codigo = ?",
      insertSql: "INSERT INTO disciplinas (codigo, nome) VALUES (?, ?)"
    }),
    teacherId: createIdResolver({
      selectSql: "SELECT id FROM professores WHERE nome = ?",
      insertSql: "INSERT INTO professores (nome) VALUES (?)"
    }),
    roomId: createIdResolver({
      selectSql: "SELECT id FROM ambientes WHERE nome = ?",
      insertSql: "INSERT INTO ambientes (nome) VALUES (?)"
    })
  };
}

function createInsertScheduleStatement() {
  return db.prepare(`
    INSERT INTO horarios (
      turma_id, disciplina_id, professor_id, ambiente_id,
      dia_semana, numero_aula, grupo, inicio, fim
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
}

function insertLesson({ lesson, resolvers, insertSchedule }) {
  const classId = resolvers.classId(extractClassCode(lesson.className), lesson.className);
  const subjectId = resolvers.subjectId(lesson.subject, lesson.subject);
  const teacherId = lesson.teacher ? resolvers.teacherId(lesson.teacher) : null;
  const roomId = lesson.room ? resolvers.roomId(lesson.room) : null;

  insertSchedule.run(
    classId,
    subjectId,
    teacherId,
    roomId,
    lesson.weekday,
    lesson.lessonNumber,
    lesson.groupName,
    lesson.startTime,
    lesson.endTime
  );
}

// Cadastra todos os ambientes e docentes da aba Listas, mesmo os que não têm aula
function insertCatalog({ catalog, resolvers }) {
  catalog.rooms.forEach((roomName) => resolvers.roomId(roomName));
  catalog.teachers.forEach((teacherName) => resolvers.teacherId(teacherName));
}

// Tudo dentro de uma transação: se algo falhar, o banco volta ao estado anterior
const replaceAllData = db.transaction(({ lessons, catalog }) => {
  clearImportedTables();

  const resolvers = createResolvers();
  const insertSchedule = createInsertScheduleStatement();

  insertCatalog({ catalog, resolvers });

  for (const lesson of lessons) {
    insertLesson({ lesson, resolvers, insertSchedule });
  }
});

function printSummary() {
  const totals = IMPORTED_TABLES.map((tableName) => ({
    tabela: tableName,
    total: db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get().total
  }));

  const lessonsPerClass = db.prepare(`
    SELECT t.id, t.codigo, COUNT(h.id) AS aulas
    FROM turmas t
    LEFT JOIN horarios h ON h.turma_id = t.id
    GROUP BY t.id
    ORDER BY t.id
  `).all();

  console.log("\nTotais no banco:");
  console.table(totals);
  console.log("Aulas por turma:");
  console.table(lessonsPerClass);
}

function main() {
  const workbook = XLSX.readFile(SPREADSHEET_PATH);
  const lessons = extractLessons(readSheetRows({ workbook, sheetName: SCHEDULE_SHEET_NAME }));
  const catalog = extractCatalog(readSheetRows({ workbook, sheetName: LISTS_SHEET_NAME }));

  console.log(`Aulas extraídas da planilha: ${lessons.length}`);
  console.log(`Ambientes na aba Listas: ${catalog.rooms.length}`);
  console.log(`Docentes na aba Listas: ${catalog.teachers.length}`);

  if (lessons.length === 0) {
    throw new Error("Nenhuma aula encontrada. O banco não foi alterado.");
  }

  replaceAllData({ lessons, catalog });
  console.log("Importação concluída!");
  printSummary();
}

try {
  main();
} catch (error) {
  console.error("Falha na importação:", error.message);
  process.exitCode = 1;
}