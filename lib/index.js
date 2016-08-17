'use strict';

var _commands = require('./commands');

var _commands2 = _interopRequireDefault(_commands);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commands2.default.deploy();

/*import commands from './commands';
import pkg      from '../package.json';

commander.version(pkg.version);

commander
    .command('deploy [directory]')
    .description('deploy the project specified in [directory]')
    .action(commands.deploy);

commander
    .command('docker:build')
    .description('build a docker image')
    .option('-t, --tag <tag>', 'tag the docker image with the provided string')
    .action(commands.docker.build);

commander.parse(process.argv);*/
//import commander from 'commander';