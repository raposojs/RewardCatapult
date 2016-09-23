app.config(function ($stateProvider) {

    $stateProvider.state('addTask', {
        url: '/addTask',
        templateUrl: 'js/addTask/addTask.html',
        controller: 'AddTaskCtrl',
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
    })

});
