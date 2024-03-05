#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const version = require("../package").version;
const lodash = require('lodash');

const argv = require("yargs")
    .version(version)
    .usage("compare_rom_json <new_rom.json> <legacy_rom.json>")
    .argv;

async function run() {
    if (argv._.length !== 2) {
        console.log("Two json files are required");
        process.exit(1);
    }
    const inputFiles = [argv._[0], argv._[1]];

    const roms = [JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputFiles[0])), "utf8"),
                 JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputFiles[1])), "utf8")];

    const programs = [roms[0].program, roms[1].program];
    const lineCount = Math.max(programs[0].length, programs[1].length);
    console.log(lineCount);
    let previousBugJMPZ = false;
    for (let line = 0; line < lineCount; ++line ) {
        let current = {...programs[0][line]};
        let legacy = {...programs[1][line]};
        if (current.assumeFree === 0) {
            delete current.assumeFree;
        }
        if (current.hashK === 0) {
            delete current.hashK;
        }
        if (current.hashP === 0) {
            delete current.hashP;
        }
        if (current.hashS === 0) {
            delete current.hashS;
        }
        const hash = current.hashK === 1 || current.hashP === 1 || current.hashS === 1;
        if (hash && current.hashBytes === 0 && current.hashBytesInD === 1) {
            delete current.hashBytes;
            delete current.hashBytesInD;
        }
        if (current.hashK === 1 && current.hashBytes === 1 && current.hashBytesInD === 0) {
            delete current.hashBytes;
            delete current.hashBytesInD;
            delete current.hashK;
            current.hashK1 = 1;
        }
        if (current.hashP === 1 && current.hashBytes === 1 && current.hashBytesInD === 0) {
            delete current.hashBytes;
            delete current.hashBytesInD;
            delete current.hashP;
            current.hashP1 = 1;
        }
        if (current.hashS === 1 && current.hashBytes === 1 && current.hashBytesInD === 0) {
            delete current.hashBytes;
            delete current.hashBytesInD;
            delete current.hashS;
            current.hashS1 = 1;
        }
        if (current.offset === 0 && typeof legacy.offset === 'undefined') {
            delete current.offset;
        }
        if (typeof current.minInd !== 'undefined') {
            delete current.minInd;
        }
        if (typeof legacy.maxInd !== 'undefined' && !legacy.ind && !legacy.indRR) {
            delete legacy.maxInd;
            delete legacy.baseLabel;
            delete legacy.sizeLabel;
        }
        current = {source: current.fileName + ':' + current.line, ...current };
        const currentSource = [current.fileName, current.line];
        delete current.fileName;
        delete current.line;

        legacy = {source: legacy.fileName + ':' + legacy.line, ...legacy };
        const legacySource = [legacy.fileName, legacy.line];
        delete legacy.fileName;
        delete legacy.line;

        if (current.cmdBefore && !legacy.cmdBefore && previousBugJMPZ && 
            lodash.isEqual(current.cmdBefore, programs[1][line-1].cmdAfter)) {
            delete current.cmdBefore;
        }

        if (legacy.cmdAfter && !current.cmdAfter && legacy.JMPZ && current.JMPZ && 
            lodash.isEqual(legacy.cmdAfter, programs[0][line+1].cmdBefore)) {
            previousBugJMPZ = true;            
            const csource = [currentSource[0],currentSource[1] + 1].join(':');
            console.log('----------------------------------------------------------------------------------');
            console.log(`cmdAfter(${legacy.source}) ==> cmdBefore(${csource})\n\n${legacy.source}| ${legacy.lineStr}\n${csource}| ${programs[0][line+1].lineStr}\n`, legacy.cmdAfter);
            delete legacy.cmdAfter;
        } else {
            previousBugJMPZ = false;
        }

        if (lodash.isEqual(current, legacy)) continue;
        console.log(`================================== DIFFS at ${current.source} ==================================`);
        console.log(current);
        console.log(legacy);
        // break;
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.stack);
    console.log(err.message);
    process.exit(1);
});

