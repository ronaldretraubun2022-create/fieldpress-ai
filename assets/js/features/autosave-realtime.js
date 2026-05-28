import { supabase, getUser } from "../supabase.js";

let autosaveTimer = null;

export function startArticleAutosave(getPayload, intervalMs = 12000) {
  clearInterval(autosaveTimer);

  autosaveTimer = setInterval(async () => {
    const user = await getUser();
    if (!user) return;

    const payload = getPayload();
    if (!payload?.title && !payload?.body) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "Autosave artikel",
      metadata: payload,
    });

    console.log("[FieldPress AI] autosaved", new Date().toISOString());
  }, intervalMs);
}

export function stopArticleAutosave() {
  clearInterval(autosaveTimer);
}

export function subscribeArticles(userId, onChange) {
  return supabase
    .channel(`articles-live-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "articles",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe();
}
