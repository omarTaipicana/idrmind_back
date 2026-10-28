const { getAll, create, getOne, remove, update, login, verifyCode, getLoggedUser, sendEmailResetPassword, resetPassword } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require("../utils/verifyJWT")
const { refresh, logout } = require('../controllers/session.controllers');

const userRouter = express.Router();

userRouter.route('/users')
    .get( getAll)
    .post(create);

userRouter.post('/users/session/refresh', refresh);
userRouter.post('/users/session/logout', verifyJWT, logout);

userRouter.route('/users/login')
    .post(login)

userRouter.route('/users/me')
    .get(verifyJWT, getLoggedUser);   

userRouter.route('/users/reset_password')
    .post(sendEmailResetPassword);  

userRouter.route('/users/reset_password/:code')
    .post(resetPassword);  
    
userRouter.route('/users/verify/:code')   
    .get(verifyCode)

userRouter.route('/users/:id')
    .get( getOne)
    .delete(verifyJWT, remove)
    .put(verifyJWT, require("../middlewares/authorizeUserUpdate"), update);

module.exports = userRouter;