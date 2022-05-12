#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const version = require("../package").version;
const compile = require("./compiler.js");

const argv = require("yargs")
    .version(version)
    .usage("zkasm <source.zkasm> -o <output.json>")
    .alias("o", "output")
    .option('D', {
        alias: 'define',
        array: true
    })
    .argv;

async function run() {
    let inputFile;
    if (argv._.length == 0) {
        console.log("Only one circuit at a time is permited");
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else  {
        console.log("You need to specify a source file");
        process.exit(1);
    }
    const fullFileName = path.resolve(process.cwd(), inputFile);
    const fileName = path.basename(fullFileName, ".zkasm");

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : fileName + ".json";

    const defines = [];
    if (argv.define) {
        argv.define.forEach((define) => {
            const [name, value] = define.trim().split('=');
            if (value.length > 1 && value.charAt(value.length-1) == 'n') {
                defines[name] = {value: BigInt(value.substr(0, -1)), type: 'CONSTL', line: false, fileName: false};
            } else {
                defines[name] = {value: BigInt(value), type: 'CONST', line: false, fileName: false};
            }
        });
    }
    const out = await compile(fullFileName, null, {defines: defines});
    // console.log(JSON.stringify(out, null, 1));

    await fs.promises.writeFile(outputFile, JSON.stringify(out, null, 1) + "\n");

    /*
    let writeStream = fs.createWriteStream(outputFile);

    // the finish event is emitted when all data has been flushed from the stream

    for (let i=0; i<out.length; i++) {
        let S = out[i].toString(16).padStart(64, "0");
        writeStream.write("0x"+S+ "\n", 'utf8');
    }

    // close the stream
    writeStream.end();

    await new Promise(fulfill => writeStream.on("finish", fulfill));

    */
}

run().then(()=> {
    process.exit(0);
}, (err) => {
//    console.log(err);
    console.log(err.stack);
    if (err.pos) {
        console.error(`ERROR at ${err.errFile}:${err.pos.first_line},${err.pos.first_column}-${err.pos.last_line},${err.pos.last_column}   ${err.errStr}`);
    } else {
        console.log(err.message);
    }
    process.exit(1);
});

