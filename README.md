
# VITOMUCI [![npm version](https://badge.fury.io/js/vitomuci.svg)](https://badge.fury.io/js/vitomuci) [![Build Status](https://travis-ci.org/jufabeck2202/vitomuci.svg?branch=master)](https://travis-ci.org/jufabeck2202/vitomuci)
![](https://raw.githubusercontent.com/jufabeck2202/vitomuci/master/picture.png)

**Vitomuci** is a video to mp3 converter that splits the video file into small audio files and combines them into one album with a generated cover. It is also possible to download videos and playlists directly and split them into clips.
It is inspired by the [sub2srs](http://subs2srs.sourceforge.net/#extract_audio) extract Audio from Media Tool from sub2srs.
## Installation
Install **Vitomuci** globally

```shell
npm install -g vitomuci
```
## Usage
```shell
  Usage: vitomuci [options] <directory> <output dir(only when dowloading from yt)>

  Options:

    -V, --version              output the version number
    -s, --start [start]        in s: cut away start from the beginning to remove advertisment etc. (default: 18)
    -e, --end [end]            in s: cut away end from the end to remove advertisment etc. (default: 18)
    -d, --duration [duration]  the duration of the clips the file gets split to (default: 18)
    -n, --name [name]          the name of the clips and metadata (default: null)
    -c, --cover                if a cover photo should be added to the mp3 metadata
    -m, --metadata             adds metadata to all generated clips to combine them to one compilation
    -r, --rename               removes text inside brackets to cleanup filenames like (1080p)
    -h, --help                 output usage information
```
## Options
**-s, --start [start]** Seconds you want to skip when creating clips for a file. -s 60 will skip the first 60 seconds of a clip. Useful when you want to remove intros, or openings.
### Examples
```shell
vitomuci -s 30 -e 30 -d 60 -c -m /videos/testvideoPart*.mp4
```
This command will convert all videos files matching the regex "testvideoPart*.mp4" to mp3 and split them into 1 minute long parts, skipping the first 30 and last 30 seconds. After that a metadata and a cover picture will be added to combine them into one album. The parts will be saved under *videos/audio*

```shell
vitomuci -d 120 -o jsclips  https://www.youtube.com/playlist?list=PLWKjhJtqVAbnZtkAI3BqcYxKnfWn_C704 desktop/
```
This will download all videos inside the YouTube playlist, split them into 2 minute parts and save them on the desktop inside the *desktop/jsclips* folder

```shell
vitumici -d 20 -r /videos/
```
This will rename all files inside the videos folder to remove strings like (1080p60) or [Japanese], convert them to mp3, split them into 20 second parts and save them under *videos/audio*  (standard output folder).
**Make sure /videos/ only contains video files.**

