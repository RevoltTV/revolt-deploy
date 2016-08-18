import AWS   from 'aws-sdk';
import chalk from 'chalk';

import config from '../config';

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

    process.stdout.write(chalk.dim(`\nensuring repository ${cfg.name} exists for ${cfg.accountId} in ${cfg.region}...`));

    const ecr = new AWS.ECR({
        region: cfg.region
    });

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
