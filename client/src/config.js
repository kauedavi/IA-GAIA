export const GAIA_API_URL =
  "https://gaia-production-31cc76bd.up.railway.app/api/chat";

// ── Supabase Auth ───────────────────────────────────────────────────
// Preencha com os valores do seu projeto (Supabase Studio → Settings →
// API). Enquanto estiverem vazios, o app continua usando o login local
// do localStorage.
//
// A anon key é pública por natureza — ela vai no navegador de qualquer
// jeito e quem protege os dados é o RLS. NUNCA coloque aqui a
// service_role key: ela ignora o RLS e só pode viver no servidor.
export const GAIA_SUPABASE = {
  url: "",
  anonKey: "",
};
