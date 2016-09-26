'use strict';

window.app = angular.module('Tacklepult', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ngAria', 'ngMessages', 'ngMaterial']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
});

'use strict';

app.controller('AddTaskCtrl', function ($scope, $http, $state, $mdDialog, AddTaskFactory, HomeFactory) {

    // $scope.tasks = tasks.data
    // $scope.taskArray = HomeFactory.taskArray

    $scope.addNewTask = function () {

        var newTask = {
            title: $scope.task.title,
            description: $scope.task.description
        };

        AddTaskFactory.createTask(newTask).then(function (taskCreated) {
            // $scope.taskArray.push(taskCreated.data)
            $state.go('home');
        }).catch(console.error.bind(console));
    };
});

app.factory('AddTaskFactory', function ($http) {
    return {
        createTask: function createTask(taskObj) {
            return $http.post('/api/tasks', taskObj).then(function (createdTask) {
                return createdTask;
            });
        }
    };
});
app.config(function ($stateProvider) {

    $stateProvider.state('addTask', {
        url: '/addTask',
        templateUrl: 'js/addTask/addTask.html',
        controller: 'AddTaskCtrl'
    });
});

(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var user = response.data.user;
            Session.create(user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.user = null;

        this.create = function (sessionId, user) {
            this.user = user;
        };

        this.destroy = function () {
            this.user = null;
        };
    });
})();

'use strict';

app.controller('HomeCtrl', function ($scope, $http, $state, $mdDialog, tasks, HomeFactory, $timeout) {

    $scope.tasks = tasks.data;
    // $scope.launch = HomeFactory.launch
    // $scope.shake = HomeFactory.shake
    // $scope.checkbox = HomeFactory.checkBox

    // $scope.showCompleted = false;

    // $scope.showCompletedToTrue = function(){
    // 	$scope.showCompleted = true
    // }

    $scope.showCompletedToFalse = function () {
        $scope.showCompleted = false;
    };

    $scope.clear = function () {
        return $http.delete('api/tasks');
    };

    $scope.showDetails = function (title, description) {
        $mdDialog.show($mdDialog.alert().title(title).textContent(description).ok('Got It!'));
    };

    $scope.launch = function (task) {
        return $http.get('api/tasks/servo');
    };

    $scope.checkbox = function (task) {
        $scope.shake(task);

        $timeout(function () {
            return $scope.byebye(task);
        }, 3000);

        return $http.put('/api/tasks/' + task.id, { done: !task.done });
    };

    $scope.shake = function (task) {
        task.shaky = true;
    };

    $scope.byebye = function (task) {
        task.shaky = false;
        task.byebye = true;
        $scope.launch();
        $timeout(function () {
            return $scope.sendToComplete(task);
        }, 1000);
    };

    $scope.sendToComplete = function (task) {
        task.complete = true;
        $scope.showCompleted = true;
    };

    // $scope.testFunc = function(){
    // 	// console.log("S")
    // 	return $http.get('/api/tasks/servo')
    // }

    // $scope.Tessel = require('../../../servo.js')
    // $scope.test = $scope.Tessel.test
});

app.factory('HomeFactory', function ($http) {
    return {
        getAll: function getAll() {
            return $http.get('/api/tasks');
        },
        addTask: function addTask() {
            // console.log(req.body.data)
            // this.taskArray.push(req.body.data)
            // console.log("comasomda", this.taskArray)
            return $http.post('/api/tasks');
        }
    };
});
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: 'HomeCtrl',
        resolve: {
            tasks: function tasks(HomeFactory) {
                return HomeFactory.getAll();
            }
        }
    });
});

