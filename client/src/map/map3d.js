// ═════ MAPA 3D (v1.6) ═════
// Maquete 3D refeita: um andar de cada vez (ou "Todos" empilhados), terreno com ruas e jardins, corredores claros,
// salas coloridas por tipo, ícones de referência, escadas e elevador, rótulos sem sobreposição,
// "Você está aqui", "Onde estou?" e navegação passo a passo (o mapa gira na direção em que você anda).
// Canvas 2D próprio, sem bibliotecas; só redesenha quando algo muda (e a ~30 qps durante animações).
var M3 = {
  yaw: 0,
  pitch: 0.86,
  s: 0.5,
  px: 0,
  py: 0,
  foco: "0",
  alvo: null,
  dash: 0,
  laco: 0,
  hit: [],
  dica: true,
  nav: null,
  ult: 0,
  mexeu: 0,
  focoAntesTodos: null,
};
var ALT3 = 24,
  GAP3 = 330,
  DPR3 = 1,
  NORTE3 = 1.94; // NORTE3: o norte da planta fica 111° à direita do "para cima" do mapa
var TIPO3 = {
  lab: "#2ee6c5",
  oficina: "#2ee6c5",
  sala: "#5aa9ff",
  adm: "#b48cff",
  servico: "#8fb3c0",
  convivencia: "#ffa45c",
  acesso: "#ffd166",
};
var TIPO3N = {
  lab: "Laboratórios",
  sala: "Salas de aula",
  adm: "Administração",
  servico: "Banheiros e serviços",
  convivencia: "Convivência",
  acesso: "Entradas",
};
function toastMapa(t, persistente) {
  var e = $("mapToast");
  if (!e) return;
  e.textContent = t;
  e.classList.add("on");
  clearTimeout(toastMapa.t);
  if (persistente) return;
  toastMapa.t = setTimeout(function () {
    e.classList.remove("on");
  }, 3200);
}
toastMapa.limpar = function () {
  var e = $("mapToast");
  if (!e) return;
  clearTimeout(toastMapa.t);
  e.classList.remove("on");
};
function usar3D() {
  return !!(D.rede && !PLANTA && CFG.mapa3d !== false);
}
var COR3 = null,
  COR3k = null;
function cor3() {
  var k = document.documentElement.dataset.tema || "",
    mapa = $("tMapa") && $("tMapa").classList.contains("on"),
    cacheKey = k + (mapa ? ":mapa" : ":app");
  if (COR3 && COR3k === cacheKey) return COR3;
  var c = getComputedStyle(document.documentElement);
  function g(n) {
    return c.getPropertyValue(n).trim();
  }
  var claro = mapa || k === "claro";
  COR3k = cacheKey;
  COR3 = {
    bg: mapa ? "#ffffff" : g("--bg"),
    bg2: mapa ? "#f3f4f5" : g("--bg2"),
    tx: mapa ? "#202124" : g("--tx"),
    tx2: mapa ? "#5f6368" : g("--tx2"),
    tx3: mapa ? "#7a7f85" : g("--tx3"),
    amb: mapa ? "#e9a227" : g("--amb"),
    pri: mapa ? "#c8102e" : g("--pri"),
    linha: mapa ? "#e1e3e6" : g("--linha"),
    card: mapa ? "#ffffff" : g("--card"),
    claro: claro,
    fundo: claro ? "#e9f1ef" : "#07151d",
    chao: claro ? "#d9e4e1" : "#0e2029",
    calcada: claro ? "#f4f8f7" : "#16303b",
    verde: claro ? "#bfe3c7" : "#123526",
    verde2: claro ? "#a6d6b2" : "#18452f",
    rua: claro ? "#c3ced0" : "#0b1a21",
    ruaTx: claro ? "#6d8085" : "#4f6b73",
    caminho: claro ? "#ffffff" : "#1d3c49",
    laje: claro ? "#f2f6f5" : "#132a35",
    lajeLado: claro ? "#c8d6d3" : "#0a1a22",
    sombra: claro ? "rgba(30,60,60,.16)" : "rgba(0,0,0,.35)",
    azul: claro ? "#1a73e8" : "#4da3ff",
  };
  return COR3;
}
function rgb3(h) {
  h = String(h).trim();
  if (h[0] === "#" && h.length === 4)
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  if (h.indexOf("rgb") === 0) {
    var m = h.match(/[\d.]+/g);
    return [+m[0], +m[1], +m[2]];
  }
  var n = parseInt(h.slice(1, 7), 16);
  return isNaN(n)
    ? [156, 184, 189]
    : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix3(a, b, t) {
  var A = rgb3(a),
    B = rgb3(b);
  return (
    "rgb(" +
    Math.round(A[0] * (1 - t) + B[0] * t) +
    "," +
    Math.round(A[1] * (1 - t) + B[1] * t) +
    "," +
    Math.round(A[2] * (1 - t) + B[2] * t) +
    ")"
  );
}
function z3(a) {
  return M3.foco === "todos" ? (+a || 0) * GAP3 : 0;
}
function andarVisivel(a) {
  return M3.foco === "todos" || +M3.foco === (+a || 0);
}
function proj3(x, y, z) {
  var X = x - 490,
    Y = y - 620,
    cs = Math.cos(M3.yaw),
    sn = Math.sin(M3.yaw),
    rx = X * cs - Y * sn,
    ry = X * sn + Y * cs,
    cp = Math.cos(M3.pitch),
    sp = Math.sin(M3.pitch);
  return { x: rx, y: ry * cp - z * sp, d: ry * sp + z * cp };
}
function tela3(p) {
  var c = $("mapa3d");
  return {
    x: c.width / 2 + (p.x * M3.s + M3.px) * DPR3,
    y: c.height / 2 + (p.y * M3.s + M3.py) * DPR3,
    d: p.d,
  };
}
function P3(x, y, z) {
  return tela3(proj3(x, y, z));
}
function poli3(ctx, pts, fill, stroke, lw) {
  ctx.beginPath();
  pts.forEach(function (p, i) {
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
  });
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = (lw || 1) * DPR3;
    ctx.stroke();
  }
}
function chao3(ctx, pts, z, fill, stroke, lw) {
  poli3(
    ctx,
    pts.map(function (q) {
      return P3(q[0], q[1], z);
    }),
    fill,
    stroke,
    lw,
  );
}
function retPts(r) {
  return [
    [r[0], r[1]],
    [r[0] + r[2], r[1]],
    [r[0] + r[2], r[1] + r[3]],
    [r[0], r[1] + r[3]],
  ];
}
// caixa (x,y,w,h) de z0 até z1: faces laterais visíveis + topo; devolve o topo na tela
function caixa3(ctx, r, z0, z1, cTopo, cLado1, cLado2, cBorda, lw) {
  var b = retPts(r),
    baixo = b.map(function (p) {
      return P3(p[0], p[1], z0);
    }),
    cima = b.map(function (p) {
      return P3(p[0], p[1], z1);
    });
  if (z1 - z0 > 0.5)
    for (var i = 0; i < 4; i++) {
      var j = (i + 1) % 4,
        nx = b[j][1] - b[i][1],
        ny = -(b[j][0] - b[i][0]);
      var ry = nx * Math.sin(M3.yaw) + ny * Math.cos(M3.yaw);
      if (ry <= 0) continue;
      poli3(
        ctx,
        [baixo[i], baixo[j], cima[j], cima[i]],
        Math.abs(nx) > Math.abs(ny) ? cLado1 : cLado2,
        cBorda,
        lw * 0.5,
      );
    }
  poli3(ctx, cima, cTopo, cBorda, lw);
  return cima;
}
function pontoNoPoli(p, ps) {
  var d = false;
  for (var i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    var a = ps[i],
      b = ps[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      d = !d;
  }
  return d;
}
function andares3() {
  var as = {};
  D.salas.forEach(function (s) {
    as[+s.andar || 0] = 1;
  });
  return Object.keys(as)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    });
}
function andarNo(k) {
  var n = D.rede && D.rede.nos[k];
  return n && n[3] != null ? +n[3] : 0;
}
function ehVert(k) {
  return /^(escada|elev)/.test(k || "");
}
function cena3() {
  return D.cena || {};
}

// ── rota com andares: [{x,y,a,k}] (k = nó da rede) ──
function rota3m() {
  var de = sala(CFG.de),
    para = DESTINO ? sala(DESTINO) : null;
  if (!de || !para || de.id === para.id || !D.rede) return [];
  var nos = rotaRede(de, para) || [],
    R = D.rede,
    seq = [{ x: de.x, y: de.y, a: +de.andar || 0, k: null, s: de.id }];
  nos.forEach(function (k) {
    var n = R.nos[k];
    seq.push({ x: n[0], y: n[1], a: andarNo(k), k: k });
  });
  seq.push({ x: para.x, y: para.y, a: +para.andar || 0, k: null, s: para.id });
  var out = [];
  seq.forEach(function (q) {
    var p = out[out.length - 1];
    if (p && p.a !== q.a && (p.x !== q.x || p.y !== q.y)) {
      if (ehVert(p.k)) out.push({ x: p.x, y: p.y, a: q.a, k: p.k });
      else out.push({ x: q.x, y: q.y, a: p.a, k: q.k });
    }
    p = out[out.length - 1];
    if (p && p.x === q.x && p.y === q.y && p.a === q.a) {
      if (q.s) p.s = q.s;
      return;
    }
    out.push(q);
  });
  return out;
}
function rota3() {
  return rota3m().map(function (p) {
    return [p.x, p.y, p.a];
  });
}

