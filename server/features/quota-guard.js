async function getPlan(supabase, code) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("code", code || "free")
    .maybeSingle();

  if (error) throw error;

  return data || {
    code: "free",
    ai_generates: 3,
    audio_minutes: 3,
  };
}

function monthStartISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function dayStartISO() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function isInternal(profile) {
  return (
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.is_internal === true ||
    profile?.plan === "enterprise_internal"
  );
}

async function getTopupTotals(supabase, userId) {
  const { data, error } = await supabase
    .from("token_topups")
    .select("extra_generates, extra_audio_minutes")
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .gte("created_at", monthStartISO());

  if (error) throw error;

  return (data || []).reduce(
    (acc, row) => {
      acc.extraGenerates += row.extra_generates || 0;
      acc.extraAudioMinutes += row.extra_audio_minutes || 0;
      return acc;
    },
    { extraGenerates: 0, extraAudioMinutes: 0 }
  );
}

async function countAiUsage(supabase, userId, profile) {
  const periodStart = profile?.plan === "free" ? dayStartISO() : monthStartISO();

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", periodStart);

  if (error) throw error;
  return count || 0;
}

async function sumAudioUsageSeconds(supabase, userId, profile) {
  const periodStart = profile?.plan === "free" ? dayStartISO() : monthStartISO();

  const { data, error } = await supabase
    .from("audio_usage_logs")
    .select("duration_seconds")
    .eq("user_id", userId)
    .gte("created_at", periodStart);

  if (error) throw error;

  return (data || []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
}

async function checkAiQuota({ supabase, userId, profile }) {
  if (isInternal(profile)) {
    return { allowed: true, bypass: true, remaining: 999999, limit: 999999 };
  }

  const plan = await getPlan(supabase, profile?.plan || "free");
  const topups = await getTopupTotals(supabase, userId);
  const used = await countAiUsage(supabase, userId, profile);

  const limit = (plan.ai_generates || 0) + topups.extraGenerates;
  const remaining = limit - used;

  if (remaining <= 0) {
    const error = new Error("Quota AI habis. Silakan upgrade atau beli top up.");
    error.status = 402;
    error.code = "AI_QUOTA_EXCEEDED";
    throw error;
  }

  return { allowed: true, bypass: false, used, limit, remaining };
}

async function checkAudioQuota({ supabase, userId, profile, durationSeconds = 0 }) {
  if (isInternal(profile)) {
    return { allowed: true, bypass: true, remainingSeconds: 999999999 };
  }

  const plan = await getPlan(supabase, profile?.plan || "free");
  const topups = await getTopupTotals(supabase, userId);
  const usedSeconds = await sumAudioUsageSeconds(supabase, userId, profile);

  const limitSeconds = ((plan.audio_minutes || 0) + topups.extraAudioMinutes) * 60;
  const projected = usedSeconds + durationSeconds;

  if (projected > limitSeconds) {
    const error = new Error("Quota audio habis. Silakan upgrade atau beli top up audio.");
    error.status = 402;
    error.code = "AUDIO_QUOTA_EXCEEDED";
    throw error;
  }

  return {
    allowed: true,
    usedSeconds,
    limitSeconds,
    remainingSeconds: Math.max(limitSeconds - projected, 0),
  };
}

async function logAudioUsage({ supabase, userId, durationSeconds, source = "upload" }) {
  await supabase.from("audio_usage_logs").insert({
    user_id: userId,
    duration_seconds: Math.max(0, Math.round(durationSeconds || 0)),
    source,
  });
}

async function logSecurityEvent({ supabase, req, userId = null, eventType, severity = "info", metadata = {} }) {
  try {
    await supabase.from("security_events").insert({
      user_id: userId,
      event_type: eventType,
      severity,
      ip: req.ip,
      user_agent: req.headers["user-agent"] || "",
      metadata,
    });
  } catch {
    // do not block request because logging failed
  }
}

module.exports = {
  checkAiQuota,
  checkAudioQuota,
  logAudioUsage,
  logSecurityEvent,
  isInternal,
};
