import _     from 'lodash';
import AWS   from 'aws-sdk';
import chalk from 'chalk';

import config from '../config';

function getECS(region) {
    return new AWS.ECS({
        region
    });
}

function getRegions() {
    let regions = config.get('regions');
    if (_.isString(regions)) {
        regions = [regions];
    }

    return regions;
}

export function createTaskDefinition(imageUri) {
    if (!imageUri) {
        throw new TypeError('imageUri can not be null');
    }

    let task = {};

    task.family = config.get('task.name');
    task.networkMode = config.get('task.networkMode');

    let container = {};
    container.name = config.get('task.container.name');
    container.image = imageUri;
    if (config.get('task.container.cpu')) {
        container.cpu = config.get('task.container.cpu');
    }
    if (config.get('task.container.memory')) {
        container.memory = config.get('task.container.memory');
    }
    if (config.get('task.container.memoryReservation')) {
        container.memoryReservation = config.get('task.container.memoryReservation');
    }
    container.portMappings = _.map(config.get('task.container.ports'), (port) => {
        let def = {};
        if (_.isString(port)) {
            def.containerPort = parseInt(port, 10);
        } else if (_.isNumber(port)) {
            def.containerPort = port;
        } else {
            if (!port.container) { throw new TypeError('port definition must specify container port'); }

            def.containerPort = port.container;
            if (port.host) {
                def.hostPort = port.host;
            }
        }

        if (port.protocol) {
            def.protocol = port.protocol;
        } else {
            def.protocol = 'tcp';
        }

        return def;
    });

    container.environment = _.map(config.get('task.container.environment'), (value, key) => {
        return {
            name: key,
            value
        };
    });

    // Validate the container definition
    if (!container.memory && !container.memoryReservation) {
        throw new TypeError('task container must specify memory and/or memoryReservation');
    }

    if (container.memory < container.memoryReservation) {
        throw new TypeError('task container memory must be greater than memoryReservation');
    }

    task.containerDefinitions = [container];

    return Promise.resolve(task);
}

export function ensureClusterExists() {
    let regions = getRegions();
    let cluster = config.get('cluster');

    console.log(chalk.dim(`ensuring cluster ${cluster} exists in ${regions.join(', ')}`));

    return Promise.all(_.map(regions, (region) => {
        let ecs = getECS(region);

        return ecs.describeClusters({
            clusters: [cluster]
        }).promise()
        .then((result) => {
            if (result.clusters.length > 0 && result.clusters[0].status === 'ACTIVE') {
                // Cluster was found, we can just return
                console.log(`    ${chalk.bold.green('\u2713')} cluster ${cluster} found in ${region}`);
                return;
            }

            console.log(chalk.dim(`creating cluster ${cluster} in ${region}`));
            return ecs.createCluster({
                clusterName: cluster
            }).promise()
            .then((result) => {
                console.log(`    ${chalk.bold.green('\u2713')} cluster ${result.cluster.clusterName} created in ${region}`);
            });
        });
    }))
    .then(() => { console.log(); });
}

export function registerTask(task) {
    let regions = getRegions();

    console.log(chalk.dim(`registering task definition in ${regions.join(', ')}`));

    return Promise.all(_.map(regions, (region) => {
        let ecs = getECS(region);

        return ecs.registerTaskDefinition(task).promise()
        .then((result) => {
            let arn = result.taskDefinition.taskDefinitionArn;
            let family = task.family;
            let revision = arn.substring(arn.lastIndexOf(':') + 1);
            console.log(`    ${chalk.bold.green('\u2713')} task ${family}:${revision} created in ${region}`);

            return {
                region,
                task: result.taskDefinition.taskDefinitionArn
            };
        })
        .then((tasks) => {
            console.log();
            return tasks;
        });
    }));
}
