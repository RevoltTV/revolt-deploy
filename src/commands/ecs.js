import _     from 'lodash';
import AWS   from 'aws-sdk';
import chalk from 'chalk';

import config   from '../config';
import * as elb from './elb';

function createService(taskDefinition, region) {
    let ecs = getECS(region);
    let cluster = config.get('cluster');
    let service = config.get('service');
    let promise = Promise.resolve();

    console.log(chalk.dim(`service ${service.name} was not found in ${region}, creating...`));

    if (config.get('loadBalancer.name')) {
        // A load balancer was configured, we need to ensure that it exists
        // and the target groups exist and all that
        promise = promise.then(() => {
            return elb.getServiceLoadBalancer(region);
        });
    }

    return promise.then((elb) => {
        let params = {
            desiredCount: service.count,
            serviceName: service.name,
            taskDefinition,
            cluster,
            deploymentConfiguration: {
                maximumPercent: service.maximumPercent,
                minimumHealthyPercent: service.minimumPercent
            }
        };

        if (elb) {
            let task = createTaskDefinition('image');
            params.loadBalancers = [];
            let lb = {
                containerName: task.containerDefinitions[0].name,
                containerPort: task.containerDefinitions[0].portMappings[0].containerPort
            };

            if (elb.targetGroup) {
                lb.targetGroupArn = elb.targetGroup.TargetGroupArn;
            } else {
                lb.loadBalancerName = elb.loadBalancer.LoadBalancerName;
            }

            params.loadBalancers.push(lb);
            params.role = config.get('service.role');
        }

        return ecs.createService(params).promise()
        .then((result) => {
            console.log(`    ${chalk.bold.green('\u2713')} service ${result.service.serviceName} created in ${region}`);
            return result;
        });
    });
}

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

function updateService(taskDefinition, region) {
    let ecs = getECS(region);
    let cluster = config.get('cluster');
    let service = config.get('service');

    console.log(chalk.dim(`service ${service.name} found in ${region}, updating...`));

    return ecs.updateService({
        service: service.name,
        cluster,
        taskDefinition
    }).promise()
    .then((result) => {
        console.log(`    ${chalk.bold.green('\u2713')} service ${result.service.serviceName} updated in ${region}`);
        return result;
    });
}

export function createTaskDefinition(imageUri) {
    if (!imageUri) {
        throw new TypeError('imageUri can not be null');
    }

    let task = {};

    task.family = config.get('task.name');
    task.networkMode = config.get('task.networkMode');

    if (config.get('task.role')) {
        task.taskRoleArn = config.get('task.role');
    }

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

    if (config.get('task.container.logs.driver')) {
        container.logConfiguration = {
            logDriver: config.get('task.container.logs.driver'),
            options: config.get('task.container.logs.options')
        };
    }

    // Validate the container definition
    if (!container.memory && !container.memoryReservation) {
        throw new TypeError('task container must specify memory and/or memoryReservation');
    }

    if (container.memory < container.memoryReservation) {
        throw new TypeError('task container memory must be greater than memoryReservation');
    }

    task.containerDefinitions = [container];

    return task;
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

export function runService(taskDefinition, region) {
    let cluster = config.get('cluster');
    let service = config.get('service');

    console.log(chalk.dim(`starting service ${service.name} for cluster ${cluster} in ${region}`));

    let ecs = getECS(region);

    console.log(chalk.dim(`ensuring service exists in ${region}`));
    return ecs.describeServices({
        services: [service.name],
        cluster
    }).promise()
    .then((result) => {
        if (result.services.length > 0 && result.services[0].status === 'ACTIVE') {
            // Service was found, we can update it
            return updateService(taskDefinition, region)
            .then(({ service }) => {
                return {
                    service,
                    previousTaskDefinition: result.services[0].taskDefinition
                };
            });
        }

        return createService(taskDefinition, region);
    })
    .then(({ service, previousTaskDefinition }) => {
        return {
            service,
            region,
            previousTaskDefinition
        };
    });
}

export function registerTask(task) {
    let regions = getRegions();

    console.log(chalk.dim(`registering task definition in ${regions.join(', ')}`));

    return Promise.all(_.map(regions, (region) => {
        let ecs = getECS(region);
        let regionalTask = _.extend({}, task);
        if (config.get('task.container.logs.driver') === 'awslogs') {
            regionalTask.containerDefinitions[0].logConfiguration.options['awslogs-region'] = _.get(config.get('task.container.logs.options'), 'awslogs-region', region);
        }

        return ecs.registerTaskDefinition(regionalTask).promise()
        .then((result) => {
            let arn = result.taskDefinition.taskDefinitionArn;
            let family = task.family;
            let revision = arn.substring(arn.lastIndexOf(':') + 1);
            console.log(`    ${chalk.bold.green('\u2713')} task ${family}:${revision} created in ${region}`);

            return {
                region,
                task: result.taskDefinition.taskDefinitionArn
            };
        });
    }))
    .then((tasks) => {
        console.log();
        return tasks;
    });
}

export function unregisterTask(taskDefinition, region) {
    let ecs = getECS(region);

    return ecs.deregisterTaskDefinition({
        taskDefinition
    }).promise()
    .then(() => {
        console.log(`    ${chalk.bold.green('\u2713')} deregistered previous task definition ${taskDefinition} from ${region}`);
    });
}

export function waitForStable(service, region) {
    let ecs = getECS(region);

    let request = ecs.waitFor('servicesStable', {
        services: [service.serviceName],
        cluster: config.get('cluster')
    });

    request.on('extractData', () => {
        process.stdout.write('.');
    });

    return request.promise()
    .then((result) => {
        console.log(`\n    ${chalk.bold.green('\u2713')} service ${service.serviceName} ${chalk.bold.green('STABLE')} in ${region}`);
        return result;
    });
}
