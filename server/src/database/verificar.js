import db from "./database.js";

const TABLE_NAMES = ["turmas", "disciplinas", "professores", "ambientes", "horarios"];

const tableTotals = TABLE_NAMES.map((tableName) => ({
  tabela: tableName,
  total: db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get().total
}));

console.log("Tabelas encontradas no banco GAIA:");
console.table(tableTotals);

const foreignKeyViolations = db.pragma("foreign_key_check");
console.log("Violações de chave estrangeira:", foreignKeyViolations.length);