import chalk from 'chalk';
import execa from 'execa';

import config from '../config';

function build() {
    process.stdout.write(`building docker image`);

    let progressInterval = setInterval(() => {
        process.stdout.write('.');
    }, 5000);

    return execa('docker', ['build', `-t ${config.get('name')}:latest`])
    .then(() => {
        clearInterval(progressInterval);
        process.stdout.write(chalk.bold.green('\u2713'));
    });
}

function tag() {
    console.log(`\n${chalk.bold('tagging Docker image')}\n`);

    return Promise.resolve();
}

export default {
    build,
    tag
};
