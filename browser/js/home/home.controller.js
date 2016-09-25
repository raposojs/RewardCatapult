'use strict';

app.controller('HomeCtrl', function($scope, $http, $state, $mdDialog, tasks, HomeFactory, $timeout){


	$scope.tasks = tasks.data
	// $scope.launch = HomeFactory.launch
	// $scope.shake = HomeFactory.shake
	// $scope.checkbox = HomeFactory.checkBox

	// $scope.showCompleted = false;

	// $scope.showCompletedToTrue = function(){
	// 	$scope.showCompleted = true
	// }

	$scope.showCompletedToFalse = function(){
		$scope.showCompleted = false;
	}

	$scope.clear = function(){
		return $http.delete('api/tasks')
	}

	$scope.showDetails = function(title,description) {
	  $mdDialog.show(
	    $mdDialog.alert()
	      .title(title)
	      .textContent(description)
	      .ok('Got It!')
	  );
	};

	$scope.launch = function(task){
		// return $http.get('api/tasks/servo')
	}



	$scope.checkbox = function(task){
		$scope.shake(task)
		
		$timeout(function(){return $scope.byebye(task)}, 3000)
		
		return $http.put('/api/tasks/' + task.id, {done: !task.done})
	}

	$scope.shake = function(task){
		task.shaky = true
	}

	$scope.byebye = function(task){
		task.shaky = false;
		task.byebye = true;
		$timeout(function(){return $scope.sendToComplete(task)}, 1000)
	}

	$scope.sendToComplete = function(task){
		task.complete = true;
		$scope.showCompleted = true;
		
		$scope.launch()
	}

	// $scope.testFunc = function(){
	// 	// console.log("S")
	// 	return $http.get('/api/tasks/servo')
	// }
	
	// $scope.Tessel = require('../../../servo.js')
	// $scope.test = $scope.Tessel.test

})

