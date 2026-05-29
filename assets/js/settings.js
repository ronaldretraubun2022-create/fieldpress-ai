import { supabase, requireAuth, getProfile, getUser } from "./supabase.js";
import { toast, setLoading } from "./utils.js";

let session = null;
let profile = null;
let user = null;

const settingsForm = document.querySelector("#settingsForm");
const fullNameInput = document.querySelector("#fullName");
const emailInput = document.querySelector("#email");
const roleInput = document.querySelector("#role");
const planInput = document.querySelector("#plan");
const statusBox = document.querySelector("#profileStatus");
const logoutBtn = document.querySelector("#logoutBtn");

function showStatus(message, type = "info") {
  if (!statusBox) return;

  const colorClass =
    type === "error"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";

  statusBox.className = `mt-5 rounded-2xl border p-4 text-sm ${colorClass}`;
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
}

function ensureRoleOption(role) {
  if (!roleInput || !role || !roleInput.options) return;

  const exists = [...roleInput.options].some((option) => option.value === role);

  if (!exists) {
    const option = document.createElement("option");
    option.value = role;
    option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    roleInput.appendChild(option);
  }
}

async function ensureProfile() {
  const existing = await getProfile();
  if (existing) return existing;

  const currentUser = await getUser();

  if (!currentUser) {
    throw new Error("User belum login.");
  }

  const payload = {
    id: currentUser.id,
    email: currentUser.email,
    full_name:
      currentUser.user_metadata?.full_name || currentUser.email || "User",
    role: "user",
    plan: "free",
    status: "active",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

function fillForm() {
  if (!profile || !user) return;

  fullNameInput.value =
    profile.full_name || user.user_metadata?.full_name || "";

  emailInput.value = profile.email || user.email || "";

  if (roleInput) {
    ensureRoleOption(profile.role);
    roleInput.value = profile.role || "user";
    roleInput.disabled = profile.role === "owner" || profile.role === "admin";
  }

  if (planInput) {
    planInput.value = profile.plan || "free";
    planInput.disabled = true;
  }
}

async function saveProfile(event) {
  event.preventDefault();

  const btn = document.querySelector("#saveProfileBtn");

  try {
    setLoading(btn, true, "Menyimpan...");

    const fullName = fullNameInput.value.trim();

    if (!fullName) {
      throw new Error("Nama lengkap wajib diisi.");
    }

    const payload = {
      full_name: fullName,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id)
      .select("*")
      .single();

    if (error) throw error;

    profile = data;

    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
      },
    });

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "Update profile settings",
      metadata: {
        role: profile.role,
        plan: profile.plan,
      },
    });

    fillForm();
    showStatus("Profile berhasil disimpan.");
    toast("Profile berhasil disimpan.");
  } catch (error) {
    console.error(error);
    showStatus(error.message, "error");
    toast(error.message, "error");
  } finally {
    setLoading(btn, false);
  }
}

async function init() {
  session = await requireAuth();
  if (!session) return;

  user = await getUser();
  profile = await ensureProfile();

  fillForm();

  settingsForm?.addEventListener("submit", saveProfile);

  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "login.html";
  });
}

init().catch((error) => {
  console.error(error);
  showStatus(error.message, "error");
  toast(error.message, "error");
});
