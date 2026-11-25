// ═════ CONTAS E PERFIS (login local) ═════
// As contas ficam neste computador (localStorage). A senha é guardada como SHA-256 com sal; não há servidor.
function lerContas() {
  try {
    return JSON.parse(lerLS("gaia_contas", "[]")) || [];
  } catch (e) {
    return [];
  }
}
function gravarContas(l) {
  gravarLS("gaia_contas", JSON.stringify(l));
}
var SESSAO = null;
try {
  SESSAO = JSON.parse(lerLS("gaia_sessao", "null"));
} catch (e) {
  SESSAO = null;
}
// Quando o Supabase está configurado (client/src/config.js), as contas ficam
// na nuvem e valem em qualquer aparelho. Sem configuração, continua tudo no
// localStorage deste computador.
function usandoNuvem() {
  return !!(window.GAIA_AUTH && window.GAIA_AUTH.configurado());
}
function conta() {
  if (!SESSAO || SESSAO.perfil === "visitante") return null;
  // Sessão da nuvem: os dados do perfil vêm no próprio SESSAO, porque não há
  // lista local de contas para consultar.
  if (SESSAO.nuvem) {
    return {
      id: SESSAO.id,
      usuario: SESSAO.email || "",
      nome: SESSAO.nome || "",
      perfil: SESSAO.perfil,
      turma: SESSAO.turma || "",
      disciplinas: SESSAO.disciplinas || "",
      empresa: SESSAO.empresa || "",
      nuvem: true,
    };
  }
  return (
    lerContas().filter(function (c) {
      return c.id === SESSAO.id;
    })[0] || null
  );
}
function perfil() {
  return SESSAO ? SESSAO.perfil : "aluno";
}
function podeEditarGrade() {
  var p = perfil();
  return p === "aluno" || p === "professor";
}
function sha256js(t) {
  // reserva para o navegador (no celular usa o Java)
  function r(n, x) {
    return (x >>> n) | (x << (32 - n));
  }
  var K = [],
    H = [],
    i,
    j,
    pr = 0,
    c = 2;
  function ehPrimo(n) {
    for (var d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  }
  while (pr < 64) {
    if (ehPrimo(c)) {
      if (pr < 8) H[pr] = (Math.pow(c, 0.5) * 4294967296) | 0;
      K[pr] = (Math.pow(c, 1 / 3) * 4294967296) | 0;
      pr++;
    }
    c++;
  }
  var b = unescape(encodeURIComponent(t)),
    l = b.length * 8,
    w = [];
  for (i = 0; i < b.length; i++)
    w[i >> 2] |= b.charCodeAt(i) << ((3 - (i % 4)) * 8);
  w[l >> 5] |= 0x80 << (24 - (l % 32));
  w[(((l + 64) >> 9) << 4) + 15] = l;
  for (j = 0; j < w.length; j += 16) {
    var a = H.slice(0),
      W = [];
    for (i = 0; i < 64; i++) {
      if (i < 16) W[i] = w[j + i] | 0;
      else {
        var s0 = r(7, W[i - 15]) ^ r(18, W[i - 15]) ^ (W[i - 15] >>> 3),
          s1 = r(17, W[i - 2]) ^ r(19, W[i - 2]) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      var t1 =
          a[7] +
          (r(6, a[4]) ^ r(11, a[4]) ^ r(25, a[4])) +
          ((a[4] & a[5]) ^ (~a[4] & a[6])) +
          K[i] +
          W[i],
        t2 =
          (r(2, a[0]) ^ r(13, a[0]) ^ r(22, a[0])) +
          ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]));
      a = [(t1 + t2) | 0].concat(a);
      a[4] = (a[4] + t1) | 0;
      a.pop();
    }
    for (i = 0; i < 8; i++) H[i] = (H[i] + a[i]) | 0;
  }
  return H.map(function (x) {
    return ("00000000" + (x >>> 0).toString(16)).slice(-8);
  }).join("");
}
function hashSenha(senha, sal) {
  var t = sal + "|" + senha;
  try {
    if (N && N.hash) {
      var h = N.hash(t);
      if (h) return h;
    }
  } catch (e) {}
  return sha256js(t);
}
var LOGIN = { perfil: "aluno", modo: "entrar" };
function abrirLogin(modo) {
  LOGIN.modo = modo;
  $("cartaoLogin").hidden = false;
  $("cartaoLogin").classList.remove("login-form-card-enter");
  void $("cartaoLogin").offsetWidth;
  $("cartaoLogin").classList.add("login-form-card-enter");
  $("cartaoLogin").scrollIntoView({ behavior: "smooth", block: "start" });
  renderLogin();
}
function renderLogin() {
  document.querySelectorAll("#perfis .perfil").forEach(function (b) {
    b.classList.toggle("on", b.dataset.p === LOGIN.perfil);
  });
  document.querySelectorAll(".abaLogin button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.m === LOGIN.modo);
  });
  var p = LOGIN.perfil,
    criar = LOGIN.modo === "criar",
    h = "";
  // Na nuvem o Supabase identifica a conta pelo e-mail, então RA/matrícula
  // não servem como usuário.
  var rotUser = usandoNuvem()
    ? p === "empresa"
      ? "E-mail corporativo"
      : "E-mail"
    : p === "aluno"
      ? "RA ou e-mail"
      : p === "professor"
        ? "E-mail ou matrícula"
        : "E-mail corporativo";
  if (criar) {
    h +=
      '<div class="campo"><label>' +
      (p === "empresa" ? "Seu nome (responsável)" : "Nome completo") +
      '</label><input id="lNome" autocomplete="name"></div>';
    if (p === "empresa")
      h +=
        '<div class="campo"><label>Empresa</label><input id="lEmpresa" placeholder="Razão social ou nome fantasia"></div>';
    if (p === "aluno")
      h +=
        '<div class="campo"><label>Curso / turma</label><select id="lTurma">' +
        D.info.cursos
          .slice(0, 2)
          .map(function (c) {
            return "<option>" + esc(c.n) + "</option>";
          })
          .join("") +
        "<option>Tecnologia em Eletrônica Industrial</option><option>Análise e Desenvolvimento de Sistemas</option><option>Pós-graduação</option><option>Curso livre / outro</option></select></div>";
    if (p === "professor")
      h +=
        '<div class="campo"><label>Disciplinas que leciona</label><input id="lDisc" placeholder="Ex.: Eletrônica Digital, CLP"></div>';
  }
  h +=
    '<div class="campo"><label>' +
    rotUser +
    '</label><input id="lUser" autocomplete="username" autocapitalize="off"></div>';
  h +=
    '<div class="campo"><label>Senha</label><input id="lSenha" type="password" autocomplete="' +
    (criar ? "new-password" : "current-password") +
    '"></div>';
  if (criar)
    h +=
      '<div class="campo"><label>Repita a senha</label><input id="lSenha2" type="password" autocomplete="new-password"></div>';
  $("formLogin").innerHTML = h;
  $("erroLogin").textContent = "";
  $("btLogin").textContent = criar ? "Criar conta e entrar" : "Entrar";
  $("lSenha").onkeydown = function (e) {
    if (e.key === "Enter" && !criar) $("btLogin").click();
  };
}
document.querySelectorAll("#perfis .perfil").forEach(function (b) {
  b.onclick = function () {
    LOGIN.perfil = b.dataset.p;
    renderLogin();
  };
});
document.querySelectorAll(".abaLogin button").forEach(function (b) {
  b.onclick = function () {
    LOGIN.modo = b.dataset.m;
    renderLogin();
  };
});
$("btLoginSenai").onclick = function () {
  abrirLogin("entrar");
};
$("btCriarInicial").onclick = function () {
  abrirLogin("criar");
};
$("btLoginInicial").onclick = function () {
  abrirLogin("entrar");
};
$("btVoltarLogin").onclick = function () {
  $("cartaoLogin").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
};
$("btVisitanteInicial").onclick = function () {
  $("btVisitante").click();
};
// O Supabase recusa senha com menos de 6 caracteres por padrão; o login local
// sempre aceitou 4. Cada caminho valida com o seu próprio mínimo para a
// mensagem de erro aparecer antes da ida à rede.
var MINIMO_SENHA_LOCAL = 4;
var MINIMO_SENHA_NUVEM = 6;

