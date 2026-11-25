import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import XLSX from "xlsx";
import { fallbackSalas } from "../data/fallbackSalas.js";

const MAX_SCHEDULE_CACHE_ENTRIES = 128;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.resolve(currentDir, "../../data/gaia.xlsx");

let spreadsheetPath = process.env.GAIA_SPREADSHEET_PATH
  ? path.resolve(process.env.GAIA_SPREADSHEET_PATH)
  : defaultPath;
let state = { horarios: [], salas: [], cursos: [], loadedAt: null, source: null };
const listeners = new Set();
let watcher = null;
const scheduleCache = new Map();

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function findValue(row, aliases) {
  const keys = new Map(Object.keys(row).map((key) => [normalizeKey(key), key]));
  for (const alias of aliases) {
    const key = keys.get(normalizeKey(alias));
    if (key !== undefined && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
}

function asText(value) {
  return String(value ?? "").trim();
}

function asNumber(value, fallback = null) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

function normalizeDay(value) {
  const text = normalizeKey(value);
  const map = {
    domingo: 0, dom: 0,
    segunda: 1, seg: 1, "2feira": 1,
    terca: 2, ter: 2, "3feira": 2,
    quarta: 3, qua: 3, "4feira": 3,
    quinta: 4, qui: 4, "5feira": 4,
    sexta: 5, sex: 5, "6feira": 5,
    sabado: 6, sab: 6,
  };
  if (map[text] !== undefined) return map[text];
  const number = Number.parseInt(text, 10);
  return Number.isInteger(number) && number >= 0 && number <= 6 ? number : text;
}

function normalizeTime(value) {
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  }
  return asText(value).replace(".", ":").slice(0, 5);
}

function findSheet(workbook, names) {
  const wanted = names.map(normalizeKey);
  const name = workbook.SheetNames.find((sheetName) => wanted.includes(normalizeKey(sheetName)));
  return name ? workbook.Sheets[name] : null;
}

function parseHorarios(workbook) {
  const sheet = findSheet(workbook, ["horarios", "horarios de aula", "grade", "aulas"]);
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }).map((row, index) => {
    const turma = asText(findValue(row, ["turma", "curso", "classe", "codigo turma"]));
    const dia = normalizeDay(findValue(row, ["dia", "dia da semana", "dia_semana"]));
    const inicio = normalizeTime(findValue(row, ["inicio", "hora inicio", "horario inicio", "inicio aula"]));
    const fim = normalizeTime(findValue(row, ["fim", "hora fim", "horario fim", "termino", "fim aula"]));
    const disciplina = asText(findValue(row, ["disciplina", "materia", "componente", "uc", "nome disciplina"]));
    const professor = asText(findValue(row, ["professor", "docente", "instrutor"]));
    const sala = asText(findValue(row, ["sala", "numero sala", "local", "ambiente"]));
    if (!turma && !disciplina && !sala) return null;
    return { id: `x-${index + 1}`, turma, dia, inicio, fim, disciplina, professor, sala, tipo: "aula" };
  }).filter(Boolean);
}

function parseSalas(workbook) {
  const sheet = findSheet(workbook, ["salas", "salas de aula", "ambientes", "locais"]);
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }).map((row, index) => {
    const id = asText(findValue(row, ["id", "codigo", "sala", "numero", "codigo sala"]));
    if (!id) return null;
    const nome = asText(findValue(row, ["nome", "nome sala", "descricao", "ambiente"])) || `Sala ${id}`;
    return {
      id,
      nome,
      bloco: asText(findValue(row, ["bloco", "predio", "area"])),
      andar: asNumber(findValue(row, ["andar", "pavimento", "nivel"]), 0),
      x: asNumber(findValue(row, ["x", "posicao x", "coord x"]), null),
      y: asNumber(findValue(row, ["y", "posicao y", "coord y"]), null),
      tipo: asText(findValue(row, ["tipo"])) || "sala",
      dica: asText(findValue(row, ["dica", "referencia"])),
    };
  }).filter(Boolean);
}

function parseCursos(workbook) {
  const sheet = findSheet(workbook, ["cursos", "oferta", "turmas"]);
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }).map((row) => {
    const nome = asText(findValue(row, ["curso", "nome", "nome curso", "descricao"]));
    if (!nome) return null;
    return {
      nome,
      codigo: asText(findValue(row, ["codigo", "codigo curso", "sigla"])),
      nivel: asText(findValue(row, ["nivel", "tipo curso"])),
      turma: asText(findValue(row, ["turma"])),
      turno: asText(findValue(row, ["turno"])),
      modalidade: asText(findValue(row, ["modalidade"])),
      descricao: asText(findValue(row, ["descricao", "detalhes", "ementa"])),
    };
  }).filter(Boolean);
}

