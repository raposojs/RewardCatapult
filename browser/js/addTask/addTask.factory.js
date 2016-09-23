app.factory('AddTaskFactory', function($http){
	return {
		createTask: function(taskObj){
			return $http.post('/api/tasks', taskObj)
				.then(function(createdTask){
					return createdTask
				})
		}
	}
})