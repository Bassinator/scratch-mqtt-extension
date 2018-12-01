/*This program is free software: you can redistribute it and/or modify
 *it under the terms of the GNU General Public License as published by
 *the Free Software Foundation, either version 3 of the License, or
 *(at your option) any later version.
 *
 *This program is distributed in the hope that it will be useful,
 *but WITHOUT ANY WARRANTY; without even the implied warranty of
 *MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *GNU General Public License for more details.
 *
 *You should have received a copy of the GNU General Public License
 *along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function(ext) {

  var SERVICE_UUID = 'f005',
    OUTPUT_CHAR = '5261da01fa7e42ab850b7c80220097cc',
    LED_TEXT_CHAR = '5261da03fa7e42ab850b7c80220097cc',
    LED_MATRIX_CHAR = '5261da04fa7e42ab850b7c80220097cc';

  var BTN_UP = 0,
    BTN_DOWN = 1,
    BTN_HELD = 2;

  var BUFFER_SIZE = 2;

  var symbols2hex =  {
    '❤': 0xAAC544,
    '♫': 0xF4AF78,
    '☓': 0x1151151,
    '✓': 0x8A88,
    '↑': 0x477C84,
    '↓': 0x427DC4,
    '←': 0x467D84,
    '→': 0x437CC4,
    '◯': 0xE8C62E,
    '☀': 0x1577DD5,
    '☺': 0x5022E,
    '!': 0x421004,
    '?': 0xC91004
  };

  var device = null;

  var buttonState = {A: 0, B: 0};
  var tiltX = 0;
  var tiltY = 1;
  var gestureStates = 0;
  var ledMatrixState = [0, 0, 0, 0, 0];
  var pinStates = [0, 0, 0];

  var rx = {};
  rx[OUTPUT_CHAR] = {notify: true};

  var tx = {};
  tx[LED_TEXT_CHAR] = {};
  tx[LED_MATRIX_CHAR] = {};

  var device_info = {uuid: [SERVICE_UUID]};
  device_info["read_characteristics"] = rx;
  device_info["write_characteristics"] = tx;

  function processInput(inputData) {
    //console.log(inputData);

    tiltX = inputData[1] | (inputData[0] << 8);
    if (tiltX > (1 << 15)) tiltX -= (1 << 16);
    tiltY = inputData[3] | (inputData[2] << 8);
    if (tiltY > (1 << 15)) tiltY -= (1 << 16);

    buttonState['A'] = inputData[4];
    buttonState['B'] = inputData[5];

    pinStates[0] = inputData[6];
    pinStates[1] = inputData[7];
    pinStates[2] = inputData[8];

    gestureStates = inputData[9];
  }

  function getTilt(dir) {
    if (dir === 'left')
      return Math.round(tiltX / -10);
    else if (dir == 'right')
      return Math.round(tiltX / 10);
    else if (dir == 'up')
      return Math.round(tiltY / -10);
    else if (dir == 'down')
      return Math.round(tiltY / 10);
  }

  function map(val, aMin, aMax, bMin, bMax) {
    if (val > aMax) val = aMax;
    else if (val < aMin) val = aMin;
    return (((bMax - bMin) * (val - aMin)) / (aMax - aMin)) + bMin;
  }

  ext.whenButtonPressed = function(btn) {
    if (btn === 'any')
      return buttonState['A'] == BTN_DOWN | buttonState['B'] == BTN_DOWN;
    return buttonState[btn] == BTN_DOWN;
  };

  ext.whenPinConnected = function(pin) {
    pin = parseInt(pin);
    if (isNaN(pin) | pin < 0 | pin > 3) return;
    return pinStates[pin];
  };

  ext.writeText = function(output) {
    // Make sure no more than 20 characters are written
    output = output.toString().substring(0, 20);
    device.emit('write', {uuid: LED_TEXT_CHAR, bytes: output.substring(0, 20)});
  };

  function printSymbol(hex) {
    if (!device) return;
    var output = [0, 0, 0, 0, 0];
    output[0] = (hex >> 20) & 0x1F;
    output[1] = (hex >> 15) & 0x1F;
    output[2] = (hex >> 10) & 0x1F;
    output[3] = (hex >> 5) & 0x1F;
    output[4] = hex & 0x1F;
    device.emit('write', {uuid: LED_MATRIX_CHAR, bytes: output});
  };

  ext.displaySymbol = function(symbol) {
    var hex = symbols2hex[symbol];
    printSymbol(hex);
  };

  ext.setMatrixLED = function(col, row, state) {
    if (col === 'random') col = getRandomLED();
    if (row === 'random') row = getRandomLED();
    col = parseInt(col);
    if (isNaN(col) | col < 1 | col > 5) return;
    row = parseInt(row);
    if (isNaN(row) | row < 1 | row > 5) return;
    if (state === 'on')
      ledMatrixState[row-1] |= 1 << 5-col;
    else if (state === 'off')
      ledMatrixState[row-1] &= ~(1 << 5-col);
    device.emit('write', {uuid: LED_MATRIX_CHAR, bytes: ledMatrixState});
  };

  function getRandomLED() {
    return Math.floor(Math.random() * (5)) + 1;
  }

  ext.clearAllMatrixLEDs = function() {
    for (var i=0; i<5; i++)
      ledMatrixState[i] = 0;
    device.emit('write', {uuid: LED_MATRIX_CHAR, bytes: ledMatrixState});
  };

  ext.whenMoved = function() {
    return (gestureStates >> 2) & 1;
  };

  ext.whenShaken = function() {
    return gestureStates & 1;
  };

  ext.whenJumped = function() {
    return (gestureStates >> 1) & 1;
  };

  ext.whenTilted = function(dir) {
    if (dir === 'any')
      return Math.abs(getTilt('right')) > 45 || Math.abs(getTilt('up')) > 45;
    else
      return getTilt(dir) > 45;
  };

  ext.isTilted = function(dir) {
    if (dir === 'any')
      return Math.abs(getTilt('right')) > 45 || Math.abs(getTilt('up')) > 45;
    else
      return getTilt(dir) > 45;
  };

  ext.tiltDirection = function(dir) {
    return getTilt(dir);
  };

  ext._getStatus = function() {
    if (device) {
      if (device.is_open()) {
        return {status: 2, msg: 'micro:bit connected'};
      } else {
        return {status: 1, msg: 'micro:bit connecting...'};
      }
    } else {
      return {status: 1, msg: 'micro:bit disconnected'};
    }
  };

  ext._deviceConnected = function(dev) {
    if (device) return;
    device = dev;
    device.open(function(d) {
      if (device == d) {
        device.on(OUTPUT_CHAR, function(bytes) {
          processInput(bytes.data);
        });
      } else if (d) {
        console.log('Received open callback for wrong device');
      } else {
        console.log('Opening device failed');
        device = null;
      }
    });
  };

  ext._deviceRemoved = function(dev) {
    rawData = [];
    if (device != dev) return;
    device = null;
  };

  ext._shutdown = function() {
    if (device) device.close();
    device = null;
  };

  var blocks = [
    ['h', 'when %m.btns button pressed', 'whenButtonPressed', 'A'],
    [' '],
    ['h', 'when moved', 'whenMoved'],
    ['h', 'when shaken', 'whenShaken'],
    ['h', 'when jumped', 'whenJumped'],
    [' '],
    [' ', 'display %s', 'writeText', 'Hello!'],
    [' ', 'display %m.symbols','displaySymbol','❤'],
    [' '],
    [' ', 'set light x:%d.rowcol y:%d.rowcol %m.ledState', 'setMatrixLED', 1, 1, 'on'],
    [' ', 'set all lights off' ,'clearAllMatrixLEDs'],
    [' '],
    ['h', 'when tilted %m.dirs', 'whenTilted', 'any'],
    ['b', 'tilted %m.dirs?', 'isTilted', 'any'],
    ['r', 'tilt angle %m.tiltDirs', 'tiltDirection', 'right'],
    [' '],
    ['h', 'when pin %d.touchPins connected', 'whenPinConnected', '0']
  ];

  var menus = {
    dirs: ['any', 'right', 'left', 'up', 'down'],
    btns: ['A', 'B', 'any'],
    ledState: ['on', 'off'],
    touchPins: [0, 1, 2],
    tiltDirs: ['right', 'left', 'up', 'down'],
    rowcol: [1, 2, 3, 4, 5, 'random'],
    symbols: ['❤', '♫', '☓', '✓', '↑', '↓', '←', '→', '◯', '☀', '☺', '!', '?']
  };

  var descriptor = {
    blocks: blocks,
    menus: menus,
    url: 'https://lancaster-university.github.io/microbit-docs'
  };

  ScratchExtensions.register('micro:bit', descriptor, ext, {info: device_info, type: 'ble'});
})({});
