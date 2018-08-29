#!/usr/bin/env node

const program = require("commander");
const vt = require("./vitomuci");
const chalk = require("chalk");
const notifier = require('node-notifier');
const interactive = require("./interactive");



program
    .version("0.0.1")
    .usage("[options] <directory> <output dir(only when dowloading from yt)> ")
    .option("-i, --interactive", "start interactive mode", false)
    .option("-p, --podcastLimit", "the amount of empisodes you want to download, no limit will download every episoe", 0)
    .option("-s, --start [start]", "in s: cut away start from the beginning to remove advertisment etc.", 0)
    .option("-e, --end [end]", "in s: cut away from the end to remove advertisment etc.", 0)
    .option("-d, --duration [duration]", "the duration of the clips the file gets split to", 180)
    .option("-n, --name [name]", "the name of the clips and metadata", "")
    .option("-c, --cover", "if a cover photo should be added to the mp3 metadata", true)
    .option("-m, --metadata", "adds metadata to all generated clips to combine them to one compilation", true)
    .option("-r, --rename", "removes text inside brackets to cleanup filenames like (1080p)", false)
    .option("-f, --full", "convert the full file without splitting", false)
    .parse(process.argv);



if (program.args.length === 0) {    
    console.log(chalk.green("use the -i option to activate the interactive mode"));
    program.help();
}

/**
 * Get Options, via command or interactive shell
 */
async function getOptions() {
    let options;
    if (program.interactive) {
        options = await interactive();
        options.output = program.args[1];
    } else {
        options = {
            output: program.args[1],
            startAt: program.start,
            endAt: program.end,
            duration: program.duration,
            name: program.name,
            cover: program.cover,
            rename: program.rename,
            podcastLimit: program.podcastLimit,
            metadata: program.cover || program.name ? true : program.metadata,
            full: program.full
        };
    }
    return options;
};


/**
 * call vitomuci, pass over args, opions and argv
 */
const before = Date.now();
(async () => {

    try {
        await vt(program.args[0], await getOptions(), process.argv);
        notifier.notify({
            title: "Vitomuci",
            message: "Finished after " + vt.secondsToTimeString((Date.now() - before) / 1000).replace(".", ":") + " min.",
            sound: true
        });
        console.log(chalk.green("Finished after " + vt.secondsToTimeString((Date.now() - before) / 1000).replace(".", ":") + " min."));

    } catch (error) {
        console.log(chalk.red(error));
    }

})();