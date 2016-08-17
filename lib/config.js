'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _convict = require('convict');

var _convict2 = _interopRequireDefault(_convict);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pkg = void 0;
try {
    pkg = require(_path2.default.join(process.cwd(), 'package.json'));
} catch (err) {
    console.error('' + _chalk2.default.red(_chalk2.default.bold('package.json') + ' was not found in ' + process.cwd()));
    console.error('' + _chalk2.default.bold.red('aborting'));
    process.exit(1);
}

var config = (0, _convict2.default)({
    env: {
        doc: 'environment configuration to use for this deployment',
        format: String,
        default: 'production',
        env: 'NODE_ENV',
        arg: 'env'
    },
    name: {
        doc: 'name of the package to be deployed',
        format: String,
        default: pkg.name,
        env: 'DEPLOYMENT_NAME',
        arg: 'name'
    },
    version: {
        doc: 'version of the package to be deployed',
        format: String,
        default: pkg.version,
        env: 'DEPLOYMENT_VERSION',
        arg: 'version'
    }
});

if (_lodash2.default.get(pkg, 'diddy.' + config.get('env'))) {
    config.load(pkg.diddy[config.get('env')]);
}

if (_fs2.default.existsSync(_path2.default.join(process.cwd(), 'diddy.yml'))) {
    var yaml = _jsYaml2.default.safeLoad(_fs2.default.readFileSync(_path2.default.join(process.cwd(), 'diddy.yml')));
    config.load(yaml[config.get('env')]);
}

exports.default = config;
module.exports = exports['default'];