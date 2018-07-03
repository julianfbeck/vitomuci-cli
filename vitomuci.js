const path = require('upath');
const fs = require('fs');
const ffprobe = require('node-ffprobe');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ytdl = require('ytdl-core');
const ytlist = require('youtube-playlist');
const isUrl = require('is-url');
const glob = require("glob")
const fileExists = require('file-exists');
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const ora = require('ora');
let ffmetadata;

let videoFormats = [".mkv", ".mp4", ".avi", ".wmv", ".mov", ".amv", ".mpg", ".flv"];
let directory;
let processArgv;
let options;

/**
 * Vitomuci
 * @param {String} dir directory, file, file with regex, or youtube url
 * @param {*} op  options
 * @param {*} process pass process variable, only needed for cli.js
 */
async function vitomuci(dir, op, process) {
    
    if (typeof dir == undefined) throw "please specify an directory"
    directory = dir;
    processArgv = process || [0, 0, dir]; //gets set when calling as a module
    
    //set default value when calling as a module
    options = Object.assign({
        name: '',
        startAt: 0,
        endAt: 0,
        duration: 180,
        cover: false,
        rename: false,
        metadata: false,
    }, op);

    //parse time stamps to seconds
    options.startAt = stringToSeconds(options.startAt);
    options.endAt = stringToSeconds(options.endAt);
    options.duration = stringToSeconds(options.duration);

    clear();
    console.log(
        chalk.blue(
            figlet.textSync('VITOMUCI', {
                horizontalLayout: 'full'
            })
        )
    );
    //sets path variables for ffmpeg
    await checkffmpeg();

    //Download yt videos
    if (isUrl(directory)) {
        if (typeof options.output === "undefined") throw "please specify an output folder vitomuci: <yt url> <output folder>"
        let youtubeDir = path.join(options.output, "YouTube");
        if (directory.indexOf("https://www.youtube.com/") >= 0) {
            //run get playlist
            let videos = await getPlaylist(directory);
            if (videos.length == 0) videos = [directory];
            fs.mkdirSync(youtubeDir);
            const spinner = ora(`downloading ${chalk.blue(videos.length)} video(s)...`).start();
            let i = 1;
            for (let video of videos) {
                if (ytdl.validateURL(video)) {
                    let title = await getVideoTitle(video);
                    title = title.replace(/[/\\?%*:|"<>]/g, '-'); //make sure there are no illeagale characters
                    spinner.text = `downloading ${chalk.blue(title)}, video ${chalk.blue(i)}/${chalk.blue(videos.length)}`
                    await downloadVideo(video, path.join(youtubeDir, title + ".mp4"));
                    i++;
                }
            }
            spinner.succeed(`downloaded ${chalk.blue(videos.length)} video(s)`);
            //set directory to youtubeDir
            directory = youtubeDir;
        } else {
            throw "couldn´t download YouTube video, please only use YouTube links for downloading video(s)"
        }

    }
    //get files
    let files = getFiles(directory);
    //check if files are media files
    files = verifyFiles(files);
    //rename files
    if (typeof files === "undefined" || files.length == 0) throw "no files where found inside " + directory;
    files = options.rename ? rename(files) : files;
    let baseDirectory = path.dirname(files[0]);
    let outputDirectory = path.join(baseDirectory, "audio");

    //create folders, delete existing files
    if (!fs.existsSync(outputDirectory))
        fs.mkdirSync(outputDirectory);


    console.log(`found ${chalk.blue(files.length)} file(s), start converting...`)

    //main loop
    for (let item of files) {
        let seconds = await getFileLength(item);
        await convertToMp3(baseDirectory, item);
        let filename = path.basename(item)
        let removeType = filename.substr(0, filename.lastIndexOf('.')) || filename;
        await splitTrack(baseDirectory, outputDirectory, filename, Number(seconds));
        await deleteFile(path.join(baseDirectory, "temp.mp3"));

    }

    let coverPath = await getCoverPicture(files[0], baseDirectory, options.startAt)

    //set metadata name to first file in array if not set
    if (options.name === "") {
        let filename = path.basename(files[0])
        options.name = filename.substr(0, filename.lastIndexOf('.')) || filename;
    }

    //updating meta data
    if (options.metadata) {
        files = fs.readdirSync(outputDirectory)
        for (let file of files) {
            await writeMusicMetadata(path.join(outputDirectory, file), options.name, coverPath);
        }
        console.log(`updated metadata of ${chalk.blue(files.length)} file(s)`)
    }
    await deleteFile(coverPath);
}


/**
 * Sets the required ffmpeg path to all 
 * packages that require it
 */
function checkffmpeg() {

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
        if (!isUrl(processArgv[2]) && fileExists.sync(directory)) {
            let files = [];
            let foundFiles = false;
            for (let i = 2; i < processArgv.length; i++) {
                if (fileExists.sync(processArgv[i])) {
                    files.push(processArgv[i]);
                    foundFiles = true;
                }
            }
            if (foundFiles) {
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
        console.log("searching for matching file(s)... " + input);
        //remove brackets
        let removeB = "";
        for (let i = 0; i < input.length; i++) {
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
            //mediaFiles.push(upath.normalize(file));
            mediaFiles.push(file);
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
        const spinner = ora(`converting ${input} to mp3`).start();
        ffmpeg(input).format('mp3').save(baseDirectory + "/temp.mp3").on('error', console.error)
            .on('codecData', function (data) {
                fileInfo = data;
            }).on('progress', function (progress) {
                spinner.text = `converting ${input} to mp3: ${chalk.blue(progress.timemark)}`;
            }).on('end', function (stdout, stderr) {
                spinner.succeed(`converting ${input} to mp3`);
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
    let durationIndex = options.startAt;
    let parts = 0;
    const spinner = ora(`splitting ${name} into ${chalk.blue(parts + 1)} parts`).start();
    while ((durationIndex + options.duration) <= (duration - options.endAt)) {
        spinner.text = `splitting ${name} into ${chalk.blue(parts + 1)} parts`;
        await segmentMp3(path.join(baseDirectory, "temp.mp3"), path.join(outputDirectory, getSegmentName(name, durationIndex, durationIndex + options.duration)), durationIndex, options.duration);
        durationIndex += options.duration
        parts++;
    }
    if (((duration - options.endAt) - durationIndex) >= 30) {
        spinner.text = `splitting ${name} into ${chalk.blue(parts + 1)} parts`;
        await segmentMp3(path.join(baseDirectory, "temp.mp3"), path.join(outputDirectory, getSegmentName(name, durationIndex, duration - options.endAt)), durationIndex, options.duration);
        parts++;
    }
    spinner.succeed(`Splitted ${name} into ${chalk.blue(parts)} parts`)

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
 * Returns seconds from strings like 00:00 or 10000
 * @param {String} timeString 
 */
function stringToSeconds(timeString) {
    let seconds = 0;
    if (!isNaN(timeString))
        seconds = timeString;
    else if (typeof timeString === 'string' || timeString instanceof String) {
        if (timeString.indexOf(":") > -1) {
            let ms = timeString.split(':');
            seconds = (+ms[0]) * 60 + (+ms[1]);
        }
    }
    else
        throw timeString + " is not a number, please only use formats like 123 or 1:30"

    return Number(seconds);
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

        let isodate = new Date();
        let data = {
            artist: compilationName,
            genre: "speech",
            disc: 1,
            album: compilationName,
            date: isodate
        };

        let attachments = options.cover ? {
            attachments: [cover]
        } : {};

        ffmetadata.write(file, data, attachments, function (err) {
            if (err) reject(err);
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
    if (options.cover)
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
    const spinner = ora(`searching for youtube video(s)...`).start();
    return new Promise((resolve, reject) => {
        ytlist(url, 'url').then(res => {
            spinner.succeed();
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

module.exports = vitomuci;
//export mehtods for testing
vitomuci.checkffmpeg = checkffmpeg;
vitomuci.checkffmpeg = checkffmpeg;
vitomuci.downloadVideo = downloadVideo;
vitomuci.rename = rename;
vitomuci.getVideoTitle = getVideoTitle;
vitomuci.stringToSeconds = stringToSeconds;