// ── passo a passo com direção, distância e pontos de referência ──
function escala3() {
  return (D.cena && D.cena.escala) || 0.0825;
}
function arred(m) {
  return m < 10 ? Math.max(1, Math.round(m)) : Math.round(m / 5) * 5;
}
function giro(hx, hy, vx, vy) {
  return (Math.atan2(hx * vy - hy * vx, hx * vx + hy * vy) * 180) / Math.PI;
} // >0 = direita (y para baixo)
function prepos(nm) {
  return /^(circulação|área|passagem|escada|entrada|rua|plataforma)/i.test(nm)
    ? "pela "
    : "pelo ";
}
function ladoTxt(ang) {
  var a = Math.abs(ang);
  return a < 35
    ? "logo à frente"
    : a > 150
      ? "atrás de você"
      : ang > 0
        ? "à sua direita"
        : "à sua esquerda";
}
function marcos3() {
  var l = (cena3().marcos || []).slice();
  D.salas.forEach(function (s) {
    if (s.ic && l.indexOf(s.id) < 0) l.push(s.id);
  });
  return l.map(sala).filter(Boolean);
}
function referencia3(px, py, a, hx, hy, evita) {
  var mel = null,
    md = 125;
  marcos3().forEach(function (s) {
    if ((+s.andar || 0) !== a || evita.indexOf(s.id) >= 0) return;
    var d = Math.hypot(s.x - px, s.y - py);
    if (d < md) {
      md = d;
      mel = s;
    }
  });
  if (!mel) return "";
  var ang = giro(hx, hy, mel.x - px, mel.y - py);
  if (Math.abs(ang) > 150) return "";
  return (
    (mel.ic ? mel.ic + " " : "") +
    rotuloCurto(mel.nome) +
    " fica " +
    ladoTxt(ang) +
    "."
  );
}
function nomeTrecho(r, i0, i1) {
  var cont = {},
    mel = "",
    mx = 0;
  for (var i = i0; i <= i1; i++) {
    var k = r[i].k;
    if (!k || ehVert(k)) continue;
    var nm = D.rede.nos[k][2];
    if (!nm) continue;
    cont[nm] = (cont[nm] || 0) + 1 + (i === i1 ? 0.5 : 0);
    if (cont[nm] > mx) {
      mx = cont[nm];
      mel = nm;
    }
  }
  return mel;
}
function passosNav() {
  var r = rota3m();
  if (r.length < 2) return [];
  var de = sala(CFG.de),
    para = sala(DESTINO),
    E = escala3(),
    pernas = [],
    cur = null;
  for (var j = 1; j < r.length; j++) {
    var p = r[j - 1],
      q = r[j];
    if (p.a !== q.a) {
      var u = pernas[pernas.length - 1];
      if (u && u.vert && u.i1 === j - 1) {
        u.i1 = j;
        u.para = q;
      } else pernas.push({ vert: true, de: p, para: q, i0: j - 1, i1: j });
      cur = null;
      continue;
    }
    var dx = q.x - p.x,
      dy = q.y - p.y,
      L = Math.hypot(dx, dy);
    if (L < 1) continue;
    if (cur && Math.abs(giro(cur.hx, cur.hy, dx, dy)) < 28) {
      cur.d += L;
      cur.i1 = j;
      cur.para = q;
      cur.hx = dx;
      cur.hy = dy;
      continue;
    }
    cur = {
      vert: false,
      de: p,
      para: q,
      i0: j - 1,
      i1: j,
      d: L,
      hx: dx,
      hy: dy,
      hx0: dx,
      hy0: dy,
    };
    pernas.push(cur);
  }
  for (var q2 = pernas.length - 2; q2 >= 1; q2--) {
    var g2 = pernas[q2],
      nx = pernas[q2 + 1];
    if (!g2.vert && !nx.vert && g2.d * E < 4.5) {
      nx.d += g2.d;
      nx.i0 = g2.i0;
      nx.de = g2.de;
      nx.curto = g2;
      pernas.splice(q2, 1);
    }
  }
  var out = [],
    ant = null,
    evita = [de.id, para.id];
  pernas.forEach(function (g, n) {
    if (g.vert) {
      var sobe = g.para.a > g.de.a,
        el = /^elev/.test(g.de.k || g.para.k || ""),
        nm = g.de.k ? D.rede.nos[g.de.k][2] : "escada";
      out.push({
        ic: sobe ? "⬆" : "⬇",
        tipo: "vert",
        andar: g.para.a,
        de: g.de.a,
        i0: g.i0,
        i1: g.i1,
        m: 0,
        txt: el
          ? "Pegue o " +
            nm.replace(/ \(.*\)$/, "") +
            " e " +
            (sobe ? "suba" : "desça") +
            " até o " +
            nomeAndar(g.para.a) +
            "."
          : (sobe ? "Suba" : "Desça") +
            " " +
            prepos(nm) +
            nm.replace(/ \(.*\)$/, "") +
            " até o " +
            nomeAndar(g.para.a) +
            ".",
        sub: el
          ? "Elevador acessível."
          : "Você chega no " + nomeAndar(g.para.a) + ".",
      });
      ant = null;
      return;
    }
    var ult = n === pernas.length - 1,
      m = arred(g.d * E),
      nm = nomeTrecho(r, g.i0, g.i1),
      chegada = ult && g.para.s === para.id;
    var ref = referencia3(g.para.x, g.para.y, g.de.a, g.hx, g.hy, evita);
    if (!ant && out.length === 0) {
      // primeiro trecho: sair do lugar onde a pessoa está
      var t =
        de.tipo === "acesso"
          ? "Entre pela " +
            de.nome.split(" — ")[0].toLowerCase() +
            (de.nome.indexOf(" — ") > 0
              ? " (" + de.nome.split(" — ")[1] + ")"
              : "")
          : "Saia de " + de.nome;
      if (chegada && m <= 12) {
        out.push({
          ic: "🚶",
          tipo: "anda",
          andar: g.de.a,
          i0: g.i0,
          i1: g.i1,
          m: m,
          txt: t + ": " + para.nome + " fica a uns " + m + " m.",
          sub: "",
        });
      } else
        out.push({
          ic: "🚶",
          tipo: "anda",
          andar: g.de.a,
          i0: g.i0,
          i1: g.i1,
          m: m,
          txt:
            t +
            (nm ? " e siga " + prepos(nm) + nm : "") +
            " por uns " +
            m +
            " m.",
          sub: ref,
        });
    } else {
      var hx0 = g.curto ? g.curto.hx0 : g.hx0,
        hy0 = g.curto ? g.curto.hy0 : g.hy0,
        ang = ant ? giro(ant.hx, ant.hy, hx0, hy0) : 0,
        a = Math.abs(ang),
        vira = !ant
          ? "Siga"
          : a < 28
            ? "Siga em frente"
            : a > 150
              ? "Dê meia-volta"
              : ang > 0
                ? "Vire à direita"
                : "Vire à esquerda";
      var ic = !ant || a < 28 ? "⬆" : a > 150 ? "↩" : ang > 0 ? "↱" : "↰";
      if (chegada && g.d * E <= 14 && ant) {
        var lado = giro(ant.hx, ant.hy, g.hx0, g.hy0);
        out.push({
          ic: "🏁",
          tipo: "fim",
          andar: g.de.a,
          i0: g.i0,
          i1: g.i1,
          m: m,
          txt: "Chegou! " + para.nome + " fica " + ladoTxt(lado) + ".",
          sub: para.dica || "",
        });
        ant = g;
        return;
      }
      out.push({
        ic: ic,
        tipo: "anda",
        andar: g.de.a,
        i0: g.i0,
        i1: g.i1,
        m: m,
        txt:
          vira +
          (nm && !chegada
            ? (vira === "Siga" ? " " : " e siga ") + prepos(nm) + nm
            : chegada
              ? " até " + para.nome
              : "") +
          " por uns " +
          m +
          " m.",
        sub: ref,
      });
    }
    ant = g;
  });
  if (!out.length || out[out.length - 1].tipo !== "fim")
    out.push({
      ic: "🏁",
      tipo: "fim",
      andar: +para.andar || 0,
      i0: r.length - 1,
      i1: r.length - 1,
      m: 0,
      txt:
        "Chegou: " +
        para.nome +
        (+para.andar ? " (" + nomeAndar(para.andar) + ")" : "") +
        ".",
      sub: para.dica || "",
    });
  return out;
}
function resumoNav(ps) {
  var m = 0,
    v = 0;
  ps.forEach(function (p) {
    m += p.m;
    if (p.tipo === "vert") v++;
  });
  var s = Math.round(m / 1.2 + v * 20);
  return {
    m: m,
    min: Math.max(1, Math.round(s / 60)),
    txt:
      "≈ " +
      Math.max(1, Math.round(s / 60)) +
      " min a pé · " +
      m +
      " m" +
      (v ? " · " + v + " troca" + (v > 1 ? "s" : "") + " de andar" : ""),
  };
}
// passo a passo em texto (chat offline e cartão da rota)
passos = function (de, para) {
  if (D.rede && !PLANTA && de && para && de.id !== para.id) {
    var sv = [CFG.de, DESTINO];
    CFG.de = de.id;
    DESTINO = para.id;
    var ps = passosNav();
    CFG.de = sv[0];
    DESTINO = sv[1];
    if (ps.length)
      return ps.map(function (p) {
        return (
          p.txt +
          (p.sub && p.tipo !== "fim"
            ? " " + p.sub.replace(/^\S+ (?=[A-ZÁÉÍÓÚ])/, "")
            : "")
        );
      });
  }
  return passosAntigos(de, para);
};

