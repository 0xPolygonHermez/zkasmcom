const path = require("path");
const fs = require("fs");
const { config } = require("process");
const zkasmParser = require("../build/zkasm_parser.js").parser;
const commandParser = require("../build/command_parser.js").parser;
const stringifyBigInts = require("ffjavascript").utils.stringifyBigInts;
const util = require('util');
const maxConst = (1n << 32n) - 1n;
const minConst = -(1n << 31n);
const maxConstl256 = (1n << 256n) - 1n;
const minConstl256 = 0n;
const maxConstl384 = (1n << 384n) - 1n;
const minConstl384 = 0n;
const readOnlyRegisters = ['STEP', 'ROTL_C'];

const SAVE_REGS = ['B','C','D','E', 'RR', 'RCX'];
const RESTORE_FORBIDDEN_REGS = [...SAVE_REGS, 'RID'];
const PROPERTY_SAME_VALUE_COLLISION_ALLOWED = {assumeFree: ['assumeFree'], ind: ['ind', 'indRR'], indRR: ['ind', 'indRR'], requireModeBits: ['requireModeBits']};
const MAX_GLOBAL_VAR = 0x10000;

class CompilerError extends Error {};


class Compiler {

    constructor (config) {
        this.line = false;
        this.config = config;
        this.includeId = 1;
        this.lastIncludeId = 1;
        this.includeStack = [];
        this.vars = {};
        this.constants = {};
        this.labels = {};
        this.labelsStack = [];
        this.lastGlobalVarAssigned = -1;
        this.lastLocalVarCtxAssigned = -1;
        this.refs = [];
        this.out = [];
        this.basePath = false;
        this.mainInit = false;
        this.srcLines = {};
        this.sourceRef = '';
        this.defaultModeBits = 256;
        this.modeBits = 256;
    }
    _error(msg) {
        throw new CompilerError(`${msg} at ${this.sourceRef}`);
    }
    compile(fileName) {
        let isMain = this.mainInit === false;
        this.mainInit = true;

        const compileFromString = this.config.compileFromString && isMain;
        const fullFileName = compileFromString ? '(string)' : path.resolve(process.cwd(), fileName);
        const fileDir = compileFromString ? '' : path.dirname(fullFileName);

        const src = compileFromString ? fileName : fs.readFileSync(fullFileName, "utf8") + "\n";

        // zkasm_parser.defineConstant = (name, ctype, value, line) => defineConstant(ctx, name, ctype, value, line);

        let pendingCommands = [];
        let lastLineAllowsCommand = false;

        if (isMain) {
            this.relativeFileName = compileFromString ? '(string)' : path.basename(fullFileName);
            this.basePath = compileFromString ? '' : fileDir;
        } else {
            if (fullFileName.startsWith(this.basePath)) {
                this.relativeFileName = fullFileName.substring(this.basePath.length+1);
            } else {
                this.relativeFileName = fullFileName;
            }
        }
        this.srcLines[this.relativeFileName] = src.split(/(?:\r\n|\n|\r)/);

        const parser = this.instanceParser(zkasmParser, src, fullFileName);
        const lines = parser.parse(src);

        for (let i=0; i<lines.length; i++) {
            const l = lines[i];
            // console.log(`#${i} ${this.srcLines[this.relativeFileName][l.__line -1]}`,util.inspect(l, false, 100, true));
            this.currentLine = l;
            this.sourceRef = this.relativeFileName + ':' + l.line;
            l.fileName = this.relativeFileName;
            this.modeBits = this.defaultModeBits;
            if (l.type == "include") {
                const fullFileNameI = path.resolve(fileDir, l.file);
                const previousRelativeFilename = this.relativeFileName;
                this.pushIncludeScope();
                this.compile(fullFileNameI);
                this.popIncludeScope();
                this.relativeFileName = previousRelativeFilename;
                if (pendingCommands.length>0) {
                    this.error(l, "command not allowed before include");
                }

                lastLineAllowsCommand = false;
            } else if (l.type == "var") {
                const vinfo = this.getVarInfo(l.name);
                if  (vinfo !== false) this.error(l, `Variable ${l.name} already defined`);
                if (l.scope == "GLOBAL") {
                    const count = typeof l.count === 'string' ? Number(this.getConstantValue(l.count)) : l.count;
                    this.defineVar(l.name, {
                        scope: "GLOBAL",
                        count,
                        offset: this.lastGlobalVarAssigned + 1
                    });
                    this.lastGlobalVarAssigned += count;
                } else if (l.scope == "CTX") {
                    const count = typeof l.count === 'string' ? Number(this.getConstantValue(l.count)) : l.count;
                    this.defineVar(l.name, {
                        scope: "CTX",
                        count,
                        offset: this.lastLocalVarCtxAssigned + 1
                    });
                    this.lastLocalVarCtxAssigned += count;
                } else {
                    this.error(l, `Invalid scope ${l.scope}`);
                }
                if (pendingCommands.length>0) this.error(l, "command not allowed before var");
                lastLineAllowsCommand = false;
            } else if (l.type == 'constdef' || l.type == 'constldef' ) {
                const value = this.evaluateExpression(l.value);
                let ctype = l.type == 'constldef' ? 'CONSTL':'CONST';
                this.defineConstant(l.name, ctype, value); 
            } else if (l.type == 'pragma' ) {
                this.setPragma(l);
            } else if (l.type == "step") {
                const traceStep = {
                    // type: "step"
                };
                this.verifyStep(l);
                try {
                    for (let j=0; j< l.ops.length; j++) {
                        if (l.ops[j].modeBits) {
                            this.modeBits = l.ops[j].modeBits;
                            delete l.ops[j].modeBits;
                        }
                        if (!l.ops[j].assignment) continue;
                        if (l.assignment) {
                            this.error(l, "not allowed assignments with this operation");
                        }
                        l.assignment = l.ops[j].assignment;
                        delete l.ops[j].assignment;
                    }
                    if (this.modeBits !== 256) {
                        if (this.modeBits === 384) {
                            traceStep.mode384 = 1;
                        } else {
                            this.error(l, `mode bit ${this.modeBits} not allowed`);
                        }
                    }
                    if (l.assignment) {
                        this.appendOp(traceStep, this.processAssignmentIn(l.assignment.in, this.out.length));
                        this.appendOp(traceStep, this.processAssignmentOut(l.assignment.out, traceStep));
                    }
                    let assignmentRequired = false;
                    for (let j=0; j< l.ops.length; j++) {                        
                        const op = (l.ops[j].mOp || l.ops[j].JMP || l.ops[j].JMPC || l.ops[j].JMPN || l.ops[j].JMPZ || l.ops[j].call) ? this.resolve(l.ops[j]):l.ops[j];
                        if (typeof l.ops[j].requireModeBits !== 'undefined') {
                            const requireModeBits = l.ops[j].requireModeBits;
                            delete l.ops[j].requireModeBits;
                            if (requireModeBits !== 256 && requireModeBits !== 384) {
                                this.error(l, `invalid requireModeBits defined on zkasm/language`);
                            }
                            if (this.modeBits !== requireModeBits) {
                                this.error(l, `invalid operation because require ${requireModeBits} bits mode and current mode bits is ${this.modeBits}`);
                            }
                        }
                        // console.log(`#${i} ${this.srcLines[this.relativeFileName][l.__line-1]}`,util.inspect(l, false, 100, true));
                        this.appendOp(traceStep, op);
                        if ((op.save || op.restore) && (!l.assignment || l.assignment.out.length === 0)) continue;
                        if (op.restore) {
                            const forbiddenAssigns = l.assignment.out.filter(x => RESTORE_FORBIDDEN_REGS.includes(x));
                            if (forbiddenAssigns.length > 0) {
                                this.error(l, `assignment to ${forbiddenAssigns.join()} not allowed on RESTORE`);
                            }
                            continue;
                        }
                        if (op.JMP || op.call || op.return || op.repeat|| op.restore) {
                            continue;
                        }
                        assignmentRequired = true;
                    }
                    if (assignmentRequired && !l.assignment) {
                        this.error(l, "Left assignment required");
                    }

                    if (traceStep.JMPC && !traceStep.bin) {
                        this.error(l, "JMPC must go together with a binary op");
                    }
                } catch (err) {
                    this.error(l, err);
                }
                // traceStep.lineNum = ctx.out.length;
                traceStep.line = l;
                traceStep.includeId = this.includeId;
                this.out.push(traceStep);
                if (pendingCommands.length>0) {
                    traceStep.cmdBefore = pendingCommands;
                    pendingCommands = [];
                }
                lastLineAllowsCommand = !(traceStep.JMP || traceStep.JMPC || traceStep.JMPN || traceStep.JMPZ || traceStep.call || traceStep.return);
            } else if (l.type == "label") {
                const id = l.identifier
                if (this.getLabelInfo(id)) {
                    this.optionalError(this.config.allowOverwriteLabels, l, `RedefinedLabel: ${id}`);
                }
                this.defineLabel(id, {offset: this.out.length, sourceRef: this.sourceRef});
                if (pendingCommands.length>0) this.error(l, "command not allowed before label")
                lastLineAllowsCommand = false;
            } else if (l.type == "command") {
                if (lastLineAllowsCommand) {
                    if (typeof this.out[this.out.length-1].cmdAfter === "undefined")
                        this.out[this.out.length-1].cmdAfter = [];
                    this.out[this.out.length-1].cmdAfter.push(l.cmd);
                } else {
                    pendingCommands.push(l.cmd);
                }
            } else {
                this.error(l, `Invalid line type: ${l.type}`);
            }
        }


        if (isMain) {
            const mainIncludeId = this.includeId;
            for (let i=0; i<this.out.length; i++) {
                // console.log(`@@{${i}}@@ ${this.srcLines[this.out[i].line.fileName][this.out[i].line.line - 1] ?? ''}`,this.out[i]);
                this.includeId = this.out[i].includeId ?? mainIncludeId;

                // delete to produce same output
                delete this.out[i].includeId;
                if (this.out[i].offsetLabel) {                    
                    const label = this.out[i].offsetLabel; 
                    const vinfo = this.getVarInfo(label);
                    if (vinfo === false) {
                        this.optionalError(this.config.allowUndefinedVariables, this.out[i].line,  `Variable: ${label} not defined.`);
                    }
                    else {
                        if (vinfo.scope === 'CTX') {
                            this.out[i].useCTX = 1;
                        } else if (vinfo.scope === 'GLOBAL') {
                            this.out[i].useCTX = 0;
                        } else {
                            this.error(this.out[i].line, `Invalid variable scope: ${label} not defined.`);
                        }
                    
                        this.out[i].offset = Number(this.out[i].offset ?? 0) + Number(vinfo.offset);
                        this.out[i].offsetLabel = vinfo.name;
                        // console.log(['@', label, this.out[i].memUseAddrRel, this.out[i].useAddrRel, this.srcLines[this.out[i].line.fileName][this.out[i].line.line - 1]]);
                        if (vinfo.count > 1 && this.out[i].memUseAddrRel) {
                            this.out[i].minAddrRel = (vinfo.offset - this.out[i].offset);
                            this.out[i].maxAddrRel = (vinfo.offset + vinfo.count - 1) - this.out[i].offset;
                            this.out[i].baseLabel = vinfo.offset;
                            this.out[i].sizeLabel = vinfo.count;
                        }
                    }
                }

                if (this.out[i].jmpAddrLabel) {
                    const codeAddr = this.getCodeAddress(this.out[i].jmpAddrLabel, i);
                    if (codeAddr === false) {
                        this.optionalError(this.config.allowUndefinedLabels, this.out[i].line,  `Label: ${this.out[i].jmpAddrLabel} not defined.`);
                    }
                    this.out[i].jmpAddr = Number(this.out[i].jmpAddr) + Number(codeAddr);
                }
                if (this.out[i].elseAddrLabel) {
                    const codeAddr = this.getCodeAddress(this.out[i].elseAddrLabel, i);
                    if (codeAddr === false) {
                        this.optionalError(this.config.allowUndefinedLabels, this.out[i].line,  `Label: ${this.out[i].elseAddrLabel} not defined.`);
                    }
                    this.out[i].elseAddr = Number(this.out[i].elseAddr) + Number(codeAddr);
                }
                if (this.out[i].condConst) {
                    const value = this.evaluateExpression(this.out[i].condConst.value);
                    this.out[i].condConst = value;
                }

                if ((this.out[i].save || this.out[i].restore) && this.out[i].regs !== false) {
                    const regs = this.out[i].regs ?? [];    
                    const invalidRegs = regs.filter(x => !SAVE_REGS.includes(x));
                    const noIncludedRegs = SAVE_REGS.filter(x => !regs.includes(x));
                    const duplicatedRegs = regs.filter((x, index) => regs.indexOf(x) !== index);
                    const tag = this.out[i].save ? 'SAVE' : 'RESTORE';
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
                        this.error(this.out[i].line,'On ' + tag + ' ' + errors.join(', '));
                    }
                    delete this.out[i].regs;
                }

                try {
                    this.parseCommands(this.out[i].cmdBefore);
                    this.parseCommands(this.out[i].cmdAfter);
                } catch (err) {
                    err.message = "Error parsing tag: " + err.message;
                    this.error(this.out[i].line, err);
                }
                this.resolveDataOffset(i, this.out[i]);
                this.out[i].fileName = this.out[i].line.fileName;
                this.out[i].line = this.out[i].line.line;
                this.out[i].lineStr = this.srcLines[this.out[i].fileName][this.out[i].line - 1] ?? '';
            }
            this.includeId = mainIncludeId;
            this.clearLocalLabels();
            this.convertToLegacyLabels();

            const res = {
                program:  stringifyBigInts(this.out),
                labels: this.labels,
                constants: stringifyBigInts(this.constants)
            }

            if (this.config.summary !== false) {
                console.log(`GLOBAL memory: \x1B[1;35m${this.lastGlobalVarAssigned+1} ${((this.lastGlobalVarAssigned+1) * 100.0/MAX_GLOBAL_VAR).toFixed(2)}%\x1B[0m`);
                console.log(`LOCAL  memory: ${this.lastLocalVarCtxAssigned+1}`);
            }

            if (this.lastGlobalVarAssigned > MAX_GLOBAL_VAR) {
                throw new Error(`GLOBAL memory is too big ${this.lastGlobalVarAssigned+1} x 256-bit`);
            }
            return res;
        }

    }
    setDefaultModeBits(bits) {
        this.defaultModeBits = bits;
    }
    setPragma(l) {
        const cmd = l.params[0] ?? false;
        if (cmd === 'MODE_384_BITS') {
            if (l.params.length !== 1) {
                throw new Error(`Invalid parameters for pragma MODE`);
            }
            this.setDefaultModeBits(384);
        }
        else if (cmd === 'MODE_256_BITS') {
            if (l.params.length !== 1) {
                throw new Error(`Invalid parameters for pragma MODE`);
            }
            this.setDefaultModeBits(256);            
        }
    }
    getCodeAddress(label, zkPC) {
        if (label === "next") return zkPC + 1;
        const res = this.getLabelInfo(label);
        return res ? res.offset : false;
    }

    parseCommands(cmdList) {
        if (Array.isArray(cmdList)) {
            for (let i=0; i<cmdList.length; i++) {
                if (cmdList[i]) {
                    cmdList[i] = commandParser.parse(cmdList[i]);
                } else {
                    cmdList[i] = {op: ""}
                }
            }
        }
    }
    clearLocalLabels() {
        Object.keys(this.labels).filter(label => label.startsWith('_') && label.includes('__@@')).forEach(label => delete this.labels[label]);
    }
    convertToLegacyLabels() {
        for (const label in this.labels) {
            this.labels[label] = this.labels[label].offset;
        }
    }
    getVarInfo(name) {
        const _name = this.encodeLocalVar(name);
        return this.vars[_name] ?? false;
    }
    decodeLocal(name) {
        if (name.startsWith('_')) {
            const pos = name.indexOf('__@@');
            if (pos >= 0) return name.slice(0, pos);
        }
        return name;
    }
    encodeLocal(name, type = '@') {
        return (name.startsWith('_') && !name.includes('__@@')) ? name + '__@@' + type + this.includeId.toString(16).padStart(3, '0') : name;
    }
    encodeLocalVar(name) {
        return this.encodeLocal(name, 'V');
    }
    encodeLocalLabel(name) {
        return this.encodeLocal(name, 'L');
    }
    defineVar(name, obj) {
        // if (name === '__MSTOREX_len') debugger;
        const _name = this.encodeLocalVar(name);
        return this.vars[_name] = {...obj, name};
    }
    popIncludeScope() {
        const includeData = this.includeStack.pop();
        this.includeId = includeData.includeId;
        this.defaultModeBits = includeData.defaultModeBits;
    }
    pushIncludeScope() {
        this.includeStack.push({includeId: this.includeId, defaultModeBits: this.defaultModeBits})
        this.includeId = ++this.lastIncludeId;
        this.defaultModeBits = 256;
    }
    getLabelInfo(name) {
        const _name = this.encodeLocalLabel(name);
        return this.labels[_name] ?? false;
    }
    getLabel(name) {
        const _info = this.getLabelInfo(name);
        if (_info !== false) return _info.offset;
        return false;
    }
    defineLabel(name, obj) {
        const _name = this.encodeLocalLabel(name); 
        this.labels[_name] = {...obj, name}
        return name;
    }
    resolveDataOffset(i, cmd) {
        if (typeof cmd !== 'object' || cmd === null) return;
        if (cmd.op === 'getData') {
            if ((cmd.module === 'mem' || cmd.module === 'addr') && typeof cmd.offsetLabel === 'undefined') {
                const name = cmd.offset;
                const vinfo = this.getVarInfo(name);
                if (vinfo === false) {
                    this.error(this.out[i].line, `Not found reference ${cmd.module}.${name}`);
                }
                cmd.offsetLabel = name;
                let offset = vinfo.offset;
                delete cmd.offset;

                // set useCTX
                if (vinfo.scope === 'CTX') {
                    cmd.useCTX = 1;
                } else if (vinfo.scope === 'GLOBAL') {
                    cmd.useCTX = 0;
                }
                if (cmd.arrayOffset && cmd.arrayOffset.op === 'number') {
                    offset += Number(cmd.arrayOffset.num);
                    delete cmd.arrayOffset;
                }

                let params = [{op: 'number', num: BigInt(offset)}];
                if (cmd.arrayOffset) {
                    params = offset ? [{ op: 'add', values: [cmd.arrayOffset, params[0]]}]:
                                      [cmd.arrayOffset];
                    delete cmd.arrayOffset;
                } else if (cmd.useCTX === 0 && cmd.module === 'addr') {
                    // only when address is 100% static could return as static number
                    // if useCTX means that address depends of CTX
                    cmd.num = BigInt(offset);
                    cmd.op = 'number';
                    return;
                }                
                switch (cmd.module) {
                    case 'addr':    cmd.op = 'getMemAddr'; break;
                    case 'mem':     cmd.op = 'getMemValue'; break;
                }
                cmd.params = params;
                return;
            }
            else if (cmd.module === 'const' && typeof cmd.offsetLabel === 'undefined') {
                const name = cmd.offset;
                cmd.op = 'number'
                cmd.num = this.getConstantValue(name);
                cmd.offsetLabel = name;
                delete cmd.offset;
                return;
            }
            else {
                this.error(this.out[i].line, `Invalid module ${cmd.module}`);
            }
        }
        const keys = Object.keys(cmd);
        for (let ikey = 0; ikey < keys.length; ++ikey) {
            const name = keys[ikey];
            if (Array.isArray(cmd[name])) {
                for (let j = 0; j < cmd[name].length; ++j) {
                    this.resolveDataOffset(i, cmd[name][j]);
                }
            }
            else if (typeof cmd[name] == 'object') {
                this.resolveDataOffset(i, cmd[name]);
            }
        }
    }

    defineConstant(name, ctype, value) {
        const l = this.currentLine ; // ?? {line: line, fileName: ctx.currentFilename}

        if (typeof this.constants[name] !== 'undefined') {
            this.error(l, `Redefinition of constant ${name} previously defined on `+
                        `${this.constants[name].fileName}:${this.constants[name].line}`);
        }

        if (this.config && this.config.defines && typeof this.config.defines[name] !== 'undefined') {
            console.log(`NOTICE: Ignore constant definition ${name} on ${l.fileName}:${l.line} because it was defined by command line`);
            this.constants[name] = {
                value: this.config.defines[name].value,
                type: this.config.defines[name].type,
                originalValue: value,
                originalType: ctype,
                defines: true,
                line: l.line,
                fileName: l.fileName};
            return;
        }

        if (ctype == 'CONSTL') {
            if (this.modeBits === 384) {
                if (value > maxConstl384 || value < minConstl384) {
                    this.error(l, `Long-constant384 value ${value} out of range [${minConstl256},${maxConstl256}]`);
                }
            } else {
                if (value > maxConstl256 || value < minConstl256) {
                    console.log([this.modeBits, this.defaultModeBits]);
                    this.error(l, `Long-constant256 value ${value} out of range [${minConstl256},${maxConstl256}]`);
                }
            }
        } else if (ctype == 'CONST') {
            if (value > maxConst || value < minConst) {
                this.error(l, `Constant ${name} out of range, value ${value} must be in range [${minConst},${maxConst}]`);
            }
        } else {
            this.error(l, `Constant ${name} has an invalid type ${ctype}`);
        }

        this.constants[name] = {
            value: value,
            type: ctype,
            line: l.line,
            fileName: l.fileName};
    }

    getConstant(name, throwIfNotExists = true) {
        if (this.config && this.config.defines && typeof this.config.defines[name] !== 'undefined') {
            if (typeof this.constants[name] == 'undefined') {
                this.constants[name] = {
                    value: this.config.defines[name].value,
                    type: this.config.defines[name].type,
                    defines: true
                };
            }
            return [this.config.defines[name].value, this.config.defines[name].type];
        }

        if (typeof this.constants[name] === 'undefined') {
            if (throwIfNotExists) this.error(this.currentLine, `Not found constant ${name}`);
            else return [null, null];
        }
        return [this.constants[name].value, this.constants[name].type];
    }

    getConstantValue(name, throwIfNotExists = true) {
        return this.getConstant(name, throwIfNotExists)[0];
    }

    resolve(input, currentLine) {
        if (typeof input === 'object') {
            if (typeof input.type === 'undefined') {
                let res = {};
                for (const prop in input) {
                    res[prop] = this.resolve(input[prop]);
                }
                return res;
            } else if (input.type !== '@final') {
                const res = this.processAssignmentIn(input, currentLine);
                if (typeof res === 'object') {
                    if (typeof res.CONST !== 'undefined') return Number(res.CONST);
                    if (typeof res.CONSTL !== 'undefined') return BigInt(res.CONSTL);                
                }
                return res;
            }
        }
        return input;
    }
    processAssignmentIn(input, currentLine) {
        let res = {};
        let E1, E2;
        if (input.type == "TAG" || input.type == 'TAG_0' || input.type == 'TAG_BYTE') {
            res.freeInTag = input.tag ? commandParser.parse(input.tag) : { op: ""};
            res.inFREE = input.type == 'TAG' ? 1n : 0n;
            res.inFREE0 = (input.type == 'TAG_0' || input.type == 'TAG_BYTE') ? 1n : 0n;
            if (input.type == 'TAG_BYTE') {
                res.free0IsByte = 1;
            }
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
            res = this.resolve(input.addr, currentLine);
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
            this.checkConstRange(res);
            return res;
        }
        if (input.type == "CONSTL") {
            res.CONSTL = BigInt(input.const);
            this.checkConstRange(res);
            return res;
        }
        if (input.type == 'CONSTID') {
            const [value, ctype] = this.getConstant(input.identifier);
            res[ctype] = value;
            this.checkConstRange(res);
            return res;
        }

        if (input.type == "expl") {
            res.CONSTL = BigInt(input.values[0])**BigInt(input.values[1]);
            this.checkConstRange(res);
            return res;
        }
        if (input.type == "exp") {
            const value = BigInt(input.values[0])**BigInt(input.values[1]);
            res.CONST = value;
            this.checkConstRange(res);
            return res;
        }
        if ((input.type == "add") || (input.type == "sub") || (input.type == "neg") || (input.type == "mul")) {
            E1 = this.processAssignmentIn(input.values[0], currentLine);
        }
        if ((input.type == "add") || (input.type == "sub") || (input.type == "mul")) {
            E2 = this.processAssignmentIn(input.values[1], currentLine);
        }
        if (input.type == "mul") {
            if (typeof E1.CONSTL !== 'undefined' && typeof E2.CONSTL !== 'undefined') {
                res.CONSTL = BigInt(E1.CONSTL) * BigInt(E2.CONSTL);
                this.checkConstRange(res);
                return res;
            }
            else if (typeof E1.CONST !== 'undefined' && typeof E2.CONST !== 'undefined') {
                res.CONST = BigInt(E1.CONST) * BigInt(E2.CONST);
                this.checkConstRange(res);
                return res;
            } else if (this.isConstant(E1)) {
                if (typeof E2.CONSTL !== 'undefined') {
                    throw new Error("Not allowed CONST and CONSTL in same operation");
                }
                Object.keys(E2).forEach(function(key) {
                    if (key === 'CONST' || key === 'CONSTL' || (key.startsWith('in') && !key.startsWith('ind'))) {
                        E2[key] *= E1.CONST;
                    }
                });
                return E2;
            } else if (this.isConstant(E2)) {
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
                console.log(E1,E2);
                throw new Error("Multiplication not allowed in input");
            }
        }
        if (input.type == "neg") {
            Object.keys(E1).forEach(function(key) {
                if (key === 'CONSTL') throw new Error(`Negation not allowed for CONSTL value=${E1[key]}`);

                if (key === 'CONST' || (key.startsWith('in') && !key.startsWith('ind'))) {
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
            const linfo = this.getLabelInfo(input.identifier);
            if (linfo !== false) {
                console.log(linfo);
                res.CONST = BigInt(linfo.offset);
            }
            else {
                const vinfo = this.getVarInfo(input.identifier);
                if (vinfo === false) {
                    throw new Error(`Not found label/variable ${input.identifier}`)
                }
                res.CONST = BigInt(vinfo.offset);
            }
            return res;
        }
        throw new Error( `Invalid type: ${input.type}`);

    }
    isConstant(o) {
        let res = true;
        Object.keys(o).forEach(function(key) {
            if (key != "CONST") res = false;
        });
        return res;
    }

    evaluateExpression(input) {
        if (input.type === 'CONSTL') {
            return BigInt(input.value);
        }

        if (input.type === 'CONSTID') {
            return this.getConstantValue(input.identifier);
        }

        if (input.type === '?' && input.values.length == 3) {
            return this.evaluateExpression(input.values[0]) ? this.evaluateExpression(input.values[1]) : this.evaluateExpression(input.values[2])
        }

        if (input.type === '??' && input.values.length == 1) {
            const value = this.getConstantValue(input.identifier, false);
            return  value == null ? this.evaluateExpression(input.values[0]) : value;
        }

        let values = [];
        input.values.forEach((value) => {
            values.push(this.evaluateExpression(value));
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
        const l = this.currentLine;
        throw new Error(`Operation ${input.type} with ${values.length} operators, not allowed in numeric expression. ${l.fileName}:${l.line}`);
    }

    processAssignmentOut(outputs, parent = {}) {
        const res = {};
        for (let i=0; i<outputs.length; i++) {
            const out = outputs[i];
            if (out.type === 'REG') {
                const reg = out.reg;
                if (typeof res["set"+ reg] !== "undefined") throw new Error(`Register ${reg} added twice in asssignment output`);
                if (readOnlyRegisters.includes(reg)) {
                    const l = this.currentLine;
                    throw new Error(`Register ${reg} is readonly register, could not be used as output destination. ${l.fileName}:${l.line}`);
                }
                res["set"+ reg] = 1;
            } else if (out.type === 'MSTORE') {
                if (typeof res.mOp !== 'undefined' || typeof parent.mOp !== 'undefined') throw new Error(`Assignment output memory operation already defined, only one operation by step is allowed`);
                res.mOp = 1;
                res.mWR = 1;
                const _tmp = this.resolve(out.addr);
                this.appendOp(res, _tmp);
            } else {
                const l = this.currentLine;
                throw new Error(`Invalid type ${out.type} as output destination. ${l.fileName}:${l.line}`);
            }
        }
        return res;
    }

    appendOp(step, op) {
        const sourceRef = this.sourceRef;
        Object.keys(op).filter(k => !k.startsWith('_')).forEach(function(key) {
            if (typeof step[key] !== "undefined") {
                if (PROPERTY_SAME_VALUE_COLLISION_ALLOWED[key]) {
                    if (PROPERTY_SAME_VALUE_COLLISION_ALLOWED[key].some(k => step[k] !== op[k])) {
                        throw new Error(`property ${key} already defined with different value ${step[key]} vs ${op[key]}`);
                    }
                } else {
                    throw new Error(`property ${key} already defined`);
                }
            } else {
                step[key] = op[key];
            }
        });
    }

    optionalError(allowed, l, msg) {
        if (allowed) this.warning(l, msg);
        else this.error(l, msg);
    }

    warning(l, msg) {
        console.log(`WARNING ${l.fileName}:${l.line}: ${msg}`);
    }

    error(l, err) {
        if (err instanceof CompilerError) {
            throw err;
        } 
        if (err instanceof TypeError) {
            console.log(err.stack);
        }
        if (err instanceof Error) {
            throw new CompilerError(`ERROR ${l.fileName}:${l.line}: ${err.message}`);
        } 
        const msg = `ERROR ${l.fileName}:${l.line}: ${err}`;
        throw new CompilerError(msg);
    }

    checkConstRange(value, isLongValue) {
        const l = this.currentLine;

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
                this.error(l, `Constant value ${value} undefined type on checkConstRange`);
            }
        
        }
        
        if (!isLongValue && (value > maxConst || value < minConst)) {
            this.error(l, `Constant value ${value} out of range [${minConst},${maxConst}]`);
        }
        if (this.modeBits === 384) {
            if (isLongValue && (value > maxConstl384 || value < minConstl384)) {
                this.error(l, `Long-constant384 value ${value} out of range [${minConstl256},${maxConstl256}]`);
            }
        } else {
            if (isLongValue && (value > maxConstl256 || value < minConstl256)) {
                this.error(l, `Long-constant256 value ${value} out of range [${minConstl256},${maxConstl256}]`);
            }
        }
    }

    extractTypes(node, types) {
        if (types.includes(node.type)) {
            let res = {types: {}, nodes: [node], count: 1};
            res.types[node.type] = 1;
            return res;
        }
        if (!node.values) return false;
        let res = {types: {}, nodes: [], count: 0};
        for (const value of node.values) {
            const rvalue = this.extractTypes(value, types);
            if (rvalue === false) continue;
            res.nodes = [...res.nodes, ...rvalue.nodes];
            for (const property in rvalue.types) {
                res.types[property] = (res.types[property] ?? 0) + rvalue.types[property];
            }
        }
        if (res.count === 0) return false;
        return res;
    }

    verifyStep(l) {
        if (!l.assignment) return;
        const typesInfo = this.extractTypes(l.assignment.in, ['MLOAD', 'TAG', 'TAG_0', 'TAG_BYTE']);
        if (typesInfo === false) return;

        const tagCount = (typesInfo.TAG ?? 0) + (typesInfo.TAG_0 ?? 0) + (typesInfo.TAG_BYTE ?? 0);
        if (tagCount > 1) {
            this.error(l, 'Only one tag is allowed');
        }
    // const in = l.assignment.in;
    // const out = l.assigment.out;
    // const assignType = in.type;:
    // if (l.assignment
    }
    instanceParser(parserClass, src, fullFileName) {
/*        const myErr = function (str, hash) {
            str = fullFileName + " -> " + str;
            oldParseError(str, hash);
        };
        parserClass.Parser.prototype.parseError = myErr;*/
        let parser = new parserClass.Parser();
        const parserPerformAction = parser.performAction;
        const parserStateInfo = parser.productions_;
        let compiler = this;
        parser.performAction = function (yytext, yyleng, yylineno, yy, yystate, $$, _$ ) {
            if (!this.compiler) {
                this.compiler = compiler;
            }
            const result = parserPerformAction.apply(this, arguments);
            const first = _$[$$.length - 1 - parserStateInfo[yystate][1]];
            const last = _$[$$.length - 1];
            const sourceRef = `${compiler.relativeFileName}:${last.last_line}`;
            compiler.sourceRef = sourceRef;
            compiler.line = yylineno;
            if (!this.$ || typeof this.$ !== 'object')  {
                return result;
            }
            // this.$.line = yylineno + 1;
            return result;
        }
        return parser;
    }
}

module.exports = function compile(fileName, ctx, config = {}) {

    let compiler = new Compiler(config);
    return compiler.compile(fileName);
}
