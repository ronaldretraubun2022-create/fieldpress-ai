import { supabase, getUser } from "../supabase.js";

export async function renderArticleHistory(containerSelector = "#articleHistory") {
  const target = document.querySelector(containerSelector);
  if (!target) return;

  const user = await getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    target.innerHTML = `<div class="text-red-300">${error.message}</div>`;
    return;
  }

  target.innerHTML =
    data?.map((article) => `
      <article class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div class="mb-3 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
          ${article.status || "draft"}
        </div>
        <h3 class="text-lg font-black">${article.title || "Tanpa judul"}</h3>
        <p class="mt-2 line-clamp-2 text-sm text-slate-400">${article.lead || ""}</p>
        <a class="mt-4 inline-block text-sm font-bold text-cyan-300" href="reporter.html?id=${article.id}">
          Buka Artikel
        </a>
      </article>
    `).join("") || `<div class="text-slate-400">Belum ada artikel.</div>`;
}
