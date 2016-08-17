import chalk from 'chalk';

import config from '../config';
import docker from './docker';

export default () => {
    console.log(`\n${chalk.bold(`deploying ${config.get('name')}@${config.get('version')}`)}\n`);

    return docker.build()
    .then(() => {
        return docker.tag(config.get('version'));
    })
    .catch((err) => {
        console.error(`\n${chalk.bold.red('ERROR:')} ${err.message}\n${err.stack.replace('Error: ' + err.message + '\n', '')}`);
        return process.exit(1);
    });
};
