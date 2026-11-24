import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summarizeLatencyRecords } from "../src/observability/latencySummary.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node server/scripts/summarize-latency.js <arquivo-de-logs.jsonl>");
  process.exitCode = 2;
} else {
  const logLines = readFileSync(resolve(inputPath), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const records = logLines.map((line) => JSON.parse(line));
  console.log(JSON.stringify(summarizeLatencyRecords(records), null, 2));
}
