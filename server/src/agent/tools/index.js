import { consultarHorarios, horariosDeclaration } from "./horariosTool.js";
import { consultarRota, gpsDeclaration } from "./gpsTool.js";

export const toolDeclarations = [
  { functionDeclarations: [horariosDeclaration, gpsDeclaration] }
];

export const toolHandlers = {
  consultar_horarios: consultarHorarios,
  consultar_rota: consultarRota
};
