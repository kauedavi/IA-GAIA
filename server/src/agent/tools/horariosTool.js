import { horarios } from "../../data/horarios.mock.js";

export const horariosDeclaration = {
  name: "consultar_horarios",
  description: "Consulta aulas cadastradas por turma, dia ou sala.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      turma: { type: "string", description: "Código da turma, se informado." },
      dia: { type: "string", description: "Dia da semana em português, se informado." },
      sala: { type: "string", description: "Número ou nome da sala, se informado." }
    }
  }
};

export function consultarHorarios({ turma, dia, sala } = {}) {
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const result = horarios.filter((item) =>
    (!turma || normalize(item.turma) === normalize(turma)) &&
    (!dia || normalize(item.dia) === normalize(dia)) &&
    (!sala || normalize(item.sala).includes(normalize(sala)))
  );
  return { encontrados: result.length, horarios: result };
}
