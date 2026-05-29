import { supabase, getUser } from "../supabase.js";
import { toast, downloadText } from "../utils.js";

function rupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

async function getCurrentAdmin() {
  return await getUser();
}

async function logAdminAction(action, targetUserId = null, metadata = {}) {
  const admin = await getCurrentAdmin();

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin?.id || null,
    target_user_id: targetUserId,
    action,
    metadata,
  });
}

async function fetchBillingRows() {
  const { data, error } = await supabase
    .from("billing_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,plan,status,created_at,quota_override_ai,quota_override_audio_minutes")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return [];
  return data || [];
}

function groupRevenueMonthly(rows) {
  const grouped = {};

  rows
    .filter((row) => row.status === "approved")
    .forEach((row) => {
      const date = new Date(row.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = (grouped[key] || 0) + Number(row.amount_idr || 0);
    });

  return Object.entries(grouped).slice(-12);
}

function renderBarChart(entries) {
  if (!entries.length) {
    return `<p class="text-sm text-slate-400">Belum ada data chart.</p>`;
  }

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return `
    <div class="mt-5 flex h-64 items-end gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      ${entries
        .map(([label, value]) => {
          const height = Math.max(6, Math.round((value / max) * 100));

          return `
            <div class="flex h-full flex-1 flex-col justify-end gap-2">
              <div class="text-center text-xs text-slate-400">${rupiah(value)}</div>

              <div
                class="rounded-t-xl bg-cyan-400"
                style="height:${height}%"
                title="${label}: ${rupiah(value)}"
              ></div>

              <div class="truncate text-center text-xs text-slate-500">${label}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

export async function renderRevenueChart(targetSelector = "#revenueChart") {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  try {
    const rows = await fetchBillingRows();
    const monthly = groupRevenueMonthly(rows);

    target.innerHTML = `
      <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-2xl font-black">Revenue Chart</h2>
            <p class="mt-2 text-sm text-slate-400">Grafik revenue bulanan dari request approved.</p>
          </div>

          <button
            id="exportRevenueCsvBtn"
            class="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-bold hover:bg-white/10"
          >
            Export CSV
          </button>
        </div>

        ${renderBarChart(monthly)}
      </section>
    `;

    document.querySelector("#exportRevenueCsvBtn")?.addEventListener("click", () => {
      exportRevenueCSV(rows);
    });
  } catch (error) {
    target.innerHTML = `
      <div class="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
        ${error.message}
      </div>
    `;
  }
}

export async function renderUserManagement(targetSelector = "#userManagement") {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  try {
    const users = await fetchProfiles();

    target.innerHTML = `
      <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h2 class="text-2xl font-black">User Management</h2>
        <p class="mt-2 text-sm text-slate-400">Kelola plan, role, status, dan quota override user.</p>

        <div class="mt-6 overflow-x-auto">
          <table class="w-full min-w-[900px] text-left text-sm">
            <thead class="text-slate-400">
              <tr class="border-b border-white/10">
                <th class="py-3">User</th>
                <th class="py-3">Role</th>
                <th class="py-3">Plan</th>
                <th class="py-3">Status</th>
                <th class="py-3">AI Override</th>
                <th class="py-3">Audio Override</th>
                <th class="py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              ${users
                .map(
                  (user) => `
                    <tr class="border-b border-white/5">
                      <td class="py-4">
                        <div class="font-bold">${user.full_name || "User"}</div>
                        <div class="text-xs text-slate-400">${user.email || user.id}</div>
                      </td>

                      <td class="py-4">
                        <select data-user-id="${user.id}" data-field="role" class="admin-user-input rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                          ${["user", "wartawan", "notulen", "admin", "owner"]
                            .map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`)
                            .join("")}
                        </select>
                      </td>

                      <td class="py-4">
                        <select data-user-id="${user.id}" data-field="plan" class="admin-user-input rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                          ${["free", "basic", "pro", "enterprise", "enterprise_internal"]
                            .map((plan) => `<option value="${plan}" ${user.plan === plan ? "selected" : ""}>${plan}</option>`)
                            .join("")}
                        </select>
                      </td>

                      <td class="py-4">
                        <select data-user-id="${user.id}" data-field="status" class="admin-user-input rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                          ${["active", "suspended"]
                            .map((status) => `<option value="${status}" ${user.status === status ? "selected" : ""}>${status}</option>`)
                            .join("")}
                        </select>
                      </td>

                      <td class="py-4">
                        <input
                          data-user-id="${user.id}"
                          data-field="quota_override_ai"
                          class="admin-user-input w-28 rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
                          type="number"
                          placeholder="-"
                          value="${user.quota_override_ai ?? ""}"
                        />
                      </td>

                      <td class="py-4">
                        <input
                          data-user-id="${user.id}"
                          data-field="quota_override_audio_minutes"
                          class="admin-user-input w-28 rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
                          type="number"
                          placeholder="-"
                          value="${user.quota_override_audio_minutes ?? ""}"
                        />
                      </td>

                      <td class="py-4 text-right">
                        <button
                          data-save-user="${user.id}"
                          class="save-user-btn rounded-xl bg-cyan-400 px-4 py-2 font-black text-black hover:bg-cyan-300"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    bindUserManagementActions();
  } catch (error) {
    target.innerHTML = `
      <div class="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
        ${error.message}
      </div>
    `;
  }
}

function bindUserManagementActions() {
  document.querySelectorAll(".save-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.saveUser;
      const fields = document.querySelectorAll(`.admin-user-input[data-user-id="${userId}"]`);

      const payload = {};

      fields.forEach((field) => {
        const key = field.dataset.field;
        let value = field.value;

        if (key?.startsWith("quota_override")) {
          value = value === "" ? null : Number(value);
        }

        payload[key] = value;
      });

      try {
        button.disabled = true;
        button.textContent = "Saving...";

        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", userId);

        if (error) throw error;

        await logAdminAction("Update user management", userId, payload);

        toast("User berhasil diperbarui.");
        button.textContent = "Saved";
        setTimeout(() => {
          button.textContent = "Save";
          button.disabled = false;
        }, 900);
      } catch (error) {
        toast(error.message, "error");
        button.textContent = "Save";
        button.disabled = false;
      }
    });
  });
}

export async function renderAuditLogs(targetSelector = "#adminAuditLogs") {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  const logs = await fetchAuditLogs();

  target.innerHTML = `
    <section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 class="text-2xl font-black">Admin Audit Logs</h2>
      <p class="mt-2 text-sm text-slate-400">Catatan perubahan penting dari panel admin.</p>

      <div class="mt-6 grid gap-3">
        ${
          logs.length
            ? logs
                .map(
                  (log) => `
                    <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <b>${log.action}</b>
                        <span class="text-xs text-slate-400">${new Date(log.created_at).toLocaleString("id-ID")}</span>
                      </div>

                      <pre class="mt-3 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-slate-300">${JSON.stringify(log.metadata || {}, null, 2)}</pre>
                    </div>
                  `,
                )
                .join("")
            : `<div class="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-slate-400">Belum ada audit log.</div>`
        }
      </div>
    </section>
  `;
}

export async function renderAdminGrowthPack() {
  await renderRevenueChart("#revenueChart");
  await renderUserManagement("#userManagement");
  await renderAuditLogs("#adminAuditLogs");
}

export async function exportRevenueCSV(rows = null) {
  const billingRows = rows || (await fetchBillingRows());

  const csv = [
    ["created_at", "request_type", "status", "plan_code", "topup_code", "amount_idr"],
    ...billingRows.map((row) => [
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

  downloadText(`fieldpress-revenue-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
