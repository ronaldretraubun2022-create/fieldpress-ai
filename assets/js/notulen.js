import { supabase, requireAuth, getProfile, getUser } from "./supabase.js";
import {
  $,
  toast,
  setLoading,
  apiPost,
  apiUpload,
  downloadText,
} from "./utils.js";
import { renderUsage } from "./usage.js";
import { exportPDF, exportDOCX } from "./exports.js";

let mediaRecorder = null;
let chunks = [];
let audioBlob = null;
let session = null;
let profile = null;
let transcriptId = null;

function buildMeetingContent() {
  return `
Judul:
${$("#meetingTitle")?.value || ""}

Tanggal:
${$("#meetingDate")?.value || ""}

Peserta:
${$("#participants")?.value || ""}

Ringkasan:
${$("#summary")?.value || ""}

Keputusan:
${$("#decisions")?.value || ""}

Action Items:
${$("#actionItems")?.value || ""}
`.trim();
}

function ensureNotulenUI() {
  const main = document.querySelector("main");
  if (!main || $("#transcript")) return;

  main.innerHTML = `
    <div id="usageBox" class="mb-8"></div>

    <section class="grid gap-6 xl:grid-cols-2">
      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div class="mb-6">
          <h2 class="text-3xl font-black">Input Audio Rapat</h2>
          <p class="mt-2 text-sm text-slate-400">Rekam atau upload audio rapat untuk dibuat transcript otomatis.</p>
        </div>

        <div class="space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row">
            <button id="recordBtn" class="rounded-2xl bg-cyan-400 px-6 py-4 font-bold text-black transition hover:bg-cyan-300">
              Mulai Rekam
            </button>

            <label class="flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-slate-950 px-6 py-4 font-bold text-slate-200 hover:bg-white/10">
              Upload Audio
              <input id="audioUpload" type="file" accept="audio/*" class="hidden" />
            </label>
          </div>

          <button id="transcribeBtn" class="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10">
            Speech to Text
          </button>

          <textarea
            id="transcript"
            class="min-h-[360px] w-full resize-y rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Transcript rapat akan muncul di sini..."
          ></textarea>
        </div>
      </div>

      <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div class="mb-6">
          <h2 class="text-3xl font-black">Generate Notulen</h2>
          <p class="mt-2 text-sm text-slate-400">AI akan membuat ringkasan, keputusan, peserta, dan action items.</p>
        </div>

        <div class="space-y-5">
          <button id="generateBtn" class="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 font-bold text-black transition hover:opacity-90">
            Generate Notulen
          </button>

          <div class="grid gap-4 md:grid-cols-2">
            <input
              id="meetingTitle"
              class="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
              placeholder="Judul rapat"
            />

            <input
              id="meetingDate"
              type="date"
              class="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>

          <textarea
            id="participants"
            class="min-h-[96px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Peserta rapat"
          ></textarea>

          <textarea
            id="summary"
            class="min-h-[150px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Ringkasan rapat"
          ></textarea>

          <textarea
            id="decisions"
            class="min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Keputusan rapat"
          ></textarea>

          <textarea
            id="actionItems"
            class="min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Action items"
          ></textarea>

          <div class="grid gap-4 sm:grid-cols-3">
            <button id="downloadTxtBtn" class="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10">
              Download TXT
            </button>

            <button id="downloadPdfBtn" class="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10">
              Export PDF
            </button>

            <button id="downloadDocxBtn" class="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-white hover:bg-white/10">
              Export DOCX
            </button>

            <button id="saveBtn" class="sm:col-span-3 rounded-2xl bg-cyan-400 px-6 py-4 font-bold text-black hover:bg-cyan-300">
              Simpan Notulen
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
    role: "notulen",
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
  ensureNotulenUI();

  session = await requireAuth();
  if (!session) return;

  profile = await ensureProfile();
  await renderUsage("#usageBox", profile);

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
    toast("Audio rapat dipilih");
  });

  $("#transcribeBtn")?.addEventListener("click", transcribeMeeting);
  $("#generateBtn")?.addEventListener("click", generateMeetingNote);
  $("#downloadTxtBtn")?.addEventListener("click", downloadTXT);
  $("#downloadPdfBtn")?.addEventListener("click", downloadPDF);
  $("#downloadDocxBtn")?.addEventListener("click", downloadDOCX);
  $("#saveBtn")?.addEventListener("click", saveMeetingNote);

  $("#logoutBtn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "login.html";
  });
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

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(chunks, { type: "audio/webm" });
      stream.getTracks().forEach((track) => track.stop());
      toast("Rekaman rapat selesai");
    };

    mediaRecorder.start();
    $("#recordBtn").textContent = "Stop Rekam";
    toast("Merekam rapat...");
  } catch {
    toast("Mikrofon gagal diakses", "error");
  }
}

async function uploadAudio() {
  if (!audioBlob) throw new Error("Audio rapat belum tersedia.");

  const ext = audioBlob.name?.split(".").pop() || "webm";
  const path = `${profile.id}/meetings/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("audio")
    .upload(path, audioBlob, {
      contentType: audioBlob.type || "audio/webm",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("recordings")
    .insert({ user_id: profile.id, file_path: path, mode: "meeting" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function transcribeMeeting() {
  if (!audioBlob) {
    toast("Audio rapat belum tersedia", "error");
    return;
  }

  const btn = $("#transcribeBtn");

  try {
    setLoading(btn, true, "Transcribing...");
    const recording = await uploadAudio();

    const data = await apiUpload(
      "/transcribe",
      audioBlob,
      { mode: "meeting" },
      session.access_token
    );

    $("#transcript").value = data.text || "";

    const { data: transcript, error } = await supabase
      .from("transcripts")
      .insert({
        user_id: profile.id,
        recording_id: recording.id,
        raw_text: data.text || "",
        mode: "meeting",
      })
      .select("*")
      .single();

    if (error) throw error;
    transcriptId = transcript.id;

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "Speech to text notulen",
      metadata: { transcript_id: transcriptId },
    });

    toast("Transkrip rapat berhasil");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(btn, false);
    await renderUsage("#usageBox", profile);
  }
}

async function generateMeetingNote() {
  const transcript = $("#transcript").value.trim();
  if (!transcript) {
    toast("Transkrip kosong", "error");
    return;
  }

  const btn = $("#generateBtn");

  try {
    setLoading(btn, true, "Generate notulen...");

    const data = await apiPost(
      "/ai/meeting-note",
      { transcript },
      session.access_token
    );

    $("#summary").value = data.summary || "";
    $("#decisions").value = Array.isArray(data.decisions)
      ? data.decisions.map((item) => `• ${item}`).join("\n")
      : data.decisions || "";

    $("#actionItems").value = Array.isArray(data.action_items)
      ? data.action_items.map((item) => `• ${item}`).join("\n")
      : data.action_items || "";

    $("#participants").value = Array.isArray(data.participants)
      ? data.participants.join(", ")
      : data.participants || "";

    $("#meetingTitle").value = data.title || "Notulen Rapat";
    $("#meetingDate").value =
      data.date || new Date().toISOString().slice(0, 10);

    toast("Notulen berhasil dibuat");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(btn, false);
    await renderUsage("#usageBox", profile);
  }
}

async function saveMeetingNote() {
  try {
    const title = $("#meetingTitle").value.trim();
    const summary = $("#summary").value.trim();

    if (!title || !summary) {
      toast("Judul dan ringkasan wajib diisi.", "error");
      return;
    }

    const payload = {
      user_id: profile.id,
      transcript_id: transcriptId,
      title,
      summary,
      decisions: $("#decisions").value,
      action_items: $("#actionItems").value,
      participants: $("#participants").value,
      meeting_date:
        $("#meetingDate").value || new Date().toISOString().slice(0, 10),
    };

    const { data, error } = await supabase
      .from("meeting_notes")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "Simpan notulen AI",
      metadata: { meeting_note_id: data.id },
    });

    toast("Notulen berhasil disimpan");
  } catch (error) {
    toast(error.message, "error");
  }
}

function downloadTXT() {
  downloadText("notulen-rapat.txt", buildMeetingContent());
}

async function downloadPDF() {
  await exportPDF($("#meetingTitle")?.value || "Notulen Rapat", buildMeetingContent());
  toast("PDF berhasil di-export");
}

async function downloadDOCX() {
  await exportDOCX(buildMeetingContent());
  toast("DOCX berhasil di-export");
}

init().catch((error) => {
  console.error(error);
  toast(error.message, "error");
});
