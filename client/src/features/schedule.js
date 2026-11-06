// ═════ HORÁRIOS ═════
var diaSel = null;
function renderHorarios() {
  var s = situacao();
  if (diaSel === null) diaSel = s.dia === 0 ? 1 : s.dia;
  $("pilTurma").textContent = D.turma || "Turma";
  var usados = {};
  D.aulas.forEach(function (a) {
    usados[a.dia] = 1;
  });
  var dias = [1, 2, 3, 4, 5, 6];
  if (usados[0]) dias.unshift(0);
  $("dias").innerHTML = dias
    .map(function (d) {
      return (
        '<button class="chip' +
        (d === diaSel ? " on" : "") +
        '" data-d="' +
        d +
        '">' +
        DIAS_C[d] +
        (d === s.dia ? " •" : "") +
        "</button>"
      );
    })
    .join("");
  $("dias")
    .querySelectorAll(".chip")
    .forEach(function (b) {
      b.onclick = function () {
        diaSel = +b.dataset.d;
        renderHorarios();
      };
    });
  var l = aulasDoDia(diaSel);
  if (perfil() === "professor" && CFG.soMinhas !== false && conta()) {
    var meu = norm(conta().nome)
      .split(" ")
      .filter(function (w) {
        return w.length > 2;
      });
    l = l.filter(function (a) {
      var pn = norm(a.professor);
      return meu.some(function (w) {
        return pn.indexOf(w) >= 0;
      });
    });
  }
  $("pilTurma").textContent =
    perfil() === "professor"
      ? CFG.soMinhas !== false
        ? "Só minhas aulas"
        : "Todas as aulas"
      : D.turma || "Turma";
  $("pilTurma").onclick =
    perfil() === "professor"
      ? function () {
          CFG.soMinhas = CFG.soMinhas === false;
          salvarCfg();
          renderHorarios();
        }
      : null;
  if (l.length) {
    var tot = l.filter(function (a) {
      return a.tipo !== "intervalo";
    }).length;
    $("resumoDia").textContent =
      DIAS[diaSel] +
      ": " +
      tot +
      " aula" +
      (tot === 1 ? "" : "s") +
      ", das " +
      l[0].inicio +
      " às " +
      l[l.length - 1].fim +
      ". Clique numa aula para editar, ou no pino para ver a rota.";
  } else $("resumoDia").textContent = "";
  $("listaAulas").innerHTML = l.length
    ? l
        .map(function (a, i) {
          var sl = sala(a.sala),
            b = sl ? bloco(sl.bloco) : null,
            hoje = diaSel === s.dia,
            ag = hoje && s.atual && s.atual.id === a.id,
            ps = hoje && min(a.fim) <= s.m;
          var cor =
            a.tipo === "intervalo" ? "var(--tx3)" : CORES[i % CORES.length];
          return (
            '<div class="item' +
            (ag ? " agoraSim" : "") +
            (ps ? " passou" : "") +
            '" data-a="' +
            esc(a.id) +
            '"><span class="cor" style="background:' +
            (b && a.tipo !== "intervalo" ? b.cor : cor) +
            '"></span><span style="flex:1;min-width:0"><div class="tt">' +
            esc(a.disciplina) +
            (ag ? ' <span class="tag">· agora</span>' : "") +
            '</div><div class="ds">' +
            esc(sl ? sl.nome : "Sala não definida") +
            (a.professor ? " · " + esc(a.professor) : "") +
            '</div></span><span class="hr">' +
            a.inicio +
            "<br>" +
            a.fim +
            "</span>" +
            (sl
              ? '<button class="redondo" style="width:40px;height:40px" data-rota="' +
                esc(sl.id) +
                '" aria-label="Rota">' +
                icone("pino") +
                "</button>"
              : "") +
            "</div>"
          );
        })
        .join("")
    : '<div class="vazio">Nenhuma aula em ' +
      DIAS[diaSel].toLowerCase() +
      ".<br>Clique no + para adicionar.</div>";
  $("listaAulas")
    .querySelectorAll(".item")
    .forEach(function (it) {
      it.onclick = function (e) {
        var r = e.target.closest("[data-rota]");
        if (r) {
          mostrarRota(r.dataset.rota);
          return;
        }
        editarAula(it.dataset.a);
      };
    });
}
$("fab").onclick = function () {
  if (telaAtual === "tAgenda") editarEvento(null);
  else editarAula(null);
};
function opcoesSalas(sel) {
  return D.salas
    .map(function (s) {
      return (
        '<option value="' +
        esc(s.id) +
        '"' +
        (s.id === sel ? " selected" : "") +
        ">" +
        esc(s.nome) +
        "</option>"
      );
    })
    .join("");
}
function editarAula(id) {
  var a = id
      ? D.aulas.filter(function (x) {
          return x.id === id;
        })[0]
      : null,
    nova = !a;
  if (nova) {
    var l = aulasDoDia(diaSel || 1),
      ult = l[l.length - 1];
    a = {
      id: novoId("a"),
      dia: diaSel || 1,
      inicio: ult ? ult.fim : "07:30",
      fim: "",
      disciplina: "",
      professor: "",
      sala: "",
      tipo: "aula",
    };
    if (!a.fim) {
      var mm = min(a.inicio) + 100;
      a.fim =
        String(Math.floor(mm / 60) % 24).padStart(2, "0") +
        ":" +
        String(mm % 60).padStart(2, "0");
    }
  }
  abrirFolha(
    nova ? "Nova aula" : "Editar aula",
    '<div class="campo"><label>Disciplina</label><input id="fDisc" value="' +
      esc(a.disciplina) +
      '" placeholder="Ex.: Lógica de Programação"></div>' +
      '<div class="campo"><label>Professor(a)</label><input id="fProf" value="' +
      esc(a.professor) +
      '"></div>' +
      '<div class="campo"><label>Sala</label><select id="fSala"><option value="">—</option>' +
      opcoesSalas(a.sala) +
      "</select></div>" +
      '<div class="campo"><label>Dia</label><select id="fDia">' +
      [1, 2, 3, 4, 5, 6, 0]
        .map(function (d) {
          return (
            '<option value="' +
            d +
            '"' +
            (+a.dia === d ? " selected" : "") +
            ">" +
            DIAS[d] +
            "</option>"
          );
        })
        .join("") +
      "</select></div>" +
      '<div class="duas"><div class="campo"><label>Início</label><input id="fIni" type="time" value="' +
      esc(a.inicio) +
      '"></div><div class="campo"><label>Fim</label><input id="fFim" type="time" value="' +
      esc(a.fim) +
      '"></div></div>' +
      '<div class="alternar"><span>É intervalo</span><button class="sw' +
      (a.tipo === "intervalo" ? " on" : "") +
      '" id="fInt"></button></div>',
    function () {
      var disc = $("fDisc").value.trim(),
        ini = $("fIni").value,
        fim = $("fFim").value,
        interv = $("fInt").classList.contains("on");
      if (!disc && !interv) {
        toast("Escreva o nome da disciplina");
        return false;
      }
      if (!ini || !fim || min(fim) <= min(ini)) {
        toast("Confira os horários de início e fim");
        return false;
      }
      a.disciplina = disc || "Intervalo";
      a.professor = $("fProf").value.trim();
      a.sala = $("fSala").value;
      a.dia = +$("fDia").value;
      a.inicio = ini;
      a.fim = fim;
      a.tipo = interv ? "intervalo" : "aula";
      if (nova) D.aulas.push(a);
      salvar();
      diaSel = a.dia;
      renderHorarios();
      agendarLembretes();
      toast("Aula salva");
      return true;
    },
    nova
      ? null
      : function () {
          D.aulas = D.aulas.filter(function (x) {
            return x.id !== a.id;
          });
          salvar();
          renderHorarios();
          toast("Aula apagada");
        },
  );
  $("fInt").onclick = function () {
    this.classList.toggle("on");
  };
}
