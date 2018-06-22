const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const path = require('path');
const https = require('https');
const fs = require('fs');
const AdmZip = require('adm-zip');
const glob = require("glob");
const ffprobe = require('node-ffprobe');
const chalk = require('chalk');
const logUpdate = require('log-update');
const program = require('commander');
const upath = require("upath");
//gets set AFTER the path env has been set
let ffmetadata;





let startAt = 0;
let endAt = 0;
let clipLength = 0;
let seriesName;
let audioDirectory;
let directory



program
    .version('0.0.1')
    .usage('[options] <directory>')
    .option('-s, --start [start]', 'in s: cut away start from the beginning to remove advertisment etc.', 18)
    .option('-e, --end [end]', 'in s: cut away end from the end to remove advertisment etc.', 18)
    .option('-d, --duration [duration]', 'the duration of the clips the file gets split to', 18)
    .option('-n, --name [name]', 'the name of the clips and metadata', null)
    .option('-c, --cover [cover]', 'if a cover photo should be added to the mp3 metadata', true)
    .option('-o, --output [output]', 'name of the output folder', "audio")
    .option('-r, --rename', 'removes text inside brackets to cleanup filenames like (1080p)', false)


    .parse(process.argv);




async function downloadFfpeg() {
    console.log(chalk.green('Looking for ffmpeg instalation'));
    //TODO check if envirment is set
    if (!fs.existsSync("./ffmpeg")) {
        console.log(chalk.red("ffmpeg missing"));
        console.log(chalk.red("Download ffmpeg......."));
        await downloadFfmpeg("https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-4.0-win64-static.zip");
        // unzip
        let zip = new AdmZip("ffmpeg.zip");
        zip.extractAllTo("./ffmpeg", true);

        fs.unlink('ffmpeg.zip', (err) => {
            if (err) throw err;
        });
        console.log(chalk.green("Finish instalation"));
    };
    //set path
    fs.readdirSync("./ffmpeg").forEach(file => {
        ffmpegPath = `/ffmpeg/${file}/bin/ffmpeg.exe`;
        ffprobePath = `/ffmpeg/${file}/bin/ffprobe.exe`;
        process.env.FFMPEG_PATH = path.join(__dirname, ffmpegPath);
        ffmetadata = require("ffmetadata");
        // (__dirname + ffmpegPath).replace("/","\\");
        ffprobe.FFPROBE_PATH = __dirname + ffprobePath;
        ffmpeg.setFfmpegPath(path.join(__dirname, ffmpegPath));
        ffmpeg.setFfprobePath(path.join(__dirname, ffprobePath));
        console.log(chalk.green('ffmpeg installed at:' + ffmpegPath));
    })
}


async function checkffmpeg() {

    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    process.env.FFMPEG_PATH = ffmpegPath;
    ffprobe.FFPROBE_PATH = ffprobePath;
    ffmetadata = require("ffmetadata");
    console.log(chalk.green('ffmpeg installed at:' + ffmpegPath));
}

async function downloadFfmpeg(file_url) {
    return new Promise((resolve, reject) => {
        let file = fs.createWriteStream("ffmpeg.zip");
        let request = https.get(file_url, function (response) {
            response.pipe(file).on('finish', function () {
                resolve();
            })
        });
    });
};

function convertToMp3(baseDirectory, input) {
    return new Promise((resolve, reject) => {
        let fileInfo;
        logUpdate(`Converting ${input} to mp3`);
        ffmpeg(input).format('mp3').save(baseDirectory + "/temp.mp3").on('error', console.error)
            .on('codecData', function (data) {
                fileInfo = data;
            }).on('progress', function (progress) {
                logUpdate(`Converting ${input} to mp3: ${chalk.blue(progress.timemark)}`);
            }).on('end', function (stdout, stderr) {

                resolve(fileInfo);
            });
    });
};

function segmentMp3(input, output, start, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(input).seekInput(start).duration(duration).save(output).on('error', console.error)
            .on('end', function (stdout, stderr) {
                resolve();
            });
    });
};


function getCoverPicture(file, baseDirectory, picTime) {
    console.log("take cover picture from " + file + " at " + picTime);
    return new Promise((resolve, reject) => {
        ffmpeg(file)
            .screenshots({
                timestamps: [picTime],
                filename: baseDirectory + "/cover.jpg",
                size: '320x240'
            }).on('end', function (stdout, stderr) {
                resolve(baseDirectory + "/cover.jpg");
            });
    });
};

async function splitTrack(baseDirectory, outputDirectory, name, duration) {
    let durationIndex = startAt;
    let parts = 0;
    while ((durationIndex + clipLength) <= (duration - endAt)) {
        logUpdate(`Splitting ${name} into ${chalk.blue(parts+1)} parts`);
        await segmentMp3(baseDirectory + "/temp.mp3", outputDirectory + "/" + getSegmentName(name, durationIndex, durationIndex + clipLength), durationIndex, clipLength);
        durationIndex += clipLength
        parts++;
    }
    if (((duration - endAt) - durationIndex) >= 30) {
        await segmentMp3(baseDirectory + "/temp.mp3", getSegmentName(name, durationIndex, (duration - endAt) - durationIndex), durationIndex, clipLength);
        parts++;
    }

}

