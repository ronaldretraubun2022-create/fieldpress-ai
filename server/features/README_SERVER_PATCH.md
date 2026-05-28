# Server Patch Instructions

Copy files into:

```txt
D:\fieldpress-ai\server\middleware\
D:\fieldpress-ai\server\features\
```

## 1. Install dependency

```bash
npm install helmet express-rate-limit multer
```

## 2. In `server/server.js`, add near top:

```js
const { securityHeaders, apiRateLimit, aiRateLimit, uploadRateLimit } = require("./middleware/security");
const { createAudioUpload } = require("./middleware/upload-validation");
const {
  checkAiQuota,
  checkAudioQuota,
  logAudioUsage,
  logSecurityEvent,
} = require("./features/quota-guard");
```

## 3. Replace old helmet/rate limit setup with:

```js
app.use(securityHeaders());
app.use(apiRateLimit());
```

## 4. Replace upload multer config with:

```js
const upload = createAudioUpload();
```

## 5. Protect AI endpoints:

Before OpenAI calls:

```js
await checkAiQuota({
  supabase,
  userId: req.user.id,
  profile: req.profile,
});
```

## 6. Protect audio endpoint:

In `/api/transcribe`, before Whisper call:

```js
await checkAiQuota({ supabase, userId: req.user.id, profile: req.profile });
await checkAudioQuota({
  supabase,
  userId: req.user.id,
  profile: req.profile,
  durationSeconds: 60,
});
```

After success:

```js
await logAudioUsage({
  supabase,
  userId: req.user.id,
  durationSeconds: 60,
  source: req.body.mode || "upload",
});
```

Note: durationSeconds is estimated. For exact duration, add ffprobe later.

## 7. Add rate limit per route:

```js
app.post("/api/ai/article", auth, aiRateLimit(), async (req, res) => {});
app.post("/api/ai/clean-text", auth, aiRateLimit(), async (req, res) => {});
app.post("/api/transcribe", auth, uploadRateLimit(), upload.single("audio"), async (req, res) => {});
```
