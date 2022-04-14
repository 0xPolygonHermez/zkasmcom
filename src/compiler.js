const path = require("path");
const fs = require("fs");
const zkasm_parser = require("../build/zkasm_parser.js").parser;
const command_parser = require("../build//command_parser.js").parser;
const { type } = require("os");
const { trace } = require("console");
const stringifyBigInts = require("ffjavascript").utils.stringifyBigInts;

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
                for (let j=0; j< l.ops.length; j++) {
                    if (!l.ops[j].assignment) continue;
                    if (l.assignment) {
                        error(l, "not allowed assignments with this operation");    
                    }
                    l.assignment = l.ops[j].assignment;
                    delete l.ops[j].assignment;                    
                }
            
                if (l.assignment) {
                    appendOp(traceStep, processAssignmentIn(l.assignment.in, ctx.out.length));
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
                        ctx.out[i].useCTX = 1;
                    } else if (ctx.vars[ctx.out[i].offset].scope === 'GLOBAL') {
                        ctx.out[i].useCTX = 0;
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
            ctx.out[i].fileName = ctx.out[i].line.fileName;
            ctx.out[i].line = ctx.out[i].line.line;
        }

        const res = {
            program:  stringifyBigInts(ctx.out),
            labels: ctx.definedLabels
        }
        
        return res;
    }

    function parseCommands(cmdList) {
        if (Array.isArray(cmdList )) {
            for (let i=0; i<cmdList.length; i++) {
                if (cmdList[i]) {
                    cmdList[i] = command_parser.parse(cmdList[i])
                } else {
                    cmdList[i] = {op: ""}
                }
            }
        }
    }
}

function processAssignmentIn(input, currentLine) {
    const res = {};
    let E1, E2;
    if (input.type == "TAG") {
        res.freeInTag = input.tag ? command_parser.parse(input.tag) : { op: ""};
        res.inFREE = 1n;
        return res;
    }
    if (input.type == "REG") {
        if (input.reg == "zkPC") {
            res.CONST = BigInt(currentLine);
        }
        else {
            res["in"+ input.reg] = 1n;
        }
        return res;
    }
    if (input.type == "CONST") {
        res.CONST = BigInt(input.const);
        return res;
    }
    if (input.type == "CONSTL") {
        res.CONSTL = BigInt(input.const);
        return res;
    }
    if (input.type == "exp") {
        res.CONST = BigInt(input.values[0])**BigInt(input.values[1]);
        return res;

    }
    if ((input.type == "add") || (input.type == "sub") || (input.type == "neg") || (input.type == "mul")) {
        E1 = processAssignmentIn(input.values[0], currentLine);
    }
    if ((input.type == "add") || (input.type == "sub") || (input.type == "mul")) {
        E2 = processAssignmentIn(input.values[1], currentLine);
    }
    if (input.type == "mul") {
        if (isConstant(E1)) {
            Object.keys(E2).forEach(function(key) {
                E2[key] *= E1.CONST;
            });
            return E2;
        } else if (isConstant(E2)) {
            Object.keys(E1).forEach(function(key) {
                E1[key] *= E2.CONST;
            });          
            return E1;   
        } else {
            throw new Error("Multiplication not allowed in input");
        }
    }
    if (input.type == "neg") {
        Object.keys(E1).forEach(function(key) {
            E1[key] = -E1[key];
        });
        return E1;
    }
    if (input.type == "sub") {
        Object.keys(E2).forEach(function(key) {
            if (key != "freeInTag") {
                E2[key] = -E2[key];
            }
        });
        input.type = "add";
    }
    if (input.type == "add") {
        if (E1.freeInTag && E2.freeInTag) throw new Error("Only one tag allowed");
        Object.keys(E2).forEach(function(key) {
            if (E1[key]) {
                E1[key] += E2[key];
            } else {
                E1[key] = E2[key];
            }
        });
        return E1;
    }

    throw new Error( `Invalid type: ${input.type}`);


    function isConstant(o) {
        let res = true;
        Object.keys(o).forEach(function(key) {
            if (key != "CONST") res = false;
        });
        return res;
    }
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