// ── desenho ──
function desenhar3D() {
  var c = $("mapa3d");
  if (!c || c.style.display === "none") return;
  DPR3 = Math.min(2, window.devicePixelRatio || 1);
  var W = c.clientWidth,
    H = c.clientHeight;
  if (!W || !H) return;
  if (c.width !== Math.round(W * DPR3) || c.height !== Math.round(H * DPR3)) {
    c.width = Math.round(W * DPR3);
    c.height = Math.round(H * DPR3);
  }
  var ctx = c.getContext("2d"),
    k = cor3(),
    C = cena3(),
    R = D.rede,
    todos = M3.foco === "todos";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = k.fundo;
  ctx.fillRect(0, 0, c.width, c.height);
  M3.hit = [];
  var r3 = rota3m(),
    passo = M3.nav ? M3.nav.passos[M3.nav.i] : null,
    lista = todos ? andares3() : [+M3.foco],
    rotulos = [];
  var naRota = {};
  r3.forEach(function (p) {
    if (p.s) naRota[p.s] = 1;
  });
  // o térreo aparece como "fantasma" embaixo do pavimento superior (e em cima do subsolo), para a pessoa se orientar
  if (!todos && +M3.foco !== 0) {
    ctx.globalAlpha = +M3.foco < 0 ? 0.16 : 0.28;
    var zf = +M3.foco > 0 ? -70 : 0;
    if (C.terreno) chao3(ctx, C.terreno, zf, null, k.linha, 1);
    D.salas.forEach(function (s) {
      if (s.r && (+s.andar || 0) === 0)
        chao3(ctx, retPts(s.r), zf, null, k.tx3, 0.6);
    });
    ctx.globalAlpha = 1;
  }
  lista.forEach(function (a) {
    var z = z3(a),
      ativo = andarVisivel(a),
      salas = D.salas.filter(function (s) {
        return (+s.andar || 0) === a;
      });
    // no modo Todos com rota, os andares fora da rota ficam apagados
    ctx.globalAlpha =
      todos &&
      r3.length > 1 &&
      !r3.some(function (p) {
        return p.a === a;
      })
        ? 0.3
        : 1;
    // chão / laje
    if (a === 0) {
      (D.ruas || []).forEach(function (rr) {
        var w = 56,
          L = rr.rot ? 1250 : 1000,
          cx = rr.x,
          cy = rr.y,
          pts = rr.rot
            ? [
                [cx - w / 2, cy - L / 2],
                [cx + w / 2, cy - L / 2],
                [cx + w / 2, cy + L / 2],
                [cx - w / 2, cy + L / 2],
              ]
            : [
                [cx - L / 2, cy - w / 2],
                [cx + L / 2, cy - w / 2],
                [cx + L / 2, cy + w / 2],
                [cx - L / 2, cy + w / 2],
              ];
        chao3(ctx, pts, z - 1, k.rua, null);
      });
      if (todos && ctx.globalAlpha === 1) ctx.globalAlpha = 0.88;
      if (C.terreno) chao3(ctx, C.terreno, z, k.chao, k.linha, 1.2);
      else
        chao3(
          ctx,
          [
            [20, 115],
            [980, 115],
            [980, 1115],
            [20, 1115],
          ],
          z,
          k.chao,
          k.linha,
          1,
        );
      (C.verdes || []).forEach(function (v) {
        chao3(ctx, v, z + 0.2, k.verde, null);
      });
      if (ctx.globalAlpha === 0.88) ctx.globalAlpha = 1;
      D.blocos.forEach(function (b) {
        if (/^est/.test(b.id)) {
          chao3(
            ctx,
            retPts([b.x, b.y, b.w, b.h]),
            z + 0.3,
            mix3(k.chao, k.tx3, 0.12),
            null,
          );
          ctx.globalAlpha = 0.5;
          for (var xx = b.x + 12; xx < b.x + b.w - 8; xx += 26) {
            var p0 = P3(xx, b.y + 6, z + 0.4),
              p1 = P3(xx, b.y + 34, z + 0.4);
            ctx.strokeStyle = k.claro ? "#fff" : "#3b5560";
            ctx.lineWidth = 1.2 * DPR3;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        } else if (b.id === "quadra") {
          chao3(
            ctx,
            retPts([b.x, b.y, b.w, b.h]),
            z + 0.3,
            k.claro ? "#7fc8a0" : "#1f5a44",
            null,
          );
          var m = 14,
            qd = [b.x + m, b.y + m, b.w - 2 * m, b.h - 2 * m];
          chao3(
            ctx,
            retPts(qd),
            z + 0.5,
            k.claro ? "#4da3c9" : "#1d4f6a",
            "rgba(255,255,255,.85)",
            1.3,
          );
          var c1 = P3(qd[0], qd[1] + qd[3] / 2, z + 0.6),
            c2 = P3(qd[0] + qd[2], qd[1] + qd[3] / 2, z + 0.6);
          ctx.beginPath();
          ctx.moveTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          ctx.stroke();
          ctx.beginPath();
          for (var t = 0; t <= 24; t++) {
            var an = (t / 24) * Math.PI * 2,
              pp = P3(
                qd[0] + qd[2] / 2 + Math.cos(an) * 28,
                qd[1] + qd[3] / 2 + Math.sin(an) * 28,
                z + 0.6,
              );
            t ? ctx.lineTo(pp.x, pp.y) : ctx.moveTo(pp.x, pp.y);
          }
          ctx.stroke();
        } else if (b.id === "pisc" || b.id === "recre") {
          chao3(
            ctx,
            retPts([b.x, b.y, b.w, b.h]),
            z + 0.3,
            mix3(k.chao, b.cor, k.claro ? 0.18 : 0.14),
            mix3(k.chao, b.cor, 0.5),
            1,
          );
        }
      });
    } else if (C.lajes && C.lajes[a]) {
      C.lajes[a].forEach(function (l) {
        caixa3(
          ctx,
          [l[0] - 4, l[1] - 4, l[2] + 8, l[3] + 8],
          z - 10,
          z,
          k.laje,
          k.lajeLado,
          mix3(k.lajeLado, "#000", 0.15),
          null,
          0,
        );
      });
      (a === 1 ? C.vazios || [] : []).forEach(function (v) {
        chao3(ctx, retPts(v), z + 0.5, null, k.tx3, 0.8);
      });
    }
    // corredores (onde se anda)
    if (R)
      R.arestas.forEach(function (e) {
        var A = R.nos[e[0]],
          B = R.nos[e[1]];
        if (!A || !B || andarNo(e[0]) !== a || andarNo(e[1]) !== a) return;
        if (A[0] === B[0] && A[1] === B[1]) return;
        var dx = B[0] - A[0],
          dy = B[1] - A[1],
          L = Math.hypot(dx, dy) || 1,
          ox = (-dy / L) * 9,
          oy = (dx / L) * 9;
        chao3(
          ctx,
          [
            [A[0] + ox - (dx / L) * 9, A[1] + oy - (dy / L) * 9],
            [B[0] + ox + (dx / L) * 9, B[1] + oy + (dy / L) * 9],
            [B[0] - ox + (dx / L) * 9, B[1] - oy + (dy / L) * 9],
            [A[0] - ox - (dx / L) * 9, A[1] - oy - (dy / L) * 9],
          ],
          z + 0.8,
          k.caminho,
          null,
        );
      });
    // objetos com altura, de trás para a frente
    var objs = [];
    salas.forEach(function (s) {
      if (s.r)
        objs.push({
          t: "sala",
          s: s,
          d: proj3(s.r[0] + s.r[2] / 2, s.r[1] + s.r[3] / 2, z).d,
        });
    });
    (C.escadas || []).forEach(function (e) {
      if (e.andares.indexOf(a) >= 0)
        objs.push({
          t: "esc",
          e: e,
          d: proj3(e.r[0] + e.r[2] / 2, e.r[1] + e.r[3] / 2, z).d + 0.1,
        });
    });
    if (a === 0) {
      (C.decor || []).forEach(function (o) {
        objs.push({
          t: "dec",
          o: o,
          d: proj3(o.x != null ? o.x : o.r[0], o.y != null ? o.y : o.r[1], z).d,
        });
      });
      (C.arvores || []).forEach(function (q) {
        objs.push({ t: "arv", q: q, d: proj3(q[0], q[1], z).d });
      });
    }
    objs.sort(function (p, q) {
      return p.d - q.d;
    });
    var focoRota = r3.length > 1;
    objs.forEach(function (o) {
      if (o.t === "sala") {
        var s = o.s,
          dest = s.id === DESTINO,
          orig = s.id === CFG.de,
          base = TIPO3[s.tipo] || "#9cb8bd",
          cr = dest
            ? "#ffb547"
            : orig
              ? k.claro
                ? "#1a73e8"
                : "#4da3ff"
              : base;
        var grande =
            s.r[2] * s.r[3] > 26000 &&
            (s.tipo === "convivencia" || s.tipo === "acesso"),
          h = grande
            ? s.id === "auditorio"
              ? ALT3 * 1.3
              : 5
            : dest
              ? ALT3 * 1.35
              : ALT3;
        var apaga = focoRota && !dest && !orig ? 0.6 : 1,
          t = (dest || orig ? 0.62 : k.claro ? 0.34 : 0.42) * apaga;
        var topo = mix3(k.claro ? "#ffffff" : "#0b1c24", cr, t),
          l1 = mix3(k.claro ? "#a9bdb9" : "#03090d", cr, t * 0.7),
          l2 = mix3(k.claro ? "#c5d5d2" : "#06131a", cr, t * 0.8);
        if (s.id === "areacoberta" || s.id === "quadra") {
          if (dest || orig) {
            var pp = caixa3(
              ctx,
              [s.r[0], s.r[1], s.r[2], s.r[3]],
              z + 0.6,
              z + 1.2,
              "rgba(255,181,71,.18)",
              null,
              null,
              cr,
              2.2,
            );
            s.__topo = pp;
          } else
            s.__topo = retPts(s.r).map(function (q) {
              return P3(q[0], q[1], z + 1);
            });
        } else
          s.__topo = caixa3(
            ctx,
            [s.r[0] + 2, s.r[1] + 2, s.r[2] - 4, s.r[3] - 4],
            z,
            z + h,
            topo,
            l1,
            l2,
            mix3(topo, cr, dest || orig ? 1 : 0.75),
            dest ? 2.4 : 1,
          );
        s.__h = h;
        if (ativo) M3.hit.push({ id: s.id, poli: s.__topo, d: o.d });
      } else if (o.t === "esc") {
        var e = o.e,
          el = e.tipo === "elevador",
          usa = r3.some(function (p) {
            return p.k && p.k.indexOf(e.id) === 0;
          });
        var tp = caixa3(
          ctx,
          e.r,
          z,
          z + (el ? ALT3 * 1.6 : 8),
          el
            ? k.claro
              ? "#e8eef7"
              : "#22364a"
            : k.claro
              ? "#fff7e6"
              : "#2a3a2f",
          k.claro ? "#b9c6d6" : "#0d1b26",
          k.claro ? "#ccd6e3" : "#132636",
          usa ? k.amb : k.tx3,
          usa ? 2 : 0.8,
        );
        if (!el) {
          ctx.strokeStyle = usa ? k.amb : k.tx3;
          ctx.lineWidth = 1 * DPR3;
          ctx.beginPath();
          for (var i = 1; i < 6; i++) {
            var f = i / 6,
              p0 = P3(e.r[0] + e.r[2] * f, e.r[1] + 2, z + 8.2),
              p1 = P3(e.r[0] + e.r[2] * f, e.r[1] + e.r[3] - 2, z + 8.2);
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
          }
          ctx.stroke();
        }
        if (ativo) {
          var cc = P3(
            e.r[0] + e.r[2] / 2,
            e.r[1] + e.r[3] / 2,
            z + (el ? ALT3 * 1.6 : 8),
          );
          rotulos.push({
            ic: el ? "🛗" : "",
            vet: el ? "" : "esc",
            tx: "",
            x: cc.x,
            y: cc.y,
            pri: usa ? 8 : 3,
            cor: usa ? k.amb : k.tx2,
            peq: true,
          });
        }
      } else if (o.t === "arv") {
        var q = o.q,
          b = P3(q[0], q[1], z),
          tt = P3(q[0], q[1], z + 26),
          rr = Math.max(3, 13 * M3.s) * DPR3;
        ctx.strokeStyle = k.claro ? "#8d7a5b" : "#3d3226";
        ctx.lineWidth = Math.max(1, 2 * M3.s) * DPR3;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(tt.x, tt.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tt.x, tt.y, rr, 0, 7);
        ctx.fillStyle = k.verde2;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tt.x - rr * 0.3, tt.y - rr * 0.3, rr * 0.55, 0, 7);
        ctx.fillStyle = k.claro ? "#c9ecd2" : "#20573b";
        ctx.fill();
      } else if (o.t === "dec") {
        var d = o.o;
        if (d.t === "caixa") {
          var n = 14,
            top = [],
            bot = [];
          for (var i2 = 0; i2 < n; i2++) {
            var an2 = (i2 / n) * Math.PI * 2;
            top.push(
              P3(
                d.x + Math.cos(an2) * d.raio,
                d.y + Math.sin(an2) * d.raio,
                z + d.alt,
              ),
            );
            bot.push(
              P3(d.x + Math.cos(an2) * d.raio, d.y + Math.sin(an2) * d.raio, z),
            );
          }
          for (var i3 = 0; i3 < n; i3++) {
            var j3 = (i3 + 1) % n;
            poli3(
              ctx,
              [bot[i3], bot[j3], top[j3], top[i3]],
              k.claro ? "#c9d6d8" : "#18303a",
              null,
            );
          }
          poli3(ctx, top, k.claro ? "#e3ecee" : "#24414d", k.tx3, 0.8);
          if (ativo)
            rotulos.push({
              tx: "Caixa d'água",
              x: top[0].x - (top[0].x - top[7].x) / 2,
              y: (top[3].y + top[10].y) / 2,
              pri: 1,
              cor: k.tx3,
              peq: true,
            });
        } else if (d.t === "mastros") {
          for (var i4 = -1; i4 <= 1; i4++) {
            var b1 = P3(d.x + i4 * 14, d.y, z),
              t1 = P3(d.x + i4 * 14, d.y, z + 70);
            ctx.strokeStyle = k.tx3;
            ctx.lineWidth = 1.5 * DPR3;
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.stroke();
            ctx.fillStyle = ["#2e9e4f", "#e8c547", "#3d7fd9"][i4 + 1];
            ctx.fillRect(
              t1.x,
              t1.y,
              9 * DPR3 * Math.max(0.6, M3.s),
              6 * DPR3 * Math.max(0.6, M3.s),
            );
          }
        } else if (d.t === "arquibancada") {
          for (var i5 = 0; i5 < 4; i5++)
            caixa3(
              ctx,
              [d.r[0] + (i5 * d.r[2]) / 4, d.r[1], d.r[2] / 4, d.r[3]],
              z,
              z + 4 + i5 * 4,
              k.claro ? "#e7ecef" : "#2a3b44",
              k.claro ? "#b8c4ca" : "#0f1d24",
              k.claro ? "#cdd7dc" : "#16262e",
              null,
              0,
            );
        }
      }
    });
    // lugares sem retângulo (entradas, estacionamento, recreação)
    salas.forEach(function (s) {
      if (s.r) return;
      var q = P3(s.x, s.y, z);
      if (ativo) {
        M3.hit.push({ id: s.id, pt: q, d: proj3(s.x, s.y, z).d + 5 });
        rotulos.push({
          ic: s.ic || "📍",
          tx: rotuloCurto(s.nome),
          x: q.x,
          y: q.y,
          pri: s.id === DESTINO ? 10 : s.tipo === "acesso" ? 6 : 4,
          cor: k.tx,
          pino: true,
          id: s.id,
        });
      }
    });
    // nomes das salas
    if (ativo)
      salas.forEach(function (s) {
        if (!s.r || !s.__topo) return;
        var tp = s.__topo,
          cx = (tp[0].x + tp[1].x + tp[2].x + tp[3].x) / 4,
          cy = (tp[0].y + tp[1].y + tp[2].y + tp[3].y) / 4;
        var larg = Math.max(
            Math.hypot(tp[0].x - tp[1].x, tp[0].y - tp[1].y),
            Math.hypot(tp[1].x - tp[2].x, tp[1].y - tp[2].y),
          ),
          esp = s.id === DESTINO || s.id === CFG.de;
        if (esp && r3.length > 1 && (s.id === DESTINO || !M3.nav)) return; // o alfinete do destino e o "Você está aqui" já dizem o nome
        rotulos.push({
          ic: s.ic || "",
          tx: rotuloCurto(s.nome),
          x: cx,
          y: cy,
          larg: larg,
          pri: esp
            ? 9
            : naRota[s.id]
              ? 7
              : s.ic
                ? 5
                : 2 + Math.min(2, (s.r[2] * s.r[3]) / 20000),
          cor: k.tx,
          id: s.id,
          fixo: esp,
        });
      });
    ctx.globalAlpha = 1;
    // nome do andar no modo "Todos"
    if (todos) {
      var cand = (
        a === 0 && C.terreno
          ? C.terreno
          : C.lajes && C.lajes[a]
            ? [].concat.apply([], C.lajes[a].map(retPts))
            : [[20, 115]]
      )
        .map(function (q) {
          return P3(q[0], q[1], z);
        })
        .sort(function (p, q) {
          return p.x - q.x;
        })[0];
      rotulos.push({
        tx: nomeAndar(a).toUpperCase(),
        x: cand.x + 6 * DPR3,
        y: cand.y - 10 * DPR3,
        pri: 8,
        cor: a === 0 ? k.pri : a < 0 ? "#6aa8ff" : "#ff8f4d",
        andarTag: true,
      });
    }
  });
  // rota
  if (r3.length > 1) desenharRota3(ctx, r3, passo, k, rotulos);
  // ruas (texto no chão)
  if (lista.indexOf(0) >= 0)
    (D.ruas || []).forEach(function (rr) {
      var p = P3(rr.x, rr.y, z3(0));
      rotulos.push({
        tx: rr.t,
        x: p.x,
        y: p.y,
        pri: 0.5,
        cor: k.ruaTx,
        rua: true,
      });
    });
  colocarRotulos(ctx, rotulos, k);
  // bússola
  var bn = $("bt3DNorte");
  var agulha = bn && bn.querySelector(".agulha");
  if (agulha)
    agulha.style.transform = "rotate(" + (M3.yaw + NORTE3) + "rad)";
}
function desenharRota3(ctx, r3, passo, k, rotulos) {
  var todos = M3.foco === "todos",
    segs = [],
    cur = null,
    i0 = passo ? passo.i0 : -1,
    i1 = passo ? passo.i1 : -1;
  for (var i = 0; i < r3.length; i++) {
    var p = r3[i],
      vis = andarVisivel(p.a);
    if (!vis) {
      cur = null;
      continue;
    }
    var q = P3(p.x, p.y, z3(p.a) + 3);
    q.i = i;
    if (cur && r3[i - 1] && andarVisivel(r3[i - 1].a)) cur.push(q);
    else {
      cur = [q];
      segs.push(cur);
    }
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  segs.forEach(function (sg) {
    if (sg.length < 2) return;
    ctx.beginPath();
    sg.forEach(function (p, i) {
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    });
    ctx.strokeStyle = k.claro ? "rgba(212,136,6,.25)" : "rgba(255,181,71,.22)";
    ctx.lineWidth = 15 * DPR3;
    ctx.stroke();
    ctx.strokeStyle = passo ? mix3(k.amb, k.fundo, 0.45) : k.amb;
    ctx.lineWidth = 5.5 * DPR3;
    ctx.stroke();
    // trecho do passo atual em destaque
    if (passo) {
      ctx.beginPath();
      var tem = 0;
      sg.forEach(function (p) {
        if (p.i >= i0 && p.i <= i1) {
          tem ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          tem++;
        }
      });
      if (tem > 1) {
        ctx.strokeStyle = k.amb;
        ctx.lineWidth = 7 * DPR3;
        ctx.stroke();
      }
    }
    // setinhas andando no sentido da rota
    var esp = 34 * DPR3,
      ofs = (M3.dash * 1.2 * DPR3) % esp,
      acum = 0;
    ctx.fillStyle = k.claro ? "#fff" : "#3a2400";
    for (var j = 1; j < sg.length; j++) {
      var a = sg[j - 1],
        b = sg[j],
        L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 1) {
        continue;
      }
      var ux = (b.x - a.x) / L,
        uy = (b.y - a.y) / L,
        t = (esp - ((((acum - ofs) % esp) + esp) % esp)) % esp;
      while (t < L) {
        var x = a.x + ux * t,
          y = a.y + uy * t,
          s = 4 * DPR3;
        ctx.beginPath();
        ctx.moveTo(x + ux * s, y + uy * s);
        ctx.lineTo(x - ux * s - uy * s, y - uy * s + ux * s);
        ctx.lineTo(x - ux * s * 0.3, y - uy * s * 0.3);
        ctx.lineTo(x - ux * s + uy * s, y - uy * s - ux * s);
        ctx.closePath();
        ctx.fill();
        t += esp;
      }
      acum += L;
    }
  });
  // troca de andar: coluna tracejada (Todos) ou aviso na escada (um andar só)
  for (var j2 = 1; j2 < r3.length; j2++) {
    var a2 = r3[j2 - 1],
      b2 = r3[j2];
    if (a2.a === b2.a) continue;
    if (todos) {
      var p0 = P3(a2.x, a2.y, z3(a2.a) + 3),
        p1 = P3(b2.x, b2.y, z3(b2.a) + 3);
      ctx.setLineDash([7 * DPR3, 6 * DPR3]);
      ctx.strokeStyle = k.amb;
      ctx.lineWidth = 4 * DPR3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (andarVisivel(a2.a) || andarVisivel(b2.a)) {
      var aqui = andarVisivel(a2.a) ? a2 : b2,
        outro = aqui === a2 ? b2.a : a2.a,
        pq = P3(aqui.x, aqui.y, z3(aqui.a) + 14);
      rotulos.push({
        tx:
          (outro > aqui.a ? "⬆ " : "⬇ ") +
          (aqui === a2 ? "vá para o " : "vem do ") +
          nomeAndar(outro),
        x: pq.x,
        y: pq.y - 16 * DPR3,
        pri: 9.5,
        cor: "#2b1a00",
        fundo: k.amb,
        fixo: true,
        andarTroca: outro,
      });
    }
  }
  // você está aqui (no passo atual, a pessoa está no começo do trecho)
  var ini = passo ? r3[passo.i0] : r3[0];
  if (passo && passo.tipo === "vert") ini = r3[passo.i1];
  if (andarVisivel(ini.a)) {
    var o = P3(ini.x, ini.y, z3(ini.a) + 2),
      pul = (M3.dash % 60) / 60;
    var raio = (10 + 18 * pul) * DPR3;
    ctx.beginPath();
    ctx.ellipse(
      o.x,
      o.y,
      raio,
      raio * Math.max(0.35, Math.cos(M3.pitch)),
      0,
      0,
      7,
    );
    ctx.fillStyle = k.claro
      ? "rgba(26,115,232," + 0.35 * (1 - pul) + ")"
      : "rgba(77,163,255," + 0.4 * (1 - pul) + ")";
    ctx.fill();
    if (passo && passo.tipo !== "vert") {
      var nx = r3[Math.min(passo.i1, passo.i0 + 1)],
        pn = P3(nx.x, nx.y, z3(nx.a) + 2),
        dx = pn.x - o.x,
        dy = pn.y - o.y,
        L = Math.hypot(dx, dy) || 1;
      ctx.beginPath();
      ctx.moveTo(o.x + (dx / L) * 22 * DPR3, o.y + (dy / L) * 22 * DPR3);
      ctx.lineTo(o.x - (dy / L) * 11 * DPR3, o.y + (dx / L) * 11 * DPR3);
      ctx.lineTo(o.x + (dy / L) * 11 * DPR3, o.y - (dx / L) * 11 * DPR3);
      ctx.closePath();
      ctx.fillStyle = k.claro ? "rgba(26,115,232,.35)" : "rgba(77,163,255,.4)";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(o.x, o.y, 8 * DPR3, 0, 7);
    ctx.fillStyle = k.azul;
    ctx.fill();
    ctx.lineWidth = 3 * DPR3;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    rotulos.push({
      tx: passo ? "Você" : "Você está aqui",
      x: o.x,
      y: o.y + 22 * DPR3,
      pri: 10,
      cor: "#fff",
      fundo: k.azul,
      fixo: true,
    });
  }
  // destino: alfinete flutuando
  var u = r3[r3.length - 1],
    ps = sala(DESTINO);
  if (andarVisivel(u.a)) {
    var hh = ps && ps.__h ? ps.__h : ALT3,
      bob = Math.sin(M3.dash / 9) * 3,
      pe = P3(u.x, u.y, z3(u.a) + hh),
      tp = P3(u.x, u.y, z3(u.a) + hh + 30 + bob);
    ctx.strokeStyle = k.amb;
    ctx.lineWidth = 2.5 * DPR3;
    ctx.beginPath();
    ctx.moveTo(pe.x, pe.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 10 * DPR3, 0, 7);
    ctx.fillStyle = k.amb;
    ctx.fill();
    ctx.lineWidth = 3 * DPR3;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 3.5 * DPR3, 0, 7);
    ctx.fillStyle = "#fff";
    ctx.fill();
    if (ps)
      rotulos.push({
        tx: rotuloCurto(ps.nome),
        x: tp.x,
        y: tp.y - 22 * DPR3,
        pri: 10,
        cor: "#2b1a00",
        fundo: k.amb,
        fixo: true,
      });
  }
}
// rótulos: maior prioridade primeiro; um rótulo não cobre outro
function colocarRotulos(ctx, l, k) {
  var ocup = [],
    W = ctx.canvas.width,
    H = ctx.canvas.height;
  l.sort(function (a, b) {
    return b.pri - a.pri;
  });
  var fs = Math.round(Math.max(10, Math.min(13, 9 + M3.s * 5)) * DPR3);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  M3.rot = [];
  l.forEach(function (r) {
    var f = r.rua
      ? Math.round(10 * DPR3)
      : r.andarTag
        ? Math.round(11 * DPR3)
        : r.peq
          ? Math.round(fs * 0.85)
          : r.fundo
            ? Math.round(fs * 1.02)
            : fs;
    ctx.font =
      (r.fundo || r.andarTag || r.rua ? "800 " : r.pri >= 7 ? "700 " : "600 ") +
      f +
      "px Roboto,Segoe UI,sans-serif";
    var tx = r.tx || "",
      ic = r.ic || "",
      wT = tx ? ctx.measureText(tx).width : 0,
      wI = ic || r.vet ? f * 1.25 : 0,
      w = wT + wI + (wT && wI ? 4 * DPR3 : 0),
      h = f * 1.25,
      pad = r.fundo ? 7 * DPR3 : 2 * DPR3;
    var x = r.x,
      y = r.pino ? r.y - h : r.y;
    // nome que não cabe na sala: mostra só o ícone (ou some)
    if (!r.fixo && r.larg && wT > r.larg * (M3.foco === "todos" ? 1.1 : 1.7)) {
      if (wI) {
        tx = "";
        w = wI;
      } else if (r.pri < 5) return;
    }
    var bx = {
      x0: x - w / 2 - pad,
      y0: y - h / 2 - pad * 0.6,
      x1: x + w / 2 + pad,
      y1: y + h / 2 + pad * 0.6,
    };
    if (bx.x1 < 0 || bx.x0 > W || bx.y1 < 0 || bx.y0 > H) return;
    function bate(b) {
      return ocup.some(function (o) {
        return b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0;
      });
    }
    if (bate(bx)) {
      if (!r.fixo) return;
      var hh = bx.y1 - bx.y0 + 3 * DPR3;
      for (var tt = 1; tt <= 4 && bate(bx); tt++) {
        var dy = (tt % 2 ? 1 : -1) * Math.ceil(tt / 2) * hh;
        bx = {
          x0: bx.x0,
          x1: bx.x1,
          y0: r.y - (h / 2 + pad * 0.6) + dy,
          y1: r.y + (h / 2 + pad * 0.6) + dy,
        };
        y = r.y + dy;
      }
    }
    ocup.push(bx);
    if (r.fundo) {
      var rr = Math.min(h / 2 + pad * 0.6, 12 * DPR3);
      ctx.beginPath();
      if (ctx.roundRect)
        ctx.roundRect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0, rr);
      else ctx.rect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0);
      ctx.fillStyle = r.fundo;
      ctx.shadowColor = "rgba(0,0,0,.3)";
      ctx.shadowBlur = 6 * DPR3;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (r.pino) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, 4 * DPR3, 0, 7);
      ctx.fillStyle = r.id === DESTINO ? k.amb : k.tx2;
      ctx.fill();
    }
    var xi = x - w / 2 + wI / 2;
    if (r.vet === "esc") {
      var s = f * 0.42;
      ctx.strokeStyle = r.cor;
      ctx.lineWidth = 1.8 * DPR3;
      ctx.beginPath();
      ctx.moveTo(xi - s, y + s);
      ctx.lineTo(xi - s / 3, y + s);
      ctx.lineTo(xi - s / 3, y + s / 3);
      ctx.lineTo(xi + s / 3, y + s / 3);
      ctx.lineTo(xi + s / 3, y - s / 3);
      ctx.lineTo(xi + s, y - s / 3);
      ctx.lineTo(xi + s, y - s);
      ctx.stroke();
    } else if (ic) {
      ctx.fillText(ic, xi, y + 1);
    }
    if (tx) {
      var xt = x + (wI ? (wI + 4 * DPR3) / 2 : 0);
      if (!r.fundo && !r.rua) {
        ctx.lineWidth = 3.2 * DPR3;
        ctx.strokeStyle = k.claro
          ? "rgba(255,255,255,.92)"
          : "rgba(5,14,20,.9)";
        ctx.strokeText(tx, xt, y);
      }
      ctx.fillStyle = r.cor || k.tx;
      ctx.fillText(tx, xt, y);
    }
    if (r.andarTroca != null) M3.rot.push({ bx: bx, andar: r.andarTroca });
  });
  ctx.textBaseline = "alphabetic";
}

