import _     from 'lodash';
import AWS   from 'aws-sdk';
import chalk from 'chalk';

import config from '../config';

function configureListener(region, loadBalancer, targetGroup, listener) {
    let elb = getELB(region);

    if (!config.get('loadBalancer.path')) {
        throw new Error('load balancer path is not defined');
    }

    console.log(chalk.dim(`configuring listener for ${loadBalancer.LoadBalancerName} in ${region}`));

    // Get the list of current rules, so that we can figure out the next priority
    // value for the new Rule we are going to create
    return elb.describeRules({
        ListenerArn: listener.ListenerArn
    }).promise()
    .then((result) => {
        let rules = result.Rules;
        // Find the maximum `Priority` value (which happen to be strings for whatever reason)
        // converting 'default' to 0, and then turn that into an integer. Take that
        // and add 1 to get our new priority value for the new Rule we will create
        let priority = parseInt(_.maxBy(rules, ({ Priority }) => {
            if (Priority === 'default') {
                return 0;
            }

            return parseInt(Priority, 10);
        }).Priority, 10) + 1;

        if (isNaN(priority)) {
            priority = 1;
        }

        return createRule(region, listener, targetGroup, priority)
        .then(() => {
            console.log(`    ${chalk.bold.green('\u2713')} listener configured in ${region}`);
            return {
                loadBalancer,
                targetGroup
            };
        });
    });
}

// This will configure the load balancer with a Target Group and the necessary
// rules on the Load Balancer listeners.
function configureLoadBalancer(region, loadBalancer) {
    console.log(chalk.dim(`configuring load balancer ${loadBalancer.LoadBalancerName} in ${region}`));

    // First we create the target group
    return createTargetGroup(region, loadBalancer)
    .then((targetGroup) => {
        // Next, get all of the listeners on the Load Balancer and configure them
        return getListeners(region, loadBalancer)
        .then((listeners) => {
            return Promise.all(_.map(listeners, configureListener.bind(null, region, loadBalancer, targetGroup)));
        })
        .then(() => {
            // Finally, return our load balancer and target group
            return {
                loadBalancer,
                targetGroup
            };
        });
    });
}

function createRule(region, listener, targetGroup, priority) {
    let elb = getELB(region);
    let path = config.get('loadBalancer.path');

    console.log(chalk.dim(`creating listener rule for group ${targetGroup.TargetGroupName} in ${region}`));

    return elb.createRule({
        Actions: [{
            TargetGroupArn: targetGroup.TargetGroupArn,
            Type: 'forward'
        }],
        Conditions: [{
            Field: 'path-pattern',
            Values: [
                path
            ]
        }],
        ListenerArn: listener.ListenerArn,
        Priority: priority
    }).promise()
    .then((result) => {
        console.log(`    ${chalk.bold.green('\u2713')} rule created in ${region} for ${targetGroup.TargetGroupName}`);
        return result.Rules[0];
    });
}

function createTargetGroup(region, loadBalancer) {
    let elb = getELB(region);
    let targetGroup = config.get('loadBalancer.targetGroup.name');
    let healthCheck = config.get('loadBalancer.targetGroup.healthCheck');

    console.log(chalk.dim(`creating target group ${targetGroup} in ${region}`));

    return elb.createTargetGroup({
        Name: targetGroup,
        Port: 80,
        Protocol: 'HTTP',
        VpcId: loadBalancer.VpcId,
        HealthCheckIntervalSeconds: healthCheck.interval,
        HealthCheckPath: healthCheck.path,
        HealthCheckPort: healthCheck.port,
        HealthCheckProtocol: 'HTTP',
        HealthCheckTimeoutSeconds: healthCheck.timeout,
        HealthyThresholdCount: healthCheck.healthyCount,
        Matcher: {
            HttpCode: '200-299'
        },
        UnhealthyThresholdCount: healthCheck.unhealthyCount
    }).promise()
    .then((result) => {
        console.log(`    ${chalk.bold.green('\u2713')} target group created in ${region}`);
        return result.TargetGroups[0];
    });
}

function getELB(region) {
    return new AWS.ELBv2({
        region
    });
}

export function getServiceLoadBalancer(region) {
    let elb = getELB(region);
    let targetGroup = config.get('loadBalancer.targetGroup.name');

    if (!targetGroup) {
        throw new Error(`target group name is not defined`);
    }

    return getLoadBalancer(region)
    .then((lb) => {
        return elb.describeTargetGroups({
            LoadBalancerArn: lb.LoadBalancerArn
        }).promise()
        .then((result) => {
            let target = _.find(result.TargetGroups, { TargetGroupName: targetGroup });

            if (!target) {
                return configureLoadBalancer(region, lb);
            }

            return {
                loadBalancer: lb,
                targetGroup: target
            };
        })
        .catch((err) => {
            if (err.code !== 'TargetGroupNotFound') {
                throw err;
            }

            return configureLoadBalancer(region, lb);
        });
    });
}

export function getListeners(region, loadBalancer) {
    let elb = getELB(region);

    console.log(chalk.dim(`fetching listeners in ${region} for ${loadBalancer.LoadBalancerName}`));

    return elb.describeListeners({
        LoadBalancerArn: loadBalancer.LoadBalancerArn
    }).promise()
    .then((result) => {
        return result.Listeners;
    });
}

export function getLoadBalancer(region) {
    let name = config.get('loadBalancer.name');

    if (!name) {
        throw new TypeError('load balancer name is not defined');
    }

    console.log(chalk.dim(`fetching load balancer in ${region}`));

    let elb = getELB(region);
    return elb.describeLoadBalancers({
        Names: [name]
    }).promise()
    .then((result) => {
        if (result.LoadBalancers.length === 0) {
            throw new Error(`load balancer ${name} does not exist in ${region}`);
        }

        return result.LoadBalancers[0];
    });
}
