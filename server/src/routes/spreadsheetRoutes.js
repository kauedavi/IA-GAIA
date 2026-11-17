import { Router } from "express";
import {
  spreadsheetEvents,
  spreadsheetList,
  spreadsheetReload,
  spreadsheetStatus,
  spreadsheetUpload,
  spreadsheetUploadController,
} from "../controllers/spreadsheetController.js";

export const spreadsheetRoutes = Router();

spreadsheetRoutes.get("/planilha/status", spreadsheetStatus);
spreadsheetRoutes.get("/planilha/dados", spreadsheetList);
spreadsheetRoutes.post("/planilha/recarregar", spreadsheetReload);
spreadsheetRoutes.post("/planilha/upload", spreadsheetUpload.single("arquivo"), spreadsheetUploadController);
spreadsheetRoutes.get("/planilha/eventos", spreadsheetEvents);
