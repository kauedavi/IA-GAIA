// ── armazenamento ──
function lerLS(k, p) {
  try {
    var v = localStorage.getItem(k);
    return v === null ? p : v;
  } catch (e) {
    return p;
  }
}
function gravarLS(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}
var D;
try {
  D = JSON.parse(lerLS("hari_dados", "null"));
} catch (e) {
  D = null;
}
if (!D || !D.salas || !D.aulas || !D.blocos) D = exemplo();
if (!D.versao || D.versao < 2) {
  var nm0 = D.nome;
  if (/exemplo/i.test(D.unidade || "")) {
    D = exemplo();
    D.nome = nm0;
  } else {
    D.versao = 2;
    D.agenda = D.agenda || [];
    D.info = D.info || exemplo().info;
  }
}
if (!D.agenda) D.agenda = [];
if (!D.info) D.info = exemplo().info;
if (D.versao < 3) {
  D.info = exemplo().info;
  D.versao = 3;
}
if (D.versao < 4) {
  var EX = exemplo();
  if (D.mapaAproximado) {
    var MAP = {
      portaria: "entrada",
      professores: "saladocente",
      coordenacao: "coordtec",
      aee: "orientacao",
      banheiros: "sanmasc",
      piscina: "areacoberta",
      labanalog: "labeletronica",
      labdigital: "labmicro",
      labembarc: "lab16",
      labauto: "labrobotica",
      labpneu: "labhidpneu",
      labinfo: "labsoftware",
      s11: "sa1",
      s12: "sa2",
      s21: "sa3",
      s22: "saladesenho",
    };
    var troca = function (id) {
      return MAP[id] || id;
    };
    D.aulas.forEach(function (a) {
      a.sala = troca(a.sala);
    });
    (D.agenda || []).forEach(function (e) {
      e.sala = troca(e.sala);
    });
    D.blocos = EX.blocos;
    D.salas = EX.salas;
    D.rede = EX.rede;
    D.ruas = EX.ruas;
    D.mapaAproximado = false;
    D.mapaFonte = EX.mapaFonte;
  }
  D.versao = 4;
  try {
    localStorage.setItem("hari_dados", JSON.stringify(D));
  } catch (e) {}
}
// 1.4: laboratórios com o número oficial (programa de necessidades da planta). Só troca se o nome ainda for o antigo.
if (D.versao < 5) {
  var NUM = {
    labprojetos: {
      de: "Laboratório de Projetos",
      nome: "Laboratório 3",
      apelidos: "lab 3 laboratorio 3 robotica projetos",
      dica: "Lab. 3 — Robótica (na planta antiga: Laboratório de Projetos). Térreo, corredor dos laboratórios.",
    },
    labcadcam: {
      de: "Laboratório CAD/CAM",
      nome: "Laboratório 5",
      apelidos: "lab 5 laboratorio 5 cad cam",
      dica: "Lab. 5 (na planta antiga: Laboratório CAD/CAM). Térreo, segunda fileira.",
    },
    labrobotica: {
      de: "Laboratório de Robótica",
      nome: "Laboratório 7",
      apelidos: "lab 7 laboratorio 7 automacao industrial robotica",
      dica: "Lab. 7 — Automação Industrial. Térreo, segunda fileira.",
    },
    labmanuf: {
      de: "Lab. de Manufatura Integrada por Computador",
      nome: "Laboratório 10",
      apelidos: "lab 10 laboratorio 10 manufatura integrada",
      dica: "Lab. 10 (na planta antiga: Lab. de Manufatura Integrada por Computador). Térreo, segunda fileira.",
    },
    lab19: {
      de: "Laboratório 19 — Pneumática e Hidráulica",
      nome: "Laboratório 19",
      apelidos: "lab 19 laboratorio 19 pneumatica hidraulica",
      dica: "Lab. 19 — Pneumática e Hidráulica. Subsolo, embaixo da área do auditório.",
    },
  };
  D.salas.forEach(function (x) {
    var t = NUM[x.id];
    if (t && x.nome === t.de) {
      x.nome = t.nome;
      x.apelidos = t.apelidos;
      x.dica = t.dica;
    }
  });
  D.versao = 5;
  try {
    localStorage.setItem("hari_dados", JSON.stringify(D));
  } catch (e) {}
}
// 1.6: mapa 3D refeito (pavimento superior no lugar certo, corredores por andar, elevador, terreno). Mantém nomes editados e salas criadas.
if (D.versao < 6) {
  var EX6 = exemplo();
  if (D.rede) {
    var velho = {};
    D.salas.forEach(function (s) {
      velho[s.id] = s;
    });
    var ids = {};
    var DIC6 = [
      "biblioteca",
      "leitura",
      "labei1",
      "labei2",
      "saladesenho",
      "sa3",
      "sa2",
      "sa1",
      "hall",
    ];
    var novas = EX6.salas.map(function (n) {
      ids[n.id] = 1;
      var v = velho[n.id];
      if (v) {
        n.nome = v.nome;
        n.apelidos = v.apelidos;
        if (DIC6.indexOf(n.id) < 0) n.dica = v.dica;
      }
      return n;
    });
    D.salas.forEach(function (s) {
      if (!ids[s.id]) novas.push(s);
    });
    D.salas = novas;
    D.blocos = EX6.blocos;
    D.rede = EX6.rede;
    D.ruas = EX6.ruas;
    D.cena = EX6.cena;
    D.mapaFonte = EX6.mapaFonte;
  }
  D.versao = 6;
  try {
    localStorage.setItem("hari_dados", JSON.stringify(D));
  } catch (e) {}
}
var CFG;
try {
  CFG = JSON.parse(lerLS("hari_cfg", "{}")) || {};
} catch (e) {
  CFG = {};
}
if (CFG.voz === undefined) CFG.voz = true;
if (!CFG.de || !sala(CFG.de))
  CFG.de = sala("entrada") ? "entrada" : (D.salas[0] || {}).id;
if (CFG.lembrete === undefined) CFG.lembrete = 10;
function salvar() {
  if (!gravarLS("hari_dados", JSON.stringify(D)))
    toast("Não consegui salvar neste aparelho");
}
function salvarCfg() {
  gravarLS("hari_cfg", JSON.stringify(CFG));
}
var PLANTA = lerLS("hari_planta", "");
