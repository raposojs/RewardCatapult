'use strict';

window.app = angular.module('Rwardit', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ngAria', 'ngMessages', 'ngMaterial']);

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

app.controller('HomeCtrl', function ($scope, $http, $state, $mdDialog, tasks, HomeFactory) {

    $scope.tasks = tasks.data;

    $scope.launch = HomeFactory.launch;
    $scope.shake = HomeFactory.shake;
    $scope.checkbox = HomeFactory.checkBox;

    $scope.clear = HomeFactory.deleteComplete;

    $scope.showDetails = function (title, description) {
        $mdDialog.show($mdDialog.alert().title(title).textContent(description).ok('Got It!'));
    };

    $scope.testFunc = function () {
        // console.log("S")
        return $http.get('/api/tasks/servo');
    };

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
        },
        deleteComplete: function deleteComplete() {
            console.log("DELETEEE");
            return $http.delete('/api/tasks');
        },
        launch: function launch() {},
        shake: function shake() {},
        taskToComplete: function taskToComplete(task) {
            // return $http.get('/api/tasks')
        },
        checkBox: function checkBox(task) {
            // console.log("asdad",this.taskArray)
            this.launch();
            this.shake();
            // this.taskToComplete(task)
            return $http.put('/api/tasks/' + task.id, { done: !task.done });
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

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFkZFRhc2svYWRkVGFzay5jb250cm9sbGVyLmpzIiwiYWRkVGFzay9hZGRUYXNrLmZhY3RvcnkuanMiLCJhZGRUYXNrL2FkZFRhc2suc3RhdGUuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmZhY3RvcnkuanMiLCJob21lL2hvbWUuc3RhdGUuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIm5hbWUiLCJjb250cm9sbGVyIiwiJHNjb3BlIiwiJGh0dHAiLCIkbWREaWFsb2ciLCJBZGRUYXNrRmFjdG9yeSIsIkhvbWVGYWN0b3J5IiwiYWRkTmV3VGFzayIsIm5ld1Rhc2siLCJ0aXRsZSIsInRhc2siLCJkZXNjcmlwdGlvbiIsImNyZWF0ZVRhc2siLCJ0YXNrQ3JlYXRlZCIsImNhdGNoIiwiY29uc29sZSIsImVycm9yIiwiYmluZCIsImZhY3RvcnkiLCJ0YXNrT2JqIiwicG9zdCIsImNyZWF0ZWRUYXNrIiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsIkVycm9yIiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsInNlc3Npb25JZCIsInRhc2tzIiwibGF1bmNoIiwic2hha2UiLCJjaGVja2JveCIsImNoZWNrQm94IiwiY2xlYXIiLCJkZWxldGVDb21wbGV0ZSIsInNob3dEZXRhaWxzIiwic2hvdyIsImFsZXJ0IiwidGV4dENvbnRlbnQiLCJvayIsInRlc3RGdW5jIiwiZ2V0QWxsIiwiYWRkVGFzayIsImxvZyIsImRlbGV0ZSIsInRhc2tUb0NvbXBsZXRlIiwicHV0IiwiaWQiLCJkb25lIiwicmVzb2x2ZSIsImdldFJhbmRvbUZyb21BcnJheSIsImFyciIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsImxlbmd0aCIsImdyZWV0aW5ncyIsImdldFJhbmRvbUdyZWV0aW5nIiwiZGlyZWN0aXZlIiwicmVzdHJpY3QiLCJzY29wZSIsImxpbmsiLCJpdGVtcyIsImlzTG9nZ2VkSW4iLCJzZXRVc2VyIiwicmVtb3ZlVXNlciIsIlJhbmRvbUdyZWV0aW5ncyIsImdyZWV0aW5nIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsU0FBQSxFQUFBLENBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUFGLElBQUFHLE1BQUEsQ0FBQSxVQUFBQyxrQkFBQSxFQUFBQyxpQkFBQSxFQUFBO0FBQ0E7QUFDQUEsc0JBQUFDLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQUYsdUJBQUFHLFNBQUEsQ0FBQSxHQUFBO0FBQ0E7QUFDQUgsdUJBQUFJLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQVQsZUFBQVUsUUFBQSxDQUFBQyxNQUFBO0FBQ0EsS0FGQTtBQUdBLENBVEE7O0FBV0E7QUFDQVYsSUFBQVcsR0FBQSxDQUFBLFVBQUFDLFVBQUEsRUFBQUMsV0FBQSxFQUFBQyxNQUFBLEVBQUE7O0FBRUE7QUFDQSxRQUFBQywrQkFBQSxTQUFBQSw0QkFBQSxDQUFBQyxLQUFBLEVBQUE7QUFDQSxlQUFBQSxNQUFBQyxJQUFBLElBQUFELE1BQUFDLElBQUEsQ0FBQUMsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBTixlQUFBTyxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBQyxLQUFBLEVBQUFDLE9BQUEsRUFBQUMsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQVAsNkJBQUFNLE9BQUEsQ0FBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsWUFBQVIsWUFBQVUsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBSCxjQUFBSSxjQUFBOztBQUVBWCxvQkFBQVksZUFBQSxHQUFBQyxJQUFBLENBQUEsVUFBQUMsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Es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VUFBQSxHQUFBO0FBQ0FMLHNCQUFBOUYsSUFBQSxHQUFBLElBQUE7QUFDQSxhQUZBOztBQUlBa0c7O0FBRUFqSCx1QkFBQU8sR0FBQSxDQUFBOEMsWUFBQVAsWUFBQSxFQUFBbUUsT0FBQTtBQUNBakgsdUJBQUFPLEdBQUEsQ0FBQThDLFlBQUFMLGFBQUEsRUFBQWtFLFVBQUE7QUFDQWxILHVCQUFBTyxHQUFBLENBQUE4QyxZQUFBSixjQUFBLEVBQUFpRSxVQUFBO0FBRUE7O0FBekNBLEtBQUE7QUE2Q0EsQ0EvQ0E7O0FDQUE5SCxJQUFBdUgsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBQyxrQkFBQSxHQURBO0FBRUFuRSxxQkFBQTtBQUZBLEtBQUE7QUFJQSxDQUxBOztBQ0FBckQsSUFBQXVILFNBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQVEsZUFBQSxFQUFBOztBQUVBLFdBQUE7QUFDQVAsa0JBQUEsR0FEQTtBQUVBbkUscUJBQUEseURBRkE7QUFHQXFFLGNBQUEsY0FBQUQsS0FBQSxFQUFBO0FBQ0FBLGtCQUFBTyxRQUFBLEdBQUFELGdCQUFBVCxpQkFBQSxFQUFBO0FBQ0E7QUFMQSxLQUFBO0FBUUEsQ0FWQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdSd2FyZGl0JywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsICduZ0FyaWEnLCAnbmdNZXNzYWdlcycsICduZ01hdGVyaWFsJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFwcC5jb250cm9sbGVyKCdBZGRUYXNrQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHAsICRzdGF0ZSwgJG1kRGlhbG9nLCBBZGRUYXNrRmFjdG9yeSwgSG9tZUZhY3Rvcnkpe1xuXG5cdC8vICRzY29wZS50YXNrcyA9IHRhc2tzLmRhdGFcblx0Ly8gJHNjb3BlLnRhc2tBcnJheSA9IEhvbWVGYWN0b3J5LnRhc2tBcnJheVxuXG5cdCRzY29wZS5hZGROZXdUYXNrID0gZnVuY3Rpb24oKXtcblx0XHRcblx0XHR2YXIgbmV3VGFzayA9IHtcblx0XHRcdHRpdGxlIDogJHNjb3BlLnRhc2sudGl0bGUsXG5cdFx0XHRkZXNjcmlwdGlvbiA6ICRzY29wZS50YXNrLmRlc2NyaXB0aW9uXG5cdFx0fVxuXG5cdFx0QWRkVGFza0ZhY3RvcnkuY3JlYXRlVGFzayhuZXdUYXNrKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24odGFza0NyZWF0ZWQpe1xuXHRcdFx0XHQvLyAkc2NvcGUudGFza0FycmF5LnB1c2godGFza0NyZWF0ZWQuZGF0YSlcblx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpKVxuXHR9XG5cdFxufSlcblxuIiwiYXBwLmZhY3RvcnkoJ0FkZFRhc2tGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xuXHRyZXR1cm4ge1xuXHRcdGNyZWF0ZVRhc2s6IGZ1bmN0aW9uKHRhc2tPYmope1xuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvdGFza3MnLCB0YXNrT2JqKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihjcmVhdGVkVGFzayl7XG5cdFx0XHRcdFx0cmV0dXJuIGNyZWF0ZWRUYXNrXG5cdFx0XHRcdH0pXG5cdFx0fVxuXHR9XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWRkVGFzaycsIHtcbiAgICAgICAgdXJsOiAnL2FkZFRhc2snLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkZFRhc2svYWRkVGFzay5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FkZFRhc2tDdHJsJyxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICB9KVxuXG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwLCAkc3RhdGUsICRtZERpYWxvZywgdGFza3MsIEhvbWVGYWN0b3J5KXtcblxuXG5cdCRzY29wZS50YXNrcyA9IHRhc2tzLmRhdGFcblx0XG5cdCRzY29wZS5sYXVuY2ggPSBIb21lRmFjdG9yeS5sYXVuY2hcblx0JHNjb3BlLnNoYWtlID0gSG9tZUZhY3Rvcnkuc2hha2Vcblx0JHNjb3BlLmNoZWNrYm94ID0gSG9tZUZhY3RvcnkuY2hlY2tCb3hcblxuXG5cdCRzY29wZS5jbGVhciA9IEhvbWVGYWN0b3J5LmRlbGV0ZUNvbXBsZXRlXG5cblxuXHQkc2NvcGUuc2hvd0RldGFpbHMgPSBmdW5jdGlvbih0aXRsZSxkZXNjcmlwdGlvbikge1xuXHQgICRtZERpYWxvZy5zaG93KFxuXHQgICAgJG1kRGlhbG9nLmFsZXJ0KClcblx0ICAgICAgLnRpdGxlKHRpdGxlKVxuXHQgICAgICAudGV4dENvbnRlbnQoZGVzY3JpcHRpb24pXG5cdCAgICAgIC5vaygnR290IEl0IScpXG5cdCAgKTtcblx0fTtcblxuXHQkc2NvcGUudGVzdEZ1bmMgPSBmdW5jdGlvbigpe1xuXHRcdC8vIGNvbnNvbGUubG9nKFwiU1wiKVxuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdGFza3Mvc2Vydm8nKVxuXHR9XG5cdFxuXHQvLyAkc2NvcGUuVGVzc2VsID0gcmVxdWlyZSgnLi4vLi4vLi4vc2Vydm8uanMnKVxuXHQvLyAkc2NvcGUudGVzdCA9ICRzY29wZS5UZXNzZWwudGVzdFxuXG59KVxuXG4iLCJhcHAuZmFjdG9yeSgnSG9tZUZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0Z2V0QWxsOiBmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS90YXNrcycpXG5cdFx0fSxcblx0XHRhZGRUYXNrOiBmdW5jdGlvbigpe1xuXHRcdFx0Ly8gY29uc29sZS5sb2cocmVxLmJvZHkuZGF0YSlcblx0XHRcdC8vIHRoaXMudGFza0FycmF5LnB1c2gocmVxLmJvZHkuZGF0YSlcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiY29tYXNvbWRhXCIsIHRoaXMudGFza0FycmF5KVxuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvdGFza3MnKVxuXHRcdH0sXG5cdFx0ZGVsZXRlQ29tcGxldGU6IGZ1bmN0aW9uKCl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIkRFTEVURUVFXCIpXG5cdFx0XHRyZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3Rhc2tzJylcblx0XHR9LFxuXHRcdGxhdW5jaDogZnVuY3Rpb24oKXtcblxuXHRcdH0sXG5cdFx0c2hha2U6IGZ1bmN0aW9uKCl7XG5cblx0XHR9LFxuXHRcdHRhc2tUb0NvbXBsZXRlOiBmdW5jdGlvbih0YXNrKXtcblx0XHRcdC8vIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdGFza3MnKVxuXHRcdH0sXG5cdFx0Y2hlY2tCb3g6IGZ1bmN0aW9uKHRhc2spe1xuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJhc2RhZFwiLHRoaXMudGFza0FycmF5KVxuXHRcdFx0dGhpcy5sYXVuY2goKVxuXHRcdFx0dGhpcy5zaGFrZSgpXG5cdFx0XHQvLyB0aGlzLnRhc2tUb0NvbXBsZXRlKHRhc2spXG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL3Rhc2tzLycgKyB0YXNrLmlkLCB7ZG9uZTogIXRhc2suZG9uZX0pXG5cdFx0fVxuXHR9XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHRhc2tzOiBmdW5jdGlvbihIb21lRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICBIb21lRmFjdG9yeS5nZXRBbGwoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCcsXG4gICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4gICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4gICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAnbWVtYmVyc09ubHknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
