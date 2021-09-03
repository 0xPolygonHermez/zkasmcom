const path = require("path");
const fs = require("fs");
const zkasm_parser = require("../build/zkasm_parser.js").parser;
const command_parser = require("../build//command_parser.js").parser;
const { type } = require("os");

module.exports = async function compile(fileName, ctx) {

    let isMain;
    if (!ctx) {
        ctx = {
            definedLabels: {},
            refs: [],
            out: [],
            vars: {},
            lastGlobalVarAssigned: -1,
            lastLocalVarCtxAssigned: -1
        }
        isMain = true;
    } else {
        isMain = false;
    }

    const fullFileName = path.resolve(process.cwd(), fileName);
    const fileDir = path.dirname(fullFileName);

    const src = await fs.promises.readFile(fullFileName, "utf8") + "\n";

    const lines = zkasm_parser.parse(src);

    let pendingCommands = [];
    let lastLineAllowsCommand = false;

    for (let i=0; i<lines.length; i++) {
        const l = lines[i];
        l.fileName = fileName;
        if (l.type == "include") {
            const fullFileNameI = path.resolve(fileDir, l.file);
            await compile(fullFileNameI, ctx);
            if (pendingCommands.length>0) error(l, "command not allowed before include");
            lastLineAllowsCommand = false;
        } else if (l.type == "var") {
            if (typeof ctx.vars[l.name] !== "undefined") error(l, `Variable ${l.name} already defined`);
            if (l.scope == "GLOBAL") {
                ctx.vars[l.name] = {
                    scope: "GLOBAL",
                    offset: ++ctx.lastGlobalVarAssigned
                }
            } else if (l.scope == "CTX") {
                ctx.vars[l.name] = {
                    scope: "CTX",
                    offset: ++(ctx.lastLocalVarCtxAssigned)
                }
            } else {
                throw error(l, `Invalid scope ${l.scope}`);
            }
            if (pendingCommands.length>0) error(l, "command not allowed before var");
            lastLineAllowsCommand = false;
        } else if (l.type == "step") {
            const traceStep = {
                // type: "step"
            };
            try {
                if (l.assignment) {
                    appendOp(traceStep, processAssignmentIn(l.assignment.in));
                    appendOp(traceStep, processAssignmentOut(l.assignment.out));    
                }
                for (let j=0; j< l.ops.length; j++) {
                    appendOp(traceStep, l.ops[j])
                }
            } catch (err) {
                error(l, err);
            }
            // traceStep.lineNum = ctx.out.length;
            traceStep.line = l;
            ctx.out.push(traceStep);
            if (pendingCommands.length>0) {
                traceStep.cmdBefore = pendingCommands;
                pendingCommands = [];
            }
            lastLineAllowsCommand = !(traceStep.JMP || traceStep.JMPC);
        } else if (l.type == "label") {
            const id = l.identifier
            if (ctx.definedLabels[id]) error(l, `RedefinedLabel: ${id}` );
            ctx.definedLabels[id] = ctx.out.length;
            if (pendingCommands.length>0) error(l, "command not allowed before label")
            lastLineAllowsCommand = false;
        } else if (l.type == "command") {
            if (lastLineAllowsCommand) {
                if (typeof ctx.out[ctx.out.length-1].cmdAfter === "undefined")
                    ctx.out[ctx.out.length-1].cmdAfter = [];
                ctx.out[ctx.out.length-1].cmdAfter.push(l.cmd);
            } else {
                pendingCommands.push(l.cmd);
            }
        } else {
            error(l, `Invalid line type: ${l.type}`);
        }
    }


    if (isMain) {
        for (let i=0; i<ctx.out.length; i++) {
            if (
                    (typeof ctx.out[i].offset !== "undefined") &&
                    (isNaN(ctx.out[i].offset))
               ) {
                if (ctx.out[i].JMP || ctx.out[i].JMPC) {
                    if (typeof ctx.definedLabels[ctx.out[i].offset] === "undefined") {
                        error(ctx.out[i].line, `Label: ${ctx.out[i].offset} not defined.`);
                    }
                    ctx.out[i].offsetLabel = ctx.out[i].offset;
                    ctx.out[i].offset = ctx.definedLabels[ctx.out[i].offset];                
                } else {
                    ctx.out[i].offsetLabel = ctx.out[i].offset;
                    if (typeof ctx.vars[ctx.out[i].offset] === "undefined") {
                        error(ctx.out[i].line, `Variable: ${ctx.out[i].offset} not defined.`);
                    }
                    if (ctx.vars[ctx.out[i].offset].scope === 'CTX') {
                        ctx.out[i].sys = 0;
                    } else if (ctx.vars[ctx.out[i].offset].scope === 'GLOBAL') {
                        ctx.out[i].sys = 1;
                    } else {
                        error(ctx.out[i].line, `Invalid variable scpoe: ${ctx.out[i].offset} not defined.`);
                    }               
                    ctx.out[i].offset = ctx.vars[ctx.out[i].offset].offset;
                }
            }
            try {
                parseCommands(ctx.out[i].cmdBefore);
                parseCommands(ctx.out[i].cmdAfter);
            } catch (err) {
                err.message = "Error parsing tag: " + err.message;
                error(ctx.out[i].line, err);
            }
            ctx.out[i].line = ctx.out[i].step;
        }
        
        return ctx.out;
    }

    function parseCommands(cmdList) {
        if (Array.isArray(cmdList )) {
            for (let i=0; i<cmdList.length; i++) {
                if (cmdList[i]) {
                    cmdList[i] = command_parser.parse(cmdList[i])
                } else {
                    cmdList[i] = {op: "default"}
                }
            }
        }
    }
}


