import crypto from "node:crypto";

// Protege as rotas que trocam os dados do servidor (enviar ou recarregar a planilha).
// Antes qualquer pessoa na internet podia substituir a planilha de produção.
// Configure GAIA_ADMIN_TOKEN no ambiente e envie o mesmo valor no cabeçalho
// "Authorization: Bearer <token>" (ou "X-GAIA-Admin: <token>").
export function requireAdmin(req, res, next) {
  const expected = process.env.GAIA_ADMIN_TOKEN || "";
  if (!expected) {
    return res.status(403).json({
      success: false,
      error: "Envio de planilha desativado: defina GAIA_ADMIN_TOKEN no servidor.",
    });
  }
  const header = String(req.get("authorization") || "");
  const received = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : String(req.get("x-gaia-admin") || "").trim();
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, error: "Token de administrador inválido." });
  }
  return next();
}
