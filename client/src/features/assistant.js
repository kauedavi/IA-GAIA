// ═════ ESFERA (núcleo do H.A.R.I) ═════
var ESTADO = "pronto",
  nivel = 0;
var COR_EST = {
  pronto: [46, 230, 197],
  ouvindo: [56, 214, 255],
  pensando: [255, 181, 71],
  falando: [94, 224, 138],
  erro: [255, 107, 139],
};
var ORB = (function () {
  var NP = 420,
    P = [],
    L = [],
    sd = 11,
    i,
    j;
  function rnd() {
    sd = (sd * 16807) % 2147483647;
    return sd / 2147483647;
  }
  for (i = 0; i < NP; i++) {
    var k = i + 0.5,
      ph = Math.acos(1 - (2 * k) / NP),
      th = Math.PI * (1 + Math.sqrt(5)) * k,
      r = 1 - rnd() * 0.06;
    P.push([
      Math.cos(th) * Math.sin(ph) * r,
      Math.cos(ph) * r,
      Math.sin(th) * Math.sin(ph) * r,
      rnd() * 6.283,
      rnd(),
    ]);
  }
  for (i = 0; i < 70; i++) {
    var u = rnd() * 2 - 1,
      a = rnd() * 6.283,
      q = Math.sqrt(1 - u * u),
      rr = 0.3 + 0.5 * rnd();
    P.push([
      q * Math.cos(a) * rr,
      u * rr,
      q * Math.sin(a) * rr,
      rnd() * 6.283,
      rnd(),
    ]);
  }
  for (i = 0; i < NP; i++) {
    var b = -1,
      bd = 9;
    for (j = 0; j < NP; j++) {
      if (j === i) continue;
      var dx = P[i][0] - P[j][0],
        dy = P[i][1] - P[j][1],
        dz = P[i][2] - P[j][2],
        dd = dx * dx + dy * dy + dz * dz;
      if (dd < bd) {
        bd = dd;
        b = j;
      }
    }
    L.push([i, b]);
  }
  return { P: P, L: L, ang: 0, t: 0, ult: 0, cor: [46, 230, 197] };
})();
function desenharOrbe(cv, t) {
  var dpr = Math.min(2, window.devicePixelRatio || 1),
    w = cv.clientWidth,
    h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  var g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  var dt = ORB.ult ? Math.min(100, t - ORB.ult) : 16;
  ORB.ult = t;
  ORB.t += dt;
  var vel =
    ESTADO === "pensando" ? 0.0011 : ESTADO === "pronto" ? 0.00025 : 0.0005;
  ORB.ang += dt * vel;
  var alvo = COR_EST[ESTADO] || COR_EST.pronto;
  for (var c = 0; c < 3; c++) ORB.cor[c] += (alvo[c] - ORB.cor[c]) * 0.08;
  var C = ORB.cor.map(Math.round);
  function rgba(a) {
    return "rgba(" + C[0] + "," + C[1] + "," + C[2] + "," + a + ")";
  }
  var tt = ORB.t / 1000,
    R = Math.min(w, h) * 0.3,
    cx = w / 2,
    cy = h / 2,
    ca = Math.cos(ORB.ang),
    sa = Math.sin(ORB.ang),
    inc = 0.42 + 0.08 * Math.sin(tt * 0.3),
    ci = Math.cos(inc),
    si = Math.sin(inc),
    f = 3.2;
  // brilho de fundo
  var gl = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.9);
  gl.addColorStop(0, rgba(0.2 + nivel * 0.25));
  gl.addColorStop(0.5, rgba(0.06));
  gl.addColorStop(1, rgba(0));
  g.fillStyle = gl;
  g.fillRect(0, 0, w, h);
  // anéis orbitais (assinatura do H.A.R.I: um radar/bússola em volta do núcleo)
  g.lineWidth = 1;
  for (var r = 0; r < 3; r++) {
    var rr = R * (1.28 + r * 0.17),
      rot = tt * (r % 2 ? -0.35 : 0.25) + r;
    g.strokeStyle = rgba(0.16 - r * 0.03);
    g.setLineDash(r === 1 ? [3, 7] : r === 2 ? [18, 10] : []);
    g.beginPath();
    g.ellipse(
      cx,
      cy,
      rr,
      rr * (r === 0 ? 0.32 : 1),
      r === 0 ? 0.35 : 0,
      0,
      6.283,
    );
    g.stroke();
    if (r === 2) {
      var a = rot * 1.4;
      g.setLineDash([]);
      g.fillStyle = rgba(0.9);
      g.beginPath();
      g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3, 0, 6.283);
      g.fill();
    }
  }
  g.setLineDash([]);
  // marcas de bússola (N L S O)
  g.fillStyle = rgba(0.5);
  g.font = "600 10px Roboto,sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  var rb = R * 1.62;
  if (h > 220) {
    g.fillText("N", cx, cy - rb);
    g.fillText("L", cx + rb, cy);
    g.fillText("O", cx - rb, cy);
  }
  // partículas
  var P = ORB.P,
    X = [],
    Y = [],
    Z = [],
    amp =
      ESTADO === "falando"
        ? 0.06 + 0.12 * nivel
        : ESTADO === "ouvindo"
          ? 0.05
          : ESTADO === "pensando"
            ? 0.035
            : 0.018,
    fr = ESTADO === "falando" ? 7 : 2.4;
  for (var i = 0; i < P.length; i++) {
    var p = P[i],
      o = 1 + amp * Math.sin(p[3] + tt * fr),
      x = p[0] * o,
      y = p[1] * o,
      z = p[2] * o;
    if (ESTADO === "pensando") {
      var tw = 0.25 * Math.sin(tt * 2 + y * 3);
      x = x * Math.cos(tw) - z * Math.sin(tw);
      z = p[0] * o * Math.sin(tw) + z * Math.cos(tw);
    }
    var x1 = ca * x + sa * z,
      z1 = -sa * x + ca * z,
      y2 = ci * y - si * z1,
      z2 = si * y + ci * z1,
      e = f / (f - z2);
    X.push(cx + x1 * R * e);
    Y.push(cy - y2 * R * e);
    Z.push(z2);
  }
  g.lineWidth = 0.7;
  for (var k = 0; k < ORB.L.length; k++) {
    var A = ORB.L[k][0],
      B = ORB.L[k][1],
      zm = (Z[A] + Z[B]) / 2;
    g.strokeStyle = rgba(zm < -0.2 ? 0.06 : zm < 0.35 ? 0.13 : 0.24);
    g.beginPath();
    g.moveTo(X[A], Y[A]);
    g.lineTo(X[B], Y[B]);
    g.stroke();
  }
  for (i = 0; i < P.length; i++) {
    var zz = Z[i],
      al = zz < -0.4 ? 0.25 : zz < 0.2 ? 0.5 : zz < 0.7 ? 0.8 : 1,
      sz = zz < -0.4 ? 0.7 : zz < 0.2 ? 0.95 : zz < 0.7 ? 1.15 : 1.4;
    if (P[i][4] > 0.96 && zz > 0) {
      al = 0.5 + 0.5 * Math.sin(P[i][3] + tt * 2);
      sz = 1.9;
    }
    g.fillStyle = rgba(al);
    g.beginPath();
    g.arc(X[i], Y[i], sz, 0, 6.283);
    g.fill();
  }
  // núcleo
  var nc = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.34);
  nc.addColorStop(0, "rgba(255,255,255," + (0.55 + nivel * 0.4) + ")");
  nc.addColorStop(0.4, rgba(0.35));
  nc.addColorStop(1, rgba(0));
  g.fillStyle = nc;
  g.beginPath();
  g.arc(cx, cy, R * 0.34, 0, 6.283);
  g.fill();
}
var ultQuadro = 0;
function quadro(t) {
  requestAnimationFrame(quadro);
  var login = $("tLogin").classList.contains("on");
  if (document.hidden || (!login && !$("tHari").classList.contains("on")))
    return;
  if (t - ultQuadro < 28) return;
  ultQuadro = t;
  var alvo =
    ESTADO === "falando"
      ? 0.35 + 0.3 * Math.abs(Math.sin(t / 120))
      : ESTADO === "ouvindo"
        ? 0.25 + 0.15 * Math.sin(t / 200)
        : 0;
  nivel += (alvo - nivel) * 0.2;
  if (!login) desenharOrbe($("orbe"), t);
}
requestAnimationFrame(quadro);
function estado(s) {
  ESTADO = s;
  $("rotulo").textContent =
    s === "ouvindo"
      ? "Ouvindo…"
      : s === "pensando"
        ? "Pensando…"
        : s === "falando"
          ? "Falando…"
          : s === "erro"
            ? "Algo deu errado"
            : "Clique na esfera e fale comigo";
}

