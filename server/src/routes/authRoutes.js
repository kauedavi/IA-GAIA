import { Router } from "express";
import { autenticar } from "../middleware/supabaseAuth.js";
import { isSupabaseConfigured } from "../services/supabaseService.js";

export const authRoutes = Router();

// O cliente usa isto para decidir entre login na nuvem e login local.
authRoutes.get("/auth/status", (_req, res) => {
  res.json({ success: true, data: { configurado: isSupabaseConfigured() } });
});

// Confirma a sessão e devolve quem está logado.
authRoutes.get("/auth/eu", autenticar, (req, res) => {
  res.json({ success: true, data: { usuario: req.usuario } });
});
