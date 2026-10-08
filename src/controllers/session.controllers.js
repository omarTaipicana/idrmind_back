const jwt = require('jsonwebtoken');
const UserSession = require('../models/UserSession');
const { validateSession, issueToken, IDLE_MS } = require('../utils/sessionSecurity');
const refresh = async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.sendStatus(401);
    // Refresh sólo antes de expirar; nunca permite revivir tokens expirados.
    const decoded = jwt.verify(header.slice(7), process.env.TOKEN_SECRET);
    const validated = await validateSession(decoded);
    if (!validated) return res.sendStatus(401);
    return res.json({ token: issueToken(validated.user, validated.session), idleTimeoutMs: IDLE_MS });
  } catch { return res.sendStatus(401); }
};
const logout = async (req, res) => {
  if (req.sessionId) await UserSession.update({ revokedAt: new Date() }, { where: { id: req.sessionId, userId: req.user.id } });
  return res.json({ message: 'Sesión cerrada' });
};
module.exports = { refresh, logout };
