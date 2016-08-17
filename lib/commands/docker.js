'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _execa = require('execa');

var _execa2 = _interopRequireDefault(_execa);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function build() {
    process.stdout.write('building docker image');

    var progressInterval = setInterval(function () {
        process.stdout.write('.');
    }, 5000);

    return (0, _execa2.default)('docker', ['build', '-t ' + _config2.default.get('name') + ':latest']).then(function () {
        clearInterval(progressInterval);
        process.stdout.write(_chalk2.default.bold.green('✓'));
    });
}

function tag() {
    console.log('\n' + _chalk2.default.bold('tagging Docker image') + '\n');

    return Promise.resolve();
}

exports.default = {
    build: build,
    tag: tag
};
module.exports = exports['default'];