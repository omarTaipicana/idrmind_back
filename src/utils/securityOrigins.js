// Lista explícita de orígenes autorizados; no permite comodines.
const defaults = ['https://idrmind.com', 'https://www.idrmind.com', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = [...new Set((process.env.CORS_ALLOWED_ORIGINS || defaults.join(',')).split(',').map(v => v.trim().replace(/\/$/, '')).filter(Boolean))];
function corsOptions() {
  return {
    origin(origin, callback) {
      // Clientes sin Origin (curl, apps móviles, servidores) se autentican normalmente.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origen CORS no autorizado'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
    maxAge: 600,
  };
}
module.exports = { allowedOrigins, corsOptions };