// ═════ NAVEGAÇÃO (as abas mudam com o perfil) ═════
var telaAtual = "tHari";
var ICN = {
  hari: '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/>',
  mapa: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  hor: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  agenda:
    '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  cursos:
    '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  unid: '<path d="M3 21V9l9-6 9 6v12z"/><path d="M9 21v-6h6v6"/>',
  aj: '<path d="m9.7 3 .5-1h3.6l.5 1 1.5.7 1.1-.4 2.5 2.5-.4 1.1.7 1.5 1 .5v3.6l-1 .5-.7 1.5.4 1.1-2.5 2.5-1.1-.4-1.5.7-.5 1h-3.6l-.5-1-1.5-.7-1.1.4-2.5-2.5.4-1.1-.7-1.5-1-.5V8.9l1-.5.7-1.5-.4-1.1 2.5-2.5 1.1.4L9.7 3Z"/><circle cx="12" cy="10.7" r="2.7"/>',
};
function abasDoPerfil() {
  var p = perfil();
  if (p === "professor")
    return [
      ["tHari", "H.A.R.I", "hari"],
      ["tMapa", "Mapa", "mapa"],
      ["tHorarios", "Aulas", "hor"],
      ["tAgenda", "Agenda", "agenda"],
      ["tAjustes", "Configurações", "aj"],
    ];
  if (p === "empresa" || p === "visitante")
    return [
      ["tHari", "H.A.R.I", "hari"],
      ["tMapa", "Mapa", "mapa"],
      ["tCursos", "Cursos", "cursos"],
      ["tUnidade", "Unidade", "unid"],
      ["tAjustes", "Configurações", "aj"],
    ];
  return [
    ["tHari", "H.A.R.I", "hari"],
    ["tMapa", "Mapa", "mapa"],
    ["tHorarios", "Horários", "hor"],
    ["tAgenda", "Agenda", "agenda"],
    ["tAjustes", "Configurações", "aj"],
  ];
}
function montarNav() {
  $("nav").innerHTML = abasDoPerfil()
    .map(function (a) {
      return (
        '<button data-t="' +
        a[0] +
        '"><svg class="i" viewBox="0 0 24 24">' +
        ICN[a[2]] +
        "</svg>" +
        a[1] +
        "</button>"
      );
    })
    .join("");
  $("nav")
    .querySelectorAll("button")
    .forEach(function (b) {
      b.onclick = function () {
        irPara(b.dataset.t);
      };
    });
}
function irPara(t) {
  telaAtual = t;
  document.querySelectorAll(".tela").forEach(function (e) {
    e.classList.toggle("on", e.id === t);
  });
  document.querySelectorAll("#nav button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.t === t);
  });
  $("fab").classList.toggle(
    "on",
    (t === "tHorarios" && podeEditarGrade()) || t === "tAgenda",
  );
  if (t === "tMapa") desenharMapa();
  if (t === "tHorarios") renderHorarios();
  if (t === "tAjustes") renderAjustes();
  if (t === "tHari") renderAgora();
  if (t === "tAgenda") renderAgenda();
  if (t === "tCursos") renderCursos();
  if (t === "tUnidade") renderUnidade();
}
// botão voltar do Android: fecha a folha, sai do modo marcar, volta para o início; senão, deixa o app fechar
window.hariVoltar = function () {
  if ($("folha").classList.contains("on")) {
    fecharFolha();
    return true;
  }
  if (PICK) {
    cancelarPick();
    return true;
  }
  if ($("tLogin").classList.contains("on")) return false;
  if (telaAtual !== "tHari") {
    irPara("tHari");
    return true;
  }
  return false;
};

