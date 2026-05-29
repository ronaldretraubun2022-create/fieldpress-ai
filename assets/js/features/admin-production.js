import { supabase, getUser } from "../supabase.js";
import { toast, downloadText } from "../utils.js";

const ROLES = ["user", "wartawan", "notulen", "admin", "owner"];
const PLANS = ["free", "basic", "pro", "enterprise", "enterprise_internal"];
const STATUSES = ["active", "suspended"];

let state = {
  users: [],
  billingRows: [],
  auditLogs: [],
  search: "",
  plan: "",
  role: "",
  status: "",
};

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

async function logAdminAction(action, targetUserId = null, metadata = {}) {
  const admin = await getUser();

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin?.id || null,
    target_user_id: targetUserId,
    action,
    metadata,
  });
}

async function fetchUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,role,plan,status,quota_override_ai,quota_override_audio_minutes,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchBillingRows() {
  const { data, error } = await supabase
    .from("billing_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return [];
  return data || [];
}

function optionList(items, active) {
  return items
    .map(
      (item) =>
        `<option value="${item}" ${item === active ? "selected" : ""}>${item}</option>`,
    )
    .join("");
}

function filterUsers(users) {
  return users.filter((user) => {
    const q = state.search.toLowerCase();

    const matchesSearch =
      !q ||
      String(user.email || "")
        .toLowerCase()
        .includes(q) ||
      String(user.full_name || "")
        .toLowerCase()
        .includes(q) ||
      String(user.id || "")
        .toLowerCase()
        .includes(q);

    return (
      matchesSearch &&
      (!state.plan || user.plan === state.plan) &&
      (!state.role || user.role === state.role) &&
      (!state.status || (user.status || "active") === state.status)
    );
  });
}

function userRow(user) {
  const status = user.status || "active";
  const isOwner = user.role === "owner";

  return `
    <tr class="border-b border-white/5 align-top">
      <td class="py-4 pr-4">
        <div class="font-black">${safeText(user.full_name || "User")}</div>
        <div class="mt-1 text-xs text-slate-400">${safeText(user.email || "-")}</div>
        ${isOwner ? `<div class="mt-2 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">Protected Owner</div>` : ""}
      </td>

      <td class="py-4 pr-4">
        <select data-user-field="role" data-user-id="${user.id}" class="user-admin-input w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400">
          ${optionList(ROLES, user.role || "user")}
        </select>
      </td>

      <td class="py-4 pr-4">
        <select data-user-field="plan" data-user-id="${user.id}" class="user-admin-input w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400">
          ${optionList(PLANS, user.plan || "free")}
        </select>
      </td>

      <td class="py-4 pr-4">
        <select data-user-field="status" data-user-id="${user.id}" class="user-admin-input w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400" ${isOwner ? "disabled" : ""}>
          ${optionList(STATUSES, isOwner ? "active" : status)}
        </select>
      </td>

      <td class="py-4 pr-4">
        <input data-user-field="quota_override_ai" data-user-id="${user.id}" class="user-admin-input w-28 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400" type="number" min="0" placeholder="-" value="${user.quota_override_ai ?? ""}" />
      </td>

      <td class="py-4 pr-4">
        <input data-user-field="quota_override_audio_minutes" data-user-id="${user.id}" class="user-admin-input w-28 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400" type="number" min="0" placeholder="-" value="${user.quota_override_audio_minutes ?? ""}" />
      </td>

      <td class="py-4 text-right">
        <div class="grid gap-2">
          <button data-save-user="${user.id}" data-role="${user.role || "user"}" class="save-user-btn rounded-xl bg-cyan-400 px-4 py-2 font-black text-black hover:bg-cyan-300">Save</button>
          <button data-reset-quota="${user.id}" class="reset-quota-btn rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 font-bold text-yellow-200 hover:bg-yellow-400/20">Reset Quota</button>
          <button data-toggle-status="${user.id}" data-role="${user.role || "user"}" data-status="${status}" class="toggle-status-btn rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 font-bold text-red-300 hover:bg-red-400/20" ${isOwner ? "disabled" : ""}>
            ${isOwner ? "Owner Protected" : status === "suspended" ? "Activate" : "Suspend"}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function readPayload(userId) {
  const fields = document.querySelectorAll(
    `.user-admin-input[data-user-id="${userId}"]`,
  );
  const payload = {};

  fields.forEach((field) => {
    if (field.disabled) return;

    const key = field.dataset.userField;
    let value = field.value;

    if (key?.startsWith("quota_override")) {
      value = value === "" ? null : Number(value);
    }

    payload[key] = value;
  });

  payload.updated_at = new Date().toISOString();
  return payload;
}

function renderUsersTable(target) {
  const filtered = filterUsers(state.users);

  target.querySelector("#userManagementTable").innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[1080px] text-left text-sm">
        <thead class="text-slate-400">
          <tr class="border-b border-white/10">
            <th class="py-3 pr-4">User</th>
            <th class="py-3 pr-4">Role</th>
            <th class="py-3 pr-4">Plan</th>
            <th class="py-3 pr-4">Status</th>
            <th class="py-3 pr-4">AI Override</th>
            <th class="py-3 pr-4">Audio Override</th>
            <th class="py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtered.length
              ? filtered.map(userRow).join("")
              : `<tr><td colspan="7" class="py-8 text-center text-slate-400">User tidak ditemukan.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  target.querySelector("#userManagementCount").textContent =
    `${filtered.length} dari ${state.users.length} user`;
  bindUserActions(target);
}

function bindUserActions(target) {
  target.querySelectorAll(".save-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.saveUser;
      const originalRole = button.dataset.role;
      const payload = readPayload(userId);

      try {
        button.disabled = true;
        button.textContent = "Saving...";

        if (originalRole === "owner") {
          payload.status = "active";
          payload.role = "owner";
        }

        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", userId);
        if (error) throw error;

        await logAdminAction("Update user", userId, payload);
        toast("User berhasil diperbarui.");

        state.users = await fetchUsers();
        renderUsersTable(target);
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
        button.textContent = "Save";
      }
    });
  });

  target.querySelectorAll(".reset-quota-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.resetQuota;

      try {
        button.disabled = true;
        button.textContent = "Resetting...";

        const payload = {
          quota_override_ai: null,
          quota_override_audio_minutes: null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", userId);
        if (error) throw error;

        await logAdminAction("Reset quota override", userId, payload);
        toast("Quota override berhasil direset.");

        state.users = await fetchUsers();
        renderUsersTable(target);
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
        button.textContent = "Reset Quota";
      }
    });
  });

  target.querySelectorAll(".toggle-status-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.toggleStatus;
      const role = button.dataset.role;
      const currentStatus = button.dataset.status || "active";

      try {
        if (role === "owner") {
          throw new Error("Owner tidak boleh disuspend.");
        }

        button.disabled = true;
        button.textContent = "Updating...";

        const nextStatus =
          currentStatus === "suspended" ? "active" : "suspended";
        const payload = {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", userId);
        if (error) throw error;

        await logAdminAction(
          nextStatus === "suspended" ? "Suspend user" : "Activate user",
          userId,
          payload,
        );
        toast(
          `User berhasil ${nextStatus === "suspended" ? "disuspend" : "diaktifkan"}.`,
        );

        state.users = await fetchUsers();
        renderUsersTable(target);
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
        button.textContent =
          currentStatus === "suspended" ? "Activate" : "Suspend";
      }
    });
  });
}

