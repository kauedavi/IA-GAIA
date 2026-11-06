import { Router } from "express";
import { chatController } from "../controllers/chatController.js";

export const chatRoutes = Router();
chatRoutes.post("/chat", chatController);
