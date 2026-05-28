import { supabase, getUser } from "../supabase.js";
import { whatsappLink, TOPUP_PACKAGES } from "./pricing-config.js";
import { toast } from "../utils.js";

/**
 * topup-auto.js
 * Fungsi:
 * - User klik paket top up
 * - Sistem simpan billing request ke Supabase
 * - WhatsApp otomatis terbuka ke owner
 * - Setelah transfer dicek, owner bisa approve top up
 * - Top up masuk ke token_topups dengan status paid
 */

export async function requestTopUp(topupCode) {
  const user = await getUser();

  const pkg = TOPUP_PACKAGES.find((item) => item.code === topupCode);

  if (!pkg) {
    throw new Error("Paket top up tidak ditemukan.");
  }

  const message = [
    "Halo, saya ingin membeli top up FieldPress AI.",
    "",
    `Paket: ${pkg.name}`,
    `Harga: ${pkg.price}`,
    pkg.extraGenerates ? `Tambahan generate: ${pkg.extraGenerates}` : "",
    pkg.extraAudioMinutes ? `Tambahan audio: ${pkg.extraAudioMinutes} menit` : "",
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
      request_type: "topup",
      topup_code: pkg.code,
      amount_idr: pkg.priceIdr,
      whatsapp_message: message,
      status: "pending",
    });

    if (error) throw error;
  }

  window.open(whatsappLink(message), "_blank");
  toast("Permintaan top up dikirim ke WhatsApp.");
}

export async function approveTopUpByEmail(email, topupCode) {
  if (!email || !topupCode) {
    throw new Error("Email dan topupCode wajib diisi.");
  }

  const pkg = TOPUP_PACKAGES.find((item) => item.code === topupCode);

  if (!pkg) {
    throw new Error("Paket top up tidak ditemukan.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .single();

  if (profileError) throw profileError;

  const { data, error } = await supabase
    .from("token_topups")
    .insert({
      user_id: profile.id,
      package_code: pkg.code,
      extra_generates: pkg.extraGenerates,
      extra_audio_minutes: pkg.extraAudioMinutes,
      price_idr: pkg.priceIdr,
      payment_status: "paid",
      note: "Approved manual by owner via WhatsApp transfer.",
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("activity_logs").insert({
    user_id: profile.id,
    action: "Top up approved",
    metadata: {
      topup_code: pkg.code,
      extra_generates: pkg.extraGenerates,
      extra_audio_minutes: pkg.extraAudioMinutes,
      price_idr: pkg.priceIdr,
    },
  });

  toast(`Top up ${pkg.name} berhasil ditambahkan ke ${email}.`);
  return data;
}

/**
 * Cara pakai di pricing page:
 *
 * import { requestTopUp } from "./features/topup-auto.js";
 *
 * document.querySelectorAll("[data-topup]").forEach((btn) => {
 *   btn.addEventListener("click", () => {
 *     requestTopUp(btn.dataset.topup);
 *   });
 * });
 */