function processAssignmentIn(inputs) {
    const res = {};
    for (i=0; i<inputs.length; i++) {
        if (inputs[i].type == "TAG") {
            if (typeof res.freeInTag !== "undefined") throw new Error("Two freeInput tagas defined");
            res.freeInTag = inputs[i].tag ? command_parser.parse(inputs[i].tag) : {};
            if (inputs[i].sign == '-') throw new Error("Free inputs cannnot be negative");
            res.inFREE = 1;
        } else if (inputs[i].type == "REG") {
            if (typeof res["in"+ inputs[i].reg] !== "undefined") throw new Error(`Register ${inputs[i].reg} added twice in asssignment input`);
            res["in"+ inputs[i].reg] = inputs[i].sign == '-' ? -1 : 1;
        } else if (inputs[i].type == "CONST") {
            if (typeof res.CONST === "undefined") res.CONST = 0;
            if (inputs[i].sign = "-") {
                res.CONST -= Number(inputs[i].const)
            } else {
                res.CONST += Number(inputs[i].const)
            }
        }
    }
    if (typeof(res.CONST) !== "undefined") {
        const v = res.const + 0x80000000;
        if (v<0) throw new Error("Input constant overflow (neg) ");
        if (v>=0x100000000) throw new Error("Input constant overflow (pos) ");
        if (res.freeInTag) throw new Error("FreeInTag and const makes no sense");
    }
    return res;
}

function processAssignmentOut(outputs) {
    const res = {};
    for (let i=0; i<outputs.length; i++) {
        if (typeof res["set"+ outputs[i]] !== "undefined") throw new Error(`Register ${outputs[i]} added twice in asssignment output`);
        res["set"+ outputs[i]] = 1;
    }
    return res;
}

function appendOp(step, op) {
    Object.keys(op).forEach(function(key) {
        if (typeof step[key] !== "undefined") throw new Error(`Var ${key} already defined`);
        step[key] = op[key];
    });
}

function error(l, err) {
    if (err instanceof Error) {
        err.message = `ERROR ${l.fileName}:${l.line}: ${err.message}`
        throw(err);
    } else { 
        const msg = `ERROR ${l.fileName}:${l.line}: ${err}`;
        throw new Error(msg);
    }
}