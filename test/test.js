const expect = require("chai").expect;
const chai = require("chai");
const vt = require("../vitomuci");
const rimraf = require('rimraf');
const fs = require('fs');
const testFolder = "testfolder";
const path = require("path");



describe('Vitomuci', async function () {
    it("clearing up testfolder", function (done) {
        rimraf.sync(testFolder)
        fs.mkdirSync(testFolder);
        done()
    });
    it('download files', async function () {
        this.timeout(50000);
        await vt("https://www.youtube.com/watch?v=bgU7FeiWKzc", {"output":testFolder});
    });

});

describe('Test Renaming', () => {
    let files = [];
    let renamePath = path.join(testFolder, "rename")
    it('create files for testing', () => {
        let names = ["[Leopard-Raws] Boku no Hero Academia 3 - 12 RAW (NTV 1280x720 x264 AAC)", "[Leopard-Raws] Boruto - 62 RAW (TX 1280x720 x264 AAC)", "[Ohys-Raws] Akane-iro ni Somaru Saka (BD 1920x1080 x264 AAC)"]
        fs.mkdirSync(renamePath);
        names.forEach(name => {
            fs.writeFileSync(path.join(renamePath, name + ".mp4"));
            files.push(path.join(renamePath, name + ".mp4"));
        });
    });
    it('Renaming files.....', () => {
        vt.rename(files);
        let result = fs.readdirSync(renamePath)
        expect(result).to.have.all.members(["Akane-iro ni Somaru Saka.mp4", "Boku no Hero Academia 3 - 12 RAW.mp4", "Boruto - 62 RAW.mp4"]);
    });
});

describe('test helper functions', () => {
    it('test strings to seconds', () => {
        expect(vt.stringToSeconds("1000")).to.be.equal(1000);
        expect(vt.stringToSeconds("1:30")).to.be.equal(90);
        expect(vt.stringToSeconds("01:30")).to.be.equal(90);
        expect(vt.stringToSeconds(1000)).to.be.equal(1000);
        expect(vt.stringToSeconds("1:3")).to.be.equal(63);

    });
});