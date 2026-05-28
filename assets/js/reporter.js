import { supabase, requireAuth, getProfile, getUser } from "./supabase.js";
import {
  $,
  toast,
  downloadText,
  copyText,
  setLoading,
  apiPost,
  apiUpload,
  slugify,
} from "./utils.js";
import { renderUsage } from "./usage.js";

let mediaRecorder = null;
let chunks = [];
let audioBlob = null;
let audioFileName = "";
let profile = null;
let session = null;
let recordingId = null;
let transcriptId = null;

function ensureReporterUI() {
  const main = document.querySelector("main");
  if (!main || $("#transcript")) return;

  main.innerHTML = `
    <div id="usageBox" class="mb-8"></div>

    <section class="grid gap-6 xl:grid-cols-2">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div class="mb-6">
          <h2 class="text-3xl font-black">Input Audio</h2>
          <p class="mt-2 text-sm text-slate-400">
            Rekam atau upload audio lapangan untuk dibuat transkrip otomatis.
          </p>
        </div>

        <div class="space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              id="recordBtn"
              class="rounded-2xl bg-cyan-400 px-6 py-4 font-bold text-black transition hover:bg-cyan-300"
            >
              Mulai Rekam
            </button>

            <label
              class="flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-slate-950 px-6 py-4 font-bold text-slate-200 hover:bg-white/10"
            >
              Upload Audio
              <input id="audioUpload" type="file" accept="audio/*" class="hidden" />
            </label>
          </div>

          <button
            id="transcribeBtn"
            class="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10"
          >
            Speech to Text
          </button>

          <textarea
            id="transcript"
            class="min-h-[260px] w-full resize-y rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Hasil transkrip..."
          ></textarea>

          <button
            id="cleanBtn"
            class="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10"
          >
            Rapikan Teks AI
          </button>

          <textarea
            id="cleanTranscript"
            class="min-h-[220px] w-full resize-y rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Teks yang sudah dirapikan AI..."
          ></textarea>
        </div>
      </div>

      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div class="mb-6">
          <h2 class="text-3xl font-black">Generate Berita</h2>
          <p class="mt-2 text-sm text-slate-400">
            AI membuat judul, lead, isi berita, dan SEO keywords dari transkrip.
          </p>
        </div>

        <div class="space-y-5">
          <select
            id="genre"
            class="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-slate-100 outline-none focus:border-cyan-400"
          >
            <option value="hard news">Hard News</option>
            <option value="soft news">Soft News</option>
            <option value="investigasi">Investigasi</option>
            <option value="feature">Feature</option>
            <option value="opini">Opini</option>
            <option value="breaking news">Breaking News</option>
            <option value="olahraga">Olahraga</option>
            <option value="politik">Politik</option>
            <option value="ekonomi">Ekonomi</option>
            <option value="hukum">Hukum</option>
            <option value="teknologi">Teknologi</option>
            <option value="hiburan">Hiburan</option>
          </select>

          <button
            id="generateBtn"
            class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 font-bold text-black transition hover:opacity-90"
          >
            Generate Berita
          </button>

          <input
            id="titleOutput"
            class="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Judul berita"
          />

          <textarea
            id="leadOutput"
            class="min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Lead berita"
          ></textarea>

          <textarea
            id="articleOutput"
            class="min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Isi berita"
          ></textarea>

          <textarea
            id="seoOutput"
            class="min-h-[100px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="SEO keywords"
          ></textarea>

          <div class="grid gap-4 sm:grid-cols-2">
            <button
              id="copyBtn"
              class="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10"
            >
              Copy Artikel
            </button>

            <button
              id="downloadBtn"
              class="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10"
            >
              Download TXT
            </button>

            <button
              id="saveDraftBtn"
              class="rounded-2xl bg-white/[0.08] px-6 py-4 font-bold text-white hover:bg-white/[0.12]"
            >
              Simpan Draft
            </button>

            <button
              id="publishBtn"
              class="rounded-2xl bg-cyan-400 px-6 py-4 font-bold text-black hover:bg-cyan-300"
            >
              Publish Artikel
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

async function ensureProfile() {
  const existing = await getProfile();
  if (existing) return existing;

  const user = await getUser();
  if (!user) throw new Error("User belum login.");

  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email || "User",
    role: "wartawan",
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

async function init() {
  ensureReporterUI();

  session = await requireAuth();
  if (!session) return;

  profile = await ensureProfile();
  await renderUsage("#usageBox", profile);

  $("#menuBtn")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("open");
  });

  $("#logoutBtn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "login.html";
  });

  $("#recordBtn")?.addEventListener("click", toggleRecord);

  $("#audioUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast("File harus audio.", "error");
      e.target.value = "";
      return;
    }

    audioBlob = file;
    audioFileName = file.name;
    toast("Audio dipilih");
  });

  $("#transcribeBtn")?.addEventListener("click", transcribe);
  $("#cleanBtn")?.addEventListener("click", cleanText);
  $("#generateBtn")?.addEventListener("click", generateArticle);
  $("#copyBtn")?.addEventListener("click", () => copyText(composeArticle()));
  $("#downloadBtn")?.addEventListener("click", downloadArticle);
  $("#saveDraftBtn")?.addEventListener("click", () => saveArticle("draft"));
  $("#publishBtn")?.addEventListener("click", () => saveArticle("published"));
}

async function toggleRecord() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    $("#recordBtn").textContent = "Mulai Rekam";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(chunks, { type: "audio/webm" });
      audioFileName = `recording-${Date.now()}.webm`;
      stream.getTracks().forEach((track) => track.stop());
      toast("Rekaman selesai");
    };

    mediaRecorder.start();
    $("#recordBtn").textContent = "Stop Rekam";
    toast("Rekaman dimulai");
  } catch {
    toast("Mikrofon tidak bisa diakses.", "error");
  }
}

async function uploadAudioToStorage() {
  if (!audioBlob) throw new Error("Audio belum tersedia.");

  const ext = audioFileName.split(".").pop() || "webm";
  const path = `${profile.id}/reporter/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("audio")
    .upload(path, audioBlob, {
      contentType: audioBlob.type || "audio/webm",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("recordings")
    .insert({
      user_id: profile.id,
      file_path: path,
      mode: "reporter",
    })
    .select("*")
    .single();

  if (error) throw error;

  recordingId = data.id;

  await supabase.from("activity_logs").insert({
    user_id: profile.id,
    action: "Upload audio wartawan",
    metadata: { recording_id: recordingId, path },
  });

  return data;
}

async function transcribe() {
  if (!audioBlob) {
    toast("Rekam atau upload audio dulu.", "error");
    return;
  }

  const btn = $("#transcribeBtn");

  try {
    setLoading(btn, true, "Transcribing...");
    const recording = await uploadAudioToStorage();

    const data = await apiUpload(
      "/transcribe",
      audioBlob,
      { mode: "reporter" },
      session.access_token,
    );

    $("#transcript").value = data.text || "";

    const { data: transcript, error } = await supabase
      .from("transcripts")
      .insert({
        user_id: profile.id,
        recording_id: recording.id,
        raw_text: data.text || "",
        mode: "reporter",
      })
      .select("*")
      .single();

    if (error) throw error;
    transcriptId = transcript.id;

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "Speech to text wartawan",
      metadata: { transcript_id: transcriptId },
    });

    toast("Transkrip berhasil dibuat");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(btn, false);
    await renderUsage("#usageBox", profile);
  }
}

