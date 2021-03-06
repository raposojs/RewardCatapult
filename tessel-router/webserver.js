// Import the interface to Tessel hardware
var tessel = require('tessel');
// Load the http module to create an http server.
var http = require('http');

// Configure our HTTP server to respond with "Hello from Tessel!" to all requests.
var server = http.createServer(function (request, response) {

  var tessel = require('tessel');
  var servolib = require('servo-pca9685');

  var servo = servolib.use(tessel.port['A']);

  var servo1 = 1; // We have a servo plugged in at position 1

servo.on('ready', function () {
  var position = 0;  //  Target position of the servo between 0 (min) and 1 (max).
  var times = 0;
  
  servo.configure(servo1, 0.01, 0.11, function () {


    function setIntervalX(callback, delay, repetitions) {
        var x = 0;
        var intervalID = setInterval(function () {

           callback();

           if (++x === repetitions) {
               clearInterval(intervalID);
           }
        }, delay);
    }

    setIntervalX(function () {
        
      console.log('Position (in range 0-1):', position);
      //  Set servo #1 to position pos.

      servo.move(servo1, position);
      times++
      // Increment by 10% (~18 deg for a normal servo)
      position += 0.95;
      if (position > 1) {
        position = 0; // Reset servo position
      }


    }, 1000, 2);


  });
});

});

// Listen on port 8080, IP defaults to 192.168.1.101. Also accessible through [tessel-name].local
server.listen(8080);

// Put a friendly message in the terminal
console.log("Server running at http://192.168.1.101:8080/");