function dadosDoFormulario() {
  var d = { senha: $("lSenha").value, perfil: LOGIN.perfil, criar: LOGIN.modo === "criar" };
  if (d.criar) {
    d.nome = $("lNome").value.trim();
    d.senha2 = $("lSenha2").value;
    if (LOGIN.perfil === "empresa") d.empresa = $("lEmpresa").value.trim();
    if (LOGIN.perfil === "aluno") d.turma = $("lTurma").value;
    if (LOGIN.perfil === "professor") d.disciplinas = $("lDisc").value.trim();
  }
  return d;
}

// Validações comuns aos dois caminhos. Devolve a mensagem de erro ou null.
function validarFormulario(d, minimoSenha) {
  if (d.senha.length < minimoSenha)
    return "A senha precisa de pelo menos " + minimoSenha + " caracteres";
  if (!d.criar) return null;
  if (d.nome.length < 2) return "Escreva seu nome";
  if (d.senha !== d.senha2) return "As senhas não são iguais";
  if (d.perfil === "empresa" && !d.empresa) return "Escreva o nome da empresa";
  return null;
}

function travarBotaoLogin(travado) {
  var bt = $("btLogin");
  bt.disabled = travado;
  if (travado) {
    bt.dataset.rotulo = bt.textContent;
    bt.textContent = "Aguarde…";
  } else if (bt.dataset.rotulo) {
    bt.textContent = bt.dataset.rotulo;
    bt.dataset.rotulo = "";
  }
}

