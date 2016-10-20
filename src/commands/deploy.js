import _     from 'lodash';
import chalk from 'chalk';

import config          from '../config';
import * as docker     from './docker';
import * as ecs        from './ecs';
import * as cloudwatch from './cloudwatch';

export default function deploy() {
    console.log(`\n${chalk.bold(`deploying ${config.get('name')}@${config.get('version')}`)}\n`);

    return docker.build()
    .then(() => {
        return docker.tag(config.get('tag'));
    })
    .then(() => {
        return docker.push();
    })
    .then((repositoryUri) => {
        let promise;
        let taskDefinition = ecs.createTaskDefinition(repositoryUri);

        if (config.get('task.container.logs.driver')) {
            promise = cloudwatch.ensureLogGroupsExist();
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            return ecs.registerTask(taskDefinition);
        });
    })
    .then((tasks) => {
        return ecs.ensureClusterExists()
        .then(() => {
            return Promise.all(_.map(tasks, (task) => {
                return ecs.runService(task.task, task.region);
            }));
        });
    })
    .then((services) => {
        console.log(`\n${chalk.dim('service deployed, waiting for')} ${chalk.bold.green('STABLE')}`);
        return Promise.all(_.map(services, ({service, region}) => {
            return ecs.waitForStable(service, region);
        }))
        .then(() => {
            console.log('\n\nDeregistering previous task definitions...');
            return Promise.all(_.map(services, ({ previousTaskDefinition, region }) => {
                return ecs.unregisterTask(previousTaskDefinition, region);
            }));
        });
    })
    .then(() => {
        console.log(`\n\n${chalk.bold.green('\u2713 DEPLOYED')}`);
    })
    .catch((err) => {
        console.error(`\n${chalk.bold.red('ERROR:')} ${err.message}\n${err.stack.replace('Error: ' + err.message + '\n', '')}`);
        return process.exit(1);
    });
}
