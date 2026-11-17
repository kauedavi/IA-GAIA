import { getHorarios } from "../../services/spreadsheetService.js";

export const horariosDeclaration = {
  name: "consultar_horarios",
  description: "Consulta aulas cadastradas por turma, dia ou sala na planilha atualizada.",
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
  const result = getHorarios({ turma, dia, sala });
  return { encontrados: result.length, horarios: result, fonte: "planilha_excel" };
}
