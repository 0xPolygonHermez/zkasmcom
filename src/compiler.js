const path = require("path");
const fs = require("fs");
const { config } = require("process");
const zkasm_parser = require("../build/zkasm_parser.js").parser;
const command_parser = require("../build/command_parser.js").parser;
const stringifyBigInts = require("ffjavascript").utils.stringifyBigInts;
const util = require('util');
const maxConst = (1n << 32n) - 1n;
const minConst = -(1n << 31n);
const maxConstl = (1n << 256n) - 1n;
const minConstl = 0n;
const readOnlyRegisters = ['STEP', 'ROTL_C'];

const SAVE_REGS = ['B','C','D','E', 'RR', 'RCX'];
const RESTORE_FORBIDDEN_REGS = [...SAVE_REGS, 'RID'];
const PROPERTY_SAME_VALUE_COLLISION_ALLOWED = ['assumeFree'];
const MAX_GLOBAL_VAR = 0x10000;

class CompilerError extends Error {};

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

    const fullFileName = config.compileFromString ? '(string)' : path.resolve(process.cwd(), fileName);
    const fileDir = config.compileFromString ? '' : path.dirname(fullFileName);

    const src = config.compileFromString ? fileName : await fs.promises.readFile(fullFileName, "utf8") + "\n";

    // zkasm_parser.defineConstant = (name, ctype, value, line) => defineConstant(ctx, name, ctype, value, line);

    const lines = zkasm_parser.parse(src);

    let pendingCommands = [];
    let lastLineAllowsCommand = false;

    let relativeFileName;
    if (isMain) {
        relativeFileName = config.compileFromString ? '(string)' : path.basename(fullFileName);
        ctx.basePath = config.compileFromString ? '' : fileDir;
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
        console.log(`#${i} ${ctx.srcLines[relativeFileName][l.line-1]}`,util.inspect(l, false, 100, true));
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
            verifyStep(ctx, l);

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
                    appendOp(traceStep, processAssignmentOut(ctx, l.assignment.out, traceStep));
                }
                let assignmentRequired = false;
                for (let j=0; j< l.ops.length; j++) {
                    const op = (l.ops[j].mOp || l.ops[j].JMP || l.ops[j].JMPC || l.ops[j].JMPN || l.ops[j].JMPZ || l.ops[j].call) ? resolve(ctx, l.ops[j]):l.ops[j];
                    console.log(`#${i} ${ctx.srcLines[relativeFileName][l.line-1]}`,util.inspect(l, false, 100, true));
                    console.log(l.ops[j]);
                    console.log(op);
                    appendOp(traceStep, op);
                    if ((op.save || op.restore) && (!l.assignment || l.assignment.out.length === 0)) continue;
                    if (op.restore) {
                        const forbiddenAssigns = l.assignment.out.filter(x => RESTORE_FORBIDDEN_REGS.includes(x));
                        if (forbiddenAssigns.length > 0) {
                            error(l, `assignment to ${forbiddenAssigns.join()} not allowed on RESTORE`);
                        }
                        continue;
                    }
                    if (op.JMP || op.call || op.return || op.repeat|| op.restore) {
                        continue;
                    }
                    assignmentRequired = true;
                }
                if (assignmentRequired && !l.assignment) {
                    error(l, "Left assignment required");
                }

                if (traceStep.JMPC && !traceStep.bin) {
                    error(l, "JMPC must go together with a binary op");
                }
            } catch (err) {
                console.log(err.stack);
                error(l, err);
            }
            // traceStep.lineNum = ctx.out.length;
            traceStep.line = l;
            ctx.out.push(traceStep);
            if (pendingCommands.length>0) {
                traceStep.cmdBefore = pendingCommands;
                pendingCommands = [];
            }
            lastLineAllowsCommand = !(traceStep.JMP || traceStep.JMPC || traceStep.JMPN || traceStep.JMPZ || traceStep.call || traceStep.return);
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
            // console.log(`@@{${i}}@@ ${ctx.srcLines[ctx.out[i].line.fileName][ctx.out[i].line.line - 1] ?? ''}`,ctx.out[i]);
            if (ctx.out[i].offsetLabel) {
                const label = ctx.out[i].offsetLabel; 
                if (typeof ctx.vars[label] === "undefined") {
                    optionalError(config.allowUndefinedVariables, ctx.out[i].line,  `Variable: ${label} not defined.`);
                }
                else {
                    if (ctx.vars[label].scope === 'CTX') {
                        ctx.out[i].useCTX = 1;
                    } else if (ctx.vars[label].scope === 'GLOBAL') {
                        ctx.out[i].useCTX = 0;
                    } else {
                        error(ctx.out[i].line, `Invalid variable scope: ${label} not defined.`);
                    }
                
                    ctx.out[i].offset = Number(ctx.out[i].offset ?? 0) + Number(ctx.vars[label].offset);
                    if (ctx.vars[label].count > 1 && ctx.out[i].useAddrRel) {
                        ctx.out[i].minInd = ctx.vars[label].offset - ctx.out[i].offset;
                        ctx.out[i].maxInd = (ctx.vars[label].offset + ctx.vars[label].count - 1) - ctx.out[i].offset;
                        ctx.out[i].baseLabel = ctx.vars[label].offset;
                        ctx.out[i].sizeLabel = ctx.vars[label].count;
                    }
                }
            }

            if (ctx.out[i].jmpAddrLabel) {
                const codeAddr = getCodeAddress(ctx.out[i].jmpAddrLabel, i);
                if (codeAddr === false) {
                    optionalError(config.allowUndefinedLabels, ctx.out[i].line,  `Label: ${ctx.out[i].jmpAddrLabel} not defined.`);
                }
                ctx.out[i].jmpAddr = Number(ctx.out[i].jmpAddr) + Number(codeAddr);
            }
            if (ctx.out[i].elseAddrLabel) {
                const codeAddr = getCodeAddress(ctx.out[i].elseAddrLabel, i);
                if (codeAddr === false) {
                    optionalError(config.allowUndefinedLabels, ctx.out[i].line,  `Label: ${ctx.out[i].elseAddrLabel} not defined.`);
                }
                ctx.out[i].elseAddr = Number(ctx.out[i].elseAddr) + Number(codeAddr);
            }

            if ((ctx.out[i].save || ctx.out[i].restore) && ctx.out[i].regs !== false) {
                const regs = ctx.out[i].regs ?? [];    
                const invalidRegs = regs.filter(x => !SAVE_REGS.includes(x));
                const noIncludedRegs = SAVE_REGS.filter(x => !regs.includes(x));
                const duplicatedRegs = regs.filter((x, index) => regs.indexOf(x) !== index);
                const tag = ctx.out[i].save ? 'SAVE' : 'RESTORE';
                let errors = [];
                if (invalidRegs.length > 0) {
                    errors.push(`invalid register${invalidRegs.length > 1 ? 's':''} ${invalidRegs.join()}`);
                }
                if (noIncludedRegs.length > 0) {
                    errors.push(`mandatory register${noIncludedRegs.length > 1 ? 's':''} ${noIncludedRegs.join()} not included`);
                }
                if (duplicatedRegs.length > 0 ) {  
                    errors.push(`duplicated register${duplicatedRegs.length > 1 ? 's':''} ${duplicatedRegs.join()}`);
                }
                if (errors.length > 0) {                    
                    error(ctx.out[i].line,'On ' + tag + ' ' + errors.join(', '));
                }
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

        if (config.summary !== false) {
            console.log(`GLOBAL memory: \x1B[1;35m${ctx.lastGlobalVarAssigned+1} ${((ctx.lastGlobalVarAssigned+1) * 100.0/MAX_GLOBAL_VAR).toFixed(2)}%\x1B[0m`);
            console.log(`LOCAL  memory: ${ctx.lastLocalVarCtxAssigned+1}`);
        }

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
    const l = ctx.currentLine ; // ?? {line: line, fileName: ctx.currentFilename}

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

function resolve(ctx, input, currentLine) {
    if (typeof input === 'object') {
        if (typeof input.type === 'undefined') {
            let res = {};
            for (const prop in input) {
                res[prop] = resolve(ctx, input[prop]);
            }
            return res;
        } else {
            const res = processAssignmentIn(ctx, input, currentLine);
            if (typeof res === 'object') {
                if (typeof res.CONST !== 'undefined') return Number(res.CONST);
                if (typeof res.CONSTL !== 'undefined') return BigInt(res.CONSTL);                
            }
            return res;
        }
    }
    return input;
}
function processAssignmentIn(ctx, input, currentLine) {
    // console.log('»»»»»»', input);
    let res = {};
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
    if (input.type == "F_MLOAD") {
        res = resolve(ctx, input.addr, currentLine);
        res.mOp = 1;
        res.mWR = 0;
        res.freeInTag = {op: ""};
        res.inFREE = 1n;
        res.inFREE0 = 0n;
        res.assumeFree = 1;
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
                if (key === 'CONST' || key === 'CONSTL' || (key.startsWith('in') && !key.startsWith('ind'))) {
                    E2[key] *= E1.CONST;
                }
            });
            return E2;
        } else if (isConstant(E2)) {
            if (typeof E1.CONSTL !== 'undefined') {
                throw new Error("Not allowed CONST and CONSTL in same operation");
            }
            Object.keys(E1).forEach(function(key) {
                if (key === 'CONST' || key === 'CONSTL' || (key.startsWith('in') && !key.startsWith('ind'))) {
                    E1[key] *= E2.CONST;
                }
            });
            return E1;
        } else {
            throw new Error("Multiplication not allowed in input");
        }
    }
    if (input.type == "neg") {
        Object.keys(E1).forEach(function(key) {
            if (key === 'CONST' || key === 'CONSTL' || (key.startsWith('in') && !key.startsWith('ind'))) {
                E1[key] = -E1[key];
            }
        });
        return E1;
    }
    if (input.type == "sub") {
        Object.keys(E2).forEach(function(key) {
            if (key === 'CONST' || key === 'CONSTL' || (key.startsWith('in') && !key.startsWith('ind'))) {
                E2[key] = -E2[key];
            }
        });
        input.type = "add";
    }
    if (input.type == "add") {        
        if (E1.freeInTag && E2.freeInTag) {
            throw new Error("Only one tag allowed");
        }
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

function processAssignmentOut(ctx, outputs, parent = {}) {
    const res = {};
    for (let i=0; i<outputs.length; i++) {
        const out = outputs[i];
        if (out.type === 'REG') {
            const reg = out.reg;
            if (typeof res["set"+ reg] !== "undefined") throw new Error(`Register ${reg} added twice in asssignment output`);
            if (readOnlyRegisters.includes(reg)) {
                const l = ctx.currentLine;
                throw new Error(`Register ${reg} is readonly register, could not be used as output destination. ${l.fileName}:${l.line}`);
            }
            res["set"+ reg] = 1;
        } else if (out.type === 'MSTORE') {
            if (typeof res.mOp !== 'undefined' || typeof parent.mOp !== 'undefined') throw new Error(`Assignment output memory operation already defined, only one operation by step is allowed`);
            res.mOp = 1;
            res.mWR = 1;
            const _tmp = resolve(ctx, out.addr);
            appendOp(res, _tmp);
        } else {
            const l = ctx.currentLine;
            throw new Error(`Invalid type ${out.type} as output destination. ${l.fileName}:${l.line}`);
        }
    }
    return res;
}

function appendOp(step, op) {
    Object.keys(op).forEach(function(key) {
        if (typeof step[key] !== "undefined") {
            if (PROPERTY_SAME_VALUE_COLLISION_ALLOWED.includes(key)) {
                if (step[key] !== op[key]) {
                    console.log(step);
                    console.trace(op);
                    throw new Error(`property ${key} already defined with different value ${step[key]} vs ${op[key]}`);
                }
            } else {
                console.log(step);
                console.trace(op);
                throw new Error(`property ${key} already defined`);
            }
        } else {
            step[key] = op[key];
        }
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
    if (err instanceof CompilerError) {
        throw err;
    } 
    if (err instanceof Error) {
        throw new CompilerError(`ERROR ${l.fileName}:${l.line}: ${err.message}`);
    } 
    const msg = `ERROR ${l.fileName}:${l.line}: ${err}`;
    throw new CompilerError(msg);
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

function extractTypes(node, types) {
    if (types.includes(node.type)) {
        let res = {types: {}, nodes: [node], count: 1};
        res.types[node.type] = 1;
        return res;
    }
    if (!node.values) return false;
    let res = {types: {}, nodes: [], count: 0};
    for (const value of node.values) {
        const rvalue = extractTypes(value, types);
        if (rvalue === false) continue;
        res.nodes = [...res.nodes, ...rvalue.nodes];
        for (const property in rvalue.types) {
            res.types[property] = (res.types[property] ?? 0) + rvalue.types[property];
        }
    }
    if (res.count === 0) return false;
    return res;
}

function verifyStep(ctx, l) {
    if (!l.assignment) return;
    const typesInfo = extractTypes(l.assignment.in, ['MLOAD', 'TAG', 'TAG_0']);
    if (typesInfo === false) return;

    const tagCount = (typesInfo.TAG ?? 0) + (typesInfo.TAG_0 ?? 0);
    if (tagCount > 1) {
        error(l, 'Only one tag is allowed');
    }
    // const in = l.assignment.in;
    // const out = l.assigment.out;
    // const assignType = in.type;:
    // if (l.assignment
}