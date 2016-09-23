'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
module.exports = router;

router.use('/members', require('./members'));
router.use('/tasks', require('./tasks'))
// Make sure this is after all of
// the registered routes!

// router.get('/', function(req,res,next){
// 	res.send("JOSJSOJ")
// })

router.use(function (req, res) {
    res.status(404).end();
});
