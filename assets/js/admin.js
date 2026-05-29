import { supabase, requireAuth, getProfile } from "./supabase.js";
import { approveTopUpByEmail } from "./features/topup-auto.js";
import { activateUserPlanByEmail } from "./features/upgrade-auto.js";
import { toast } from "./utils.js";
import { renderAdminProductionPack } from "./features/admin-production.js";
import { renderAIUsageDashboard } from "./features/ai-usage-dashboard.js";

let profile = null;

const PLAN_LEVELS = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
  enterprise_internal: 4,
};

function rupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function monthStartISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function todayStartISO() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function groupRevenueByDay(rows) {
  const grouped = {};

  rows.forEach((row) => {
    if (row.status !== "approved") return;

    const day = new Date(row.created_at).toLocaleDateString("id-ID");
    grouped[day] = (grouped[day] || 0) + Number(row.amount_idr || 0);
  });

  return grouped;
}

function renderMiniBars(grouped) {
  const entries = Object.entries(grouped).slice(-7);

  if (!entries.length) {
    return `<p class="mt-4 text-sm text-slate-400">Belum ada revenue.</p>`;
  }

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return `
    <div class="mt-4 space-y-3">
      ${entries
        .map(([day, value]) => {
          const width = Math.max(8, Math.round((value / max) * 100));

          return `
            <div>
              <div class="mb-1 flex justify-between text-xs text-slate-400">
                <span>${day}</span>
                <span>${rupiah(value)}</span>
              </div>

              <div class="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full bg-cyan-400"
                  style="width:${width}%"
                ></div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  profile = await getProfile();

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    alert("Akses ditolak.");
    location.href = "dashboard.html";
    return;
  }

  document.querySelector("#logoutBtn")?.addEventListener("click", logout);
  document.querySelector("#refreshBtn")?.addEventListener("click", reloadAdmin);

  await reloadAdmin();
}

async function reloadAdmin() {
  await renderRevenueAnalytics();
  await renderAIUsageDashboard("#aiUsageDashboard");
  await renderAdminProductionPack();
  await renderBillingRequests();
  await renderBillingHistory();
}

async function logout() {
  await supabase.auth.signOut();
  location.href = "login.html";
}

async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,plan,role,created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function getBillingRows() {
  const { data, error } = await supabase
    .from("billing_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,plan,role,created_at");

  if (error) return [];
  return data || [];
}

function getPlanLevel(plan) {
  return PLAN_LEVELS[plan] ?? 0;
}

async function logAdminAction(action, targetUserId = null, metadata = {}) {
  await supabase.from("admin_audit_logs").insert({
    admin_id: profile?.id || null,
    target_user_id: targetUserId,
    action,
    metadata,
  });
}

async function validatePlanUpgrade({ requestId, requestedPlan, userProfile }) {
  const currentPlan = userProfile?.plan || "free";
  const currentLevel = getPlanLevel(currentPlan);
  const requestedLevel = getPlanLevel(requestedPlan);

  if (!requestedPlan) {
    throw new Error("Plan request kosong.");
  }

  if (requestedLevel < currentLevel) {
    await supabase
      .from("billing_requests")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    await logAdminAction("Reject downgrade billing", userProfile?.id || null, {
      request_id: requestId,
      email: userProfile?.email || null,
      current_plan: currentPlan,
      requested_plan: requestedPlan,
      reason: "Downgrade plan tidak diizinkan dari billing request.",
    });

    throw new Error(
      `Tidak bisa downgrade dari ${currentPlan} ke ${requestedPlan}.`,
    );
  }

  return true;
}

