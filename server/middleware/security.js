const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

function securityHeaders() {
  return helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  });
}

function apiRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 80,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Terlalu banyak request. Coba lagi sebentar.",
    },
  });
}

function aiRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Terlalu banyak AI request. Coba lagi sebentar.",
    },
  });
}

function uploadRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Terlalu banyak upload audio. Coba lagi sebentar.",
    },
  });
}

module.exports = {
  securityHeaders,
  apiRateLimit,
  aiRateLimit,
  uploadRateLimit,
};