// ═════ INÍCIO ═════
function renderAgora() {
  $("subUnidade").textContent = D.unidade || "Seu guia no SENAI";
  var s = situacao(),
    h = "",
    a,
    sl;
  if (s.atual) {
    a = s.atual;
    sl = sala(a.sala);
    var rest = min(a.fim) - s.m;
    h =
      '<div class="agora"><div class="ic">' +
      icone(a.tipo === "intervalo" ? "cafe" : "livro") +
      '</div><div style="flex:1;min-width:0"><div class="tag">Agora · termina em ' +
      fmtDur(rest) +
      '</div><div class="tt">' +
      esc(a.disciplina) +
      '</div><div class="ds">' +
      esc(sl ? sl.nome : "") +
      (a.professor ? " · " + esc(a.professor) : "") +
      "</div></div>" +
      (sl
        ? '<button class="botao peq" onclick="mostrarRota(\'' +
          sl.id +
          "')\">Ir</button>"
        : "") +
      "</div>";
  } else if (s.prox) {
    a = s.prox.a;
    sl = sala(a.sala);
    var quando =
      s.prox.dias === 0
        ? "começa em " + fmtDur(s.prox.falta)
        : s.prox.dias === 1
          ? "amanhã às " + a.inicio
          : DIAS[(s.dia + s.prox.dias) % 7].toLowerCase() + " às " + a.inicio;
    h =
      '<div class="agora"><div class="ic">' +
      icone("relogio") +
      '</div><div style="flex:1;min-width:0"><div class="tag">Próxima aula · ' +
      quando +
      '</div><div class="tt">' +
      esc(a.disciplina) +
      '</div><div class="ds">' +
      esc(sl ? sl.nome : "") +
      (a.professor ? " · " + esc(a.professor) : "") +
      "</div></div>" +
      (sl
        ? '<button class="botao peq" onclick="mostrarRota(\'' +
          sl.id +
          "')\">Ir</button>"
        : "") +
      "</div>";
  } else
    h =
      '<div class="agora"><div class="ic">' +
      icone("relogio") +
      '</div><div><div class="tt">Sem aulas cadastradas</div><div class="ds">Cadastre sua grade na aba Horários.</div></div></div>';
  var pf = perfil();
  if (pf === "empresa" || pf === "visitante") {
    var rec = D.info.horarios[0] || {};
    h =
      '<div class="agora"><div class="ic">' +
      icone("pino") +
      '</div><div style="flex:1;min-width:0"><div class="tag">' +
      (pf === "empresa"
        ? "Bem-vindo, " + esc((conta() || {}).empresa || "empresa parceira")
        : "Visitante") +
      '</div><div class="tt">' +
      esc(D.unidade) +
      '</div><div class="ds">' +
      esc(rec.t ? rec.t + ": " + rec.h : "") +
      '</div></div><button class="botao peq" onclick="mostrarRota(\'secretaria\')">Recepção</button></div>';
  } else {
    var ev = proximosEventos(1)[0];
    if (ev)
      h +=
        '<div class="nota" style="margin:8px 4px 0">📌 ' +
        esc(
          rotuloData(ev.data) +
            (ev.inicio ? " " + ev.inicio : "") +
            " · " +
            ev.titulo,
        ) +
        "</div>";
  }
  $("cxAgora").innerHTML = h;
  $("pontoIa").className = "ponto ok";
  $("txIa").textContent = "online";
  renderSugestoes();
}
function icone(n) {
  var p =
    {
      livro:
        '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
      cafe: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
      relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      pino: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
      editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    }[n] || "";
  return '<svg class="i" viewBox="0 0 24 24">' + p + "</svg>";
}
function renderSugestoes() {
  var acoes = [
    ["▣", "Meus Horários de Aula", "Qual minha próxima aula?"],
    ["⌖", "Onde fica minha sala?", "Onde fica minha sala?"],
    ["◎", "Mudar Idioma", "Quero mudar o idioma"],
    ["◉", "Recursos de Acessibilidade", "Quais recursos de acessibilidade estão disponíveis?"],
  ];
  $("sugestoes").innerHTML = acoes
    .map(function (a) {
      return '<button class="chip chat-quick" type="button"><span class="quick-icon">' +
        a[0] + "</span><span>" + esc(a[1]) + "</span></button>";
    })
    .join("");
  $("sugestoes")
    .querySelectorAll(".chip")
    .forEach(function (b) {
      b.onclick = function () {
        var acao = acoes.find(function (a) {
          return a[1] === b.textContent.trim();
        });
        enviar(acao ? acao[2] : b.textContent);
      };
    });
}

