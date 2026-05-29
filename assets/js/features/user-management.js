import { supabase, getUser } from "../supabase.js";
import { toast } from "../utils.js";

const ROLES = ["user", "wartawan", "notulen", "admin", "owner"];
const PLANS = ["free", "basic", "pro", "enterprise", "enterprise_internal"];
const STATUSES = ["active", "suspended"];

let state = {
  users: [],
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

async function logAdminAction(action, targetUserId, metadata = {}) {
  const admin = await getUser();

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin?.id || null,
    target_user_id: targetUserId || null,
    action,
    metadata,
  });
}

async function fetchUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,plan,status,quota_override_ai,quota_override_audio_minutes,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function optionList(items, active) {
  return items
    .map((item) => `<option value="${item}" ${item === active ? "selected" : ""}>${item}</option>`)
    .join("");
}

function filterUsers(users) {
  return users.filter((user) => {
    const q = state.search.toLowerCase();

    const matchesSearch =
      !q ||
      String(user.email || "").toLowerCase().includes(q) ||
      String(user.full_name || "").toLowerCase().includes(q) ||
      String(user.id || "").toLowerCase().includes(q);

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

  return `
    <tr class="border-b border-white/5 align-top">
      <td class="py-4 pr-4">
        <div class="font-black">${safeText(user.full_name || "User")}</div>
        <div class="mt-1 text-xs text-slate-400">${safeText(user.email || "-")}</div>
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
        <select data-user-field="status" data-user-id="${user.id}" class="user-admin-input w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400">
          ${optionList(STATUSES, status)}
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
          <button data-save-user="${user.id}" class="save-user-btn rounded-xl bg-cyan-400 px-4 py-2 font-black text-black hover:bg-cyan-300">Save</button>
          <button data-reset-quota="${user.id}" class="reset-quota-btn rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 font-bold text-yellow-200 hover:bg-yellow-400/20">Reset Quota</button>
          <button data-toggle-status="${user.id}" data-status="${status}" class="toggle-status-btn rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 font-bold text-red-300 hover:bg-red-400/20">${status === "suspended" ? "Activate" : "Suspend"}</button>
        </div>
      </td>
    </tr>
  `;
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

  target.querySelector("#userManagementCount").textContent = `${filtered.length} dari ${state.users.length} user`;
  bindActions(target);
}

function readPayload(userId) {
  const fields = document.querySelectorAll(`.user-admin-input[data-user-id="${userId}"]`);
  const payload = {};

  fields.forEach((field) => {
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

function bindFilters(target) {
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
}

function bindActions(target) {
  target.querySelectorAll(".save-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.saveUser;
      const payload = readPayload(userId);

      try {
        button.disabled = true;
        button.textContent = "Saving...";

        const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
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

        const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
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
      const currentStatus = button.dataset.status || "active";
      const nextStatus = currentStatus === "suspended" ? "active" : "suspended";

      try {
        button.disabled = true;
        button.textContent = "Updating...";

        const payload = { status: nextStatus, updated_at: new Date().toISOString() };

        const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
        if (error) throw error;

        await logAdminAction(nextStatus === "suspended" ? "Suspend user" : "Activate user", userId, payload);
        toast(`User berhasil ${nextStatus === "suspended" ? "disuspend" : "diaktifkan"}.`);

        state.users = await fetchUsers();
        renderUsersTable(target);
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
        button.textContent = currentStatus === "suspended" ? "Activate" : "Suspend";
      }
    });
  });
}

export async function renderUserManagementAdmin(targetSelector = "#userManagementAdmin") {
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
        <select id="planFilter" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400">
          <option value="">Semua plan</option>
          ${PLANS.map((plan) => `<option value="${plan}">${plan}</option>`).join("")}
        </select>
        <select id="roleFilter" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400">
          <option value="">Semua role</option>
          ${ROLES.map((role) => `<option value="${role}">${role}</option>`).join("")}
        </select>
        <select id="statusFilter" class="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-400">
          <option value="">Semua status</option>
          ${STATUSES.map((status) => `<option value="${status}">${status}</option>`).join("")}
        </select>
      </div>

      <div id="userManagementTable" class="mt-6">
        <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-slate-400">Loading users...</div>
      </div>
    </section>
  `;

  try {
    state.users = await fetchUsers();
    bindFilters(target);
    renderUsersTable(target);
  } catch (error) {
    target.innerHTML = `
      <div class="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
        ${error.message}
      </div>
    `;
  }
}
