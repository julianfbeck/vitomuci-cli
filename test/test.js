const expect = require("chai").expect;
const chai = require("chai");
const vt = require("../vitomuci");
const rimraf = require("rimraf");
const fs = require("fs");
const testFolder = "testfolder";
const path = require("path");



describe("Vitomuci", async function () {
    it("clearing up testfolder", function (done) {
        rimraf.sync(testFolder);
        fs.mkdirSync(testFolder);
        done();
    });
});

describe("Test Renaming", () => {
    let files = [];
    let renamePath = path.join(testFolder, "rename")
    it("create files for testing", () => {
        let names = ["[Leopard-Raws] Boku no Hero Academia 3 - 12 RAW (NTV 1280x720 x264 AAC)", "[Leopard-Raws] Boruto - 62 RAW (TX 1280x720 x264 AAC)", "[Ohys-Raws] Akane-iro ni Somaru Saka (BD 1920x1080 x264 AAC)"]
        fs.mkdirSync(renamePath);
        names.forEach(name => {
            fs.writeFileSync(path.join(renamePath, name + ".mp4"));
            files.push(path.join(renamePath, name + ".mp4"));
        });
    });
    it("Renaming files.....", () => {
        vt.rename(files);
        let result = fs.readdirSync(renamePath);
        expect(result).to.have.all.members(["Akane-iro ni Somaru Saka.mp4", "Boku no Hero Academia 3 - 12 RAW.mp4", "Boruto - 62 RAW.mp4"]);
    });
});

describe("youtube", async function () {
    this.timeout(100000);
    it("downloadVideo()", async function () {
        let result = await vt.downloadVideo("https://www.youtube.com/watch?v=Fa2bG3cMZvM", path.join(testFolder, "test.mp4"));
        expect(fs.existsSync(result)).to.be.true;
    });
    it("getVideoTitle()", async function () {
        let result = await vt.getVideoTitle("https://www.youtube.com/watch?v=Fa2bG3cMZvM");
        expect(result).to.be.equal("New rocket test");
    });
    it("getPlaylistUrls()", async function () {
        let result = await vt.getPlaylist("https://www.youtube.com/playlist?list=PLuf9JIUOHQ-NC98LUExv1WWl4mwPXzwnI");
        expect(result).to.be.an("array");
    });
});

describe("converterFunctions", () => {
    it("stringToSeconds()", () => {
        expect(vt.stringToSeconds("1000")).to.be.equal(1000);
        expect(vt.stringToSeconds("1:30")).to.be.equal(90);
        expect(vt.stringToSeconds("01:30")).to.be.equal(90);
        expect(vt.stringToSeconds(1000)).to.be.equal(1000);
        expect(vt.stringToSeconds("1:3")).to.be.equal(63);

    });
    it("secondsToTimeString()", () => {
        expect(vt.secondsToTimeString(60)).to.be.equal("01.00");
        expect(vt.secondsToTimeString(90)).to.be.equal("01.30");
        expect(vt.secondsToTimeString(0)).to.be.equal("00.00");

    });
});


describe("Full Tests", async function () {
    this.timeout(10000000);
    it("Download youtube video", async function () {
        let option = {
            output: testFolder,
            startAt: "0:10",
            duration: "0:02"
        };
        let output = ["New rocket test_00.10-00.12.mp3",
            "New rocket test_00.12-00.14.mp3",
            "New rocket test_00.14-00.16.mp3",
            "New rocket test_00.16-00.18.mp3"
        ];
        await vt("https://www.youtube.com/watch?v=Fa2bG3cMZvM", option);
        let result = fs.readdirSync(testFolder + "/YouTube/audio");
        expect(result).to.be.an("array");
        expect(result).to.have.all.members(output);
    });
    it("Download playlist ", async function () {
        rimraf.sync(testFolder + "/YouTube");
        let option = {
            output: testFolder,
            cover: true,
            metadata: true,
            rename: true
        };
        let output = ["Mediator Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Mediator Design Pattern - Beau teaches JavaScript_03.00-05.08.mp3",
            "Module Design Pattern - Beau teaches JavaScript_00.00-02.44.mp3",
            "Observer Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Observer Design Pattern - Beau teaches JavaScript_03.00-03.56.mp3",
            "Singleton Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Singleton Design Pattern - Beau teaches JavaScript_03.00-04.50.mp3"
        ];
        await vt("https://www.youtube.com/playlist?list=PLWKjhJtqVAbnZtkAI3BqcYxKnfWn_C704", option);
        let result = fs.readdirSync(testFolder + "/YouTube/audio");
        expect(result).to.be.an("array");
        expect(result).to.have.all.members(output);
        rimraf.sync(testFolder + "/YouTube/audio");
    });
    it("Convert Folder", async function () {
        let option = {
            cover: true,
            metadata: true,
            rename: true
        };
        let output = ["Mediator Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Mediator Design Pattern - Beau teaches JavaScript_03.00-05.08.mp3",
            "Module Design Pattern - Beau teaches JavaScript_00.00-02.44.mp3",
            "Observer Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Observer Design Pattern - Beau teaches JavaScript_03.00-03.56.mp3",
            "Singleton Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Singleton Design Pattern - Beau teaches JavaScript_03.00-04.50.mp3"
        ];
        await vt(testFolder + "/YouTube", option);
        let result = fs.readdirSync(testFolder + "/YouTube/audio");
        expect(result).to.be.an("array");
        expect(result).to.have.all.members(output);
        rimraf.sync(testFolder + "/YouTube/audio");

    });
    it("Convert Regex", async function () {
        let option = {
            cover: true,
            metadata: true,
            rename: true
        };
        let output = ["Mediator Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Mediator Design Pattern - Beau teaches JavaScript_03.00-05.08.mp3",
            "Module Design Pattern - Beau teaches JavaScript_00.00-02.44.mp3",
            "Observer Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Observer Design Pattern - Beau teaches JavaScript_03.00-03.56.mp3",
            "Singleton Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Singleton Design Pattern - Beau teaches JavaScript_03.00-04.50.mp3"
        ];
        await vt(testFolder + "/YouTube/*Pattern*", option);
        let result = fs.readdirSync(testFolder + "/YouTube/audio");
        expect(result).to.be.an("array");
        expect(result).to.have.all.members(output);
        rimraf.sync(testFolder + "/YouTube/audio");
    });

    it("Convert Single file", async function () {
        let option = {
            cover: true,
            metadata: true,
            rename: true
        };
        let output = ["Mediator Design Pattern - Beau teaches JavaScript_00.00-03.00.mp3",
            "Mediator Design Pattern - Beau teaches JavaScript_03.00-05.08.mp3",
        ];
        await vt(testFolder + "/YouTube/Mediator Design Pattern - Beau teaches JavaScript.mp4", option);
        let result = fs.readdirSync(testFolder + "/YouTube/audio");
        expect(result).to.be.an("array");
        expect(result).to.have.all.members(output);
        rimraf.sync(testFolder + "/YouTube/audio");
    });

});