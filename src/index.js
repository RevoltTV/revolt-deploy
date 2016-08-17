//import commander from 'commander';

import commands from './commands';

commands.deploy();

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
