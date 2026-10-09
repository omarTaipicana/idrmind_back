const express = require("express");
const { submitCollaboration } = require("../controllers/collaboration.controllers");
const router = express.Router();
const attempts = new Map();
router.post("/alianzas/trabaja-con-nosotros", (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  if (attempts.size > 5000) for (const [key, value] of attempts) if (now - value.since > 3600000) attempts.delete(key);
  const state = attempts.get(ip);
  if (!state || now - state.since > 3600000) attempts.set(ip, { since: now, count: 1 });
  else { state.count++; if (state.count > 8) return res.status(429).json({ message: "Demasiadas solicitudes. Intenta más tarde." }); }
  next();
}, submitCollaboration);
module.exports = router;