async function renderRevenueAnalytics() {
  const target = document.querySelector("#revenueAnalytics");
  if (!target) return;

  target.innerHTML = `
    <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
      Loading revenue analytics...
    </div>
  `;

  try {
    const [billingRows, profiles] = await Promise.all([
      getBillingRows(),
      getProfiles(),
    ]);

    const approved = billingRows.filter((row) => row.status === "approved");
    const pending = billingRows.filter((row) => row.status === "pending");
    const rejected = billingRows.filter((row) => row.status === "rejected");

    const monthStart = monthStartISO();
    const todayStart = todayStartISO();

    const approvedThisMonth = approved.filter(
      (row) => row.created_at >= monthStart,
    );
    const approvedToday = approved.filter(
      (row) => row.created_at >= todayStart,
    );

    const totalRevenue = approved.reduce(
      (sum, row) => sum + Number(row.amount_idr || 0),
      0,
    );
    const monthlyRevenue = approvedThisMonth.reduce(
      (sum, row) => sum + Number(row.amount_idr || 0),
      0,
    );
    const todayRevenue = approvedToday.reduce(
      (sum, row) => sum + Number(row.amount_idr || 0),
      0,
    );
    const pendingValue = pending.reduce(
      (sum, row) => sum + Number(row.amount_idr || 0),
      0,
    );

    const upgradeApproved = approved.filter(
      (row) => row.request_type === "plan_upgrade",
    );
    const topupApproved = approved.filter(
      (row) => row.request_type === "topup",
    );

    const planCounts = profiles.reduce((acc, userProfile) => {
      const plan = userProfile.plan || "free";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    const paidUsers = profiles.filter((userProfile) =>
      ["basic", "pro", "enterprise"].includes(userProfile.plan),
    );

    const totalUsers = profiles.length;
    const conversionRate = totalUsers
      ? Math.round((paidUsers.length / totalUsers) * 100)
      : 0;
    const arpu = totalUsers ? Math.round(totalRevenue / totalUsers) : 0;
    const paidArpu = paidUsers.length
      ? Math.round(totalRevenue / paidUsers.length)
      : 0;

    const topupStats = topupApproved.reduce((acc, row) => {
      const code = row.topup_code || "unknown";
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    const bestTopup =
      Object.entries(topupStats).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Belum ada";

    const groupedRevenue = groupRevenueByDay(approved);

    target.innerHTML = `
      <section class="space-y-6">
        <div>
          <h2 class="text-2xl font-black">Revenue Dashboard</h2>
          <p class="mt-2 text-sm text-slate-400">
            Ringkasan pendapatan, billing request, conversion, ARPU, dan plan user.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Total Revenue</p>
            <p class="mt-2 text-3xl font-black text-cyan-300">${rupiah(totalRevenue)}</p>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Revenue Bulan Ini</p>
            <p class="mt-2 text-3xl font-black text-cyan-300">${rupiah(monthlyRevenue)}</p>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Revenue Hari Ini</p>
            <p class="mt-2 text-3xl font-black">${rupiah(todayRevenue)}</p>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Pending Payment</p>
            <p class="mt-2 text-3xl font-black text-yellow-300">${rupiah(pendingValue)}</p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Approved Upgrade</p>
            <p class="mt-2 text-3xl font-black">${upgradeApproved.length}</p>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Approved Top Up</p>
            <p class="mt-2 text-3xl font-black">${topupApproved.length}</p>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Rejected Request</p>
            <p class="mt-2 text-3xl font-black text-red-300">${rejected.length}</p>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p class="text-sm text-slate-400">Conversion Rate</p>
            <p class="mt-2 text-3xl font-black text-cyan-300">${conversionRate}%</p>
          </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-3">
          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 xl:col-span-2">
            <h3 class="text-xl font-black">Revenue 7 Hari Terakhir</h3>
            ${renderMiniBars(groupedRevenue)}
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 class="text-xl font-black">Billing Analytics</h3>

            <div class="mt-5 space-y-4 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-400">Total User</span>
                <b>${totalUsers}</b>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-400">Paid User</span>
                <b>${paidUsers.length}</b>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-400">ARPU</span>
                <b>${rupiah(arpu)}</b>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-400">Paid ARPU</span>
                <b>${rupiah(paidArpu)}</b>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-400">Top Up Terlaris</span>
                <b>${bestTopup}</b>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 class="text-xl font-black">User Plan Distribution</h3>

          <div class="mt-5 grid gap-4 md:grid-cols-5">
            ${["free", "basic", "pro", "enterprise", "enterprise_internal"]
              .map(
                (plan) => `
                  <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                    <p class="text-sm text-slate-400">${plan}</p>
                    <p class="mt-2 text-3xl font-black">${planCounts[plan] || 0}</p>
                  </div>
                `,
              )
              .join("")}
          </div>
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

async function renderBillingRequests() {
  const target = document.querySelector("#billingRequests");
  if (!target) return;

  target.innerHTML = `
    <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
      Loading pending billing requests...
    </div>
  `;

  const { data, error } = await supabase
    .from("billing_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    target.innerHTML = `
      <div class="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
        ${error.message}
      </div>
    `;
    return;
  }

  if (!data?.length) {
    target.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
        Belum ada request pending.
      </div>
    `;
    return;
  }

  const enriched = await Promise.all(
    data.map(async (item) => ({
      ...item,
      user_profile: await getProfileByUserId(item.user_id),
    })),
  );

  target.innerHTML = enriched.map((item) => billingCard(item)).join("");
  bindBillingActions();
}

function billingCard(item) {
  const email = item.user_profile?.email || "";
  const name = item.user_profile?.full_name || "Unknown User";
  const currentPlan = item.user_profile?.plan || "free";

  return `
    <article class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <span class="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
              ${item.request_type || "-"}
            </span>

            <span class="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
              ${item.status || "pending"}
            </span>
          </div>

          <h3 class="text-2xl font-black">${name}</h3>
          <p class="mt-2 text-sm text-slate-400">${email || item.user_id}</p>

          <div class="mt-6 grid gap-3 text-sm text-slate-300">
            <div><span class="font-bold text-white">Plan:</span> ${item.plan_code || "-"}</div>
            <div><span class="font-bold text-white">Top Up:</span> ${item.topup_code || "-"}</div>
            <div><span class="font-bold text-white">Amount:</span> ${rupiah(item.amount_idr)}</div>
            <div><span class="font-bold text-white">Current Plan:</span> ${currentPlan}</div>
            <div><span class="font-bold text-white">Created:</span> ${new Date(item.created_at).toLocaleString("id-ID")}</div>
          </div>

          <div class="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-sm text-slate-300">
${item.whatsapp_message || ""}
          </div>
        </div>

        <div class="grid w-full gap-3 lg:w-64">
          <button
            data-id="${item.id}"
            data-type="${item.request_type || ""}"
            data-email="${email}"
            data-user-id="${item.user_id || ""}"
            data-plan="${item.plan_code || ""}"
            data-current-plan="${currentPlan}"
            data-topup="${item.topup_code || ""}"
            data-amount="${item.amount_idr || 0}"
            class="approve-btn rounded-2xl bg-cyan-400 px-6 py-4 font-black text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>

          <button
            data-wa="${encodeURIComponent(item.whatsapp_message || "")}"
            class="wa-btn rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold hover:bg-white/10"
          >
            Open WhatsApp
          </button>

          <button
            data-id="${item.id}"
            data-user-id="${item.user_id || ""}"
            data-email="${email}"
            data-type="${item.request_type || ""}"
            data-plan="${item.plan_code || ""}"
            data-topup="${item.topup_code || ""}"
            data-amount="${item.amount_idr || 0}"
            class="reject-btn rounded-2xl border border-red-400/20 bg-red-400/10 px-6 py-4 font-bold text-red-300 hover:bg-red-400/20"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindBillingActions() {
  document.querySelectorAll(".wa-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const message = decodeURIComponent(btn.dataset.wa || "");
      window.open(
        `https://wa.me/6282121167987?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    });
  });

  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        btn.textContent = "Processing...";

        const requestId = btn.dataset.id;
        const type = btn.dataset.type;
        const email = btn.dataset.email;
        const userId = btn.dataset.userId;
        const plan = btn.dataset.plan;
        const currentPlan = btn.dataset.currentPlan || "free";
        const topup = btn.dataset.topup;
        const amount = Number(btn.dataset.amount || 0);

        if (!email) throw new Error("Email user tidak ditemukan di profiles.");

        const userProfile = userId ? await getProfileByUserId(userId) : null;

        if (type === "plan_upgrade") {
          await validatePlanUpgrade({
            requestId,
            requestedPlan: plan,
            userProfile: userProfile || {
              id: userId,
              email,
              plan: currentPlan,
            },
          });

          await activateUserPlanByEmail(email, plan);
        } else if (type === "topup") {
          await approveTopUpByEmail(email, topup);
        } else {
          throw new Error(`Request type tidak dikenal: ${type}`);
        }

        const { error } = await supabase
          .from("billing_requests")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (error) throw error;

        await logAdminAction("Approve billing", userId || null, {
          request_id: requestId,
          email,
          type,
          plan,
          current_plan: currentPlan,
          topup,
          amount_idr: amount,
          status: "approved",
          approved_at: new Date().toISOString(),
        });

        toast("Request berhasil diapprove.");
        await reloadAdmin();
      } catch (error) {
        console.error(error);
        toast(error.message, "error");
        btn.disabled = false;
        btn.textContent = "Approve";
        await reloadAdmin();
      }
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const requestId = btn.dataset.id;
        const userId = btn.dataset.userId;
        const email = btn.dataset.email;
        const type = btn.dataset.type;
        const plan = btn.dataset.plan;
        const topup = btn.dataset.topup;
        const amount = Number(btn.dataset.amount || 0);

        const { error } = await supabase
          .from("billing_requests")
          .update({
            status: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (error) throw error;

        await logAdminAction("Reject billing", userId || null, {
          request_id: requestId,
          email,
          type,
          plan,
          topup,
          amount_idr: amount,
          status: "rejected",
          rejected_at: new Date().toISOString(),
        });

        toast("Request berhasil direject.");
        await reloadAdmin();
      } catch (error) {
        console.error(error);
        toast(error.message, "error");
      }
    });
  });
}

