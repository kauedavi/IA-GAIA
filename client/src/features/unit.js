// ═════ CURSOS E UNIDADE (empresas e visitantes) ═════
function abrirUrl(u) {
  if (N && N.abrirLink) N.abrirLink(u);
  else window.open(u);
}
function renderCursos() {
  $("cursosSub").textContent = D.unidade + " · fonte: " + D.info.fontes;
  $("listaCursos").innerHTML = D.info.cursos
    .map(function (c) {
      return (
        '<div class="curso"><div class="tt">' +
        esc(c.n) +
        '</div><div class="nv">' +
        esc(c.nivel) +
        '</div><div class="ds">' +
        esc(c.d) +
        "</div></div>"
      );
    })
    .join("");
}
$("btPortfolio").onclick = function () {
  abrirUrl(D.info.empresas);
};
$("btInteresse").onclick = function () {
  formContato("interesse");
};
$("btVisita").onclick = function () {
  formContato("visita");
};
function formContato(tipo) {
  var c = conta() || {};
  abrirFolha(
    tipo === "visita" ? "Agendar uma visita" : "Tenho interesse",
    '<div class="nota">O H.A.R.I monta a mensagem e abre o WhatsApp da Central de Relacionamento do SENAI-SP para você enviar.</div>' +
      '<div class="campo"><label>Seu nome</label><input id="cNome" value="' +
      esc(c.nome || "") +
      '"></div>' +
      '<div class="campo"><label>Empresa</label><input id="cEmp" value="' +
      esc(c.empresa || "") +
      '"></div>' +
      (tipo === "visita"
        ? '<div class="duas"><div class="campo"><label>Data desejada</label><input id="cData" type="date"></div><div class="campo"><label>Horário</label><input id="cHora" type="time" value="10:00"></div></div>'
        : '<div class="campo"><label>Interesse</label><select id="cInt">' +
          D.info.cursos
            .map(function (x) {
              return "<option>" + esc(x.n) + "</option>";
            })
            .join("") +
          "<option>Aprendiz SENAI</option><option>Estágio / contratar alunos</option><option>Curso sob medida para a empresa</option></select></div>") +
      '<div class="campo"><label>Mensagem</label><textarea id="cMsg" rows="3"></textarea></div>',
    function () {
      var nome = $("cNome").value.trim();
      if (!nome) {
        toast("Escreva seu nome");
        return false;
      }
      var t =
        "Olá! Sou " +
        nome +
        ($("cEmp").value.trim()
          ? ", da empresa " + $("cEmp").value.trim()
          : "") +
        ". ";
      if (tipo === "visita")
        t +=
          "Gostaria de agendar uma visita à " +
          D.unidade +
          ($("cData").value
            ? " no dia " + $("cData").value.split("-").reverse().join("/")
            : "") +
          ($("cHora").value ? " às " + $("cHora").value : "") +
          ". ";
      else
        t +=
          "Tenho interesse em: " + $("cInt").value + " na " + D.unidade + ". ";
      if ($("cMsg").value.trim()) t += $("cMsg").value.trim();
      var wa = (
        D.info.telefones.filter(function (x) {
          return x.wa;
        })[0] || {}
      ).wa;
      abrirUrl(
        wa
          ? "https://wa.me/" + wa + "?text=" + encodeURIComponent(t)
          : "mailto:" +
              D.info.email +
              "?subject=" +
              encodeURIComponent("Contato pelo H.A.R.I") +
              "&body=" +
              encodeURIComponent(t),
      );
      return true;
    },
  );
  $("fSalvar").textContent = "Enviar";
}
function renderUnidade() {
  var I = D.info,
    ic = function (p) {
      return '<svg class="i" viewBox="0 0 24 24">' + p + "</svg>";
    };
  var h =
    '<div class="card">' +
    '<div class="linhaInfo">' +
    icone("pino") +
    '<div style="flex:1"><div class="tt">' +
    esc(D.unidade) +
    '</div><div class="ds">' +
    esc(I.endereco) +
    '</div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="botao peq" id="uMaps">Abrir no Google Maps</button><button class="botao sec peq" id="uMapa">Mapa interno</button></div></div></div>' +
    I.telefones
      .map(function (t, i) {
        return (
          '<div class="linhaInfo">' +
          ic(
            '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
          ) +
          '<div style="flex:1"><div class="tt">' +
          esc(t.n) +
          '</div><div class="ds">' +
          esc(t.t) +
          '</div><div style="display:flex;gap:8px;margin-top:6px"><button class="botao sec peq" data-tel="' +
          esc(t.tel) +
          '">Ligar</button>' +
          (t.wa
            ? '<button class="botao sec peq" data-wa="' +
              esc(t.wa) +
              '">WhatsApp</button>'
            : "") +
          "</div></div></div>"
        );
      })
      .join("") +
    '<div class="linhaInfo">' +
    ic(
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    ) +
    '<div style="flex:1"><div class="tt">' +
    esc(I.email) +
    '</div><div class="ds">E-mail da unidade · Instagram ' +
    esc(I.instagram) +
    "</div></div></div>" +
    '</div><h3>Horários de atendimento</h3><div class="card">' +
    I.horarios
      .map(function (x) {
        return (
          '<div class="linhaInfo">' +
          icone("relogio") +
          '<div><div class="tt">' +
          esc(x.t) +
          '</div><div class="ds">' +
          esc(x.h) +
          "</div></div></div>"
        );
      })
      .join("") +
    '</div><h3>Estrutura</h3><div class="card"><div class="ds" style="color:var(--tx2);font-size:14px;line-height:1.5">' +
    esc(I.area) +
    '. Auditório, biblioteca com sala de leitura, laboratórios, refeitório com cozinha, quadra descoberta, piscina, sala de recursos (AEE) e banheiro acessível.</div><div class="nota" style="margin-top:8px">Fonte: ' +
    esc(I.fontes) +
    ".</div></div>";
  $("infoUnidade").innerHTML = h;
  $("uMaps").onclick = function () {
    abrirUrl(I.mapa);
  };
  $("uMapa").onclick = function () {
    mostrarRota("secretaria");
  };
  $("infoUnidade")
    .querySelectorAll("[data-tel]")
    .forEach(function (b) {
      b.onclick = function () {
        abrirUrl("tel:" + b.dataset.tel);
      };
    });
  $("infoUnidade")
    .querySelectorAll("[data-wa]")
    .forEach(function (b) {
      b.onclick = function () {
        abrirUrl("https://wa.me/" + b.dataset.wa);
      };
    });
}

