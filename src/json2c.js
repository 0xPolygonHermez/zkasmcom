const path = require("path");
const fs = require("fs");
const {F1Field, Scalar} = require("ffjavascript");
const generate = require("./c_code_generator.js");

const argv = require("yargs")
    .usage("json2c.js <zkasm.json> [-c <source.files>]")
    .alias("c", "ccodegeneration")
    .argv;

async function run() {
    let inputFile;
    if (argv._.length > 1) {
        console.log("Only zkasm.json at a time is permited");
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else {
        console.log("You need to specify a zkasm.json file");
        process.exit(1);
    }
    const fullFileName = path.resolve(process.cwd(), inputFile);

    const cCodeGeneration = argv.ccodegeneration;
    const codeGenerationName = typeof(argv.ccodegeneration) === "string" ? argv.ccodegeneration : "main_exec_generated";

    const json = JSON.parse(await fs.promises.readFile(fullFileName, "utf8"));

    let functionName = codeGenerationName;
    let fileName = codeGenerationName;
    let directoryName = codeGenerationName;

    // Create directory if it does not exist
    if (!fs.existsSync(directoryName)){
        fs.mkdirSync(directoryName);
    }
    const code = await generate(json, functionName, fileName, false, false);
    await fs.promises.writeFile(directoryName + "/" + fileName + ".cpp", code, "utf8");
    const header = await generate(json, functionName, fileName, false, true);
    await fs.promises.writeFile(directoryName + "/" + fileName + ".hpp", header, "utf8");
    functionName += "_fast";
    fileName += "_fast";
    const codeFast = await generate(json, functionName, fileName, true, false);
    await fs.promises.writeFile(directoryName + "/" + fileName + ".cpp", codeFast, "utf8");
    const headerFast = await generate(json, functionName, fileName, true, true);
    await fs.promises.writeFile(directoryName + "/" + fileName + ".hpp", headerFast, "utf8");
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
