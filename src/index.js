import commander from 'commander';

import commands from './commands';
import pkg      from '../package.json';

function collect(value, array) {
    array.push(value);
    return array;
}

commander.version(pkg.version);

commander
    .option('-t, --tag <tag>', 'the tag to apply to the Docker image. defaults to package.json version', collect, [])
    .option('--name <name>', 'the name of the docker image to deploy')
    .option('--ecr-region <region>', 'the region that the elastic container repository is in');

commander.parse(process.argv);

commands.deploy(commander);
