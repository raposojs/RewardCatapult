'use strict';

app.controller('HomeCtrl', function($scope, $http, $state, $mdDialog, tasks, HomeFactory){


	$scope.tasks = tasks.data
	
	$scope.launch = HomeFactory.launch
	$scope.shake = HomeFactory.shake
	$scope.checkbox = HomeFactory.checkBox


	$scope.clear = HomeFactory.deleteComplete


	$scope.showDetails = function(title,description) {
	  $mdDialog.show(
	    $mdDialog.alert()
	      .title(title)
	      .textContent(description)
	      .ok('Got It!')
	  );
	};

	$scope.testFunc = function(){
		// console.log("S")
		return $http.get('/api/tasks/servo')
	}
	
	// $scope.Tessel = require('../../../servo.js')
	// $scope.test = $scope.Tessel.test

})

