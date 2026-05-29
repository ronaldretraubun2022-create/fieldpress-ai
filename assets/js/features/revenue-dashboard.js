import { supabase } from "../supabase.js";

function rupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function monthStartISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function todayISOStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
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
    .select("id,email,plan,role,created_at");

  if (error) return [];
  return data || [];
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
    return `<p class="text-sm text-slate-400">Belum ada revenue.</p>`;
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

export async function renderRevenueDashboard(targetSelector = "#revenueAnalytics") {
  const target = document.querySelector(targetSelector);

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
    const todayStart = todayISOStart();

    const approvedThisMonth = approved.filter((row) => row.created_at >= monthStart);
    const approvedToday = approved.filter((row) => row.created_at >= todayStart);

    const totalRevenue = approved.reduce((sum, row) => sum + Number(row.amount_idr || 0), 0);
    const monthlyRevenue = approvedThisMonth.reduce((sum, row) => sum + Number(row.amount_idr || 0), 0);
    const todayRevenue = approvedToday.reduce((sum, row) => sum + Number(row.amount_idr || 0), 0);
    const pendingValue = pending.reduce((sum, row) => sum + Number(row.amount_idr || 0), 0);

    const upgradeApproved = approved.filter((row) => row.request_type === "plan_upgrade");
    const topupApproved = approved.filter((row) => row.request_type === "topup");

    const planCounts = profiles.reduce((acc, profile) => {
      const plan = profile.plan || "free";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    const paidUsers = profiles.filter((profile) =>
      ["basic", "pro", "enterprise"].includes(profile.plan),
    );

    const totalUsers = profiles.length;
    const conversionRate = totalUsers ? Math.round((paidUsers.length / totalUsers) * 100) : 0;
    const arpu = totalUsers ? Math.round(totalRevenue / totalUsers) : 0;
    const paidArpu = paidUsers.length ? Math.round(totalRevenue / paidUsers.length) : 0;

    const topupStats = topupApproved.reduce((acc, row) => {
      const code = row.topup_code || "unknown";
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    const bestTopup =
      Object.entries(topupStats).sort((a, b) => b[1] - a[1])[0]?.[0] || "Belum ada";

    const groupedRevenue = groupRevenueByDay(approved);

    target.innerHTML = `
      <section class="space-y-6">
        <div>
          <h2 class="text-2xl font-black">Revenue Dashboard</h2>
          <p class="mt-2 text-sm text-slate-400">
            Ringkasan pendapatan, billing request, conversion, dan plan user.
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
