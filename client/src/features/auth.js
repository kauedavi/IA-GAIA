// ═════ CONTAS E PERFIS (login local) ═════
// As contas ficam neste computador (localStorage). A senha é guardada como SHA-256 com sal; não há servidor.
function lerContas() {
  try {
    return JSON.parse(lerLS("hari_contas", "[]")) || [];
  } catch (e) {
    return [];
  }
}
function gravarContas(l) {
  gravarLS("hari_contas", JSON.stringify(l));
}
var SESSAO = null;
try {
  SESSAO = JSON.parse(lerLS("hari_sessao", "null"));
} catch (e) {
  SESSAO = null;
}
function conta() {
  if (!SESSAO || SESSAO.perfil === "visitante") return null;
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
  var rotUser =
    p === "aluno"
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
$("btLogin").onclick = function () {
  var u = norm($("lUser").value).replace(/ /g, ""),
    sen = $("lSenha").value,
    erro = function (m) {
      $("erroLogin").textContent = m;
    };
  if (!u) {
    erro("Preencha o usuário");
    return;
  }
  if (sen.length < 4) {
    erro("A senha precisa de pelo menos 4 caracteres");
    return;
  }
  var cs = lerContas();
  if (LOGIN.modo === "criar") {
    var nome = $("lNome").value.trim();
    if (nome.length < 2) {
      erro("Escreva seu nome");
      return;
    }
    if (sen !== $("lSenha2").value) {
      erro("As senhas não são iguais");
      return;
    }
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
        nome: nome,
        perfil: LOGIN.perfil,
        sal: sal,
        hash: hashSenha(sen, sal),
        criada: Date.now(),
      };
    if (LOGIN.perfil === "empresa") {
      c.empresa = $("lEmpresa").value.trim();
      if (!c.empresa) {
        erro("Escreva o nome da empresa");
        return;
      }
    }
    if (LOGIN.perfil === "aluno") c.turma = $("lTurma").value;
    if (LOGIN.perfil === "professor") c.disciplinas = $("lDisc").value.trim();
    cs.push(c);
    gravarContas(cs);
    entrar(c);
    toast("Conta criada. Bem-vindo, " + nome.split(" ")[0] + "!");
  } else {
    var k = cs.filter(function (c) {
      return c.usuario === u;
    })[0];
    if (!k || k.hash !== hashSenha(sen, k.sal)) {
      erro("Usuário ou senha incorretos");
      return;
    }
    if (k.perfil !== LOGIN.perfil) {
      erro(
        "Essa conta é de " +
          { aluno: "aluno", professor: "professor", empresa: "empresa" }[
            k.perfil
          ] +
          ": escolha esse perfil acima",
      );
      return;
    }
    entrar(k);
  }
};
$("btVisitante").onclick = function () {
  SESSAO = { perfil: "visitante" };
  gravarLS("hari_sessao", JSON.stringify(SESSAO));
  iniciarSessao();
};
function entrar(c) {
  SESSAO = { id: c.id, perfil: c.perfil };
  gravarLS("hari_sessao", JSON.stringify(SESSAO));
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
  SESSAO = null;
  try {
    localStorage.removeItem("hari_sessao");
  } catch (e) {}
  if (N && N.pararFala) N.pararFala();
  $("conversa").innerHTML = "";
  $("palco").classList.remove("mini");
  HIST = [];
  if (N && N.agendarLembretes) N.agendarLembretes("[]");
  iniciarSessao();
};
function iniciarSessao() {
  var logado = !!SESSAO && (SESSAO.perfil === "visitante" || !!conta());
  $("tLogin").classList.toggle("on", !logado);
  if (!logado) {
    SESSAO = null;
    renderLogin();
    return;
  }
  montarNav();
  irPara("tHari");
  agendarLembretes();
}
