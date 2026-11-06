import { salas } from "../../data/salas.mock.js";

export const gpsDeclaration = {
  name: "consultar_rota",
  description: "Consulta a sala de destino e retorna dados estruturados para navegação.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      destino: { type: "string", description: "Número, ID ou nome da sala de destino." }
    },
    required: ["destino"]
  }
};

export function consultarRota({ destino }) {
  const query = String(destino || "").trim().toLowerCase();
  const sala = salas.find((item) =>
    item.id.toLowerCase() === query ||
    item.nome.toLowerCase().includes(query)
  );
  return sala
    ? { encontrado: true, sala, action: { type: "NAVIGATE_TO_ROOM", roomId: sala.id } }
    : { encontrado: false, mensagem: "Sala não encontrada no cadastro." };
}