$("btLogin").onclick = function () {
  var erro = function (m) {
    $("erroLogin").textContent = m;
  };
  var d = dadosDoFormulario();

  if (usandoNuvem()) entrarComSupabase(d, erro);
  else entrarLocalmente(d, erro);
};

// ── Caminho 1: contas na nuvem (Supabase Auth) ──────────────────────
function entrarComSupabase(d, erro) {
  var email = $("lUser").value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    erro("Escreva um e-mail válido");
    return;
  }

  var problema = validarFormulario(d, MINIMO_SENHA_NUVEM);
  if (problema) {
    erro(problema);
    return;
  }

  erro("");
  travarBotaoLogin(true);

  var acao = d.criar
    ? window.GAIA_AUTH.criarConta({
        email: email,
        senha: d.senha,
        nome: d.nome,
        perfil: d.perfil,
        turma: d.turma,
        disciplinas: d.disciplinas,
        empresa: d.empresa,
      }).then(function (r) {
        if (r.precisaConfirmarEmail) return { confirmar: true };
        return { sessao: r.sessao, dados: d };
      })
    : window.GAIA_AUTH.entrar({ email: email, senha: d.senha }).then(function (sessao) {
        return { sessao: sessao };
      });

  acao
    .then(function (r) {
      if (r.confirmar) {
        travarBotaoLogin(false);
        toast("Conta criada. Confirme o e-mail antes de entrar.", true);
        LOGIN.modo = "entrar";
        renderLogin();
        return null;
      }
      return entrarPelaNuvem(r.sessao, r.dados);
    })
    .then(function (entrou) {
      travarBotaoLogin(false);
      if (entrou && d.criar) toast("Conta criada. Bem-vindo, " + d.nome.split(" ")[0] + "!");
    })
    .catch(function (e) {
      travarBotaoLogin(false);
      erro(e.message || "Não foi possível entrar");
    });
}

// Monta a sessão a partir do que o Supabase devolveu e, se der, completa com
// a linha de profiles (que é a fonte oficial do perfil).
function entrarPelaNuvem(sessao, dadosDoCadastro) {
  if (!sessao || !sessao.usuario) return Promise.resolve(false);

  var meta = sessao.usuario.user_metadata || {};
  SESSAO = {
    id: sessao.usuario.id,
    email: sessao.usuario.email || "",
    nome: (dadosDoCadastro && dadosDoCadastro.nome) || meta.nome || "",
    perfil: (dadosDoCadastro && dadosDoCadastro.perfil) || meta.role || "aluno",
    turma: (dadosDoCadastro && dadosDoCadastro.turma) || meta.turma || "",
    disciplinas: (dadosDoCadastro && dadosDoCadastro.disciplinas) || meta.disciplinas || "",
    empresa: (dadosDoCadastro && dadosDoCadastro.empresa) || meta.empresa || "",
    nuvem: true,
  };

  return window.GAIA_AUTH.perfilDoBanco()
    .then(function (perfilRemoto) {
      if (perfilRemoto && perfilRemoto.id) {
        SESSAO.nome = perfilRemoto.nome || SESSAO.nome;
        SESSAO.perfil = perfilRemoto.role || SESSAO.perfil;
        SESSAO.turma = perfilRemoto.turma || SESSAO.turma;
        SESSAO.disciplinas = perfilRemoto.disciplinas || SESSAO.disciplinas;
        SESSAO.empresa = perfilRemoto.empresa || SESSAO.empresa;
      }
    })
    .catch(function () {
      // Sem a linha de profiles seguimos com os metadados do próprio usuário.
    })
    .then(function () {
      // Na nuvem quem manda é profiles.role, não a aba escolhida na tela: o
      // perfil não pode ser trocado pelo cliente. Se o usuário escolheu uma
      // aba diferente, avisa em vez de barrar.
      var escolhido = LOGIN.perfil;
      if (!dadosDoCadastro && SESSAO.perfil !== escolhido) {
        var nomeDoPerfil = {
          aluno: "aluno",
          professor: "professor",
          empresa: "empresa",
          admin: "administrador",
        };
        toast(
          "Sua conta é de " +
            (nomeDoPerfil[SESSAO.perfil] || SESSAO.perfil) +
            ": entrando com esse perfil.",
        );
      }
      gravarLS("gaia_sessao", JSON.stringify(SESSAO));
      D.nome = SESSAO.nome;
      if (SESSAO.perfil === "aluno" && SESSAO.turma) D.turma = SESSAO.turma;
      salvar();
      iniciarSessao();
      return true;
    });
}