function getSegmentName(name, start, end) {
    return `${name}_${secondsToTimeString(start)}-${secondsToTimeString(end)}.mp3`
}

function secondsToTimeString(seconds) {
    return new Date(seconds * 1000).toISOString().substr(14, 5).replace(":", ".");

}

function getFiles(input) {
    return new Promise((resolve, reject) => {
        try {
            //directory
            if (fs.lstatSync(input).isDirectory()) {
                console.log("searching " + input + " for files...");
                fs.readdir(input, (err, items) => {
                    let files = []
                    items.forEach((file) => {
                        let stats = fs.statSync(path.join(input, file));
                        if (stats.isFile() && !(file === "temp.mp3"))
                            files.push(path.join(input, file));
                    });
                    resolve(files.sort());
                })
            }
        } catch (error) {
            //single file
            if (fs.existsSync(input)) {
                resolve([input]);
            }
            //remove brackets
            let removeB = ""
            for (var i = 0; i < input.length; i++) {
                if (input.charAt(i) == "[") {
                    removeB = removeB.concat("[[]");
                } else if (input.charAt(i) == "]") {
                    removeB = removeB.concat("[]]");
                } else {
                    removeB = removeB.concat(input.charAt(i));
                }
            }
            console.log("searching for matching files... " + removeB);
            glob(removeB, function (er, files) {
                console.log(files.length + " Files found");
                resolve(files.sort());
            })
            reject("no file was found")
        }
    });
}


function writeMusicMetadata(file, compilationName, cover) {
    return new Promise((resolve, reject) => {

        var isodate = new Date();
        var data = {
            artist: compilationName,
            genre: "speech",
            disc: 1,
            album: compilationName,
            date: isodate
        };
        var options = {
            attachments: [cover],
        };

        ffmetadata.write(file, data, options, function (err) {
            if (err) console.error("Error writing metadata", err);
            resolve();
        });
    });
}

function deleteFile(file) {
    return new Promise((resolve, reject) => {
        fs.unlink(file, function (error) {
            if (error) {
                throw error;
            }
            resolve();
        });
    });
}


function getFileLength(file) {
    return new Promise((resolve, reject) => {
        ffprobe(file, (err, probeData) => {
            resolve(probeData.format.duration)
        });
    });
}

function rename(files) {
    let renamedFiles = [];
    files.forEach(function (file) {
        let basename = path.basename(file);
        let curDir = path.dirname(file)
        let removeRound = basename.replace(/ *\([^)]*\) */g, "");
        let removeSquare = removeRound.replace(/ *\[[^)]*\] */g, "");
        let newName = path.join(curDir, removeSquare);
        renamedFiles.push(newName);
        fs.renameSync(file, newName);
    });
    console.log("Renamed files to " + renamedFiles);
    return renamedFiles;
}



async function main() {
    //startup
    await checkffmpeg();
    let files = await getFiles(directory);
    files = program.rename ? rename(files) : files

    let baseDirectory = path.dirname(files[0]);
    let outputDirectory = path.join(baseDirectory, audioDirectory);

    //create folders, delete existing files
    if (!fs.existsSync(outputDirectory))
        fs.mkdirSync(outputDirectory);
    if (fs.existsSync(baseDirectory + "/temp.mp3"))
        await deleteFile(baseDirectory + "/temp.mp3");

    console.log(`Found ${chalk.blue(files.length)} Files, start converting...`)
    
    //main process
    for (let item of files) {
        let seconds = await getFileLength(item);
        await convertToMp3(baseDirectory, item);
        let filename = path.basename(item)
        let removeType = filename.substr(0, filename.lastIndexOf('.')) || filename;
        await splitTrack(baseDirectory, outputDirectory, filename, Number(seconds));
        await deleteFile(baseDirectory + "/temp.mp3");

    }

    let coverPath = await getCoverPicture(files[0], baseDirectory, startAt)
    let compilationName = files[0].substr(0, files[0].lastIndexOf('.')) || files[0];

    //set metadata name to first file in array if not set
    if (seriesName == null) {
        let filename = path.basename(files[0])
        seriesName = filename.substr(0, filename.lastIndexOf('.')) || filename;
    }

    //updating meta data
    fs.readdir(outputDirectory, async function (err, files) {
        for (let file of files) {
            await writeMusicMetadata(outputDirectory + "/" + file, seriesName, coverPath);
        }
        console.log(`updated metadata of ${files.length} Files`)
        await deleteFile(coverPath);
    })
}


if (!program.args.length) {
    program.help();
}
directory = upath.normalize(program.args[0]).replace(/\/$/, "");
startAt = Number(program.start);
endAt = Number(program.end);
clipLength = Number(program.duration);
audioDirectory = program.output;
seriesName = program.name;


main();