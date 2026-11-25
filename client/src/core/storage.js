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
  D = JSON.parse(lerLS("gaia_dados", "null"));
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
    localStorage.setItem("gaia_dados", JSON.stringify(D));
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
    localStorage.setItem("gaia_dados", JSON.stringify(D));
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
    localStorage.setItem("gaia_dados", JSON.stringify(D));
  } catch (e) {}
}
// 2.0: nomenclatura oficial (mapa_escola.json), hierarquia de pavimentos (-1, 0, 1) e grafo multi-pavimento.
if (D.versao < 7) {
  var EX7 = exemplo();
  var MAP7 = {
    entrada: "recepcao",
    hall: "recepcao",
    diretoria: "nucleo_tic",
    coordtec: "coordenacao_pedagogica",
    apoiopedag: "coordenacao_pedagogica",
    coordestagio: "coordenacao_pedagogica",
    orientacao: "coordenacao_pedagogica",
    seguranca: "recepcao",
    saladocente: "sala_professores",
    sanhall: "sanitarios_terreo",
    sanmasc: "sanitarios_terreo",
    sanfem: "sanitarios_terreo",
    sanpne: "sanitarios_terreo",
    cantina: "refeitorio",
    recreacao: "area_de_convivencia",
    areacoberta: "area_de_convivencia",
    quadra: "quadra_poliesportiva",
    vestiarios: "sanitarios_terreo",
    vestsub: "sanitarios_terreo",
    leitura: "biblioteca",
    sa1: "sala_de_aula_1",
    sa2: "sala_de_aula_2",
    sa3: "sala_de_aula_3",
    labprojman: "L10_manufatura",
    labprojetos: "L3_eletronica_potencia",
    labhidpneu: "L18_laboratorio_automacao_industrial",
    labcomandos: "L4_eletricidade",
    labeletronica: "L3_eletronica_potencia",
    labmicro: "L6_eletronica_digital",
    labsoftware: "L7_informatica_1",
    labmetrologia: "L2_ensaios_conectividade_simulacoes",
    labmaq: "L1_laboratorio_automacao",
    labcadcam: "L5_conectividade",
    labrobotica: "L7_informatica_1",
    labmanuf: "L10_manufatura",
    labei1: "L1_laboratorio_automacao",
    labei2: "L2_ensaios_conectividade_simulacoes",
    saladesenho: "sala_de_aula_3",
    lab16: "L6_eletronica_digital",
    lab17: "L7_informatica_1",
    lab18: "L18_laboratorio_automacao_industrial",
    lab19: "L18_laboratorio_automacao_industrial",
    labinstel: "L4_eletricidade",
    labmetro2: "L2_ensaios_conectividade_simulacoes",
    almox: "L10_manufatura",
    acessoOtonis: "recepcao",
    estacionamento: "recepcao",
  };
  var mapearId7 = function (id) {
    return MAP7[id] || id;
  };
  var idsOficiais = {};
  EX7.salas.forEach(function (s) {
    idsOficiais[s.id] = 1;
  });
  var extras = D.salas.filter(function (s) {
    return !MAP7[s.id] && !idsOficiais[s.id];
  });
  D.salas = EX7.salas.concat(extras);
  D.blocos = EX7.blocos;
  D.rede = EX7.rede;
  D.ruas = EX7.ruas;
  D.cena = EX7.cena;
  D.info = EX7.info;
  D.mapaFonte = EX7.mapaFonte;
  D.aulas.forEach(function (a) {
    a.sala = mapearId7(a.sala);
  });
  (D.agenda || []).forEach(function (e) {
    e.sala = mapearId7(e.sala);
  });
  D.versao = 7;
  try {
    localStorage.setItem("gaia_dados", JSON.stringify(D));
  } catch (e) {}
}
var CFG;
try {
  CFG = JSON.parse(lerLS("gaia_cfg", "{}")) || {};
} catch (e) {
  CFG = {};
}
if (CFG.voz === undefined) CFG.voz = true;
if (CFG.textoEscala === undefined) CFG.textoEscala = 1;
if (CFG.contraste === undefined) CFG.contraste = false;
if (CFG.acessivel === undefined) CFG.acessivel = false;
if (CFG.navVoz === undefined) CFG.navVoz = false;
if (CFG.som === undefined) CFG.som = false;
if (!CFG.de || !sala(CFG.de))
  CFG.de = sala("recepcao")
    ? "recepcao"
    : sala("entrada")
      ? "entrada"
      : (D.salas[0] || {}).id;
if (CFG.lembrete === undefined) CFG.lembrete = 10;
function salvar() {
  if (!gravarLS("gaia_dados", JSON.stringify(D)))
    toast("Não consegui salvar neste aparelho");
}
function salvarCfg() {
  gravarLS("gaia_cfg", JSON.stringify(CFG));
}
var PLANTA = lerLS("gaia_planta", "");