export function reloadSpreadsheet(filePath = spreadsheetPath) {
  spreadsheetPath = path.resolve(filePath);
  if (!fs.existsSync(spreadsheetPath)) {
    state = { horarios: [], salas: [], cursos: [], loadedAt: new Date(), source: null };
    scheduleCache.clear();
    return getSpreadsheetData();
  }

  const workbook = XLSX.readFile(spreadsheetPath, { cellDates: true });
  const next = {
    horarios: parseHorarios(workbook),
    salas: parseSalas(workbook),
    cursos: parseCursos(workbook),
    loadedAt: new Date(),
    source: path.basename(spreadsheetPath),
  };
  state = next;
  scheduleCache.clear();
  for (const listener of listeners) listener(getSpreadsheetData());
  return getSpreadsheetData();
}

export function getSpreadsheetData() {
  return {
    horarios: state.horarios,
    salas: state.salas,
    cursos: state.cursos,
    loadedAt: state.loadedAt,
    source: state.source,
  };
}

export function getHorarios({ turma, dia, sala } = {}, metrics) {
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const normalizeFilter = (value) => value ? normalize(value) : "";
  const normalizedDay = dia ? normalize(String(normalizeDay(dia))) : "";
  const cacheKey = JSON.stringify([
    normalizeFilter(turma),
    normalizedDay,
    dia ? normalize(dia) : "",
    normalizeFilter(sala),
  ]);
  const startedAt = performance.now();
  const cacheHit = scheduleCache.has(cacheKey);
  let matches;

  if (cacheHit) {
    matches = scheduleCache.get(cacheKey);
    scheduleCache.delete(cacheKey);
    scheduleCache.set(cacheKey, matches);
    if (metrics) {
      metrics.schedule_cache_hits = (metrics.schedule_cache_hits || 0) + 1;
    }
  } else {
    matches = state.horarios.filter((item) => {
      const dayMatches = !dia || normalize(String(normalizeDay(dia))) === normalize(String(item.dia)) || normalize(item.dia) === normalize(dia);
      return (!turma || normalize(item.turma).includes(normalize(turma))) &&
        dayMatches && (!sala || normalize(item.sala).includes(normalize(sala)));
    });
    if (scheduleCache.size >= MAX_SCHEDULE_CACHE_ENTRIES) {
      scheduleCache.delete(scheduleCache.keys().next().value);
    }
    scheduleCache.set(cacheKey, matches.slice());
    if (metrics) {
      metrics.schedule_cache_misses = (metrics.schedule_cache_misses || 0) + 1;
    }
  }

  const result = cacheHit ? matches.slice() : matches;
  if (metrics) {
    const duration = Math.round((performance.now() - startedAt) * 1000) / 1000;
    const durationKey = cacheHit
      ? "schedule_cache_hit_duration_ms"
      : "schedule_cache_miss_duration_ms";
    metrics[durationKey] = (metrics[durationKey] || 0) + duration;
  }
  return result;
}

export function getSalas() {
  return state.salas;
}

export function findExactSala(destino) {
  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const query = normalize(destino);
  if (!query) return null;

  const matches = (salas) => salas.filter((sala) =>
    normalize(sala.id) === query || normalize(sala.nome) === query
  );
  const spreadsheetMatches = matches(state.salas);
  if (spreadsheetMatches.length) {
    return spreadsheetMatches.length === 1 ? spreadsheetMatches[0] : null;
  }

  const fallbackMatches = matches(fallbackSalas);
  return fallbackMatches.length === 1 ? fallbackMatches[0] : null;
}

export function findSala(destino) {
  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const query = normalize(destino);
  const spreadsheetMatch = state.salas.find((item) =>
    String(item.id).toLowerCase() === query ||
    String(item.nome).toLowerCase().includes(query)
  );
  if (spreadsheetMatch) return spreadsheetMatch;

  return fallbackSalas.find((item) =>
    normalize(item.id) === query ||
    normalize(item.nome).includes(query) ||
    query.includes(normalize(item.id)) ||
    (normalize(item.id) === "biblioteca" && ["biblioteca", "livros", "estudo"].some((alias) => query.includes(alias)))
  ) || null;
}

export function saveSpreadsheetFromUpload(uploadPath, originalName) {
  fs.mkdirSync(path.dirname(spreadsheetPath), { recursive: true });
  const extension = path.extname(originalName || "").toLowerCase();
  if (![".xlsx", ".xls", ".csv"].includes(extension)) {
    throw Object.assign(new Error("Formato não suportado. Use .xlsx, .xls ou .csv."), { status: 400 });
  }
  fs.copyFileSync(uploadPath, spreadsheetPath);
  fs.rmSync(uploadPath, { force: true });
  return reloadSpreadsheet(spreadsheetPath);
}

export function subscribeSpreadsheet(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startSpreadsheetWatcher(filePath = spreadsheetPath) {
  spreadsheetPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(spreadsheetPath), { recursive: true });
  reloadSpreadsheet(spreadsheetPath);

  if (watcher) watcher.close();
  watcher = fs.watch(path.dirname(spreadsheetPath), (_event, filename) => {
    if (!filename || path.basename(filename) !== path.basename(spreadsheetPath)) return;
    setTimeout(() => {
      try { reloadSpreadsheet(spreadsheetPath); } catch (error) { console.error("Erro ao atualizar planilha:", error.message); }
    }, 150);
  });
  return spreadsheetPath;
}
