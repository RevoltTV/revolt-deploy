import _       from 'lodash';
import chalk   from 'chalk';
import convict from 'convict';
import fs      from 'fs';
import jsYaml  from 'js-yaml';
import path    from 'path';
import semver  from 'semver';

let pkg;
try {
    pkg = require(path.join(process.cwd(), 'package.json'));
} catch (err) {
    console.error(`${chalk.red(`${chalk.bold('package.json')} was not found in ${process.cwd()}`)}`);
    console.error(`${chalk.bold.red('aborting')}`);
    process.exit(1);
}

convict.addFormat({
    name: 'aws-name',
    validate: function (value) {
        if (!/^[a-zA-Z0-9\-_]{1,255}$/.test(value)) {
            throw new TypeError('value format is up to 255 letters (uppercase and lowercase), numbers, hyphens, and underscores are allowed');
        }
    }
});
convict.addFormat({
    name: 'nullable-integer',
    validate: function (value) {
        if (!value) {
            return;
        }

        if (isNaN(value) || parseInt(Number(value)) !== value || isNaN(parseInt(value, 10))) {
            throw new TypeError('value must be either null or an integer');
        }
    }
});
convict.addFormat({
    name: 'string-or-array',
    validate: function (value) {
        if (!_.isString(value) && !_.isArray(value)) {
            throw new TypeError('value must be either a string or an array');
        }
    }
});

