import chalk from 'chalk';

import config      from '../config';
import * as docker from './docker';
import * as ecs    from './ecs';

export default function deploy(commander) {
    console.log(`\n${chalk.bold(`deploying ${config.get('name')}@${config.get('version')}`)}\n`);

    return docker.build()
    .then(() => {
        return docker.tag(config.get('tag'));
    })
    .then(() => {
        return docker.push(commander);
    })
    .then((repositoryUri) => {
        return ecs.createTaskDefinition(repositoryUri);
    })
    .catch((err) => {
        console.error(`\n${chalk.bold.red('ERROR:')} ${err.message}\n${err.stack.replace('Error: ' + err.message + '\n', '')}`);
        return process.exit(1);
    });
}
