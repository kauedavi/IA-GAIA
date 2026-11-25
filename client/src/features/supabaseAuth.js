// ═════ LOGIN NA NUVEM (Supabase Auth) ═════
// Conversa direto com a API REST do Supabase Auth via fetch: sem SDK, sem CDN
// e sem passo de build — assim funciona igual no navegador e no app Android
// (Capacitor), que carrega os arquivos localmente.
//
// A anon key é pública por natureza: quem protege os dados é o RLS da tabela
// profiles (veja supabase/migrations/0001_profiles.sql). Nunca colocar a
// service_role key aqui.
//
// Expõe window.GAIA_AUTH. Quando o Supabase não está configurado,
// GAIA_AUTH.configurado() é false e o app usa o login local de auth.js.
(function () {
  var CHAVE_SESSAO = "gaia_supabase_sessao";
  var MARGEM_RENOVACAO_MS = 60000; // renova 1 min antes de expirar

  function cfg() {
    return window.GAIA_SUPABASE || {};
  }

  function configurado() {
    var c = cfg();
    return !!(c.url && c.anonKey);
  }

  function urlBase() {
    return String(cfg().url || "").replace(/\/+$/, "");
  }

  function ler() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null");
    } catch (e) {
      return null;
    }
  }

  function gravar(sessao) {
    try {
      if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
      else localStorage.removeItem(CHAVE_SESSAO);
    } catch (e) {}
  }

  // Guarda o instante de expiração já calculado, para não depender do relógio
  // do servidor em cada checagem.
  function normalizarSessao(corpo) {
    if (!corpo || !corpo.access_token) return null;
    var validadeSegundos = Number(corpo.expires_in) || 3600;
    return {
      access_token: corpo.access_token,
      refresh_token: corpo.refresh_token || null,
      expira_em: Date.now() + validadeSegundos * 1000,
      usuario: corpo.user || null,
    };
  }

  function mensagemDeErro(status, corpo) {
    var bruta =
      (corpo && (corpo.error_description || corpo.msg || corpo.message)) || "";
    if (status === 400 && /invalid login credentials/i.test(bruta))
      return "E-mail ou senha incorretos";
    if (status === 400 && /already registered/i.test(bruta))
      return "Já existe uma conta com esse e-mail";
    if (status === 422 && /password/i.test(bruta))
      return "A senha é curta demais para o servidor";
    if (status === 429)
      return "Muitas tentativas. Espere um instante e tente de novo";
    if (status === 0) return "Sem conexão com o servidor de contas";
    return bruta || "Não foi possível concluir. Tente novamente";
  }

  function chamar(caminho, opcoes) {
    opcoes = opcoes || {};
    var cabecalhos = {
      apikey: cfg().anonKey,
      "Content-Type": "application/json",
    };
    if (opcoes.token) cabecalhos.Authorization = "Bearer " + opcoes.token;

    return fetch(urlBase() + caminho, {
      method: opcoes.metodo || "GET",
      headers: cabecalhos,
      body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    })
      .then(function (resposta) {
        return resposta
          .json()
          .catch(function () {
            return {};
          })
          .then(function (corpo) {
            if (!resposta.ok) {
              throw Object.assign(
                new Error(mensagemDeErro(resposta.status, corpo)),
                { status: resposta.status },
              );
            }
            return corpo;
          });
      })
      .catch(function (erro) {
        if (erro.status) throw erro;
        throw Object.assign(new Error(mensagemDeErro(0, null)), { status: 0 });
      });
  }

  function criarConta(dados) {
    return chamar("/auth/v1/signup", {
      metodo: "POST",
      corpo: {
        email: dados.email,
        password: dados.senha,
        // Vira raw_user_meta_data: o trigger do banco cria a linha em profiles.
        data: {
          nome: dados.nome,
          role: dados.perfil,
          turma: dados.turma || null,
          disciplinas: dados.disciplinas || null,
          empresa: dados.empresa || null,
        },
      },
    }).then(function (corpo) {
      var sessao = normalizarSessao(corpo);
      // Com "confirmar e-mail" ligado no projeto, o signup não devolve sessão.
      if (!sessao) return { precisaConfirmarEmail: true, sessao: null };
      gravar(sessao);
      return { precisaConfirmarEmail: false, sessao: sessao };
    });
  }

  function entrar(dados) {
    return chamar("/auth/v1/token?grant_type=password", {
      metodo: "POST",
      corpo: { email: dados.email, password: dados.senha },
    }).then(function (corpo) {
      var sessao = normalizarSessao(corpo);
      if (!sessao) throw new Error("Resposta inesperada do servidor de contas");
      gravar(sessao);
      return sessao;
    });
  }

  function renovar(sessao) {
    if (!sessao || !sessao.refresh_token) return Promise.resolve(null);
    return chamar("/auth/v1/token?grant_type=refresh_token", {
      metodo: "POST",
      corpo: { refresh_token: sessao.refresh_token },
    })
      .then(function (corpo) {
        var nova = normalizarSessao(corpo);
        gravar(nova);
        return nova;
      })
      .catch(function (erro) {
        // Refresh token revogado ou expirado: a sessão acabou de verdade.
        if (erro.status && erro.status !== 0) gravar(null);
        return null;
      });
  }

  // Devolve um access_token válido, renovando se estiver perto de expirar.
  function token() {
    var sessao = ler();
    if (!sessao) return Promise.resolve(null);
    if (sessao.expira_em - Date.now() > MARGEM_RENOVACAO_MS)
      return Promise.resolve(sessao.access_token);
    return renovar(sessao).then(function (nova) {
      return nova ? nova.access_token : null;
    });
  }

  function usuario() {
    var sessao = ler();
    return sessao && sessao.usuario ? sessao.usuario : null;
  }

  // Lê o perfil da tabela profiles (sujeito ao RLS: só o próprio).
  function perfilDoBanco() {
    return token().then(function (acesso) {
      if (!acesso) return null;
      return fetch(urlBase() + "/rest/v1/profiles?select=*", {
        headers: {
          apikey: cfg().anonKey,
          Authorization: "Bearer " + acesso,
          Accept: "application/vnd.pgrst.object+json",
        },
      })
        .then(function (resposta) {
          return resposta.ok ? resposta.json() : null;
        })
        .catch(function () {
          return null;
        });
    });
  }

  function sair() {
    var sessao = ler();
    gravar(null);
    if (!sessao) return Promise.resolve();
    return chamar("/auth/v1/logout", {
      metodo: "POST",
      token: sessao.access_token,
    }).catch(function () {
      // A sessão local já foi apagada; falha de rede aqui não importa.
    });
  }

  window.GAIA_AUTH = {
    configurado: configurado,
    criarConta: criarConta,
    entrar: entrar,
    sair: sair,
    token: token,
    usuario: usuario,
    perfilDoBanco: perfilDoBanco,
    sessao: ler,
  };
})();
