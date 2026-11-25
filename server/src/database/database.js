import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.join(currentDir, "gaia.db");
const schemaPath = path.join(currentDir, "schema.sql");

// O arquivo .db não é versionado: é gerado por server/imports/importarHorarios.js.
// GAIA_DATABASE_PATH permite apontar para outro caminho (produção, testes, volume).
export const databasePath = process.env.GAIA_DATABASE_PATH
  ? path.resolve(process.env.GAIA_DATABASE_PATH)
  : defaultDatabasePath;

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

// Ativa as chaves estrangeiras
db.pragma("foreign_keys = ON");

// Lê e executa a estrutura das tabelas (CREATE TABLE IF NOT EXISTS)
db.exec(fs.readFileSync(schemaPath, "utf8"));

export default db;
