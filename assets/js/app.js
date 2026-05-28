import {
  supabase,
  requireAuth,
  getProfile,
  signOut,
  getUser,
} from "./supabase.js";

import { $, toast, formatDate, escapeHtml } from "./utils.js";
import { renderUsage } from "./usage.js";
import { renderQuotaCard } from "./features/quota-card.js";

function bindShell() {
  $("#menuBtn")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("open");
  });

  $("#logoutBtn")?.addEventListener("click", signOut);
}

async function ensureProfile() {
  const user = await getUser();
  if (!user) return null;

  const existingProfile = await getProfile();
  if (existingProfile) return existingProfile;

  const fallbackProfile = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email || "User",
    role: "user",
    plan: "free",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(fallbackProfile)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function count(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId);

  if (error) return 0;
  return count || 0;
}

function empty(text) {
  return `
    <div class="card text-center text-slate-400">
      ${escapeHtml(text)}
    </div>
  `;
}

async function loadRecent(userId) {
  const q = $("#searchInput")?.value || "";
  const status = $("#statusFilter")?.value || "";

  let query = supabase
    .from("articles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(12);

  if (q) query = query.ilike("title", `%${q}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  const target = $("#recentArticles");
  if (!target) return;

  target.innerHTML =
    (data || [])
      .map(
        (article) => `
          <article class="card">
            <span class="badge">
              ${escapeHtml(article.status || "draft")}
            </span>

            <h3 class="mt-3 font-black">
              ${escapeHtml(article.title || "Tanpa judul")}
            </h3>

            <p class="mt-2 line-clamp-2 text-sm text-slate-400">
              ${escapeHtml(article.lead || "")}
            </p>

            <p class="mt-3 text-xs text-slate-500">
              ${formatDate(article.created_at)}
            </p>
          </article>
        `,
      )
      .join("") || empty("Artikel belum ada");
}

async function loadDashboard() {
  const session = await requireAuth();
  if (!session) return;

  bindShell();

  const profile = await ensureProfile();

  if (!profile?.id) {
    throw new Error("Profile user belum tersedia.");
  }

  if ($("#profileName")) {
    $("#profileName").textContent =
      profile.full_name || profile.email || "User";
  }

  if ($("#profileRole")) {
    $("#profileRole").textContent =
      `${profile.role || "user"} • ${profile.plan || "free"}`;
  }

  await renderQuotaCard("#quotaCard");
  await renderUsage("#usageBox", profile);

  const [articles, recordings, notes] = await Promise.all([
    count("articles", profile.id),
    count("recordings", profile.id),
    count("meeting_notes", profile.id),
  ]);

  if ($("#statArticles")) $("#statArticles").textContent = articles;
  if ($("#statRecordings")) $("#statRecordings").textContent = recordings;
  if ($("#statNotes")) $("#statNotes").textContent = notes;

  const { data: activities } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(8);

  if ($("#activityList")) {
    $("#activityList").innerHTML =
      (activities || [])
        .map(
          (activity) => `
            <div class="card">
              <p class="font-bold">
                ${escapeHtml(activity.action || "Aktivitas")}
              </p>

              <p class="text-sm text-slate-400">
                ${formatDate(activity.created_at)}
              </p>
            </div>
          `,
        )
        .join("") || empty("Belum ada aktivitas");
  }

  await loadRecent(profile.id);

  $("#searchInput")?.addEventListener("input", () => loadRecent(profile.id));
  $("#statusFilter")?.addEventListener("change", () => loadRecent(profile.id));
}

loadDashboard().catch((error) => {
  console.error(error);
  toast(error.message || "Terjadi kesalahan dashboard.", "error");
});
