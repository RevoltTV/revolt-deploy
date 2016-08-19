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

export function cleanUntaggedImages() {
    let cfg = getRepositoryConfig();
    let ecr = getECR();

    console.log('cleaning up any untagged repository images...');

    return ecr.listImages({
        filter: {
            tagStatus: 'UNTAGGED'
        },
        maxResults: 100,
        registryId: cfg.accountId,
        repositoryName: cfg.name
    }).promise()
    .then((results) => {
        if (results.imageIds.length === 0) {
            console.log(chalk.dim('no images to delete\n'));
            return;
        }

        process.stdout.write(chalk.dim(`deleting ${results.imageIds.length} image${results.imageIds.length === 1 ? '' : 's'}...`));
        return ecr.batchDeleteImage({
            imageIds: results.imageIds,
            registryId: cfg.accountId,
            repositoryName: cfg.name
        }).promise()
        .then(() => {
            process.stdout.write(chalk.green.bold(' \u2713 DONE\n\n'));
            if (results.imageIds.length === 100) {
                return cleanUntaggedImages();
            }
        });
    });
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
        process.stdout.write(chalk.green.bold(' \u2713 FOUND\n\n'));

        return result.repositories[0].repositoryUri;
    })
    .catch((err) => {
        if (err.code !== 'RepositoryNotFoundException') {
            throw err;
        }

        process.stdout.write(chalk.red.bold(' X'));
        process.stdout.write(chalk.yellow.bold(' NOT FOUND\n'));
        process.stdout.write(chalk.dim(`creating repository...`));

        return ecr.createRepository({
            repositoryName: cfg.name
        }).promise()
        .then((result) => {
            process.stdout.write(chalk.green.bold(' \u2713 DONE\n\n'));

            return result.repository.repositoryUri;
        });
    });
}

export function getRepositoryUrl() {
    let cfg = getRepositoryConfig();

    return `${cfg.accountId}.dkr.ecr.${cfg.region}.amazonaws.com/${cfg.name}`;
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
