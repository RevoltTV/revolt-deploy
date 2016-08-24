import commander from 'commander';

import commands from './commands';
import pkg      from '../package.json';

commander
    .version(pkg.version)
    .description(`Magical deployment tool. Configure it with either a revolt.yml file, or in a \`revolt\` section of your package.json, or via the command line`);

commander
    .option('--env <env>', 'environment configuration to use for deployment')
    .option('--name <name>', 'name of the docker image to deploy')
    .option('--tag <tag>', 'tag to apply to the Docker image. defaults to package.json version')
    .option('--cluster <name>', 'name of the cluster')
    .option('--regions <region>', 'regions to deploy to')
    .option('--docker-build-arg <arg>', 'docker build argument')
    .option('--service-name <name>', 'name of the service')
    .option('--service-count <count>', 'number of tasks to run for the service')
    .option('--service-minimum-percent <percent>', 'minimum healthy percentage for the service')
    .option('--service-maximum-percent <percent>', 'maximum healthy percentage for the service')
    .option('--ecr-account <accountId>', 'id of the account for the elastic container repository')
    .option('--ecr-name <name>', 'name of the elastic container repository')
    .option('--ecr-region <region>', 'region that the elastic container repository is in')
    .option('--ecs-task-name <name>', 'name of the task')
    .option('--ecs-task-network-mode <mode>', 'network mode to use in the host for the task')
    .option('--ecs-task-role <role>', 'role to run ECS task with')
    .option('--ecs-container-name <name>', 'name of the container in the task')
    .option('--ecs-container-cpu <units>', 'number of CPU units to reserve for the container')
    .option('--ecs-container-environment <env>', 'environmental variables to set in the container')
    .option('--ecs-container-memory <amount>', 'maximum amount of memory the container is allowed')
    .option('--ecs-container-memory-reservation <amount>', 'memory to reserve for container')
    .option('--ecs-container-ports <ports>', 'ports to publish for the container');

commander.parse(process.argv);

commands.deploy(commander)
.catch((err) => {
    console.error(err);

    return process.exit(1);
});
