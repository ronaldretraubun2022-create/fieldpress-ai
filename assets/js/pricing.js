import { supabase, getUser } from "./supabase.js";
import {
  PRICING_PLANS,
  TOPUP_PACKAGES,
  whatsappLink,
} from "./features/pricing-config.js";
import { toast } from "./utils.js";

function planCard(plan) {
  const isFree = plan.code === "free";

  return `
    <article class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
      <h3 class="text-2xl font-black">${plan.name}</h3>

      <p class="mt-2 min-h-[48px] text-slate-400">
        ${plan.description}
      </p>

      <p class="mt-6 text-4xl font-black text-cyan-300">
        ${plan.price}
      </p>

      <ul class="mt-6 space-y-3 text-sm text-slate-300">
        ${plan.features.map((feature) => `<li>✓ ${feature}</li>`).join("")}
      </ul>

      ${
        isFree
          ? `
            <a
              href="register.html"
              class="mt-8 block w-full rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 text-center font-black text-white hover:bg-white/10"
            >
              Mulai Gratis
            </a>
          `
          : `
            <button
              data-plan="${plan.code}"
              class="buy-plan-btn mt-8 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 font-black text-black hover:opacity-90"
            >
              Upgrade via WhatsApp
            </button>
          `
      }
    </article>
  `;
}

function topupCard(pkg) {
  return `
    <article class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
      <h3 class="text-xl font-black">${pkg.name}</h3>

      <p class="mt-3 text-3xl font-black text-cyan-300">
        ${pkg.price}
      </p>

      <p class="mt-3 text-sm text-slate-400">
        ${pkg.extraGenerates ? `${pkg.extraGenerates} generate tambahan` : ""}
        ${pkg.extraAudioMinutes ? `${pkg.extraAudioMinutes / 60} jam audio tambahan` : ""}
      </p>

      <button
        data-topup="${pkg.code}"
        class="buy-topup-btn mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10"
      >
        Pesan Top Up
      </button>
    </article>
  `;
}

async function createBillingRequest(type, payload, message) {
  const user = await getUser();

  if (!user) {
    toast("Login dulu untuk membuat request billing.", "error");
    location.href = "login.html";
    return;
  }

  const { error } = await supabase.from("billing_requests").insert({
    user_id: user.id,
    request_type: type,
    plan_code: payload.planCode || null,
    topup_code: payload.topupCode || null,
    amount_idr: payload.amountIdr || 0,
    whatsapp_message: message,
    status: "pending",
  });

  if (error) {
    toast(error.message, "error");
    return;
  }

  window.open(whatsappLink(message), "_blank");
}

function bindButtons() {
  document.querySelectorAll(".buy-plan-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const planCode = button.dataset.plan;
      const plan = PRICING_PLANS.find((item) => item.code === planCode);

      if (!plan || plan.code === "free") return;

      const message = `Saya tertarik dengan FieldPress AI paket ${plan.name} (${plan.price}). Mohon info cara pembayaran dan aktivasi.`;

      await createBillingRequest(
        "plan_upgrade",
        {
          planCode: plan.code,
          amountIdr: plan.priceIdr || 0,
        },
        message
      );
    });
  });

  document.querySelectorAll(".buy-topup-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const topupCode = button.dataset.topup;
      const pkg = TOPUP_PACKAGES.find((item) => item.code === topupCode);

      if (!pkg) return;

      const message = `Saya ingin membeli top up FieldPress AI: ${pkg.name} (${pkg.price}).`;

      await createBillingRequest(
        "topup",
        {
          topupCode: pkg.code,
          amountIdr: pkg.priceIdr,
        },
        message
      );
    });
  });
}

function renderPricing() {
  const planTarget = document.querySelector("#pricingPlans");
  const topupTarget = document.querySelector("#topupPlans");

  if (planTarget) {
    planTarget.innerHTML = PRICING_PLANS.map(planCard).join("");
  }

  if (topupTarget) {
    topupTarget.innerHTML = TOPUP_PACKAGES.map(topupCard).join("");
  }

  bindButtons();
}

renderPricing();
