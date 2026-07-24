const { getAll, create, getOne, remove, update } = require('../controllers/sector.controllers');
const express = require('express');

const sectorRouter = express.Router();

sectorRouter.route('/sector')
    .get(getAll)
    .post(create);

sectorRouter.route('/sector/:id')
    .get(getOne)
    .delete(remove)
    .put(update);

module.exports = sectorRouter;