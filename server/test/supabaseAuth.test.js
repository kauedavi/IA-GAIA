import assert from "node:assert/strict";
import test from "node:test";

import { autenticacaoOpcional, autenticar, exigirPerfil } from "../src/middleware/supabaseAuth.js";
import {
  isSupabaseConfigured,
  lerTokenDoHeader,
  limparCacheDeUsuarios,
  verificarToken,
} from "../src/services/supabaseService.js";

const fetchOriginal = globalThis.fetch;

// Um JWT de mentira com exp no futuro: só o payload importa, porque a
// assinatura é verificada pelo Supabase, não aqui.
function tokenFalso(expEmSegundos = Math.floor(Date.now() / 1000) + 3600) {
  const payload = Buffer.from(JSON.stringify({ exp: expEmSegundos })).toString("base64url");

  return `cabecalho.${payload}.assinatura`;
}

function configurar() {
  process.env.SUPABASE_URL = "https://projeto.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-de-teste";
  limparCacheDeUsuarios();
}

function desconfigurar() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  limparCacheDeUsuarios();
}

function responderCom(status, corpo) {
  const chamadas = [];

  globalThis.fetch = async (url, opcoes) => {
    chamadas.push({ url: String(url), opcoes });

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => corpo,
    };
  };

  return chamadas;
}

test.afterEach(() => {
  globalThis.fetch = fetchOriginal;
  desconfigurar();
});

test("lerTokenDoHeader aceita Bearer e ignora o resto", () => {
  assert.equal(lerTokenDoHeader("Bearer abc123"), "abc123");
  assert.equal(lerTokenDoHeader("bearer   abc123  "), "abc123");
  assert.equal(lerTokenDoHeader("Basic abc123"), null);
  assert.equal(lerTokenDoHeader(""), null);
  assert.equal(lerTokenDoHeader(undefined), null);
});

test("isSupabaseConfigured exige as duas variáveis", () => {
  desconfigurar();
  assert.equal(isSupabaseConfigured(), false);

  process.env.SUPABASE_URL = "https://projeto.supabase.co";
  assert.equal(isSupabaseConfigured(), false, "só a URL não basta");

  process.env.SUPABASE_ANON_KEY = "anon";
  assert.equal(isSupabaseConfigured(), true);
});

test("verificarToken devolve o usuário e manda os cabeçalhos certos", async () => {
  configurar();
  const chamadas = responderCom(200, {
    id: "uuid-1",
    email: "aluno@senai.br",
    user_metadata: { role: "professor", nome: "Ana" },
  });

  const usuario = await verificarToken(tokenFalso());

  assert.deepEqual(usuario, {
    id: "uuid-1",
    email: "aluno@senai.br",
    role: "professor",
    nome: "Ana",
  });
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, "https://projeto.supabase.co/auth/v1/user");
  assert.equal(chamadas[0].opcoes.headers.apikey, "anon-de-teste");
  assert.match(chamadas[0].opcoes.headers.Authorization, /^Bearer /);
});

test("verificarToken usa 'aluno' quando o metadata não traz role", async () => {
  configurar();
  responderCom(200, { id: "uuid-2", email: "x@senai.br" });

  const usuario = await verificarToken(tokenFalso());

  assert.equal(usuario.role, "aluno");
  assert.equal(usuario.nome, null);
});

test("verificarToken não repete a ida à rede para o mesmo token", async () => {
  configurar();
  const chamadas = responderCom(200, { id: "uuid-3", email: "y@senai.br" });
  const token = tokenFalso();

  await verificarToken(token);
  await verificarToken(token);

  assert.equal(chamadas.length, 1, "a segunda chamada deveria vir do cache");
});

test("verificarToken não guarda em cache token já expirado", async () => {
  configurar();
  const chamadas = responderCom(200, { id: "uuid-4", email: "z@senai.br" });
  const expirado = tokenFalso(Math.floor(Date.now() / 1000) - 10);

  await verificarToken(expirado);
  await verificarToken(expirado);

  assert.equal(chamadas.length, 2);
});

test("verificarToken traduz 401 do Supabase em erro 401", async () => {
  configurar();
  responderCom(401, { msg: "invalid claim" });

  await assert.rejects(verificarToken(tokenFalso()), { status: 401, code: "invalid_token" });
});

test("verificarToken vira 503 quando o Supabase falha", async () => {
  configurar();
  responderCom(500, {});

  await assert.rejects(verificarToken(tokenFalso()), { status: 503, code: "supabase_error" });
});

test("verificarToken avisa quando o servidor não está configurado", async () => {
  desconfigurar();

  await assert.rejects(verificarToken(tokenFalso()), {
    status: 503,
    code: "supabase_not_configured",
  });
});

test("autenticar responde 401 sem cabeçalho", async () => {
  configurar();
  const req = { headers: {} };

  const erro = await new Promise((resolve) => autenticar(req, {}, resolve));

  assert.equal(erro.status, 401);
  assert.equal(req.usuario, undefined);
});

test("autenticar anexa req.usuario com token válido", async () => {
  configurar();
  responderCom(200, { id: "uuid-5", email: "ok@senai.br", user_metadata: { role: "admin" } });
  const req = { headers: { authorization: `Bearer ${tokenFalso()}` } };

  const erro = await new Promise((resolve) => autenticar(req, {}, resolve));

  assert.equal(erro, undefined);
  assert.equal(req.usuario.id, "uuid-5");
  assert.equal(req.usuario.role, "admin");
});

test("autenticacaoOpcional deixa o visitante passar sem token", async () => {
  configurar();
  const req = { headers: {} };

  const erro = await new Promise((resolve) => autenticacaoOpcional(req, {}, resolve));

  assert.equal(erro, undefined);
  assert.equal(req.usuario, undefined);
});

test("autenticacaoOpcional não derruba a requisição com token inválido", async () => {
  configurar();
  responderCom(401, {});
  const req = { headers: { authorization: `Bearer ${tokenFalso()}` } };

  const erro = await new Promise((resolve) => autenticacaoOpcional(req, {}, resolve));

  assert.equal(erro, undefined);
  assert.equal(req.usuario, undefined);
});

test("autenticacaoOpcional segue em frente se o Supabase estiver fora", async () => {
  configurar();
  responderCom(500, {});
  const req = { headers: { authorization: `Bearer ${tokenFalso()}` } };

  const erro = await new Promise((resolve) => autenticacaoOpcional(req, {}, resolve));

  assert.equal(erro, undefined);
  assert.equal(req.usuario, undefined);
});

test("exigirPerfil libera o perfil certo e barra os outros", async () => {
  const somenteAdmin = exigirPerfil("admin");

  const semSessao = await new Promise((resolve) => somenteAdmin({}, {}, resolve));
  assert.equal(semSessao.status, 401);

  const aluno = await new Promise((resolve) =>
    somenteAdmin({ usuario: { role: "aluno" } }, {}, resolve)
  );
  assert.equal(aluno.status, 403);

  const admin = await new Promise((resolve) =>
    somenteAdmin({ usuario: { role: "admin" } }, {}, resolve)
  );
  assert.equal(admin, undefined);
});
