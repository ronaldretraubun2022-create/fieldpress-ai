require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const { toFile } = require("openai/uploads");

const app = express();

const PORT = process.env.PORT || 8787;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL belum diisi di .env");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi di .env");
}

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "WARNING: OPENAI_API_KEY belum diisi. Fitur AI tidak akan berjalan.",
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing-key",
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("File harus audio."));
    }
    cb(null, true);
  },
});

app.use(helmet());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = data.user;

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      const fallback = {
        id: data.user.id,
        email: data.user.email,
        full_name:
          data.user.user_metadata?.full_name || data.user.email || "User",
        role: "user",
        plan: "free",
      };

      const { data: created, error: profileError } = await supabase
        .from("profiles")
        .upsert(fallback)
        .select("*")
        .single();

      if (profileError) throw profileError;
      profile = created;
    }

    req.profile = profile;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || "Auth failed" });
  }
}

function planLimit(profile) {
  if (profile?.role === "admin") {
    return { limit: 1_000_000, period: "month" };
  }

  const plans = {
    free: { limit: 5, period: "day" },
    basic: { limit: 50, period: "month" },
    pro: { limit: 300, period: "month" },
    enterprise: { limit: 1_000_000, period: "month" },
  };

  return plans[profile?.plan || "free"] || plans.free;
}

async function checkQuota(userId, profile) {
  const cfg = planLimit(profile);
  const start = new Date();

  if (cfg.period === "day") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) throw error;

  if ((count || 0) >= cfg.limit) {
    throw new Error("Kuota AI habis. Upgrade plan untuk lanjut.");
  }

  return {
    used: count || 0,
    limit: cfg.limit,
    remaining: cfg.limit - (count || 0),
  };
}

async function logUsage(userId, feature, tokens = 0) {
  const { error } = await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    feature,
    tokens_used: tokens,
  });

  if (error) throw error;
}

async function chatJSON(messages) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY belum diisi di backend.");
  }

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages,
  });

  return {
    json: JSON.parse(result.choices[0].message.content),
    tokens: result.usage?.total_tokens || 0,
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "FieldPress AI",
    port: PORT,
  });
});

app.post("/api/ai/clean-text", auth, async (req, res) => {
  try {
    await checkQuota(req.user.id, req.profile);

    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ error: "Teks kosong." });
    }

    const { json, tokens } = await chatJSON([
      {
        role: "system",
        content:
          'Return JSON {"text":"..."} only. Rapikan transkrip Bahasa Indonesia. Perbaiki tanda baca, struktur kalimat, hilangkan filler, tapi jangan mengubah fakta.',
      },
      {
        role: "user",
        content: text,
      },
    ]);

    await logUsage(req.user.id, "clean_text", tokens);

    res.json(json);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/ai/article", auth, async (req, res) => {
  try {
    await checkQuota(req.user.id, req.profile);

    const text = String(req.body.text || "").trim();
    const genre = String(req.body.genre || "hard news").trim();

    if (!text) {
      return res.status(400).json({ error: "Teks berita kosong." });
    }

    const { json, tokens } = await chatJSON([
      {
        role: "system",
        content: `
Return valid JSON only:
{
  "title": "",
  "lead": "",
  "body": "",
  "seo_keywords": []
}

Tugas:
Buat berita Bahasa Indonesia profesional untuk genre: ${genre}.
Gunakan gaya newsroom.
Jangan mengarang fakta di luar teks sumber.
Pisahkan informasi penting, buat judul kuat, lead ringkas, isi berita rapi.
SEO keywords maksimal 8 item.
        `.trim(),
      },
      {
        role: "user",
        content: text,
      },
    ]);

    await logUsage(req.user.id, "article", tokens);

    res.json(json);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/transcribe", auth, upload.single("audio"), async (req, res) => {
  try {
    await checkQuota(req.user.id, req.profile);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY belum diisi di backend.");
    }

    if (!req.file) {
      throw new Error("Audio tidak ditemukan.");
    }

    const file = await toFile(
      req.file.buffer,
      req.file.originalname || "audio.webm",
      {
        type: req.file.mimetype || "audio/webm",
      },
    );

    const transcript = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "id",
      response_format: "json",
    });

    await logUsage(req.user.id, "transcribe", 0);

    res.json({
      text: transcript.text || "",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use((error, req, res, next) => {
  res.status(400).json({
    error: error.message || "Server error",
  });
});

app.post("/api/ai/meeting-note", auth, async (req, res) => {
  try {
    await checkQuota(req.user.id, req.profile);

    const transcript = String(req.body.transcript || "").trim();

    if (!transcript) {
      return res.status(400).json({
        error: "Transcript kosong",
      });
    }

    const { json, tokens } = await chatJSON([
      {
        role: "system",
        content: `
Return valid JSON only:
{
  "title": "",
  "date": "",
  "participants": [],
  "summary": "",
  "decisions": [],
  "action_items": []
}

Tugas:
Analisa transcript rapat Bahasa Indonesia.
Buat notulen profesional.
Pisahkan keputusan rapat.
Pisahkan action items.
Identifikasi peserta jika tersedia.
Gunakan gaya profesional perusahaan/startup.
        `.trim(),
      },
      {
        role: "user",
        content: transcript,
      },
    ]);

    await logUsage(req.user.id, "meeting_note", tokens);

    res.json(json);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`FieldPress AI server running on http://localhost:${PORT}`);
});
