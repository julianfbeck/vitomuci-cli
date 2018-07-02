const vt = require("./vitomuci");
const fs = require("fs");
const path = require("upath");
const folder = "testfolder/";



/* fs.watch(folder, async function (eventType, filename) {
    try {
        if (fs.lstatSync(path.join(folder, filename)).isDirectory());
            await vt(path.join(folder, filename));
    } catch (error) {
        console.log("no directory");
    }
}); */