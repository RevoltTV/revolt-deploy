import _     from 'lodash';
import chalk from 'chalk';
import execa from 'execa';

import config   from '../config';
import * as ecr from './ecr';
import spawn    from '../spawn';

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

export function tag(commander) {
    let tags = commander.tag;
    if (tags.length === 0) {
        tags = [config.get('version')];
    }

    console.log();
    console.log(chalk.dim(`tagging Docker image with ${tags.join(', ')}`));

    let promises = _.map(tags, (tag) => ['tag', `${config.get('name')}:latest`, `${config.get('name')}:${tag}`]);

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
    return login();
}
