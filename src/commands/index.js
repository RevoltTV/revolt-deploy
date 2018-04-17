import deploy from './deploy';
import * as docker from './docker';
import * as ecr from './ecr';
import * as ecs from './ecs';
import * as elb from './elb';

export default {
    deploy,
    docker,
    ecr,
    ecs,
    elb
};
