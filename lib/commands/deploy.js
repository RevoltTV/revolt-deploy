'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _docker = require('./docker');

var _docker2 = _interopRequireDefault(_docker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
    console.log('\n' + _chalk2.default.bold('deploying ' + _config2.default.get('name') + '@' + _config2.default.get('version')) + '\n');

    return _docker2.default.build().then(function () {
        return _docker2.default.tag(_config2.default.get('version'));
    }).catch(function (err) {
        console.error('\n' + _chalk2.default.bold.red('ERROR:') + ' ' + err.message + '\n' + err.stack.replace('Error: ' + err.message + '\n', ''));
        return process.exit(1);
    });
};

module.exports = exports['default'];