async function renderBillingHistory() {
  const target = document.querySelector("#billingHistory");
  if (!target) return;

  target.innerHTML = `
    <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
      Loading billing history...
    </div>
  `;

  const { data, error } = await supabase
    .from("billing_requests")
    .select("*")
    .in("status", ["approved", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    target.innerHTML = `
      <div class="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
        ${error.message}
      </div>
    `;
    return;
  }

  if (!data?.length) {
    target.innerHTML = `
      <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h2 class="text-2xl font-black">Billing History</h2>
        <p class="mt-2 text-sm text-slate-400">
          Riwayat billing approved dan rejected.
        </p>
        <p class="mt-5 text-sm text-slate-500">Belum ada billing history.</p>
      </section>
    `;
    return;
  }

  const rows = await Promise.all(
    data.map(async (item) => ({
      ...item,
      user_profile: await getProfileByUserId(item.user_id),
    })),
  );

  const filterValue =
    document.querySelector("#billingHistoryFilter")?.value || "all";

  const filteredRows =
    filterValue === "all"
      ? rows
      : rows.filter((row) => row.status === filterValue);

  const approvedCount = rows.filter((row) => row.status === "approved").length;

  const rejectedCount = rows.filter((row) => row.status === "rejected").length;

  const successRate =
    approvedCount + rejectedCount
      ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100)
      : 0;

  target.innerHTML = `
    <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>
    <h2 class="text-2xl font-black">Billing History</h2>
    <p class="mt-2 text-sm text-slate-400">
      Riwayat billing yang sudah approved atau rejected.
    </p>
  </div>

  <div class="mt-6 grid gap-4 md:grid-cols-3">
  <div class="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
    <p class="text-sm text-emerald-300">Approved</p>
    <p class="mt-2 text-3xl font-black text-white">
      ${approvedCount}
    </p>
  </div>

  <div class="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
    <p class="text-sm text-red-300">Rejected</p>
    <p class="mt-2 text-3xl font-black text-white">
      ${rejectedCount}
    </p>
  </div>

  <div class="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
    <p class="text-sm text-cyan-300">Success Rate</p>
    <p class="mt-2 text-3xl font-black text-white">
      ${successRate}%
    </p>
  </div>
</div>

  <select
    id="billingHistoryFilter"
    class="rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm"
  >
    <option value="all">Semua</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
  </select>
</div>

      <div class="mt-6 grid gap-4">
  ${filteredRows.map(renderBillingHistoryCard).join("")}
</div>
</section>
`;

  document
    .querySelector("#billingHistoryFilter")
    ?.addEventListener("change", () => {
      renderBillingHistory();
    });
}

