// ── cartão da rota (2D e 3D) com o passo a passo novo ──
var renderRotaAntigo = renderRota;
renderRota = function () {
  renderRotaAntigo();
  var de = sala(CFG.de),
    para = DESTINO ? sala(DESTINO) : null,
    org = $("origemTx");
  if (org)
    org.textContent = de
      ? rotuloCurto(de.nome) + (+de.andar ? " · " + nomeAndar(de.andar) : "")
      : "—";
  if (!D.rede || PLANTA) return;
  if (!para) {
    $("rota").innerHTML =
      '<div class="nota" style="padding:4px 2px">Clique numa sala no mapa ou busque acima para ver o caminho. Não sabe onde está? Clique em <b>📍 Onde estou?</b></div>';
    return;
  }
  var sv = CFG.de,
    ps = de && de.id !== para.id ? passosNav() : [],
    res = resumoNav(ps);
  var h =
    '<div class="card"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div class="tag">Destino</div><div style="font-weight:700;font-size:17px">' +
    esc(para.ic ? para.ic + " " : "") +
    esc(para.nome) +
    '</div><div class="nota">' +
    esc(ondeFica(para)) +
    " · " +
    esc(TIPOS[para.tipo] || "") +
    '</div></div><button class="botao sec peq" id="btLimparRota">Limpar</button></div>';
  if (ps.length) {
    h += '<div class="resumoRota"><span>' + esc(res.txt) + "</span></div>";
    if (!M3.nav)
      h +=
        '<div class="acoesRota"><button class="botao" id="btNav">▶ Iniciar navegação</button><button class="botao sec peq" id="btInverter" title="Trocar origem e destino">⇅ Inverter</button></div>';
    h +=
      '<ol class="passos passosNav">' +
      ps
        .map(function (p, i) {
          return (
            '<li data-i="' +
            i +
            '"><span class="pIc">' +
            esc(p.ic) +
            "</span><div>" +
            esc(p.txt) +
            (p.sub && p.tipo !== "fim"
              ? '<div class="pSub">' + esc(p.sub) + "</div>"
              : "") +
            "</div></li>"
          );
        })
        .join("") +
      "</ol>";
  } else if (para.dica)
    h +=
      '<div class="nota" style="margin-top:8px">' + esc(para.dica) + "</div>";
  h +=
    '<div class="acoesRota" style="margin-top:10px"><button class="botao sec peq" id="btEstouAqui">📍 Estou aqui</button></div>';
  var aulasAqui = D.aulas.filter(function (a) {
    return a.sala === para.id && a.tipo !== "intervalo";
  });
  if (aulasAqui.length)
    h +=
      '<div class="nota" style="margin-top:8px"><b>Aulas aqui:</b> ' +
      aulasAqui
        .map(function (a) {
          return esc(DIAS_C[a.dia] + " " + a.inicio + " " + a.disciplina);
        })
        .join(" · ") +
      "</div>";
  h += "</div>";
  $("rota").innerHTML = h;
  $("btLimparRota").onclick = function () {
    sairNav(true);
    DESTINO = null;
    desenharMapa();
  };
  $("btEstouAqui").onclick = function () {
    definirOrigem(para.id);
  };
  var bn = $("btNav");
  if (bn) bn.onclick = iniciarNav;
  var bi = $("btInverter");
  if (bi)
    bi.onclick = function () {
      var d = CFG.de;
      CFG.de = para.id;
      salvarCfg();
      mostrarRota(d);
    };
  $("rota")
    .querySelectorAll(".passosNav li")
    .forEach(function (li) {
      li.onclick = function () {
        if (!M3.nav) iniciarNav();
        mostrarPasso(+li.dataset.i);
      };
    });
};
// ═════ INÍCIO ═════
aplicarTema();
setTimeout(ajustarVB, 50);
iniciarSessao();
setInterval(function () {
  if (telaAtual === "tHari") renderAgora();
  if (telaAtual === "tHorarios") renderHorarios();
}, 30000);
(function () {
  var s = situacao(),
    n = D.nome ? ", " + D.nome.split(" ")[0] : "",
    h = agoraData().getHours();
  var sd =
    h < 5
      ? "Boa noite"
      : h < 12
        ? "Bom dia"
        : h < 18
          ? "Boa tarde"
          : "Boa noite";
  window.__saudacao =
    sd +
    n +
    "! Eu sou o H.A.R.I. Pergunte onde fica uma sala ou quais são suas aulas.";
})();
