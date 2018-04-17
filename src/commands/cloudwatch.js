import _ from 'lodash';
import AWS from 'aws-sdk';
import chalk from 'chalk';

import config from '../config';

function getCloudWatchLogs(region) {
    return new AWS.CloudWatchLogs({
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

export function ensureLogGroupsExist() {
    let regions = getRegions();
    let logGroupName = _.get(config.get('task.container.logs.options'), 'awslogs-group');

    if (!logGroupName) {
        return Promise.reject(new TypeError('awslogs-group is a required option in task.container.logs.options'));
    }

    return Promise.all(
        _.map(regions, region => {
            let cloudWatch = getCloudWatchLogs(region);

            console.log(chalk.dim(`ensuring log group ${logGroupName} exists in ${region}`));
            return cloudWatch
                .describeLogGroups({
                    limit: 1,
                    logGroupNamePrefix: logGroupName
                })
                .promise()
                .then(result => {
                    if (result.logGroups && result.logGroups.length > 0) {
                        console.log(`    ${chalk.bold.green('\u2713')} log group ${logGroupName} found in ${region}`);
                        return;
                    }

                    console.log(chalk.dim(`creating log group ${logGroupName} in ${region}`));
                    return cloudWatch
                        .createLogGroup({
                            logGroupName
                        })
                        .promise()
                        .then(() => {
                            let retention = config.get('task.container.logs.retention');
                            if (retention) {
                                return cloudWatch
                                    .putRetentionPolicy({
                                        logGroupName,
                                        retentionInDays: retention
                                    })
                                    .promise();
                            }
                        })
                        .then(() => {
                            console.log(
                                `    ${chalk.bold.green('\u2713')} log group ${logGroupName} created in ${region}`
                            );
                        });
                });
        })
    ).then(() => {
        console.log();
    });
}
