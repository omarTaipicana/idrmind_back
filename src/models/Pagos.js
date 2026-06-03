const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Pagos = sequelize.define("pagos", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  pagoUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  curso: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cert_emp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cert_mdt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cert_int: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  valorDepositado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  porcentajeIva: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  iva: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  entidad: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  idDeposito: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  confirmacion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  verificado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  distintivo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  moneda: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  entregado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  observacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  usuarioEdicion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  facturaUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoDocumentoId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoDocumentoNumero: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoEstado: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoAutorizacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoUrlRide: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoUrlXml: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoFirmado: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contificoEmailEnviado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  contificoEmailEnviadoAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
});

module.exports = Pagos;
