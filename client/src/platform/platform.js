/* H.A.R.I para PC: faz no navegador (Edge/Chrome) o papel que o Java faz no APK (window.Nativo).
   voz do dispositivo, microfone pelo reconhecimento de voz do navegador, lembretes por notificação. */
(function () {
  "use strict";
  var VERSAO = "1.6 PC";
  var geracao = 0;
  function cb(nome) {
    var a = [].slice.call(arguments, 1);
    setTimeout(function () {
      if (typeof window[nome] === "function") window[nome].apply(null, a);
    }, 0);
  }

  // ── Voz do Windows (speechSynthesis), masculina pt-BR ──
  var MASC = [
    "antonio",
    "daniel",
    "donato",
    "fabio",
    "fábio",
    "humberto",
    "julio",
    "júlio",
    "nicolau",
    "valerio",
    "valério",
    "macerio",
    "leonardo",
    "male",
    "masculin",
  ];
  function vozesPt() {
    try {
      return speechSynthesis.getVoices().filter(function (v) {
        return /^pt/i.test(v.lang);
      });
    } catch (e) {
      return [];
    }
  }
  function escolherVoz(nome) {
    var vs = vozesPt(),
      br = vs.filter(function (v) {
        return /BR/i.test(v.lang);
      });
    if (nome) {
      for (var i = 0; i < vs.length; i++)
        if (vs[i].name === nome) return { v: vs[i], masc: true };
    }
    var masc = br.filter(function (v) {
      var n = v.name.toLowerCase();
      return (
        MASC.some(function (m) {
          return n.indexOf(m) >= 0;
        }) && n.indexOf("female") < 0
      );
    });
    masc.sort(function (a, b) {
      function p(v) {
        var n = v.name.toLowerCase();
        return n.indexOf("antonio") >= 0
          ? 0
          : n.indexOf("natural") >= 0
            ? 1
            : n.indexOf("daniel") >= 0
              ? 2
              : 3;
      }
      return p(a) - p(b);
    });
    if (masc[0]) return { v: masc[0], masc: true };
    return { v: br[0] || vs[0] || null, masc: false };
  }
  function partes(t) {
    var out = [],
      atual = "";
    String(t)
      .split(/(?<=[.!?;:\n])\s+/)
      .forEach(function (f) {
        if ((atual + " " + f).length > 180 && atual) {
          out.push(atual);
          atual = f;
        } else atual = atual ? atual + " " + f : f;
      });
    if (atual) out.push(atual);
    return out;
  }
  function falarWindows(t, nome) {
    if (!window.speechSynthesis) {
      cb("hariFalaFim");
      return;
    }
    speechSynthesis.cancel();
    var e = escolherVoz(nome),
      ps = partes(t),
      minha = geracao;
    ps.forEach(function (p, i) {
      var u = new SpeechSynthesisUtterance(p);
      u.lang = "pt-BR";
      if (e.v) u.voice = e.v;
      u.pitch = e.masc ? (nome ? 1 : 0.92) : 0.7;
      u.rate = 1.02;
      if (i === 0)
        u.onstart = function () {
          if (minha === geracao) cb("hariFalaInicio");
        };
      if (i === ps.length - 1) {
        u.onend = u.onerror = function () {
          if (minha === geracao) cb("hariFalaFim");
        };
      }
      speechSynthesis.speak(u);
    });
    if (!ps.length) cb("hariFalaFim");
  }
  if (window.speechSynthesis)
    speechSynthesis.onvoiceschanged = function () {
      try {
        if (
          typeof montarVozes === "function" &&
          document.getElementById("aVoz")
        )
          montarVozes();
      } catch (e) {}
    };

  // ── Microfone ──
  var rec = null;
  // ── Lembretes enquanto o app está aberto ──
  var timers = [];

  window.Nativo = {
    versao: function () {
      return VERSAO;
    },
    falar: function (t, modo, voz) {
      if (!t || !String(t).trim()) {
        cb("hariFalaFim");
        return;
      }
      this.pararFala();
      falarWindows(t, voz);
    },
    pararFala: function () {
      geracao++;
      try {
        speechSynthesis.cancel();
      } catch (e) {}
    },
    vozesCelular: function () {
      return JSON.stringify(
        vozesPt().map(function (v) {
          return {
            nome: v.name,
            pais: v.lang.split(/[-_]/)[1] || "",
            internet: !v.localService,
          };
        }),
      );
    },
    ouvir: function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        cb(
          "hariVozErro",
          "Este navegador não reconhece voz: use o Microsoft Edge ou o Google Chrome",
        );
        return;
      }
      try {
        if (rec) rec.abort();
      } catch (e) {}
      rec = new SR();
      rec.lang = "pt-BR";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      var deu = false;
      rec.onresult = function (ev) {
        if (deu) return;
        deu = true;
        cb("hariVoz", ev.results[0][0].transcript);
      };
      rec.onerror = function (ev) {
        if (deu) return;
        deu = true;
        var m = {
          "not-allowed": "Permita o uso do microfone para o H.A.R.I",
          "service-not-allowed": "Permita o uso do microfone para o H.A.R.I",
          "no-speech": "Não ouvi nada, tente de novo",
          network: "O reconhecimento de voz precisa de internet",
          "audio-capture": "Nenhum microfone encontrado",
        }[ev.error];
        cb("hariVozErro", m || "");
      };
      rec.onend = function () {
        clearTimeout(limite);
        if (!deu) {
          deu = true;
          cb("hariVoz", "");
        }
      };
      // se o navegador não responder (sem microfone ou sem serviço de voz), não deixa o H.A.R.I preso em "Ouvindo…"
      var esse = rec,
        limite = setTimeout(function () {
          if (deu) return;
          deu = true;
          try {
            esse.abort();
          } catch (e) {}
          cb(
            "hariVozErro",
            "Não consegui ouvir: confira o microfone e a internet",
          );
        }, window.__tempoMic || 15000);
      try {
        rec.start();
      } catch (e) {
        deu = true;
        clearTimeout(limite);
        cb("hariVozErro", "Não consegui abrir o microfone");
      }
    },
    agendarLembretes: function (json) {
      timers.forEach(clearTimeout);
      timers = [];
      var l = [];
      try {
        l = JSON.parse(json);
      } catch (e) {}
      var agora = Date.now();
      l.forEach(function (x) {
        var ms = x.t - agora;
        if (ms <= 0 || ms > 2147000000) return;
        timers.push(
          setTimeout(function () {
            try {
              if (window.Notification && Notification.permission === "granted")
                new Notification(x.titulo, {
                  body: x.texto || "",
                  icon: document.querySelector("link[rel=icon]")
                    ? document.querySelector("link[rel=icon]").href
                    : undefined,
                  tag: "hari" + x.t,
                });
            } catch (e) {}
            if (typeof toast === "function") toast(x.titulo);
          }, ms),
        );
      });
    },
    podeNotificar: function () {
      return !!(window.Notification && Notification.permission === "granted");
    },
    pedirNotificacao: function () {
      try {
        if (window.Notification) Notification.requestPermission();
      } catch (e) {}
    },
    abrirLink: function (u) {
      window.open(u, "_blank", "noopener");
    },
    compartilhar: function (t, nome) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([t], { type: "application/json" }));
      a.download = nome || "hari.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
      if (typeof toast === "function") toast("Arquivo salvo em Downloads");
    },
    tema: function (claro) {
      var m = document.querySelector("meta[name=theme-color]");
      if (m) m.content = claro ? "#EEF5F4" : "#06121A";
    },
    hash: function () {
      return "";
    }, // usa o SHA-256 em JavaScript do app (mesmo resultado do celular)
  };
  window.HARI_PC = true;
  // Esc faz o papel do botão Voltar do celular
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && typeof window.hariVoltar === "function")
      window.hariVoltar();
  });
})();