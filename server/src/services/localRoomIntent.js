import { findExactSala } from "./spreadsheetService.js";

const ROOM_QUERY_PREFIXES = [
  "onde fica ",
  "onde esta ",
  "como chegar a ",
  "como chegar ate ",
  "rota para ",
];

export function respondToLocalRoomIntent(message) {
  const normalizedMessage = normalizeText(message).replace(/[?!.,]+$/, "").trim();
  const prefix = ROOM_QUERY_PREFIXES.find((candidate) =>
    normalizedMessage.startsWith(candidate)
  );
  if (!prefix) return null;

  const roomQuery = removeLeadingArticle(normalizedMessage.slice(prefix.length));
  const room = findExactSala(roomQuery);
  if (!room) return null;

  const floorLabel = formatFloorLocation(room.andar);
  const location = [
    room.bloco && `no ${room.bloco}`,
    floorLabel,
  ].filter(Boolean);
  const details = location.length ? ` fica ${location.join(", ")}` : "";
  const reference = room.dica ? ` ${room.dica}` : "";
  const roomTitle = room.codigo_porta ? `${room.nome} (${room.codigo_porta})` : room.nome;

  return {
    message: `${roomTitle}${details}.${reference}`.trim(),
    action: { type: "NAVIGATE_TO_ROOM", roomId: room.id },
  };
}

function formatFloorLocation(andar) {
  if (!Number.isFinite(andar)) return null;
  if (andar === -1) return "no subsolo";
  if (andar === 0) return "no pavimento térreo";
  if (andar === 1) return "no pavimento superior";
  return `no ${andar}º andar`;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function removeLeadingArticle(value) {
  return value.replace(/^(?:a|o|ao|na|no)\s+/, "").trim();
}
