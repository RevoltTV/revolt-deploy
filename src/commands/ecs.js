import _     from 'lodash';
import AWS   from 'aws-sdk';
import chalk from 'chalk';

import config from '../config';

function getECS(region) {
    return new AWS.ECS({
        region
    });
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

export function registerTask(task) {
    let regions = config.get('regions');
    if (_.isString(regions)) {
        regions = [regions];
    }

    console.log(chalk.dim(`registering task definition in ${regions.join(', ')}`));

    return Promise.all(_.map(regions, (region) => {
        let ecs = getECS(region);

        return ecs.registerTaskDefinition(task).promise()
        .then((result) => {
            console.log(`    ${chalk.bold.green('\u2713')} task created in ${region}`);

            return {
                region,
                task: result.taskDefinition.taskDefinitionArn
            };
        });
    }));
}
