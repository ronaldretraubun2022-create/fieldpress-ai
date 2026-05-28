import { supabase, getUser } from "../supabase.js";
import { whatsappLink, PRICING_PLANS } from "./pricing-config.js";
import { toast } from "../utils.js";

/**
 * upgrade-auto.js
 * Fungsi:
 * - User memilih paket upgrade
 * - Sistem simpan billing request ke Supabase
 * - WhatsApp otomatis terbuka ke nomor owner
 * - Owner cek transfer manual
 * - Owner bisa update plan user dari Supabase/Admin Panel
 */

export async function requestPlanUpgrade(planCode) {
  const user = await getUser();

  const plan = PRICING_PLANS.find((item) => item.code === planCode);

  if (!plan) {
    throw new Error("Paket tidak ditemukan.");
  }

  const message = [
    "Halo, saya ingin upgrade FieldPress AI.",
    "",
    `Paket: ${plan.name}`,
    `Harga: ${plan.price}`,
    "",
    user?.email ? `Email akun: ${user.email}` : "",
    "",
    "Mohon info cara pembayaran dan aktivasi.",
  ]
    .filter(Boolean)
    .join("\n");

  if (user) {
    const { error } = await supabase.from("billing_requests").insert({
      user_id: user.id,
      request_type: "plan_upgrade",
      plan_code: plan.code,
      amount_idr: parsePrice(plan.price),
      whatsapp_message: message,
      status: "pending",
    });

    if (error) throw error;
  }

  window.open(whatsappLink(message), "_blank");
  toast("Permintaan upgrade dikirim ke WhatsApp.");
}

export async function activateUserPlanByEmail(email, planCode) {
  if (!email || !planCode) {
    throw new Error("Email dan plan wajib diisi.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      plan: planCode,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("activity_logs").insert({
    user_id: data.id,
    action: "Plan upgraded",
    metadata: {
      plan: planCode,
      email,
    },
  });

  toast(`Plan ${email} berhasil diubah ke ${planCode}.`);
  return data;
}

function parsePrice(priceText = "") {
  const clean = String(priceText).toLowerCase();

  if (clean.includes("99")) return 99000;
  if (clean.includes("299")) return 299000;

  return 0;
}

/**
 * Cara pakai di pricing page:
 *
 * import { requestPlanUpgrade } from "./features/upgrade-auto.js";
 *
 * document.querySelectorAll("[data-plan]").forEach((btn) => {
 *   btn.addEventListener("click", () => {
 *     requestPlanUpgrade(btn.dataset.plan);
 *   });
 * });
 */
