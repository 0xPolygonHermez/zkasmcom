const path = require("path");
const fs = require("fs");
const { config } = require("process");
const zkasm_parser = require("../build/zkasm_parser.js").parser;
const command_parser = require("../build/command_parser.js").parser;
const stringifyBigInts = require("ffjavascript").utils.stringifyBigInts;

const maxConst = (1n << 32n) - 1n;
const minConst = -(1n << 31n);
const maxConstl = (1n << 256n) - 1n;
const minConstl = 0n;
const readOnlyRegisters = ['STEP', 'ROTL_C'];

const SAVE_REGS = ['A','B','C','D','E', 'HASHPOS', 'RR', 'RCX', 'PC', 'SP', 'SR'];

const MAX_GLOBAL_VAR = 0x10000;

module.exports = async function compile(fileName, ctx, config = {}) {

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
            config: config,
            srcLines: [],
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

    let relativeFileName;
    if (isMain) {
        relativeFileName = path.basename(fullFileName);
        ctx.basePath = fileDir;
    } else {
        if (fullFileName.startsWith(ctx.basePath)) {
            relativeFileName = fullFileName.substring(ctx.basePath.length+1);
        } else {
            relativeFileName = fullFileName;
        }
    }

    ctx.srcLines[relativeFileName] = src.split(/(?:\r\n|\n|\r)/);

    for (let i=0; i<lines.length; i++) {
        const l = lines[i];
        ctx.currentLine = l;
        l.fileName = relativeFileName;
        if (l.type == "include") {
            const fullFileNameI = path.resolve(fileDir, l.file);
            await compile(fullFileNameI, ctx, config);
            if (pendingCommands.length>0) error(l, "command not allowed before include");
            lastLineAllowsCommand = false;
        } else if (l.type == "var") {
            if (typeof ctx.vars[l.name] !== "undefined") error(l, `Variable ${l.name} already defined`);
            if (l.scope == "GLOBAL") {
                const count = typeof l.count === 'string' ? Number(getConstantValue(ctx, l.count)) : l.count;
                ctx.vars[l.name] = {
                    scope: "GLOBAL",
                    count,
                    offset: ctx.lastGlobalVarAssigned + 1
                }
                ctx.lastGlobalVarAssigned += count;
            } else if (l.scope == "CTX") {
                const count = typeof l.count === 'string' ? Number(getConstantValue(ctx, l.count)) : l.count;
                ctx.vars[l.name] = {
                    scope: "CTX",
                    count,
                    offset: ctx.lastLocalVarCtxAssigned + 1
                }
                ctx.lastGlobalVarAssigned += count;
                ctx.lastLocalVarCtxAssigned += count;
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
                let assignmentRequired = false;
                for (let j=0; j< l.ops.length; j++) {
                    appendOp(traceStep, l.ops[j]);
                    if (l.ops[j].save || l.ops[j].restore) {
                        if (l.assignment) {
                            error(l, "assignment on SAVE/RESTORE not allowed");
                        }
                        continue;
                    }
                    if (l.ops[j].JMP || l.ops[j].call || l.ops[j].return || l.ops[j].repeat|| l.ops[j].restore) continue;
                    assignmentRequired = true;
                }
                if (assignmentRequired && !l.assignment) {
                    error(l, "Left assignment required");
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
            lastLineAllowsCommand = !(traceStep.JMP || traceStep.JMPC || traceStep.JMPN || traceStep.JMPC || traceStep.call || traceStep.return);
        } else if (l.type == "label") {
            const id = l.identifier
            if (ctx.definedLabels[id]) {
                optionalError(config.allowOverwriteLabels, l, `RedefinedLabel: ${id}`);
            }
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
            if ((typeof ctx.out[i].offset !== "undefined") && (isNaN(ctx.out[i].offset))) {
                if (!ctx.out[i].useJmpAddr && (ctx.out[i].JMP || ctx.out[i].JMPC || ctx.out[i].JMPN || ctx.out[i].JMPZ || ctx.out[i].call)) {
                    const codeAddr = getCodeAddress(ctx.out[i].offset, i);

                    if (codeAddr === false) {
                        optionalError(config.allowUndefinedLabels, ctx.out[i].line,  `Label: ${ctx.out[i].offset} not defined.`);
                    }
                    ctx.out[i].offsetLabel = ctx.out[i].offset;
                    ctx.out[i].offset = codeAddr;
                } else {
                    ctx.out[i].offsetLabel = ctx.out[i].offset;
                    if (typeof ctx.vars[ctx.out[i].offset] === "undefined") {
                        optionalError(config.allowUndefinedVariables, ctx.out[i].line,  `Variable: ${ctx.out[i].offset} not defined.`);
                        ctx.out[i].offset = 0;
                    }
                    else {
                        const label = ctx.out[i].offset; 
                        if (ctx.vars[label].scope === 'CTX') {
                            ctx.out[i].useCTX = 1;
                        } else if (ctx.vars[label].scope === 'GLOBAL') {
                            ctx.out[i].useCTX = 0;
                        } else {
                            error(ctx.out[i].line, `Invalid variable scope: ${label} not defined.`);
                        }
                    
                        ctx.out[i].offset = ctx.vars[label].offset + (ctx.out[i].extraOffset ?? 0);
                        if (ctx.vars[label].count > 1) {
                            ctx.out[i].maxInd = (ctx.vars[label].offset + ctx.vars[label].count - 1) - ctx.out[i].offset;
                            ctx.out[i].baseLabel = ctx.vars[label].offset;
                            ctx.out[i].sizeLabel = ctx.vars[label].count;
                        }
                    }
                }
            }
            if ((typeof ctx.out[i].jmpAddr !== "undefined") && (isNaN(ctx.out[i].jmpAddr))) {
                const codeAddr = getCodeAddress(ctx.out[i].jmpAddr, i);
                if (codeAddr === false) {
                    optionalError(config.allowUndefinedLabels, ctx.out[i].line,  `Label: ${ctx.out[i].jmpAddr} not defined.`);
                }
                ctx.out[i].jmpAddrLabel = ctx.out[i].jmpAddr;
                ctx.out[i].jmpAddr = codeAddr;
            }
            if ((typeof ctx.out[i].elseAddr !== "undefined") && (isNaN(ctx.out[i].elseAddr))) {
                const codeAddr = getCodeAddress(ctx.out[i].elseAddr, i);
                if (codeAddr === false) {
                    optionalError(config.allowUndefinedLabels, ctx.out[i].line,  `Label: ${ctx.out[i].elseAddr} not defined.`);
                }
                ctx.out[i].elseAddrLabel = ctx.out[i].elseAddr;
                ctx.out[i].elseAddr = codeAddr;
            }

            if (ctx.out[i].save || ctx.out[i].restore) {
                const regs = ctx.out[i].regs ?? [];    
                const invalidRegs = regs.filter(x => !SAVE_REGS.includes(x));
                const tag = ctx.out[i].save ? 'SAVE' : 'RESTORE';
                if (invalidRegs.length > 0) {                    
                    error(ctx.out[i].line, `Invalid register${invalidRegs.length > 1 ? 's':''} ${invalidRegs.join()} on ${tag}`);
                }
                SAVE_REGS.forEach(x => ctx.out[i][`in${x}`] = (ctx.out[i].save && regs.includes(x)) ? 1 : 0);

                delete ctx.out[i].regs;
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
            ctx.out[i].lineStr = ctx.srcLines[ctx.out[i].fileName][ctx.out[i].line - 1] ?? '';
        }

        const res = {
            program:  stringifyBigInts(ctx.out),
            labels: ctx.definedLabels,
            constants: stringifyBigInts(ctx.constants)
        }

        console.log(`GLOBAL memory: \x1B[1;35m${ctx.lastGlobalVarAssigned+1} ${((ctx.lastGlobalVarAssigned+1) * 100.0/MAX_GLOBAL_VAR).toFixed(2)}%\x1B[0m`);
        console.log(`LOCAL  memory: ${ctx.lastLocalVarCtxAssigned+1}`);

        if (ctx.lastGlobalVarAssigned > MAX_GLOBAL_VAR) {
            throw new Error(`GLOBAL memory is too big ${ctx.lastGlobalVarAssigned+1} x 256-bit`);
        }
        return res;
    }

    function getCodeAddress(label, zkPC) {
        if (label === "next") return zkPC + 1;
        if (typeof ctx.definedLabels[label] === 'undefined') return false;
        return ctx.definedLabels[label];
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
                // set useCTX
                if (ctx.vars[name].scope === 'CTX') {
                    cmd.useCTX = 1;
                } else if (ctx.vars[name].scope === 'GLOBAL') {
                    cmd.useCTX = 0;
                }
                if (cmd.arrayOffset) {
                    if (cmd.arrayOffset.op === 'number') {
                        cmd.offset += Number(cmd.arrayOffset.num);
                    } else {
                        cmd.op = 'getMemValueByAddress';
                        cmd.params = [cmd.arrayOffset];
                        if (cmd.offset) {
                            cmd.params = [{ op: 'add', values: [cmd.params[0], {op: 'number', num: BigInt(cmd.offset)}]}];
                        }
                        delete cmd.offset;
                        delete cmd.arrayOffset;
                        return;
                    }
                }
                cmd.offsetLabel = name;
                return;
            }
            else if (cmd.module === 'addr' && typeof cmd.offsetLabel === 'undefined') {
                const name = cmd.offset;
                if (typeof ctx.vars[name] === 'undefined') {
                    error(ctx.out[i].line, `Not found reference ${cmd.module}.${name}`);
                }
                cmd.op = 'number'
                cmd.num = ctx.vars[name].offset.toString();
                if (cmd.arrayOffset) {
                    cmd.num += Number(cmd.arrayOffset.num ?? 0).toString();
                }
                cmd.offsetLabel = name;
                delete cmd.offset;
                return;
            }
            else if (cmd.module === 'const' && typeof cmd.offsetLabel === 'undefined') {
                const name = cmd.offset;
                cmd.op = 'number'
                cmd.num = getConstantValue(ctx, name);
                cmd.offsetLabel = name;
                delete cmd.offset;
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

    if (typeof ctx.constants[name] !== 'undefined') {
        throw error(l, `Redefinition of constant ${name} previously defined on `+
                       `${ctx.constants[name].fileName}:${ctx.constants[name].line}`);
    }

    if (ctx.config && ctx.config.defines && typeof ctx.config.defines[name] !== 'undefined') {
        console.log(`NOTICE: Ignore constant definition ${name} on ${l.fileName}:${l.line} because it was defined by command line`);
        ctx.constants[name] = {
            value: ctx.config.defines[name].value,
            type: ctx.config.defines[name].type,
            originalValue: value,
            originalType: ctype,
            defines: true,
            line: l.line,
            fileName: l.fileName};
        return;
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
        if (typeof ctx.constants[name] == 'undefined') {
            ctx.constants[name] = {
                value: ctx.config.defines[name].value,
                type: ctx.config.defines[name].type,
                defines: true
            };
        }
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
    if (input.type == "TAG" || input.type == 'TAG_0') {
        res.freeInTag = input.tag ? command_parser.parse(input.tag) : { op: ""};
        res.inFREE = input.type == 'TAG_0' ? 0n : 1n;
        res.inFREE0 = input.type == 'TAG_0' ? 1n : 0n;
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
        checkConstRange(ctx, res);
        return res;
    }
    if (input.type == "CONSTL") {
        res.CONSTL = BigInt(input.const);
        checkConstRange(ctx, res);
        return res;
    }
    if (input.type == 'CONSTID') {
        const [value, ctype] = getConstant(ctx, input.identifier);
        res[ctype] = value;
        checkConstRange(ctx, res);
        return res;
    }

    if (input.type == "expl") {
        res.CONSTL = BigInt(input.values[0])**BigInt(input.values[1]);
        checkConstRange(ctx, res);
        return res;
    }
    if (input.type == "exp") {
        const value = BigInt(input.values[0])**BigInt(input.values[1]);
        res.CONST = value;
        checkConstRange(ctx, res);
        return res;
    }
    if ((input.type == "add") || (input.type == "sub") || (input.type == "neg") || (input.type == "mul")) {
        E1 = processAssignmentIn(ctx, input.values[0], currentLine);
    }
    if ((input.type == "add") || (input.type == "sub") || (input.type == "mul")) {
        E2 = processAssignmentIn(ctx, input.values[1], currentLine);
    }
    if (input.type == "mul") {
        if (typeof E1.CONSTL !== 'undefined' && typeof E2.CONSTL !== 'undefined') {
            res.CONSTL = BigInt(E1.CONSTL) * BigInt(E2.CONSTL);
            checkConstRange(ctx, res);
            return res;
        }
        else if (typeof E1.CONST !== 'undefined' && typeof E2.CONST !== 'undefined') {
            res.CONST = BigInt(E1.CONST) * BigInt(E2.CONST);
            checkConstRange(ctx, res);
            return res;
        } else if (isConstant(E1)) {
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
        else if (typeof ctx.vars[input.identifier] !== 'undefined') {
            res.CONST = BigInt(ctx.vars[input.identifier].offset);
        }
        else {
            throw new Error(`Not found label/variable ${input.identifier}`)
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

function optionalError(allowed, l, msg) {
    if (allowed) warning(l, msg);
    else error(l, msg);
}

function warning(l, msg) {
    console.log(`WARNING ${l.fileName}:${l.line}: ${msg}`);
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

function checkConstRange(ctx, value, isLongValue) {
    const l = ctx.currentLine;

    if (typeof isLongValue == 'undefined') {
        if (typeof value.CONSTL !== 'undefined') {
            isLongValue = true;
            value = value.CONSTL;
        }
        else if (typeof value.CONST !== 'undefined') {
            isLongValue = false;
            value = value.CONST;
        }
        else {
            throw error(l, `Constant value ${value} undefined type on checkConstRange`);
        }
    }

    if (!isLongValue && (value > maxConst || value < minConst)) {
        throw error(l, `Constant value ${value} out of range [${minConst},${maxConst}]`);
    }

    if (isLongValue && (value > maxConstl || value < minConstl)) {
        throw error(l, `Long-constant value ${value} out of range [${minConstl},${maxConstl}]`);
    }
}
