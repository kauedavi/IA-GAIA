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

  const location = [
    room.bloco && `no ${room.bloco}`,
    Number.isFinite(room.andar) && `no ${room.andar}º andar`,
  ].filter(Boolean);
  const details = location.length ? ` fica ${location.join(", ")}` : "";
  const reference = room.dica ? ` ${room.dica}` : "";

  return {
    message: `${room.nome}${details}.${reference}`.trim(),
    action: { type: "NAVIGATE_TO_ROOM", roomId: room.id },
  };
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
