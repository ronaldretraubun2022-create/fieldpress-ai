export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const API_BASE =
  window.FIELD_API_BASE ||
  (location.hostname === "localhost" ? "http://localhost:8787/api" : "/api");

export function escapeHtml(v = "") {
  return String(v).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}

export function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="font-bold ${type === "error" ? "text-red-300" : "text-cyan-300"}">
      ${type === "error" ? "Error" : "FieldPress AI"}
    </div>
    <div class="mt-1 text-sm text-slate-300">${escapeHtml(message)}</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

export function downloadText(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function copyText(text) {
  await navigator.clipboard.writeText(text || "");
  toast("Disalin ke clipboard");
}

export function formatDate(v) {
  return new Date(v || Date.now()).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function slugify(s = "fieldpress") {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function setLoading(btn, state, label = "Memproses...") {
  if (!btn) return;
  if (state) {
    btn.dataset.old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = label;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.old || btn.innerHTML;
  }
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request gagal");
  return data;
}

export async function apiUpload(path, file, fields, token) {
  const form = new FormData();
  form.append("audio", file);

  Object.entries(fields || {}).forEach(([k, v]) => form.append(k, v));

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload gagal");
  return data;
}
