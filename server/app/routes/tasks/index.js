'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
module.exports = router;

var Tasks = require('../../../db/models/tasks.js')

router.get('/', function(req,res,next){
	Tasks.findAll({})
		.then(function(allTasks){
			console.log(allTasks)
			res.json(allTasks)
		})
})

router.post('/', function(req,res,next){
	Tasks.create(req.body)
		.then(function(createdTask){
			res.status(201).send(createdTask);
		})
		.catch(next)
})

router.put('/:id', function(req,res,next){	
	Tasks.update(req.body, {
		where: {
			id: req.params.id
		}
	})
})

router.delete('/', function(req,res,next){
	Tasks.destroy({
		where: {
			done: true
		}
	})
})