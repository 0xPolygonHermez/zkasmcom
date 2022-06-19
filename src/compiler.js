const path = require("path");
const fs = require("fs");
const { config } = require("process");
const zkasm_parser = require("../build/zkasm_parser.js").parser;
const command_parser = require("../build/command_parser.js").parser;
const stringifyBigInts = require("ffjavascript").utils.stringifyBigInts;

const maxConst = (1n << 32n) - 1n;
const minConst = -(1n << 31n);
const maxConstl = (1n << 256n) - 1n;
const minConstl = -(1n << 255n);
const readOnlyRegisters = ['STEP', 'ROTL_C'];

module.exports = async function compile(fileName, ctx, config) {

    let isMain;
    if (!ctx) {
        ctx = {
            definedLabels: {},
            refs: [],
            out: [],
            vars: {},
            constants: {},
            lastGlobalVarAssigned: -1,
            lastLocalVarCtxAssigned: -1,
            config: config
        }
        isMain = true;
    } else {
        isMain = false;
    }

    const fullFileName = path.resolve(process.cwd(), fileName);
    const fileDir = path.dirname(fullFileName);

    const src = await fs.promises.readFile(fullFileName, "utf8") + "\n";

    const lines = zkasm_parser.parse(src);

    const srcLines = src.split(/(?:\r\n|\n|\r)/);

    let pendingCommands = [];
    let lastLineAllowsCommand = false;

    for (let i=0; i<lines.length; i++) {
        const l = lines[i];
        ctx.currentLine = l;
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
        } else if (l.type == 'constdef' || l.type == 'constldef' ) {
            const value = evaluateExpression(ctx, l.value);
            let ctype = l.type == 'constldef' ? 'CONSTL':'CONST';
            defineConstant(ctx, l.name, ctype, value);
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
                    appendOp(traceStep, processAssignmentIn(ctx, l.assignment.in, ctx.out.length));
                    appendOp(traceStep, processAssignmentOut(ctx, l.assignment.out));
                }
                for (let j=0; j< l.ops.length; j++) {
                    appendOp(traceStep, l.ops[j])
                }

                if (traceStep.JMPC && !traceStep.bin) {
                    error(l, "JMPC must go together with a binary op");
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
            lastLineAllowsCommand = !(traceStep.JMP || traceStep.JMPC || traceStep.JMPN);
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
                if (ctx.out[i].JMP || ctx.out[i].JMPC || ctx.out[i].JMPN) {
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
            resolveDataOffset(i, ctx.out[i]);
            ctx.out[i].fileName = ctx.out[i].line.fileName;
            ctx.out[i].line = ctx.out[i].line.line;
            ctx.out[i].lineStr = srcLines[ctx.out[i].line - 1] ?? '';
        }

        const res = {
            program:  stringifyBigInts(ctx.out),
            labels: ctx.definedLabels
        }

        return res;
    }

    function parseCommands(cmdList) {
        if (Array.isArray(cmdList)) {
            for (let i=0; i<cmdList.length; i++) {
                if (cmdList[i]) {
                    cmdList[i] = command_parser.parse(cmdList[i]);
                } else {
                    cmdList[i] = {op: ""}
                }
            }
        }
    }

    function resolveDataOffset(i, cmd)
    {
        if (typeof cmd !== 'object' || cmd === null) return;
        if (cmd.op === 'getData') {
            if (cmd.module === 'mem' && typeof cmd.offsetLabel === 'undefined') {
                const name = cmd.offset;
                if (typeof ctx.vars[name] === 'undefined') {
                    error(ctx.out[i].line, `Not found reference ${cmd.module}.${name}`);
                }
                cmd.op = 'getMemValue'
                cmd.offset = ctx.vars[name].offset;
                cmd.offsetLabel = name;
                return;
            }
            else if (cmd.module === 'const' && typeof cmd.offsetLabel === 'undefined') {
                const name = cmd.offset;
                cmd.op = 'number'
                cmd.num = getConstantValue(ctx, name);
                return;
            }
            else {
                error(ctx.out[i].line, `Invalid module ${cmd.module}`);
            }
        }
        const keys = Object.keys(cmd);
        for (let ikey = 0; ikey < keys.length; ++ikey) {
            const name = keys[ikey];
            if (Array.isArray(cmd[name])) {
                for (let j = 0; j < cmd[name].length; ++j) {
                    resolveDataOffset(i, cmd[name][j]);
                }
            }
            else if (typeof cmd[name] == 'object') {
                resolveDataOffset(i, cmd[name]);
            }
        }
    }
}

function defineConstant(ctx, name, ctype, value) {
    const l = ctx.currentLine;

    if (ctx.config && ctx.config.defines && typeof ctx.config.defines[name] !== 'undefined') {
        console.log(`NOTICE: Ignore constant definition ${name} on ${l.fileName}:${l.line} because it was defined by command line`);
        return;
    }

    if (typeof ctx.constants[name] !== 'undefined') {
        throw error(l, `Redefinition of constant ${name} previously defined on `+
                       `${ctx.constants[name].fileName}:${ctx.constants[name].line}`);
    }
    if (ctype == 'CONSTL') {
        if (value > maxConstl || value < minConstl) {
            throw error(l, `Constant ${name} out of range, value ${value} must be in range [${minConstl},${maxConstl}]`);
        }
    } else if (ctype == 'CONST') {
        if (value > maxConst || value < minConst) {
            throw error(l, `Constant ${name} out of range, value ${value} must be in range [${minConst},${maxConst}]`);
        }
    } else {
        throw error(l, `Constant ${name} has an invalid type ${ctype}`);
    }

    ctx.constants[name] = {
        value: value,
        type: ctype,
        line: l.line,
        fileName: l.fileName};
}

