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
    full_name: currentUser.user_metadata?.full_name || currentUser.email || "User",
    role: "user",
    plan: "free",
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

  fullNameInput.value = profile.full_name || user.user_metadata?.full_name || "";
  emailInput.value = profile.email || user.email || "";
  roleInput.value = ["user", "wartawan", "notulen"].includes(profile.role)
    ? profile.role
    : "user";
  planInput.value = profile.plan || "free";
}

async function saveProfile(event) {
  event.preventDefault();

  const btn = document.querySelector("#saveProfileBtn");

  try {
    setLoading(btn, true, "Menyimpan...");

    const fullName = fullNameInput.value.trim();
    const role = roleInput.value;

    if (!fullName) {
      throw new Error("Nama lengkap wajib diisi.");
    }

    const payload = {
      full_name: fullName,
      role,
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
        role,
      },
    });

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
