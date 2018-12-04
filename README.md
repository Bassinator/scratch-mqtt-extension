# scratch-mqtt-extension

Scratch extension to send an receive mqtt messages

## Limitations
### Hard Coded configs
- mqtt_broker: test.mosquitto.ort:8080 (unsecure websocket)
- mqtt_topic: /scratchExtensionTopic

### Works only via http not https
Because the extension connects to unseciure websocket it will only work on http://scratchx.org not https://scratchx.org
