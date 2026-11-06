import { chatService } from "../services/chatService.js";

export async function chatController(req, res, next) {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000) {
    return res.status(400).json({ success: false, error: "message deve conter entre 1 e 2000 caracteres." });
  }
  try {
    const data = await chatService(message);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}
