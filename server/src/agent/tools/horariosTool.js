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

export function consultarHorarios({ turma, dia, sala } = {}, metrics) {
  const horarios = getHorarios({ turma, dia, sala }, metrics).map(
    ({ turma, dia, inicio, fim, disciplina, professor, sala }) => ({
      turma,
      dia,
      inicio,
      fim,
      disciplina,
      professor,
      sala,
    })
  );
  return { encontrados: horarios.length, horarios };
}