const config = convict({
    env: {
        doc: 'environment configuration to use for this deployment',
        format: String,
        default: 'production',
        env: 'DEPLOYMENT_ENV',
        arg: 'env'
    },
    name: {
        doc: 'name of the package to be deployed',
        format: String,
        default: pkg.name,
        env: 'DEPLOYMENT_NAME',
        arg: 'name'
    },
    tag: {
        doc: 'tag to apply to docker image',
        format: String,
        default: pkg.version,
        env: 'DEPLOYMENT_TAG',
        arg: 'tag'
    },
    version: {
        doc: 'version of the package to be deployed',
        format: String,
        default: pkg.version
    },
    docker: {
        buildArg: {
            doc: 'Argument to pass into the Docker build',
            format: String,
            default: '',
            env: 'DOCKER_BUILD_ARG',
            arg: 'docker-build-arg'
        }
    },
    repository: {
        accountId: {
            doc: 'ID of the AWS account that owns the container repository',
            format: String,
            default: '',
            env: 'ECR_ACCOUNT_ID',
            arg: 'ecr-account-id'
        },
        region: {
            doc: 'The region the container repository is in',
            format: String,
            default: '',
            env: 'ECR_REGION',
            arg: 'ecr-region'
        },
        name: {
            doc: 'The name of the container repository',
            format: String,
            default: '',
            env: 'ECR_NAME',
            arg: 'ecr-name'
        }
    },
    cluster: {
        doc: 'The name of the cluster to run the service in',
        format: 'aws-name',
        default: '',
        env: 'CLUSTER',
        arg: 'cluster'
    },
    regions: {
        doc: 'The regions to deploy to',
        format: 'string-or-array',
        default: null,
        env: 'DEPLOYMENT_REGIONS',
        arg: 'regions'
    },
    loadBalancer: {
        name: {
            doc: 'The name of the load balancer',
            format: String,
            default: '',
            env: 'ELB_NAME',
            arg: 'elb-name'
        },
        path: {
            doc: 'The path the load balancer should use for the application',
            format: String,
            default: '',
            env: 'ELB_PATH',
            arg: 'elb-path'
        },
        targetGroup: {
            name: {
                doc: 'The name of the target group for the load balancer',
                format: String,
                default: '',
                env: 'ELB_TARGET_GROUP_NAME',
                arg: 'elb-target-group-name'
            },
            healthCheck: {
                interval: {
                    doc: 'Interval to check for healthy target',
                    format: 'nat',
                    default: 30
                },
                path: {
                    doc: 'Path to check for healthy target',
                    format: String,
                    default: '/'
                },
                port: {
                    doc: 'Port to check for healthy target',
                    format: String,
                    default: 'traffic-port'
                },
                timeout: {
                    doc: 'Timeout for checking healthy target',
                    format: 'nat',
                    default: 5
                },
                healthyCount: {
                    doc: 'Number of consecutive healthy checks',
                    format: 'nat',
                    default: 5
                },
                unhealthyCount: {
                    doc: 'Number of consecutive unhealthy checks',
                    format: 'nat',
                    default: 2
                }
            }
        }
    },
    service: {
        name: {
            doc: 'The name of the service',
            format: 'aws-name',
            default: '',
            env: 'SERVICE_NAME',
            arg: 'service-name'
        },
        count: {
            doc: 'The number of tasks to run in the service',
            format: 'nat',
            default: 2,
            env: 'SERVICE_COUNT',
            arg: 'service-count'
        },
        minimumPercent: {
            doc: 'The minimum healthy percent to initialize the service with',
            format: 'nat',
            default: 50,
            env: 'SERVICE_MINIMUM_PERCENT',
            arg: 'service-minimum-percent'
        },
        maximumPercent: {
            doc: 'The maximum healthy percent the service can use',
            format: 'nat',
            default: 200,
            env: 'SERVICE_MAXIMUM_PERCENT',
            arg: 'service-maximum-percent'
        },
        role: {
            doc: 'The IAM role to use when creating the service if a load balancer needs to be created',
            format: String,
            default: 'ecsServiceRole'
        }
    },
    task: {
        name: {
            doc: 'The name of the task in ECS',
            format: 'aws-name',
            default: '',
            env: 'ECS_TASK_NAME',
            arg: 'ecs-task-name'
        },
        networkMode: {
            doc: 'The Docker networking mode for the container of the task',
            format: ['bridge', 'host', 'none'],
            default: 'bridge',
            env: 'ECS_TASK_NETWORK_MODE',
            arg: 'ecs-task-network-mode'
        },
        container: {
            name: {
                doc: 'The name of the container',
                format: 'aws-name',
                default: '',
                env: 'ECS_CONTAINER_NAME',
                arg: 'ecs-container-name'
            },
            cpu: {
                doc: 'The number of CPU units to dedicate to the instance',
                format: 'nullable-integer',
                default: null,
                env: 'ECS_CONTAINER_CPU',
                arg: 'ecs-container-cpu'
            },
            environment: {
                doc: 'The environment variables to set for the container',
                format: Object,
                default: {},
                env: 'ECS_CONTAINER_ENVIRONMENT',
                arg: 'ecs-container-environment'
            },
            memory: {
                doc: 'The maximum amount of memory that can be reserved',
                format: 'nullable-integer',
                default: null,
                env: 'ECS_CONTAINER_MEMORY',
                arg: 'ecs-container-memory'
            },
            memoryReservation: {
                doc: 'The minimum amount of memory reserved for the container',
                format: 'nullable-integer',
                default: null,
                env: 'ECS_CONTAINER_MEMORY_RESERVATION',
                arg: 'ecs-container-memory-reservation'
            },
            ports: {
                doc: 'The ports configuration for the container',
                format: Array,
                default: null,
                env: 'ECS_CONTAINER_PORTS',
                arg: 'ecs-container-ports'
            }
        }
    }
});

if (_.get(pkg, `revolt.common`)) {
    config.load(pkg.revolt.common);
}

if (_.get(pkg, `revolt.${config.get('env')}`)) {
    config.load(pkg.revolt[config.get('env')]);
}

if (fs.existsSync(path.join(process.cwd(), 'revolt.yml'))) {
    let yaml = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'revolt.yml')));
    config.load(yaml.common || {});
    config.load(yaml[config.get('env')] || {});
}

// Perform token replacement on any config values
let props = config.getProperties();
function replaceTokens(obj, parents) {
    _.each(obj, (value, key) => {
        if (_.isObject(value)) {
            return replaceTokens(value, parents + key + '.');
        }

        if (!_.isString(value)) {
            return;
        }

        value = value.replace(/\$\{VERSION_MAJOR\}/g, semver.major(config.get('version')))
                     .replace(/\$\{VERSION_MINOR\}/g, semver.minor(config.get('version')))
                     .replace(/\$\{VERSION\}/g, config.get('version'));

        config.set(parents + key, value);
    });
}
replaceTokens(props, '');

config.validate();

export default config;