// ═════ CONVERSA ═════
var HIST = [],
  pedidoN = 0,
  pendentes = {};
function addMsg(quem, texto, extra) {
  $("palco").classList.add("mini");
  var d = document.createElement("div");
  d.className = "msg " + quem;
  d.textContent = texto;
  if (extra && extra.acoes && extra.acoes.length) {
    var ac = document.createElement("div");
    ac.className = "acoes";
    extra.acoes.forEach(function (a) {
      var b = document.createElement("button");
      b.className = "botao peq " + (a.sec ? "sec" : "");
      b.textContent = a.t;
      b.onclick = a.f;
      ac.appendChild(b);
    });
    d.appendChild(ac);
  }
  if (extra && extra.fonte) {
    var f = document.createElement("div");
    f.className = "fonte";
    f.textContent = extra.fonte;
    d.appendChild(f);
  }
  $("conversa").appendChild(d);
  $("conversa").scrollTop = 1e9;
  return d;
}
function digitando() {
  var d = document.createElement("div");
  d.className = "msg ia digitando";
  d.innerHTML = "<span></span><span></span><span></span>";
  $("conversa").appendChild(d);
  $("conversa").scrollTop = 1e9;
  return d;
}
function enviar(txt) {
  txt = String(txt || "").trim();
  if (!txt) return;
  $("entrada").value = "";
  addMsg("eu", txt);
  if (N && N.pararFala) N.pararFala();
  perguntarIA(txt);
}
function responder(r, fonte) {
  var acoes = [];
  if (r.sala) {
    var id = r.sala;
    acoes.push({
      t: "Ver rota no mapa",
      f: function () {
        mostrarRota(id);
      },
    });
  }
  if (r.dia !== undefined && r.dia !== null) {
    var dd = r.dia;
    acoes.push({
      t: "Ver horários de " + DIAS[dd].toLowerCase(),
      sec: true,
      f: function () {
        diaSel = dd;
        irPara("tHorarios");
      },
    });
  }
  addMsg("ia", r.texto, { acoes: acoes, fonte: fonte });
  if (CFG.voz && N && N.falar) {
    estado("falando");
    falarTexto(r.texto.replace(/[•*#_]/g, ""));
  } else estado("pronto");
}
window.hariFalaFim = function () {
  if (ESTADO === "falando") estado("pronto");
};

// ── IA: a chamada é feita pelo backend configurado no servidor. ──
function contexto() {
  var s = situacao(),
    n = agoraData();
  var salas = D.salas.map(function (x) {
    return {
      id: x.id,
      nome: x.nome,
      onde: ondeFica(x),
      tipo: TIPOS[x.tipo] || x.tipo,
      dica: x.dica || "",
      apelidos: x.apelidos || "",
    };
  });
  var aulas = D.aulas
    .slice()
    .sort(function (a, b) {
      return a.dia - b.dia || min(a.inicio) - min(b.inicio);
    })
    .map(function (a) {
      var sl = sala(a.sala);
      return (
        DIAS[a.dia] +
        " " +
        a.inicio +
        "-" +
        a.fim +
        ": " +
        a.disciplina +
        (a.professor ? " (" + a.professor + ")" : "") +
        (sl ? " — " + sl.nome + " [" + sl.id + "]" : "")
      );
    });
  var pf = perfil(),
    quem =
      {
        aluno: "um aluno",
        professor: "um professor",
        empresa: "o representante de uma empresa",
        visitante: "um visitante",
      }[pf] || "um aluno";
  var foco =
    pf === "professor"
      ? "Ajude o professor a se localizar, ver as aulas que ele dá, reservas de sala e a agenda (provas, avisos). "
      : pf === "empresa" || pf === "visitante"
        ? "Ajude a pessoa a chegar e se localizar na unidade (recepção, auditório…), conhecer os cursos, horários de atendimento e formas de contato e parceria (cursos para empresas, aprendizes, estágios). Não fale da grade de aulas a menos que perguntem. "
        : "Ajude o aluno a se localizar e a saber os horários das aulas e a agenda (provas, entregas). ";
  var ag = (D.agenda || [])
    .filter(function (e) {
      return e.data >= hojeISO();
    })
    .slice(0, 30)
    .map(function (e) {
      var sl = sala(e.sala);
      return (
        e.data +
        " " +
        (e.inicio || "") +
        " " +
        e.tipo +
        ": " +
        e.titulo +
        (sl ? " — " + sl.nome : "")
      );
    });
  return (
    "Você é o H.A.R.I (Hub de Apoio a Rotas e Informações), assistente do SENAI falando com " +
    quem +
    ". " +
    "Seu foco: ajudar a se localizar na unidade (salas, blocos, laboratórios, banheiros, secretaria…) e informar horários. " +
    foco +
    "Responda SEMPRE em português do Brasil, curto (no máximo 4 frases), simpático e direto, como falado (sem markdown, sem listas longas). " +
    "Use APENAS os dados abaixo para salas e horários; se algo não estiver cadastrado, diga que não está no cadastro e sugira adicionar nas Configurações. Não invente salas, professores ou horários. " +
    "Perguntas gerais de estudo você pode responder normalmente, mas brevemente.\n" +
    "Quando a resposta envolver um lugar, termine com a etiqueta [MAPA:id] (id da sala). Quando envolver a grade de um dia, termine com [DIA:n] (0=domingo … 6=sábado). No máximo uma de cada.\n\n" +
    "Agora: " +
    DIAS[n.getDay()] +
    ", " +
    n.toLocaleDateString("pt-BR") +
    " " +
    String(n.getHours()).padStart(2, "0") +
    ":" +
    String(n.getMinutes()).padStart(2, "0") +
    ".\n" +
    (D.nome ? "Nome do usuário: " + D.nome + ".\n" : "") +
    "Unidade: " +
    D.unidade +
    ". Turma: " +
    D.turma +
    ".\n" +
    "O aluno está agora em: " +
    ((sala(CFG.de) || {}).nome || "entrada") +
    ".\n" +
    (s.atual
      ? "Aula acontecendo agora: " +
        s.atual.disciplina +
        " até " +
        s.atual.fim +
        ".\n"
      : "") +
    (s.prox
      ? "Próxima aula: " +
        s.prox.a.disciplina +
        " (" +
        DIAS[s.prox.a.dia] +
        " " +
        s.prox.a.inicio +
        ").\n"
      : "") +
    "\nUNIDADE (dados públicos): " +
    JSON.stringify({
      endereco: D.info.endereco,
      telefones: D.info.telefones.map(function (t) {
        return t.t + ": " + t.n;
      }),
      email: D.info.email,
      horarios: D.info.horarios,
      area: D.info.area,
      cursos: D.info.cursos.map(function (c) {
        return c.n + " (" + c.nivel + ")";
      }),
    }) +
    (D.mapaAproximado
      ? "\nAtenção: as posições das salas no mapa são aproximadas; avise isso se perguntarem detalhes exatos."
      : "") +
    (D.mapaFonte
      ? "\nMapa: " +
        D.mapaFonte +
        " Andares: subsolo, térreo e pavimento superior."
      : "") +
    "\nSALAS (JSON): " +
    JSON.stringify(salas) +
    "\n\nGRADE DE AULAS:\n" +
    aulas.join("\n") +
    (ag.length ? "\n\nAGENDA:\n" + ag.join("\n") : "")
  );
}
function perguntarIA(txt) {
  HIST.push({ role: "user", parts: [{ text: txt }] });
  if (HIST.length > 16) HIST = HIST.slice(HIST.length - 16);
  while (HIST.length && HIST[0].role !== "user") HIST.shift();
  estado("pensando");
  var dg = digitando(),
    id = "p" + ++pedidoN;
  pendentes[id] = { dg: dg, txt: txt };
  fetch(window.HARI_API_URL || "http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: txt }),
  })
    .then(function (response) {
    return response.json().then(function (payload) {
      if (!response.ok) {
        throw new Error(payload.error || "HTTP " + response.status);
      }
      return payload;
    });
  })
    .then(function (payload) {
      if (!payload.success) throw new Error(payload.error || "Resposta inválida");
      window.hariResposta(id, JSON.stringify({
        ok: true,
        texto: payload.data.message,
        action: payload.data.action,
      }));
    })
    .catch(function (error) {
      window.hariResposta(id, JSON.stringify({ ok: false, erro: error.message }));
    });
}
window.hariResposta = function (id, js) {
  var p = pendentes[id];
  if (!p) return;
  delete pendentes[id];
  p.dg.remove();
  var r;
  try {
    r = JSON.parse(js);
  } catch (e) {
    r = { ok: false, erro: "resposta inválida" };
  }
  if (!r.ok) {
    HIST.pop();
    var l = local(p.txt);
    responder(
      l,
      "IA indisponível (" + (r.erro || "erro") + ") · respondi no modo offline",
    );
    return;
  }
  var t = String(r.texto || "").trim(),
    out = { texto: t };
  if (r.action && r.action.type === "NAVIGATE_TO_ROOM" && r.action.roomId) {
    out.sala = r.action.roomId;
  }
  var m = t.match(/\[MAPA:([^\]]+)\]/);
  if (m && sala(m[1].trim())) out.sala = m[1].trim();
  var dm = t.match(/\[DIA:(\d)\]/);
  if (dm) out.dia = +dm[1];
  out.texto =
    t
      .replace(/\[(MAPA|DIA):[^\]]*\]/g, "")
      .replace(/\*\*/g, "")
      .trim() || "Pronto.";
  HIST.push({ role: "model", parts: [{ text: out.texto }] });
  responder(out, "H.A.R.I API");
};

