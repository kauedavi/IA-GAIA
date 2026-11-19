
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.join(__dirname, "gaia.db");
const schemaPath = path.join(__dirname, "schema.sql");

const db = new Database(databasePath);

// Ativa as chaves estrangeiras
db.pragma("foreign_keys = ON");

// Lê e executa a estrutura das tabelas
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

console.log("Banco de dados GAIA inicializado com sucesso!");

export default db;
