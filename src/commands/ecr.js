import AWS   from 'aws-sdk';
import chalk from 'chalk';

import config from '../config';

let ECR;

function getECR() {
    if (!ECR) {
        let cfg = getRepositoryConfig();
        ECR = new AWS.ECR({
            region: cfg.region
        });
    }

    return ECR;
}

function getRepositoryConfig() {
    let cfg = config.get('repository');

    if (!cfg.accountId || !cfg.name || !cfg.region) {
        throw new Error('elastic container repository is not configured');
    }

    return cfg;
}

export function getRepositoryUrl() {
    let cfg = getRepositoryConfig();

    return `${cfg.accountId}.dkr.ecr.${cfg.region}.amazonaws.com/${cfg.name}`;
}

export function ensureRepositoryExists() {
    let cfg = getRepositoryConfig();

    let ecr = getECR();

    process.stdout.write(chalk.dim(`\nensuring repository ${cfg.name} exists for ${cfg.accountId} in ${cfg.region}...`));

    return ecr.describeRepositories({
        registryId: cfg.accountId,
        repositoryNames: [cfg.name]
    }).promise()
    .then((result) => {
        process.stdout.write(chalk.green.bold('FOUND\n'));

        return result.repositories[0].repositoryUri;
    })
    .catch((err) => {
        if (err.code !== 'RepositoryNotFoundException') {
            throw err;
        }

        process.stdout.write(chalk.yellow.bold(' NOT FOUND\n'));
        process.stdout.write(chalk.dim(`creating repository...`));

        return ecr.createRepository({
            repositoryName: cfg.name
        }).promise()
        .then((result) => {
            process.stdout.write(chalk.green.bold(' \u2713 DONE\n'));

            return result.repository.repositoryUri;
        });
    });
}

export function getLoginToken() {
    let cfg = getRepositoryConfig();
    let ecr = getECR();

    return ecr.getAuthorizationToken({
        registryIds: [cfg.accountId]
    }).promise()
    .then((result) => {
        let token = result.authorizationData[0].authorizationToken;
        let endpoint = result.authorizationData[0].proxyEndpoint;

        let parts = Buffer.from(token, 'base64').toString().split(':');

        return {
            user: parts[0],
            password: parts[1],
            endpoint
        };
    });
}
