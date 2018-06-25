# VITOMUCI
**Vitomuci** is a video to mp3 converter that splits the video file into small audio files and combines them into one album and a generated Cover.
It is inspired by the http://subs2srs.sourceforge.net/#extract_audio extract Audio from Media Tool from sub2srs
## Installation
Install **Vitomuci** globally

```shell
npm install -g vitomuci
```
## Usage
```shell
 vitomuci [options] <directory>

  Options:

    -V, --version              output the version number
    -s, --start [start]        in s: cut away start from the beginning to remove advertisment etc. (default: 18)
    -e, --end [end]            in s: cut away end from the end to remove advertisment etc. (default: 18)
    -d, --duration [duration]  the duration of the clips the file gets split to (default: 18)
    -n, --name [name]          the name of the clips and metadata (default: null)
    -c, --cover [cover]        if a cover photo should be added to the mp3 metadata (default: true)
    -o, --output [output]      name of the output folder (default: audio)
    -r, --rename               removes text inside brackets to cleanup filenames like (1080p)
    -h, --help                 output usage information
```


