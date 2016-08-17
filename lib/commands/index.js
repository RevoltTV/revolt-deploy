'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _deploy = require('./deploy');

var _deploy2 = _interopRequireDefault(_deploy);

var _docker = require('./docker');

var _docker2 = _interopRequireDefault(_docker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
    deploy: _deploy2.default,
    docker: _docker2.default
};
module.exports = exports['default'];