// ── animação ──
function quadro3(t) {
  M3.laco = 0;
  var c = $("mapa3d");
  if (!c || c.style.display === "none" || !$("tMapa").classList.contains("on"))
    return;
  var anima = !!M3.alvo;
  if (M3.alvo) {
    var f = Math.min(
        1,
        (performance.now() - M3.alvo.t0) / (M3.alvo.dur || 600),
      ),
      e = 1 - Math.pow(1 - f, 3),
      A = M3.alvo;
    ["yaw", "pitch", "s", "px", "py"].forEach(function (kk) {
      M3[kk] = A.de[kk] + (A.para[kk] - A.de[kk]) * e;
    });
    if (f >= 1) M3.alvo = null;
  }
  var vivo = (DESTINO && !document.hidden) || anima;
  // ~30 quadros por segundo quando só as setinhas se mexem (economiza bateria)
  if (anima || !M3.ult || t - M3.ult > 30) {
    M3.dash += 1.6;
    M3.ult = t;
    desenhar3D();
  }
  if (vivo || M3.alvo) M3.laco = requestAnimationFrame(quadro3);
}
function pedir3D() {
  if (!M3.laco) M3.laco = requestAnimationFrame(quadro3);
}
function irCam3(para, dur) {
  var de = { yaw: M3.yaw, pitch: M3.pitch, s: M3.s, px: M3.px, py: M3.py };
  var dy = para.yaw - de.yaw;
  while (dy > Math.PI) {
    para.yaw -= 2 * Math.PI;
    dy -= 2 * Math.PI;
  }
  while (dy < -Math.PI) {
    para.yaw += 2 * Math.PI;
    dy += 2 * Math.PI;
  }
  M3.alvo = { de: de, para: para, t0: performance.now(), dur: dur || 650 };
  pedir3D();
}
// enquadra pontos [x,y,z] na tela (com a câmera "cam"), sem mexer em M3
function enquadrarPts(pts, cam, folgaY) {
  var c = $("mapa3d"),
    sv = { yaw: M3.yaw, pitch: M3.pitch };
  M3.yaw = cam.yaw;
  M3.pitch = cam.pitch;
  var ps = pts.map(function (p) {
    return proj3(p[0], p[1], p[2]);
  });
  M3.yaw = sv.yaw;
  M3.pitch = sv.pitch;
  var x0 = Math.min.apply(
      0,
      ps.map(function (p) {
        return p.x;
      }),
    ),
    x1 = Math.max.apply(
      0,
      ps.map(function (p) {
        return p.x;
      }),
    ),
    y0 = Math.min.apply(
      0,
      ps.map(function (p) {
        return p.y;
      }),
    ),
    y1 = Math.max.apply(
      0,
      ps.map(function (p) {
        return p.y;
      }),
    );
  var W = c.clientWidth - (c.clientWidth > 500 ? 90 : 70),
    H = c.clientHeight - (folgaY || 40),
    s = Math.min(W / Math.max(60, x1 - x0), H / Math.max(60, y1 - y0));
  s = Math.min(s, cam.max || 2.2);
  return {
    yaw: cam.yaw,
    pitch: cam.pitch,
    s: s,
    px: (-(x0 + x1) / 2) * s - (c.clientWidth > 500 ? 0 : 16),
    py: (-(y0 + y1) / 2) * s + (cam.dy || 0),
  };
}
function ptsAndar3(a) {
  var C = cena3(),
    pts = [],
    z = z3(a);
  if (a === 0 && C.terreno)
    C.terreno.forEach(function (q) {
      pts.push([q[0], q[1], z]);
    });
  else if (C.lajes && C.lajes[a])
    C.lajes[a].forEach(function (l) {
      retPts(l).forEach(function (q) {
        pts.push([q[0], q[1], z]);
        pts.push([q[0], q[1], z + ALT3]);
      });
    });
  if (!pts.length)
    D.salas.forEach(function (s) {
      if ((+s.andar || 0) !== a) return;
      var r = s.r || [s.x, s.y, 0, 0];
      retPts(r).forEach(function (q) {
        pts.push([q[0], q[1], z]);
        pts.push([q[0], q[1], z + ALT3]);
      });
    });
  return pts;
}
// enquadra (tudo, o andar em foco ou a rota)
function enquadrar3D(anim, soRota) {
  var c = $("mapa3d");
  if (!c || !c.clientWidth) return;
  var pts = [],
    r3 = rota3m();
  if (soRota && r3.length > 1)
    r3.forEach(function (p) {
      if (andarVisivel(p.a)) {
        pts.push([p.x, p.y, z3(p.a)]);
        pts.push([p.x, p.y, z3(p.a) + 50]);
      }
    });
  if (pts.length < 2) {
    pts = [];
    (M3.foco === "todos" ? andares3() : [+M3.foco]).forEach(function (a) {
      pts = pts.concat(ptsAndar3(a));
    });
  }
  if (!pts.length) return;
  var para = enquadrarPts(
    pts,
    {
      yaw: M3.yaw,
      pitch: M3.pitch,
      max: soRota ? 1.15 : 2.2,
      dy: soRota ? -12 : 6,
    },
    soRota ? 120 : 40,
  );
  if (anim) irCam3(para);
  else {
    M3.s = para.s;
    M3.px = para.px;
    M3.py = para.py;
    pedir3D();
  }
}
// ao escolher um destino: mostra o andar certo (ou "Todos" se a rota troca de andar)
function focoParaRota() {
  var r = rota3m();
  if (r.length < 2) return;
  var as = {};
  r.forEach(function (p) {
    as[p.a] = 1;
  });
  var l = Object.keys(as);
  M3.foco = l.length > 1 ? "todos" : l[0];
  M3.pitch = M3.foco === "todos" ? Math.max(M3.pitch, 0.95) : M3.pitch;
}

