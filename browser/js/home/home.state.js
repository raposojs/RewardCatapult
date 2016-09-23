app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: 'HomeCtrl',
        resolve: {
        	tasks: function(HomeFactory){
                return  HomeFactory.getAll();
        	}
        }
    });
});
