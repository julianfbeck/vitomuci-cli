#!/usr/bin/env node
const program = require("commander");
const vt = require("./vitomuci");
const chalk = require("chalk");


program
    .version("0.0.1")
    .usage("[options] <directory> <output dir(only when dowloading from yt)> ")
    .option("-s, --start [start]", "in s: cut away start from the beginning to remove advertisment etc.", 0)
    .option("-e, --end [end]", "in s: cut away end from the end to remove advertisment etc.", 0)
    .option("-d, --duration [duration]", "the duration of the clips the file gets split to", 180)
    .option("-n, --name [name]", "the name of the clips and metadata", "")
    .option("-c, --cover", "if a cover photo should be added to the mp3 metadata", true)
    .option("-m, --metadata", "adds metadata to all generated clips to combine them to one compilation", true)
    .option("-r, --rename", "removes text inside brackets to cleanup filenames like (1080p)", false)
    .parse(process.argv);

//pack program options into one object
let options = {
    output: program.args[1],
    startAt: program.start,
    endAt: program.end,
    duration: program.duration,
    name: program.name,
    cover: program.cover,
    rename: program.rename,
    metadata: program.metadata
};

if (program.args.length === 0) {
    program.help();
}


/**
 * call vitomuci, pass over args, opions and argv
 */
(async () => {
    try {
        await vt(program.args[0], options, process.argv);
    } catch (error) {
        console.log(chalk.red(error));
    }

})();