const path = require("upath");
const fs = require("fs");
const ffprobe = require("node-ffprobe");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const ytdl = require("ytdl-core");
const ytlist = require("youtube-playlist");
const isUrl = require("is-url");
const glob = require("glob");
const fileExists = require("file-exists");
const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");
const ora = require("ora");
const request = require('request');
const parsePodcast = require('node-podcast-parser');

let ffmetadata;

let videoFormats = [".mp3", ".mkv", ".mp4", ".avi", ".wmv", ".mov", ".amv", ".mpg", ".flv"];
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

    if (typeof dir == undefined) throw "please specify an directory";
    directory = dir;
    processArgv = process || [0, 0, dir]; //gets set when calling as a module

    //set default value when calling as a module
    options = Object.assign({
        name: "",
        startAt: 0,
        endAt: 0,
        duration: 180,
        cover: false,
        rename: false,
        metadata: false,
        full: false,
        podcastLimit: 0
    }, op);

    //parse time stamps to seconds
    options.startAt = stringToSeconds(options.startAt);
    options.endAt = stringToSeconds(options.endAt);
    options.duration = stringToSeconds(options.duration);

    clear();
    console.log(
        chalk.blue(
            figlet.textSync("VITOMUCI", {
                horizontalLayout: "full"
            })
        )
    );
    //sets path variables for ffmpeg
    await checkffmpeg();

    //Download yt videos
    if (isUrl(directory)) {
        const urlSpinner = ora(`Detected ${chalk.blue(directory)} as url`).start();

        if (typeof options.output === "undefined") throw "please specify an output folder vitomuci: <yt url> <output folder>";
        if (directory.indexOf("https://www.youtube.com/") >= 0) {
            let youtubeDir = path.join(options.output, "YouTube");
            //run get playlist
            let videos

            //check if single video or playlist
            try {
                videos = await getPlaylist(directory);
                if (videos.length == 0) videos = [directory];
            } catch (error) {
                console.log(error);
                videos = [directory];
            }

            urlSpinner.succeed(`Found ${chalk.blue(videos.length)} YouTube video(s)`);
            fs.mkdirSync(youtubeDir);

            const spinner = ora(`downloading ${chalk.blue(videos.length)} video(s)...`).start();
            let i = 1;
            for (let video of videos) {
                if (ytdl.validateURL(video)) {
                    let title = await getVideoTitle(video);
                    title = title.replace(/[/\\?%*:|"<>&]/g, "-"); //make sure there are no illeagale characters
                    spinner.text = `downloading ${chalk.blue(title)}, video ${chalk.blue(i)}/${chalk.blue(videos.length)}`;
                    await downloadVideo(video, path.join(youtubeDir, title + ".mp4"));
                    i++;
                }
            }
            spinner.succeed(`downloaded ${chalk.blue(videos.length)} video(s)`);
            //set directory to youtubeDir
            directory = youtubeDir;
        } else {
            //check for podcast
            let rss
            try {
                rss = await getRSS(directory);
            } catch (error) {
                urlSpinner.fail(`Could not detect podcast rss feed or YouTube link`);
                throw (directory + " is not a YouTube or RSS feed url");
            }
            //create podcast output folder
            urlSpinner.succeed(`Found ${chalk.blue(rss.episodes.length)} Podcast episodes`);
            let podcastDir = path.join(options.output, "Podcast");
            fs.mkdirSync(podcastDir);
            let episodes = options.podcastLimit == 0 ? rss.episodes : rss.episodes.slice(0, options.podcastLimit);
            const downloadSpinner = ora(`Start downloading ${chalk.blue(episodes.length)} episodes(s)...`).start();
            let i = 0;
            for (const podcast of episodes) {
                i++;
                downloadSpinner.text = `downloading ${chalk.blue(podcast.title)}, podcast ${chalk.blue(i)}/${chalk.blue(episodes.length)}`;
                await downloadAudio(path.join(podcastDir, podcast.title.replace(/[/\\?%*:|"<>&]/g, "-") + ".mp3"), podcast.enclosure.url);
            }
            downloadSpinner.succeed(`downloaded ${chalk.blue(episodes.length)} Podcast episode(s)`);

            //set main directory to podcast
            directory = podcastDir
        }

    }
    //get files
    const fileSpinner = ora(`searching for files...`).start();
    let files = getFiles(directory);
    //check if files are media files
    files = verifyFiles(files);
    if (typeof files === "undefined" || files.length == 0) {
        fileSpinner.fail("no file where found inside " + directory)
        throw "no files where found inside " + directory;
    }
    fileSpinner.succeed(`found ${chalk.blue(files.length)} file(s), start splitting...`)

    //rename files
    files = options.rename ? rename(files) : files;
    let baseDirectory = path.dirname(files[0]);
    let outputDirectory = path.join(baseDirectory, "audio");

    //create folders, delete existing files
    if (!fs.existsSync(outputDirectory))
        fs.mkdirSync(outputDirectory);

    //Split track
    for (let item of files) {
        let seconds = await getFileLength(item);
        let filename = path.basename(item);
        await splitTrack(baseDirectory, outputDirectory, filename, Number(seconds));
    }

    //set metadata name to first file in array if not set
    if (options.name === "") {
        let filename = path.basename(files[0])
        options.name = filename.substr(0, filename.lastIndexOf(".")) || filename;
    }
    //take cover picture
    let cover = "";
    if (options.cover)
        coverPath = await getCoverPicture(files[0], baseDirectory, options.startAt);

    //updating meta data
    if (options.metadata) {
        const metadataSpinner = ora(`searching for files...`).start();
        files = fs.readdirSync(outputDirectory);
        for (let file of files) {
            await writeMusicMetadata(path.join(outputDirectory, file), options.name, coverPath);
        }
        metadataSpinner.succeed(`updated metadata of ${chalk.blue(files.length)} file(s)`);
    }

    if (options.cover) await deleteFile(coverPath);

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
    console.log(chalk.grey("ffmpeg installed at:" + ffmpegPath));
    return ffmpegPath;
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
            let files = [];
            fs.readdirSync(input).forEach(file => {
                let stats = fs.statSync(path.join(input, file));
                if (stats.isFile())
                    files.push(path.join(input, file));
            });
            return (files.sort());
        }
        throw "no dir"
    } catch (error) {
        //falls back here if cli doesnt supports regex matching
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
        ffmpeg(input).seekInput(start).duration(duration).save(output)
            .on("end", function (stdout, stderr) {
                resolve();
            }).on('error', function (err, stdout, stderr) {
                reject('Cannot process video: ' + err.message);
            });
    });
};


/**
 * Splits a mp3 file into multiple smaller sized parts and renames them
 * if part is shorter than 30 seconds it gets skipped
 * @param {String} baseDirectory 
 * @param {String} outputDirectory 
 * @param {String} name 
 * @param {Number} duration 
 */
async function splitTrack(baseDirectory, outputDirectory, name, duration) {
    let parts = 0;
    const spinner = ora(`splitting ${name} into ${chalk.blue(parts + 1)} parts`).start();

    //if you dont want seprate clips
    if (options.full) {
        let ext = path.extname(name);
        let newName = path.removeExt(name, ext);
        await segmentMp3(path.join(baseDirectory, name), path.join(outputDirectory, newName + ".mp3"), 0, duration);
        spinner.succeed(`Converted ${chalk.blue(newName)} into mp3`);
        return;
    }

    let durationIndex = options.startAt;

    while ((durationIndex + options.duration) <= (duration - options.endAt)) {
        spinner.text = `splitting ${name} into ${chalk.blue(parts + 1)} parts`;
        await segmentMp3(path.join(baseDirectory, name), path.join(outputDirectory, getSegmentName(name, durationIndex, durationIndex + options.duration)), durationIndex, options.duration);
        durationIndex += options.duration;
        parts++;
    }
    if (((duration - options.endAt) - durationIndex) >= 30) {
        spinner.text = `splitting ${name} into ${chalk.blue(parts + 1)} parts`;
        await segmentMp3(path.join(baseDirectory, name), path.join(outputDirectory, getSegmentName(name, durationIndex, duration - options.endAt)), durationIndex, options.duration);
        parts++;
    }
    spinner.succeed(`splitted ${name} into ${chalk.blue(parts)} parts`);

}


/**
 * Generates Name for a Segment
 * @param {String} name 
 * @param {Number} start 
 * @param {Number} end 
 */
function getSegmentName(name, start, end) {
    let ext = path.extname(name);
    name = path.removeExt(name, ext);
    return `${name}_${secondsToTimeString(start)}-${secondsToTimeString(end)}.mp3`;
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
    else if (typeof timeString === "string" || timeString instanceof String) {
        if (timeString.indexOf(":") > -1) {
            let ms = timeString.split(":");
            seconds = (+ms[0]) * 60 + (+ms[1]);
        }
    } else
        throw timeString + " is not a number, please only use formats like 123 or 1:30";

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
            if (err) reject(err);
            resolve(probeData.format.duration);
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
    const coverPicture = ora(`took cover picture from ${chalk.blue(file)} at ${chalk.blue(picTime)}`).start();
    return new Promise((resolve, reject) => {
        ffmpeg(file)
            .screenshots({
                timestamps: [picTime],
                filename: path.join(baseDirectory, "cover.jpg"),
                size: "320x240"
            }).on("end", function (stdout, stderr) {
                coverPicture.succeed(`took cover picture from ${chalk.blue(file)} at ${chalk.blue(picTime)}`);
                resolve(path.join(baseDirectory, "cover.jpg"));
            }).on('error', function (err, stdout, stderr) {
                coverPicture.fail(chalk.red(err.message));
            });;
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
                reject(error);
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
    const spinner = ora(`renaming files...`).start();

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
    spinner.succeed(`renamed ${chalk.blue(renamedFiles.length)} files.`);
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
            .pipe(fs.createWriteStream(dir)).on("finish", () => {
                resolve(dir);
            });
    });
}


/**
 * Returns array of links if url is a playlist
 * @param {String} url of the youtube video 
 */
async function getPlaylist(url) {
    return new Promise((resolve, reject) => {
        ytlist(url, "url").then(res => {
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


/**
 * 
 * @param {String} url to the rss feed  
 */
function getRSS(url) {
    return new Promise((resolve, reject) => {
        request(url, (err, res, data) => {
            if (err)
                reject('Network error', err);

            parsePodcast(data, (err, data) => {
                if (err)
                    reject('Parsing error', err);

                resolve(data);
            });
        });
    });
}

/**
 * 
 * @param {String} path and name where the download should be stored
 * @param {String} url to the podcast
 */
function downloadAudio(path, url) {
    return new Promise((resolve, reject) => {
        request(url).pipe(fs.createWriteStream(path)).on('finish', function () {
            resolve(path)
        }).on('error', function (error) {
            reject(error);
        });
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
vitomuci.secondsToTimeString = secondsToTimeString;
vitomuci.downloadVideo = downloadVideo;
vitomuci.getVideoTitle = getVideoTitle;
vitomuci.getPlaylist = getPlaylist;