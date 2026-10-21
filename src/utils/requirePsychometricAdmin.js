const { isSuperAdmin } = require('./sessionSecurity');
const DEFAULT_ROLES = 'Administrador,SubAdministrador,Validador,Secretaria,admin,administrator';
function canAccess(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const roles = (process.env.PSYCHOMETRIC_DASHBOARD_ROLES || DEFAULT_ROLES)
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return roles.includes(String(user.role || '').trim().toLowerCase());
}
function requirePsychometricAdmin(req, res, next) {
  if (!req.user) return res.sendStatus(401);
  if (canAccess(req.user)) return next();
  return res.status(403).json({ message: 'No tiene permisos para consultar el dashboard psicométrico.' });
}
module.exports = requirePsychometricAdmin;
module.exports.canAccess = canAccess;
