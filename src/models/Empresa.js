const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Empresa = sequelize.define("empresa", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },

    razonSocial: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },

    nombreComercial: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },

    ruc: {
        type: DataTypes.STRING(13),
        allowNull: true,
        unique: true,
        validate: {
            len: {
                args: [13, 13],
                msg: "El RUC debe contener 13 dígitos.",
            },
            isNumeric: {
                msg: "El RUC debe contener únicamente números.",
            },
        },
    },

    direccion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },

    provincia: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },

    correo: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            isEmail: {
                msg: "Debe ingresar un correo electrónico válido.",
            },
        },
    },

    telefono: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },

    gerente: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },

    contactoGerente: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },

    correoGerente: {
        type: DataTypes.STRING(150),
        allowNull: true,
        validate: {
            isEmail: {
                msg: "El correo del gerente no es válido.",
            },
        },
    },

    sector: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },

    subSector: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },

    especialidad: {
        type: DataTypes.STRING(150),
        allowNull: true,
    },

    numeroEmpleados: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: {
                args: [1],
                msg: "El número de empleados debe ser mayor que cero.",
            },
        },
    },

    sitioWeb: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    logoUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },

});

module.exports = Empresa;