export async function renderUserManagementAdmin(
  targetSelector = "#userManagementAdmin",
) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  target.innerHTML = `
    <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 class="text-2xl font-black">User Management Admin</h2>
          <p class="mt-2 text-sm text-slate-400">Cari user, ubah plan, ubah role, suspend user, dan reset quota.</p>
        </div>
        <div id="userManagementCount" class="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">Loading...</div>
      </div>

      <div class="mt-6 grid gap-3 md:grid-cols-4">
        <input id="userSearch" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-cyan-400" placeholder="Cari nama, email, user ID..." />
        <select id="planFilter" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400"><option value="">Semua plan</option>${PLANS.map((p) => `<option value="${p}">${p}</option>`).join("")}</select>
        <select id="roleFilter" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400"><option value="">Semua role</option>${ROLES.map((r) => `<option value="${r}">${r}</option>`).join("")}</select>
        <select id="statusFilter" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400"><option value="">Semua status</option>${STATUSES.map((s) => `<option value="${s}">${s}</option>`).join("")}</select>
      </div>

      <div id="userManagementTable" class="mt-6">
        <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-slate-400">Loading users...</div>
      </div>
    </section>
  `;

  try {
    state.users = await fetchUsers();

    target.querySelector("#userSearch")?.addEventListener("input", (e) => {
      state.search = e.target.value;
      renderUsersTable(target);
    });

    target.querySelector("#planFilter")?.addEventListener("change", (e) => {
      state.plan = e.target.value;
      renderUsersTable(target);
    });

    target.querySelector("#roleFilter")?.addEventListener("change", (e) => {
      state.role = e.target.value;
      renderUsersTable(target);
    });

    target.querySelector("#statusFilter")?.addEventListener("change", (e) => {
      state.status = e.target.value;
      renderUsersTable(target);
    });

    renderUsersTable(target);
  } catch (error) {
    target.innerHTML = `<div class="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">${error.message}</div>`;
  }
}

function groupMonthlyRevenue(rows) {
  const grouped = {};

  rows
    .filter((row) => row.status === "approved")
    .forEach((row) => {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = (grouped[key] || 0) + Number(row.amount_idr || 0);
    });

  return Object.entries(grouped).slice(-12);
}

