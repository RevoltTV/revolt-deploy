import chalk from 'chalk';

import config      from '../config';
import * as docker from './docker';

export default function deploy(commander) {
    console.log(`\n${chalk.bold(`deploying ${config.get('name')}@${config.get('version')}`)}\n`);

    return docker.build(commander)
    .then(() => {
        return docker.tag(commander);
    })
    .then(() => {
        return docker.push(commander);
    })
    .catch((err) => {
        console.error(`\n${chalk.bold.red('ERROR:')} ${err.message}\n${err.stack.replace('Error: ' + err.message + '\n', '')}`);
        return process.exit(1);
    });
}
