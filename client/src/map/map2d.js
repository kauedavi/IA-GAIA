// ═════ MAPA ═════
var VB = { x: 0, y: 0, w: 1000, h: 1300 },
  ANDAR = "todos",
  DESTINO = null,
  PICK = null;
function svgEl(t, a, txt) {
  var e = document.createElementNS("http://www.w3.org/2000/svg", t);
  for (var k in a) e.setAttribute(k, a[k]);
  if (txt != null) e.textContent = txt;
  return e;
}
function aplicarVB() {
  $("mapa").setAttribute(
    "viewBox",
    VB.x + " " + VB.y + " " + VB.w + " " + VB.h,
  );
}
function noMaisProximo(s) {
  var b = null,
    bd = 1e12;
  Object.keys(D.rede.nos).forEach(function (k) {
    var n = D.rede.nos[k],
      d =
        Math.hypot(n[0] - s.x, n[1] - s.y) +
        ((+n[3] || 0) !== (+s.andar || 0) ? 5000 : 0);
    if (d < bd) {
      bd = d;
      b = k;
    }
  });
  return b;
}
function rotaRede(de, para) {
  var R = D.rede;
  if (!R) return null;
  var N0 = R.nos[de.no] ? de.no : noMaisProximo(de),
    N1 = R.nos[para.no] ? para.no : noMaisProximo(para);
  if (!N0 || !N1) return null;
  var dist = {},
    prev = {},
    fila = Object.keys(R.nos),
    viz = {};
  fila.forEach(function (k) {
    dist[k] = 1e12;
    viz[k] = [];
  });
  R.arestas.forEach(function (a) {
    var A = R.nos[a[0]],
      B = R.nos[a[1]];
    if (!A || !B) return;
    var d = Math.hypot(A[0] - B[0], A[1] - B[1]);
    if ((A[3] || 0) !== (B[3] || 0)) {
      var el = /^elev/.test(a[0]) || /^elev/.test(a[1]);
      d = el ? (CFG.acessivel ? 40 : 160) : CFG.acessivel ? 1e6 : 90;
    }
    viz[a[0]].push([a[1], d]);
    viz[a[1]].push([a[0], d]);
  });
  dist[N0] = 0;
  while (fila.length) {
    var mi = 0;
    for (var i = 1; i < fila.length; i++)
      if (dist[fila[i]] < dist[fila[mi]]) mi = i;
    var u = fila.splice(mi, 1)[0];
    if (u === N1) break;
    viz[u].forEach(function (v) {
      if (dist[u] + v[1] < dist[v[0]]) {
        dist[v[0]] = dist[u] + v[1];
        prev[v[0]] = u;
      }
    });
  }
  if (dist[N1] >= 1e12) return null;
  var nos = [N1];
  while (nos[0] !== N0) nos.unshift(prev[nos[0]]);
  return nos;
}
function caminho(de, para) {
  if (!de || !para) return [];
  if (D.rede && !PLANTA) {
    var nos = rotaRede(de, para);
    if (nos) {
      var pts = [[de.x, de.y]]
        .concat(
          nos.map(function (k) {
            return D.rede.nos[k].slice(0, 2);
          }),
        )
        .concat([[para.x, para.y]]);
      return pts.filter(function (p, i) {
        return i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1];
      });
    }
  }
  // rota: sala → porta do bloco → corredor central → porta do outro bloco → sala (ou reta, se houver planta real)
  if (!de || !para) return [];
  if (PLANTA)
    return [
      [de.x, de.y],
      [para.x, para.y],
    ];
  var cx = +D.corredorX || 500,
    b1 = bloco(de.bloco),
    b2 = bloco(para.bloco),
    pts = [[de.x, de.y]];
  if (b1 && b2 && b1.id === b2.id) {
    pts.push([para.x, para.y]);
    return pts;
  }
  var p1 = b1 ? [b1.px, b1.py] : [de.x, de.y],
    p2 = b2 ? [b2.px, b2.py] : [para.x, para.y];
  if (b1) pts.push(p1);
  pts.push([cx, p1[1]]);
  pts.push([cx, p2[1]]);
  if (b2) pts.push(p2);
  pts.push([para.x, para.y]);
  return pts.filter(function (p, i) {
    return i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1];
  });
}
function passos(de, para) {
  if (D.rede && !PLANTA && de.id !== para.id) {
    var nos = rotaRede(de, para);
    if (nos) return passosRede(de, para, nos);
  }
  return passosAntigos(de, para);
}
function passosRede(de, para, nos) {
  var l = [],
    ult = "",
    a0 = +de.andar || 0,
    a1 = +para.andar || 0;
  if (a0 !== 0)
    l.push(
      (a0 > 0 ? "Desça" : "Suba") + " para o térreo pela escada mais próxima.",
    );
  l.push(
    de.tipo === "acesso"
      ? "Entre pela " +
          de.nome.split(" — ")[0].toLowerCase() +
          (de.nome.indexOf(" — ") > 0
            ? " (" + de.nome.split(" — ")[1] + ")"
            : "") +
          "."
      : "Saia de " + de.nome + ".",
  );
  nos.forEach(function (k, i) {
    var nm = D.rede.nos[k][2];
    if (!nm || nm === ult) return;
    ult = nm;
    if (i === 0 && de.no === k && de.tipo === "acesso") return;
    if (/^escada/.test(nm) && a1 !== 0) {
      l.push(
        (a1 > 0 ? "Suba" : "Desça") +
          " pela " +
          nm +
          " até o " +
          nomeAndar(a1) +
          ".",
      );
      return;
    }
    if (/^escada/.test(nm)) return;
    l.push(
      (i === nos.length - 1 ? "Chegue ao " : "Siga pelo ") +
        nm.replace(/^(circulação|área|acesso|entrada)/, function (x) {
          return x;
        }) +
        ".",
    );
  });
  l = l.map(function (t) {
    return t
      .replace("Siga pelo circulação", "Siga pela circulação")
      .replace("Chegue ao circulação", "Chegue à circulação")
      .replace("Siga pelo área", "Siga pela área")
      .replace("Chegue ao área", "Chegue à área")
      .replace("Siga pelo entrada", "Passe pela entrada")
      .replace("Chegue ao entrada", "Volte à entrada");
  });
  l.push(
    "Chegou: " +
      para.nome +
      (a1 ? " (" + nomeAndar(a1) + ")" : "") +
      "." +
      (para.dica ? " " + para.dica : ""),
  );
  return l;
}
function passosAntigos(de, para) {
  var l = [],
    b1 = bloco(de.bloco),
    b2 = bloco(para.bloco),
    cx = +D.corredorX || 500;
  if (de.id === para.id) return ["Você já está aqui."];
  if (PLANTA) {
    l.push(
      "Saia de " +
        de.nome +
        " em direção a " +
        para.nome +
        " (siga a linha no mapa).",
    );
    if (para.dica) l.push(para.dica);
    return l;
  }
  if (b1 && b2 && b1.id === b2.id) {
    if ((+de.andar || 0) !== (+para.andar || 0))
      l.push(
        ((+para.andar || 0) > (+de.andar || 0) ? "Suba" : "Desça") +
          " para o " +
          nomeAndar(para.andar) +
          " pela escada do " +
          b2.nome.split(" —")[0] +
          ".",
      );
    l.push("Siga pelo corredor do bloco até " + para.nome + ".");
    if (para.dica) l.push(para.dica);
    return l;
  }
  if (b1) {
    if (+de.andar) l.push("Desça até o térreo.");
    l.push(
      "Saia do " +
        b1.nome.split(" —")[0] +
        " pela porta que dá no corredor central.",
    );
  } else l.push("Saindo da " + de.nome + ", vá até o corredor central.");
  var y1 = b1 ? b1.py : de.y,
    y2 = b2 ? b2.py : para.y,
    sobe = y2 < y1;
  if (Math.abs(y2 - y1) > 20)
    l.push(
      "Siga pelo corredor central " +
        (sobe ? "em frente" : "voltando") +
        " por uns " +
        Math.max(10, Math.round(Math.abs(y2 - y1) / 8 / 5) * 5) +
        " metros.",
    );
  if (b2) {
    var esq = b2.px < cx;
    if (!sobe) esq = !esq;
    l.push(
      "Entre no " + b2.nome + ", à " + (esq ? "esquerda" : "direita") + ".",
    );
    if (+para.andar)
      l.push("Suba para o " + nomeAndar(para.andar) + " pela escada.");
  }
  l.push("Chegou: " + para.nome + "." + (para.dica ? " " + para.dica : ""));
  return l;
}
function desenharMapa() {
  var m = $("mapa");
  m.innerHTML = "";
  aplicarVB();
  var claro =
    document.documentElement.dataset.tema === "claro" ||
    ($("tMapa") && $("tMapa").classList.contains("on"));
  var defs = svgEl("defs", {});
  defs.innerHTML =
    '<pattern id="grade" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="' +
    (claro ? "rgba(10,90,90,.08)" : "rgba(46,230,197,.07)") +
    '" stroke-width="1"/></pattern>';
  m.appendChild(defs);
  m.appendChild(
    svgEl("rect", {
      x: -2000,
      y: -2000,
      width: 5000,
      height: 5300,
      fill: "url(#grade)",
    }),
  );
  if (PLANTA) {
    m.appendChild(
      svgEl("image", {
        href: PLANTA,
        x: 0,
        y: 0,
        width: 1000,
        height: 1300,
        preserveAspectRatio: "xMidYMid meet",
        opacity: claro ? 1 : 0.85,
      }),
    );
  } else if (D.rede) {
    desenharPlanta(m, claro);
  } else {
    var cx = +D.corredorX || 500;
    m.appendChild(
      svgEl("rect", {
        x: cx - 55,
        y: 110,
        width: 110,
        height: 1110,
        rx: 20,
        fill: claro ? "#dbe9e7" : "#0d2430",
        stroke: claro ? "#b9d3cf" : "#1f4252",
      }),
    );
    var tc = svgEl(
      "text",
      {
        x: cx,
        y: 720,
        fill: "var(--tx3)",
        "font-size": 22,
        "text-anchor": "middle",
        transform: "rotate(-90 " + cx + " 720)",
        "letter-spacing": "6",
      },
      "CORREDOR CENTRAL",
    );
    m.appendChild(tc);
    D.blocos.forEach(function (b) {
      m.appendChild(
        svgEl("rect", {
          x: b.x,
          y: b.y,
          width: b.w,
          height: b.h,
          rx: 22,
          fill: b.cor,
          "fill-opacity": claro ? 0.16 : 0.1,
          stroke: b.cor,
          "stroke-opacity": 0.7,
          "stroke-width": 2,
        }),
      );
      var nm = b.nome.split(" — "),
        t = svgEl(
          "text",
          {
            x: b.x + 18,
            y: b.y + 36,
            fill: b.cor,
            "font-size": 24,
            "font-weight": 800,
          },
          nm[0],
        );
      m.appendChild(t);
      if (nm[1])
        m.appendChild(
          svgEl(
            "text",
            { x: b.x + 18, y: b.y + 62, fill: "var(--tx2)", "font-size": 18 },
            nm[1],
          ),
        );
      if (b.px != null)
        m.appendChild(
          svgEl("rect", {
            x: b.px - 7,
            y: b.py - 22,
            width: 14,
            height: 44,
            rx: 4,
            fill: b.cor,
          }),
        );
    });
  }
  // rota
  var de = sala(CFG.de),
    para = DESTINO ? sala(DESTINO) : null;
  if (de && para && de.id !== para.id) {
    var pts = caminho(de, para)
      .map(function (p) {
        return p.join(",");
      })
      .join(" ");
    m.appendChild(
      svgEl("polyline", {
        points: pts,
        fill: "none",
        stroke: "var(--amb)",
        "stroke-width": 14,
        "stroke-opacity": 0.25,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      }),
    );
    m.appendChild(
      svgEl("polyline", {
        points: pts,
        fill: "none",
        stroke: "var(--amb)",
        "stroke-width": 6,
        "stroke-dasharray": "18 22",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        class: "trilha",
      }),
    );
  }
  // salas
  if (D.rede && !PLANTA) {
    desenharSalasPlanta(m, claro);
    renderAndares();
    renderRota();
    return;
  }
  D.salas.forEach(function (s) {
    var vis =
      ANDAR === "todos" ||
      String(+s.andar || 0) === ANDAR ||
      s.id === DESTINO ||
      s.id === CFG.de;
    var g = svgEl("g", { style: "cursor:pointer", opacity: vis ? 1 : 0.18 });
    g.dataset.sala = s.id;
    var b = bloco(s.bloco),
      cor =
        s.id === DESTINO
          ? "var(--amb)"
          : s.id === CFG.de
            ? "var(--pri)"
            : b
              ? b.cor
              : "#9cb8bd";
    if (s.id === DESTINO || s.id === CFG.de) {
      var rd = svgEl("circle", {
        cx: s.x,
        cy: s.y,
        r: 12,
        fill: "none",
        stroke: cor,
        "stroke-width": 3,
        class: "radar",
      });
      g.appendChild(rd);
    }
    g.appendChild(
      svgEl("circle", { cx: s.x, cy: s.y, r: 26, fill: "transparent" }),
    );
    g.appendChild(
      svgEl("circle", {
        cx: s.x,
        cy: s.y,
        r: s.id === DESTINO ? 13 : 10,
        fill: cor,
        stroke: claro ? "#fff" : "#06121a",
        "stroke-width": 3,
      }),
    );
    var rot = rotuloCurto(s.nome);
    var tx = svgEl(
      "text",
      {
        x: s.x,
        y: s.y + 34,
        "text-anchor": "middle",
        "font-size": 17,
        "font-weight": s.id === DESTINO ? 800 : 600,
        fill: "var(--tx)",
        stroke: claro ? "#eef5f4" : "#06121a",
        "stroke-width": 5,
        "paint-order": "stroke",
      },
      rot + (+s.andar ? " (" + +s.andar + "º)" : ""),
    );
    g.appendChild(tx);
    m.appendChild(g);
  });
  renderAndares();
  renderRota();
}
function andarAtivo() {
  return ANDAR === "todos" ? 0 : +ANDAR;
}
function desenharPlanta(m, claro) {
  (D.ruas || []).forEach(function (r) {
    m.appendChild(
      svgEl(
        "text",
        {
          x: r.x,
          y: r.y,
          fill: "var(--tx3)",
          "font-size": 20,
          "font-weight": 700,
          "letter-spacing": "4",
          "text-anchor": "middle",
          transform: r.rot
            ? "rotate(" + r.rot + " " + r.x + " " + r.y + ")"
            : "",
        },
        r.t,
      ),
    );
  });
  m.appendChild(
    svgEl("rect", {
      x: 20,
      y: 115,
      width: 960,
      height: 1000,
      rx: 18,
      fill: "none",
      stroke: "var(--linha)",
      "stroke-width": 2,
      "stroke-dasharray": "10 8",
    }),
  );
  D.blocos.forEach(function (b) {
    m.appendChild(
      svgEl("rect", {
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        rx: 10,
        fill: b.cor,
        "fill-opacity": claro ? 0.1 : 0.06,
        stroke: b.cor,
        "stroke-opacity": 0.55,
        "stroke-width": 2,
      }),
    );
  });
  var R = D.rede;
  R.arestas.forEach(function (a) {
    var A = R.nos[a[0]],
      B = R.nos[a[1]];
    if (A && B)
      m.appendChild(
        svgEl("line", {
          x1: A[0],
          y1: A[1],
          x2: B[0],
          y2: B[1],
          stroke: claro ? "#c7dcd9" : "#16313c",
          "stroke-width": 16,
          "stroke-linecap": "round",
        }),
      );
  });
  Object.keys(R.nos).forEach(function (k) {
    if (/^escada/.test(k)) {
      var n = R.nos[k];
      m.appendChild(
        svgEl("rect", {
          x: n[0] - 11,
          y: n[1] - 11,
          width: 22,
          height: 22,
          rx: 5,
          fill: "var(--card2)",
          stroke: "var(--tx3)",
          "stroke-width": 2,
        }),
      );
      m.appendChild(
        svgEl("path", {
          d: "M" + (n[0] - 6) + " " + (n[1] + 5) + "h4v-4h4v-4h4",
          fill: "none",
          stroke: "var(--tx2)",
          "stroke-width": 2,
        }),
      );
    }
  });
}
function quebrar(t, max) {
  var ws = t.split(" "),
    l = [],
    at = "";
  ws.forEach(function (w) {
    if ((at + " " + w).trim().length > max && at) {
      l.push(at);
      at = w;
    } else at = (at + " " + w).trim();
  });
  if (at) l.push(at);
  return l;
}
function desenharSalasPlanta(m, claro) {
  var A = andarAtivo(),
    fundo = claro ? "#eef5f4" : "#06121a";
  // andar ativo por cima; o térreo aparece apagado quando se olha outro andar
  D.salas.forEach(function (s) {
    if (!s.r) return;
    var an = +s.andar || 0;
    if (an !== A && !(A !== 0 && an === 0)) return;
    var b = bloco(s.bloco),
      cor =
        s.id === DESTINO
          ? "#ffb547"
          : s.id === CFG.de
            ? "#2ee6c5"
            : b
              ? b.cor
              : "#9cb8bd",
      ativo = an === A;
    var g = svgEl("g", { style: "cursor:pointer", opacity: ativo ? 1 : 0.22 });
    g.dataset.sala = s.id;
    g.appendChild(
      svgEl("rect", {
        x: s.r[0] + 2,
        y: s.r[1] + 2,
        width: s.r[2] - 4,
        height: s.r[3] - 4,
        rx: 6,
        fill: cor,
        "fill-opacity": s.id === DESTINO ? 0.45 : claro ? 0.22 : 0.16,
        stroke: cor,
        "stroke-width": s.id === DESTINO ? 4 : 1.5,
      }),
    );
    if (ativo) {
      var curta = rotuloCurto(s.nome),
        vert = s.r[3] > s.r[2] * 1.25 && s.r[2] < 90,
        lado = vert ? s.r[3] : s.r[2],
        fs = Math.max(9, Math.min(15, lado / 8)),
        ls = quebrar(curta, Math.max(6, Math.floor((lado - 8) / (fs * 0.56))));
      var cx = s.r[0] + s.r[2] / 2,
        cy = s.r[1] + s.r[3] / 2,
        t = svgEl("text", {
          x: cx,
          y: cy - (ls.length - 1) * fs * 0.55,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-size": fs,
          "font-weight": s.id === DESTINO ? 800 : 600,
          fill: "var(--tx)",
          transform: vert ? "rotate(-90 " + cx + " " + cy + ")" : "",
        });
      ls.forEach(function (x, i) {
        var sp = svgEl("tspan", { x: cx, dy: i ? fs * 1.1 : 0 }, x);
        t.appendChild(sp);
      });
      g.appendChild(t);
    }
    m.appendChild(g);
  });
  // pontos: lugares sem retângulo do andar ativo, partida e destino
  D.salas.forEach(function (s) {
    var an = +s.andar || 0,
      esp = s.id === DESTINO || s.id === CFG.de;
    if (!esp && (s.r || an !== A)) return;
    var g = svgEl("g", { style: "cursor:pointer" });
    g.dataset.sala = s.id;
    var cor =
      s.id === DESTINO
        ? "var(--amb)"
        : s.id === CFG.de
          ? "var(--pri)"
          : "#9cb8bd";
    if (esp)
      g.appendChild(
        svgEl("circle", {
          cx: s.x,
          cy: s.y,
          r: 12,
          fill: "none",
          stroke: cor,
          "stroke-width": 3,
          class: "radar",
        }),
      );
    g.appendChild(
      svgEl("circle", { cx: s.x, cy: s.y, r: 24, fill: "transparent" }),
    );
    g.appendChild(
      svgEl("circle", {
        cx: s.x,
        cy: s.y,
        r: esp ? 11 : 8,
        fill: cor,
        stroke: fundo,
        "stroke-width": 3,
      }),
    );
    if (!s.r || esp)
      g.appendChild(
        svgEl(
          "text",
          {
            x: s.x,
            y: s.y - (esp ? 20 : 16),
            "text-anchor": "middle",
            "font-size": 14,
            "font-weight": 700,
            fill: "var(--tx)",
            stroke: fundo,
            "stroke-width": 4,
            "paint-order": "stroke",
          },
          rotuloCurto(s.nome) + (an !== A ? " (" + nomeAndar(an) + ")" : ""),
        ),
      );
    m.appendChild(g);
  });
}
function rotuloCurto(n) {
  n = n
    .replace("Laboratório de Informática", "Lab. Informática")
    .replace("Laboratório de ", "Lab. ")
    .replace("Oficina de ", "Of. ")
    .replace(/ — .*$/, "")
    .replace(/ \(.*\)$/, "");
  n = n.replace(/^Laboratório (\d+)$/, "Lab. $1");
  n = n
    .replace(
      "Lab. de Manufatura Integrada por Computador",
      "Manufatura Integrada",
    )
    .replace("Laboratório 19", "Lab. 19")
    .replace("Laboratórios de Máquinas", "Labs. de Máquinas")
    .replace("Apoio Técnico Pedagógico", "Apoio Téc. Pedagógico")
    .replace("Sala Docente", "Sala Docente")
    .replace("Orientação Educacional", "Orient. Educ.")
    .replace("Coordenação de Estágio", "Coord. Estágio")
    .replace("Coordenação Técnica", "Coord. Técnica");
  n = n
    .replace("Eletrônica ", "Eletr. ")
    .replace("Pneumática e Hidráulica", "Pneum./Hidr.")
    .replace("Sistemas Embarcados", "Embarcados")
    .replace("Recepção e Secretaria", "Recepção/Secretaria")
    .replace("Biblioteca e Sala de Leitura", "Biblioteca");
  return n;
}
function renderAndares() {
  var as = {};
  D.salas.forEach(function (s) {
    as[+s.andar || 0] = 1;
  });
  var l = (D.rede ? [] : ["todos"]).concat(
    Object.keys(as).sort(function (a, b) {
      return a - b;
    }),
  );
  $("andares").innerHTML = l
    .map(function (a) {
      return (
        '<button class="chip' +
        (ANDAR === a ? " on" : "") +
        '" data-a="' +
        a +
        '">' +
        (a === "todos"
          ? "Todos"
          : a === "0"
            ? "Térreo"
            : nomeAndar(+a).replace(/^./, function (c) {
                return c.toUpperCase();
              })) +
        "</button>"
      );
    })
    .join("");
  $("andares")
    .querySelectorAll(".chip")
    .forEach(function (b) {
      b.onclick = function () {
        ANDAR = b.dataset.a;
        desenharMapa();
      };
    });
  var sel = $("selDe");
  sel.innerHTML = D.salas
    .map(function (s) {
      return (
        '<option value="' +
        esc(s.id) +
        '"' +
        (s.id === CFG.de ? " selected" : "") +
        ">" +
        esc(s.nome) +
        "</option>"
      );
    })
    .join("");
}
$("selDe").onchange = function () {
  CFG.de = this.value;
  salvarCfg();
  desenharMapa();
};
function renderRota() {
  var de = sala(CFG.de),
    para = DESTINO ? sala(DESTINO) : null,
    h = "";
  if (D.rede && ANDAR === "todos") ANDAR = "0";
  $("pilAndar").textContent =
    ANDAR === "todos"
      ? "Todos os andares"
      : nomeAndar(+ANDAR).replace(/^./, function (c) {
          return c.toUpperCase();
        });
  $("avisoMapa").innerHTML =
    D.mapaFonte && D.rede && !PLANTA
      ? '<div class="nota" style="margin-top:8px">🗺️ ' +
        esc(D.mapaFonte) +
        " Clique numa sala para ver o caminho; use os botões Subsolo / Térreo / Pavimento superior para trocar de andar.</div>"
      : D.mapaAproximado && !PLANTA
        ? '<div class="aviso">Mapa montado com os dados públicos da ' +
          esc(D.unidade) +
          " (" +
          esc(D.info.area.toLowerCase()) +
          "; ambientes do Censo Escolar 2024). A planta oficial não é pública, então a <b>posição</b> de cada lugar é aproximada: ajuste em Configurações › Salas ou carregue a foto da planta.</div>"
        : "";
  if (para) {
    h =
      '<div class="card"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><div class="tag">Destino</div><div style="font-weight:700;font-size:17px">' +
      esc(para.nome) +
      '</div><div class="nota">' +
      esc(ondeFica(para)) +
      " · " +
      esc(TIPOS[para.tipo] || "") +
      '</div></div><button class="botao sec peq" id="btLimparRota">Limpar</button></div>';
    if (de && de.id !== para.id)
      h +=
        '<ol class="passos">' +
        passos(de, para)
          .map(function (p) {
            return "<li>" + esc(p) + "</li>";
          })
          .join("") +
        "</ol>";
    else if (para.dica)
      h +=
        '<div class="nota" style="margin-top:8px">' + esc(para.dica) + "</div>";
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
  } else
    h =
      '<div class="nota" style="padding:4px 2px">Clique numa sala no mapa ou busque acima para ver o caminho.</div>';
  $("rota").innerHTML = h;
  var bl = $("btLimparRota");
  if (bl)
    bl.onclick = function () {
      DESTINO = null;
      desenharMapa();
    };
}
function mostrarRota(id) {
  var s = sala(id);
  if (!s) return;
  DESTINO = id;
  var a = String(+s.andar || 0);
  if (D.rede) ANDAR = a;
  else if (ANDAR !== "todos" && ANDAR !== a) ANDAR = "todos";
  irPara("tMapa");
  // enquadra a rota
  var de = sala(CFG.de),
    pts = caminho(de || s, s),
    xs = pts.map(function (p) {
      return p[0];
    }),
    ys = pts.map(function (p) {
      return p[1];
    });
  var x0 = Math.min.apply(0, xs) - 120,
    x1 = Math.max.apply(0, xs) + 120,
    y0 = Math.min.apply(0, ys) - 120,
    y1 = Math.max.apply(0, ys) + 120;
  var cx = $("mapaCx"),
    asp = cx.clientHeight / Math.max(1, cx.clientWidth),
    w = Math.max(500, x1 - x0, (y1 - y0) / asp);
  VB = {
    x: (x0 + x1) / 2 - w / 2,
    y: (y0 + y1) / 2 - (w * asp) / 2,
    w: w,
    h: w * asp,
  };
  aplicarVB();
}
window.mostrarRota = mostrarRota;
function ajustarVB() {
  var cx = $("mapaCx");
  if (!cx.clientWidth || !cx.clientHeight) return;
  var asp = cx.clientHeight / Math.max(1, cx.clientWidth);
  VB = { x: 0, y: (1300 - 1000 * asp) / 2, w: 1000, h: 1000 * asp };
  if (VB.h < 1300) {
    VB.h = 1300;
    VB.w = 1300 / asp;
    VB.x = (1000 - VB.w) / 2;
    VB.y = 0;
  }
  aplicarVB();
}
function zoom(f, px, py) {
  var nw = Math.min(3000, Math.max(180, VB.w * f)),
    k = nw / VB.w;
  px = px == null ? VB.x + VB.w / 2 : px;
  py = py == null ? VB.y + VB.h / 2 : py;
  VB = { x: px - (px - VB.x) * k, y: py - (py - VB.y) * k, w: nw, h: VB.h * k };
  aplicarVB();
}
$("zMais").onclick = function () {
  zoom(0.7);
};
$("zMenos").onclick = function () {
  zoom(1 / 0.7);
};
$("zZero").onclick = ajustarVB;
function pontoSvg(e) {
  var m = $("mapa"),
    p = m.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(m.getScreenCTM().inverse());
}
(function () {
  var ptrs = {},
    ini = null,
    mov = 0;
  var m = $("mapa");
  m.addEventListener("pointerdown", function (e) {
    m.setPointerCapture(e.pointerId);
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    mov = 0;
    ini = { vb: Object.assign({}, VB), p: Object.assign({}, ptrs) };
  });
  m.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs),
      r = m.getBoundingClientRect(),
      esc_ = VB.w / r.width;
    if (ids.length === 1 && ini.p[ids[0]]) {
      var dx = e.clientX - ini.p[ids[0]].x,
        dy = e.clientY - ini.p[ids[0]].y;
      mov = Math.max(mov, Math.abs(dx) + Math.abs(dy));
      var k = ini.vb.w / r.width;
      VB.x = ini.vb.x - dx * k;
      VB.y = ini.vb.y - dy * k;
      aplicarVB();
    } else if (ids.length >= 2 && ini.p[ids[0]] && ini.p[ids[1]]) {
      mov = 99;
      var a0 = ini.p[ids[0]],
        b0 = ini.p[ids[1]],
        a1 = ptrs[ids[0]],
        b1 = ptrs[ids[1]];
      var d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y),
        d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
      if (d0 < 10) return;
      var f = d0 / d1,
        nw = Math.min(3000, Math.max(180, ini.vb.w * f));
      f = nw / ini.vb.w;
      var mx = (a0.x + b0.x) / 2 - r.left,
        my = (a0.y + b0.y) / 2 - r.top,
        k0 = ini.vb.w / r.width,
        sx = ini.vb.x + mx * k0,
        sy = ini.vb.y + my * k0;
      var mx1 = (a1.x + b1.x) / 2 - r.left,
        my1 = (a1.y + b1.y) / 2 - r.top;
      VB = {
        w: nw,
        h: ini.vb.h * f,
        x: sx - mx1 * k0 * f,
        y: sy - my1 * k0 * f,
      };
      aplicarVB();
    }
  });
  function fim(e) {
    var eraUm = Object.keys(ptrs).length === 1;
    delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length) {
      ini = { vb: Object.assign({}, VB), p: Object.assign({}, ptrs) };
      return;
    }
    if (eraUm && mov < 8 && e.type === "pointerup") toque(e);
  }
  m.addEventListener("pointerup", fim);
  m.addEventListener("pointercancel", fim);
  m.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      var p = pontoSvg(e);
      zoom(e.deltaY > 0 ? 1.15 : 0.87, p.x, p.y);
    },
    { passive: false },
  );
})();
function toque(e) {
  var p = pontoSvg(e);
  if (PICK) {
    PICK.x = Math.round(p.x);
    PICK.y = Math.round(p.y);
    var cb = PICK.cb;
    $("avisoPick").style.display = "none";
    var pk = PICK;
    PICK = null;
    cb(pk);
    return;
  }
  var el = document.elementFromPoint(e.clientX, e.clientY),
    g = el && el.closest ? el.closest("g[data-sala]") : null;
  if (g) {
    DESTINO = g.dataset.sala;
    desenharMapa();
  } else {
    var A = andarAtivo(),
      dentro = D.salas.filter(function (s) {
        return (
          s.r &&
          (+s.andar || 0) === A &&
          p.x >= s.r[0] &&
          p.x <= s.r[0] + s.r[2] &&
          p.y >= s.r[1] &&
          p.y <= s.r[1] + s.r[3]
        );
      })[0];
    if (dentro) {
      DESTINO = dentro.id;
      desenharMapa();
      return;
    }
    var mais = null,
      md = 1e9;
    D.salas.forEach(function (s) {
      var d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < md) {
        md = d;
        mais = s;
      }
    });
    if (mais && md < 45) {
      DESTINO = mais.id;
      desenharMapa();
    }
  }
}
function cancelarPick() {
  PICK = null;
  $("avisoPick").style.display = "none";
  irPara("tAjustes");
}
$("buscaSala").oninput = function () {
  var q = norm(this.value);
  if (!q) {
    $("resBusca").innerHTML = "";
    return;
  }
  var r = D.salas
    .filter(function (s) {
      return (
        norm(
          s.nome +
            " " +
            s.apelidos +
            " " +
            (TIPOS[s.tipo] || "") +
            " " +
            ((bloco(s.bloco) || {}).nome || ""),
        ).indexOf(q) >= 0
      );
    })
    .slice(0, 8);
  $("resBusca").innerHTML = r.length
    ? r
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
            icone("pino") +
            "</button>"
          );
        })
        .join("")
    : '<div class="vazio">Nada encontrado. Cadastre em Configurações › Salas.</div>';
  $("resBusca")
    .querySelectorAll(".item")
    .forEach(function (b) {
      b.onclick = function () {
        $("buscaSala").value = "";
        $("resBusca").innerHTML = "";
        mostrarRota(b.dataset.s);
      };
    });
};
