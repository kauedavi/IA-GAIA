// ═════ FOLHA (formulário) ═════
var folhaSalvar = null;
function abrirFolha(titulo, html, onSalvar, onApagar) {
  folhaSalvar = onSalvar;
  $("folhaCorpo").innerHTML =
    "<h2>" +
    esc(titulo) +
    "</h2>" +
    html +
    '<div class="rodape">' +
    (onApagar
      ? '<button class="botao perigo" id="fApagar">Apagar</button>'
      : "") +
    '<button class="botao sec" id="fCancelar">Cancelar</button><button class="botao" id="fSalvar">Salvar</button></div>';
  $("veu").classList.add("on");
  $("folha").classList.add("on");
  $("fCancelar").onclick = fecharFolha;
  $("fSalvar").onclick = function () {
    if (folhaSalvar() !== false) fecharFolha();
  };
  if (onApagar)
    $("fApagar").onclick = function () {
      if (this.dataset.ok) {
        onApagar();
        fecharFolha();
      } else {
        this.dataset.ok = 1;
        this.textContent = "Confirmar";
      }
    };
}
function fecharFolha() {
  $("veu").classList.remove("on");
  $("folha").classList.remove("on");
}
$("veu").onclick = fecharFolha;

// ═════ AJUSTES ═════
function renderAjustes() {
  $("aNome").value = D.nome || "";
  $("aUnidade").value = D.unidade || "";
  $("aTurma").value = D.turma || "";
  $("swVoz").classList.toggle("on", !!CFG.voz);
  $("swVoz").textContent = CFG.voz ? "Leitura ativada" : "Leitura desativada";
  $("swTema").classList.toggle("on", CFG.tema === "claro");
  $("swTema").textContent =
    CFG.tema === "claro" ? "☀️ Usar modo escuro" : "🌙 Usar modo claro";
  $("listaSalas").innerHTML = D.salas
    .map(function (s) {
      var b = bloco(s.bloco);
      return (
        '<button class="item" data-s="' +
        esc(s.id) +
        '"><span class="cor" style="background:' +
        (b ? b.cor : "#9cb8bd") +
        '"></span><span style="flex:1"><div class="tt">' +
        esc(s.nome) +
        '</div><div class="ds">' +
        esc(ondeFica(s)) +
        "</div></span>" +
        icone("editar") +
        "</button>"
      );
    })
    .join("");
  $("listaSalas")
    .querySelectorAll(".item")
    .forEach(function (b) {
      b.onclick = function () {
        editarSala(b.dataset.s);
      };
    });
  $("listaBlocos").innerHTML = D.blocos
    .map(function (b) {
      return (
        '<button class="item" data-b="' +
        esc(b.id) +
        '"><span class="cor" style="background:' +
        b.cor +
        '"></span><span style="flex:1"><div class="tt">' +
        esc(b.nome) +
        '</div><div class="ds">' +
        D.salas.filter(function (s) {
          return s.bloco === b.id;
        }).length +
        " lugares</div></span>" +
        icone("editar") +
        "</button>"
      );
    })
    .join("");
  $("listaBlocos")
    .querySelectorAll(".item")
    .forEach(function (b) {
      b.onclick = function () {
        editarBloco(b.dataset.b);
      };
    });
  $("versao").textContent =
    "H.A.R.I — Hub de Apoio a Rotas e Informações" +
    (N && N.versao ? " · v" + N.versao() : "");
  var c = conta(),
    pf = perfil();
  $("cartaoConta").innerHTML =
    '<div class="conta"><div class="avatar">' +
    esc(((c && c.nome) || "V").charAt(0).toUpperCase()) +
    '</div><div style="flex:1;min-width:0"><div style="font-weight:700">' +
    esc(c ? c.nome : "Visitante") +
    '</div><div class="nota">' +
    esc(
      {
        aluno: "Aluno",
        professor: "Professor(a)",
        empresa: "Empresa",
        visitante: "Visitante",
      }[pf],
    ) +
    (c && c.empresa ? " · " + esc(c.empresa) : "") +
    (c && c.usuario ? " · " + esc(c.usuario) : "") +
    "</div></div></div>";
  $("ajEdicao").style.display =
    pf === "empresa" || pf === "visitante" ? "none" : "";
  $("ajDados").style.display = pf === "visitante" ? "none" : "";
  $("btSair").textContent =
    pf === "visitante" ? "Sair do modo visitante" : "Sair da conta";
  montarVozes();
}
["aNome", "aUnidade", "aTurma"].forEach(function (id) {
  $(id).onchange = function () {
    D.nome = $("aNome").value.trim();
    D.unidade = $("aUnidade").value.trim();
    D.turma = $("aTurma").value.trim();
    salvar();
    toast("Salvo");
  };
});
$("swVoz").onclick = function () {
  CFG.voz = !CFG.voz;
  salvarCfg();
  this.classList.toggle("on", CFG.voz);
  this.textContent = CFG.voz ? "Leitura ativada" : "Leitura desativada";
  if (!CFG.voz && N && N.pararFala) N.pararFala();
};
$("swTema").onclick = function () {
  CFG.tema = CFG.tema === "claro" ? "escuro" : "claro";
  salvarCfg();
  aplicarTema();
  this.classList.toggle("on", CFG.tema === "claro");
  this.textContent =
    CFG.tema === "claro" ? "☀️ Usar modo escuro" : "🌙 Usar modo claro";
};
function aplicarTema() {
  if (CFG.tema === "claro") document.documentElement.dataset.tema = "claro";
  else delete document.documentElement.dataset.tema;
  if (N && N.tema) N.tema(CFG.tema === "claro");
}
var novaSala = function () {
  return {
    id: novoId("s"),
    nome: "",
    apelidos: "",
    bloco: D.blocos[0] ? D.blocos[0].id : "",
    andar: 0,
    tipo: "sala",
    x: 500,
    y: 650,
    dica: "",
  };
};
var rascunhoSala = null;
function editarSala(id, rasc) {
  var s = rasc || (id ? Object.assign({}, sala(id)) : novaSala()),
    nova = !id || !sala(id);
  rascunhoSala = s;
  abrirFolha(
    nova ? "Nova sala ou lugar" : "Editar lugar",
    '<div class="campo"><label>Nome</label><input id="sNome" value="' +
      esc(s.nome) +
      '" placeholder="Ex.: Laboratório de Informática 3"></div>' +
      '<div class="duas"><div class="campo"><label>Bloco</label><select id="sBloco"><option value="">Área externa</option>' +
      D.blocos
        .map(function (b) {
          return (
            '<option value="' +
            esc(b.id) +
            '"' +
            (b.id === s.bloco ? " selected" : "") +
            ">" +
            esc(b.nome.split(" —")[0]) +
            "</option>"
          );
        })
        .join("") +
      "</select></div>" +
      '<div class="campo"><label>Andar</label><select id="sAndar">' +
      [0, 1, 2, 3]
        .map(function (a) {
          return (
            '<option value="' +
            a +
            '"' +
            ((+s.andar || 0) === a ? " selected" : "") +
            ">" +
            (a === 0 ? "Térreo" : a + "º andar") +
            "</option>"
          );
        })
        .join("") +
      "</select></div></div>" +
      '<div class="campo"><label>Tipo</label><select id="sTipo">' +
      Object.keys(TIPOS)
        .map(function (t) {
          return (
            '<option value="' +
            t +
            '"' +
            (t === s.tipo ? " selected" : "") +
            ">" +
            TIPOS[t] +
            "</option>"
          );
        })
        .join("") +
      "</select></div>" +
      '<div class="campo"><label>Como chegar / dica</label><textarea id="sDica" rows="2" placeholder="Ex.: segunda porta à esquerda depois da escada">' +
      esc(s.dica) +
      "</textarea></div>" +
      '<div class="campo"><label>Outros nomes (para a busca e a IA)</label><input id="sApel" value="' +
      esc(s.apelidos) +
      '" placeholder="Ex.: lab 3 informatica"></div>' +
      '<div class="campo"><label>Posição no mapa</label><div style="display:flex;gap:8px;align-items:center"><span class="nota" style="flex:1">x ' +
      Math.round(s.x) +
      " · y " +
      Math.round(s.y) +
      '</span><button class="botao sec peq" id="sMarcar">Marcar no mapa</button></div></div>',
    function () {
      lerFormSala(s);
      if (!s.nome) {
        toast("Dê um nome ao lugar");
        return false;
      }
      if (nova) D.salas.push(s);
      else {
        var i = D.salas.findIndex(function (x) {
          return x.id === s.id;
        });
        D.salas[i] = s;
      }
      salvar();
      renderAjustes();
      toast("Lugar salvo");
      return true;
    },
    nova
      ? null
      : function () {
          var usadas = D.aulas.filter(function (a) {
            return a.sala === s.id;
          }).length;
          D.salas = D.salas.filter(function (x) {
            return x.id !== s.id;
          });
          D.aulas.forEach(function (a) {
            if (a.sala === s.id) a.sala = "";
          });
          if (CFG.de === s.id) {
            CFG.de = D.salas[0] ? D.salas[0].id : "";
            salvarCfg();
          }
          salvar();
          renderAjustes();
          toast(
            "Lugar apagado" +
              (usadas ? " (" + usadas + " aula(s) ficaram sem sala)" : ""),
          );
        },
  );
  $("sMarcar").onclick = function () {
    lerFormSala(s);
    fecharFolha();
    ANDAR = "todos";
    DESTINO = null;
    irPara("tMapa");
    $("avisoPick").style.display = "block";
    PICK = {
      cb: function (pk) {
        s.x = pk.x;
        s.y = pk.y;
        delete s.r;
        delete s.no;
        irPara("tAjustes");
        editarSala(nova ? null : s.id, s);
      },
    };
  };
}
function lerFormSala(s) {
  s.nome = $("sNome").value.trim();
  s.bloco = $("sBloco").value;
  s.andar = +$("sAndar").value;
  s.tipo = $("sTipo").value;
  s.dica = $("sDica").value.trim();
  s.apelidos = $("sApel").value.trim();
}
function editarBloco(id) {
  var b = id
      ? Object.assign({}, bloco(id))
      : {
          id: novoId("b"),
          nome: "",
          x: 420,
          y: 560,
          w: 160,
          h: 160,
          cor: CORES[D.blocos.length % CORES.length],
          px: 500,
          py: 640,
        },
    nova = !id;
  abrirFolha(
    nova ? "Novo bloco" : "Editar bloco",
    '<div class="campo"><label>Nome (use “ — ” para subtítulo)</label><input id="bNome" value="' +
      esc(b.nome) +
      '" placeholder="Bloco G — Laboratórios"></div>' +
      '<div class="campo"><label>Cor</label><div class="cores" id="bCores">' +
      CORES.map(function (c) {
        return (
          '<button style="background:' +
          c +
          '" data-c="' +
          c +
          '" class="' +
          (c === b.cor ? "on" : "") +
          '"></button>'
        );
      }).join("") +
      "</div></div>" +
      '<div class="nota" style="margin-top:12px">Posição e tamanho no desenho (mapa de 1000 × 1300):</div>' +
      '<div class="duas"><div class="campo"><label>X</label><input id="bX" type="number" value="' +
      b.x +
      '"></div><div class="campo"><label>Y</label><input id="bY" type="number" value="' +
      b.y +
      '"></div></div>' +
      '<div class="duas"><div class="campo"><label>Largura</label><input id="bW" type="number" value="' +
      b.w +
      '"></div><div class="campo"><label>Altura</label><input id="bH" type="number" value="' +
      b.h +
      '"></div></div>' +
      '<div class="duas"><div class="campo"><label>Porta X</label><input id="bPX" type="number" value="' +
      b.px +
      '"></div><div class="campo"><label>Porta Y</label><input id="bPY" type="number" value="' +
      b.py +
      '"></div></div>',
    function () {
      b.nome = $("bNome").value.trim();
      if (!b.nome) {
        toast("Dê um nome ao bloco");
        return false;
      }
      ["x", "y", "w", "h", "px", "py"].forEach(function (k) {
        b[k] = +$("b" + k.toUpperCase()).value || 0;
      });
      var on = $("bCores").querySelector(".on");
      if (on) b.cor = on.dataset.c;
      if (nova) D.blocos.push(b);
      else {
        var i = D.blocos.findIndex(function (x) {
          return x.id === b.id;
        });
        D.blocos[i] = b;
      }
      salvar();
      renderAjustes();
      toast("Bloco salvo");
      return true;
    },
    nova
      ? null
      : function () {
          D.blocos = D.blocos.filter(function (x) {
            return x.id !== b.id;
          });
          D.salas.forEach(function (s) {
            if (s.bloco === b.id) s.bloco = "";
          });
          salvar();
          renderAjustes();
          toast("Bloco apagado");
        },
  );
  $("bCores")
    .querySelectorAll("button")
    .forEach(function (x) {
      x.onclick = function () {
        $("bCores")
          .querySelectorAll("button")
          .forEach(function (y) {
            y.classList.remove("on");
          });
        x.classList.add("on");
      };
    });
}
$("btNovaSala").onclick = function () {
  editarSala(null);
};
$("btNovoBloco").onclick = function () {
  editarBloco(null);
};
$("btPlanta").onclick = function () {
  $("arqPlanta").click();
};
$("arqPlanta").onchange = function () {
  var f = this.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    var img = new Image();
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.width, img.height)),
        c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      var u = c.toDataURL("image/jpeg", 0.82);
      if (!gravarLS("hari_planta", u)) {
        toast("Imagem grande demais para guardar");
        return;
      }
      PLANTA = u;
      toast(
        "Planta carregada. Marque as salas em Configurações › Salas › Marcar no mapa",
      );
      ajustarVB();
      irPara("tMapa");
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
  this.value = "";
};
$("btSemPlanta").onclick = function () {
  PLANTA = "";
  try {
    localStorage.removeItem("hari_planta");
  } catch (e) {}
  toast("Planta removida: voltou o mapa desenhado");
};
$("btExportar").onclick = function () {
  var t = JSON.stringify(D, null, 1);
  if (N && N.compartilhar)
    N.compartilhar(
      t,
      "hari_" +
        norm(D.turma || "turma")
          .replace(/ /g, "_")
          .slice(0, 30) +
        ".json",
    );
  else {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "application/json" }));
    a.download = "hari.json";
    a.click();
  }
};
$("btImportar").onclick = function () {
  $("arqImport").click();
};
$("arqImport").onchange = function () {
  var f = this.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var j = JSON.parse(rd.result);
      if (!j.salas || !j.aulas || !j.blocos) throw 0;
      D = j;
      salvar();
      renderAjustes();
      renderAgora();
      toast(
        "Importado: " +
          j.salas.length +
          " lugares e " +
          j.aulas.length +
          " aulas",
      );
    } catch (e) {
      toast("Arquivo inválido");
    }
  };
  rd.readAsText(f);
  this.value = "";
};
$("btExemplo").onclick = function () {
  if (!this.dataset.ok) {
    this.dataset.ok = 1;
    this.textContent = "Clique de novo para confirmar";
    return;
  }
  this.dataset.ok = "";
  this.textContent = "Voltar ao exemplo";
  var nome = D.nome;
  D = exemplo();
  D.nome = nome;
  salvar();
  renderAjustes();
  toast("Dados de exemplo restaurados");
};

// ═════ CONTAS E PERFIS (login local) ═════