// ── tela do mapa ──
function atualizar3D() {
  var tem = !!(D.rede && !PLANTA),
    u = usar3D();
  $("modoMapa").style.display = tem ? "" : "none";
  $("bt2D").classList.toggle("on", !u);
  $("bt3D").classList.toggle("on", u);
  $("mapa3d").style.display = u ? "block" : "none";
  $("mapa").style.display = u ? "none" : "block";
  $("dica3d").style.display = u && M3.dica && !M3.nav ? "block" : "none";
  $("mapaCx").classList.toggle("m3", u);
  $("pilAndar").style.display = u ? "none" : "";
  atualizarControlesAndar();
  if (!u) {
    sairNav(true);
    return;
  }
  if (!M3.enq && $("mapa3d").clientWidth) {
    M3.enq = true;
    if (DESTINO) focoParaRota();
    enquadrar3D(false, !!DESTINO);
  }
  var l = ["todos"].concat(andares3().map(String));
  $("andares").innerHTML = l
    .map(function (a) {
      return (
        '<button class="chip' +
        (M3.foco === a ? " on" : "") +
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
        trocarAndar3(b.dataset.a);
      };
    });
  pedir3D();
}
function andaresMapaOrdenados() {
  return andares3();
}
function atualizarControlesAndar() {
  var btTodos = $("btTodosAndares"),
    btSubir = $("andarSubir"),
    btDescer = $("andarDescer");
  if (!btTodos) return;
  var todos = usar3D() ? M3.foco === "todos" : ANDAR === "todos",
    atual = usar3D() ? +M3.foco : +ANDAR,
    andares = andaresMapaOrdenados(),
    i = andares.indexOf(atual);
  btTodos.classList.toggle("on", todos);
  btTodos.setAttribute("aria-pressed", todos ? "true" : "false");
  btSubir.disabled = todos || i < 0 || i >= andares.length - 1;
  btDescer.disabled = todos || i <= 0;
}
function mudarAndarMapa(delta) {
  var andares = andaresMapaOrdenados(),
    atual = usar3D() ? +M3.foco : +ANDAR,
    i = andares.indexOf(atual),
    proximo = i + delta;
  if (i < 0 || proximo < 0 || proximo >= andares.length) return;
  if (usar3D()) {
    trocarAndar3(String(andares[proximo]));
  } else {
    ANDAR = String(andares[proximo]);
    desenharMapa();
  }
}
function alternarTodosAndares() {
  if (usar3D()) {
    if (M3.foco === "todos") {
      M3.foco =
        M3.focoAntesTodos != null
          ? M3.focoAntesTodos
          : String(+sala(CFG.de).andar || 0);
      M3.focoAntesTodos = null;
    } else {
      M3.focoAntesTodos = M3.foco;
      M3.foco = "todos";
    }
    atualizar3D();
    enquadrar3D(true, !!DESTINO);
  } else {
    ANDAR = ANDAR === "todos" ? "0" : "todos";
    desenharMapa();
  }
}
function trocarAndar3(a) {
  M3.foco = a;
  M3.pitch = a === "todos" ? Math.max(M3.pitch, 0.95) : Math.min(M3.pitch, 0.9);
  atualizar3D();
  enquadrar3D(true, !!DESTINO);
}
var desenharMapa2D = desenharMapa;
desenharMapa = function () {
  desenharMapa2D();
  atualizar3D();
};
var mostrarRota2D = mostrarRota;
mostrarRota = function (id) {
  sairNav(true);
  mostrarRota2D(id);
  if (usar3D()) {
    focoParaRota();
    atualizar3D();
    setTimeout(function () {
      enquadrar3D(true, true);
    }, 30);
  }
};
window.mostrarRota = mostrarRota;
$("bt2D").onclick = function () {
  sairNav(true);
  CFG.mapa3d = false;
  salvarCfg();
  ANDAR =
    M3.foco === "todos"
      ? DESTINO
        ? String(+sala(DESTINO).andar || 0)
        : "0"
      : M3.foco;
  desenharMapa();
  ajustarVB();
};
$("bt3D").onclick = function () {
  CFG.mapa3d = true;
  salvarCfg();
  M3.foco = DESTINO ? M3.foco : ANDAR === "todos" ? "0" : ANDAR;
  desenharMapa();
  if (DESTINO) focoParaRota();
  atualizar3D();
  enquadrar3D(false, !!DESTINO);
};
(function () {
  var c = $("mapa3d"),
    ptrs = {},
    ini = null,
    mov = 0;
  c.addEventListener("pointerdown", function (e) {
    c.setPointerCapture(e.pointerId);
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    mov = 0;
    M3.alvo = null;
    ini = {
      m: { yaw: M3.yaw, pitch: M3.pitch, s: M3.s, px: M3.px, py: M3.py },
      p: JSON.parse(JSON.stringify(ptrs)),
    };
    if (M3.dica) {
      M3.dica = false;
      $("dica3d").style.display = "none";
    }
  });
  c.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 1 && ini.p[ids[0]]) {
      var dx = e.clientX - ini.p[ids[0]].x,
        dy = e.clientY - ini.p[ids[0]].y;
      mov = Math.max(mov, Math.abs(dx) + Math.abs(dy));
      if (mov < 6) return;
      // 1 dedo: arrasta o mapa (como no Google Maps). Mouse: arrasta = gira; botão direito/Shift = arrasta
      var mouse = e.pointerType === "mouse";
      if (mouse && !(e.shiftKey || e.buttons === 2 || e.buttons === 4)) {
        M3.yaw = ini.m.yaw + dx * 0.008;
        M3.pitch = Math.max(0.05, Math.min(1.3, ini.m.pitch - dy * 0.006));
      } else {
        M3.px = ini.m.px + dx;
        M3.py = ini.m.py + dy;
      }
      pedir3D();
    } else if (ids.length >= 2 && ini.p[ids[0]] && ini.p[ids[1]]) {
      mov = 99;
      var a0 = ini.p[ids[0]],
        b0 = ini.p[ids[1]],
        a1 = ptrs[ids[0]],
        b1 = ptrs[ids[1]];
      var d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y),
        d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
      if (d0 < 10) return;
      var f = Math.max(0.15, Math.min(6, (ini.m.s * d1) / d0)) / ini.m.s;
      var r = c.getBoundingClientRect(),
        mx = (a0.x + b0.x) / 2 - r.left - r.width / 2,
        my = (a0.y + b0.y) / 2 - r.top - r.height / 2,
        mx1 = (a1.x + b1.x) / 2 - r.left - r.width / 2,
        my1 = (a1.y + b1.y) / 2 - r.top - r.height / 2;
      M3.s = ini.m.s * f;
      M3.px = mx1 - (mx - ini.m.px) * f;
      M3.py = my1 - (my - ini.m.py) * f;
      // 2 dedos: girar (torcer) e inclinar (subir/descer os dois juntos)
      var ang0 = Math.atan2(b0.y - a0.y, b0.x - a0.x),
        ang1 = Math.atan2(b1.y - a1.y, b1.x - a1.x);
      M3.yaw = ini.m.yaw + (ang1 - ang0);
      var dyM = (a1.y + b1.y - (a0.y + b0.y)) / 2;
      if (Math.abs(d1 - d0) < 40)
        M3.pitch = Math.max(0.05, Math.min(1.3, ini.m.pitch - dyM * 0.005));
      pedir3D();
    }
  });
  function fim(e) {
    var eraUm = Object.keys(ptrs).length === 1;
    delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length) {
      ini = {
        m: { yaw: M3.yaw, pitch: M3.pitch, s: M3.s, px: M3.px, py: M3.py },
        p: JSON.parse(JSON.stringify(ptrs)),
      };
      return;
    }
    if (eraUm && mov < 8 && e.type === "pointerup") toque3D(e);
  }
  c.addEventListener("pointerup", fim);
  c.addEventListener("pointercancel", fim);
  c.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  c.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      var r = c.getBoundingClientRect(),
        mx = e.clientX - r.left - r.width / 2,
        my = e.clientY - r.top - r.height / 2,
        f = e.deltaY > 0 ? 0.87 : 1.15,
        ns = Math.max(0.15, Math.min(6, M3.s * f));
      f = ns / M3.s;
      M3.s = ns;
      M3.px = mx - (mx - M3.px) * f;
      M3.py = my - (my - M3.py) * f;
      pedir3D();
    },
    { passive: false },
  );
})();
function toque3D(e) {
  var c = $("mapa3d"),
    r = c.getBoundingClientRect(),
    p = { x: (e.clientX - r.left) * DPR3, y: (e.clientY - r.top) * DPR3 },
    achou = null;
  // aviso "vá para o pavimento superior" na escada: troca de andar
  for (var j = 0; j < (M3.rot || []).length; j++) {
    var b = M3.rot[j].bx;
    if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) {
      trocarAndar3(String(M3.rot[j].andar));
      return;
    }
  }
  for (var i = M3.hit.length - 1; i >= 0; i--) {
    var h = M3.hit[i];
    if (
      h.pt
        ? Math.hypot(h.pt.x - p.x, h.pt.y - p.y) < 18 * DPR3
        : pontoNoPoli(p, h.poli)
    ) {
      achou = h.id;
      break;
    }
  }
  if (!achou) return;
  if (M3.escolherDe) {
    M3.escolherDe = false;
    $("avisoPick").style.display = "none";
    definirOrigem(achou);
    return;
  }
  if (M3.nav) return;
  DESTINO = achou;
  desenharMapa();
  focoParaRota();
  atualizar3D();
  if (rota3m().length > 1)
    setTimeout(function () {
      enquadrar3D(true, true);
    }, 30);
}
$("andarSubir").onclick = function () {
  mudarAndarMapa(1);
};
$("andarDescer").onclick = function () {
  mudarAndarMapa(-1);
};
$("btTodosAndares").onclick = alternarTodosAndares;
window.addEventListener("resize", function () {
  if (usar3D()) pedir3D();
});
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && usar3D()) pedir3D();
});