// ── modo offline: entende as perguntas mais comuns sobre salas e horários ──
function acharSala(q) {
  var nq = " " + norm(q) + " ",
    melhor = null,
    mp = 0;
  // número de sala ("sala 201", "201")
  var num = nq.match(/\b(\d{2,4})\b/);
  D.salas.forEach(function (s) {
    var nome = norm(s.nome),
      pts = 0,
      ws = (nome + " " + norm(s.apelidos)).split(" ").filter(function (w) {
        return (
          w.length > 2 &&
          [
            "de",
            "da",
            "do",
            "sala",
            "laboratorio",
            "oficina",
            "bloco",
            "aula",
            "lab",
          ].indexOf(w) < 0
        );
      });
    if (nq.indexOf(" " + nome + " ") >= 0) pts += 10;
    ws.forEach(function (w) {
      if (
        nq.indexOf(" " + w + " ") >= 0 ||
        (w.length > 4 && nq.indexOf(" " + w.slice(0, w.length - 1)) >= 0)
      )
        pts += 2;
    });
    if (num && nome.indexOf(num[1]) >= 0) pts += 8;
    if (/\blab/.test(nq) && s.tipo === "lab") pts += 1;
    var dn = nome.match(/\b(\d)\b/);
    if (dn && nq.indexOf(" " + dn[1] + " ") >= 0) pts += 3;
    if (pts > mp) {
      mp = pts;
      melhor = s;
    }
  });
  return mp >= 2 ? melhor : null;
}
function acharAula(q) {
  var nq = " " + norm(q) + " ",
    melhor = null,
    mp = 0;
  D.aulas.forEach(function (a) {
    if (a.tipo === "intervalo") return;
    var pts = 0;
    norm(a.disciplina)
      .split(" ")
      .forEach(function (w) {
        if (w.length > 3 && nq.indexOf(" " + w) >= 0) pts += 2;
      });
    if (nq.indexOf(norm(a.disciplina)) >= 0) pts += 6;
    if (pts > mp) {
      mp = pts;
      melhor = a;
    }
  });
  return mp >= 2 ? melhor : null;
}
function acharDia(q) {
  var nq = norm(q),
    hoje = agoraData().getDay();
  if (/\bdepois de amanha\b/.test(nq)) return (hoje + 2) % 7;
  if (/\bamanha\b/.test(nq)) return (hoje + 1) % 7;
  if (/\bhoje\b/.test(nq)) return hoje;
  var mapa = [
    ["domingo"],
    ["segunda", "seg"],
    ["terca", "ter"],
    ["quarta", "qua"],
    ["quinta", "qui"],
    ["sexta", "sex"],
    ["sabado", "sab"],
  ];
  for (var i = 0; i < 7; i++)
    for (var j = 0; j < mapa[i].length; j++)
      if (new RegExp("\\b" + mapa[i][j] + "\\b").test(nq)) return i;
  return null;
}
function listaDia(d) {
  var l = aulasDoDia(d);
  if (!l.length)
    return {
      texto: "Não há aulas cadastradas para " + DIAS[d].toLowerCase() + ".",
      dia: d,
    };
  return {
    texto:
      DIAS[d] +
      ":\n" +
      l
        .map(function (a) {
          var s = sala(a.sala);
          return (
            "• " +
            a.inicio +
            "–" +
            a.fim +
            " " +
            a.disciplina +
            (s ? " (" + s.nome + ")" : "")
          );
        })
        .join("\n"),
    dia: d,
  };
}
function local(q) {
  var nq = norm(q),
    s = situacao(),
    a,
    sl,
    d = acharDia(q);
  var oi = D.nome ? ", " + D.nome.split(" ")[0] : "";
  if (
    /^(oi|ola|e ai|bom dia|boa tarde|boa noite|eai|salve)\b/.test(nq) &&
    nq.split(" ").length <= 4
  )
    return {
      texto:
        "Olá" +
        oi +
        "! Sou o H.A.R.I. Posso te dizer onde fica qualquer sala da unidade e quais são suas aulas. É só perguntar.",
    };
  if (/\b(ajuda|o que voce faz|quem e voce|quem voce e)\b/.test(nq))
    return {
      texto:
        "Eu sou o H.A.R.I, Hub de Apoio a Rotas e Informações. Pergunte coisas como: onde fica a secretaria, como chego no laboratório, qual minha próxima aula ou quais as aulas de quinta.",
    };
  if (
    /\b(intervalo|recreio|lanche)\b/.test(nq) &&
    !/\b(onde|como chego|cantina fica)\b/.test(nq)
  ) {
    var dd = d === null ? s.dia : d,
      iv = aulasDoDia(dd).filter(function (x) {
        return x.tipo === "intervalo";
      });
    if (!iv.length)
      return {
        texto:
          "Não achei intervalo cadastrado para " + DIAS[dd].toLowerCase() + ".",
      };
    sl = sala(iv[0].sala);
    return {
      texto:
        "O intervalo de " +
        DIAS[dd].toLowerCase() +
        " é das " +
        iv[0].inicio +
        " às " +
        iv[0].fim +
        (sl ? ", geralmente na " + sl.nome : "") +
        ".",
      sala: sl ? sl.id : null,
    };
  }
  if (
    /\b(curso|cursos|tecnico|graduacao|pos|faculdade)\b/.test(nq) &&
    !/\b(onde|aula)\b/.test(nq)
  )
    return {
      texto:
        "Na " +
        D.unidade +
        ": " +
        D.info.cursos
          .map(function (c) {
            return c.n + " (" + c.nivel.split(" —")[0].toLowerCase() + ")";
          })
          .join("; ") +
        ".",
    };
  if (
    /\b(endereco|como chegar na escola|fica a escola|localizacao da escola)\b/.test(
      nq,
    )
  )
    return {
      texto:
        "O endereço é " +
        D.info.endereco +
        ". Na aba Unidade tem o botão para abrir no Google Maps.",
    };
  if (/\b(telefone|contato|email|whatsapp|falar com)\b/.test(nq))
    return {
      texto:
        "Contato: " +
        D.info.telefones
          .map(function (t) {
            return t.t + " " + t.n;
          })
          .join("; ") +
        ". E-mail: " +
        D.info.email +
        ".",
    };
  if (
    /\b(horario|abre|fecha|funciona|atendimento)\b/.test(nq) &&
    /\b(secretaria|recepcao|biblioteca|atendimento|escola|unidade)\b/.test(nq)
  ) {
    var hb = /biblioteca/.test(nq) ? D.info.horarios[1] : D.info.horarios[0];
    return {
      texto: hb.t + ": " + hb.h + ".",
      sala: /biblioteca/.test(nq) ? "biblioteca" : "secretaria",
    };
  }
  if (
    /\b(aprendiz|aprendizes|estagio|estagiario|contratar|parceria|empresa)\b/.test(
      nq,
    )
  )
    return {
      texto:
        "Para empresas o SENAI oferece cursos sob medida, aprendizagem industrial (Aprendiz SENAI), estágios e serviços técnicos. Fale com a Central " +
        D.info.telefones[0].n +
        " ou veja o portfólio na aba Cursos.",
    };
  if (
    /\b(prova|provas|entrega|trabalho|agenda|evento|reserva|aviso)\b/.test(nq)
  ) {
    var evs = proximosEventos(30)
      .filter(function (e) {
        return /reserva/.test(nq)
          ? e.tipo === "reserva"
          : /prova/.test(nq)
            ? e.tipo === "prova"
            : true;
      })
      .slice(0, 4);
    if (!evs.length)
      return { texto: "Não há nada assim na agenda dos próximos dias." };
    return {
      texto: evs
        .map(function (e) {
          var sl = sala(e.sala);
          return (
            rotuloData(e.data) +
            (e.inicio ? " às " + e.inicio : "") +
            ": " +
            e.titulo +
            (sl ? " (" + sl.nome + ")" : "")
          );
        })
        .join("\n"),
      sala: evs[0].sala || null,
    };
  }
  var querLugar =
    /\b(onde|como chego|como chegar|chegar|caminho|rota|fica|ir para|ir pro|ir na|ir no|leva|localiza)/.test(
      nq,
    );
  var prof = /\b(professor|professora|prof|profa|quem da|quem e o)\b/.test(nq);
  a = acharAula(q);
  if (prof && a)
    return {
      texto:
        a.disciplina +
        " é com " +
        (a.professor || "professor não cadastrado") +
        ", " +
        DIAS[a.dia].toLowerCase() +
        " das " +
        a.inicio +
        " às " +
        a.fim +
        ".",
      dia: +a.dia,
    };
  if (querLugar && a && !acharSala(q)) {
    sl = sala(a.sala);
    return {
      texto:
        "A aula de " +
        a.disciplina +
        " (" +
        DIAS[a.dia].toLowerCase() +
        ", " +
        a.inicio +
        ") é na " +
        (sl
          ? sl.nome + ", " + ondeFica(sl) + "." + (sl.dica ? " " + sl.dica : "")
          : "sala não cadastrada."),
      sala: sl ? sl.id : null,
    };
  }
  sl = acharSala(q);
  if (sl && (querLugar || !/\b(aula|horario)\b/.test(nq)))
    return {
      texto:
        sl.nome +
        ": " +
        ondeFica(sl) +
        "." +
        (sl.dica ? " " + sl.dica : "") +
        " Clique em “Ver rota” que eu te mostro o caminho.",
      sala: sl.id,
    };
  if (
    /\b(proxima|agora|qual aula|que aula|minha aula|tenho aula)\b/.test(nq) &&
    d === null
  ) {
    if (s.atual && !/proxima/.test(nq)) {
      sl = sala(s.atual.sala);
      return {
        texto:
          "Agora é " +
          s.atual.disciplina +
          (sl ? " na " + sl.nome : "") +
          ", até as " +
          s.atual.fim +
          ".",
        sala: sl ? sl.id : null,
      };
    }
    if (s.prox) {
      a = s.prox.a;
      sl = sala(a.sala);
      var q2 =
        s.prox.dias === 0
          ? "hoje às " + a.inicio + " (daqui a " + fmtDur(s.prox.falta) + ")"
          : s.prox.dias === 1
            ? "amanhã às " + a.inicio
            : DIAS[a.dia].toLowerCase() + " às " + a.inicio;
      return {
        texto:
          "Sua próxima aula é " +
          a.disciplina +
          (a.professor ? " com " + a.professor : "") +
          ", " +
          q2 +
          (sl ? ", na " + sl.nome + " (" + ondeFica(sl) + ")" : "") +
          ".",
        sala: sl ? sl.id : null,
      };
    }
    return {
      texto:
        "Não encontrei aulas cadastradas. Adicione sua grade na aba Horários.",
    };
  }
  if (/\b(termina|acaba|saio|sair|saida|ultima aula)\b/.test(nq)) {
    var dd2 = d === null ? s.dia : d,
      l = aulasDoDia(dd2);
    if (!l.length)
      return {
        texto: "Sem aulas cadastradas para " + DIAS[dd2].toLowerCase() + ".",
      };
    return {
      texto:
        "Em " +
        DIAS[dd2].toLowerCase() +
        " a última aula termina às " +
        l[l.length - 1].fim +
        ".",
      dia: dd2,
    };
  }
  if (
    /\b(comeca|entro|entrada|chegar cedo|primeira aula)\b/.test(nq) &&
    d !== null
  ) {
    var l2 = aulasDoDia(d);
    if (l2.length)
      return {
        texto:
          "Em " +
          DIAS[d].toLowerCase() +
          " a primeira aula começa às " +
          l2[0].inicio +
          " (" +
          l2[0].disciplina +
          ").",
        dia: d,
      };
  }
  if (d !== null) return listaDia(d);
  if (a) {
    sl = sala(a.sala);
    return {
      texto:
        a.disciplina +
        ": " +
        DIAS[a.dia].toLowerCase() +
        " das " +
        a.inicio +
        " às " +
        a.fim +
        (sl ? ", na " + sl.nome : "") +
        (a.professor ? ", com " + a.professor : "") +
        ".",
      sala: sl ? sl.id : null,
      dia: +a.dia,
    };
  }
  if (/\b(laboratorios|labs|oficinas|salas)\b/.test(nq)) {
    var tp = /oficina/.test(nq) ? "oficina" : /lab/.test(nq) ? "lab" : "sala",
      ls = D.salas.filter(function (x) {
        return x.tipo === tp;
      });
    return {
      texto:
        "Cadastrados: " +
        ls
          .map(function (x) {
            return x.nome + " (" + ondeFica(x) + ")";
          })
          .join("; ") +
        ".",
    };
  }
  return {
    texto:
      "Não entendi bem. Posso responder sobre salas (ex.: “onde fica a biblioteca?”) e horários (ex.: “aulas de quarta”). Tente reformular a pergunta.",
  };
}

// ── voz ──
$("btMic").onclick = $("orbe").onclick = function () {
  if (!N || !N.ouvir) {
    toast("A voz funciona no app do celular");
    return;
  }
  if (N.pararFala) N.pararFala();
  estado("ouvindo");
  $("btMic").classList.add("gravando");
  N.ouvir();
};
window.hariVoz = function (t) {
  $("btMic").classList.remove("gravando");
  estado("pronto");
  if (t) enviar(t);
};
window.hariVozErro = function (m) {
  $("btMic").classList.remove("gravando");
  estado("pronto");
  if (m) toast(m);
};
$("btEnviar").onclick = function () {
  enviar($("entrada").value);
};
$("entrada").addEventListener("keydown", function (e) {
  if (e.key === "Enter") enviar($("entrada").value);
});
