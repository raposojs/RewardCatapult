'use strict';

app.controller('HomeCtrl', function($scope, $http, $state, $mdDialog, tasks, HomeFactory){


	$scope.tasks = tasks.data
	$scope.clear = HomeFactory.deleteComplete
	$scope.launch = HomeFactory.launch
	$scope.shake = HomeFactory.shake
	$scope.checkbox = HomeFactory.checkBox

	$scope.showDetails = function(title,description) {
	  $mdDialog.show(
	    $mdDialog.alert()
	      .title(title)
	      .textContent(description)
	      .ok('Got It!')
	  );
	};
	
	// $scope.Tessel = require('../../../servo.js')
	// $scope.test = $scope.Tessel.test

})

