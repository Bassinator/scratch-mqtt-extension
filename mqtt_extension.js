/* Extension demonstrating a hat block */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, May 2014 */

new (function() {

  $.getScript("https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.js", function( data, textStatus, jqxhr ) {
  console.log( data ); // Data returned
  console.log( textStatus ); // Success
  console.log( jqxhr.status ); // 200
  console.log( "Load was performed." );
  });
  $.getScript("https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js", function(){});

  var mqtt;
  var reconnectTimeout = 2000;
  var messagePayload = '';

  host = 'localhost';
  port = 9001;
  topic = '/scratchExtensionTopic';		// topic to subscribe to
  useTLS = false;
  username = null;
  password = null;
  cleansession = true;

  console.log("timeout=" + reconnectTimeout);


  function MQTTconnect() {

    if (typeof path == "undefined") {
      path = '/mqtt';
      console.log("path=" + path);
    };


    mqtt = new Paho.MQTT.Client(
      host,
      port,
      "web_" + parseInt(Math.random() * 100, 10)
    );

    var options = {
      timeout: 3,
      useSSL: useTLS,
      cleanSession: cleansession,
      onSuccess: onConnect,
      onFailure: function (message) {
          $('#status').val("Connection failed: " + message.errorMessage + "Retrying");
          setTimeout(MQTTconnect, reconnectTimeout);
    }
  };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;

    if (username != null) {
        options.userName = username;
        options.password = password;
    }
    console.log("Host="+ host + ", port=" + port + ", path=" + path + " TLS = " + useTLS + " username=" + username + " password=" + password);
    mqtt.connect(options);
  }

  MQTTconnect();


    function onMessageArrived(message) {
        console.log("message arrived " + message.payloadString);
        var topic = message.destinationName;
        messagePayload = message.payloadString;
        message_arrived = true;
    };

    function onConnect() {
        console.log("trying to connect");
        $('#status').val('Connected to ' + host + ':' + port + path);
        // Connection succeeded; subscribe to our topic
        mqtt.subscribe(topic, {qos: 0});
        $('#topic').val(topic);

    };


    function onConnectionLost(response) {
        setTimeout(MQTTconnect, reconnectTimeout);
        $('#status').val("connection lost: " + response.errorMessage + ". Reconnecting");
    };

    var ext = this;
    var message_arrived = false; // This becomes true after a new message arrived

    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    ext.last_message = function() {
      var lastMessage = messagePayload;
      messagePayload = '';
      return lastMessage;
    }

    ext.send_message = function(message) {
      //console.log("trying to published message");
      mqtt.send(topic, message);
      console.log("message published");
    };

    ext.when_message_arrived = function() {
       // Reset alarm_went_off if it is true, and return true
       // otherwise, return false
       if (message_arrived === true) {
           message_arrived = false;
           return true;
       }
       return false;
    };


    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['', 'send message %s', 'send_message', 'message'],
            ['r', 'las message', 'last_message'],
            ['h', 'when new message arrived', 'when_message_arrived'],
        ]
    };

    // Register the extension
    ScratchExtensions.register('Alarm extension', descriptor, ext);
})();
