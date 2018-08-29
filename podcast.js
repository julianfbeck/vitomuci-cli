const request = require('request');
const parsePodcast = require('node-podcast-parser');
const fs = require('fs')


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
function downloadPodcast(path,url) {
    return new Promise((resolve, reject) => {
        request(url).pipe(fs.createWriteStream(path)).on('finish', function () {
            resolve(path)
        }).on('error', function (error) {
            reject(error);
        });
    });
}


async function getPodcast(url) {
    let rss = await getRSS(url);
    console.log(` Found ${rss.episodes.length} episodes`);
    for (const podcast of rss.episodes) {
        console.log(podcast.title);
        await downloadPodcast(podcast.title+".mp3",podcast.enclosure.url);
    }

}

getPodcast("https://collegeinfogeek.com/podcast")
