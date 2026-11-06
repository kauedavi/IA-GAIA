// ═════ AGENDA (provas, entregas, avisos, eventos e reservas de sala) ═════
var TIPOS_EV = {
  prova: "Prova",
  entrega: "Entrega",
  aviso: "Aviso",
  evento: "Evento",
  reserva: "Reserva de sala",
  lembrete: "Lembrete",
};
var filtroAg = "todos";
function hojeISO() {
  var n = agoraData();
  return (
    n.getFullYear() +
    "-" +
    String(n.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(n.getDate()).padStart(2, "0")
  );
}
function dataDe(iso) {
  var p = iso.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
function rotuloData(iso) {
  var h = dataDe(hojeISO()),
    d = dataDe(iso),
    dif = Math.round((d - h) / 864e5);
  if (dif === 0) return "Hoje";
  if (dif === 1) return "Amanhã";
  if (dif === -1) return "Ontem";
  return (
    DIAS[d.getDay()] +
    ", " +
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0")
  );
}
function proximosEventos(dias) {
  var h = hojeISO(),
    lim = new Date(dataDe(h).getTime() + dias * 864e5),
    m = agoraData().getHours() * 60 + agoraData().getMinutes();
  return (D.agenda || [])
    .filter(function (e) {
      if (e.data < h || dataDe(e.data) > lim) return false;
      if (e.data === h && e.fim && min(e.fim) < m) return false;
      return true;
    })
    .sort(function (a, b) {
      return a.data < b.data
        ? -1
        : a.data > b.data
          ? 1
          : min(a.inicio || "00:00") - min(b.inicio || "00:00");
    });
}
function tiposPermitidos() {
  return perfil() === "professor"
    ? ["aviso", "prova", "entrega", "reserva", "evento"]
    : ["prova", "entrega", "lembrete", "evento"];
}
function renderAgenda() {
  $("tituloAgenda").textContent =
    perfil() === "professor" ? "Agenda e reservas" : "Agenda";
  var tipos = ["todos"].concat(
    tiposPermitidos().concat(perfil() === "professor" ? [] : ["aviso"]),
  );
  $("filtroAgenda").innerHTML = tipos
    .map(function (t) {
      return (
        '<button class="chip' +
        (filtroAg === t ? " on" : "") +
        '" data-t="' +
        t +
        '">' +
        (t === "todos" ? "Tudo" : TIPOS_EV[t]) +
        "</button>"
      );
    })
    .join("");
  $("filtroAgenda")
    .querySelectorAll(".chip")
    .forEach(function (b) {
      b.onclick = function () {
        filtroAg = b.dataset.t;
        renderAgenda();
      };
    });
  var l = proximosEventos(120).filter(function (e) {
      return filtroAg === "todos" || e.tipo === filtroAg;
    }),
    h = "",
    ult = "";
  l.forEach(function (e) {
    if (e.data !== ult) {
      ult = e.data;
      h += '<div class="dataG">' + esc(rotuloData(e.data)) + "</div>";
    }
    var sl = sala(e.sala);
    h +=
      '<div class="item" data-e="' +
      esc(e.id) +
      '" style="margin-bottom:8px"><span style="flex:1;min-width:0"><div class="tt"><span class="selo ' +
      e.tipo +
      '">' +
      esc(TIPOS_EV[e.tipo] || e.tipo) +
      "</span>" +
      esc(e.titulo) +
      '</div><div class="ds">' +
      esc(
        (e.inicio ? e.inicio + (e.fim ? "–" + e.fim : "") + " · " : "") +
          (sl ? sl.nome : "") +
          (e.descricao ? " · " + e.descricao : ""),
      ) +
      "</div>" +
      (e.autor
        ? '<div class="ds" style="font-size:11px;color:var(--tx3)">por ' +
          esc(e.autor) +
          "</div>"
        : "") +
      "</span>" +
      (sl
        ? '<button class="redondo" style="width:40px;height:40px" data-rota="' +
          esc(sl.id) +
          '" aria-label="Rota">' +
          icone("pino") +
          "</button>"
        : "") +
      "</div>";
  });
  $("listaAgenda").innerHTML =
    h ||
    '<div class="vazio">Nada na agenda.<br>Clique no + para adicionar ' +
      (perfil() === "professor"
        ? "um aviso, prova ou reserva de sala."
        : "uma prova, entrega ou lembrete.") +
      "</div>";
  $("listaAgenda")
    .querySelectorAll(".item")
    .forEach(function (it) {
      it.onclick = function (e) {
        var r = e.target.closest("[data-rota]");
        if (r) {
          mostrarRota(r.dataset.rota);
          return;
        }
        editarEvento(it.dataset.e);
      };
    });
}
function conflitos(ev) {
  // reserva: confere com a grade e com outras reservas da mesma sala
  if (!ev.sala || !ev.inicio || !ev.fim) return [];
  var d = dataDe(ev.data).getDay(),
    i = min(ev.inicio),
    f = min(ev.fim),
    out = [];
  D.aulas.forEach(function (a) {
    if (
      a.sala === ev.sala &&
      +a.dia === d &&
      min(a.inicio) < f &&
      i < min(a.fim)
    )
      out.push("aula de " + a.disciplina + " (" + a.inicio + "–" + a.fim + ")");
  });
  (D.agenda || []).forEach(function (o) {
    if (
      o.id !== ev.id &&
      o.tipo === "reserva" &&
      o.sala === ev.sala &&
      o.data === ev.data &&
      o.inicio &&
      o.fim &&
      min(o.inicio) < f &&
      i < min(o.fim)
    )
      out.push("reserva “" + o.titulo + "” (" + o.inicio + "–" + o.fim + ")");
  });
  return out;
}
function editarEvento(id) {
  var e = id
      ? (D.agenda || []).filter(function (x) {
          return x.id === id;
        })[0]
      : null,
    nova = !e,
    tp = tiposPermitidos();
  if (nova)
    e = {
      id: novoId("e"),
      tipo: tp[0],
      titulo: "",
      data: hojeISO(),
      inicio: "",
      fim: "",
      sala: "",
      descricao: "",
      autor: (conta() || {}).nome || "",
    };
  var dono = nova || !e.autor || e.autor === ((conta() || {}).nome || "");
  if (tp.indexOf(e.tipo) < 0) tp = tp.concat([e.tipo]);
  abrirFolha(
    nova ? "Novo na agenda" : dono ? "Editar" : "Detalhes",
    '<div class="campo"><label>Tipo</label><select id="eTipo">' +
      tp
        .map(function (t) {
          return (
            '<option value="' +
            t +
            '"' +
            (t === e.tipo ? " selected" : "") +
            ">" +
            TIPOS_EV[t] +
            "</option>"
          );
        })
        .join("") +
      "</select></div>" +
      '<div class="campo"><label>Título</label><input id="eTit" value="' +
      esc(e.titulo) +
      '" placeholder="Ex.: Prova de Eletrônica Digital"></div>' +
      '<div class="campo"><label>Data</label><input id="eData" type="date" value="' +
      esc(e.data) +
      '"></div>' +
      '<div class="duas"><div class="campo"><label>Início</label><input id="eIni" type="time" value="' +
      esc(e.inicio) +
      '"></div><div class="campo"><label>Fim</label><input id="eFim" type="time" value="' +
      esc(e.fim) +
      '"></div></div>' +
      '<div class="campo"><label>Sala / lugar</label><select id="eSala"><option value="">—</option>' +
      opcoesSalas(e.sala) +
      "</select></div>" +
      '<div class="campo"><label>Observação</label><textarea id="eDesc" rows="2">' +
      esc(e.descricao) +
      "</textarea></div>" +
      '<div class="nota" id="eConf"></div>',
    function () {
      if (!dono) {
        return true;
      }
      var n = {
        id: e.id,
        tipo: $("eTipo").value,
        titulo: $("eTit").value.trim(),
        data: $("eData").value,
        inicio: $("eIni").value,
        fim: $("eFim").value,
        sala: $("eSala").value,
        descricao: $("eDesc").value.trim(),
        autor: e.autor,
      };
      if (!n.titulo) {
        toast("Escreva um título");
        return false;
      }
      if (!n.data) {
        toast("Escolha a data");
        return false;
      }
      if (n.inicio && n.fim && min(n.fim) <= min(n.inicio)) {
        toast("O fim tem que ser depois do início");
        return false;
      }
      if (n.tipo === "reserva") {
        if (!n.sala || !n.inicio || !n.fim) {
          toast("Reserva precisa de sala, início e fim");
          return false;
        }
        var c = conflitos(n);
        if (c.length) {
          $("eConf").innerHTML =
            '<span style="color:var(--rosa)">Conflito: ' +
            esc(c.join("; ")) +
            "</span>";
          return false;
        }
      }
      if (nova) D.agenda.push(n);
      else {
        var i = D.agenda.findIndex(function (x) {
          return x.id === e.id;
        });
        D.agenda[i] = n;
      }
      salvar();
      renderAgenda();
      agendarLembretes();
      toast(n.tipo === "reserva" ? "Sala reservada" : "Salvo na agenda");
      return true;
    },
    nova || !dono
      ? null
      : function () {
          D.agenda = D.agenda.filter(function (x) {
            return x.id !== e.id;
          });
          salvar();
          renderAgenda();
          agendarLembretes();
          toast("Apagado");
        },
  );
  if (!dono)
    ["eTipo", "eTit", "eData", "eIni", "eFim", "eSala", "eDesc"].forEach(
      function (k) {
        $(k).disabled = true;
      },
    );
}
