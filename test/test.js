const expect = require("chai").expect;
const chai = require("chai");
const vt = require("../vitomuci");
const rimraf = require('rimraf');
const fs = require('fs');
const testFolder = "testfolder/";
const {
    exec
} = require('child_process');




describe('Vitomuci', async function () {
    it("clearing up testfolder", function (done) {
            rimraf.sync(testFolder)
            fs.mkdirSync(testFolder);
    });
    it('download files', async function () {
        this.timeout(50000);
        await vt.downloadVideo("https://www.youtube.com/watch?v=kiB6wl55O8s", testFolder+"test.mp4");
    });
});