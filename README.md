
# VITOMUCI [![npm version](https://badge.fury.io/js/vitomuci.svg)](https://badge.fury.io/js/vitomuci) [![Build Status](https://travis-ci.org/jufabeck2202/vitomuci.svg?branch=master)](https://travis-ci.org/jufabeck2202/vitomuci)
<p >
  <img width="700" src="https://rawgit.com/jufabeck2202/vitomuci/master/screenshot.svg">
</p>

**Vitomuci** is a video to mp3 converter that splits the video file into small audio clips and combines them into one album with a generated cover. It is also possible to download videos and playlists directly and split them into clips.
It is inspired by the [sub2srs](http://subs2srs.sourceforge.net/#extract_audio) extract Audio from Media Tool.
## Installation
Install **Vitomuci** globally

```shell
npm install -g vitomuci
```
## Pros and cons of Vitomuci compared to sub2srs audio tool
### Pros:
* Vitomuci can be executed from the command line, which is faster than clicking around in a GUI.
* Mp3 clips can be combined into one album with a generated cover, which makes it easier to handle on iPods etc.
* Directly download YouTube videos/playlists and convert them to mp3 clips without other applications.
* Remove brackets and rename files to clean up filenames.
* Automatically detects all video files inside a folder and converts them to short audio clips.

### Cons:
* Requires nodejs and npm to be installed.
* User must be able to navigate inside the command line.
* Cant be used with video files that have multiple audio tracks.

## Usage
```shell
  Usage: vitomuci [options] <directory/file/yt> <output dir(only when dowloading from yt)>

  Options:

    -V, --version              output the version number
    -s, --start [start]        seconds or mm:ss, cut away start from the beginning to remove advertisment etc. (default: 0)
    -e, --end [end]            seconds or mm:ss, cut away end from the end to remove advertisment etc. (default: 0)
    -d, --duration [duration]  seconds or mm:ss, the duration of the clips the file gets split to (default: 3:00)
    -n, --name [name]          the name of the clips and metadata (default: null)
    -c, --cover                add a cover to he generated metadata
    -m, --metadata             adds metadata to all generated clips to combine them to one album
    -r, --rename               removes text inside brackets to cleanup filenames like (1080p)
    -h, --help                 output usage information
```
### Make audio clips for all files inside a folder:
```shell
vitomuci /videos/
```
### Make audio clips for all files matching a regex string:
```shell
vitomuci /videos/terrace house Episode??.mp4
```

### Download a YouTube video and split it into audio clips:
```shell
vitomuci https://www.youtube.com/watch?v=Qrli6PxgxFM Desktop/
```
### Download a YouTube playlist and split it into audio clips:
```shell
vitomuci https://www.youtube.com/playlist?list=PLuf9JIUOHQ-NC98LUExv1WWl4mwPXzwnI Desktop/
```
**When downloading YouTube videos an output path is required:** 
```shell
vitomuci <ytlink> <output folder>

```
vitomuci will create a YouTube folder and keep the downloaded .mp4 files 

## Options
**-s, --start [start]:** time you want to skip from the beginning of a file. -s 60 or -s 1:00 will skip the first 60 seconds of a file before creating mp3 clips. Useful when you want to remove intros or openings.

**-e, --end [end]:** time you want to skip from the end of a file. -e 60 or -s 1:00 will skip the last 60 seconds of a file. Useful when you want to remove outros or endings.

**-d, --duration [duration]:** the duration of the audio clips. *Default: 3 min*

**-m, --metadata:** Adds album, artist and disc metadata to combine all clips into one album. Useful if you want the clips to show up as one album and not one album per clip. *Default: false*

**-n, --name [name]:** name of to album for the clips. Default: Name of the first file. **Requires -metadata to be set**

**-c, --cover:** Takes a picture and use it as cover for the generated album. *Default: false.* **Requires -metadata to be set**

**-r, --rename:** Removes text inside brackets to cleanup filenames. Removes brackets like (1080p60) or [Japanese]. 


## Examples
```shell
vitomuci -s 0:30 -e 30 -d 1:00 -c -m /videos/testvideoPart*.mp4
```
Convert all videos files matching the regex "testvideoPart*.mp4" to mp3 and split them into 1 minute long parts, skipping the first 30 and last 30 seconds. Add metadata and a cover picture, combine them into one album. Audio clips will be saved under *videos/audio*

```shell
vitomuci -d 2:00 https://www.youtube.com/playlist?list=PLWKjhJtqVAbnZtkAI3BqcYxKnfWn_C704 desktop/
```
Download all videos from the YouTube playlist split them into 2-minute parts.

```shell
vitomuci -d 20 -r /videos/
```
Renames all video files inside the videos folder, remove strings like (1080p60) or [Japanese] and splits the renamed files into 20s clips.