app.factory('FullstackPics', function () {
    return ['https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large', 'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg', 'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg', 'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg', 'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large', 'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large', 'https://pbs.twimg.com/media/CE-T75lWAAAmqqJ.jpg:large', 'https://pbs.twimg.com/media/CEvZAg-VAAAk932.jpg:large', 'https://pbs.twimg.com/media/CEgNMeOXIAIfDhK.jpg:large', 'https://pbs.twimg.com/media/CEQyIDNWgAAu60B.jpg:large', 'https://pbs.twimg.com/media/CCF3T5QW8AE2lGJ.jpg:large', 'https://pbs.twimg.com/media/CAeVw5SWoAAALsj.jpg:large', 'https://pbs.twimg.com/media/CAaJIP7UkAAlIGs.jpg:large', 'https://pbs.twimg.com/media/CAQOw9lWEAAY9Fl.jpg:large', 'https://pbs.twimg.com/media/B-OQbVrCMAANwIM.jpg:large', 'https://pbs.twimg.com/media/B9b_erwCYAAwRcJ.png:large', 'https://pbs.twimg.com/media/B5PTdvnCcAEAl4x.jpg:large', 'https://pbs.twimg.com/media/B4qwC0iCYAAlPGh.jpg:large', 'https://pbs.twimg.com/media/B2b33vRIUAA9o1D.jpg:large', 'https://pbs.twimg.com/media/BwpIwr1IUAAvO2_.jpg:large', 'https://pbs.twimg.com/media/BsSseANCYAEOhLw.jpg:large', 'https://pbs.twimg.com/media/CJ4vLfuUwAAda4L.jpg:large', 'https://pbs.twimg.com/media/CI7wzjEVEAAOPpS.jpg:large', 'https://pbs.twimg.com/media/CIdHvT2UsAAnnHV.jpg:large', 'https://pbs.twimg.com/media/CGCiP_YWYAAo75V.jpg:large', 'https://pbs.twimg.com/media/CIS4JPIWIAI37qu.jpg:large'];
});

app.factory('RandomGreetings', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = ['Hello, world!', 'At long last, I live!', 'Hello, simple human.', 'What a beautiful day!', 'I\'m like any other project, except that I am yours. :)', 'This empty string is for Lindsay Levine.', 'こんにちは、ユーザー様。', 'Welcome. To. WEBSITE.', ':D', 'Yes, I think we\'ve met before.', 'Gimme 3 mins... I just grabbed this really dope frittata', 'If Cooper could offer only one piece of advice, it would be to nevSQUIRREL!'];

    return {
        greetings: greetings,
        getRandomGreeting: function getRandomGreeting() {
            return getRandomFromArray(greetings);
        }
    };
});

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});

app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [
                // { label: 'Home', state: 'home' },
                // { label: 'About', state: 'about' },
                // { label: 'Documentation', state: 'docs' },
                // { label: 'Members Only', state: 'membersOnly', auth: true }
            ];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});

