import _     from 'lodash';
import chalk from 'chalk';

import config   from '../config';
import * as ecr from './ecr';
import spawn    from '../spawn';

function getTags({ tag }) {
    let tags = tag;
    if (tags.length === 0) {
        tags = [config.get('version')];
    }

    return tags;
}

export function build() {
    console.log(chalk.dim('building docker image'));

    return spawn('docker', ['build', '-t', `${config.get('name')}:latest`, '.'])
    .then(() => {
        console.log(`${chalk.bold.green('\u2713')} docker image built`);
    });
}

export function login() {
    return ecr.getLoginToken()
    .then(({ user, password, endpoint }) => {
        console.log(chalk.dim('logging into docker...'));

        return spawn('docker', ['login', '-u', user, '-p', password, endpoint]);
    });
}

export function tag(commander, repository) {
    let tags = getTags(commander);

    console.log();
    console.log(chalk.dim(`tagging Docker image with ${tags.join(', ')}`));

    let promises = _.map(tags, (tag) => ['tag', `${config.get('name')}:latest`, `${repository || config.get('name')}:${tag}`]);

    return _.reduce(promises, (p, args) => {
        return p.then(() => {
            return spawn('docker', args)
            .then(() => {
                console.log(`${chalk.bold.green('\u2713')} tagged ${_.last(args)}`);
            });
        });
    }, Promise.resolve());
}

export function push(commander) {
    return login()
    .then(ecr.ensureRepositoryExists)
    .then((repositoryUri) => {
        let tags = getTags(commander);

        return tag({
            tag: tags
        }, repositoryUri)
        .then(() => {
            return _.reduce(tags, (p, tag) => {
                return p.then(() => {
                    console.log(`pushing image to ${repositoryUri}:${tag}`);
                    return spawn('docker', ['push', `${repositoryUri}:${tag}`])
                    .then(() => {
                        console.log(`${chalk.green.bold('\u2713')} image pushed`);
                    });
                });
            }, Promise.resolve());
        });
    });
}
