const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");
module.exports = sequelize.define("BenefitCoupon", {
 id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},
 codigo:{type:DataTypes.STRING(80),allowNull:false,unique:true},
 nombre:{type:DataTypes.STRING(180),allowNull:false},
 tipo:{type:DataTypes.ENUM("test_gratis","curso_gratis","descuento","paquete_empresa","certificado_gratis"),allowNull:false},
 objetivoId:{type:DataTypes.UUID,allowNull:true},
 empresaId:{type:DataTypes.UUID,allowNull:true},
 descuentoTipo:{type:DataTypes.ENUM("porcentaje","fijo"),allowNull:true},
 descuentoValor:{type:DataTypes.DECIMAL(12,2),allowNull:true},
 maxUsos:{type:DataTypes.INTEGER,allowNull:false,defaultValue:1},
 usos:{type:DataTypes.INTEGER,allowNull:false,defaultValue:0},
 vigenteDesde:{type:DataTypes.DATE,allowNull:true},
 venceAt:{type:DataTypes.DATE,allowNull:true},
 incluyeResultados:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false},
 activo:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:true},
 servicio:{type:DataTypes.STRING(30),allowNull:false,defaultValue:"resultados"},
 certificadosPermitidos:{type:DataTypes.JSONB,allowNull:false,defaultValue:["cert_emp","cert_mdt","cert_int"]},
 beneficiarios:{type:DataTypes.JSONB,allowNull:false,defaultValue:[]},
 maxPorPersona:{type:DataTypes.INTEGER,allowNull:false,defaultValue:1},
 creadoPor:{type:DataTypes.UUID,allowNull:true}
},{tableName:"benefit_coupons",timestamps:true});
