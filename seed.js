/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/

var chalk = require('chalk');
var db = require('./server/db');
var User = db.model('user');
var Tasks = db.model('tasks')
var Promise = require('sequelize').Promise;

var seedUsers = function () {

    var tasks = [
        {
            title: 'Bake cake',
            description: 'Bake cake for my brother',
            done: false
        },
        {
            title: 'Look for a job',
            description: 'Gotta make that monneeeyy',
            done: false
        },
        {
            title: 'Procrastinate',
            description: 'Just kidding!',
            done: false
        }
    ];

    var creatingTasks = tasks.map(function (tasksObj) {
        return Tasks.create(tasksObj);
    });

    return Promise.all(creatingTasks);

};

db.sync({ force: true })
    .then(function () {
        return seedUsers();
    })
    .then(function () {
        console.log(chalk.green('Seed successful!'));
        process.exit(0);
    })
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });
