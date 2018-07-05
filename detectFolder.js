const vt = require("./vitomuci");
const fs = require("fs");
const path = require("upath");
const folder = "testfolder/";
const {
    spawn
} = require('child_process');

 async function listener1(current,previous) {
     console.log(current,previous);
    try {
        if (fs.lstatSync(path.join(folder, current)).isDirectory()) {
           
            await vt(path.join(folder, current));            
        }
    } catch (error) {
        console.log("no directory");
    }
}

fs.watchFile(folder, listener1);

