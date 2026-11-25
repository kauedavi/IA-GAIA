import { Router } from "express";
import { chatController, chatStreamController } from "../controllers/chatController.js";

export const chatRoutes = Router();
chatRoutes.post("/chat", chatController);
chatRoutes.post("/chat/stream", chatStreamController);
