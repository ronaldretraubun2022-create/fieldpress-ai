import { apiPost } from "../utils.js";
import { supabase } from "../supabase.js";

export const REWRITE_LEVELS = {
  clean: "Rapikan bahasa tanpa mengubah fakta.",
  formal: "Ubah menjadi gaya formal newsroom profesional.",
  viral: "Ubah menjadi gaya lebih engaging tetapi tetap faktual.",
  short: "Ringkas menjadi versi pendek.",
  long: "Kembangkan menjadi artikel panjang yang terstruktur.",
  headline: "Buat versi headline yang lebih kuat.",
};

export async function rewriteArticleLevel(text, level, accessToken) {
  const instruction = REWRITE_LEVELS[level] || REWRITE_LEVELS.clean;

  return apiPost(
    "/ai/rewrite",
    {
      text,
      instruction,
      level,
    },
    accessToken
  );
}
