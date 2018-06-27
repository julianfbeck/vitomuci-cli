#!/usr/bin/env node

/*
 * @Author: Julian Beck
 * @Date: 2018-06-25 09:34:35
 * @LastEditors: OBKoro1
 * @LastEditTime: 2018-06-26 08:28:50
 * @Description: Video to mp3 converter
 */
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const path = require('path');
const https = require('https');
const fs = require('fs');
const AdmZip = require('adm-zip');
const ffprobe = require('node-ffprobe');
const chalk = require('chalk');
const logUpdate = require('log-update');
const program = require('commander');
const upath = require("upath");
const ytdl = require('ytdl-core');
const ytlist = require('youtube-playlist');
const isUrl = require('is-url');
const glob = require("glob")
const fileExists = require('file-exists');


//gets set AFTER the path env has been set
let ffmetadata;
let startAtS;
let endAt;
let clipLength;
let seriesName;
let audioDirectory;
let directory;
let ytOutput;
let videoFormats = [".mkv", ".mp4", ".avi", ".wmv", ".mov", ".amv", ".mpg", ".flv"];


program
    .version('0.0.1')
    .usage('[options] <directory> <output dir(only when dowloading from yt)> ')
    .option('-s, --start [start]', 'in s: cut away start from the beginning to remove advertisment etc.', 0)
    .option('-e, --end [end]', 'in s: cut away end from the end to remove advertisment etc.', 0)
    .option('-d, --duration [duration]', 'the duration of the clips the file gets split to', 180)
    .option('-n, --name [name]', 'the name of the clips and metadata', null)
    .option('-c, --cover', 'if a cover photo should be added to the mp3 metadata', true)
    .option('-m, --metadata', 'adds metadata to all generated clips to combine them to one compilation', true)
    .option('-o, --output [output]', 'name of the output folder', "audio")
    .option('-r, --rename', 'removes text inside brackets to cleanup filenames like (1080p)', false)
    .parse(process.argv);


if (typeof program.args[1] !== "undefined") {
    //only gets used when downloading yt videos. location for downloaded videos
    ytOutput = upath.normalize(program.args[1]);
    //ytOutput = upath.normalize(program.args[1]).replace(/\/$/, "");

}

startAt = Number(program.start);
endAt = Number(program.end);
clipLength = Number(program.duration);
audioDirectory = program.output;
seriesName = program.name;

if (require.main === module) {
    main();
    if (!program.args.length) {
        program.help();
    }
}

module.exports.checkffmpeg = checkffmpeg;
module.exports.downloadVideo = downloadVideo;

/**
 * Main
 */
