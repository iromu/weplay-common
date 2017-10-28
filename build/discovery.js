'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _DiscoveryServer = require('./DiscoveryServer');

var _DiscoveryServer2 = _interopRequireDefault(_DiscoveryServer);

var _DiscoveryClient = require('./DiscoveryClient');

var _DiscoveryClient2 = _interopRequireDefault(_DiscoveryClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Discovery = function () {
  function Discovery() {
    _classCallCheck(this, Discovery);
  }

  _createClass(Discovery, [{
    key: 'server',
    value: function server(options, cb) {
      this.server = new _DiscoveryServer2.default(options, cb);
      return this.server;
    }
  }, {
    key: 'client',
    value: function client(options, cb) {
      this.client = new _DiscoveryClient2.default(options, cb);
      return this.client;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.server.destroy();
      this.client.destroy();
    }
  }]);

  return Discovery;
}();

exports.default = Discovery;