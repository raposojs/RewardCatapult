'use strict';
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('tasks', {
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    description: {
        type: Sequelize.STRING,
        allowNull: true
    },
    done: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    }
});