// ═════ VOZ MASCULINA ═════
var VOZES_GEMINI = [
  ["", "Voz padrão do dispositivo"],
];
if (!CFG.vozModo) CFG.vozModo = "celular";
if (!CFG.vozNome) CFG.vozNome = "";
function montarVozes() {
  var h = VOZES_GEMINI.map(function (v) {
    return '<option value="celular:' + v[0] + '">' + v[1] + "</option>";
  }).join("");
  var vs = [];
  try {
    vs = JSON.parse(N && N.vozesCelular ? N.vozesCelular() : "[]");
  } catch (e) {}
  vs.forEach(function (v) {
    h +=
      '<option value="celular:' +
      esc(v.nome) +
      '">Windows — ' +
      esc(v.nome) +
      (v.internet ? " (internet)" : "") +
      "</option>";
  });
  $("aVoz").innerHTML = h;
  $("aVoz").value = "celular:" + (CFG.vozNome || "");
  if (!$("aVoz").value) $("aVoz").value = "celular:";
  $("notaVoz").textContent = vs.length
    ? "As vozes listadas são fornecidas pelo sistema."
    : "A voz padrão do dispositivo será usada.";
}
$("aVoz").onchange = function () {
  var v = this.value.split(":");
  CFG.vozModo = "celular";
  CFG.vozNome = v.slice(1).join(":");
  salvarCfg();
  montarVozes();
};
function falarTexto(t) {
  if (!N || !N.falar) return;
  N.falar(t, "celular", CFG.vozNome);
}
$("btTestarVoz").onclick = function () {
  if (!N || !N.falar) {
    toast("A voz funciona no app do celular");
    return;
  }
  falarTexto(
    "Olá" +
      (D.nome ? ", " + D.nome.split(" ")[0] : "") +
      "! Eu sou o H.A.R.I, seu guia no SENAI.",
  );
};
window.hariFalaInicio = function () {
  estado("falando");
};
window.hariVozAviso = function (m) {
  toast("Voz do Gemini indisponível (" + m + "): usando a voz do Windows");
};

// ═════ LEMBRETES (notificação antes da aula) ═════
function agendarLembretes() {
  if (!N || !N.agendarLembretes) return;
  var pf = perfil(),
    ant = +CFG.lembrete || 0,
    l = [];
  if (!SESSAO || ant <= 0 || pf === "empresa" || pf === "visitante") {
    N.agendarLembretes("[]");
    return;
  }
  var agora = agoraData(),
    base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()),
    meu =
      pf === "professor" && conta()
        ? norm(conta().nome)
            .split(" ")
            .filter(function (w) {
              return w.length > 2;
            })
        : null;
  for (var k = 0; k < 8; k++) {
    var dia = new Date(base.getTime() + k * 864e5);
    aulasDoDia(dia.getDay()).forEach(function (a) {
      if (a.tipo === "intervalo") return;
      if (
        meu &&
        CFG.soMinhas !== false &&
        !meu.some(function (w) {
          return norm(a.professor).indexOf(w) >= 0;
        })
      )
        return;
      var sl = sala(a.sala),
        t = dia.getTime() + (min(a.inicio) - ant) * 6e4;
      l.push({
        t: t,
        titulo: a.disciplina + " às " + a.inicio,
        texto:
          (sl ? sl.nome + " · " + ondeFica(sl) : "") +
          (a.professor ? " · " + a.professor : ""),
      });
    });
  }
  proximosEventos(14).forEach(function (e) {
    var sl = sala(e.sala),
      t =
        dataDe(e.data).getTime() +
        (e.inicio ? min(e.inicio) - ant : 7 * 60) * 6e4;
    l.push({
      t: t,
      titulo: (TIPOS_EV[e.tipo] || "Agenda") + ": " + e.titulo,
      texto:
        (e.inicio ? "Às " + e.inicio : "Hoje") + (sl ? " · " + sl.nome : ""),
    });
  });
  l = l
    .filter(function (x) {
      return x.t > agora.getTime();
    })
    .sort(function (a, b) {
      return a.t - b.t;
    })
    .slice(0, 60);
  N.agendarLembretes(JSON.stringify(l));
}
$("aLembrete").onchange = function () {
  CFG.lembrete = +this.value;
  salvarCfg();
  if (CFG.lembrete > 0 && N && N.podeNotificar && !N.podeNotificar())
    N.pedirNotificacao();
  agendarLembretes();
  toast(
    CFG.lembrete
      ? "Vou avisar " + CFG.lembrete + " min antes"
      : "Lembretes desligados",
  );
};
