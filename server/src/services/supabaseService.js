// Validação de token do Supabase Auth, sem SDK e sem dependência nova.
//
// O cliente manda o access_token (JWT) no header Authorization. Em vez de
// verificar a assinatura localmente, consultamos GET /auth/v1/user e lemos
// o papel na tabela profiles. O cache curto é limitado pelo exp do token.

const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 500;
const REQUEST_TIMEOUT_MS = 5_000;

const userCache = new Map();

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function baseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function erro(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

// Lê o exp do JWT sem validar a assinatura: serve só para encurtar o cache.
function expiraEm(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function lerCache(token) {
  const hit = userCache.get(token);

  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    userCache.delete(token);
    return null;
  }

  // Mantém a ordem de uso para o descarte LRU.
  userCache.delete(token);
  userCache.set(token, hit);

  return hit.user;
}

function gravarCache(token, user) {
  if (userCache.size >= MAX_CACHE_ENTRIES) {
    userCache.delete(userCache.keys().next().value);
  }

  const tokenExpiry = expiraEm(token);
  const expiresAt = Math.min(Date.now() + CACHE_TTL_MS, tokenExpiry ?? Infinity);

  if (expiresAt > Date.now()) {
    userCache.set(token, { user, expiresAt });
  }
}

export function limparCacheDeUsuarios() {
  userCache.clear();
}

async function consultarSupabase(caminho, token) {
  let response;

  try {
    response = await fetch(`${baseUrl()}${caminho}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw Object.assign(
      erro(503, "Não foi possível falar com o serviço de autenticação.", "supabase_unreachable"),
      { cause }
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw erro(401, "Sessão inválida ou expirada.", "invalid_token");
  }

  if (!response.ok) {
    throw erro(503, "Serviço de autenticação indisponível.", "supabase_error");
  }

  return response.json();
}

/**
 * Troca um access_token por { id, email, role, nome } ou lança erro com status.
 */
export async function verificarToken(token) {
  if (!isSupabaseConfigured()) {
    throw erro(503, "Autenticação não configurada neste servidor.", "supabase_not_configured");
  }

  if (!token) {
    throw erro(401, "Token ausente.", "missing_token");
  }

  const emCache = lerCache(token);
  if (emCache) return emCache;

  const body = await consultarSupabase("/auth/v1/user", token);
  const filtros = new URLSearchParams({ select: "role,nome", id: `eq.${body.id}` });
  const [perfil] = await consultarSupabase(`/rest/v1/profiles?${filtros}`, token);
  const user = {
    id: body.id,
    email: body.email ?? null,
    role: perfil?.role ?? "aluno",
    nome: perfil?.nome ?? body.user_metadata?.nome ?? null,
  };

  gravarCache(token, user);

  return user;
}

export function lerTokenDoHeader(authorization) {
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization || "").trim());

  return match ? match[1].trim() : null;
}
