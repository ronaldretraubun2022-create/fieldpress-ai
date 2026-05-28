const multer = require("multer");

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
]);

function createAudioUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
    },
    fileFilter: (req, file, cb) => {
      if (!file || !file.mimetype) {
        return cb(new Error("File audio tidak valid."));
      }

      if (!ALLOWED_AUDIO_TYPES.has(file.mimetype) && !file.mimetype.startsWith("audio/")) {
        return cb(new Error("Format audio tidak didukung."));
      }

      cb(null, true);
    },
  });
}

module.exports = {
  createAudioUpload,
};
