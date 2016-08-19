import commander from 'commander';

import commands from './commands';
import config   from './config';
import pkg      from '../package.json';

commander
    .version(pkg.version)
    .description(`Magical deployment tool. Configure it with either a diddy.yml file, or in a \`diddy\` section of your package.json, or via the command line`);

commander
    .option('--tag <tag>', 'the tag to apply to the Docker image. defaults to package.json version')
    .option('--env <env>', 'the environment to deploy to')
    .option('--name <name>', 'the name of the docker image to deploy')
    .option('--ecr-account <accountId>', 'id of the account for the elastic container repository')
    .option('--ecr-name <name>', 'the name of the elastic container repository')
    .option('--ecr-region <region>', 'the region that the elastic container repository is in');

commander.parse(process.argv);
commander.tag = commander.tag || config.get('version');

commands.deploy(commander)
.catch((err) => {
    console.error(err);

    return process.exit(1);
});
