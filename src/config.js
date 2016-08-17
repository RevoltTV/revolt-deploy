import _       from 'lodash';
import chalk   from 'chalk';
import convict from 'convict';
import fs      from 'fs';
import path    from 'path';
import jsYaml  from 'js-yaml';

let pkg;
try {
    pkg = require(path.join(process.cwd(), 'package.json'));
} catch (err) {
    console.error(`${chalk.red(`${chalk.bold('package.json')} was not found in ${process.cwd()}`)}`);
    console.error(`${chalk.bold.red('aborting')}`);
    process.exit(1);
}

const config = convict({
    env: {
        doc: 'environment configuration to use for this deployment',
        format: String,
        default: 'production',
        env: 'NODE_ENV',
        arg: 'env'
    },
    name: {
        doc: 'name of the package to be deployed',
        format: String,
        default: pkg.name,
        env: 'DEPLOYMENT_NAME',
        arg: 'name'
    },
    version: {
        doc: 'version of the package to be deployed',
        format: String,
        default: pkg.version,
        env: 'DEPLOYMENT_VERSION',
        arg: 'version'
    }
});

if (_.get(pkg, `diddy.${config.get('env')}`)) {
    config.load(pkg.diddy[config.get('env')]);
}

if (fs.existsSync(path.join(process.cwd(), 'diddy.yml'))) {
    let yaml = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'diddy.yml')));
    config.load(yaml[config.get('env')]);
}

export default config;