function getConstant(ctx, name, throwIfNotExists = true) {
    if (ctx.config && ctx.config.defines && typeof ctx.config.defines[name] !== 'undefined') {
        return [ctx.config.defines[name].value, ctx.config.defines[name].type];
    }

    if (typeof ctx.constants[name] === 'undefined') {
        if (throwIfNotExists) error(ctx.currentLine, `Not found constant ${name}`);
        else return [null, null];
    }
    return [ctx.constants[name].value, ctx.constants[name].type];
}

function getConstantValue(ctx, name, throwIfNotExists = true) {
    return getConstant(ctx, name, throwIfNotExists)[0];
}

function processAssignmentIn(ctx, input, currentLine) {
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
    if (input.type == "COUNTER") {
        let res = {};
        res["in" + input.counter.charAt(0).toUpperCase() + input.counter.slice(1)] = 1n;
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
    if (input.type == 'CONSTID') {
        const [value, ctype] = getConstant(ctx, input.identifier);
        res[ctype] = value;
        return res;
    }

    if (input.type == "exp") {
        res.CONST = BigInt(input.values[0])**BigInt(input.values[1]);
        return res;
    }
    if ((input.type == "add") || (input.type == "sub") || (input.type == "neg") || (input.type == "mul")) {
        E1 = processAssignmentIn(ctx, input.values[0], currentLine);
    }
    if ((input.type == "add") || (input.type == "sub") || (input.type == "mul")) {
        E2 = processAssignmentIn(ctx, input.values[1], currentLine);
    }
    if (input.type == "mul") {
        if (isConstant(E1)) {
            if (typeof E2.CONSTL !== 'undefined') {
                throw new Error("Not allowed CONST and CONSTL in same operation");
            }
            Object.keys(E2).forEach(function(key) {
                E2[key] *= E1.CONST;
            });
            return E2;
        } else if (isConstant(E2)) {
            if (typeof E1.CONSTL !== 'undefined') {
                throw new Error("Not allowed CONST and CONSTL in same operation");
            }
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
        if (typeof E1.CONST !== 'undefined' && typeof E1.CONSTL !== 'undefined') {
            throw new Error("Not allowed CONST and CONSTL in same operation");
        }
        return E1;
    }
    if (input.type == 'reference') {
        res.labelCONST = input.identifier;
        if (typeof ctx.definedLabels[input.identifier] !== 'undefined') {
            res.CONST = BigInt(ctx.definedLabels[input.identifier]);
        }
        else {
            throw new Error(`Not found label ${input.identifier}`)
        }
        return res;
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

function evaluateExpression(ctx, input) {
    if (input.type === 'CONSTL') {
        return BigInt(input.value);
    }

    if (input.type === 'CONSTID') {
        return getConstantValue(ctx, input.identifier);
    }

    if (input.type === '?' && input.values.length == 3) {
        return evaluateExpression(ctx, input.values[0]) ? evaluateExpression(ctx, input.values[1]) : evaluateExpression(ctx, input.values[2])
    }

    if (input.type === '??' && input.values.length == 1) {
        const value = getConstantValue(ctx, input.identifier, false);
        return  value == null ? evaluateExpression(ctx, input.values[0]) : value;
    }

    let values = [];
    input.values.forEach((value) => {
        values.push(evaluateExpression(ctx, value));
    });

    if (values.length == 2) {
        switch (input.type) {
            case '*':   return values[0] * values[1];
            case '+':   return values[0] + values[1];
            case '-':   return values[0] - values[1];
            case '<<':  return values[0] << values[1];
            case '>>':  return values[0] >> values[1];
            case '**':  return values[0] ** values[1];
            case '%':   return values[0] % values[1];
            case '/':   return values[0] / values[1];
            case '&':   return values[0] & values[1];
            case '|':   return values[0] | values[1];
            case '^':   return values[0] ^ values[1];
            case '&&':  return (values[0] && values[1]) ? 1n: 0n;
            case '||':  return (values[0] || values[1]) ? 1n: 0n;
            case '>=':  return (values[0] >= values[1]) ? 1n: 0n;
            case '<=':  return (values[0] <= values[1]) ? 1n: 0n;
            case '>':   return (values[0] >  values[1]) ? 1n: 0n;
            case '<':   return (values[0] <  values[1]) ? 1n: 0n;
            case '==':  return (values[0] == values[1]) ? 1n: 0n;
            case '!=':  return (values[0] != values[1]) ? 1n: 0n;
        }
    }

    if (values.length == 1) {
        switch (input.type) {
            case '!':   return values[0] ? 0n: 1n;
            case '-':   return -values[0];
        }
    }
    const l = ctx.currentLine;
    throw new Error(`Operation ${input.type} with ${values.length} operators, not allowed in numeric expression. ${l.fileName}:${l.line}`);
}

function processAssignmentOut(ctx, outputs) {
    const res = {};
    for (let i=0; i<outputs.length; i++) {
        if (typeof res["set"+ outputs[i]] !== "undefined") throw new Error(`Register ${outputs[i]} added twice in asssignment output`);
        if (readOnlyRegisters.includes(outputs[i])) {
            const l = ctx.currentLine;
            throw new Error(`Register ${outputs[i]} is readonly register, could not be used as output destination. ${l.fileName}:${l.line}`);
        }
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
