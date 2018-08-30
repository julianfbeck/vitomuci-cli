const vt = require("./vitomuci");
const fs = require("fs");
const path = require("upath");
const folder = "testfolder/";
const {
    spawn
} = require("child_process");
const youtubedl = require('youtube-dl');

var video = youtubedl('http://www.youtube.com/watch?v=90AiXO1pAiA',
  // Optional arguments passed to youtube-dl.
  ['--format=18'],
  // Additional options can be given for calling `child_process.execFile()`.
  { cwd: __dirname });
 
// Will be called when the download starts.
video.on('info', function(info) {
  console.log('Download started');
  console.log('filename: ' + info.filename);
  console.log('size: ' + info.size);
});
 
video.pipe(fs.createWriteStream('myvideo.mp4'));