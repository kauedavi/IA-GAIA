import { findSala } from "../../services/spreadsheetService.js";

export const gpsDeclaration = {
  name: "consultar_rota",
  description: "Consulta uma sala da unidade na planilha atualizada e retorna dados estruturados para navegação.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      destino: { type: "string", description: "Número, ID ou nome da sala de destino." }
    },
    required: ["destino"]
  }
};

export function consultarRota({ destino }) {
  const sala = findSala(destino);
  return sala
    ? { encontrado: true, sala, fonte: "planilha_excel", action: { type: "NAVIGATE_TO_ROOM", roomId: sala.id } }
    : { encontrado: false, mensagem: "Sala não encontrada na planilha atual." };
}
