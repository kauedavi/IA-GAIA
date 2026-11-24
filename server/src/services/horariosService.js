import db from "../database/database.js";

const WEEKDAY_NAMES = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira"
};

// Chaves já normalizadas (sem acento, minúsculas, sem espaços ou símbolos)
const WEEKDAY_ALIASES = {
  segunda: 1, segundafeira: 1, seg: 1, "2feira": 1,
  terca: 2, tercafeira: 2, ter: 2, "3feira": 2,
  quarta: 3, quartafeira: 3, qua: 3, "4feira": 3,
  quinta: 4, quintafeira: 4, qui: 4, "5feira": 4,
  sexta: 5, sextafeira: 5, sex: 5, "6feira": 5,
  sabado: 6, sab: 6,
  domingo: 0, dom: 0
};

const SELECT_SCHEDULES = `
  SELECT
    h.id,
    t.codigo AS turma,
    t.nome AS turmaNome,
    h.dia_semana AS diaSemana,
    h.numero_aula AS numeroAula,
    h.grupo,
    h.inicio,
    h.fim,
    d.codigo AS disciplina,
    p.nome AS professor,
    a.nome AS sala
  FROM horarios h
  JOIN turmas t ON t.id = h.turma_id
  LEFT JOIN disciplinas d ON d.id = h.disciplina_id
  LEFT JOIN professores p ON p.id = h.professor_id
  LEFT JOIN ambientes a ON a.id = h.ambiente_id
`;

const ORDER_SCHEDULES = "ORDER BY h.dia_semana, h.inicio, t.id, h.grupo";

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// "Lab.05", "lab 5" e "laboratório 5" viram a mesma chave: "lab5"
function normalizeRoomName(value) {
  return normalizeText(value)
    .replace("laboratorio", "lab")
    .replace(/(^|\D)0+(?=\d)/g, "$1");
}

export function parseWeekday(text) {
  const weekday = WEEKDAY_ALIASES[normalizeText(text)];

  if (weekday === undefined) {
    throw Object.assign(new Error(`Dia da semana não reconhecido: ${text}`), {
      code: "INVALID_WEEKDAY"
    });
  }

  return weekday;
}

function readSchedules(weekday) {
  const hasWeekday = weekday !== null;
  const whereClause = hasWeekday ? "WHERE h.dia_semana = ?" : "";
  const parameters = hasWeekday ? [weekday] : [];
  const rows = db.prepare(`${SELECT_SCHEDULES} ${whereClause} ${ORDER_SCHEDULES}`).all(...parameters);

  return rows.map((row) => ({ ...row, dia: WEEKDAY_NAMES[row.diaSemana] ?? null }));
}

// Se existir correspondência exata, usa só ela; senão, aceita "contém"
function filterByText({ schedules, readValues, query }) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return schedules;

  const matches = (schedule, compare) =>
    readValues(schedule).some((value) => compare(normalizeText(value)));

  const exactMatches = schedules.filter((schedule) =>
    matches(schedule, (value) => value === normalizedQuery)
  );

  if (exactMatches.length > 0) return exactMatches;

  return schedules.filter((schedule) =>
    matches(schedule, (value) => value.includes(normalizedQuery))
  );
}

// Só número ("5") casa com "lab5", mas nunca com "lab15"
function isSameRoom({ roomName, query }) {
  const roomKey = normalizeRoomName(roomName);
  const queryKey = normalizeRoomName(query);

  if (!queryKey) return true;
  if (roomKey === queryKey) return true;

  return /^\d+$/.test(queryKey) && new RegExp(`\\D${queryKey}$`).test(roomKey);
}

export function findSchedules({ turma, dia, sala, professor, disciplina } = {}) {
  const weekday = dia ? parseWeekday(dia) : null;
  let schedules = readSchedules(weekday);

  schedules = filterByText({ schedules, readValues: (item) => [item.turma, item.turmaNome], query: turma });
  schedules = filterByText({ schedules, readValues: (item) => [item.professor], query: professor });
  schedules = filterByText({ schedules, readValues: (item) => [item.disciplina], query: disciplina });

  if (sala) {
    schedules = schedules.filter((item) => isSameRoom({ roomName: item.sala, query: sala }));
  }

  return schedules;
}