async function cleanText() {
  const rawText = $("#transcript")?.value?.trim();

  if (!rawText) {
    toast("Transkrip masih kosong.", "error");
    return;
  }

  const btn = $("#cleanBtn");

  try {
    setLoading(btn, true, "Merapikan teks...");

    const data = await apiPost(
      "/ai/clean-text",
      { text: rawText, mode: "reporter" },
      session.access_token,
    );

    $("#cleanTranscript").value = data.text || "";

    if (transcriptId) {
      await supabase
        .from("transcripts")
        .update({ cleaned_text: data.text || "" })
        .eq("id", transcriptId);
    }

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "Rapikan teks transkrip",
      metadata: { transcript_id: transcriptId },
    });

    toast("Teks berhasil dirapikan");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(btn, false);
    await renderUsage("#usageBox", profile);
  }
}

async function generateArticle() {
  const text = (
    $("#cleanTranscript")?.value ||
    $("#transcript")?.value ||
    ""
  ).trim();

  if (!text) {
    toast("Isi transkrip dulu.", "error");
    return;
  }

  const btn = $("#generateBtn");

  try {
    setLoading(btn, true, "Generate berita...");

    const data = await apiPost(
      "/ai/article",
      {
        text,
        genre: $("#genre").value,
      },
      session.access_token,
    );

    $("#titleOutput").value = data.title || "";
    $("#leadOutput").value = data.lead || "";
    $("#articleOutput").value = data.body || "";
    $("#seoOutput").value = Array.isArray(data.seo_keywords)
      ? data.seo_keywords.join(", ")
      : data.seo_keywords || "";

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "Generate berita AI",
      metadata: {
        genre: $("#genre").value,
        transcript_id: transcriptId,
      },
    });

    toast("Berita siap diedit/upload");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(btn, false);
    await renderUsage("#usageBox", profile);
  }
}

function composeArticle() {
  return `Judul:
${$("#titleOutput").value}

Genre:
${$("#genre").value}

Lead:
${$("#leadOutput").value}

Isi:
${$("#articleOutput").value}

SEO Keywords:
${$("#seoOutput").value}`;
}

function downloadArticle() {
  const title = $("#titleOutput").value || "artikel-fieldpress";
  downloadText(`${slugify(title)}.txt`, composeArticle());
}

async function saveArticle(status) {
  const title = $("#titleOutput").value.trim();
  const lead = $("#leadOutput").value.trim();
  const body = $("#articleOutput").value.trim();

  if (!title || !body) {
    toast("Judul dan isi berita wajib diisi.", "error");
    return;
  }

  try {
    const payload = {
      user_id: profile.id,
      transcript_id: transcriptId,
      title,
      lead,
      body,
      genre: $("#genre").value,
      seo_keywords: ($("#seoOutput").value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      status,
    };

    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action:
        status === "published" ? "Publish artikel" : "Simpan draft artikel",
      metadata: { article_id: data.id, status },
    });

    toast(status === "published" ? "Artikel dipublish" : "Draft disimpan");
  } catch (error) {
    toast(error.message, "error");
  }
}

init().catch((error) => {
  console.error(error);
  toast(error.message || "Mode wartawan gagal dimuat.", "error");
});
