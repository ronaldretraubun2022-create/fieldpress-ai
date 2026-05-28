import { supabase, getUser, getProfile } from "../supabase.js";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextResetDate(planCode) {
  if (planCode === "free") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMinutes(minutes) {
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`;
  }

  return `${minutes} menit`;
}

function percent(used, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

async function getPlan(profile) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("code", profile?.plan || "free")
    .maybeSingle();

  if (error) throw error;

  return (
    data || {
      code: "free",
      name: "Free",
      ai_generates: 3,
      audio_minutes: 3,
    }
  );
}

async function getAiUsage(userId, planCode) {
  const start = planCode === "free" ? dayStart() : monthStart();

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) throw error;
  return count || 0;
}

async function getAudioUsageMinutes(userId, planCode) {
  const start = planCode === "free" ? dayStart() : monthStart();

  const { data, error } = await supabase
    .from("audio_usage_logs")
    .select("duration_seconds")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) return 0;

  const seconds = (data || []).reduce((sum, row) => {
    return sum + Number(row.duration_seconds || 0);
  }, 0);

  return Math.ceil(seconds / 60);
}

async function getTopUps(userId) {
  const start = monthStart();

  const { data, error } = await supabase
    .from("token_topups")
    .select("extra_generates, extra_audio_minutes, payment_status")
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .gte("created_at", start.toISOString());

  if (error) return { extraGenerates: 0, extraAudioMinutes: 0 };

  return (data || []).reduce(
    (acc, row) => {
      acc.extraGenerates += Number(row.extra_generates || 0);
      acc.extraAudioMinutes += Number(row.extra_audio_minutes || 0);
      return acc;
    },
    {
      extraGenerates: 0,
      extraAudioMinutes: 0,
    },
  );
}

export async function getUserQuotaSummary() {
  const user = await getUser();
  const profile = await getProfile();

  if (!user || !profile) {
    throw new Error("User belum login.");
  }

  const internal =
    profile.role === "owner" ||
    profile.role === "admin" ||
    profile.is_internal === true ||
    profile.plan === "enterprise_internal";

  const plan = await getPlan(profile);
  const topups = await getTopUps(user.id);

  const aiUsed = await getAiUsage(user.id, plan.code);
  const audioUsed = await getAudioUsageMinutes(user.id, plan.code);

  const aiLimit = internal
    ? 999999
    : Number(plan.ai_generates || 0) + topups.extraGenerates;

  const audioLimit = internal
    ? 999999
    : Number(plan.audio_minutes || 0) + topups.extraAudioMinutes;

  return {
    user,
    profile,
    plan,
    internal,
    topups,
    aiUsed,
    aiLimit,
    aiRemaining: Math.max(aiLimit - aiUsed, 0),
    audioUsed,
    audioLimit,
    audioRemaining: Math.max(audioLimit - audioUsed, 0),
    aiPercent: percent(aiUsed, aiLimit),
    audioPercent: percent(audioUsed, audioLimit),
    resetAt: nextResetDate(plan.code),
  };
}

export async function renderQuotaCard(targetSelector = "#quotaCard") {
  const target = document.querySelector(targetSelector);

  if (!target) return;

  target.innerHTML = `
    <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
      <div class="animate-pulse text-slate-400">Loading quota...</div>
    </div>
  `;

  try {
    const q = await getUserQuotaSummary();

    target.innerHTML = `
      <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p class="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
              Quota Status
            </p>

            <h2 class="mt-2 text-3xl font-black">
              ${q.internal ? "Internal Owner" : q.plan.name || q.plan.code}
            </h2>

            <p class="mt-2 text-sm text-slate-400">
              Next reset: ${formatDate(q.resetAt)}
            </p>
          </div>

          <div class="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200">
            ${q.internal ? "Unlimited internal access" : `Plan aktif: ${q.plan.code}`}
          </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-400">Sisa AI Generate</p>
                <p class="mt-1 text-3xl font-black text-cyan-300">
                  ${q.internal ? "∞" : q.aiRemaining}
                </p>
              </div>

              <div class="text-right text-sm text-slate-400">
                ${q.internal ? "Unlimited" : `${q.aiUsed}/${q.aiLimit} used`}
              </div>
            </div>

            <div class="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-cyan-400"
                style="width: ${q.internal ? 100 : q.aiPercent}%"
              ></div>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-400">Sisa Audio</p>
                <p class="mt-1 text-3xl font-black text-cyan-300">
                  ${q.internal ? "∞" : formatMinutes(q.audioRemaining)}
                </p>
              </div>

              <div class="text-right text-sm text-slate-400">
                ${q.internal ? "Unlimited" : `${formatMinutes(q.audioUsed)}/${formatMinutes(q.audioLimit)} used`}
              </div>
            </div>

            <div class="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-blue-400"
                style="width: ${q.internal ? 100 : q.audioPercent}%"
              ></div>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-5 md:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p class="text-sm text-slate-400">Top Up Generate</p>
            <p class="mt-2 text-2xl font-black">
              ${q.topups.extraGenerates}
            </p>
          </div>

          <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p class="text-sm text-slate-400">Top Up Audio</p>
            <p class="mt-2 text-2xl font-black">
              ${formatMinutes(q.topups.extraAudioMinutes)}
            </p>
          </div>

          <a
            href="pricing.html"
            class="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-200 hover:bg-cyan-400/20"
          >
            <p class="text-sm font-bold">Quota hampir habis?</p>
            <p class="mt-2 text-2xl font-black">Beli Top Up</p>
          </a>
        </div>
      </section>
    `;
  } catch (error) {
    target.innerHTML = `
      <div class="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
        ${error.message}
      </div>
    `;
  }
}
