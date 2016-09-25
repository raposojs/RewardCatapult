app.factory('HomeFactory', function($http){
	return {
		getAll: function(){
			return $http.get('/api/tasks')
		},
		addTask: function(){
			// console.log(req.body.data)
			// this.taskArray.push(req.body.data)
			// console.log("comasomda", this.taskArray)
			return $http.post('/api/tasks')
		},
		// deleteComplete: function(){
		// 	console.log("DELETEEE")
		// 	return $http.delete('/api/tasks')
		// },
		// launch: function(){
		// 	return $http.get('api/tasks/servo')
		// },
		// shake: function(){

		// },
		// taskToComplete: function(task){
		// 	// return $http.get('/api/tasks')
		// },
		// checkBox: function(task){
		// 	// console.log("asdad",this.taskArray)
		// 	// $scope.showCompleted = true
		// 	this.launch()
		// 	this.shake()
		// 	// this.taskToComplete(task)
		// 	return $http.put('/api/tasks/' + task.id, {done: !task.done})
		// }
	}
})