// ── Caminho 2: contas só neste computador (localStorage) ────────────
function entrarLocalmente(d, erro) {
  var u = norm($("lUser").value).replace(/ /g, "");

  if (!u) {
    erro("Preencha o usuário");
    return;
  }

  var problema = validarFormulario(d, MINIMO_SENHA_LOCAL);
  if (problema) {
    erro(problema);
    return;
  }

  var cs = lerContas();

  if (d.criar) {
    if (
      cs.some(function (c) {
        return c.usuario === u;
      })
    ) {
      erro("Já existe uma conta com esse usuário neste computador");
      return;
    }
    var sal = novoId("s"),
      c = {
        id: novoId("u"),
        usuario: u,
        nome: d.nome,
        perfil: d.perfil,
        sal: sal,
        hash: hashSenha(d.senha, sal),
        criada: Date.now(),
      };
    if (d.perfil === "empresa") c.empresa = d.empresa;
    if (d.perfil === "aluno") c.turma = d.turma;
    if (d.perfil === "professor") c.disciplinas = d.disciplinas;
    cs.push(c);
    gravarContas(cs);
    entrar(c);
    toast("Conta criada. Bem-vindo, " + d.nome.split(" ")[0] + "!");
    return;
  }

  var k = cs.filter(function (c) {
    return c.usuario === u;
  })[0];
  if (!k || k.hash !== hashSenha(d.senha, k.sal)) {
    erro("Usuário ou senha incorretos");
    return;
  }
  if (k.perfil !== d.perfil) {
    erro(
      "Essa conta é de " +
        { aluno: "aluno", professor: "professor", empresa: "empresa" }[k.perfil] +
        ": escolha esse perfil acima",
    );
    return;
  }
  entrar(k);
}

$("btVisitante").onclick = function () {
  SESSAO = { perfil: "visitante" };
  gravarLS("gaia_sessao", JSON.stringify(SESSAO));
  iniciarSessao();
};
function entrar(c) {
  SESSAO = { id: c.id, perfil: c.perfil };
  gravarLS("gaia_sessao", JSON.stringify(SESSAO));
  D.nome = c.nome;
  if (c.perfil === "aluno" && c.turma) D.turma = c.turma;
  salvar();
  iniciarSessao();
}
$("btSair").onclick = function () {
  if (!this.dataset.ok) {
    this.dataset.ok = 1;
    this.textContent = "Clique de novo para sair";
    return;
  }
  this.dataset.ok = "";
  // Encerra também a sessão no Supabase, para o refresh token não continuar
  // valendo depois do logout.
  if (SESSAO && SESSAO.nuvem && window.GAIA_AUTH) window.GAIA_AUTH.sair();
  SESSAO = null;
  try {
    localStorage.removeItem("gaia_sessao");
  } catch (e) {}
  if (N && N.pararFala) N.pararFala();
  $("conversa").innerHTML = "";
  $("palco").classList.remove("mini");
  HIST = [];
  if (N && N.agendarLembretes) N.agendarLembretes("[]");
  iniciarSessao();
};
// No início do app, uma sessão da nuvem pode estar salva aqui mas já ter
// expirado no servidor. Confirma com o Supabase antes de mostrar o app:
// sem token válido, volta para a tela de login.
function revalidarSessaoDaNuvem() {
  if (!SESSAO || !SESSAO.nuvem || !window.GAIA_AUTH) return Promise.resolve();

  // Sessão da nuvem salva num app que já não tem o Supabase configurado:
  // não há como revalidar, então encerra em vez de fingir que está logado.
  if (!usandoNuvem()) {
    SESSAO = null;
    try {
      localStorage.removeItem("gaia_sessao");
    } catch (e) {}
    iniciarSessao();
    return Promise.resolve();
  }

  return window.GAIA_AUTH.token()
    .then(function (acesso) {
      if (acesso) return;
      SESSAO = null;
      try {
        localStorage.removeItem("gaia_sessao");
      } catch (e) {}
      iniciarSessao();
      toast("Sua sessão expirou. Entre de novo.");
    })
    .catch(function () {
      // Sem rede não dá para confirmar nem negar: mantém o app aberto.
    });
}

function iniciarSessao() {
  var logado = !!SESSAO && (SESSAO.perfil === "visitante" || !!conta());
  $("tLogin").classList.toggle("on", !logado);
  if (!logado) {
    SESSAO = null;
    $("cartaoLogin").hidden = true;
    window.scrollTo({ top: 0, behavior: "auto" });
    renderLogin();
    return;
  }
  montarNav();
  irPara("tInicio");
  agendarLembretes();
}
