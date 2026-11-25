import "./src/config/env.js";
import express from "express";
import cors from "cors";
import { chatRoutes } from "./src/routes/chatRoutes.js";
import { spreadsheetRoutes } from "./src/routes/spreadsheetRoutes.js";
import { latencyMetrics } from "./src/middleware/latencyMetrics.js";

const app = express();

const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [
  "http://localhost",
  "https://localhost",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  ...configuredOrigins,
].filter((origin, index, origins) => origins.indexOf(origin) === index);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origem não autorizada pelo CORS."));
    },
  })
);
app.use((req, res, next) => {
  if (req.method === "POST" && ["/api/chat", "/api/chat/stream"].includes(req.path)) {
    return latencyMetrics(req, res, next);
  }
  return next();
});
app.use(express.json({ limit: "32kb" }));
app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
app.use("/api", chatRoutes);
app.use("/api", spreadsheetRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = [400, 404, 429, 500, 503].includes(error.status) ? error.status : 500;
  const message =
    status === 400
      ? error.message
      : status === 503
        ? "O serviço Gemini está temporariamente indisponível. Tente novamente em instantes."
        : status === 429
          ? "O limite de solicitações do Gemini foi atingido. Tente novamente em instantes."
          : "Erro interno ao processar a solicitação.";
  res.status(status).json({ success: false, error: message });
});

export { app };