async function main() {
    directory = program.args[0];
    //startup
    if (isUrl(directory)) {
        if (directory.indexOf("https://www.youtube.com/") >= 0) {
            //run get playlist
            console.log(`detected youtube url....`)
            let videos = await getPlaylist(directory);
            if (videos.length == 0) videos = [directory];
            console.log(`downloading ${chalk.blue(videos.length)} video(s)...`)
            let i = 1;
            for (let video of videos) {
                if (ytdl.validateURL(video)) {
                    let title = await getVideoTitle(video);
                    title = title.replace(/[/\\?%*:|"<>]/g, '-'); //make sure there are no illeagale characters
                    logUpdate(`downloading ${chalk.blue(title)}, video ${chalk.blue(i)}/${chalk.blue(videos.length)}...`);
                    await downloadVideo(video, path.join(ytOutput, title + ".mp4"));
                    i++;
                }
            }
            console.log(`downloaded ${chalk.blue(videos.length)} video(s)`);
            //set directory to ytOutput
            directory = ytOutput;
        } else {
            throw "couldnt download youtube video, please only use youtube links for downloading videos"
        }

    } else {
        //cleanup directory upath.normalize(program.args[0]).replace(/\/$/, "");
        directory = program.args[0];
    }
    await checkffmpeg();
    //get files
    let files = getFiles(directory);
    //check if files are media files
    files = verifyFiles(files);
    //rename files
    files = program.rename ? rename(files) : files
    let baseDirectory = path.dirname(files[0]);
    //let baseDirectory = path.dirname(files[0]);
    let outputDirectory = path.join(baseDirectory, audioDirectory);

    //create folders, delete existing files
    if (!fs.existsSync(outputDirectory))
        fs.mkdirSync(outputDirectory);
    if (fs.existsSync(path.join(baseDirectory, "temp.mp3")))
        await deleteFile(path.join(baseDirectory, "temp.mp3"));

    console.log(`found ${chalk.blue(files.length)} files, start converting...`)

    //main loop
    for (let item of files) {
        let seconds = await getFileLength(item);
        await convertToMp3(baseDirectory, item);
        let filename = path.basename(item)
        let removeType = filename.substr(0, filename.lastIndexOf('.')) || filename;
        await splitTrack(baseDirectory, outputDirectory, filename, Number(seconds));
        await deleteFile(path.join(baseDirectory, "temp.mp3"));

    }

    let coverPath = await getCoverPicture(files[0], baseDirectory, startAt)
    coverPath = upath.normalize(coverPath);
    let compilationName = files[0].substr(0, files[0].lastIndexOf('.')) || files[0];

    //set metadata name to first file in array if not set
    if (seriesName == null) {
        let filename = path.basename(files[0])
        seriesName = filename.substr(0, filename.lastIndexOf('.')) || filename;
    }

    //updating meta data
    if (program.metadata) {
        fs.readdir(outputDirectory, async function (err, files) {
            for (let file of files) {
                await writeMusicMetadata(path.join(outputDirectory, file), seriesName, coverPath);
            }
            console.log(`updated metadata of ${chalk.blue(files.length)} Files`)
        })
    }
    await deleteFile(coverPath);

}


/**
 * Sets the required ffmpeg path to all 
 * packages that require it
 */
async function checkffmpeg() {

    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    process.env.FFMPEG_PATH = ffmpegPath;
    ffprobe.FFPROBE_PATH = ffprobePath;
    ffmetadata = require("ffmetadata");
    console.log(chalk.green('ffmpeg installed at:' + ffmpegPath));
}



/**
 * Searches for files inside input,
 * or search for matching files if a regex
 * gets inputed
 * @param {String} input directory or file
 * @returns {Promise} array with files
 */
function getFiles(input) {
    try {
        //cli supports regex matching
        if (!isUrl(process.argv[2])&&fileExists.sync(program.args[0])) {
            let files=[];
            let foundFiles = false;
            for (let i = 2; i < process.argv.length; i++) {
                if(fileExists.sync(process.argv[i])){
                    files.push(process.argv[i]);
                    foundFiles = true;
                }
            }
            if(foundFiles){
                return files;
            }
        }
        //directory
        if (fs.lstatSync(input).isDirectory()) {
            console.log("searching " + chalk.blue(input) + " for files...");
            let files = []
            fs.readdirSync(input).forEach(file => {
                let stats = fs.statSync(path.join(input, file));
                if (stats.isFile() && !(file === "temp.mp3"))
                    files.push(path.join(input, file));
            });
            return (files.sort());
        }
        throw "no dir"
    } catch (error) {
        //falls back here if cli doesnt supports regex matching
        console.log("searching for matching files... " + input);
        //remove brackets
        let removeB = "";
        for (var i = 0; i < input.length; i++) {
            if (input.charAt(i) == "[") {
                removeB = removeB.concat("[[]");
            } else if (input.charAt(i) == "]") {
                removeB = removeB.concat("[]]");
            } else {
                removeB = removeB.concat(input.charAt(i));
            }
        }
        //return glob search
        return glob.sync(removeB);


    }
}

/**
 * Checks if found files are media files
 * @param {Array} files array of files
 */
function verifyFiles(files) {
    let mediaFiles = [];
    files.forEach(file => {
        if (videoFormats.includes(path.extname(file))) {
            mediaFiles.push(upath.normalize(file));
        }
    });
    return mediaFiles;
}


/**
 * Converts a media file into a mp3 file called temp.mp3
 * @param {*} baseDirectory 
 * @param {*} input 
 */
function convertToMp3(baseDirectory, input) {
    return new Promise((resolve, reject) => {
        let fileInfo;
        logUpdate(`converting ${input} to mp3`);
        ffmpeg(input).format('mp3').save(baseDirectory + "/temp.mp3").on('error', console.error)
            .on('codecData', function (data) {
                fileInfo = data;
            }).on('progress', function (progress) {
                logUpdate(`converting ${input} to mp3: ${chalk.blue(progress.timemark)}`);
            }).on('end', function (stdout, stderr) {
                console.log(`converting ${input} to mp3`);
                resolve(fileInfo);
            });
    });
};

/**
 * Extracts one clip out of a longer mp3 file using the 
 * seekInput and duration fuction.
 * Gets called when splitting up a larger file smaller ones
 * @param {String} input 
 * @param {String} output 
 * @param {Number} start 
 * @param {Number} duration 
 */
function segmentMp3(input, output, start, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(input).seekInput(start).duration(duration).save(output).on('error', console.error)
            .on('end', function (stdout, stderr) {
                resolve();
            });
    });
};


