import { supabase, requireAuth, getProfile } from "./supabase.js";
import { approveTopUpByEmail } from "./features/topup-auto.js";
import { activateUserPlanByEmail } from "./features/upgrade-auto.js";
import { toast } from "./utils.js";

let profile = null;

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
  document.querySelector("#refreshBtn")?.addEventListener("click", renderBillingRequests);

  await renderBillingRequests();
  await renderRevenueSummary();
}

async function logout() {
  await supabase.auth.signOut();
  location.href = "login.html";
}

async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,plan,role")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function renderBillingRequests() {
  const target = document.querySelector("#billingRequests");
  if (!target) return;

  target.innerHTML = `
    <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
      Loading billing requests...
    </div>
  `;

  const { data, error } = await supabase
    .from("billing_requests")
    .select("*")
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
        Belum ada request.
      </div>
    `;
    return;
  }

  const enriched = await Promise.all(
    data.map(async (item) => ({
      ...item,
      user_profile: await getProfileByUserId(item.user_id),
    }))
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
            <div><span class="font-bold text-white">Amount:</span> Rp${Number(item.amount_idr || 0).toLocaleString("id-ID")}</div>
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
            data-plan="${item.plan_code || ""}"
            data-topup="${item.topup_code || ""}"
            class="approve-btn rounded-2xl bg-cyan-400 px-6 py-4 font-black text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            ${item.status === "approved" ? "disabled" : ""}
          >
            ${item.status === "approved" ? "Approved" : "Approve"}
          </button>

          <button
            data-wa="${encodeURIComponent(item.whatsapp_message || "")}"
            class="wa-btn rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold hover:bg-white/10"
          >
            Open WhatsApp
          </button>

          <button
            data-id="${item.id}"
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
      window.open(`https://wa.me/6282121167987?text=${encodeURIComponent(message)}`, "_blank");
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
        const plan = btn.dataset.plan;
        const topup = btn.dataset.topup;

        if (!email) throw new Error("Email user tidak ditemukan di profiles.");

        if (type === "plan_upgrade") {
          await activateUserPlanByEmail(email, plan);
        } else if (type === "topup") {
          await approveTopUpByEmail(email, topup);
        } else {
          throw new Error(`Request type tidak dikenal: ${type}`);
        }

        const { error } = await supabase
          .from("billing_requests")
          .update({ status: "approved" })
          .eq("id", requestId);

        if (error) throw error;

        toast("Request berhasil diapprove.");
        await renderBillingRequests();
        await renderRevenueSummary();
      } catch (error) {
        console.error(error);
        toast(error.message, "error");
        btn.disabled = false;
        btn.textContent = "Approve";
      }
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const requestId = btn.dataset.id;

        const { error } = await supabase
          .from("billing_requests")
          .update({ status: "rejected" })
          .eq("id", requestId);

        if (error) throw error;

        toast("Request berhasil direject.");
        await renderBillingRequests();
      } catch (error) {
        console.error(error);
        toast(error.message, "error");
      }
    });
  });
}

async function renderRevenueSummary() {
  const target = document.querySelector("#revenueSummary");
  if (!target) return;

  const { data, error } = await supabase
    .from("billing_requests")
    .select("amount_idr,status,request_type,created_at");

  if (error) {
    target.innerHTML = `<div class="text-red-300">${error.message}</div>`;
    return;
  }

  const approved = (data || []).filter((item) => item.status === "approved");
  const pending = (data || []).filter((item) => item.status === "pending");

  const totalRevenue = approved.reduce((sum, item) => sum + Number(item.amount_idr || 0), 0);
  const pendingValue = pending.reduce((sum, item) => sum + Number(item.amount_idr || 0), 0);
  const topupCount = approved.filter((item) => item.request_type === "topup").length;
  const upgradeCount = approved.filter((item) => item.request_type === "plan_upgrade").length;

  target.innerHTML = `
    <div class="grid gap-4 md:grid-cols-4">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p class="text-sm text-slate-400">Approved Revenue</p>
        <p class="mt-2 text-2xl font-black text-cyan-300">Rp${totalRevenue.toLocaleString("id-ID")}</p>
      </div>

      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p class="text-sm text-slate-400">Pending Value</p>
        <p class="mt-2 text-2xl font-black text-yellow-300">Rp${pendingValue.toLocaleString("id-ID")}</p>
      </div>

      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p class="text-sm text-slate-400">Approved Upgrade</p>
        <p class="mt-2 text-2xl font-black">${upgradeCount}</p>
      </div>

      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p class="text-sm text-slate-400">Approved Top Up</p>
        <p class="mt-2 text-2xl font-black">${topupCount}</p>
      </div>
    </div>
  `;
}

init().catch((error) => {
  console.error(error);
  toast(error.message, "error");
});
