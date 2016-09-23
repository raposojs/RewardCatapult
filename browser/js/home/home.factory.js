app.factory('HomeFactory', function($http){
	return {
		getAll: function(){
			return $http.get('/api/tasks')
		},
		addTask: function(){
			return $http.post('/api/tasks')
		},
		deleteComplete: function(){
			console.log("DELETEEE")
			return $http.delete('/api/tasks')
		},
		launch: function(){
			console.log("LOL")
		},
		shake: function(){

		},
		checkBox: function(task){
			this.launch()
			this.shake()
			return $http.put('/api/tasks/' + task.id, {done: !task.done})
		}
	}
})