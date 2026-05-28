import { supabase } from "./supabase.js";
import { $, toast, setLoading } from "./utils.js";

const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const logoutBtn = $("#logoutBtn");
const forgotPasswordBtn = $("#forgotPasswordBtn");

async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login.html`,
  });

  if (error) throw error;

  toast("Link reset password telah dikirim ke email Anda.");
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = loginForm.querySelector("button");

  try {
    setLoading(btn, true, "Login...");

    const email = $("#email").value.trim();
    const password = $("#password").value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    location.href = "dashboard.html";
  } catch (err) {
    toast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = registerForm.querySelector("button");

  try {
    setLoading(btn, true, "Membuat akun...");

    const full_name = $("#full_name").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name,
        role: "user",
        plan: "free",
      });
    }

    toast("Akun berhasil dibuat. Silakan login.");

    setTimeout(() => {
      location.href = "login.html";
    }, 800);
  } catch (err) {
    toast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
});

forgotPasswordBtn?.addEventListener("click", async () => {
  try {
    const email = $("#email")?.value?.trim();

    if (!email) {
      toast("Masukkan email terlebih dahulu.", "error");
      return;
    }

    await sendPasswordReset(email);
  } catch (err) {
    toast(err.message, "error");
  }
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "login.html";
});
