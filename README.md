# Diddy Deploy Dat

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
npm install -g diddy-deploy-dat
```

## Configuring

`diddy-deploy-dat` can be configured in a few different ways:

* environment variables
* command line arguments
* a `diddy.yml` file

It's recommended to use a `diddy.yml` file for most of the configuration, but
anything that can be considered sensitive can be passed in via the command line
or an environment variable

### `diddy.yml` structure

The key `common` in the YAML file is used for shared configuration details that
can be used for any deployment environment. It is recommended to use this for
setting up the repository configuration at the very least

Additional top level keys refer to deployment environments which can be set with
the `DEPLOYMENT_ENV` environment variable, or the `--env` command line argument

**EXAMPLE**

```
common:
    repository:
        accountId: 'AWS_ACCOUNT_NUMBER'
        name: 'repository-name'
        region: 'aws-region-1'

production:
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

## Deploying

Each deployment will create a Docker image and tag it with information from the
project's `package.json` by default (`package.name` and `package.version`
respectively). This can be overridden with environment variables `DEPLOYMENT_NAME`
and `DEPLOYMENT_TAG` or command line arguments `--name` and `--tag`.

**EXAMPLE**

```
$: cd /your/project
$: DEPLOYMENT_ENV=production diddy-deploy-dat --tag $CI_BUILD_NUMBER
```
