'use strict';

app.controller('AddTaskCtrl', function($scope, $http, $state, $mdDialog, AddTaskFactory, HomeFactory){

	// $scope.tasks = tasks.data
	// $scope.taskArray = HomeFactory.taskArray

	$scope.addNewTask = function(){
		
		var newTask = {
			title : $scope.task.title,
			description : $scope.task.description
		}

		AddTaskFactory.createTask(newTask)
			.then(function(taskCreated){
				// $scope.taskArray.push(taskCreated.data)
				$state.go('home')
			})
			.catch(console.error.bind(console))
	}
	
})

