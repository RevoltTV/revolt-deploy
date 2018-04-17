import execa from 'execa';

export default function(command, args) {
    let ex = execa(command, args);
    ex.stdout.pipe(process.stdout);
    ex.stderr.pipe(process.stderr);

    return ex;
}
