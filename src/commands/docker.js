import chalk from 'chalk';

import config   from '../config';
import * as ecr from './ecr';
import spawn    from '../spawn';

export function build() {
    console.log(chalk.dim('building docker image\n'));

    return spawn('docker', ['build', '-t', `${config.get('name')}:latest`, '.'])
    .then(() => {
        console.log(`\n${chalk.bold.green('\u2713')} docker image built\n`);
    });
}

export function login() {
    return ecr.getLoginToken()
    .then(({ user, password, endpoint }) => {
        console.log(chalk.dim('logging into docker...'));

        return spawn('docker', ['login', '-u', user, '-p', password, endpoint]);
    });
}

export function tag(tag, repository) {
    console.log(chalk.dim(`tagging Docker image with ${repository ? repository + ':' : ''}${tag}`));
    return spawn('docker', ['tag', `${config.get('name')}:latest`, `${repository || config.get('name')}:${tag}`])
    .then(() => {
        console.log(`${chalk.bold.green('\u2713')} tagged ${repository ? repository + ':' : ''}${tag}\n`);
    });
}

export function push(commander) {
    return login()
    .then(ecr.ensureRepositoryExists)
    .then((repositoryUri) => {
        return tag(commander.tag, repositoryUri)
        .then(() => {
            return spawn('docker', ['push', `${repositoryUri}:${commander.tag}`])
            .then(() => {
                console.log(`${chalk.green.bold('\u2713')} image pushed\n`);
            });
        })
        .then(() => {
            return ecr.cleanUntaggedImages();
        })
        .then(() => {
            return repositoryUri;
        });
    });
}
