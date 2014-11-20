var adb = require('adbkit');
var path = require('path');
var util = require('util');
var exec = require('./exec');
var config = require('./config.json');

var Orng = function(deviceId, callback) {
  if (!(this instanceof Orng)) {
    return new Orng(deviceId, callback);
  }

  var orng = this;

  if (typeof deviceId === 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.client = adb.createClient();

  this.client
    .listDevices()
    .then(function(devices) {
      if (!deviceId) {
        orng.device = devices[0];
      } else {
        devices.forEach(function(device) {
          if (device.id === deviceId) {
            orng.device = device;
          }
        });
      }

      orng.client
        .getProperties(orng.device.id)
        .then(function(properties) {
          orng.deviceName = properties['ro.product.model'];
          return orng.install()
        })
        .then(function() {
          callback.call(orng, orng);
        });
    });
};

Orng.prototype.install = function() {
  return this.client.push(this.device.id,
    path.join(__dirname, 'orng'),
    '/data/local/orng');
};

Orng.prototype.trigger = function() {
  return this.client.shell([
    '/data/local/orng',
    config[orng.deviceName].inputDevice,
    '/data/local/tmp/orng-cmd'
  ]);
};

Orng.prototype.copyCommand = function(command) {
  var script = util.format('echo "%s" > /data/local/tmp/orng-cmd', command);
  return this.client.shell(this.device.id, script);
};

Object
  .keys(config.events)
  .forEach(function(event) {
    Orng.prototype[event] = function() {
      var orng = this;
      var args = [config.events[event]].concat([].slice.call(arguments));
      return this
        .copyCommand(util.format.apply(util, args))
        .then(function() {
          return orng.trigger();
        });
    };
  });

module.exports = Orng;