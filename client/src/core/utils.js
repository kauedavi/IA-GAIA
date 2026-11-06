// ── utilitários ──
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function min(h) {
  var p = String(h || "0:0").split(":");
  return +p[0] * 60 + (+p[1] || 0);
}
function novoId(p) {
  return (
    p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
  );
}
function sala(id) {
  for (var i = 0; i < D.salas.length; i++)
    if (D.salas[i].id === id) return D.salas[i];
  return null;
}
function bloco(id) {
  for (var i = 0; i < D.blocos.length; i++)
    if (D.blocos[i].id === id) return D.blocos[i];
  return null;
}
function nomeAndar(a) {
  a = +a || 0;
  return a === 0
    ? "térreo"
    : a < 0
      ? "subsolo"
      : D && D.rede && a === 1
        ? "pavimento superior"
        : a + "º andar";
}
function ondeFica(s) {
  if (!s) return "";
  var b = bloco(s.bloco);
  return (b ? b.nome : "área externa") + ", " + nomeAndar(s.andar);
}
function toast(t) {
  var e = $("toast");
  e.textContent = t;
  e.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(function () {
    e.classList.remove("on");
  }, 2600);
}
function agoraData() {
  return window.__agora ? new Date(window.__agora) : new Date();
}
function fmtDur(m) {
  if (m < 60) return m + " min";
  var h = Math.floor(m / 60),
    r = m % 60;
  return h + "h" + (r ? String(r).padStart(2, "0") : "");
}
function aulasDoDia(d) {
  return D.aulas
    .filter(function (a) {
      return +a.dia === d;
    })
    .sort(function (a, b) {
      return min(a.inicio) - min(b.inicio);
    });
}

// agora / próxima aula
function situacao() {
  var n = agoraData(),
    d = n.getDay(),
    m = n.getHours() * 60 + n.getMinutes(),
    hoje = aulasDoDia(d),
    atual = null,
    prox = null,
    i;
  for (i = 0; i < hoje.length; i++) {
    var a = hoje[i];
    if (min(a.inicio) <= m && m < min(a.fim) && !atual) atual = a;
    else if (min(a.inicio) > m && !prox && a.tipo !== "intervalo")
      prox = { a: a, dias: 0, falta: min(a.inicio) - m };
  }
  if (!prox) {
    for (var k = 1; k <= 7 && !prox; k++) {
      var dd = (d + k) % 7,
        l = aulasDoDia(dd).filter(function (x) {
          return x.tipo !== "intervalo";
        });
      if (l.length)
        prox = { a: l[0], dias: k, falta: k * 1440 - m + min(l[0].inicio) };
    }
  }
  return { atual: atual, prox: prox, hoje: hoje, dia: d, m: m };
}
