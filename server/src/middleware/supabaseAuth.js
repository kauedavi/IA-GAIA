// Middlewares de autenticação baseados no JWT do Supabase.
//
//   autenticar            → exige sessão válida; responde 401 sem ela.
//   autenticacaoOpcional  → anexa req.usuario se houver token válido e segue
//                           em frente sem ele (é o caso do visitante).
//
// Em ambos, o usuário fica em req.usuario = { id, email, role, nome }.
import { lerTokenDoHeader, verificarToken } from "../services/supabaseService.js";

export async function autenticar(req, _res, next) {
  const token = lerTokenDoHeader(req.headers.authorization);

  if (!token) {
    return next(Object.assign(new Error("Faça login para continuar."), { status: 401 }));
  }

  try {
    req.usuario = await verificarToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function autenticacaoOpcional(req, _res, next) {
  const token = lerTokenDoHeader(req.headers.authorization);

  if (!token) return next();

  try {
    req.usuario = await verificarToken(token);
  } catch (error) {
    // Token ruim não derruba a requisição: o visitante continua atendido.
    // Falha de rede no Supabase também não deve bloquear o chat.
    if (error.status !== 401 && error.status !== 503) return next(error);
  }

  return next();
}

/**
 * Exige um dos perfis informados. Use depois de `autenticar`.
 * Ex.: router.post("/planilha", autenticar, exigirPerfil("admin"), handler)
 */
export function exigirPerfil(...perfis) {
  const permitidos = new Set(perfis);

  return function verificarPerfil(req, _res, next) {
    if (!req.usuario) {
      return next(Object.assign(new Error("Faça login para continuar."), { status: 401 }));
    }

    if (!permitidos.has(req.usuario.role)) {
      return next(Object.assign(new Error("Seu perfil não tem acesso a este recurso."), { status: 403 }));
    }

    return next();
  };
}