// ── "Onde estou?" e "Estou aqui" ──
function definirOrigem(id) {
  var s = sala(id);
  if (!s) return;
  CFG.de = id;
  salvarCfg();
  if (DESTINO === id) DESTINO = null;
  sairNav(true);
  desenharMapa();
  if (DESTINO) {
    focoParaRota();
    atualizar3D();
    setTimeout(function () {
      enquadrar3D(true, true);
    }, 30);
  } else if (usar3D()) {
    M3.foco = String(+s.andar || 0);
    atualizar3D();
    enquadrar3D(true);
  }
  toastMapa("📍 Você está em: " + rotuloCurto(s.nome));
}
function ondeEstou() {
  var grupos = [
    ["Entradas", ["entrada", "acessoOtonis", "estacionamento"]],
    [
      "Térreo — o que você vê perto de você?",
      [
        "hall",
        "secretaria",
        "sanhall",
        "sanmasc",
        "refeitorio",
        "cantina",
        "recreacao",
        "auditorio",
        "areacoberta",
        "quadra",
        "saladocente",
        "labmaq",
      ],
    ],
    ["Pavimento superior", ["leitura", "biblioteca", "saladesenho", "sa1"]],
    ["Subsolo", ["lab17", "lab19"]],
  ];
  var h =
    '<p class="nota" style="margin:0 0 10px">Clique no lugar onde você está (ou no mais perto). Dica: o número da sala fica na placa ao lado da porta.</p>';
  grupos.forEach(function (g) {
    var ls = g[1].map(sala).filter(Boolean);
    if (!ls.length) return;
    h +=
      '<div class="tag" style="margin:12px 0 6px;color:var(--tx3)">' +
      esc(g[0]) +
      '</div><div class="gradeOnde">' +
      ls
        .map(function (s) {
          return (
            '<button class="ondeBt' +
            (s.id === CFG.de ? " on" : "") +
            '" data-id="' +
            esc(s.id) +
            '"><span>' +
            (s.ic ||
              (s.tipo === "lab"
                ? "🔬"
                : s.tipo === "sala"
                  ? "🎓"
                  : s.tipo === "adm"
                    ? "🗂️"
                    : "📍")) +
            "</span>" +
            esc(rotuloCurto(s.nome)) +
            "</button>"
          );
        })
        .join("") +
      "</div>";
  });
  h +=
    '<div class="tag" style="margin:14px 0 6px;color:var(--tx3)">Estou numa sala</div><select id="ondeSel">' +
    opcoesSalas(CFG.de) +
    "</select>";
  h +=
    '<button class="botao sec" id="ondeMapa" style="width:100%;margin-top:10px">👆 Tocar no mapa onde estou</button>';
  abrirFolha("📍 Onde você está?", h, function () {
    definirOrigem($("ondeSel").value);
  });
  $("fSalvar").textContent = "Usar esta sala";
  $("folhaCorpo")
    .querySelectorAll(".ondeBt")
    .forEach(function (b) {
      b.onclick = function () {
        fecharFolha();
        definirOrigem(b.dataset.id);
      };
    });
  $("ondeMapa").onclick = function () {
    fecharFolha();
    irPara("tMapa");
    if (!usar3D()) {
      CFG.mapa3d = true;
      desenharMapa();
    }
    M3.escolherDe = true;
    $("avisoPick").textContent = "Clique no mapa no lugar onde você está";
    $("avisoPick").style.display = "block";
  };
}
$("btOnde").onclick = ondeEstou;
$("btNavBase").onclick = function () {
  if (!DESTINO) {
    toastMapa("Escolha um destino para iniciar a navegação.");
    return;
  }
  iniciarNav();
};

