const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const IDLE_MS = Math.max(1, Number(process.env.SESSION_IDLE_MINUTES || 10)) * 60000;
const TOKEN_SECONDS = Math.max(300, Number(process.env.ACCESS_TOKEN_SECONDS || 1200));
const superAdminCis = () => (process.env.SUPERADMIN_CIS || '').split(',').map(v => v.trim()).filter(Boolean);
const isSuperAdmin = user => Boolean(user && superAdminCis().includes(String(user.cI || '').trim()));
const issueToken = (user, session) => jwt.sign({ user: { id: user.id }, sid: session.id }, process.env.TOKEN_SECRET, { expiresIn: TOKEN_SECONDS });
async function validateSession(decoded, touch = true) {
  if (!decoded.sid) return null;
  const session = await UserSession.findByPk(decoded.sid);
  if (!session || session.revokedAt || String(session.userId) !== String(decoded.user?.id)) return null;
  const now = Date.now();
  if (now - new Date(session.lastActivityAt).getTime() > IDLE_MS) {
    await session.update({ revokedAt: new Date() }); return null;
  }
  const user = await User.findByPk(session.userId);
  if (!user || !user.isVerified) return null;
  if (touch && now - new Date(session.lastActivityAt).getTime() >= 60000) await session.update({ lastActivityAt: new Date() });
  return { session, user };
}
module.exports = { IDLE_MS, TOKEN_SECONDS, isSuperAdmin, issueToken, validateSession };