function renderBillingHistoryCard(item) {
  const name = item.user_profile?.full_name || "Unknown User";
  const email = item.user_profile?.email || item.user_id || "-";

  const isApproved = item.status === "approved";

  const statusClass = isApproved
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : "border-red-400/20 bg-red-400/10 text-red-300";

  const typeLabel =
    item.request_type === "plan_upgrade"
      ? "Plan Upgrade"
      : item.request_type === "topup"
        ? "Top Up"
        : item.request_type || "-";

  const processedAt = item.updated_at || item.created_at;

  return `
    <article class="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-300">
              ${typeLabel}
            </span>

            <span class="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClass}">
              ${item.status}
            </span>
          </div>

          <h3 class="mt-4 text-xl font-black">${name}</h3>
          <p class="mt-1 break-all text-sm text-slate-400">${email}</p>

          <div class="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-xs text-slate-500">Amount</p>
              <p class="mt-1 text-lg font-black text-white">${rupiah(item.amount_idr)}</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-xs text-slate-500">Plan / Top Up</p>
              <p class="mt-1 font-bold text-white">
                ${item.plan_code || item.topup_code || "-"}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 lg:w-80">
          <p>
            <span class="text-slate-500">Requested:</span><br />
            <b>${new Date(item.created_at).toLocaleString("id-ID")}</b>
          </p>

          <p class="mt-3">
            <span class="text-slate-500">Processed:</span><br />
            <b>${new Date(processedAt).toLocaleString("id-ID")}</b>
          </p>

          <p class="mt-3 break-all text-xs text-slate-500">
            Request ID:<br />
            ${item.id || "-"}
          </p>
        </div>
      </div>
    </article>
  `;
}

init().catch((error) => {
  console.error(error);
  toast(error.message, "error");
});
