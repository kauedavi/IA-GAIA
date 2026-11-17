import multer from "multer";
import os from "node:os";
import path from "node:path";
import {
  getSpreadsheetData,
  reloadSpreadsheet,
  saveSpreadsheetFromUpload,
  subscribeSpreadsheet,
} from "../services/spreadsheetService.js";

export const spreadsheetUpload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, [".xlsx", ".xls", ".csv"].includes(extension));
  },
});

export function spreadsheetStatus(_req, res) {
  const data = getSpreadsheetData();
  res.json({
    success: true,
    data: {
      source: data.source,
      loadedAt: data.loadedAt,
      counts: {
        horarios: data.horarios.length,
        salas: data.salas.length,
        cursos: data.cursos.length,
      },
    },
  });
}

export function spreadsheetList(_req, res) {
  res.json({ success: true, data: getSpreadsheetData() });
}

export function spreadsheetReload(_req, res, next) {
  try {
    const data = reloadSpreadsheet();
    res.json({ success: true, data: { counts: { horarios: data.horarios.length, salas: data.salas.length, cursos: data.cursos.length }, source: data.source } });
  } catch (error) {
    next(error);
  }
}

export function spreadsheetUploadController(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Envie uma planilha .xlsx, .xls ou .csv." });
  }
  try {
    const data = saveSpreadsheetFromUpload(req.file.path, req.file.originalname);
    return res.json({
      success: true,
      data: {
        source: data.source,
        counts: { horarios: data.horarios.length, salas: data.salas.length, cursos: data.cursos.length },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export function spreadsheetEvents(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = () => {
    const data = getSpreadsheetData();
    res.write(`data: ${JSON.stringify({ loadedAt: data.loadedAt, source: data.source, counts: { horarios: data.horarios.length, salas: data.salas.length, cursos: data.cursos.length } })}\n\n`);
  };
  send();
  const unsubscribe = subscribeSpreadsheet(send);
  req.on("close", unsubscribe);
}