/**
 * Splits a mp3 file into multiple smaler sized parts and renames them
 * if part is shorter than 30 seconds it gets skipped
 * @param {String} baseDirectory 
 * @param {String} outputDirectory 
 * @param {String} name 
 * @param {Number} duration 
 */
async function splitTrack(baseDirectory, outputDirectory, name, duration) {
    let durationIndex = startAt;
    let parts = 0;
    while ((durationIndex + clipLength) <= (duration - endAt)) {
        logUpdate(`splitting ${name} into ${chalk.blue(parts+1)} parts`);
        await segmentMp3(path.join(baseDirectory, "temp.mp3"), path.join(outputDirectory, getSegmentName(name, durationIndex, durationIndex + clipLength)), durationIndex, clipLength);
        durationIndex += clipLength
        parts++;
    }
    if (((duration - endAt) - durationIndex) >= 30) {
        logUpdate(`splitting ${name} into ${chalk.blue(parts+1)} parts`);
        await segmentMp3(path.join(baseDirectory, "temp.mp3"), path.join(outputDirectory, getSegmentName(name, durationIndex, duration - endAt)), durationIndex, clipLength);
        parts++;
    }

}


/**
 * Generates Name for a Segment
 * @param {String} name 
 * @param {Number} start 
 * @param {Number} end 
 */
function getSegmentName(name, start, end) {
    return `${name}_${secondsToTimeString(start)}-${secondsToTimeString(end)}.mp3`
}


/**
 * Converts seconds into a ISO time string 
 * @param {Number} seconds 
 */
function secondsToTimeString(seconds) {
    return new Date(seconds * 1000).toISOString().substr(14, 5).replace(":", ".");

}


/**
 * Returns the duration of a given 
 * media file
 * @param {*} file 
 */
function getFileLength(file) {
    return new Promise((resolve, reject) => {
        ffprobe(file, (err, probeData) => {
            resolve(probeData.format.duration)
        });
    });
}


/**
 * Writes music meta data and cover to the given file
 * Also sets disc:1 to join all mp3 files into one copilation
 * @param {String} file 
 * @param {String} compilationName 
 * @param {String} cover 
 */
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

        let options = program.cover ? {
            attachments: [cover]
        } : {};
        ffmetadata.write(file, data, options, function (err) {
            if (err) console.error("Error writing metadata", err);
            resolve();
        });
    });
}


/**
 * Takes a picture from a media file and saves it as
 * cover.jpg used to generate a cover
 * @param {String} file 
 * @param {String} baseDirectory 
 * @param {String} picTime 
 */
function getCoverPicture(file, baseDirectory, picTime) {
    if (program.cover)
        console.log(`took cover picture from ${chalk.blue(file)} at ${chalk.blue(picTime)}`);
    return new Promise((resolve, reject) => {
        ffmpeg(file)
            .screenshots({
                timestamps: [picTime],
                filename: path.join(baseDirectory, "cover.jpg"),
                size: '320x240'
            }).on('end', function (stdout, stderr) {
                resolve(path.join(baseDirectory, "cover.jpg"))
            });
    });
};


/**
 * Promise wrap for deleting a file
 * @param {*} file 
 */
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


/**
 * Cleans up the filename of the given files
 * Removes Brackets and the text inside them
 * @param {Array} files 
 */
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
    console.log("renamed files to " + renamedFiles);
    return renamedFiles;
}


/**
 * Downloads youtube video and saves it as mp4
 * @param {String} url of the youtube video
 * @param {String} dir where the video should be placed
 */
async function downloadVideo(url, dir) {
    return new Promise((resolve, reject) => {
        ytdl(url)
            .pipe(fs.createWriteStream(dir)).on('finish', () => {
                resolve();
            });
    });
}


/**
 * Returns array of links if url is a playlist
 * @param {String} url of the youtube video 
 */
async function getPlaylist(url) {
    return new Promise((resolve, reject) => {
        ytlist(url, 'url').then(res => {
            resolve(res.data.playlist);
        });
    });
}


/**
 * Gets the title of a video
 * @param {} url 
 */
async function getVideoTitle(url) {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(url, (err, info) => {
            if (err) throw reject(err);
            resolve(info.title);
        })
    });
}