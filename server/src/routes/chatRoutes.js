import { Router } from "express";
import { chatController, chatStreamController } from "../controllers/chatController.js";
import { autenticacaoOpcional } from "../middleware/supabaseAuth.js";

export const chatRoutes = Router();

// Opcional de propósito: o visitante usa o chat sem conta. Quando há token
// válido, req.usuario traz { id, email, role, nome }.
chatRoutes.post("/chat", autenticacaoOpcional, chatController);
chatRoutes.post("/chat/stream", autenticacaoOpcional, chatStreamController);
