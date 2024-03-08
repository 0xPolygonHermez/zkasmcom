const chai = require("chai");
const assert = chai.assert;
const fs = require("fs");
const path = require("path");
const {_cc, compareJson, _compile} = require('./ottools.js');

const HASH_SUFFIXES = ['P', 'K', 'S'];

describe("Test Assume Free Feature", async function () {
    this.timeout(10000000000);

    it("Basic Test Assume Free Compilation", async () => {
        let json = _compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1\n$ => A  :F_MLOAD(v1)\n$ => A  :MLOAD(v1)\nv1 => A\n');
        let expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0",
                           setA: 1, offset: 8, mOp: 1, mWR: 0, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 3);
        for (let line = 0; line < 3; ++line) {
            compareJson({...expected, assumeFree: line === 1 ? 0: 1}, json.program[line], json.program[line].lineStr);
        }
         
        for (let bytes = 0; bytes <= 32; ++bytes) {
            for (const hashSuffix of HASH_SUFFIXES) {
                const hashTag = bytes === 0 ? `HASH${hashSuffix}` : `HASH${hashSuffix}${bytes}`;
                json = _compile(`$ => A  :F_${hashTag}(E)\n$ => A  :${hashTag}(E)\n`);
                expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0", hashOffset:0, 
                            hashS:0, hashK: 0, hashP: 0, hashBytesInD: bytes === 0 ? 1: 0, hashBytes: bytes === 0 ? 0: bytes, setA: 1 };
                expected[`hash${hashSuffix}`] = 1;
                assert.equal(json.program.length, 2);
                for (let line = 0; line < 2; ++line) {
                    compareJson({...expected, assumeFree: line === 1 ? 0: 1}, json.program[line], json.program[line].lineStr);
                }
            }
        }
    })
    it("Complex Test Assume Free Compilation", async () => {
        let json = _compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1\n3 * $ - 2 * B => A,C  :F_MLOAD(v1)\n3 * v1 - 2 * B => A,C\n');
        let expected = { freeInTag: {op: ''},  inFREE: "3", inFREE0: "0", setC: 1, assumeFree: 1, inB: "-2",
                           setA: 1, offset: 8, mOp: 1, mWR: 0, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 2);
        for (let line = 0; line < 2; ++line) {
            compareJson(expected, json.program[line], json.program[line].lineStr);
        }

        json = _compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1[12]\n3 * $ - 2 * B => A,C  :F_MLOAD(v1+6)\n3 * v1[6] - 2 * B => A,C\n');
        assert.equal(json.program.length, 2);
        for (let line = 0; line < 2; ++line) {
            compareJson({...expected, offset: 14}, 
                         json.program[line], json.program[line].lineStr);
        }


        for (let reg of ['E', 'RR']) {
            for (let factor of [1, 8]) {
                for (let mode of [0,1,2,3]) {
                    // 0 - factor and offset numbers
                    // 1 - factor constant
                    // 2 - offset constant
                    // 3 - factor and offset constant
                    for (let offset of [4, -4, 6]) {
                        const _offset = mode > 1 ? (offset >= 6 ? '%KO':'+%KO'): (((offset > 0 && offset < 6) ? '+':'') + offset);
                        const _reg = [1,3].includes(mode) ? (`%KF*${reg}`) : (factor === 1 ? `${reg}`:`${factor}*${reg}`);
                        const _index = offset >= 6 ? `${_offset}+${_reg}`:`${_reg}${_offset}`;
                        const program = `CONST %KF = ${factor}\nCONST %KO = ${offset}\nVAR GLOBAL v0[8]\nVAR GLOBAL v1[12]\n3 * $ - 2 * B => A,C  :F_MLOAD(v1[${_index}])\n3 * v1[${_index}] - 2 * B => A,C\n`;
                        json = _compile(program);
                        assert.equal(json.program.length, 2);
                        for (let line = 0; line < 2; ++line) {
                            compareJson({...expected, offset: 8 + offset, minAddrRel: -offset, maxAddrRel: 11 - offset, baseLabel: 8, sizeLabel: 12, memUseAddrRel: 1, ind: reg === 'E' ? factor:0, indRR: reg === 'RR' ? factor:0}, 
                                        json.program[line], json.program[line].lineStr);
                        }
                    }
                }
            }
        }
         
        for (let hashOffset of [-1,-10,0,1, 10]) {
            for (let bytes = 0; bytes <= 32; ++bytes) {
                for (const hashSuffix of HASH_SUFFIXES) {
                    const hashTag = bytes === 0 ? `HASH${hashSuffix}` : `HASH${hashSuffix}${bytes}`;
                    const _hashOffset = hashOffset == 0 ? '':(hashOffset > 0 ? `+${hashOffset}`:`${hashOffset}`)
                    const src = `$ => A, D  :${hashTag}(E${_hashOffset})\n`;
                    json = _compile(src);
                    let _expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0", hashOffset, setD: 1, assumeFree: 0,
                                hashS:0, hashK: 0, hashP: 0, hashBytesInD: bytes === 0 ? 1: 0, hashBytes: bytes === 0 ? 0: bytes, setA: 1 };
                    _expected[`hash${hashSuffix}`] = 1;
                    assert.equal(json.program.length, 1);
                    compareJson(_expected, json.program[0], json.program[0].lineStr);
                }
            }
        }
        for (let hashOffset of [-1,-10,0,1, 10]) {
            for (let bytes = 0; bytes <= 32; ++bytes) {
                for (const hashSuffix of HASH_SUFFIXES) {
                    const hashTag = bytes === 0 ? `HASH${hashSuffix}` : `HASH${hashSuffix}${bytes}`;
                    const _hashOffset = hashOffset == 0 ? '':(hashOffset > 0 ? `+${hashOffset}`:`${hashOffset}`)
                    const src = `B - 4 * $ => A, D  :F_${hashTag}(E${_hashOffset})\n`;
                    json = _compile(src);
                    let _expected = { freeInTag: {op: ''},  inFREE: "-4", inFREE0: "0", hashOffset, setD: 1, assumeFree: 1, inB: "1",
                                hashS:0, hashK: 0, hashP: 0, hashBytesInD: bytes === 0 ? 1: 0, hashBytes: bytes === 0 ? 0: bytes, setA: 1 };
                    _expected[`hash${hashSuffix}`] = 1;
                    assert.equal(json.program.length, 1);
                    compareJson(_expected, json.program[0], json.program[0].lineStr);
                }
            }
        }
        for (let regs of [['E', 'RR'],['RR', 'E']]) {
            for (let factor of [1, 8]) {
                for (let mode of [0,1,2,3]) {
                    // 0 - factor and offset numbers
                    // 1 - factor constant
                    // 2 - offset constant
                    // 3 - factor and offset constant
                    for (let offset of [4, -4, 6]) {
                        const _offset = mode > 1 ? (offset >= 6 ? '%KO':'+%KO'): (((offset > 0 && offset < 6) ? '+':'') + offset);
                        let _index = '';
                        for (let ireg = 0; ireg < 2; ++ireg) {
                            const _factor = factor * (ireg+1);
                            const _reg = [1,3].includes(mode) ? (`%KF${ireg+1}*${regs[ireg]}`) : (_factor === 1 ? `${regs[ireg]}`:`${_factor}*${regs[ireg]}`);
                            _index += (ireg === 0 ? (offset >= 6 ? `${_offset}+${_reg}`:`${_reg}${_offset}`):`+${_reg}`);
                        }
                        const program = `CONST %KF1 = ${factor}\nCONST %KF2 = ${factor*2}\nCONST %KO = ${offset}\nVAR GLOBAL v0[8]\nVAR GLOBAL v1[12]\n3 * $ - 2 * B => A,C  :F_MLOAD(v1[${_index}])\n3 * v1[${_index}] - 2 * B => A,C\n`;
                        json = _compile(program);
                        assert.equal(json.program.length, 2);
                        for (let line = 0; line < 2; ++line) {
                            compareJson({...expected, offset: 8 + offset, minAddrRel: -offset, maxAddrRel: 11 - offset, baseLabel: 8, sizeLabel: 12, memUseAddrRel: 1, ind: regs[0] === 'E' ? factor : 2*factor, indRR: regs[0] === 'RR' ? factor : 2*factor}, 
                                        json.program[line], json.program[line].lineStr);
                        }
                    }
                }
            }
        }

    })
    it("Storing Test Assume without free Compilation", async () => {
        let json = _compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1\n3 - 2 * B => A,C :MSTORE(v1)\n3 - 2 * B => A,v1,C\n');
        let expected = { setC: 1, setA: 1, CONST: '3', inB: "-2", assumeFree: 0,
                         offset: 8, mOp: 1, mWR: 1, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 2);
        for (let line = 0; line < 2; ++line) {
            compareJson({...expected}, json.program[line], json.program[line].lineStr);
        }
    })
    it("Miscelaneous", async () => {
        const header = ['VAR GLOBAL padding[7]\nVAR GLOBAL g7_8[8]\nVAR GLOBAL g15\nVAR CTX lpadding[10]\nVAR CTX l10_80[80]\nVAR CTX l90\nCONST %CS1 = 10\nCONST %CS2 = 2\nCONST %CS3 = 3\nCONSTL %CL1 = 100\n','0 => A\nlabel1:', '0 => B\nlabel2:'];
        _cc(header,  '2 * B + 8 => A\n', { setA: 1, CONST: '8', inB: "2"});
        let freeInTag =  {op: ''};
        let init = {freeInTag, setA: 1, CONST: '8', inFREE: "2", inFREE0: "0", mOp: 1, mWR: 0};
        let base = {...init, assumeFree: 1}
        _cc(header,  '2 * g15 + 8 => A\n',    { ...base, offset: 15, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * l90 + 8 => A\n',    { ...base, offset: 90, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * g7_8 + 8 => A\n',   { ...base, offset:  7, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * l10_80 + 8 => A\n', { ...base, offset: 10, offsetLabel: 'l10_80', useCTX: 1});
     
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(g15)\n',    { ...base, offset: 15, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(l90)\n',    { ...base, offset: 90, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(g7_8)\n',   { ...base, offset:  7, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(l10_80)\n', { ...base, offset: 10, offsetLabel: 'l10_80', useCTX: 1});

        // TODO: warning/error
        base = {...base, assumeFree: 0};
        _cc(header,  '2 * $ + 8 => A    :MLOAD(g15)\n',    { ...base, offset: 15, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * $ + 8 => A    :MLOAD(l90)\n',    { ...base, offset: 90, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * $ + 8 => A    :MLOAD(g7_8)\n',   { ...base, offset:  7, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * $ + 8 => A    :MLOAD(l10_80)\n', { ...base, offset: 10, offsetLabel: 'l10_80', useCTX: 1});

        freeInTag = { op: 'getReg', regName: 'B' };
        base = {...base, freeInTag};
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(g15)\n',    { ...base, offset: 15, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(l90)\n',    { ...base, offset: 90, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(g7_8)\n',   { ...base, offset:  7, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(l10_80)\n', { ...base, offset: 10, offsetLabel: 'l10_80', useCTX: 1});

        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(g15+100)\n',    { ...base, offset: 115, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(l90+100)\n',    { ...base, offset: 190, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(g7_8+100)\n',   { ...base, offset: 107, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(l10_80+100)\n', { ...base, offset: 110, offsetLabel: 'l10_80', useCTX: 1});

        // TODO: warning/error out-of-bounds
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(g15[%CL1])\n',    { ...base, offset: 115, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(l90[100])\n',    { ...base, offset: 190, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(g7_8[100])\n',   { ...base, offset: 107, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :MLOAD(l10_80[%CL1])\n', { ...base, offset: 110, offsetLabel: 'l10_80', useCTX: 1});

        freeInTag = { op: 'getReg', regName: 'B' };
        base = {...base, freeInTag, assumeFree: 1};
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(g15)\n',    { ...base, offset: 15, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(l90)\n',    { ...base, offset: 90, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(g7_8)\n',   { ...base, offset:  7, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(l10_80)\n', { ...base, offset: 10, offsetLabel: 'l10_80', useCTX: 1});

        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(g15+100)\n',    { ...base, offset: 115, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(l90+100)\n',    { ...base, offset: 190, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(g7_8+100)\n',   { ...base, offset: 107, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(l10_80+100)\n', { ...base, offset: 110, offsetLabel: 'l10_80', useCTX: 1});

        // TODO: warning/error out-of-bounds
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(g15[%CL1])\n',    { ...base, offset: 115, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(l90[100])\n',     { ...base, offset: 190, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(g7_8[100])\n',    { ...base, offset: 107, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * ${B} + 8 => A    :F_MLOAD(l10_80[%CL1])\n', { ...base, offset: 110, offsetLabel: 'l10_80', useCTX: 1});

        freeInTag = { op: '' };
        base = {...base, freeInTag, assumeFree: 1};

        // TODO: warning/error out-of-bounds
        _cc(header,  '2 * g15[100] + 8 => A\n',     { ...base, offset: 115, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * l90[%CL1] + 8 => A\n',    { ...base, offset: 190, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * g7_8[100] + 8 => A\n',    { ...base, offset: 107, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * l10_80[%CL1] + 8 => A\n', { ...base, offset: 110, offsetLabel: 'l10_80', useCTX: 1});

        // TODO: warning/error out-of-bounds
        _cc(header,  '2 * g15[100] + 8 => A\n',    { ...base, offset: 115, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * l90[100] + 8 => A\n',    { ...base, offset: 190, offsetLabel: 'l90',    useCTX: 1});
        _cc(header,  '2 * g7_8[100] + 8 => A\n',   { ...base, offset: 107, offsetLabel: 'g7_8',   useCTX: 0});
        _cc(header,  '2 * l10_80[100] + 8 => A\n', { ...base, offset: 110, offsetLabel: 'l10_80', useCTX: 1});


        base = {...base, assumeFree: 1, ind: 1, indRR: 0, memUseAddrRel: 1};
        // TODO: warning/error out-of-bounds
        _cc(header,  '2 * g15[E+2] + 8 => A\n',    { ...base, offset: 17, offsetLabel: 'g15',    useCTX: 0});
        _cc(header,  '2 * l90[E+2] + 8 => A\n',    { ...base, offset: 92, offsetLabel: 'l90',    useCTX: 1});

        _cc(header,  '2 * g7_8[E+2] + 8 => A\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[E+2] + 8 => A\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(g7_8+E)\n',   { ...base, offset:  7, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: 0, maxAddrRel:  7, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(l10_80+E)\n', { ...base, offset: 10, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: 0, maxAddrRel: 79, baseLabel: 10, sizeLabel: 80});

        base = {...base, ind: 5};
        _cc(header,  '2 * g7_8[5*E+2] + 8 => A\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+2] + 8 => A\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(g7_8[5*E+2])\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(l10_80[5*E+2])\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});
        
        // TODO: warning/error
        _cc(header,  '2 * $ + 8 => A    :MLOAD(g7_8[5*E+2])\n',   { ...base, assumeFree: 0, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :MLOAD(l10_80[5*E+2])\n', { ...base, assumeFree: 0, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, indRR: -3};
        _cc(header,  '2 * g7_8[5*E+2-3*RR] + 8 => A\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+2-3*RR] + 8 => A\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(g7_8[5*E+2-3*RR])\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(l10_80[5*E+2-3*RR])\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});
        
        // TODO: warning/error
        _cc(header,  '2 * $ + 8 => A    :MLOAD(g7_8[5*E+2-3*RR])\n',   { ...base, assumeFree: 0, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :MLOAD(l10_80[5*E+2-3*RR])\n', { ...base, assumeFree: 0, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});


        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(g7_8[5*E+%CS2-%CS3*RR])\n',   { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :F_MLOAD(l10_80[5*E+%CS2-%CS3*RR])\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});
        
        // TODO: warning/error
        _cc(header,  '2 * $ + 8 => A    :MLOAD(g7_8[5*E+%CS2-%CS3*RR])\n',   { ...base, assumeFree: 0, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * $ + 8 => A    :MLOAD(l10_80[5*E+%CS2-%CS3*RR])\n', { ...base, assumeFree: 0, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 1, JMPN: 0, JMPC: 0, JMPZ: 0, call:0, return: 0, jmpAddr: 2, jmpAddrLabel: 'label2'};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMP(label2)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMP(label2)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, jmpUseAddrRel: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMP(@label2+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMP(@label2+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 1, JMPZ: 0, elseAddr: 3, elseAddrLabel: 'next'};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPC(@label2+5*E-3*RR),EQ\n', { ...base, bin: 1, binOpcode: 4, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPC(@label2+5*E-3*RR),EQ\n', { ...base, bin: 1, binOpcode: 4, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 1, JMPC: 0, JMPZ: 0};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPN(@label2+5*E-3*RR)\n', { ...base, free0IsByte:0, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPN(@label2+5*E-3*RR)\n', { ...base, free0IsByte:0, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 0, JMPZ: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPZ(@label2+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPZ(@label2+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});


        base = {...init, ind: 5, indRR: -3, memUseAddrRel: 1, assumeFree: 1, call: 0, return: 0,
                JMP: 0, JMPN: 0, JMPC: 1, JMPZ: 0, jmpAddr: 3, jmpAddrLabel: 'next', elseUseAddrRel: 1, elseAddr: 2, elseAddrLabel: 'label2'};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :EQ,JMPNC(@label2+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :EQ,JMPNC(@label2+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 0, JMPZ: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPNZ(@label2+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPNZ(@label2+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});


        base = {...init, ind: 5, indRR: -3, memUseAddrRel: 1, assumeFree: 1, call: 0, return: 0,
                JMP: 0, JMPN: 0, JMPC: 0, JMPZ: 1, elseAddr: 1, elseAddrLabel: 'label1', elseUseAddrRel: 1, jmpUseAddrRel: 1, jmpAddr: 2, jmpAddrLabel: 'label2'};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPZ(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPZ(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 1, JMPZ: 0};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :EQ,JMPC(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :EQ,JMPC(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 1, JMPC: 0, JMPZ: 0};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPN(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, free0IsByte:0, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPN(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, free0IsByte:0, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});


        base = {...base, JMP: 0, JMPN: 0, JMPC: 0, JMPZ: 1, elseAddr: 2, elseAddrLabel: 'label2', jmpAddr: 1, jmpAddrLabel: 'label1'};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :JMPNZ(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :JMPNZ(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 1, JMPZ: 0};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :EQ,JMPNC(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :EQ,JMPNC(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        // CALL
        base = {...init, ind: 5, indRR: -3, JMP: 1, JMPN: 0, JMPC: 0, JMPZ: 0, call:1, return: 0, memUseAddrRel: 1, jmpAddr: 2, jmpAddrLabel: 'label2', assumeFree: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :CALL(label2)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :CALL(label2)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, jmpUseAddrRel: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :CALL(@label2+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :CALL(@label2+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 1, JMPZ: 0, elseAddr: 3, elseAddrLabel: 'next'};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :CALL_C(@label2+5*E-3*RR),EQ\n', { ...base, bin: 1, binOpcode: 4, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :CALL_C(@label2+5*E-3*RR),EQ\n', { ...base, bin: 1, binOpcode: 4, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 1, JMPC: 0, JMPZ: 0};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :CALL_N(@label2+5*E-3*RR)\n', { ...base, free0IsByte:0, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :CALL_N(@label2+5*E-3*RR)\n', { ...base, free0IsByte:0, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 0, JMPZ: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :CALL_Z(@label2+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :CALL_Z(@label2+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});
    

        base = {...init, ind: 5, indRR: -3, JMP: 0, JMPN: 0, JMPC: 0, JMPZ: 1, call:1, return: 0, 
                memUseAddrRel: 1, jmpAddr: 1, jmpAddrLabel: 'label1', jmpUseAddrRel: 1, assumeFree: 1, elseAddr: 2, elseAddrLabel: 'label2', elseUseAddrRel: 1};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :CALL_NZ(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :CALL_NZ(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});

        base = {...base, JMP: 0, JMPN: 0, JMPC: 1, JMPZ: 0};
        _cc(header,  '2 * g7_8[5*E+%CS2-%CS3*RR] + 8 => A   :EQ,CALL_NC(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset:  9, offsetLabel: 'g7_8',   useCTX: 0, minAddrRel: -2, maxAddrRel:  5, baseLabel:  7, sizeLabel:  8});
        _cc(header,  '2 * l10_80[5*E+%CS2-%CS3*RR] + 8 => A :EQ,CALL_NC(@label2+5*E-3*RR,@label1+5*E-3*RR)\n', { ...base, bin: 1, binOpcode: 4, offset: 12, offsetLabel: 'l10_80', useCTX: 1, minAddrRel: -2, maxAddrRel: 77, baseLabel: 10, sizeLabel: 80});
    })
});