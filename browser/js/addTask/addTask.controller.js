'use strict';

app.controller('AddTaskCtrl', function($scope, $http, $state, $mdDialog, AddTaskFactory){

	// $scope.tasks = tasks.data

	$scope.addNewTask = function(){
		
		var newTask = {
			title : $scope.task.title,
			description : $scope.task.description
		}

		AddTaskFactory.createTask(newTask)
			.then(function(taskCreated){
				console.log(taskCreated)
				$state.go('home')
			})
			.catch(console.error.bind(console))
	}
	
})