app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFkZFRhc2svYWRkVGFzay5jb250cm9sbGVyLmpzIiwiYWRkVGFzay9hZGRUYXNrLmZhY3RvcnkuanMiLCJhZGRUYXNrL2FkZFRhc2suc3RhdGUuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmZhY3RvcnkuanMiLCJob21lL2hvbWUuc3RhdGUuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIm5hbWUiLCJjb250cm9sbGVyIiwiJHNjb3BlIiwiJGh0dHAiLCIkbWREaWFsb2ciLCJBZGRUYXNrRmFjdG9yeSIsIkhvbWVGYWN0b3J5IiwiYWRkTmV3VGFzayIsIm5ld1Rhc2siLCJ0aXRsZSIsInRhc2siLCJkZXNjcmlwdGlvbiIsImNyZWF0ZVRhc2siLCJ0YXNrQ3JlYXRlZCIsImNhdGNoIiwiY29uc29sZSIsImVycm9yIiwiYmluZCIsImZhY3RvcnkiLCJ0YXNrT2JqIiwicG9zdCIsImNyZWF0ZWRUYXNrIiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsIkVycm9yIiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsInNlc3Npb25JZCIsInRhc2tzIiwiJHRpbWVvdXQiLCJzaG93Q29tcGxldGVkVG9GYWxzZSIsInNob3dDb21wbGV0ZWQiLCJjbGVhciIsImRlbGV0ZSIsInNob3dEZXRhaWxzIiwic2hvdyIsImFsZXJ0IiwidGV4dENvbnRlbnQiLCJvayIsImxhdW5jaCIsImNoZWNrYm94Iiwic2hha2UiLCJieWVieWUiLCJwdXQiLCJpZCIsImRvbmUiLCJzaGFreSIsInNlbmRUb0NvbXBsZXRlIiwiY29tcGxldGUiLCJnZXRBbGwiLCJhZGRUYXNrIiwicmVzb2x2ZSIsImdldFJhbmRvbUZyb21BcnJheSIsImFyciIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsImxlbmd0aCIsImdyZWV0aW5ncyIsImdldFJhbmRvbUdyZWV0aW5nIiwiZGlyZWN0aXZlIiwicmVzdHJpY3QiLCJzY29wZSIsImxpbmsiLCJpdGVtcyIsImlzTG9nZ2VkSW4iLCJzZXRVc2VyIiwicmVtb3ZlVXNlciIsIlJhbmRvbUdyZWV0aW5ncyIsImdyZWV0aW5nIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsWUFBQSxFQUFBLENBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUFGLElBQUFHLE1BQUEsQ0FBQSxVQUFBQyxrQkFBQSxFQUFBQyxpQkFBQSxFQUFBO0FBQ0E7QUFDQUEsc0JBQUFDLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQUYsdUJBQUFHLFNBQUEsQ0FBQSxHQUFBO0FBQ0E7QUFDQUgsdUJBQUFJLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQVQsZUFBQVUsUUFBQSxDQUFBQyxNQUFBO0FBQ0EsS0FGQTtBQUdBLENBVEE7O0FBV0E7QUFDQVYsSUFBQVcsR0FBQSxDQUFBLFVBQUFDLFVBQUEsRUFBQUMsV0FBQSxFQUFBQyxNQUFBLEVBQUE7O0FBRUE7QUFDQSxRQUFBQywrQkFBQSxTQUFBQSw0QkFBQSxDQUFBQyxLQUFBLEVBQUE7QUFDQSxlQUFBQSxNQUFBQyxJQUFBLElBQUFELE1BQUFDLElBQUEsQ0FBQUMsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBTixlQUFBTyxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBQyxLQUFBLEVBQUFDLE9BQUEsRUFBQUMsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQVAsNkJBQUFNLE9BQUEsQ0FBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsWUFBQVIsWUFBQVUsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBSCxjQUFBSSxjQUFBOztBQUVBWCxvQkFBQVksZUFBQSxHQUFBQyxJQUFBLENBQUEsVUFB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aWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnVGFja2xlcHVsdCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAnbmdBcmlhJywgJ25nTWVzc2FnZXMnLCAnbmdNYXRlcmlhbCddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuY29udHJvbGxlcignQWRkVGFza0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwLCAkc3RhdGUsICRtZERpYWxvZywgQWRkVGFza0ZhY3RvcnksIEhvbWVGYWN0b3J5KXtcblxuXHQvLyAkc2NvcGUudGFza3MgPSB0YXNrcy5kYXRhXG5cdC8vICRzY29wZS50YXNrQXJyYXkgPSBIb21lRmFjdG9yeS50YXNrQXJyYXlcblxuXHQkc2NvcGUuYWRkTmV3VGFzayA9IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dmFyIG5ld1Rhc2sgPSB7XG5cdFx0XHR0aXRsZSA6ICRzY29wZS50YXNrLnRpdGxlLFxuXHRcdFx0ZGVzY3JpcHRpb24gOiAkc2NvcGUudGFzay5kZXNjcmlwdGlvblxuXHRcdH1cblxuXHRcdEFkZFRhc2tGYWN0b3J5LmNyZWF0ZVRhc2sobmV3VGFzaylcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHRhc2tDcmVhdGVkKXtcblx0XHRcdFx0Ly8gJHNjb3BlLnRhc2tBcnJheS5wdXNoKHRhc2tDcmVhdGVkLmRhdGEpXG5cdFx0XHRcdCRzdGF0ZS5nbygnaG9tZScpXG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKSlcblx0fVxuXHRcbn0pXG5cbiIsImFwcC5mYWN0b3J5KCdBZGRUYXNrRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRjcmVhdGVUYXNrOiBmdW5jdGlvbih0YXNrT2JqKXtcblx0XHRcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Rhc2tzJywgdGFza09iailcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oY3JlYXRlZFRhc2spe1xuXHRcdFx0XHRcdHJldHVybiBjcmVhdGVkVGFza1xuXHRcdFx0XHR9KVxuXHRcdH1cblx0fVxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2FkZFRhc2snLCB7XG4gICAgICAgIHVybDogJy9hZGRUYXNrJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hZGRUYXNrL2FkZFRhc2suaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBZGRUYXNrQ3RybCcsXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgfSlcblxufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZS5kYXRhLnVzZXI7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZSh1c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYXBwLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCwgJHN0YXRlLCAkbWREaWFsb2csIHRhc2tzLCBIb21lRmFjdG9yeSwgJHRpbWVvdXQpe1xuXG5cblx0JHNjb3BlLnRhc2tzID0gdGFza3MuZGF0YVxuXHQvLyAkc2NvcGUubGF1bmNoID0gSG9tZUZhY3RvcnkubGF1bmNoXG5cdC8vICRzY29wZS5zaGFrZSA9IEhvbWVGYWN0b3J5LnNoYWtlXG5cdC8vICRzY29wZS5jaGVja2JveCA9IEhvbWVGYWN0b3J5LmNoZWNrQm94XG5cblx0Ly8gJHNjb3BlLnNob3dDb21wbGV0ZWQgPSBmYWxzZTtcblxuXHQvLyAkc2NvcGUuc2hvd0NvbXBsZXRlZFRvVHJ1ZSA9IGZ1bmN0aW9uKCl7XG5cdC8vIFx0JHNjb3BlLnNob3dDb21wbGV0ZWQgPSB0cnVlXG5cdC8vIH1cblxuXHQkc2NvcGUuc2hvd0NvbXBsZXRlZFRvRmFsc2UgPSBmdW5jdGlvbigpe1xuXHRcdCRzY29wZS5zaG93Q29tcGxldGVkID0gZmFsc2U7XG5cdH1cblxuXHQkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpe1xuXHRcdHJldHVybiAkaHR0cC5kZWxldGUoJ2FwaS90YXNrcycpXG5cdH1cblxuXHQkc2NvcGUuc2hvd0RldGFpbHMgPSBmdW5jdGlvbih0aXRsZSxkZXNjcmlwdGlvbikge1xuXHQgICRtZERpYWxvZy5zaG93KFxuXHQgICAgJG1kRGlhbG9nLmFsZXJ0KClcblx0ICAgICAgLnRpdGxlKHRpdGxlKVxuXHQgICAgICAudGV4dENvbnRlbnQoZGVzY3JpcHRpb24pXG5cdCAgICAgIC5vaygnR290IEl0IScpXG5cdCAgKTtcblx0fTtcblxuXHQkc2NvcGUubGF1bmNoID0gZnVuY3Rpb24odGFzayl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3Rhc2tzL3NlcnZvJylcblx0fVxuXG5cblxuXHQkc2NvcGUuY2hlY2tib3ggPSBmdW5jdGlvbih0YXNrKXtcblx0XHQkc2NvcGUuc2hha2UodGFzaylcblx0XHRcblx0XHQkdGltZW91dChmdW5jdGlvbigpe3JldHVybiAkc2NvcGUuYnllYnllKHRhc2spfSwgMzAwMClcblx0XHRcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL3Rhc2tzLycgKyB0YXNrLmlkLCB7ZG9uZTogIXRhc2suZG9uZX0pXG5cdH1cblxuXHQkc2NvcGUuc2hha2UgPSBmdW5jdGlvbih0YXNrKXtcblx0XHR0YXNrLnNoYWt5ID0gdHJ1ZVxuXHR9XG5cblx0JHNjb3BlLmJ5ZWJ5ZSA9IGZ1bmN0aW9uKHRhc2spe1xuXHRcdHRhc2suc2hha3kgPSBmYWxzZTtcblx0XHR0YXNrLmJ5ZWJ5ZSA9IHRydWU7XG5cdFx0JHNjb3BlLmxhdW5jaCgpXG5cdFx0JHRpbWVvdXQoZnVuY3Rpb24oKXtyZXR1cm4gJHNjb3BlLnNlbmRUb0NvbXBsZXRlKHRhc2spfSwgMTAwMClcblx0fVxuXG5cdCRzY29wZS5zZW5kVG9Db21wbGV0ZSA9IGZ1bmN0aW9uKHRhc2spe1xuXHRcdHRhc2suY29tcGxldGUgPSB0cnVlO1xuXHRcdCRzY29wZS5zaG93Q29tcGxldGVkID0gdHJ1ZTtcblx0XHRcblx0XHRcblx0fVxuXG5cdC8vICRzY29wZS50ZXN0RnVuYyA9IGZ1bmN0aW9uKCl7XG5cdC8vIFx0Ly8gY29uc29sZS5sb2coXCJTXCIpXG5cdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS90YXNrcy9zZXJ2bycpXG5cdC8vIH1cblx0XG5cdC8vICRzY29wZS5UZXNzZWwgPSByZXF1aXJlKCcuLi8uLi8uLi9zZXJ2by5qcycpXG5cdC8vICRzY29wZS50ZXN0ID0gJHNjb3BlLlRlc3NlbC50ZXN0XG5cbn0pXG5cbiIsImFwcC5mYWN0b3J5KCdIb21lRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRnZXRBbGw6IGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Rhc2tzJylcblx0XHR9LFxuXHRcdGFkZFRhc2s6IGZ1bmN0aW9uKCl7XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhyZXEuYm9keS5kYXRhKVxuXHRcdFx0Ly8gdGhpcy50YXNrQXJyYXkucHVzaChyZXEuYm9keS5kYXRhKVxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJjb21hc29tZGFcIiwgdGhpcy50YXNrQXJyYXkpXG5cdFx0XHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS90YXNrcycpXG5cdFx0fSxcblx0XHQvLyBkZWxldGVDb21wbGV0ZTogZnVuY3Rpb24oKXtcblx0XHQvLyBcdGNvbnNvbGUubG9nKFwiREVMRVRFRUVcIilcblx0XHQvLyBcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdGFza3MnKVxuXHRcdC8vIH0sXG5cdFx0Ly8gbGF1bmNoOiBmdW5jdGlvbigpe1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3Rhc2tzL3NlcnZvJylcblx0XHQvLyB9LFxuXHRcdC8vIHNoYWtlOiBmdW5jdGlvbigpe1xuXG5cdFx0Ly8gfSxcblx0XHQvLyB0YXNrVG9Db21wbGV0ZTogZnVuY3Rpb24odGFzayl7XG5cdFx0Ly8gXHQvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Rhc2tzJylcblx0XHQvLyB9LFxuXHRcdC8vIGNoZWNrQm94OiBmdW5jdGlvbih0YXNrKXtcblx0XHQvLyBcdC8vIGNvbnNvbGUubG9nKFwiYXNkYWRcIix0aGlzLnRhc2tBcnJheSlcblx0XHQvLyBcdC8vICRzY29wZS5zaG93Q29tcGxldGVkID0gdHJ1ZVxuXHRcdC8vIFx0dGhpcy5sYXVuY2goKVxuXHRcdC8vIFx0dGhpcy5zaGFrZSgpXG5cdFx0Ly8gXHQvLyB0aGlzLnRhc2tUb0NvbXBsZXRlKHRhc2spXG5cdFx0Ly8gXHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL3Rhc2tzLycgKyB0YXNrLmlkLCB7ZG9uZTogIXRhc2suZG9uZX0pXG5cdFx0Ly8gfVxuXHR9XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHRhc2tzOiBmdW5jdGlvbihIb21lRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICBIb21lRmFjdG9yeS5nZXRBbGwoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCcsXG4gICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4gICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4gICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAnbWVtYmVyc09ubHknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
