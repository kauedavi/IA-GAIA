import "./src/config/env.js";
import express from "express";
import cors from "cors";
import { authRoutes } from "./src/routes/authRoutes.js";
import { chatRoutes } from "./src/routes/chatRoutes.js";
import { spreadsheetRoutes } from "./src/routes/spreadsheetRoutes.js";
import { latencyMetrics } from "./src/middleware/latencyMetrics.js";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";


const app = express();
app.set("trust proxy", 1);

app.use(helmet());

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Limite de requisições atingido. Tente novamente em instantes.",
  },
});

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
    // Explícito para o preflight não barrar o JWT do Supabase (Authorization)
    // nem o token de administrador da planilha.
    allowedHeaders: ["Content-Type", "Accept", "Authorization", "X-GAIA-Admin"],
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

app.use("/api/chat", chatLimiter);

app.use("/api", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", spreadsheetRoutes);
app.use((error, req, res, _next) => {
  const status = [400, 401, 403, 404, 429, 500, 503].includes(error.status) ? error.status : 500;
  const category = ["gemini_failure", "gemini_timeout"].includes(error?.telemetryCategory)
    ? error.telemetryCategory
    : "application_error";
  if (req.latencyMetrics) {
    req.latencyMetrics.logical_result = "failure";
    req.latencyMetrics.error_category = category;
  }
  console.error(JSON.stringify({ event: "api_error", status, category }));
  // Erros de autenticação (e de validação) já trazem mensagem própria;
  // os genéricos abaixo falam do Gemini e não servem para eles.
  const temMensagemPropria =
    [400, 401, 403].includes(status) || String(error?.code || '').startsWith('supabase');
  const message =
    temMensagemPropria
      ? error.message
      : status === 503
        ? "O serviço Gemini está temporariamente indisponível. Tente novamente em instantes."
        : status === 429
          ? "O limite de solicitações do Gemini foi atingido. Tente novamente em instantes."
          : "Erro interno ao processar a solicitação.";
  res.status(status).json({ success: false, error: message });

  const helmet = require("helmet");
  const { rateLimit } = require("express-rate-limit");

  
});

export { app };