// ── navegação passo a passo ──
function iniciarNav() {
  var ps = passosNav();
  if (ps.length < 2) return;
  if (!usar3D()) {
    CFG.mapa3d = true;
    salvarCfg();
    desenharMapa();
  }
  M3.nav = { i: 0, passos: ps };
  M3.dica = false;
  $("mapaCx").classList.add("navOn");
  $("nav3d").style.display = "flex";
  $("btNavBase").style.display = "none";
  atualizar3D();
  mostrarPasso(0);
  renderRota();
  try {
    $("mapaCx").scrollIntoView({ block: "nearest", behavior: "smooth" });
  } catch (e) {}
}
function sairNav(silencio) {
  if (!M3.nav) return;
  M3.nav = null;
  toastMapa.limpar();
  $("nav3d").style.display = "none";
  $("mapaCx").classList.remove("navOn");
  $("btNavBase").style.display = "";
  if (!silencio) {
    focoParaRota();
    atualizar3D();
    irCam3(
      Object.assign(
        enquadrarPts(
          rota3m()
            .filter(function (p) {
              return andarVisivel(p.a);
            })
            .map(function (p) {
              return [p.x, p.y, z3(p.a)];
            }),
          { yaw: 0, pitch: 0.86, max: 1.5, dy: -12 },
          120,
        ),
      ),
    );
  }
  renderRota();
}
function mostrarPasso(i) {
  var N = M3.nav;
  if (!N) return;
  N.i = Math.max(0, Math.min(N.passos.length - 1, i));
  var p = N.passos[N.i],
    r = rota3m();
  toastMapa(
    p.txt +
      (p.sub && p.tipo !== "fim"
        ? " " + p.sub.replace(/^\S+ (?=[A-ZÁÉÍÓÚ])/, "")
        : ""),
    true,
  );
  $("nvAnt").disabled = N.i === 0;
  $("nvProx").textContent = "Próximo";
  // andar e câmera do passo: o mapa gira para a direção em que a pessoa anda
  var andar = String(p.tipo === "vert" ? p.de : p.andar);
  M3.foco = andar;
  atualizar3D();
  var pts = [],
    i0 = p.i0,
    i1 = Math.min(r.length - 1, p.i1);
  for (var j = i0; j <= i1; j++) pts.push([r[j].x, r[j].y, z3(r[j].a)]);
  var dx = r[i1].x - r[i0].x,
    dy = r[i1].y - r[i0].y,
    yaw = M3.yaw;
  if (p.tipo !== "vert" && Math.hypot(dx, dy) > 4) yaw = Math.atan2(-dx, -dy);
  if (p.tipo === "vert") {
    pts = [];
    var ii = Math.max(0, i0 - 1);
    for (var j2 = ii; j2 <= i0; j2++) pts.push([r[j2].x, r[j2].y, 0]);
    pts.push([r[i0].x + 140, r[i0].y + 140, 0]);
    pts.push([r[i0].x - 140, r[i0].y - 140, 0]);
  } else {
    var cx = (r[i0].x + r[i1].x) / 2,
      cy = (r[i0].y + r[i1].y) / 2;
    pts.push([cx + 140, cy + 140, 0]);
    pts.push([cx - 140, cy - 140, 0]);
  }
  var nh = $("nav3d").offsetHeight || 150;
  irCam3(
    enquadrarPts(
      pts,
      { yaw: yaw, pitch: 0.92, max: 1.35, dy: -nh / 2 - 22 },
      nh + 95,
    ),
    800,
  );
  if (CFG.navVoz)
    falarTexto(
      p.txt +
        (p.sub && p.tipo !== "fim"
          ? " " + p.sub.replace(/^\S+ (?=[A-ZÁÉÍÓÚ])/, "")
          : ""),
    );
}
$("nvAnt").onclick = function () {
  mostrarPasso(M3.nav.i - 1);
};
$("nvProx").onclick = function () {
  if (M3.nav.i >= M3.nav.passos.length - 1) {
    sairNav();
    toastMapa("🏁 Você chegou!");
    return;
  }
  mostrarPasso(M3.nav.i + 1);
};
$("nvCancelar").onclick = function () {
  if (
    window.confirm(
      "Tem certeza de que deseja encerrar a navegação? O progresso atual será perdido.",
    )
  )
    sairNav();
};
