
import db from "./database.js";

const tabelas = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

console.log("Tabelas encontradas no banco GAIA:");
console.table(tabelas);