function renderChartBars(entries) {
  if (!entries.length)
    return `<p class="mt-4 text-sm text-slate-400">Belum ada data revenue.</p>`;

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return `
    <div class="mt-5 flex h-64 items-end gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      ${entries
        .map(([label, value]) => {
          const height = Math.max(6, Math.round((value / max) * 100));
          return `<div class="flex h-full flex-1 flex-col justify-end gap-2"><div class="text-center text-xs text-slate-400">${rupiah(value)}</div><div class="rounded-t-xl bg-cyan-400" style="height:${height}%"></div><div class="truncate text-center text-xs text-slate-500">${label}</div></div>`;
        })
        .join("")}
    </div>
  `;
}

export async function renderRevenueChart(targetSelector = "#revenueChart") {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  try {
    state.billingRows = await fetchBillingRows();
    const monthly = groupMonthlyRevenue(state.billingRows);

    target.innerHTML = `
      <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h2 class="text-2xl font-black">Revenue Chart</h2><p class="mt-2 text-sm text-slate-400">Grafik revenue bulanan dari transaksi approved.</p></div>
          <div class="flex flex-wrap gap-3"><button id="exportRevenueCsvBtn" class="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-bold hover:bg-white/10">Export CSV</button><button id="exportRevenuePdfBtn" class="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-black hover:bg-cyan-300">Export PDF</button></div>
        </div>
        ${renderChartBars(monthly)}
      </section>
    `;

    document
      .querySelector("#exportRevenueCsvBtn")
      ?.addEventListener("click", () => exportRevenueCSV());
    document
      .querySelector("#exportRevenuePdfBtn")
      ?.addEventListener("click", () => exportRevenuePDF());
  } catch (error) {
    target.innerHTML = `<div class="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">${error.message}</div>`;
  }
}

export async function renderAuditLogs(targetSelector = "#adminAuditLogs") {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  state.auditLogs = await fetchAuditLogs();

  target.innerHTML = `
    <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 class="text-2xl font-black">Admin Audit Logs</h2>
      <p class="mt-2 text-sm text-slate-400">Riwayat aksi admin seperti update user, suspend, reset quota, dan approval.</p>
      <div class="mt-6 grid gap-3">
        ${
          state.auditLogs.length
            ? state.auditLogs
                .map(
                  (log) =>
                    `<div class="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><b>${safeText(log.action)}</b><span class="text-xs text-slate-400">${new Date(log.created_at).toLocaleString("id-ID")}</span></div><pre class="mt-3 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-slate-300">${safeText(JSON.stringify(log.metadata || {}, null, 2))}</pre></div>`,
                )
                .join("")
            : `<div class="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-slate-400">Belum ada audit log.</div>`
        }
      </div>
    </section>
  `;
}

export async function exportRevenueCSV() {
  const rows = state.billingRows.length
    ? state.billingRows
    : await fetchBillingRows();

  const csv = [
    [
      "created_at",
      "request_type",
      "status",
      "plan_code",
      "topup_code",
      "amount_idr",
    ],
    ...rows.map((row) => [
      row.created_at,
      row.request_type,
      row.status,
      row.plan_code || "",
      row.topup_code || "",
      row.amount_idr || 0,
    ]),
  ]
    .map((line) => line.map(csvEscape).join(","))
    .join("\n");

  downloadText(
    `fieldpress-revenue-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
  );
}

export async function exportRevenuePDF() {
  const rows = state.billingRows.length
    ? state.billingRows
    : await fetchBillingRows();
  const approved = rows.filter((row) => row.status === "approved");
  const total = approved.reduce(
    (sum, row) => sum + Number(row.amount_idr || 0),
    0,
  );

  const html = `
    <html>
      <head>
        <title>FieldPress AI Revenue Report</title>
        <style>
          body{font-family:Arial,sans-serif;padding:32px;color:#111827}
          table{width:100%;border-collapse:collapse;margin-top:24px}
          th,td{border:1px solid #e5e7eb;padding:8px;font-size:12px;text-align:left}
          th{background:#f3f4f6}
          .total{margin-top:16px;font-size:18px;font-weight:700}
        </style>
      </head>
      <body>
        <h1>FieldPress AI Revenue Report</h1>
        <p>Generated: ${new Date().toLocaleString("id-ID")}</p>
        <p class="total">Total Approved Revenue: ${rupiah(total)}</p>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Plan</th><th>Top Up</th><th>Amount</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${new Date(row.created_at).toLocaleString("id-ID")}</td><td>${row.request_type || ""}</td><td>${row.status || ""}</td><td>${row.plan_code || ""}</td><td>${row.topup_code || ""}</td><td>${rupiah(row.amount_idr)}</td></tr>`).join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export async function renderAdminProductionPack() {
  await renderUserManagementAdmin("#userManagementAdmin");
  await renderRevenueChart("#revenueChart");
  await renderAuditLogs("#adminAuditLogs");
}
