import { supabase } from "../supabase.js";

function rupiah(v) {
  return `Rp${Number(v || 0).toLocaleString("id-ID")}`;
}

export async function renderAIUsageDashboard(selector = "#aiUsageDashboard") {
  const target =
    typeof selector === "string" ? document.querySelector(selector) : selector;

  if (!target) return;

  target.innerHTML = `
    <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p class="text-slate-400">Loading AI Usage Monitoring...</p>
    </section>
  `;

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const startMonth = new Date();
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);

  const { data: logs, error } = await supabase
    .from("ai_usage_logs")
    .select("user_id,tokens_used,created_at");

  if (error) {
    target.innerHTML = `
      <section class="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        ${error.message}
      </section>
    `;
    return;
  }

  const rows = logs || [];

  const todayCount = rows.filter(
    (row) => new Date(row.created_at) >= startToday,
  ).length;

  const monthRows = rows.filter(
    (row) => new Date(row.created_at) >= startMonth,
  );

  const monthCount = monthRows.length;

  const totalTokens = monthRows.reduce(
    (sum, row) => sum + Number(row.tokens_used || 0),
    0,
  );

  const usageByUser = {};

  monthRows.forEach((row) => {
    const userId = row.user_id || "unknown";
    usageByUser[userId] =
      (usageByUser[userId] || 0) + Number(row.tokens_used || 0);
  });

  const topUser = Object.entries(usageByUser).sort((a, b) => b[1] - a[1])[0];

  const estimatedCostUsd = (totalTokens / 1000000) * 5;
  const estimatedCostIdr = Math.round(estimatedCostUsd * 16000);

  target.innerHTML = `
    <section class="space-y-6">
      <div>
        <h2 class="text-2xl font-black">AI Usage Monitoring</h2>
        <p class="mt-2 text-sm text-slate-400">
          Monitoring penggunaan AI berdasarkan tabel ai_usage_logs.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p class="text-sm text-slate-400">Total Generate Hari Ini</p>
          <p class="mt-2 text-3xl font-black text-cyan-300">${todayCount}</p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p class="text-sm text-slate-400">Total Generate Bulan Ini</p>
          <p class="mt-2 text-3xl font-black text-cyan-300">${monthCount}</p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p class="text-sm text-slate-400">Top User AI</p>
          <p class="mt-2 break-all text-sm font-bold">
            ${topUser ? topUser[0] : "-"}
          </p>
          <p class="mt-2 text-xs text-slate-500">
            ${topUser ? `${Number(topUser[1]).toLocaleString("id-ID")} tokens` : "Belum ada data"}
          </p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p class="text-sm text-slate-400">Total Tokens Bulan Ini</p>
          <p class="mt-2 text-3xl font-black">
            ${totalTokens.toLocaleString("id-ID")}
          </p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p class="text-sm text-slate-400">Estimated OpenAI Cost</p>
          <p class="mt-2 text-3xl font-black text-yellow-300">
            ${rupiah(estimatedCostIdr)}
          </p>
          <p class="mt-2 text-xs text-slate-500">
            Estimasi: $5 / 1 juta token, kurs Rp16.000.
          </p>
        </div>
      </div>
    </section>
  `;
}
