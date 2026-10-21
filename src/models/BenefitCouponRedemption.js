const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");
module.exports = sequelize.define("BenefitCouponRedemption",{
 id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},
 couponId:{type:DataTypes.UUID,allowNull:false},
 userId:{type:DataTypes.UUID,allowNull:false},
 inscripcionId:{type:DataTypes.UUID,allowNull:true},
 evaluationId:{type:DataTypes.UUID,allowNull:true},
 referencia:{type:DataTypes.STRING(180),allowNull:false},
 servicio:{type:DataTypes.STRING(30),allowNull:true},
 seleccion:{type:DataTypes.JSONB,allowNull:false,defaultValue:[]},
 precioOriginal:{type:DataTypes.DECIMAL(12,2),allowNull:true},
 saldoPendiente:{type:DataTypes.DECIMAL(12,2),allowNull:true},
 cubierto:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false},
 couponSnapshot:{type:DataTypes.JSONB,allowNull:true},
 montoDescontado:{type:DataTypes.DECIMAL(12,2),allowNull:false,defaultValue:0}
},{tableName:"benefit_coupon_redemptions",timestamps:true,indexes:[{unique:true,fields:["couponId","userId","referencia"]}]});
