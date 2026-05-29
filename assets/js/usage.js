import { supabase } from "./supabase.js";

export const PLAN_LIMITS = {
  free: { period: "day", limit: 5 },
  basic: { period: "month", limit: 50 },
  pro: { period: "month", limit: 300 },
  enterprise: { period: "month", limit: 1000000 },
  admin: { period: "month", limit: 1000000 },
  owner: { period: "month", limit: Infinity },
};

function isInternalUser(profile) {
  return ["owner", "admin"].includes(profile?.role);
}

export async function getUsageSummary(profile) {
  if (isInternalUser(profile)) {
    return {
      plan: profile.role,
      period: "internal",
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      percent: 100,
      unlimited: true,
    };
  }

  const plan = profile?.plan || "free";
  const cfg = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const start = new Date();

  if (cfg.period === "day") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", start.toISOString());

  if (error) throw error;

  const used = count || 0;
  const limit = cfg.limit;
  const remaining = Math.max(0, limit - used);

  return {
    plan,
    period: cfg.period,
    limit,
    used,
    remaining,
    percent: Math.min(100, Math.round((used / limit) * 100)),
    unlimited: false,
  };
}

export async function renderUsage(selector, profile) {
  const el = document.querySelector(selector);
  if (!el || !profile) return;

  const s = await getUsageSummary(profile);

  if (s.unlimited) {
    el.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm text-slate-400">AI Usage (${s.plan})</span>
        <b>Unlimited</b>
      </div>

      <div class="progress mt-3">
        <span style="width:100%"></span>
      </div>

      <p class="mt-2 text-xs text-slate-400">
        Internal account: unlimited AI usage.
      </p>
    `;
    return;
  }

  el.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-sm text-slate-400">AI Usage (${s.plan})</span>
      <b>${s.used}/${s.limit}</b>
    </div>

    <div class="progress mt-3">
      <span style="width:${s.percent}%"></span>
    </div>

    <p class="mt-2 text-xs text-slate-400">
      Sisa kuota: ${s.remaining}
    </p>
  `;
}
