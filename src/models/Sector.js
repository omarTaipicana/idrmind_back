const { DataTypes } = require('sequelize');
const sequelize = require('../utils/connection');

const Sector = sequelize.define('sector', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    sector: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subsector: {
        type: DataTypes.STRING,
        allowNull: false,
    },
},
    {
        timestamps: false,
        createdAt: false,
        updatedAt: false,
    }


);

module.exports = Sector;