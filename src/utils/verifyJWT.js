const jwt = require('jsonwebtoken');
const { validateSession } = require('./sessionSecurity');
module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.sendStatus(401);
    const decoded = jwt.verify(header.slice(7), process.env.TOKEN_SECRET);
    // Compatibilidad temporal: JWT anteriores, sin sid, siguen hasta vencer.
    if (!decoded.sid) {
      // Migración opcional; por defecto se rechazan tokens sin sesión revocable.
      if (process.env.ALLOW_LEGACY_JWT !== 'true' || !decoded.user?.id) return res.sendStatus(401);
      req.user = decoded.user; return next();
    }
    const verified = await validateSession(decoded);
    if (!verified) return res.status(401).json({ message: 'Sesión inactiva o revocada' });
    req.user = verified.user.toJSON(); req.sessionId = verified.session.id;
    next();
  } catch (err) { return res.status(401).json({ message: 'Sesión inválida o expirada' }); }
};
