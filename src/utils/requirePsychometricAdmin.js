const { isSuperAdmin } = require('./sessionSecurity');
// Configurable según los roles reales registrados en User.role.
const DEFAULT_ROLES = 'Administrador,SubAdministrador,Validador,Secretaria,admin,administrator';
module.exports = (req, res, next) => {
  if (!req.user) return res.sendStatus(401);
  if (isSuperAdmin(req.user)) return next();
  const roles = (process.env.PSYCHOMETRIC_DASHBOARD_ROLES || DEFAULT_ROLES)
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (roles.includes(String(req.user.role || '').trim().toLowerCase())) return next();
  return res.status(403).json({ message: 'No tiene permisos para consultar el dashboard psicométrico.' });
};
