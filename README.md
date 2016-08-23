# revolt-deploy

A deployment tool geared primarily for @RevoltTV's deployment process, but may
be beneficial/extensible to other deployment patterns.

This tool performs the following primary tasks:

1. Create a new Docker build with appropriate tags
2. Push this new Docker build to Amazon Elastic Container Repository
3. Create/Update an Elastic Container Service task with the new build
4. Create/Update an Elastic Container Service service to redeploy with the new build
5. Ensure the new services start correctly, and perform any cleanup of old resources

## Installation

```
npm install -g @revolttv/revolt-deploy
```

## Configuring

`revolt-deploy` can be configured in a few different ways:

* environment variables
* command line arguments
* a `revolt.yml` file

It's recommended to use a `revolt.yml` file for most of the configuration, but
anything that can be considered sensitive can be passed in via the command line
or an environment variable

### `revolt.yml` structure

The key `common` in the YAML file is used for shared configuration details that
can be used for any deployment environment. It is recommended to use this for
setting up the repository configuration at the very least

Additional top level keys refer to deployment environments which can be set with
the `DEPLOYMENT_ENV` environment variable, or the `--env` command line argument

**EXAMPLE**

```
common:
    docker:
        buildArg: 'NPM_TOKEN=your-npm-token'
    repository:
        accountId: 'AWS_ACCOUNT_NUMBER'
        name: 'repository-name'
        region: 'aws-region-1'

production:
    cluster: 'name-of-cluster'
    loadBalancer:
        name: 'load-balancer'
        path: '/path/to/service'
        targetGroup:
            name: 'the-target-group'
            healthCheck:
                interval: 30
                path: '/health-check'
                port: 'traffic-port'
                timeout: 10
                healthyCount: 5
                unhealthyCount: 2
    regions:
        - 'aws-region-1'
        - 'aws-region-2'
    service:
        name: 'name-of-service'
        count: 2
        minimumPercent: 50
        maximumPercent: 200
        role: ecsServiceRole
    task:
        name: 'the-task-name'
        networkMode: 'bridge|host|none'
        container:
            name: 'the-container-name'
            cpu: 256
            memory: 512
            memoryReservation: 256
            ports:
                - 9999
                -
                    host: 9998
                    container: 9473
                    protocol: 'tcp|udp'
            environment:
                NODE_ENV: 'production'
                LOG_LEVEL: 'info'
```

### Token Replacement

The tool allows for a few token replacements which can be useful for dynamic naming. Tokens can be specified in the
configuration value like so: `name: service-version-${VERSION_MAJOR}`, which will replace with `name: service-version-1`.

Tokens:

* `VERSION_MAJOR` - major version from package.json version number
* `VERSION_MINOR` - minor version from package.json version number
* `VERSION`       - full version number from package.json

### AWS Configuration

`revolt-deploy` does not make any assumptions about how AWS is configured in the system. As such, any method listed
in http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html should be sufficient.

It's recommended to use the Environmental Variable configuration method.

## Deploying

Each deployment will create a Docker image and tag it with information from the
project's `package.json` by default (`package.name` and `package.version`
respectively). This can be overridden with environment variables `DEPLOYMENT_NAME`
and `DEPLOYMENT_TAG` or command line arguments `--name` and `--tag`.

**EXAMPLE**

```
$: cd /your/project
$: DEPLOYMENT_ENV=production revolt-deploy --tag $CI_BUILD_NUMBER
```

## Limitations

As of right now, `revolt-deploy` does not do the following:

* Add EC2 instances to a new cluster
* Attach an Elastic Load Balancer to a new service

These tasks will need to be completed manually at the moment, though this may change sometime in the future.
