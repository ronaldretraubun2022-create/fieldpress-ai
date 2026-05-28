async function getPlanConfig(supabase, planCode) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("code", planCode || "free")
    .maybeSingle();

  if (error) throw error;

  return data || {
    code: "free",
    ai_generates: 5,
    audio_minutes: 10,
  };
}

async function getMonthlyUsage(supabase, userId) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) throw error;
  return count || 0;
}

async function getTopupBalance(supabase, userId) {
  const { data, error } = await supabase
    .from("token_topups")
    .select("extra_generates, extra_audio_minutes")
    .eq("user_id", userId)
    .eq("payment_status", "paid");

  if (error) throw error;

  return (data || []).reduce(
    (acc, item) => {
      acc.extraGenerates += item.extra_generates || 0;
      acc.extraAudioMinutes += item.extra_audio_minutes || 0;
      return acc;
    },
    { extraGenerates: 0, extraAudioMinutes: 0 }
  );
}

async function checkFieldPressQuota({ supabase, userId, profile }) {
  if (
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.is_internal === true ||
    profile?.plan === "enterprise_internal"
  ) {
    return {
      allowed: true,
      bypass: true,
      remaining: 999999,
      limit: 999999,
    };
  }

  const plan = await getPlanConfig(supabase, profile?.plan || "free");
  const used = await getMonthlyUsage(supabase, userId);
  const topup = await getTopupBalance(supabase, userId);

  const limit = (plan.ai_generates || 0) + topup.extraGenerates;
  const remaining = Math.max(limit - used, 0);

  if (remaining <= 0) {
    const error = new Error("Quota AI habis. Silakan beli top up atau upgrade paket.");
    error.code = "QUOTA_EXCEEDED";
    throw error;
  }

  return {
    allowed: true,
    bypass: false,
    used,
    limit,
    remaining,
    plan,
    topup,
  };
}

module.exports = {
  checkFieldPressQuota,
};
